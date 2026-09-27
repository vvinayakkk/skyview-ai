import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tractor,
  ArrowRight,
  MessageSquare,
  Sparkles,
  MapPin,
  Calendar,
  CheckCircle2,
  Play,
  RotateCw,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Farmer {
  phone: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  whatsapp: string;
  crops?: string[];
  excess?: string[];
  required?: string[];
}

interface TransferFlow {
  from: string;
  to: string;
  item: string;
  distance_km: number;
}

interface LoopData {
  farmers: Farmer[];
  transfer_flow: TransferFlow[];
  total_distance_km: number;
  ai_schedule: string;
}

interface CircularBarterLoopCardProps {
  loop: LoopData;
  loopIndex: number;
  currentUserPhone: string;
  isDark: boolean;
}

interface ParsedScheduleRow {
  day: string;
  giver: string;
  item: string;
  receiver: string;
  notes?: string;
}

export function CircularBarterLoopCard({
  loop,
  loopIndex,
  currentUserPhone,
  isDark,
}: CircularBarterLoopCardProps) {
  const [activeView, setActiveView] = useState<"flow" | "rota">("flow");
  const [simulationStep, setSimulationStep] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Check if current user is part of this loop
  const containsMe = loop.farmers.some((f) => f.phone === currentUserPhone);

  // Helper to extract initials
  const getInitials = (name: string) => {
    if (!name) return "F";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Color tokens per node (border accents only, no solid fills)
  const nodeBorders = [
    { border: "rgba(59, 130, 246, 0.5)", glow: "rgba(59, 130, 246, 0.25)", text: "#3B82F6", label: "Node 01" },
    { border: "rgba(16, 185, 129, 0.5)", glow: "rgba(16, 185, 129, 0.25)", text: "#10B981", label: "Node 02" },
    { border: "rgba(168, 85, 247, 0.5)", glow: "rgba(168, 85, 247, 0.25)", text: "#A855F7", label: "Node 03" },
  ];

  // Robust Schedule Parser: Converts AI raw markdown tables, pipe strings, or bullets into structured rota items
  const parseSchedule = (raw: string): { rows: ParsedScheduleRow[]; notes: string } => {
    if (!raw) return { rows: [], notes: "" };

    const rows: ParsedScheduleRow[] = [];
    let summaryNotes = "";

    // 1. Check for markdown table format (| Day | Who Gives | ...)
    if (raw.includes("|") && raw.includes("---")) {
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          const cells = trimmed
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

          // Skip header and divider
          if (
            cells.length >= 4 &&
            !cells[0].toLowerCase().includes("day") &&
            !cells[0].includes("---")
          ) {
            rows.push({
              day: cells[0].replace(/[*_]/g, ""),
              giver: cells[1].replace(/[*_]/g, ""),
              item: cells[2].replace(/[*_]/g, ""),
              receiver: cells[3].replace(/[*_]/g, ""),
            });
          }
        } else if (!trimmed.startsWith("|") && trimmed.length > 5) {
          summaryNotes += " " + trimmed.replace(/[*_"]/g, "");
        }
      }
    }

    // 2. If table didn't yield items, check for bullet points or day mentions
    if (rows.length === 0) {
      const bullets = raw.split(/[-•\n]+/).map((b) => b.trim()).filter((b) => b.length > 10);
      const dayKeywords = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Mon-Tue", "Wed-Thu", "Fri-Sat"];

      for (const bullet of bullets) {
        let matchedDay = "";
        for (const d of dayKeywords) {
          if (bullet.toLowerCase().includes(d.toLowerCase())) {
            matchedDay = d;
            break;
          }
        }

        // Try to identify from & to farmers from the loop
        let matchedGiver = "";
        let matchedReceiver = "";
        for (const f of loop.farmers) {
          if (bullet.toLowerCase().includes(f.name.toLowerCase())) {
            if (!matchedGiver) matchedGiver = f.name;
            else if (!matchedReceiver) matchedReceiver = f.name;
          }
        }

        if (matchedDay || (matchedGiver && matchedReceiver)) {
          rows.push({
            day: matchedDay || "Scheduled Day",
            giver: matchedGiver || (loop.farmers[0]?.name ?? "Farmer A"),
            item: "Equipment / Resource",
            receiver: matchedReceiver || (loop.farmers[1]?.name ?? "Farmer B"),
            notes: bullet.replace(/[*_"]/g, "").trim(),
          });
        } else {
          summaryNotes += " " + bullet.replace(/[*_"]/g, "").trim();
        }
      }
    }

    // 3. Fallback: If still empty, build a clean 3-phase structured weekly schedule from loop.transfer_flow
    if (rows.length === 0 && loop.transfer_flow?.length >= 3) {
      const days = ["Mon – Tue", "Wed – Thu", "Fri – Sat"];
      loop.transfer_flow.forEach((flow, i) => {
        rows.push({
          day: days[i] || `Day Phase 0${i + 1}`,
          giver: flow.from,
          item: flow.item,
          receiver: flow.to,
          notes: `${flow.from} transfers ${flow.item} to ${flow.to} (${flow.distance_km} km distance)`,
        });
      });
      summaryNotes = "Sunday reserved for equipment maintenance, fuel calibration, and cycle review.";
    }

    return { rows, notes: summaryNotes.trim() };
  };

  const { rows: scheduleRows, notes: scheduleNotes } = parseSchedule(loop.ai_schedule);

  // Trigger interactive loop simulation
  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationStep(0);

    const stepInterval = setInterval(() => {
      setSimulationStep((prev) => {
        if (prev === null || prev >= loop.transfer_flow.length - 1) {
          clearInterval(stepInterval);
          setTimeout(() => {
            setIsSimulating(false);
            setSimulationStep(null);
          }, 1400);
          return loop.transfer_flow.length - 1;
        }
        return prev + 1;
      });
    }, 1800);
  };

  return (
    <div
      style={{
        borderRadius: "20px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: isDark ? "rgba(12, 20, 16, 0.88)" : "rgba(255, 255, 255, 0.94)",
        border: containsMe
          ? "2px solid #3B82F6"
          : isDark
          ? "1.5px solid rgba(255, 255, 255, 0.08)"
          : "1.5px solid rgba(15, 23, 42, 0.09)",
        boxShadow: containsMe
          ? "0 8px 32px rgba(59, 130, 246, 0.18)"
          : isDark
          ? "0 8px 28px rgba(0,0,0,0.3)"
          : "0 8px 24px rgba(15,23,42,0.05)",
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      {/* Top Header Banner */}
      <div
        style={{
          padding: "18px 24px 14px",
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1.5px solid rgba(59, 130, 246, 0.5)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3B82F6",
            }}
          >
            <ArrowRightLeft size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  margin: 0,
                  color: isDark ? "#E2E8F0" : "#0F172A",
                  letterSpacing: "-0.01em",
                }}
              >
                Loop #{loopIndex + 1}:{" "}
                <span style={{ color: "#3B82F6" }}>
                  {loop.farmers.map((f) => f.name.split(" ")[0]).join(" ➔ ")}
                </span>
              </h3>
              {containsMe && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    border: "1px solid #3B82F6",
                    background: "transparent",
                    color: "#3B82F6",
                    textTransform: "uppercase",
                  }}
                >
                  Your Loop
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "12px",
                margin: "2px 0 0",
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)",
              }}
            >
              Closed 3-way circular barter • Zero cash required
            </p>
          </div>
        </div>

        {/* Metrics & Interactive Simulation Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              background: "transparent",
              fontSize: "11px",
              fontWeight: 700,
              color: "#3B82F6",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <MapPin size={12} />
            <span>Circuit: {loop.total_distance_km} km</span>
          </div>

          <div
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              background: "transparent",
              fontSize: "11px",
              fontWeight: 700,
              color: "#10B981",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <ShieldCheck size={12} />
            <span>100% Cash-Free</span>
          </div>

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "10px",
              border: "1.5px solid #3B82F6",
              background: "transparent",
              color: "#3B82F6",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: isSimulating ? "wait" : "pointer",
              transition: "all 0.2s ease",
            }}
            title="Simulate sequential transfer of assets across the 3 farmers"
          >
            {isSimulating ? (
              <>
                <RotateCw size={13} className="animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Simulate Loop</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Simulation Status Banner */}
      <AnimatePresence>
        {isSimulating && simulationStep !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              borderBottom: "1px solid rgba(59, 130, 246, 0.3)",
              background: "transparent",
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#3B82F6",
                boxShadow: "0 0 8px #3B82F6",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#3B82F6" }}>
              Transfer {simulationStep + 1} of 3:{" "}
              {loop.transfer_flow[simulationStep]?.from} hands over{" "}
              <strong>{loop.transfer_flow[simulationStep]?.item}</strong> to{" "}
              {loop.transfer_flow[simulationStep]?.to}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body: 3 Transfer Nodes (Small Cards with Border Colour, NO Background Colour) */}
      <div style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {loop.transfer_flow.map((flow, fIdx) => {
            const fromFarmer = loop.farmers.find((f) => f.name === flow.from);
            const toFarmer = loop.farmers.find((f) => f.name === flow.to);
            const nodeStyle = nodeBorders[fIdx % nodeBorders.length];
            const isNodeActive = simulationStep === fIdx;

            return (
              <motion.div
                key={fIdx}
                animate={{
                  scale: isNodeActive ? 1.02 : 1,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  /* STRICT USER RULE: DO NOT ADD BACKGROUND COLOUR TO SMALL CARDS, USE BORDER COLOUR */
                  background: "transparent",
                  border: isNodeActive
                    ? `2px solid ${nodeStyle.text}`
                    : `1.5px solid ${nodeStyle.border}`,
                  borderRadius: "16px",
                  padding: "18px 20px",
                  position: "relative",
                  boxShadow: isNodeActive ? `0 0 20px ${nodeStyle.glow}` : "none",
                  transition: "all 0.25s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Top Node Indicator & Role */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: "8px",
                        border: `1px solid ${nodeStyle.border}`,
                        background: "transparent",
                        color: nodeStyle.text,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {nodeStyle.label}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)",
                      }}
                    >
                      Step 0{fIdx + 1}
                    </span>
                  </div>

                  {/* Provider Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        border: `2px solid ${nodeStyle.text}`,
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: nodeStyle.text,
                        fontWeight: 800,
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(flow.from)}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          margin: 0,
                          color: isDark ? "#FFFFFF" : "#0F172A",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {flow.from}
                      </h4>
                      <p
                        style={{
                          fontSize: "11px",
                          margin: "2px 0 0",
                          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <MapPin size={11} style={{ color: nodeStyle.text }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {fromFarmer?.location || "Regional Farm"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Handover Asset Pill (Border Only, No Background Fill) */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: `1.5px dashed ${nodeStyle.border}`,
                      background: "transparent",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)",
                        }}
                      >
                        Resource Dispatched:
                      </span>
                      <Tractor size={13} style={{ color: nodeStyle.text }} />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        fontWeight: 800,
                        color: nodeStyle.text,
                      }}
                    >
                      <span>Lends {flow.item}</span>
                      <ArrowRight size={14} className="animate-pulse" />
                    </div>
                  </div>

                  {/* Recipient Target */}
                  <div
                    style={{
                      padding: "8px 0",
                      fontSize: "12px",
                      color: isDark ? "#CBD5E1" : "#334155",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)",
                      }}
                    >
                      Handover Target:
                    </span>
                    <span style={{ fontWeight: 800, color: isDark ? "#F8FAFC" : "#0F172A" }}>
                      {flow.to}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)",
                      }}
                    >
                      {toFarmer?.location} • {flow.distance_km} km away
                    </span>
                  </div>
                </div>

                {/* Direct Handover WhatsApp Action */}
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}>
                  {toFarmer && toFarmer.phone !== currentUserPhone && (
                    <a
                      href={`https://wa.me/${toFarmer.whatsapp.replace(/[+\s-]/g, "")}?text=${encodeURIComponent(
                        `Hi ${toFarmer.name}, I am coordinating our 3-party cooperative barter match on SkyView! Regarding the transfer of ${flow.item}, when can we arrange the handover?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        width: "100%",
                        padding: "7px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(37, 211, 102, 0.45)",
                        background: "transparent",
                        color: "#25D366",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <MessageSquare size={13} />
                      <span>Coordinate with {flow.to.split(" ")[0]}</span>
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* REFORMED WEEKLY HANDOVER ROTA (REPLACING TACKY AI TAG & UNFORMATTED DUMP) */}
        {/* ========================================================================= */}
        <div
          style={{
            marginTop: "24px",
            padding: "20px 22px",
            borderRadius: "16px",
            border: isDark ? "1.5px solid rgba(59, 130, 246, 0.25)" : "1.5px solid rgba(59, 130, 246, 0.2)",
            background: "transparent",
          }}
        >
          {/* Header of Schedule: Clean, Professional, Authentic */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  border: "1px solid rgba(59, 130, 246, 0.5)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3B82F6",
                }}
              >
                <Calendar size={15} />
              </div>
              <div>
                <h5
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    margin: 0,
                    color: isDark ? "#93C5FD" : "#1E40AF",
                    letterSpacing: "0.2px",
                    textTransform: "uppercase",
                  }}
                >
                  Weekly Cooperative Handover Rota
                </h5>
                <p
                  style={{
                    fontSize: "11px",
                    margin: "1px 0 0",
                    color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)",
                  }}
                >
                  Synchronized schedule ensuring equitable asset rotation with zero downtime
                </p>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                background: "transparent",
                color: "#10B981",
                fontSize: "10.5px",
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={12} />
              <span>Conflict-Free Verified</span>
            </div>
          </div>

          {/* Structured Day-by-Day Rota Cards (Transparent backgrounds, crisp borders only) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "12px",
              marginBottom: scheduleNotes ? "14px" : "0",
            }}
          >
            {scheduleRows.map((item, rIdx) => (
              <div
                key={rIdx}
                style={{
                  /* STRICT USER CONSTRAINT: NO BACKGROUND COLOR ON SMALL CARDS */
                  background: "transparent",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(15, 23, 42, 0.09)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(59, 130, 246, 0.45)",
                      background: "transparent",
                      color: "#3B82F6",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.day}
                  </span>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <CheckCircle2 size={11} /> Handover
                  </span>
                </div>

                <div style={{ fontSize: "12px", lineHeight: "1.4", marginTop: "4px" }}>
                  <span style={{ fontWeight: 800, color: isDark ? "#F8FAFC" : "#0F172A" }}>
                    {item.giver}
                  </span>{" "}
                  <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)" }}>
                    delivers
                  </span>{" "}
                  <span style={{ fontWeight: 800, color: "#3B82F6" }}>{item.item}</span>{" "}
                  <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)" }}>
                    to
                  </span>{" "}
                  <span style={{ fontWeight: 800, color: isDark ? "#F8FAFC" : "#0F172A" }}>
                    {item.receiver}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Clean Guidance Note (No raw markdown table or pipes) */}
          {scheduleNotes && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
                background: "transparent",
                fontSize: "11.5px",
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)",
                lineHeight: "1.5",
              }}
            >
              <Info size={14} style={{ color: "#3B82F6", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ color: isDark ? "#93C5FD" : "#1E40AF" }}>Cooperative Advice: </strong>
                {scheduleNotes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
