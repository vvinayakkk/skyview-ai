"use client";

import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Cloud, BarChart3, Brain, Cpu, MessageSquare, Droplets,
    Sprout, BookOpen, Eye, Zap, ChevronDown, X,
    Thermometer
} from "lucide-react";
import { motion, useScroll, useTransform, useSpring, MotionValue, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";

/** Individual grass blade that pops up at a specific scroll position */
function GrassBlade({ x, h, lean, stroke, scrollProgress, rangeStart, rangeEnd }: {
    x: number; h: number; lean: number; stroke: string;
    scrollProgress: MotionValue<number>; rangeStart: number; rangeEnd: number;
}) {
    const opacity = useTransform(scrollProgress, [rangeStart, rangeEnd], [0, 1]);
    const scaleY = useTransform(scrollProgress, [rangeStart, rangeEnd], [0, 1]);

    return (
        <motion.svg
            width="20" height="56" viewBox={`${x - 10} 0 20 56`}
            style={{
                position: "absolute",
                left: `${(x / 1440) * 100}%`,
                bottom: 0,
                opacity,
                scaleY,
                transformOrigin: "bottom center",
                overflow: "visible",
            }}
        >
            <path
                d={`M${x},56 Q${x + lean * 0.6},${56 - h * 0.5} ${x + lean},${56 - h}`}
                stroke={stroke}
                strokeWidth="2.8" strokeLinecap="round" fill="none"
            />
        </motion.svg>
    );
}

export default function Landing() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const smooth = useSpring(scrollYProgress, { stiffness: 55, damping: 18 });
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";
    const { isAuthenticated } = useAuth();

    const [activePanel, setActivePanel] = useState<"features" | "farmers-guide" | null>(null);

    // Tractor drives from right to left across the mid-ground
    const tractorX = useTransform(smooth, [0, 1], ["80vw", "-30vw"]);

    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    // Theme-aware colors
    const skyGradient = isDark
        ? "linear-gradient(180deg, #0B1A2E 0%, #152238 45%, #1A2E1A 72%, #0F2E0F 100%)"
        : "linear-gradient(180deg, #8DD8EE 0%, #B8E8F8 45%, #C8EAB8 72%, #5DBD5D 100%)";
    const cloudColor = isDark ? "rgba(180,200,220,0.15)" : "white";
    const cloudOpacityMul = isDark ? 0.3 : 1;
    const backHillColor = isDark ? "#2A5A2A" : "#88C878";
    const midHillColor = isDark ? "#1E4A1E" : "#5CB85C";
    const frontGroundColor = isDark ? "#1A3A1A" : "#4CAF50";

    return (
        <div ref={containerRef} style={{ height: "400vh" }}>
            {/* STICKY VIEWPORT */}
            <div style={{
                position: "sticky", top: 0,
                width: "100%", height: "100vh",
                overflow: "hidden",
            }}>

                {/* ── SKY ── */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: skyGradient,
                    transition: "background 0.6s ease",
                }} />

                {/* ── SUN / MOON TOGGLE ── */}
                <motion.div
                    onClick={toggleTheme}
                    style={{
                        position: "absolute",
                        top: "8%",
                        right: "15%",
                        zIndex: 45,
                        cursor: "pointer",
                        width: "80px",
                        height: "80px",
                    }}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.92 }}
                    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                    <AnimatePresence mode="wait">
                        {isDark ? (
                            <motion.svg
                                key="moon"
                                width="80" height="80" viewBox="0 0 80 80"
                                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            >
                                <circle cx="40" cy="40" r="38" fill="rgba(200,210,240,0.10)" />
                                <circle cx="36" cy="38" r="22" fill="#E8E4D8" />
                                <circle cx="48" cy="32" r="18" fill="#152238" />
                                <circle cx="30" cy="34" r="3" fill="rgba(0,0,0,0.08)" />
                                <circle cx="38" cy="46" r="2.5" fill="rgba(0,0,0,0.06)" />
                                <circle cx="28" cy="44" r="1.8" fill="rgba(0,0,0,0.07)" />
                                <circle cx="65" cy="15" r="1.5" fill="#FFF8E0" opacity="0.9" />
                                <circle cx="12" cy="20" r="1" fill="#FFF8E0" opacity="0.7" />
                                <circle cx="70" cy="55" r="1.2" fill="#FFF8E0" opacity="0.8" />
                                <circle cx="18" cy="60" r="1.8" fill="#FFF8E0" opacity="0.6" />
                                <circle cx="58" cy="68" r="1" fill="#FFF8E0" opacity="0.7" />
                                <polygon points="60,35 61.5,38 65,38.5 62,41 63,45 60,42.5 57,45 58,41 55,38.5 58.5,38" fill="#FFF8E0" opacity="0.85" />
                            </motion.svg>
                        ) : (
                            <motion.svg
                                key="sun"
                                width="80" height="80" viewBox="0 0 80 80"
                                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            >
                                <circle cx="40" cy="40" r="36" fill="rgba(255,200,50,0.15)" />
                                <circle cx="40" cy="40" r="28" fill="rgba(255,180,30,0.12)" />
                                <circle cx="40" cy="40" r="18" fill="#FFD93D" />
                                <circle cx="40" cy="40" r="15" fill="#FFE066" />
                                <circle cx="35" cy="38" r="1.5" fill="#E8A020" />
                                <circle cx="45" cy="38" r="1.5" fill="#E8A020" />
                                <path d="M36,44 Q40,47 44,44" fill="none" stroke="#E8A020" strokeWidth="1.2" strokeLinecap="round" />
                                <motion.g
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                                    style={{ transformOrigin: "40px 40px" }}
                                >
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const angle = (i * 30) * (Math.PI / 180);
                                        const x1 = 40 + Math.cos(angle) * 22;
                                        const y1 = 40 + Math.sin(angle) * 22;
                                        const x2 = 40 + Math.cos(angle) * (i % 2 === 0 ? 32 : 27);
                                        const y2 = 40 + Math.sin(angle) * (i % 2 === 0 ? 32 : 27);
                                        return (
                                            <line
                                                key={i}
                                                x1={x1} y1={y1} x2={x2} y2={y2}
                                                stroke="#FFD93D"
                                                strokeWidth={i % 2 === 0 ? "2.5" : "1.5"}
                                                strokeLinecap="round"
                                                opacity="0.8"
                                            />
                                        );
                                    })}
                                </motion.g>
                            </motion.svg>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── STARS (dark mode) ── */}
                {isDark && (
                    <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
                        {[
                            { x: "5%", y: "8%", r: 1.5, d: 2.5 },
                            { x: "12%", y: "15%", r: 1, d: 3.2 },
                            { x: "25%", y: "5%", r: 1.8, d: 2.0 },
                            { x: "35%", y: "12%", r: 1.2, d: 4.0 },
                            { x: "50%", y: "4%", r: 1.5, d: 2.8 },
                            { x: "62%", y: "10%", r: 1, d: 3.5 },
                            { x: "75%", y: "6%", r: 1.8, d: 2.2 },
                            { x: "88%", y: "12%", r: 1.3, d: 3.0 },
                            { x: "92%", y: "5%", r: 1, d: 4.5 },
                            { x: "8%", y: "22%", r: 0.8, d: 3.8 },
                            { x: "42%", y: "18%", r: 1.2, d: 2.6 },
                            { x: "68%", y: "20%", r: 0.9, d: 3.3 },
                        ].map((star, i) => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ repeat: Infinity, duration: star.d, ease: "easeInOut", delay: i * 0.3 }}
                                style={{
                                    position: "absolute",
                                    left: star.x,
                                    top: star.y,
                                    width: star.r * 2,
                                    height: star.r * 2,
                                    borderRadius: "50%",
                                    background: "#FFF8E0",
                                    boxShadow: `0 0 ${star.r * 3}px rgba(255,248,224,0.6)`,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* ── CLOUDS ── */}
                <motion.div
                    animate={{ x: [0, -80, 0] }}
                    transition={{ repeat: Infinity, duration: 50, ease: "easeInOut" }}
                    style={{ position: "absolute", top: "6%", left: "2%", zIndex: 4 }}>
                    <svg width="230" height="80" viewBox="0 0 230 80">
                        <ellipse cx="60" cy="55" rx="55" ry="30" fill={cloudColor} opacity={0.95 * cloudOpacityMul} />
                        <ellipse cx="110" cy="42" rx="55" ry="35" fill={cloudColor} opacity={0.97 * cloudOpacityMul} />
                        <ellipse cx="170" cy="55" rx="55" ry="28" fill={cloudColor} opacity={0.93 * cloudOpacityMul} />
                    </svg>
                </motion.div>
                <motion.div
                    animate={{ x: [0, 60, 0] }}
                    transition={{ repeat: Infinity, duration: 45, ease: "easeInOut" }}
                    style={{ position: "absolute", top: "3%", left: "30%", zIndex: 4 }}>
                    <svg width="160" height="58" viewBox="0 0 160 58">
                        <ellipse cx="40" cy="40" rx="38" ry="22" fill={cloudColor} opacity={0.90 * cloudOpacityMul} />
                        <ellipse cx="82" cy="30" rx="40" ry="26" fill={cloudColor} opacity={0.92 * cloudOpacityMul} />
                        <ellipse cx="124" cy="40" rx="35" ry="20" fill={cloudColor} opacity={0.88 * cloudOpacityMul} />
                    </svg>
                </motion.div>
                <motion.div
                    animate={{ x: [0, -50, 0] }}
                    transition={{ repeat: Infinity, duration: 50, ease: "easeInOut" }}
                    style={{ position: "absolute", top: "4%", right: "8%", zIndex: 4 }}>
                    <svg width="210" height="75" viewBox="0 0 210 75">
                        <ellipse cx="55" cy="52" rx="50" ry="28" fill={cloudColor} opacity={0.94 * cloudOpacityMul} />
                        <ellipse cx="108" cy="38" rx="55" ry="33" fill={cloudColor} opacity={0.96 * cloudOpacityMul} />
                        <ellipse cx="162" cy="52" rx="48" ry="26" fill={cloudColor} opacity={0.92 * cloudOpacityMul} />
                    </svg>
                </motion.div>
                <motion.div
                    animate={{ x: [0, 70, 0] }}
                    transition={{ repeat: Infinity, duration: 50, ease: "easeInOut" }}
                    style={{ position: "absolute", top: "14%", right: "25%", zIndex: 4 }}>
                    <svg width="130" height="48" viewBox="0 0 130 48">
                        <ellipse cx="35" cy="35" rx="32" ry="18" fill={cloudColor} opacity={0.88 * cloudOpacityMul} />
                        <ellipse cx="70" cy="25" rx="35" ry="22" fill={cloudColor} opacity={0.90 * cloudOpacityMul} />
                        <ellipse cx="105" cy="35" rx="28" ry="16" fill={cloudColor} opacity={0.86 * cloudOpacityMul} />
                    </svg>
                </motion.div>

                {/* ── BACK HILL ── */}
                <svg style={{ position: "absolute", bottom: "30%", width: "100%", zIndex: 5, pointerEvents: "none" }}
                    viewBox="0 0 1440 200" preserveAspectRatio="none">
                    <path d="M0,140 Q200,60 480,120 Q720,175 960,90 Q1200,20 1440,110 L1440,200 L0,200 Z"
                        fill={backHillColor} style={{ transition: "fill 0.6s ease" }} />
                </svg>

                {/* ── MID HILL ── */}
                <svg style={{ position: "absolute", bottom: "20%", width: "100%", zIndex: 6, pointerEvents: "none" }}
                    viewBox="0 0 1440 170" preserveAspectRatio="none">
                    <path d="M0,110 Q360,35 720,105 Q1080,165 1440,75 L1440,170 L0,170 Z"
                        fill={midHillColor} style={{ transition: "fill 0.6s ease" }} />
                </svg>

                {/* ── FRONT GROUND ── */}
                <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: "24%", background: frontGroundColor, zIndex: 7,
                    transition: "background 0.6s ease",
                }} />

                {/* ── GROUND SHADOW ── */}
                <div style={{
                    position: "absolute", bottom: "24%", left: 0, right: 0,
                    height: "28px",
                    background: "linear-gradient(180deg,rgba(0,0,0,0.10),transparent)",
                    zIndex: 8,
                }} />

                {/* ── GRASS TRAIL ── */}
                <div style={{
                    position: "absolute", bottom: "23.5%",
                    left: 0, width: "100%", height: "56px",
                    zIndex: 9, pointerEvents: "none",
                }}>
                    {Array.from({ length: 120 }).map((_, i) => {
                        const x = i * 12 + 6;
                        const h = 20 + (i % 6) * 4;
                        const lean = (i % 4 === 0) ? -5 : (i % 4 === 1) ? 4 : (i % 4 === 2) ? -3 : 2;
                        const strokeColor = i % 3 === 0 ? "#2E7D32" : i % 3 === 1 ? "#43A047" : "#1B5E20";
                        const normalizedPos = (119 - i) / 119;
                        const bladeStart = normalizedPos * 0.85;
                        const bladeEnd = Math.min(bladeStart + 0.06, 1);

                        return (
                            <GrassBlade
                                key={i}
                                x={x} h={h} lean={lean}
                                stroke={strokeColor}
                                scrollProgress={smooth}
                                rangeStart={bladeStart}
                                rangeEnd={bladeEnd}
                            />
                        );
                    })}
                </div>

                {/* ═══════════════════════════════════════
                    SCENE ELEMENTS
                ═══════════════════════════════════════ */}

                {/* 1. GREENHOUSE */}
                <div style={{
                    position: "absolute",
                    left: "0%", bottom: "36%",
                    width: "28%", zIndex: 10,
                }}>
                    <img src="/greenhouse.png" alt="greenhouse" style={{
                        width: "100%", objectFit: "contain",
                        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.15))"
                    }} />
                </div>

                {/* 2. SUNFLOWERS */}
                <motion.div
                    style={{ position: "absolute", left: "0%", bottom: "2%", width: "28%", zIndex: 14 }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                >
                    <img src="/sunflower.png" alt="sunflowers" style={{
                        width: "100%", objectFit: "contain",
                        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.18))"
                    }} />
                </motion.div>

                {/* 3. FARMER */}
                <div style={{
                    position: "absolute",
                    left: "22%", bottom: "0%",
                    width: "20%", zIndex: 16,
                }}>
                    <img src="/farmer.png" alt="farmer" style={{
                        width: "100%", objectFit: "contain",
                        filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.28))"
                    }} />
                </div>

                {/* 4. CROPS */}
                <div style={{
                    position: "absolute",
                    left: "40%", bottom: "2%",
                    width: "50%", zIndex: 13,
                }}>
                    <img src="/crops.png" alt="crops" style={{
                        width: "100%", objectFit: "contain",
                        objectPosition: "bottom",
                    }} />
                </div>

                {/* 5. TRACTOR */}
                <motion.div style={{
                    x: tractorX,
                    position: "absolute",
                    bottom: "28%", left: 0,
                    width: "28%", zIndex: 12,
                }}>
                    <img src="/tractor.png" alt="tractor" style={{
                        width: "100%", objectFit: "contain",
                        filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.30))"
                    }} />
                </motion.div>

                {/* 6. BARN */}
                <div style={{
                    position: "absolute",
                    right: "2%", bottom: "39%",
                    width: "38%", zIndex: 10,
                }}>
                    <img src="/house.png" alt="barn" style={{
                        width: "100%", objectFit: "contain",
                        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.15))"
                    }} />
                </div>

                {/* ═══════════════════════════════════════
                    HEADER
                ═══════════════════════════════════════ */}
                <header style={{
                    position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
                    background: "rgba(255,255,255,0.42)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    borderBottom: "1px solid rgba(255,255,255,0.38)",
                    boxShadow: "0 2px 18px rgba(0,0,0,0.07)",
                }}>
                    <div style={{
                        maxWidth: "1400px", margin: "0 auto",
                        padding: "0 36px", height: "68px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                        {/* Logo */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                                width: "42px", height: "42px", borderRadius: "12px",
                                background: "linear-gradient(135deg,#2ECC71,#1a9e52)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 4px 14px rgba(46,204,113,0.45)",
                            }}>
                                <Cloud style={{ color: "white", width: "22px", height: "22px" }} />
                            </div>
                            <span style={{
                                fontFamily: "'Fredoka One','Nunito',sans-serif",
                                fontSize: "24px", fontWeight: "900",
                                color: "#1B5E20", letterSpacing: "-0.3px",
                            }}>
                                SkyView{" "}
                                <span style={{ color: "#2ECC71", fontStyle: "italic", textDecoration: "underline wavy #2ECC71" }}>AI</span>
                            </span>
                        </div>

                        {/* Nav — buttons that open overlay panels */}
                        <nav style={{ display: "flex", gap: "12px" }}>
                            {[
                                { label: "Features", id: "features" as const, icon: Zap, color: "#2ECC71" },
                                { label: "Farmers Guide", id: "farmers-guide" as const, icon: BookOpen, color: "#F39C12" },
                            ].map(item => {
                                const isActive = activePanel === item.id;
                                return (
                                    <motion.button
                                        key={item.id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActivePanel(isActive ? null : item.id)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "8px",
                                            padding: "10px 22px", borderRadius: "999px",
                                            background: isActive
                                                ? `linear-gradient(135deg, ${item.color}, ${item.color}dd)`
                                                : "rgba(255,255,255,0.5)",
                                            border: isActive ? "none" : `2px solid ${item.color}40`,
                                            color: isActive ? "white" : "#1B5E20",
                                            fontFamily: "'Nunito',sans-serif", fontWeight: "800",
                                            fontSize: "14px", cursor: "pointer",
                                            boxShadow: isActive
                                                ? `0 4px 20px ${item.color}50`
                                                : "0 2px 8px rgba(0,0,0,0.06)",
                                            transition: "all 0.3s ease",
                                        }}
                                    >
                                        <item.icon size={16} />
                                        {item.label}
                                    </motion.button>
                                );
                            })}
                        </nav>

                        {/* Login */}
                        {!isAuthenticated && (
                            <Link to="/login">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                                    style={{
                                        borderRadius: "999px", padding: "10px 32px",
                                        background: "linear-gradient(135deg,#2ECC71,#1a9e52)",
                                        color: "white", border: "none", cursor: "pointer",
                                        fontFamily: "'Nunito',sans-serif", fontWeight: "900", fontSize: "15px",
                                        boxShadow: "0 4px 16px rgba(46,204,113,0.45)",
                                    }}>Login</motion.button>
                            </Link>
                        )}
                    </div>
                </header>

                {/* ═══════════════════════════════════════
                    OVERLAY PANELS (Features / Farmers Guide)
                ═══════════════════════════════════════ */}
                <AnimatePresence>
                    {activePanel === "features" && (
                        <FeaturesPanel onClose={() => setActivePanel(null)} isDark={isDark} />
                    )}
                    {activePanel === "farmers-guide" && (
                        <FarmersGuidePanel onClose={() => setActivePanel(null)} isDark={isDark} />
                    )}
                </AnimatePresence>

                {/* ── CTA BUTTONS ── */}
                {!activePanel && (
                    <div style={{
                        position: "absolute", top: "36%", left: "50%",
                        transform: "translateX(-50%)", zIndex: 40,
                        display: "flex", gap: "18px", alignItems: "center",
                    }}>
                        <Link to={isAuthenticated ? "/dashboard" : "/signup"} style={{ textDecoration: "none" }}>
                            <motion.button
                                whileHover={{ scale: 1.06, boxShadow: "0 16px 48px rgba(46,204,113,0.65)" }}
                                whileTap={{ scale: 0.96 }}
                                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.5 }}
                                style={{
                                    height: "60px", padding: "0 44px", borderRadius: "999px",
                                    background: "linear-gradient(135deg,#2ECC71,#1a9e52)",
                                    fontSize: "17px", fontFamily: "'Nunito',sans-serif", fontWeight: "900",
                                    color: "white", border: "none", cursor: "pointer",
                                    boxShadow: "0 8px 32px rgba(46,204,113,0.52)",
                                }}>{isAuthenticated ? "OPEN DASHBOARD" : "GET STARTED"}</motion.button>
                        </Link>
                    </div>
                )}

                {/* ── SCROLL HINT ── */}
                {!activePanel && (
                    <motion.div
                        style={{
                            position: "absolute", bottom: "4%", left: "50%",
                            transform: "translateX(-50%)", zIndex: 40,
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                        }}
                        animate={{ y: [0, 7, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                    >
                        <span style={{
                            fontFamily: "'Nunito',sans-serif", fontSize: "11px", fontWeight: "700",
                            color: "rgba(27,94,32,0.65)", letterSpacing: "2.5px", textTransform: "uppercase",
                        }}>Scroll to explore</span>
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path d="M9 2 L9 16 M3 10 L9 16 L15 10"
                                stroke="#2ECC71" strokeWidth="2.2"
                                strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                    </motion.div>
                )}

            </div>{/* /sticky */}
        </div>
    );
}


/* ═══════════════════════════════════════════════════════
   FEATURES OVERLAY PANEL
═══════════════════════════════════════════════════════ */
function FeaturesPanel({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
    const features = [
        {
            icon: BarChart3, title: "Real-Time Dashboard",
            desc: "Live sensor data — soil moisture, temperature, humidity & light intensity streaming to your dashboard.",
            gradient: "linear-gradient(135deg, #2ECC71, #27AE60)",
        },
        {
            icon: Brain, title: "AI Crop Advisor",
            desc: "AI-powered recommendations for irrigation, fertilization, and pest control based on real-time data.",
            gradient: "linear-gradient(135deg, #3498DB, #2980B9)",
        },
        {
            icon: Droplets, title: "Rain Prediction",
            desc: "ML models predict rainfall using multi-sensor fusion. Plan irrigation and harvesting confidently.",
            gradient: "linear-gradient(135deg, #9B59B6, #8E44AD)",
        },
        {
            icon: Cpu, title: "FPGA Edge AI",
            desc: "Hardware-accelerated inference on Zynq-7000 FPGA for ultra-low latency decisions at the edge.",
            gradient: "linear-gradient(135deg, #E74C3C, #C0392B)",
        },
        {
            icon: MessageSquare, title: "WhatsApp Alerts",
            desc: "Get instant alerts and ask questions via WhatsApp — AI farming advice on your phone, anytime.",
            gradient: "linear-gradient(135deg, #1ABC9C, #16A085)",
        },
        {
            icon: Eye, title: "Trend Analytics",
            desc: "Historical trends, seasonal comparisons, and comprehensive reports for smarter planning.",
            gradient: "linear-gradient(135deg, #F39C12, #E67E22)",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                position: "absolute", inset: 0, zIndex: 55,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "80px 24px 24px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    width: "100%", maxWidth: "1100px",
                    maxHeight: "calc(100vh - 100px)",
                    borderRadius: "28px",
                    background: isDark
                        ? "linear-gradient(145deg, rgba(15,30,50,0.97), rgba(10,40,20,0.97))"
                        : "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(240,253,244,0.97))",
                    border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid rgba(46,204,113,0.2)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                    overflow: "auto",
                    padding: "40px",
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "32px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "14px",
                            background: "linear-gradient(135deg, #2ECC71, #27AE60)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 6px 20px rgba(46,204,113,0.4)",
                        }}>
                            <Zap size={24} color="white" />
                        </div>
                        <div>
                            <h2 style={{
                                fontFamily: "'Fredoka One','Nunito',sans-serif",
                                fontSize: "28px", fontWeight: "900",
                                color: isDark ? "#E8F5E9" : "#1B5E20",
                                margin: 0,
                            }}>Smart Farming Features</h2>
                            <p style={{
                                fontFamily: "'Nunito',sans-serif", fontSize: "14px",
                                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,94,32,0.5)",
                                margin: "4px 0 0",
                            }}>Everything you need to optimize your farm</p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        style={{
                            width: "40px", height: "40px", borderRadius: "12px",
                            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                            border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <X size={20} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)"} />
                    </motion.button>
                </div>

                {/* Feature Cards Grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "18px",
                }}>
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.07 }}
                            whileHover={{
                                y: -4,
                                boxShadow: isDark
                                    ? "0 12px 40px rgba(0,0,0,0.4)"
                                    : "0 12px 40px rgba(46,204,113,0.18)",
                            }}
                            style={{
                                borderRadius: "18px",
                                padding: "28px 24px",
                                background: isDark
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(255,255,255,0.8)",
                                border: isDark
                                    ? "1px solid rgba(255,255,255,0.07)"
                                    : "1px solid rgba(46,204,113,0.1)",
                                cursor: "default",
                                transition: "background 0.3s",
                            }}
                        >
                            <div style={{
                                display: "flex", alignItems: "center", gap: "14px",
                                marginBottom: "14px",
                            }}>
                                <div style={{
                                    width: "46px", height: "46px", borderRadius: "14px",
                                    background: feature.gradient,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: `0 6px 18px ${isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)"}`,
                                }}>
                                    <feature.icon size={22} color="white" />
                                </div>
                                <h3 style={{
                                    fontFamily: "'Nunito',sans-serif", fontWeight: "900",
                                    fontSize: "18px",
                                    color: isDark ? "#E8F5E9" : "#1B5E20",
                                    margin: 0,
                                }}>{feature.title}</h3>
                            </div>
                            <p style={{
                                fontFamily: "'Nunito',sans-serif", fontSize: "14px",
                                color: isDark ? "rgba(255,255,255,0.50)" : "rgba(27,94,32,0.6)",
                                lineHeight: "1.6", margin: 0,
                            }}>{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}


/* ═══════════════════════════════════════════════════════
   FARMERS GUIDE OVERLAY PANEL
═══════════════════════════════════════════════════════ */
function FarmersGuidePanel({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const guides = [
        {
            icon: Sprout,
            title: "Getting Started with SkyView AI",
            color: "#2ECC71",
            steps: [
                "Create your account and log in to the SkyView AI dashboard.",
                "Connect your IoT sensors (soil moisture, temperature, humidity, light) via MQTT.",
                "Your dashboard will automatically populate with real-time readings once sensors are online.",
                "Explore the Dashboard, Trends, and Advisor tabs to understand your farm's health.",
            ],
        },
        {
            icon: Thermometer,
            title: "Understanding Your Sensor Data",
            color: "#3498DB",
            steps: [
                "Soil Moisture (0-100%): Below 30% means your crops need water. Above 80% may indicate overwatering.",
                "Temperature: Most crops thrive between 20°C–30°C. Watch for frost alerts below 5°C.",
                "Humidity: High humidity (>80%) can promote fungal diseases. Low humidity (<30%) increases evaporation.",
                "Light Intensity: Ensure adequate sunlight. The advisor suggests shade solutions if needed.",
            ],
        },
        {
            icon: Droplets,
            title: "Smart Irrigation Tips",
            color: "#9B59B6",
            steps: [
                "Check rain prediction before irrigation — save water when rain is expected.",
                "Water early morning (5–7 AM) or late evening (6–8 PM) to minimize evaporation.",
                "Use the AI Advisor for field-specific irrigation schedules based on soil type and crop.",
                "Monitor moisture trends — consistent watering beats flood-and-drought cycles.",
            ],
        },
        {
            icon: MessageSquare,
            title: "Using WhatsApp for Farm Alerts",
            color: "#1ABC9C",
            steps: [
                "Send any farming question to the SkyView AI WhatsApp number for instant advice.",
                "Receive automatic alerts when sensor readings go outside optimal ranges.",
                "Ask about weather forecasts, pest control, or crop recommendations anytime.",
                "All responses include actionable steps you can take immediately.",
            ],
        },
        {
            icon: BarChart3,
            title: "Reading Reports & Trends",
            color: "#F39C12",
            steps: [
                "Visit the Trends page to view historical sensor data over days, weeks, or months.",
                "Compare seasons to identify patterns in soil health and weather impact.",
                "Generate PDF reports from the Reports page to share with agricultural advisors.",
                "Use trend data to plan crop rotation, fertilization, and harvest timing.",
            ],
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                position: "absolute", inset: 0, zIndex: 55,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "80px 24px 24px",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    width: "100%", maxWidth: "800px",
                    maxHeight: "calc(100vh - 100px)",
                    borderRadius: "28px",
                    background: isDark
                        ? "linear-gradient(145deg, rgba(15,30,50,0.97), rgba(10,40,20,0.97))"
                        : "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(240,253,244,0.97))",
                    border: isDark
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid rgba(243,156,18,0.2)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
                    overflow: "auto",
                    padding: "40px",
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "28px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "14px",
                            background: "linear-gradient(135deg, #F39C12, #E67E22)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 6px 20px rgba(243,156,18,0.4)",
                        }}>
                            <BookOpen size={24} color="white" />
                        </div>
                        <div>
                            <h2 style={{
                                fontFamily: "'Fredoka One','Nunito',sans-serif",
                                fontSize: "28px", fontWeight: "900",
                                color: isDark ? "#E8F5E9" : "#1B5E20",
                                margin: 0,
                            }}>Farmer's Guide</h2>
                            <p style={{
                                fontFamily: "'Nunito',sans-serif", fontSize: "14px",
                                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(27,94,32,0.5)",
                                margin: "4px 0 0",
                            }}>Click any topic to learn more</p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        style={{
                            width: "40px", height: "40px", borderRadius: "12px",
                            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                            border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <X size={20} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)"} />
                    </motion.button>
                </div>

                {/* Accordion Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {guides.map((guide, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <motion.div
                                key={guide.title}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: i * 0.06 }}
                                style={{
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                    background: isDark
                                        ? `rgba(255,255,255,${isOpen ? 0.06 : 0.03})`
                                        : `rgba(255,255,255,${isOpen ? 1 : 0.7})`,
                                    border: isDark
                                        ? `1px solid rgba(255,255,255,${isOpen ? 0.12 : 0.05})`
                                        : `1px solid ${guide.color}${isOpen ? "35" : "18"}`,
                                    boxShadow: isOpen
                                        ? `0 4px 24px ${guide.color}15`
                                        : "none",
                                    transition: "all 0.3s ease",
                                }}
                            >
                                {/* Clickable header */}
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    style={{
                                        width: "100%", padding: "18px 20px",
                                        display: "flex", alignItems: "center", gap: "14px",
                                        background: "none", border: "none", cursor: "pointer",
                                        textAlign: "left",
                                    }}
                                >
                                    <div style={{
                                        width: "40px", height: "40px", borderRadius: "12px",
                                        background: `${guide.color}18`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0,
                                        transition: "background 0.3s",
                                    }}>
                                        <guide.icon size={20} color={guide.color} />
                                    </div>
                                    <span style={{
                                        flex: 1,
                                        fontFamily: "'Nunito',sans-serif", fontWeight: "800",
                                        fontSize: "16px",
                                        color: isDark ? "#E8F5E9" : "#1B5E20",
                                    }}>{guide.title}</span>
                                    <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <ChevronDown
                                            size={18}
                                            color={isDark ? "rgba(255,255,255,0.35)" : "rgba(27,94,32,0.35)"}
                                        />
                                    </motion.div>
                                </button>

                                {/* Expandable content */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            style={{ overflow: "hidden" }}
                                        >
                                            <div style={{
                                                padding: "0 20px 20px 74px",
                                                display: "flex", flexDirection: "column", gap: "10px",
                                            }}>
                                                {guide.steps.map((step, j) => (
                                                    <motion.div
                                                        key={j}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: j * 0.07 }}
                                                        style={{
                                                            display: "flex", gap: "10px", alignItems: "flex-start",
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: "22px", height: "22px", borderRadius: "50%",
                                                            background: `${guide.color}15`,
                                                            border: `1.5px solid ${guide.color}40`,
                                                            color: guide.color,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            fontFamily: "'Nunito',sans-serif", fontWeight: "900",
                                                            fontSize: "11px", flexShrink: 0, marginTop: "2px",
                                                        }}>{j + 1}</span>
                                                        <p style={{
                                                            fontFamily: "'Nunito',sans-serif", fontSize: "13.5px",
                                                            color: isDark ? "rgba(255,255,255,0.55)" : "rgba(27,94,32,0.65)",
                                                            lineHeight: "1.55", margin: 0,
                                                        }}>{step}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}