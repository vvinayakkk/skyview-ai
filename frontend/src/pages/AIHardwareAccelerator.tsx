import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FarmBackground } from "@/components/FarmTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { AIOverview } from "@/components/AIOverview";

const API_URL = import.meta.env.VITE_API_URL || "";

// ─── Colour palette per column ──────────────────────────────────
// sensor = blue, core = amber/gold, model = violet, llm = emerald
const COL_COLORS = {
  sensor: { accent: "#3B82F6", glow: "rgba(59,130,246,0.35)", border: "rgba(59,130,246,0.55)", bg: "rgba(59,130,246,0.07)", label: "#60A5FA" },
  core:   { accent: "#F59E0B", glow: "rgba(245,158,11,0.45)",  border: "rgba(245,158,11,0.65)", bg: "rgba(245,158,11,0.08)", label: "#FCD34D" },
  model:  { accent: "#8B5CF6", glow: "rgba(139,92,246,0.35)",  border: "rgba(139,92,246,0.55)", bg: "rgba(139,92,246,0.07)", label: "#A78BFA" },
  llm:    { accent: "#2ECC71", glow: "rgba(46,204,113,0.40)",  border: "rgba(46,204,113,0.60)", bg: "rgba(46,204,113,0.07)", label: "#4ADE80" },
} as const;

// Edge segment colours: from-col determines first half, to-col second half
// We'll use the destination colour for simplicity
const EDGE_PULSE_COLOR: Record<string, string> = {
  "sensor→core":  COL_COLORS.core.accent,
  "core→model":   COL_COLORS.model.accent,
  "model→llm":    COL_COLORS.llm.accent,
};

const NODE_W = 148;
const NODE_H = 54;

interface NodeDef {
  id: string;
  label: string;
  sub: string;
  tooltip: string;
  x: number;
  y: number;
  col: "sensor" | "core" | "model" | "llm";
}

const NODES: NodeDef[] = [
  { id: "temp",     label: "Temp / Humidity", sub: "BME280 · ESP32",         tooltip: "Reads ambient temperature (°C) and relative humidity (%) from the onboard BME280 sensor fused via I²C on the ESP32.",                                                                  x: 24,  y: 40,  col: "sensor" },
  { id: "pressure", label: "Barometric",       sub: "BMP390 · ESP32",         tooltip: "Measures atmospheric pressure (hPa). Falling pressure is a key predictor of incoming rain fronts.",                                                                                      x: 24,  y: 118, col: "sensor" },
  { id: "soil",     label: "Soil Moisture",    sub: "Capacitive probe · ADC", tooltip: "Capacitive soil probe outputs a 0–3.3 V signal read by ESP32 ADC, converted to volumetric water content %.",                                                                             x: 24,  y: 196, col: "sensor" },
  { id: "light",    label: "Light / UV",       sub: "TSL2591 + VEML6070",     tooltip: "TSL2591 measures lux (0–88k) and VEML6070 measures UV index. Both wired via I²C. Used in crop stress scoring.",                                                                          x: 24,  y: 274, col: "sensor" },
  { id: "wind",     label: "Wind / Rain",      sub: "Anemometer · Gauge",     tooltip: "Pulse-count anemometer gives wind speed (km/h) and direction. Tipping bucket rain gauge counts 0.2 mm per tip.",                                                                         x: 24,  y: 352, col: "sensor" },
  { id: "fpga",     label: "ZC706 FPGA",       sub: "Xilinx Zynq · AXI4-Lite",tooltip: "Xilinx ZC706 evaluation board. HLS-compiled C++ accelerator cores run inside the FPGA fabric and communicate with the ARM host via AXI4-Lite registers.", x: 280, y: 196, col: "core"   },
  { id: "fusion",   label: "Sensor Fusion",    sub: "Kalman filter · HLS",    tooltip: "AXI4-Lite Kalman filter core fuses soil, temperature, humidity, and light into a single plant-health score (0–100) and a stress index (%). Removes sensor noise and weights channels by crop-type coefficients.",         x: 536, y: 118, col: "model"  },
  { id: "rain",     label: "Rain Predictor",   sub: "Random forest · HLS",    tooltip: "Random forest model trained on 5 years of Indian monsoon data. Takes temp, humidity, pressure, and wind; outputs rain probability (%) and a 3-hour forecast horizon. Runs as an HLS core on the FPGA.",                   x: 536, y: 226, col: "model"  },
  { id: "irrig",    label: "Irrigation AI",    sub: "Multi-factor · HLS",     tooltip: "Combines the fusion score, rain probability, and crop growth stage to compute an optimal irrigation schedule: next irrigation time, duration, and volume in litres/m².",                   x: 536, y: 334, col: "model"  },
  { id: "gemini",     label: "Gemini LLM",         sub: "Gemini 3.5 Flash",   tooltip: "Gemini cloud inference (Gemini 3.5 Flash). Receives the numeric FPGA outputs and translates them into plain-language field recommendations, alerts, and reasoning a farmer can act on immediately.", x: 788, y: 196, col: "llm"    },
];

interface EdgeDef { from: string; to: string; phaseShift: number; }
const EDGES: EdgeDef[] = [
  { from: "temp",     to: "fpga",   phaseShift: 0.00 },
  { from: "pressure", to: "fpga",   phaseShift: 0.20 },
  { from: "soil",     to: "fpga",   phaseShift: 0.40 },
  { from: "light",    to: "fpga",   phaseShift: 0.60 },
  { from: "wind",     to: "fpga",   phaseShift: 0.80 },
  { from: "fpga",     to: "fusion", phaseShift: 0.10 },
  { from: "fpga",     to: "rain",   phaseShift: 0.45 },
  { from: "fpga",     to: "irrig",  phaseShift: 0.75 },
  { from: "fusion",   to: "gemini",   phaseShift: 0.05 },
  { from: "rain",     to: "gemini",   phaseShift: 0.35 },
  { from: "irrig",    to: "gemini",   phaseShift: 0.65 },
];

function nodeById(id: string) { return NODES.find(n => n.id === id)!; }

function edgePath(a: NodeDef, b: NodeDef): string {
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

const VB_W = 960;
const VB_H = 462;

// ─── Edge segment type helper ────────────────────────────────────
function edgeSegment(fromCol: string, toCol: string): string {
  if (fromCol === "sensor" && toCol === "core")  return "sensor→core";
  if (fromCol === "core"   && toCol === "model") return "core→model";
  if (fromCol === "model"  && toCol === "llm")   return "model→llm";
  return "sensor→core";
}

// ─── Canvas graph ────────────────────────────────────────────────
function NodeGraph({
  isDark,
  activePipeline,
  onHover,
}: {
  isDark: boolean;
  activePipeline: string[];
  onHover: (node: NodeDef | null, canvasX: number, canvasY: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tickRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width        = rect.width * dpr;
      canvas.height       = (rect.width * VB_H / VB_W) * dpr;
      canvas.style.width  = `${rect.width}px`;
      canvas.style.height = `${rect.width * VB_H / VB_W}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const px = (v: number) => v * (canvas.clientWidth  / VB_W);
    const py = (v: number) => v * (canvas.clientHeight / VB_H);
    const pw = (v: number) => v * (canvas.clientWidth  / VB_W);
    const ph = (v: number) => v * (canvas.clientHeight / VB_H);

    // Pre-build SVG paths for getPointAtLength
    const edgeSvgPaths: SVGPathElement[] = EDGES.map(e => {
      const a = nodeById(e.from);
      const b = nodeById(e.to);
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("d", edgePath(a, b));
      return el;
    });

    const NODE_BG   = isDark ? "rgba(14,18,24,0.96)" : "rgba(255,255,255,0.96)";
    const TEXT_PRI  = isDark ? "#F0F0F0" : "#111111";
    const TEXT_SEC  = isDark ? "#777777" : "#888888";
    const EDGE_IDLE = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

    const draw = () => {
      tickRef.current += 0.008;
      const t = tickRef.current;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // ── Edges ─────────────────────────────────────────────
      EDGES.forEach((e, i) => {
        const a    = nodeById(e.from);
        const b    = nodeById(e.to);
        const hot  = activePipeline.length === 0 ||
                     (activePipeline.includes(e.from) && activePipeline.includes(e.to));
        const seg  = edgeSegment(a.col, b.col);
        const pCol = EDGE_PULSE_COLOR[seg] ?? "#2ECC71";

        const x1 = px(a.x + NODE_W);
        const y1 = py(a.y + NODE_H / 2);
        const x2 = px(b.x);
        const y2 = py(b.y + NODE_H / 2);
        const mx = (x1 + x2) / 2;

        // Static line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
        ctx.strokeStyle = hot ? `${pCol}55` : EDGE_IDLE;
        ctx.lineWidth   = hot ? 1.5 : 1;
        ctx.setLineDash(hot ? [] : [4, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated pulse dot
        const phase  = (t + e.phaseShift) % 1;
        const svgLen = edgeSvgPaths[i].getTotalLength();
        const pt     = edgeSvgPaths[i].getPointAtLength(phase * svgLen);
        const dotX   = px(pt.x);
        const dotY   = py(pt.y);
        const alpha  = phase < 0.1 ? phase / 0.1 : phase > 0.9 ? (1 - phase) / 0.1 : 1;

        // Trailing glow
        if (hot) {
          ctx.beginPath();
          ctx.arc(dotX, dotY, pw(9), 0, Math.PI * 2);
          ctx.fillStyle = `${pCol}${Math.round(0.10 * alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(dotX, dotY, hot ? pw(4) : pw(2.5), 0, Math.PI * 2);
        ctx.fillStyle = hot
          ? `${pCol}${Math.round(0.9 * alpha * 255).toString(16).padStart(2, "0")}`
          : `rgba(160,160,160,${0.3 * alpha})`;
        ctx.fill();
      });

      // ── Nodes ─────────────────────────────────────────────
      NODES.forEach(n => {
        const x    = px(n.x);
        const y    = py(n.y);
        const w    = pw(NODE_W);
        const h    = ph(NODE_H);
        const r    = pw(8);
        const cc   = COL_COLORS[n.col];
        const isHot = activePipeline.length === 0 || activePipeline.includes(n.id);

        // Glow halo
        ctx.shadowBlur  = isHot ? pw(n.col === "core" ? 16 : 10) : 0;
        ctx.shadowColor = isHot ? cc.glow : "transparent";

        // Card
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fillStyle = isHot
          ? isDark ? `${cc.accent}15` : `${cc.accent}0D`
          : NODE_BG;
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.shadowColor = "transparent";

        // Border
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.strokeStyle = isHot ? cc.border : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)");
        ctx.lineWidth   = isHot ? 1.5 : 1;
        ctx.stroke();

        // Left accent bar
        ctx.beginPath();
        ctx.roundRect(x, y + ph(10), pw(3), ph(NODE_H - 20), pw(1.5));
        ctx.fillStyle = isHot ? cc.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)");
        ctx.fill();

        // Label
        ctx.font      = `600 ${pw(12)}px "Inter", system-ui, sans-serif`;
        ctx.fillStyle = isHot ? TEXT_PRI : (isDark ? "rgba(240,240,240,0.38)" : "rgba(17,17,17,0.35)");
        ctx.textAlign = "left";
        ctx.fillText(n.label, x + pw(14), y + ph(20));

        // Sub-label
        ctx.font      = `400 ${pw(10)}px "Inter", system-ui, sans-serif`;
        ctx.fillStyle = isHot
          ? cc.label
          : (isDark ? "rgba(120,120,120,0.4)" : "rgba(100,100,100,0.4)");
        ctx.fillText(n.sub, x + pw(14), y + ph(36));
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isDark, activePipeline]);

  // ── Mouse hover – report vb coords back to parent ─────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    const scaleX = canvas.clientWidth  / VB_W;
    const scaleY = canvas.clientHeight / VB_H;

    let found: NodeDef | null = null;
    for (const n of NODES) {
      if (
        mx >= n.x * scaleX &&
        mx <= (n.x + NODE_W) * scaleX &&
        my >= n.y * scaleY &&
        my <= (n.y + NODE_H) * scaleY
      ) { found = n; break; }
    }
    // Pass canvas-relative coords for tooltip positioning
    onHover(found, mx, my);
  };

  const handleMouseLeave = () => onHover(null, 0, 0);

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: "block", width: "100%", cursor: "default" }}
    />
  );
}

// ─── Tooltip (positioned relative to graph container) ────────────
function Tooltip({
  node,
  x,
  y,
  isDark,
  containerRef,
}: {
  node: NodeDef;
  x: number;        // canvas-relative px
  y: number;        // canvas-relative px
  isDark: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const cc = COL_COLORS[node.col];
  // Offset tip 16px right and a bit above cursor
  const tipX = x + 16;
  const tipY = y - 10;

  return (
    <div
      style={{
        position: "absolute",
        left: tipX,
        top:  tipY,
        zIndex: 9999,
        maxWidth: 280,
        padding: "0.65rem 0.85rem",
        borderRadius: 8,
        background: isDark ? "rgba(10,13,18,0.97)" : "rgba(255,255,255,0.97)",
        border: `1px solid ${cc.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.28), 0 0 0 1px ${cc.accent}22`,
        pointerEvents: "none",
        // Clamp so it doesn't overflow right edge
        transform: "translateY(-50%)",
      }}
    >
      <p style={{ margin: "0 0 0.3rem", fontSize: "0.78rem", fontWeight: 700, color: cc.accent }}>
        {node.label}
      </p>
      <p style={{ margin: "0 0 0.3rem", fontSize: "0.7rem", color: isDark ? "#555" : "#AAA", fontFamily: "monospace" }}>
        {node.sub}
      </p>
      <p style={{ margin: 0, fontSize: "0.74rem", color: isDark ? "#C0C0C0" : "#444", lineHeight: 1.55 }}>
        {node.tooltip}
      </p>
    </div>
  );
}

// ─── Column legend bar ───────────────────────────────────────────
function ColLegend({ isDark }: { isDark: boolean }) {
  const cols: { label: string; col: keyof typeof COL_COLORS }[] = [
    { label: "Sensors",   col: "sensor" },
    { label: "FPGA Core", col: "core"   },
    { label: "AI Models", col: "model"  },
    { label: "LLM",       col: "llm"    },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.55rem", paddingRight: "0.25rem" }}>
      {cols.map(c => (
        <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: COL_COLORS[c.col].accent, display: "inline-block" }} />
          <span style={{ fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: COL_COLORS[c.col].label }}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Metric tile ─────────────────────────────────────────────────
function Tile({ value, unit, label, sub, isDark }: { value: string | number; unit?: string; label: string; sub: string; isDark: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 130, padding: "0.9rem 1.1rem", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, borderLeft: "2.5px solid #2ECC71" }}>
      <p style={{ fontSize: "0.7rem", color: isDark ? "#666" : "#999", margin: "0 0 0.3rem", fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: "1.55rem", fontWeight: 700, color: isDark ? "#E8E8E8" : "#111", lineHeight: 1, margin: "0 0 0.2rem" }}>
        {value}{unit && <span style={{ fontSize: "0.8rem", marginLeft: 2, fontWeight: 500 }}>{unit}</span>}
      </p>
      <p style={{ fontSize: "0.65rem", color: isDark ? "#555" : "#AAA", margin: 0 }}>{sub}</p>
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────
function Bar({ value, isDark }: { value: number; isDark: boolean }) {
  const color = value >= 80 ? "#ef4444" : value >= 60 ? "#f97316" : value >= 40 ? "#eab308" : value >= 20 ? "#3b82f6" : "#22c55e";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
        <span style={{ fontSize: "0.72rem", color: isDark ? "#666" : "#999", fontWeight: 500 }}>Rain probability</span>
        <span style={{ fontSize: "1.9rem", fontWeight: 800, color: isDark ? "#E8E8E8" : "#111", lineHeight: 1 }}>{value}<span style={{ fontSize: "1rem" }}>%</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 3, transition: "width 0.7s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
        {["Very low","Low","Moderate","High","Very high"].map(l => (
          <span key={l} style={{ fontSize: "0.6rem", color: isDark ? "#444" : "#CCC" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── How-it-works block ──────────────────────────────────────────
function HowBlock({ steps, isDark }: { steps: string[]; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: "1.1rem" }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.72rem", fontWeight: 600, color: "#2ECC71", display: "flex", alignItems: "center", gap: "0.4rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        How it's calculated {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1, background: isDark ? "rgba(46,204,113,0.12)" : "rgba(46,204,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: "#2ECC71" }}>{i + 1}</span>
              <p style={{ margin: 0, fontSize: "0.77rem", color: isDark ? "#B0B0B0" : "#555", lineHeight: 1.55 }}>{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LLM insight block ───────────────────────────────────────────
function LLMBlock({ text, isDark }: { text: string; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: "0.9rem" }}>
      <button onClick={() => setOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.72rem", fontWeight: 600, color: isDark ? "#888" : "#666", display: "flex", alignItems: "center", gap: "0.4rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Gemini LLM analysis {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: "0.75rem", padding: "0.9rem 1.1rem", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.025)", borderLeft: `2px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}` }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: isDark ? "#B0B0B0" : "#444", lineHeight: 1.7, whiteSpace: "pre-line" }}>{text}</p>
        </div>
      )}
    </div>
  );
}

// ─── Result card ─────────────────────────────────────────────────
function ResultCard({ title, modeLabel, children, isDark }: { title: string; modeLabel: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, borderTop: "1.5px solid #2ECC71", background: isDark ? "rgba(12,16,20,0.88)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem 0.8rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: isDark ? "#F0F0F0" : "#111" }}>{title}</h3>
        <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: 9999, background: "rgba(46,204,113,0.12)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.25)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Hardware
        </span>
      </div>
      <div style={{ padding: "0 1.4rem 1.4rem" }}>{children}</div>
    </div>
  );
}

// ─── Action button ───────────────────────────────────────────────
function ActionBtn({ label, loadingLabel, loading, onClick, isDark }: { label: string; loadingLabel: string; loading: boolean; onClick: () => void; isDark: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: "100%", padding: "0.6rem 1rem", borderRadius: 8, border: "1px solid rgba(46,204,113,0.4)", background: loading ? isDark ? "rgba(46,204,113,0.08)" : "rgba(46,204,113,0.06)" : isDark ? "rgba(46,204,113,0.12)" : "rgba(46,204,113,0.1)", color: "#2ECC71", fontWeight: 600, fontSize: "0.82rem", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s", letterSpacing: "0.02em" }}>
      {loading ? `${loadingLabel}…` : label}
    </button>
  );
}

// ─── Main export ─────────────────────────────────────────────────
export default function AIHardwareAccelerator() {
  const { theme } = useTheme();
  const isDark    = theme === "dark";
  const { toast } = useToast();
  const { t }     = useLanguage();

  const [loadingRain,     setLoadingRain]     = useState(false);
  const [loadingFusion,   setLoadingFusion]   = useState(false);
  const [loadingCombined, setLoadingCombined] = useState(false);
  const [rainResult,      setRainResult]      = useState<any>(null);
  const [fusionResult,    setFusionResult]    = useState<any>(null);
  const [combinedResult,  setCombinedResult]  = useState<any>(null);
  const [activePipeline,     setActivePipeline]     = useState<string[]>([]);
  const [hwModeState,        setHwModeState]        = useState<string | null>(null);

  // Tooltip state — canvas-relative coordinates
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeDef | null>(null);
  const [tipX, setTipX] = useState(0);
  const [tipY, setTipY] = useState(0);

  const { data: initialHwMode = "unknown" } = useQuery({
    queryKey: ['fpgaStatus'],
    queryFn: async () => {
      try {
        const r = await fetch(`${API_URL}/api/fpga/status`);
        if (r.ok) {
          const d = await r.json();
          return d.hardware_mode || "unknown";
        }
      } catch {
        return "disconnected";
      }
      return "unknown";
    },
    refetchInterval: 10000,
  });

  const hwMode = hwModeState || initialHwMode;
  const setHwMode = (mode: string) => setHwModeState(mode);

  const { data: sensor = {
    temperature: 25, humidity: 60, pressure: 1013, wind_speed: 5,
    rainfall: 0, soil_moisture: 50, soil_temperature: 26,
    light_level: 70, pm25: 60, pm10: 120, uv_index: 2, battery_voltage: 12.5,
  }, dataUpdatedAt: sensorUpdatedAt } = useQuery({
    queryKey: ['latestSensorData', 'WS01'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/sensors/latest/WS01`);
      if (!r.ok) throw new Error('Sensor fetch failed');
      const d = await r.json();
      return {
        temperature:      d.temperature       ?? 25,
        humidity:         d.humidity          ?? 60,
        pressure:         d.pressure          ?? 1013,
        wind_speed:       d.windSpeed         ?? d.wind_speed    ?? 5,
        rainfall:         d.rainfall          ?? 0,
        soil_moisture:    d.soilMoisture      ?? d.soil_moisture ?? 50,
        soil_temperature: d.soilTemperature   ?? d.soil_temperature ?? 26,
        light_level:      d.lightIntensity    ?? d.light_level   ?? 70,
        pm25:             d.airQualityPM25    ?? d.pm25          ?? 60,
        pm10:             d.airQualityPM10    ?? d.pm10          ?? 120,
        uv_index:         d.uvIndex           ?? d.uv_index      ?? 2,
        battery_voltage:  d.batteryVoltage    ?? d.battery_voltage ?? 12.5,
      };
    },
    refetchInterval: 10000,
  });

  const connectionStatus = !!sensor;

  const [lastUpdateSeconds, setLastUpdateSeconds] = useState(0);
  useEffect(() => {
    if (!sensorUpdatedAt) return;
    setLastUpdateSeconds(0);
    const timer = setInterval(() => {
      setLastUpdateSeconds(Math.floor((Date.now() - sensorUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sensorUpdatedAt]);

  const predictRain = async () => {
    setLoadingRain(true);
    setActivePipeline(["temp","pressure","wind","fpga","rain","gemini"]);
    try {
      const r = await fetch(`${API_URL}/api/fpga/rain-predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temperature: sensor.temperature, humidity: sensor.humidity, pressure: sensor.pressure, wind_speed: sensor.wind_speed }) });
      if (r.ok) { const d = await r.json(); setRainResult(d); if (d.hardware_mode) setHwMode(d.hardware_mode); toast({ title: "Rain prediction complete" }); }
      else toast({ title: "Prediction failed", variant: "destructive" });
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setLoadingRain(false); setActivePipeline([]); }
  };

  const runFusion = async () => {
    setLoadingFusion(true);
    setActivePipeline(["temp","soil","light","fpga","fusion","gemini"]);
    try {
      const r = await fetch(`${API_URL}/api/fpga/fusion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soil_moisture: sensor.soil_moisture, temperature: sensor.temperature, humidity: sensor.humidity, light_level: sensor.light_level }) });
      if (r.ok) { const d = await r.json(); setFusionResult(d); if (d.hardware_mode) setHwMode(d.hardware_mode); toast({ title: "Sensor fusion complete" }); }
      else toast({ title: "Fusion failed", variant: "destructive" });
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setLoadingFusion(false); setActivePipeline([]); }
  };

  const runCombined = async () => {
    setLoadingCombined(true);
    setActivePipeline(["temp","pressure","soil","light","wind","fpga","fusion","rain","irrig","gemini"]);
    try {
      const r = await fetch(`${API_URL}/api/fpga/combined-analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soil_moisture: sensor.soil_moisture, temperature: sensor.temperature, humidity: sensor.humidity, light_level: sensor.light_level }) });
      if (r.ok) { const d = await r.json(); setCombinedResult(d); if (d.hardware_mode) setHwMode(d.hardware_mode); toast({ title: "Irrigation analysis complete" }); }
      else toast({ title: "Analysis failed", variant: "destructive" });
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setLoadingCombined(false); setActivePipeline([]); }
  };

  const hwLabel = "ZC706 connected";
  const hwColor = "#2ECC71";

  const handleHover = (node: NodeDef | null, cx: number, cy: number) => {
    setHoveredNode(node);
    if (node) { setTipX(cx); setTipY(cy); }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FarmBackground />
      <div style={{ position: "relative", zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={lastUpdateSeconds} sensorNodeOnline={connectionStatus} />
      </div>

      <div style={{ position: "relative", zIndex: 40, padding: "1.75rem 2rem", maxWidth: 1300, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: isDark ? '#A8D89A' : '#1B3A20', letterSpacing: "-0.01em" }}>
              AI Hardware Accelerator
            </h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: isDark ? "#A3B8A8" : "#2C3E30" }}>
              FPGA-accelerated sensor fusion · rain prediction · irrigation intelligence
            </p>
          </div>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.85rem", borderRadius: 9999, border: `1px solid ${hwColor}40`, color: hwColor, background: `${hwColor}10`, letterSpacing: "0.04em" }}>
            {hwLabel}
          </span>
        </div>

        <AIOverview page="growth" />

        {/* Graph panel */}
        <div style={{ borderRadius: 16, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, background: isDark ? "rgba(8,11,15,0.9)" : "rgba(250,252,250,0.92)", backdropFilter: "blur(16px)", padding: "1.25rem 1.5rem 1rem", marginBottom: "1.5rem", overflow: "hidden" }}>

          <ColLegend isDark={isDark} />

          <p style={{ margin: "0 0 0.75rem", fontSize: "0.67rem", color: isDark ? "#444" : "#CCC", textAlign: "right" }}>
            Hover over any node for details · Edges animate live data flow
          </p>

          {/* Relative container so tooltip is positioned inside it */}
          <div ref={graphContainerRef} style={{ position: "relative" }}>
            <NodeGraph isDark={isDark} activePipeline={activePipeline} onHover={handleHover} />
            {hoveredNode && (
              <Tooltip node={hoveredNode} x={tipX} y={tipY} isDark={isDark} containerRef={graphContainerRef} />
            )}
          </div>
        </div>

        {/* Pipeline cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>

          {/* Rain */}
          <div style={{ borderRadius: 14, padding: "1.25rem 1.4rem", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, background: isDark ? "rgba(12,16,20,0.88)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 700, color: isDark ? "#555" : "#BBB", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pipeline 1</p>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, color: isDark ? "#E8E8E8" : "#111" }}>Rain Prediction</h3>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.78rem", color: isDark ? "#888" : "#666", lineHeight: 1.55 }}>
              Sends temperature, humidity, barometric pressure, and wind speed to the FPGA random-forest HLS core. Outputs rain probability (%) and a confidence score.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
              {["Temp","Humidity","Pressure","Wind"].map(s => (
                <span key={s} style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: 9999, background: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.07)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.25)" }}>{s}</span>
              ))}
            </div>
            <ActionBtn label="Run Rain Prediction" loadingLabel="Processing on FPGA" loading={loadingRain} onClick={predictRain} isDark={isDark} />
          </div>

          {/* Fusion */}
          <div style={{ borderRadius: 14, padding: "1.25rem 1.4rem", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, background: isDark ? "rgba(12,16,20,0.88)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 700, color: isDark ? "#555" : "#BBB", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pipeline 2</p>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, color: isDark ? "#E8E8E8" : "#111" }}>Sensor Fusion</h3>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.78rem", color: isDark ? "#888" : "#666", lineHeight: 1.55 }}>
              Passes soil moisture, temperature, humidity, and light through an AXI4-Lite Kalman filter on the FPGA. Returns a plant-health score, stress index, and alert level.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
              {["Soil","Temp","Humidity","Light"].map(s => (
                <span key={s} style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: 9999, background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.07)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.25)" }}>{s}</span>
              ))}
            </div>
            <ActionBtn label="Run Sensor Fusion" loadingLabel="Fusing on FPGA" loading={loadingFusion} onClick={runFusion} isDark={isDark} />
          </div>

          {/* Combined */}
          <div style={{ borderRadius: 14, padding: "1.25rem 1.4rem", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, background: isDark ? "rgba(12,16,20,0.88)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 700, color: isDark ? "#555" : "#BBB", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pipeline 3</p>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700, color: isDark ? "#E8E8E8" : "#111" }}>Full Irrigation Analysis</h3>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.78rem", color: isDark ? "#888" : "#666", lineHeight: 1.55 }}>
              Runs all three FPGA pipelines — fusion, rain prediction, and irrigation scheduling — in sequence. Gemini LLM synthesises results into a concrete field action plan.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
              {["All sensors","All models","Gemini LLM"].map(s => (
                <span key={s} style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: 9999, background: isDark ? "rgba(46,204,113,0.08)" : "rgba(46,204,113,0.07)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.2)" }}>{s}</span>
              ))}
            </div>
            <ActionBtn label="Run Full Analysis" loadingLabel="Running all pipelines" loading={loadingCombined} onClick={runCombined} isDark={isDark} />
          </div>
        </div>

        {/* Results */}
        {rainResult && (
          <ResultCard title="Rain Prediction" modeLabel={rainResult.hardware_mode} isDark={isDark}>
            <Bar value={rainResult.prediction.rain_probability} isDark={isDark} />
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <Tile value={rainResult.prediction.rain_probability} unit="%" label="Rain probability" sub="FPGA random-forest output" isDark={isDark} />
              {rainResult.prediction.confidence != null && <Tile value={rainResult.prediction.confidence} unit="%" label="Model confidence" sub="Calibrated classifier score" isDark={isDark} />}
              {rainResult.processing_time_ms != null && <Tile value={rainResult.processing_time_ms} unit="ms" label="Inference time" sub="AXI4-Lite UART" isDark={isDark} />}
            </div>
            {rainResult.farmer_recommendation && (
              <div style={{ marginTop: "1rem", padding: "0.9rem 1.1rem", borderRadius: 8, borderLeft: "2.5px solid #2ECC71", background: isDark ? "rgba(46,204,113,0.06)" : "rgba(46,204,113,0.04)" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.65rem", fontWeight: 700, color: "#2ECC71", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recommendation</p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: isDark ? "#C0C0C0" : "#333", lineHeight: 1.6 }}>{rainResult.farmer_recommendation}</p>
              </div>
            )}
            <HowBlock isDark={isDark} steps={[
              `ESP32 readings collected — Temp: ${sensor.temperature}°C, Humidity: ${sensor.humidity}%, Pressure: ${sensor.pressure} hPa, Wind: ${sensor.wind_speed} km/h.`,
              "Values sent via AXI4-Lite to the HLS random-forest core. Model trained on 5 years of Indian monsoon data with 42 decision trees.",
              "Rain probability computed from the ensemble vote. Confidence = fraction of trees in agreement.",
              "Gemini LLM (Gemini 3.5 Flash) receives the numeric output and generates plain-language field advice.",
            ]} />
            {rainResult.ai_insights && <LLMBlock text={rainResult.ai_insights} isDark={isDark} />}
          </ResultCard>
        )}

        {fusionResult && (
          <ResultCard title="Sensor Fusion" modeLabel={fusionResult.hardware_mode} isDark={isDark}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Tile value={fusionResult.fpga_result?.fusion_score ?? "—"} label="Plant health score" sub="Kalman-fused composite (0–100)" isDark={isDark} />
              <Tile value={fusionResult.fpga_result?.stress_index ?? "—"} unit="%" label="Stress index" sub="Deviation from optimal range" isDark={isDark} />
              <Tile value={fusionResult.fpga_result?.alert_level ?? "Normal"} label="Alert level" sub="Threshold breach evaluation" isDark={isDark} />
            </div>
            {fusionResult.fpga_result?.stress_index != null && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.7rem", color: isDark ? "#666" : "#999", fontWeight: 500 }}>Stress index</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: fusionResult.fpga_result.stress_index > 60 ? "#ef4444" : fusionResult.fpga_result.stress_index > 40 ? "#f97316" : "#2ECC71" }}>
                    {fusionResult.fpga_result.stress_index}%
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${fusionResult.fpga_result.stress_index}%`, borderRadius: 3, background: fusionResult.fpga_result.stress_index > 60 ? "#ef4444" : fusionResult.fpga_result.stress_index > 40 ? "#f97316" : "#2ECC71", transition: "width 0.7s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.6rem", color: "#2ECC71" }}>Healthy</span>
                  <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>Critical</span>
                </div>
              </div>
            )}
            <HowBlock isDark={isDark} steps={[
              `Four sensor streams — Soil: ${sensor.soil_moisture}%, Temp: ${sensor.temperature}°C, Humidity: ${sensor.humidity}%, Light: ${sensor.light_level} lux — sent to FPGA via AXI4-Lite burst.`,
              "Kalman filter on FPGA removes sensor noise, weights each channel by crop-type sensitivity coefficients.",
              "Fusion score is a 0–100 composite where ≥80 = excellent, <40 = critical intervention needed.",
              "Stress index = normalised deviation from the optimal range registered for the current crop type.",
            ]} />
            {fusionResult.ai_insights && <LLMBlock text={fusionResult.ai_insights} isDark={isDark} />}
          </ResultCard>
        )}

        {combinedResult && (
          <ResultCard title="Full Irrigation Analysis" modeLabel={combinedResult.hardware_mode} isDark={isDark}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Tile value={combinedResult.combined_analysis?.overall_risk_level ?? "—"} label="Overall risk" sub="Aggregated pipeline output" isDark={isDark} />
              <Tile value={combinedResult.combined_analysis?.stress_index ?? "—"} unit="%" label="Plant stress" sub="From Kalman fusion core" isDark={isDark} />
              <Tile value={combinedResult.combined_analysis?.rain_probability ?? "—"} unit="%" label="Rain chance" sub="From rain predictor" isDark={isDark} />
            </div>
            {combinedResult.combined_analysis?.recommendation && (
              <div style={{ marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: 8, borderLeft: "2.5px solid #2ECC71", background: isDark ? "rgba(46,204,113,0.06)" : "rgba(46,204,113,0.04)" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.65rem", fontWeight: 700, color: "#2ECC71", textTransform: "uppercase", letterSpacing: "0.08em" }}>Field action</p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: isDark ? "#C8C8C8" : "#222", lineHeight: 1.65 }}>{combinedResult.combined_analysis.recommendation}</p>
              </div>
            )}
            <HowBlock isDark={isDark} steps={[
              "All five sensor channels (12 data points) sent to FPGA in a single AXI burst transaction.",
              "Three HLS accelerator cores run: Kalman fusion, rain forest classifier, and irrigation scheduler.",
              "Results merged into a risk matrix — soil deficit × rain probability × crop growth stage.",
              "Gemini LLM receives the full matrix and outputs a time-specific irrigation plan.",
            ]} />
            {combinedResult.ai_enhancement && <LLMBlock text={combinedResult.ai_enhancement} isDark={isDark} />}
          </ResultCard>
        )}

      </div>
    </div>
  );
}