import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { FarmBackground } from "@/components/FarmTheme";
import {
  Cpu,
  Wifi,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Sprout,
  Zap,
  Shield,
  ArrowLeft,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { HardwareCheckoutModal } from "@/components/hardware/HardwareCheckoutModal";
import { Truck, FileText } from "lucide-react";

const DEVICE_ID = "AGRISENSE-WS01";

const SPECS = [
  {
    icon: Thermometer,
    label: "Temperature",
    detail: "±0.1°C accuracy",
    color: "#E53935",
  },
  { icon: Droplets, label: "Humidity", detail: "0–100% RH", color: "#2196F3" },
  {
    icon: Sprout,
    label: "Soil Moisture",
    detail: "Capacitive sensor",
    color: "#4CAF50",
  },
  {
    icon: Wind,
    label: "Wind Speed",
    detail: "Anemometer, 0–60 km/h",
    color: "#00BCD4",
  },
  {
    icon: Sun,
    label: "Light & UV",
    detail: "Full-spectrum sensor",
    color: "#FF9800",
  },
  { icon: Cpu, label: "FPGA Core", detail: "Xilinx ZC706", color: "#9C27B0" },
  {
    icon: Wifi,
    label: "Connectivity",
    detail: "MQTT over Wi-Fi",
    color: "#2ECC71",
  },
  {
    icon: Zap,
    label: "AI Inference",
    detail: "On-device edge AI",
    color: "#F59E0B",
  },
];

const FEATURES = [
  "Real-time streaming to your dashboard",
  "FPGA-accelerated rain prediction & sensor fusion analysis",
  "Automated alerts for critical farm conditions",
  "LangGraph multi-agent AI analysis",
  "Works with any Indian market for crop pricing",
  "Voice assistant integration",
];

export default function BuyHardware() {
  const { connectHardware } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [ordered, setOrdered] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [existingOrder, setExistingOrder] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("agrisense_order_info");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExistingOrder(parsed);
        setOrdered(true);
      } catch (e) {}
    }
  }, []);

  const textPrimary = isDark ? "#A8D89A" : "#1B3A20";
  const textSecondary = isDark ? "#6A8A6A" : "#5A7A60";
  const cardBg = isDark
    ? "rgba(15, 25, 15, 0.82)"
    : "rgba(255, 255, 255, 0.92)";

  const handleDemoConnect = async () => {
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 1500));
    connectHardware(DEVICE_ID);
    navigate("/dashboard");
  };

  return (
    <div
      style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}
    >
      <FarmBackground />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/hardware-setup")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: textSecondary,
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "32px",
            padding: 0,
          }}
        >
          <ArrowLeft style={{ width: "16px", height: "16px" }} />
          Back to Hardware Setup
        </button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: cardBg,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderRadius: "24px",
            padding: "48px 40px",
            marginBottom: "24px",
            border: isDark
              ? "1px solid rgba(46,204,113,0.15)"
              : "1px solid rgba(200,230,200,0.5)",
            boxShadow: isDark
              ? "0 12px 40px rgba(0,0,0,0.3)"
              : "0 12px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "48px",
              alignItems: "center",
            }}
          >
            {/* Left: info */}
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(46,204,113,0.1)",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  marginBottom: "20px",
                  border: "1px solid rgba(46,204,113,0.2)",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#2ECC71",
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#2ECC71",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  New Generation
                </span>
              </div>

              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: textPrimary,
                  fontFamily: "'Nunito', sans-serif",
                  lineHeight: 1.2,
                  marginBottom: "16px",
                }}
              >
                AgriSense WS01
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: isDark ? '#A3B8A8' : '#2C3E30',
                  lineHeight: 1.7,
                  marginBottom: "28px",
                }}
              >
                The world's first FPGA-accelerated precision weather station
                built for Indian farmers. Streams 8 sensor channels in
                real-time, runs AI inference on-device, and connects directly to
                your SkyView AI dashboard.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "32px",
                }}
              >
                {FEATURES.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <CheckCircle2
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "#2ECC71",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <span style={{ fontSize: "13px", color: textSecondary }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                {!ordered ? (
                  <button
                    onClick={() => {
                      setExistingOrder(null);
                      setIsCheckoutOpen(true);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "14px 28px",
                      borderRadius: "14px",
                      border: "none",
                      background: "linear-gradient(135deg, #2ECC71, #1a9e52)",
                      color: "white",
                      fontSize: "15px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(46,204,113,0.4)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <ShoppingCart style={{ width: "18px", height: "18px" }} />
                    Order Now — ₹21,000 (Govt DBT 50% Available)
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "14px 18px",
                      borderRadius: "16px",
                      border: "1.5px solid #2ECC71",
                      background: "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 style={{ width: "18px", height: "18px", color: "#2ECC71" }} />
                      <span style={{ fontSize: "14px", fontWeight: 800, color: textPrimary }}>
                        Station Ordered ({existingOrder?.orderId || "SKY-ORD-849201"})
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: textSecondary }}>
                      Dispatched • Arriving{" "}
                      <strong style={{ color: "#2ECC71" }}>
                        {existingOrder?.estDelivery || "in 3–4 days"}
                      </strong>{" "}
                      via {existingOrder?.courier?.partner || "India Post Kisan Priority"}
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        onClick={() => setIsCheckoutOpen(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "1px solid #2ECC71",
                          background: "transparent",
                          color: "#2ECC71",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Truck size={13} /> View Tracking & Invoice
                      </button>

                      <button
                        onClick={() => {
                          setExistingOrder(null);
                          setIsCheckoutOpen(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                          background: "transparent",
                          color: textSecondary,
                          fontSize: "11.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Re-Order Unit
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDemoConnect}
                  disabled={connecting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 24px",
                    borderRadius: "14px",
                    border: "1.5px solid #2196F3",
                    background: "transparent",
                    color: "#2196F3",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: connecting ? "wait" : "pointer",
                  }}
                >
                  <Wifi style={{ width: "16px", height: "16px" }} />
                  {connecting ? "Connecting..." : "Try Demo (Connect WS01)"}
                </button>
              </div>
            </div>

            {/* Right: hardware physical image */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: "360px",
                  borderRadius: "24px",
                  background: isDark
                    ? "rgba(255, 255, 255, 0.02)"
                    : "rgba(255, 255, 255, 0.8)",
                  border: isDark
                    ? "1px solid rgba(46, 204, 113, 0.15)"
                    : "1px solid rgba(200, 230, 200, 0.5)",
                  boxShadow: isDark
                    ? "0 20px 48px rgba(0, 0, 0, 0.4)"
                    : "0 20px 48px rgba(0, 0, 0, 0.06)",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <img
                  src="/hardware_station.png"
                  alt="AgriSense WS01 Physical Weather Station"
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: "16px",
                    objectFit: "contain",
                    maxHeight: "340px",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Specs grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: textPrimary,
              marginBottom: "16px",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Sensor Specifications
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {SPECS.map(({ icon: Icon, label, detail, color }) => (
              <div
                key={label}
                style={{
                  background: "transparent",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  border: `1.5px solid ${color}40`,
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "transparent",
                    border: `1.5px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: "20px", height: "20px", color }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: textPrimary,
                      margin: 0,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: textSecondary,
                      margin: 0,
                    }}
                  >
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <HardwareCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          const saved = localStorage.getItem("agrisense_order_info");
          if (saved) {
            try {
              setExistingOrder(JSON.parse(saved));
              setOrdered(true);
            } catch (e) {}
          }
        }}
        onConnectHardware={handleDemoConnect}
        isDark={isDark}
        initialOrder={existingOrder}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
