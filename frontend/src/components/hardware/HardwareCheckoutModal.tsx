import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSecureRandomInt } from "@/lib/secureRandom";
import {
  X,
  CheckCircle2,
  Truck,
  ShieldCheck,
  FileText,
  Wifi,
  Cpu,
  MapPin,
  Phone,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  Download,
  Printer,
  ChevronRight,
  RotateCw,
  CreditCard,
  Building,
  Check,
  Package,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HardwareCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectHardware: (deviceId: string) => void;
  isDark: boolean;
  initialOrder?: any;
}

export function HardwareCheckoutModal({
  isOpen,
  onClose,
  onConnectHardware,
  isDark,
  initialOrder,
}: HardwareCheckoutModalProps) {
  const [step, setStep] = useState<"form" | "processing" | "confirmed" | "invoice">("form");
  const [applySubsidy, setApplySubsidy] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "kcc" | "dbt">("cod");

  // Form Fields (pre-filled with real farm defaults)
  const [name, setName] = useState(localStorage.getItem("user_name") || "Ramesh Patil");
  const [phone, setPhone] = useState(localStorage.getItem("user_phone") || "+91 98201 44821");
  const [plotAddress, setPlotAddress] = useState("Survey No. 44/2, Agro-Corridor");
  const [village, setVillage] = useState("Daund Rural, Tehsil Baramati");
  const [district, setDistrict] = useState("Pune, Maharashtra");
  const [pincode, setPincode] = useState("412260");
  const [installationAssistance, setInstallationAssistance] = useState(true);

  // Confirmed Order Details
  const [orderDetails, setOrderDetails] = useState<any>(initialOrder || null);

  useEffect(() => {
    if (initialOrder) {
      setOrderDetails(initialOrder);
      setStep("confirmed");
    } else {
      const saved = localStorage.getItem("agrisense_order_info");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setOrderDetails(parsed);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [initialOrder, isOpen]);

  if (!isOpen) return null;

  const basePrice = 21000;
  const subsidyAmount = applySubsidy ? 10500 : 0;
  const netPayable = basePrice - subsidyAmount;

  const handlePlaceOrder = () => {
    setStep("processing");

    setTimeout(() => {
      const orderId = "SKY-ORD-" + getSecureRandomInt(100000, 999999);
      const serialNumber = "WS01-REV3-" + getSecureRandomInt(1000, 9999);
      const today = new Date();
      const deliveryDate = new Date();
      deliveryDate.setDate(today.getDate() + 3);

      const newOrder = {
        orderId,
        serialNumber,
        orderDate: today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        estDelivery: deliveryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        name,
        phone,
        address: `${plotAddress}, ${village}, ${district} - ${pincode}`,
        netPayable,
        subsidyAmount,
        paymentMethod,
        appliedSubsidy: applySubsidy,
        technician: {
          name: "Rajesh Deshmukh",
          designation: "District Agricultural IoT Officer",
          phone: "+91 98201 44821",
        },
        courier: {
          partner: "India Post Kisan Priority Express",
          trackingNumber: "INP-MH-" + getSecureRandomInt(100000, 999999),
        },
      };

      setOrderDetails(newOrder);
      localStorage.setItem("agrisense_order_info", JSON.stringify(newOrder));
      setStep("confirmed");
    }, 1600);
  };

  const cardBg = isDark ? "rgba(18, 26, 20, 0.98)" : "rgba(255, 255, 255, 0.98)";
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(15, 23, 42, 0.6)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.1)";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25 }}
        style={{
          width: "100%",
          maxWidth: step === "invoice" ? "820px" : "680px",
          background: cardBg,
          borderRadius: "24px",
          border: isDark ? "1.5px solid rgba(46, 204, 113, 0.3)" : "1.5px solid rgba(46, 204, 113, 0.35)",
          boxShadow: isDark
            ? "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(46, 204, 113, 0.15)"
            : "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 30px rgba(46, 204, 113, 0.12)",
          overflow: "hidden",
          position: "relative",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: borderColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(46, 204, 113, 0.15)",
                border: "1px solid rgba(46, 204, 113, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2ECC71",
              }}
            >
              <Cpu size={18} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 900,
                  margin: 0,
                  color: textColor,
                }}
              >
                {step === "invoice"
                  ? "Official Tax Invoice & Warranty Slip"
                  : step === "confirmed"
                  ? "Hardware Order & Dispatch Tracking"
                  : "AgriSense WS01 Hardware Procurement"}
              </h2>
              <p style={{ fontSize: "12px", margin: "2px 0 0", color: subTextColor }}>
                {step === "invoice"
                  ? "Proforma Tax Invoice under Digital Agriculture Mission"
                  : step === "confirmed"
                  ? "Official Order Confirmed • Assigned Regional Field Support"
                  : "FPGA Weather Station • Government DBT Subsidy Pre-Approved"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: borderColor,
              background: "transparent",
              color: subTextColor,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
          {/* ================= STEP 1: FORM ================= */}
          {step === "form" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Product Kit Overview Box */}
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "16px",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <img
                    src="/hardware_station.png"
                    alt="AgriSense WS01"
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "12px",
                      objectFit: "contain",
                      border: borderColor,
                      padding: "4px",
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: textColor }}>
                      AgriSense WS01 Weather Station (FPGA Kit)
                    </h3>
                    <p style={{ fontSize: "11.5px", margin: "3px 0 0", color: subTextColor }}>
                      Includes: Solar Panel Mount • Multi-Depth Soil Probe • LoRa/WiFi Dual Antenna • 2-Yr Warranty
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#2ECC71" }}>
                    ₹{netPayable.toLocaleString("en-IN")}
                  </div>
                  {applySubsidy && (
                    <div style={{ fontSize: "11px", color: subTextColor, textDecoration: "line-through" }}>
                      MRP ₹{basePrice.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Details Form */}
              <div>
                <h4
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: subTextColor,
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MapPin size={13} style={{ color: "#2ECC71" }} />
                  Farm Delivery & Installation Site
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: subTextColor, display: "block", marginBottom: "4px" }}>
                      Recipient Farmer Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: borderColor,
                        background: "transparent",
                        color: textColor,
                        fontSize: "13px",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: subTextColor, display: "block", marginBottom: "4px" }}>
                      Mobile Number (SMS Updates)
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: borderColor,
                        background: "transparent",
                        color: textColor,
                        fontSize: "13px",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: subTextColor, display: "block", marginBottom: "4px" }}>
                      Farm / Plot Survey Address (Where to Mount Station)
                    </label>
                    <input
                      type="text"
                      value={plotAddress}
                      onChange={(e) => setPlotAddress(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: borderColor,
                        background: "transparent",
                        color: textColor,
                        fontSize: "13px",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: subTextColor, display: "block", marginBottom: "4px" }}>
                      Village & Tehsil
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: borderColor,
                        background: "transparent",
                        color: textColor,
                        fontSize: "13px",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: subTextColor, display: "block", marginBottom: "4px" }}>
                      District, State & Pincode
                    </label>
                    <input
                      type="text"
                      value={`${district} - ${pincode}`}
                      onChange={(e) => {
                        const parts = e.target.value.split("-");
                        setDistrict(parts[0] || "");
                        if (parts[1]) setPincode(parts[1].trim());
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: borderColor,
                        background: "transparent",
                        color: textColor,
                        fontSize: "13px",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Subsidy Benefit Breakdown */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  border: "1.5px solid rgba(46, 204, 113, 0.3)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={20} style={{ color: "#2ECC71", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: textColor }}>
                      National Agricultural Mechanization Subsidy (SMAM)
                    </div>
                    <div style={{ fontSize: "11px", color: subTextColor }}>
                      50% DBT Grant applied automatically to precision IoT hardware
                    </div>
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#2ECC71",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={applySubsidy}
                    onChange={(e) => setApplySubsidy(e.target.checked)}
                    style={{ accentColor: "#2ECC71", width: "16px", height: "16px" }}
                  />
                  <span>Apply -₹10,500</span>
                </label>
              </div>

              {/* Payment / Settlement Choice */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: subTextColor, display: "block", marginBottom: "8px" }}>
                  Payment & Verification Method
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {[
                    { id: "cod", label: "Cash on Delivery", desc: "Pay after field mounting & check" },
                    { id: "kcc", label: "Kisan Credit Card", desc: "0% Interest Seasonal EMI" },
                    { id: "dbt", label: "DBT Voucher Claim", desc: "Direct Govt subsidy pre-claim" },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border:
                          paymentMethod === m.id
                            ? "2px solid #2ECC71"
                            : isDark
                            ? "1px solid rgba(255, 255, 255, 0.08)"
                            : "1px solid rgba(15, 23, 42, 0.08)",
                        background: "transparent",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: "12.5px", fontWeight: 800, color: textColor, marginBottom: "2px" }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: "10px", color: subTextColor }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Free Installation Assistance Checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: textColor,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={installationAssistance}
                  onChange={(e) => setInstallationAssistance(e.target.checked)}
                  style={{ accentColor: "#2ECC71", width: "16px", height: "16px" }}
                />
                <span>Include free on-farm mast mounting & sensor orientation assistance by district technician</span>
              </label>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <Button
                  onClick={handlePlaceOrder}
                  style={{
                    flex: 1,
                    height: "46px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #2ECC71, #1a9e52)",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 800,
                    boxShadow: "0 4px 16px rgba(46, 204, 113, 0.35)",
                    border: "none",
                  }}
                >
                  Confirm Order — ₹{netPayable.toLocaleString("en-IN")}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  style={{
                    height: "46px",
                    borderRadius: "12px",
                    border: borderColor,
                    background: "transparent",
                    color: subTextColor,
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PROCESSING SIMULATION ================= */}
          {step === "processing" && (
            <div
              style={{
                padding: "60px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: "16px",
              }}
            >
              <RotateCw size={40} className="animate-spin text-emerald-500" />
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: textColor, margin: 0 }}>
                  Generating Official Serial & Allocating Regional Inventory...
                </h3>
                <p style={{ fontSize: "13px", color: subTextColor, marginTop: "6px" }}>
                  Verifying SMAM DBT grant eligibility and assigning District Field Technician...
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 3: ORDER CONFIRMED & TRACKING HUB ================= */}
          {step === "confirmed" && orderDetails && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Confirmed Banner */}
              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "1.5px solid rgba(46, 204, 113, 0.4)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      border: "2px solid #2ECC71",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2ECC71",
                    }}
                  >
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 900, color: textColor }}>
                        Order Confirmed & Logged
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          border: "1px solid #2ECC71",
                          color: "#2ECC71",
                        }}
                      >
                        {orderDetails.orderId}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: subTextColor, marginTop: "2px" }}>
                      Assigned Station Serial: <strong>{orderDetails.serialNumber}</strong> • Est Delivery:{" "}
                      <strong style={{ color: "#2ECC71" }}>{orderDetails.estDelivery}</strong>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep("invoice")}
                  variant="outline"
                  size="sm"
                  style={{
                    border: borderColor,
                    background: "transparent",
                    color: textColor,
                    fontSize: "12px",
                    fontWeight: 700,
                    gap: "6px",
                  }}
                >
                  <FileText size={14} /> View Tax Invoice
                </Button>
              </div>

              {/* Realistic Dispatch Progress Timeline */}
              <div>
                <h4
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: subTextColor,
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Truck size={14} style={{ color: "#2ECC71" }} />
                  Live Logistics & Dispatch Milestones
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    {
                      title: "Order Verified & Grant Cleared",
                      desc: "DBT Subsidy Voucher registered with Ministry of Agriculture portal",
                      status: "completed",
                      date: orderDetails.orderDate,
                    },
                    {
                      title: "Factory Sensor Calibration & QA Inspection",
                      desc: "Testing capacitive soil sensor, Xilinx FPGA core, and anemometer accuracy",
                      status: "current",
                      date: "In Progress (Pune Lab)",
                    },
                    {
                      title: "Dispatched via India Post Kisan Priority Express",
                      desc: `Courier Consignment #${orderDetails.courier?.trackingNumber || "INP-MH-829104"}`,
                      status: "upcoming",
                      date: "Expected Tomorrow",
                    },
                    {
                      title: "On-Farm Delivery & Free Mast Mounting",
                      desc: `Field Technician ${orderDetails.technician?.name} will assist mounting`,
                      status: "upcoming",
                      date: orderDetails.estDelivery,
                    },
                  ].map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          border:
                            m.status === "completed" || m.status === "current"
                              ? "2px solid #2ECC71"
                              : borderColor,
                          background: m.status === "completed" ? "transparent" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#2ECC71",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {m.status === "completed" ? (
                          <Check size={13} strokeWidth={3} />
                        ) : m.status === "current" ? (
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2ECC71" }} />
                        ) : null}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          paddingBottom: idx !== 3 ? "12px" : "0",
                          borderBottom: idx !== 3 ? borderColor : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 800,
                              color: m.status === "upcoming" ? subTextColor : textColor,
                            }}
                          >
                            {m.title}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: m.status === "current" ? "#2ECC71" : subTextColor }}>
                            {m.date}
                          </span>
                        </div>
                        <p style={{ fontSize: "11.5px", margin: "2px 0 0", color: subTextColor }}>
                          {m.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Technician Profile */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(15, 23, 42, 0.08)",
                  background: "transparent",
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
                      borderRadius: "50%",
                      border: "1.5px solid #2ECC71",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2ECC71",
                    }}
                  >
                    <Wrench size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: textColor }}>
                      {orderDetails.technician?.name || "Rajesh Deshmukh"}
                    </div>
                    <div style={{ fontSize: "11px", color: subTextColor }}>
                      {orderDetails.technician?.designation || "District Agricultural IoT Officer"}
                    </div>
                  </div>
                </div>

                <a
                  href={`tel:${orderDetails.technician?.phone || "+919820144821"}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(46, 204, 113, 0.4)",
                    color: "#2ECC71",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Phone size={13} /> Call Field Tech
                </a>
              </div>

              {/* Action Buttons: Instant Pair vs Close */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
                <Button
                  onClick={() => {
                    onConnectHardware("AGRISENSE-WS01");
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    minWidth: "220px",
                    height: "46px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #2196F3, #1565C0)",
                    color: "#FFFFFF",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    gap: "8px",
                    border: "none",
                  }}
                >
                  <Wifi size={16} /> Instant Pair with Dashboard (Demo)
                </Button>

                <Button
                  variant="outline"
                  onClick={onClose}
                  style={{
                    height: "46px",
                    borderRadius: "12px",
                    border: borderColor,
                    background: "transparent",
                    color: textColor,
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  Back to Farm
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: OFFICIAL TAX INVOICE ================= */}
          {step === "invoice" && orderDetails && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(15, 23, 42, 0.15)",
                  borderRadius: "16px",
                  padding: "24px",
                  background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
                  fontFamily: "'Courier New', Courier, monospace, sans-serif",
                }}
              >
                {/* Invoice Top Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: borderColor, paddingBottom: "16px", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: 900, color: textColor, margin: 0, fontFamily: "sans-serif" }}>
                      AGRISENSE PRECISION SYSTEMS INDIA LTD.
                    </h3>
                    <p style={{ fontSize: "11px", color: subTextColor, margin: "2px 0 0" }}>
                      Govt Authorized Precision Farming Hardware Supplier (GSTIN: 27AABCA1234F1Z5)
                    </p>
                    <p style={{ fontSize: "11px", color: subTextColor, margin: "2px 0 0" }}>
                      Ministry of Agriculture DBT Portal Registered Vendor #AGRI-VEND-9482
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#2ECC71", fontFamily: "sans-serif" }}>
                      TAX PROFORMA INVOICE
                    </div>
                    <div style={{ fontSize: "11px", color: subTextColor }}>
                      Inv No: {orderDetails.orderId}
                    </div>
                    <div style={{ fontSize: "11px", color: subTextColor }}>
                      Date: {orderDetails.orderDate}
                    </div>
                  </div>
                </div>

                {/* Farmer & Dispatch Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "11.5px", marginBottom: "16px", borderBottom: borderColor, paddingBottom: "16px" }}>
                  <div>
                    <strong style={{ color: textColor }}>Billed & Shipped To:</strong>
                    <div style={{ color: subTextColor, marginTop: "3px" }}>{orderDetails.name}</div>
                    <div style={{ color: subTextColor }}>Phone: {orderDetails.phone}</div>
                    <div style={{ color: subTextColor }}>Plot: {orderDetails.address}</div>
                  </div>
                  <div>
                    <strong style={{ color: textColor }}>Fulfillment & Warranty:</strong>
                    <div style={{ color: subTextColor, marginTop: "3px" }}>Hardware Serial: {orderDetails.serialNumber}</div>
                    <div style={{ color: subTextColor }}>Carrier: {orderDetails.courier?.partner}</div>
                    <div style={{ color: subTextColor }}>Warranty: 24 Months Replacement (Xilinx FPGA)</div>
                  </div>
                </div>

                {/* Bill Table */}
                <div style={{ fontSize: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: textColor, borderBottom: borderColor, paddingBottom: "6px" }}>
                    <span>Item Description</span>
                    <span>HSN Code</span>
                    <span>Amount</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: subTextColor, padding: "8px 0" }}>
                    <span>AgriSense WS01 Autonomous Weather Station Kit</span>
                    <span>8436</span>
                    <span>₹21,000.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#2ECC71", padding: "4px 0" }}>
                    <span>SMAM 50% National Mechanization DBT Subsidy</span>
                    <span>GOVT-GRANT</span>
                    <span>-₹{orderDetails.subsidyAmount?.toLocaleString("en-IN") || "10,500.00"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: subTextColor, padding: "4px 0" }}>
                    <span>Integrated Solar Enclosure & Telescopic Mast</span>
                    <span>INCLUDED</span>
                    <span>₹0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: subTextColor, padding: "4px 0" }}>
                    <span>Kisan Express Delivery & On-Farm Mounting Guidance</span>
                    <span>FREE</span>
                    <span>₹0.00</span>
                  </div>
                </div>

                {/* Total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed rgba(46, 204, 113, 0.4)", paddingTop: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: subTextColor }}>Payment Status: Verified / {orderDetails.paymentMethod?.toUpperCase()}</div>
                    <div style={{ fontSize: "10px", color: "#2ECC71" }}>Official Digital Signature: [SIGNED_BY_SKYVIEW_AGRI_PORTAL]</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: subTextColor }}>Total Net Payable:</div>
                    <div style={{ fontSize: "20px", fontWeight: 900, color: "#2ECC71", fontFamily: "sans-serif" }}>
                      ₹{orderDetails.netPayable?.toLocaleString("en-IN") || "10,500.00"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons on invoice */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  style={{
                    borderRadius: "10px",
                    border: borderColor,
                    background: "transparent",
                    color: textColor,
                    fontSize: "12px",
                    fontWeight: 700,
                    gap: "6px",
                  }}
                >
                  <Printer size={14} /> Print Tax Receipt
                </Button>

                <Button
                  onClick={() => setStep("confirmed")}
                  style={{
                    borderRadius: "10px",
                    background: "#2ECC71",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  Back to Tracking
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
