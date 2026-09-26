"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import FarmersGuidePanel from "@/components/Landing/FarmersGuidePanel";
import {
    LayoutDashboard,
    BrainCircuit,
    CloudRain,
    Cpu,
    MessageCircle,
    TrendingUp,
    BookOpen,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
    { title: "Real-Time Dashboard", desc: "Live sensor data — soil moisture, temperature, humidity & light intensity streamed to your screen.", icon: LayoutDashboard, accent: "#3B82F6" },
    { title: "AI Crop Advisor", desc: "Intelligent irrigation, fertilization, and pest control recommendations powered by machine learning.", icon: BrainCircuit, accent: "#10B981" },
    { title: "Rain Prediction", desc: "Hyper-local rainfall forecasting so you never waste water or miss a harvest window.", icon: CloudRain, accent: "#F59E0B" },
    { title: "FPGA Edge AI", desc: "Ultra-low latency decision making at the edge — no cloud dependency required.", icon: Cpu, accent: "#8B5CF6" },
    { title: "WhatsApp Alerts", desc: "Get critical threshold alerts and AI advice directly on your phone, 24/7.", icon: MessageCircle, accent: "#22C55E" },
    { title: "Trend Analytics", desc: "Historical data visualization for smarter seasonal planning and crop rotation.", icon: TrendingUp, accent: "#6366F1" },
];

export default function Landing() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const images = useRef<HTMLImageElement[]>([]);
    const frameCount = 284;

    const [loaded, setLoaded] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    /* ── LENIS ── */
    useEffect(() => {
        const lenis = new Lenis({ duration: 1.2, lerp: 0.08 });
        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        lenis.on("scroll", ScrollTrigger.update);
        return () => lenis.destroy();
    }, []);

    /* ── LOAD FRAMES ── */
    useEffect(() => {
        let loadedCount = 0;
        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = `/frames/ezgif-frame-${String(i).padStart(3, "0")}.jpg`;
            img.onload = () => {
                loadedCount++;
                if (loadedCount > frameCount * 0.3) setLoaded(true);
            };
            images.current.push(img);
        }
    }, []);

    /* ── CANVAS ── */
    useEffect(() => {
        if (!loaded) return;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener("resize", resize);

        let target = 0;
        let current = 0;
        const proxy = { progress: 0 };

        gsap.to(proxy, {
            progress: 1,
            ease: "none",
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top top",
                end: "bottom bottom",
                scrub: 2,
            },
            onUpdate: () => (target = proxy.progress),
        });

        const render = () => {
            current += (target - current) * 0.08;
            const frameIndex = Math.floor(current * (frameCount - 1));
            const img = images.current[frameIndex];
            if (img) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
            }
            requestAnimationFrame(render);
        };
        render();

        return () => {
            ScrollTrigger.getAll().forEach((t) => t.kill());
            window.removeEventListener("resize", resize);
        };
    }, [loaded]);

    /* ── TIMELINE ── */
    useEffect(() => {
        if (!loaded) return;

        // Hide everything initially via GSAP (not CSS) so the timeline owns all state
        gsap.set("#features", { opacity: 0, visibility: "hidden" });
        gsap.set("#guide",    { opacity: 0, visibility: "hidden" });
        gsap.set("#cta",      { opacity: 0, visibility: "hidden" });
        gsap.set(".featureCard", { opacity: 0, y: 50 });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top top",
                end: "bottom bottom",
                scrub: 2,
            },
        });

        /* ── INTRO (visible at start, fades out) ── */
        tl.to("#intro", { opacity: 1, duration: 0.8 });
        tl.to("#intro", { opacity: 0, duration: 0.5 });

        /* ── FEATURES (one scroll) ── */
        tl.to("#features", { opacity: 1, visibility: "visible", duration: 0.4 });
        tl.to(".featureCard", {
            opacity: 1,
            y: 0,
            stagger: 0.08,
            duration: 0.6,
        });
        // hold
        tl.to({}, { duration: 0.5 });
        tl.to("#features", { opacity: 0, duration: 0.4 });

        /* ── GUIDE (one scroll) ── */
        tl.to("#guide", { opacity: 1, visibility: "visible", duration: 0.4 });
        // hold
        tl.to({}, { duration: 0.5 });
        tl.to("#guide", { opacity: 0, duration: 0.4 });

        /* ── CTA (stays) ── */
        tl.to("#cta", { opacity: 1, visibility: "visible", duration: 0.5 });

    }, [loaded]);

    return (
        <div ref={containerRef} className="relative bg-black" style={{ height: "400vh" }}>

            {/* ── CANVAS ── */}
            <div className="sticky top-0 w-full h-screen">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>

            {/* ── OVERLAY ── */}
            <div className="sticky top-0 h-screen text-white z-10 pointer-events-none">

                {/* INTRO */}
                <div id="intro" className="absolute inset-0 z-20 flex items-center justify-center">
                    <h1 className="text-7xl font-bold tracking-wide drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
                        SkyView AI
                    </h1>
                </div>

                {/* ── FEATURES ── */}
                <div id="features" className="absolute inset-0 flex items-center justify-center px-6 md:px-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
                        {features.map((item, i) => (
                            <div
                                key={i}
                                className="featureCard group relative overflow-hidden
                                    backdrop-blur-2xl rounded-3xl p-8
                                    border border-white/[0.08]
                                    bg-gradient-to-br from-white/[0.06] to-white/[0.02]
                                    hover:border-white/20 hover:from-white/[0.1] hover:to-white/[0.04]
                                    transition-all duration-500 cursor-default"
                            >
                                {/* Accent glow */}
                                <div
                                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"
                                    style={{ backgroundColor: item.accent }}
                                />

                                <div className="relative z-10">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                                        style={{ backgroundColor: `${item.accent}20` }}
                                    >
                                        <item.icon className="w-6 h-6" style={{ color: item.accent }} />
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── FARMER'S GUIDE ── */}
                <div id="guide" className="absolute inset-0 flex items-center justify-center px-10">
                    <div className="
                        backdrop-blur-2xl rounded-[2rem] px-16 py-14 max-w-4xl w-full text-center
                        bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                        border border-white/[0.08]
                        shadow-[0_20px_80px_rgba(0,0,0,0.5)]
                    ">
                        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-6">
                            <BookOpen className="w-4 h-4" />
                            INTERACTIVE GUIDE
                        </div>

                        <h2 className="text-5xl font-bold mb-4 tracking-tight">Farmer's Guide</h2>

                        <p className="text-white/50 mb-10 text-lg max-w-xl mx-auto leading-relaxed">
                            Everything you need — from sensor setup to reading AI insights and making smarter farming decisions.
                        </p>

                        <button
                            onClick={() => setShowGuide(true)}
                            className="pointer-events-auto inline-flex items-center gap-3 px-10 py-4 rounded-full
                                bg-white/10 border border-white/20
                                hover:bg-white/20 transition-all duration-300
                                font-bold text-lg tracking-tight"
                        >
                            <BookOpen className="w-5 h-5 text-emerald-400" />
                            Open Full Guide
                        </button>
                    </div>
                </div>

                {/* ── CTA ── */}
                <div id="cta" className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                    <h2 className="text-5xl font-bold tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
                        {isAuthenticated ? "Welcome Back 👋" : "Ready to Get Started?"}
                    </h2>
                    <p className="text-lg text-white/60 max-w-md text-center leading-relaxed">
                        {isAuthenticated 
                            ? "Your fields are waiting. Jump back into your dashboard." 
                            : "Sign in to access real-time sensor data, AI insights, and smart farming tools."}
                    </p>
                    <button
                        onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
                        className="pointer-events-auto px-12 py-5 rounded-full
                            backdrop-blur-xl bg-white/10 border border-white/30
                            hover:bg-white/20 transition-all duration-300
                            font-bold text-xl tracking-tight"
                    >
                        {isAuthenticated ? "Open Dashboard" : "Login"}
                    </button>
                </div>

            </div>

            {/* ── GUIDE PANEL ── */}
            {showGuide && (
                <FarmersGuidePanel onClose={() => setShowGuide(false)} />
            )}

            {/* ── LOADING ── */}
            {!loaded && (
                <div className="fixed inset-0 flex items-center justify-center bg-black text-white text-xl z-50">
                    Loading experience...
                </div>
            )}

        </div>
    );
}