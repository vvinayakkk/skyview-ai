import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FarmBackground, GlassSection } from "@/components/FarmTheme";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AIOverview } from "@/components/AIOverview";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Mic, Tractor, Users, Wheat, PhoneCall,
  MessageSquare, ArrowRightLeft, MapPin, RotateCw, Compass,
  Layers, ArrowRight, HelpCircle, Check, Sparkles, User
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || '';

// TypewriterText component to simulate live streaming and properly format **bold** markdown
function TypewriterText({ text, speed = 8, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText("");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);

  const renderFormattedText = (rawText: string) => {
    if (!rawText) return "";
    const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <span key={index} className="font-extrabold text-gray-900 dark:text-white">
            {boldText}
          </span>
        );
      }
      return part;
    });
  };

  return <>{renderFormattedText(displayedText)}</>;
}

export default function Marketplace() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  
  const phone = localStorage.getItem("user_phone") || "";
  const myName = localStorage.getItem("user_name") || "Guest Farmer";

  // Navigation tabs
  const [mainTab, setMainTab] = useState<"matching" | "circular" | "pooling">("matching");

  // State for Resource Matching (2-Party)
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [aiAdvisory, setAiAdvisory] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "mutual" | "provider" | "consumer">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [voiceSearchActive, setVoiceSearchActive] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // State for Circular Barter (3-Party)
  const [circularLoops, setCircularLoops] = useState<any[]>([]);
  const [circularLoading, setCircularLoading] = useState(false);

  // State for Geographical Pooling
  const [pools, setPools] = useState<any[]>([]);
  const [poolingLoading, setPoolingLoading] = useState(false);

  // State for AI Deal Broker Negotiation
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [negotiating, setNegotiating] = useState(false);
  const [negotiationResult, setNegotiationResult] = useState<any>(null);
  const [negotiationCrop, setNegotiationCrop] = useState("");

  // Helper to format logs or static text with bold formatting
  const formatText = (rawText: string) => {
    if (!rawText) return "";
    const parts = rawText.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={index} className="font-bold text-gray-900 dark:text-white">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  // Load user profile to display current listings
  useEffect(() => {
    if (!phone) return;
    fetch(`${API_URL}/api/profile?phone=${encodeURIComponent(phone)}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setUserProfile(data.profile);
        }
      })
      .catch(err => console.error("Error loading user profile:", err));
  }, [phone]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/marketplace/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setMatches(data.matches);
        setAiAdvisory(data.ai_advisory || "");
      }
    } catch (err) {
      toast({ title: "Failed to fetch matches", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadCircularLoops = async () => {
    setCircularLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/marketplace/circular-barter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, max_distance_km: 1000.0 }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setCircularLoops(data.loops);
      }
    } catch (err) {
      toast({ title: "Failed to fetch circular loops", variant: "destructive" });
    } finally {
      setCircularLoading(false);
    }
  };

  const loadPoolingData = async () => {
    setPoolingLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/marketplace/pooling`);
      const data = await response.json();
      if (data.status === "success") {
        setPools(data.clusters);
      }
    } catch (err) {
      toast({ title: "Failed to fetch geographical pooling data", variant: "destructive" });
    } finally {
      setPoolingLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
    loadCircularLoops();
    loadPoolingData();

    // Listen to quick action filter event from AIOverview
    const handleFilterEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "mutual") {
        setActiveTab("mutual");
        setMainTab("matching");
      }
    };
    window.addEventListener("filter-marketplace", handleFilterEvent);
    return () => window.removeEventListener("filter-marketplace", handleFilterEvent);
  }, []);

  const handleVoiceSearch = () => {
    if (voiceSearchActive) return;
    setVoiceSearchActive(true);
    toast({ title: "Listening...", description: "Say what resource you are looking for (e.g. Tractor, Harvester, Labor)" });
    
    setTimeout(() => {
      setVoiceSearchActive(false);
      const mockPhrases = ["tractor", "harvester", "labor", "water pump"];
      const parsed = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      setSearchQuery(parsed);
      toast({ title: "Voice input received", description: `Searching for "${parsed}"...` });
    }, 2500);
  };

  // Run negotiation
  const runNegotiation = async (match: any, forceCrop?: string) => {
    setNegotiating(true);
    setNegotiationResult(null);
    setSelectedMatch(match);
    
    const cropToUse = forceCrop || match.crops?.[0] || userProfile?.crops?.[0] || "Wheat";
    setNegotiationCrop(cropToUse);

    try {
      const response = await fetch(`${API_URL}/api/marketplace/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_a_phone: phone,
          farmer_b_phone: match.phone,
          item_a: userProfile?.excess_resources?.[0] || "Tractor",
          item_b: match.they_provide_i_need?.[0] || match.what_they_have?.[0] || "Harvester",
          crop: cropToUse
        })
      });
      const data = await response.json();
      if (data.status === "success") {
        setNegotiationResult(data.negotiation);
      }
    } catch (err) {
      toast({ title: "Negotiation failed", description: "Could not run deal broker simulation.", variant: "destructive" });
    } finally {
      setNegotiating(false);
    }
  };

  // Filter 2-party matches
  const filteredMatches = matches.filter(m => {
    if (activeTab !== "all" && m.match_type !== activeTab) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.location.toLowerCase().includes(query) ||
      m.crops.some((c: string) => c.toLowerCase().includes(query)) ||
      m.what_they_have.some((x: string) => x.toLowerCase().includes(query)) ||
      m.what_they_need.some((n: string) => n.toLowerCase().includes(query))
    );
  });

  const getWhatsAppLink = (match: any) => {
    const isMutual = match.match_type === "mutual";
    let text = "";
    if (isMutual) {
      text = `Hi ${match.name}, I found a match on SkyView! I see you need "${match.i_provide_they_need.join(', ')}" and have excess "${match.they_provide_i_need.join(', ')}". Can we co-operatively trade?`;
    } else if (match.match_type === "provider") {
      text = `Hi ${match.name}, I found your listing on SkyView. I noticed you have excess "${match.they_provide_i_need.join(', ')}", which I need for my farm. Can we chat about renting/sharing?`;
    } else {
      text = `Hi ${match.name}, I found a match on SkyView. I noticed you need "${match.i_provide_they_need.join(', ')}" which I currently have in excess. Can we discuss resource sharing?`;
    }
    return `https://wa.me/${match.whatsapp_number.replace(/[+\s-]/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const css = {
    badge: (type: string) => {
      switch (type) {
        case "mutual":
          return { bg: "rgba(16,185,129,0.15)", text: "#10B981", label: "Mutual Swap" };
        case "provider":
          return { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", label: "Provider" };
        default:
          return { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", label: "Consumer" };
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FarmBackground />
      <div style={{ position: "relative", zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={0} sensorNodeOnline={true} />
      </div>

      <div style={{ padding: "2rem", maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 40 }}>
        
        {/* Title and Refresh Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 className="text-3xl font-bold font-sans" style={{ color: isDark ? '#A8D89A' : '#1B3A20' }}>
              Agentic Resource Allocation Board
            </h1>
            <p className="text-sm mt-1" style={{ color: isDark ? '#A3B8A8' : '#2C3E30' }}>
              Smart barter, circular matching, and regional optimization plans.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                loadMatches();
                loadCircularLoops();
                loadPoolingData();
              }}
              disabled={loading || circularLoading || poolingLoading}
              variant="outline"
              className="gap-2 border-emerald-600/30"
            >
              <RotateCw size={15} className={loading || circularLoading || poolingLoading ? "animate-spin" : ""} /> Refresh Data
            </Button>
          </div>
        </div>

        {/* AI Overview Panel */}
        <AIOverview page="marketplace" />

        {/* Current user's resources card */}
        {userProfile && (
          <GlassSection style={{ padding: "1.5rem", marginBottom: "2rem", borderLeft: "4px solid #10B981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Your Active Marketplace Listings</p>
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-0.5">{myName}</h4>
              </div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-semibold">Excess / Offering:</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {userProfile.excess_resources?.length ? userProfile.excess_resources.join(", ") : "None listed"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-semibold">Required / Seeking:</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {userProfile.required_resources?.length ? userProfile.required_resources.join(", ") : "None listed"}
                  </span>
                </div>
              </div>
              <Button onClick={() => window.location.href = "/profile"} size="sm" variant="outline" className="border-emerald-600/20 text-emerald-800 dark:text-emerald-300">
                Edit Listings
              </Button>
            </div>
          </GlassSection>
        )}

        {/* Main Agentic Mode Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-emerald-950/5 dark:bg-emerald-950/20 rounded-xl mb-6 max-w-fit border border-emerald-950/10">
          <Button
            variant={mainTab === "matching" ? "default" : "ghost"}
            onClick={() => setMainTab("matching")}
            className={`font-bold gap-2 text-xs md:text-sm rounded-lg ${mainTab === "matching" ? "bg-emerald-600 text-white" : "text-emerald-800 dark:text-emerald-200"}`}
          >
            <Compass size={16} /> 2-Party Matching
          </Button>
          <Button
            variant={mainTab === "circular" ? "default" : "ghost"}
            onClick={() => setMainTab("circular")}
            className={`font-bold gap-2 text-xs md:text-sm rounded-lg ${mainTab === "circular" ? "bg-emerald-600 text-white" : "text-emerald-800 dark:text-emerald-200"}`}
          >
            <ArrowRightLeft size={16} /> Circular Barter (3-Party Loops)
          </Button>
          <Button
            variant={mainTab === "pooling" ? "default" : "ghost"}
            onClick={() => setMainTab("pooling")}
            className={`font-bold gap-2 text-xs md:text-sm rounded-lg ${mainTab === "pooling" ? "bg-emerald-600 text-white" : "text-emerald-800 dark:text-emerald-200"}`}
          >
            <Layers size={16} /> Regional Pooling Optimization
          </Button>
        </div>

        {/* ==================== TAB 1: RESOURCE MATCHING (2-PARTY) ==================== */}
        {mainTab === "matching" && (
          <>
            {/* Visual Node Architecture Card */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <Compass size={16} /> 2-Party Matching (Mutual Barter)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans">
                  Pairs you directly with another farmer. You provide the equipment they need, and they provide what you need, maximizing tool utilization.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-gray-150 dark:border-white/5 shadow-sm">
                <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-100/30 dark:bg-emerald-950/30 border border-emerald-500/20">
                  <User size={18} className="text-emerald-600" />
                  <span className="text-[10px] font-bold mt-1 text-gray-700 dark:text-gray-300">You (A)</span>
                  <span className="text-[9px] text-emerald-600 font-semibold">Tractor</span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1">
                    <ArrowRight size={14} className="text-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-gray-400">Barter</span>
                    <ArrowRight size={14} className="text-emerald-500 rotate-180 animate-pulse" />
                  </div>
                  <span className="text-[8px] text-gray-400 mt-0.5">Mutual Need</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-100/30 dark:bg-emerald-950/30 border border-emerald-500/20">
                  <Users size={18} className="text-emerald-600" />
                  <span className="text-[10px] font-bold mt-1 text-gray-700 dark:text-gray-300">Partner (B)</span>
                  <span className="text-[9px] text-blue-600 font-semibold">Harvester</span>
                </div>
              </div>
            </div>

            {/* Search & Filter section */}
            <GlassSection style={{ padding: "1.5rem", marginBottom: "2rem" }}>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex w-full md:w-auto overflow-x-auto gap-2 border-b md:border-b-0 pb-2 md:pb-0 scrollbar-none">
                  {(["all", "mutual", "provider", "consumer"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        transition: "all 0.2s",
                        border: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        background: activeTab === tab
                          ? (isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)")
                          : "transparent",
                        color: activeTab === tab
                          ? "#10B981"
                          : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"),
                      }}
                    >
                      {tab === "all" && "All Matches"}
                      {tab === "mutual" && "Mutual Barters"}
                      {tab === "provider" && "Available Tools (Providers)"}
                      {tab === "consumer" && "Farmers Seeking (Consumers)"}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 w-full md:w-80">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search resources, location, crops..."
                      className="pl-9"
                    />
                  </div>
                  <Button
                    onClick={handleVoiceSearch}
                    variant={voiceSearchActive ? "destructive" : "outline"}
                    className={voiceSearchActive ? "animate-pulse" : "border-emerald-600/30"}
                  >
                    <Mic size={18} />
                  </Button>
                </div>
              </div>
            </GlassSection>

            {/* AI Advisory Box with Typewriter Live Streaming */}
            {aiAdvisory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: "1.2rem 1.5rem",
                  borderRadius: "14px",
                  background: isDark ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.03)",
                  border: `1px solid ${isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)"}`,
                  marginBottom: "2rem",
                }}
              >
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500 animate-pulse" /> Kisan Mitra Matching Insights
                </h4>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mt-2 font-sans">
                  <TypewriterText text={aiAdvisory} speed={5} />
                </p>
              </motion.div>
            )}

            {/* Matching results grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RotateCw size={32} className="animate-spin text-emerald-600" />
                <p className="text-gray-500 font-semibold">Running allocation algorithms...</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <GlassSection style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <Compass size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Resource Matches Found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Try modifying your search query, selecting another category, or updating your available items in your Profile.
                </p>
              </GlassSection>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredMatches.map((match, i) => {
                    const b = css.badge(match.match_type);
                    return (
                      <motion.div
                        key={match.phone + i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                      >
                        <Card
                          style={{
                            background: isDark ? "rgba(20,30,22,0.85)" : "rgba(255,255,255,0.92)",
                            border: match.match_type === "mutual"
                              ? "1px solid rgba(16,185,129,0.35)"
                              : (isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)"),
                            boxShadow: match.match_type === "mutual"
                              ? "0 4px 20px rgba(16,185,129,0.12)"
                              : "none",
                            overflow: "hidden"
                          }}
                          className="hover:shadow-lg transition-all"
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.2rem 0.5rem" }}>
                            <span
                              style={{
                                background: b.bg,
                                color: b.text,
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "10px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                              }}
                            >
                              {b.label}
                            </span>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700 }} className="text-gray-400 dark:text-gray-500">
                                Match Score:
                              </span>
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 800,
                                  color: match.match_percentage >= 70 ? "#10B981" : "#F59E0B"
                                }}
                              >
                                {match.match_percentage}%
                              </span>
                            </div>
                          </div>

                          <CardHeader className="pt-2 pb-1">
                            <CardTitle className="text-lg font-bold flex justify-between items-start text-gray-800 dark:text-gray-100">
                              {match.name}
                            </CardTitle>
                            
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin size={12} className="text-emerald-600" />
                              <span>{match.district ? `${match.district}, ${match.state}` : match.location}</span>
                              <span className="mx-1 font-bold text-gray-400">•</span>
                              <span className="font-bold text-emerald-600">{match.distance_km} km away</span>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-2">
                            <div className="mb-4">
                              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Crops Cultivated</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {match.crops.map((c: string, j: number) => (
                                  <span key={j} className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div
                              style={{
                                padding: "10px 12px",
                                borderRadius: "10px",
                                background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
                                border: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)",
                                marginBottom: "1rem"
                              }}
                            >
                              {(match.match_type === "mutual" || match.match_type === "provider") && (
                                <div className="mb-2">
                                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide block">They can provide you:</span>
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5 block">
                                    {match.they_provide_i_need.join(", ")}
                                  </span>
                                </div>
                              )}

                              {(match.match_type === "mutual" || match.match_type === "consumer") && (
                                <div>
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide block">They need from you:</span>
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5 block">
                                    {match.i_provide_they_need.join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <Button
                                  asChild
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
                                >
                                  <a href={getWhatsAppLink(match)} target="_blank" rel="noopener noreferrer">
                                    <MessageSquare size={14} /> WhatsApp Trade
                                  </a>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="border-emerald-600/30 text-emerald-800 dark:text-emerald-300 font-semibold gap-1 px-3 text-xs"
                                >
                                  <a href={`tel:${match.phone}`}>
                                    <PhoneCall size={13} /> Call
                                  </a>
                                </Button>
                              </div>
                              <Button
                                onClick={() => runNegotiation(match)}
                                variant="secondary"
                                className="w-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold gap-2 text-xs border border-emerald-600/20"
                              >
                                <Sparkles size={13} /> AI Negotiate Deal
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB 2: CIRCULAR BARTER (3-PARTY LOOPS) ==================== */}
        {mainTab === "circular" && (
          <>
            {/* Visual Node Architecture Card */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">
                  <ArrowRightLeft size={16} /> 3-Party Circular Barter Loops
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans">
                  Solves multi-party resource conflicts where A needs B, B needs C, and C needs A. A closed circular loop is created, satisfying all requirements cash-free.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-gray-150 dark:border-white/5 shadow-sm">
                <div className="flex flex-col items-center p-1.5 rounded-lg bg-blue-100/30 dark:bg-blue-950/30 border border-blue-500/20 text-center">
                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">Farmer A</span>
                  <span className="text-[8px] text-gray-500">Has Tractor</span>
                </div>
                <ArrowRight size={12} className="text-blue-500 animate-pulse" />
                <div className="flex flex-col items-center p-1.5 rounded-lg bg-blue-100/30 dark:bg-blue-950/30 border border-blue-500/20 text-center">
                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">Farmer B</span>
                  <span className="text-[8px] text-gray-500">Has Harvester</span>
                </div>
                <ArrowRight size={12} className="text-blue-500 animate-pulse" />
                <div className="flex flex-col items-center p-1.5 rounded-lg bg-blue-100/30 dark:bg-blue-950/30 border border-blue-500/20 text-center">
                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">Farmer C</span>
                  <span className="text-[8px] text-gray-500">Has Labor</span>
                </div>
                <ArrowRight size={12} className="text-blue-500 rotate-90 lg:rotate-0 animate-pulse" />
                <div className="text-[8px] bg-blue-500/10 text-blue-700 px-1.5 py-0.5 rounded font-black">Loop</div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {circularLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RotateCw size={32} className="animate-spin text-blue-600" />
                  <p className="text-gray-500 font-semibold">Calculating 3-party cooperative loops...</p>
                </div>
              ) : circularLoops.length === 0 ? (
                <GlassSection style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <HelpCircle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Circular Barter Loops Found</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Add mock farmers in the same region with complementary profiles to see circular chains.
                  </p>
                </GlassSection>
              ) : (
                <div className="space-y-6">
                  {circularLoops.map((loop, idx) => {
                    const containsMe = loop.farmers.some((f: any) => f.phone === phone);
                    return (
                      <Card
                        key={idx}
                        style={{
                          background: isDark ? "rgba(20,30,35,0.85)" : "rgba(255,255,255,0.92)",
                          border: containsMe ? "2px solid #3B82F6" : "1px solid rgba(0,0,0,0.08)",
                          boxShadow: "0 4px 25px rgba(0,0,0,0.05)"
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <CardTitle className="text-md md:text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                              <Sparkles size={18} className="text-blue-500" /> Loop #{idx + 1}: {loop.farmers.map((f: any) => f.name.split(" ")[0]).join(" ➔ ")}
                            </CardTitle>
                            <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-bold">
                              Total Distance: {loop.total_distance_km} km
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          
                          {/* Circular Flow Visualization */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                            {loop.transfer_flow.map((flow: any, fIdx: number) => {
                              const fromFarmer = loop.farmers.find((f: any) => f.name === flow.from);
                              const toFarmer = loop.farmers.find((f: any) => f.name === flow.to);
                              return (
                                <div key={fIdx} className="flex flex-col items-center justify-center p-3 text-center border-b lg:border-b-0 lg:border-r last:border-0 border-gray-200 dark:border-white/10">
                                  <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                    <Tractor size={15} className="text-blue-500" /> {flow.from}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5">{fromFarmer?.location}</div>
                                  
                                  <div className="my-2 flex items-center justify-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg">
                                    <span>Lends {flow.item}</span>
                                    <ArrowRight size={14} />
                                  </div>

                                  <div className="font-bold text-gray-700 dark:text-gray-300">{flow.to}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{toFarmer?.location} ({flow.distance_km} km away)</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* AI Sharing Plan Schedule with Typewriter Live Streaming */}
                          <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-1.5">
                              <Sparkles size={14} className="text-blue-500 animate-pulse" /> AI-Generated Sharing Schedule
                            </h5>
                            <p className="text-sm mt-2 font-sans italic text-gray-700 dark:text-gray-300 leading-relaxed">
                              "<TypewriterText text={loop.ai_schedule} speed={8} />"
                            </p>
                          </div>

                          {/* Action Bar */}
                          <div className="mt-4 flex justify-end gap-2">
                            {loop.farmers.map((farmer: any, fIdx: number) => {
                              if (farmer.phone === phone) return null;
                              return (
                                <Button
                                  key={fIdx}
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-blue-500/20 text-blue-800 dark:text-blue-300 font-bold hover:bg-blue-500/10"
                                >
                                  <a href={`https://wa.me/${farmer.whatsapp.replace(/[+\s-]/g, '')}?text=${encodeURIComponent(`Hi ${farmer.name}, I saw our 3-party cooperative barter match on SkyView! Can we coordinate our schedule?`)}`} target="_blank" rel="noopener noreferrer">
                                    <MessageSquare size={13} className="mr-1" /> WhatsApp {farmer.name.split(" ")[0]}
                                  </a>
                                </Button>
                              );
                            })}
                          </div>

                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* ==================== TAB 3: REGIONAL POOLING OPTIMIZATION ==================== */}
        {mainTab === "pooling" && (
          <>
            {/* Visual Node Architecture Card */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <Layers size={16} /> Geographical Resource Pooling
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans">
                  Clusters local farmers into sharing cooperatives. Excess tools are aggregated into a single, shared inventory pool, optimizing dispatch and schedules.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-gray-150 dark:border-white/5 shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 px-1.5 py-0.5 rounded text-center">Farmer A</div>
                  <div className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 px-1.5 py-0.5 rounded text-center">Farmer B</div>
                  <div className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 px-1.5 py-0.5 rounded text-center">Farmer C</div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <ArrowRight size={14} className="text-emerald-500 animate-pulse" />
                  <span className="text-[8px] text-gray-400">Pool</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <Layers size={18} className="text-emerald-600 animate-bounce" />
                  <span className="text-[9px] font-bold mt-1 text-gray-800 dark:text-gray-200">District Hub</span>
                  <span className="text-[7px] text-emerald-700 font-extrabold uppercase mt-0.5">Optimized Plan</span>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {poolingLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RotateCw size={32} className="animate-spin text-emerald-600" />
                  <p className="text-gray-500 font-semibold">Analyzing regional clusters...</p>
                </div>
              ) : pools.length === 0 ? (
                <GlassSection style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <HelpCircle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Clusters Found</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    No matching districts/states available in your database.
                  </p>
                </GlassSection>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pools.map((pool, idx) => (
                    <Card
                      key={idx}
                      style={{
                        background: isDark ? "rgba(20,30,22,0.85)" : "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(16,185,129,0.15)",
                        boxShadow: "0 4px 25px rgba(0,0,0,0.05)"
                      }}
                    >
                      <CardHeader className="pb-2 border-b border-gray-150 dark:border-white/5">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                            {pool.region}
                          </CardTitle>
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                            {pool.farmer_count} Farmers • {pool.total_land_acres} Acres
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        
                        {/* Equipment Pool Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase block tracking-wider">Shared Equipment Pool</span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {pool.excess_pool.length === 0 ? (
                                <span className="text-xs text-gray-400">None listed</span>
                              ) : pool.excess_pool.map((item: string, iIdx: number) => (
                                <span key={iIdx} className="text-xs font-bold bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <span className="text-[10px] font-bold text-amber-600 uppercase block tracking-wider">Missing Resources Needed</span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {pool.required_pool.length === 0 ? (
                                <span className="text-xs text-gray-400">None listed</span>
                              ) : pool.required_pool.map((item: string, iIdx: number) => (
                                <span key={iIdx} className="text-xs font-bold bg-amber-100/50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Regional Optimization Plan with Typewriter Live Streaming */}
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-600/10">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-emerald-500 animate-pulse" /> AI Regional Optimization Plan
                          </h5>
                          <div className="mt-3 space-y-2.5">
                            {pool.optimization_plan.map((step: string, sIdx: number) => (
                              <div key={sIdx} className="flex gap-2 items-start">
                                <div className="p-0.5 rounded-full bg-emerald-500 text-white mt-0.5">
                                  <Check size={12} />
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-normal font-medium">
                                  <TypewriterText text={step} speed={5} />
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Local Farmers Directory */}
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Active Cluster Members</span>
                          <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {pool.farmers.map((farmer: any, fIdx: number) => (
                              <div key={fIdx} className="flex justify-between items-center text-xs p-2 rounded bg-gray-500/5 border border-white/5">
                                <span className="font-bold text-gray-700 dark:text-gray-300">{farmer.name}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-[11px] truncate max-w-[150px]">{farmer.crops.slice(0, 2).join(", ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}

      </div>

      {/* ==================== MODAL: INTERACTIVE AI DEAL BROKER NEGOTIATOR ==================== */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-emerald-600/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              
              {/* Modal Header */}
              <div className="bg-emerald-900 dark:bg-emerald-950 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-emerald-400 animate-pulse" size={20} />
                  <div>
                    <h3 className="font-bold text-sm md:text-base">Kisan Mitra AI Deal Broker</h3>
                    <p className="text-xs text-emerald-300">Automated negotiation based on distance and Mandi rates</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                
                {/* Crop selector & rerun */}
                <div className="flex justify-between items-center bg-gray-500/5 p-3 rounded-xl border border-white/5 flex-wrap gap-2">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Negotiation Crop Reference:
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={negotiationCrop}
                      onChange={(e) => runNegotiation(selectedMatch, e.target.value)}
                      className="text-xs bg-white dark:bg-zinc-800 border dark:border-white/10 rounded-lg px-2.5 py-1 text-gray-700 dark:text-gray-300 font-bold focus:outline-none"
                    >
                      {["Wheat", "Rice", "Paddy", "Cotton", "Grapes", "Onion", "Sugarcane", "Potato", "Maize"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => runNegotiation(selectedMatch, negotiationCrop)}
                      disabled={negotiating}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 h-fit"
                    >
                      Re-run
                    </Button>
                  </div>
                </div>

                {negotiating ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <RotateCw className="animate-spin text-emerald-600" size={32} />
                    <p className="text-sm font-semibold text-gray-500">AI Broker negotiating logistics & rates...</p>
                  </div>
                ) : negotiationResult ? (
                  <div className="space-y-4">
                    
                    {/* Calculation Details Banner */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Distance</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{negotiationResult.details.distance_km} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Transit cost est</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">₹{negotiationResult.details.transport_cost_rs}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Mandi Rate Ref</span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 truncate block px-1">{negotiationResult.details.mandi_rate_reference}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Offset Payment</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">₹{negotiationResult.details.suggested_offset_rs}</span>
                      </div>
                    </div>

                    {/* Dialogue Transcript with formatted typewriter text */}
                    <div className="space-y-3 p-4 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-150 dark:border-white/5 max-h-60 overflow-y-auto">
                      {negotiationResult.logs.map((log: any, idx: number) => {
                        const isBroker = log.speaker === "Deal Broker";
                        const isMe = log.speaker === myName;
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col ${isBroker ? "items-center" : (isMe ? "items-end" : "items-start")}`}
                          >
                            <span className="text-[9px] font-bold text-gray-400 mb-0.5">{log.speaker}</span>
                            <div
                              className={`p-2.5 rounded-xl text-xs max-w-[85%] font-sans leading-relaxed ${
                                isBroker
                                  ? "bg-emerald-900/15 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-600/10"
                                  : (isMe
                                    ? "bg-blue-600 text-white rounded-tr-none"
                                    : "bg-zinc-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none")
                              }`}
                            >
                              {formatText(log.text)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Final Agreement Terms with Typewriter Live Streaming */}
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-500" /> Proposed Agreement terms
                      </h4>
                      <p className="text-sm mt-2 text-gray-800 dark:text-gray-200 font-sans leading-relaxed font-semibold">
                        <TypewriterText text={negotiationResult.details.agreement_terms} speed={8} />
                      </p>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 text-sm">
                    Press re-run to trigger the broker logic.
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-950 border-t dark:border-white/5 flex justify-end gap-2">
                <Button
                  onClick={() => setSelectedMatch(null)}
                  variant="outline"
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                {negotiationResult && (
                  <Button
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
                  >
                    <a
                      href={`https://wa.me/${selectedMatch.whatsapp_number.replace(/[+\s-]/g, '')}?text=${encodeURIComponent(
                        `Hi ${selectedMatch.name}, our SkyView AI Deal Broker proposed these terms: ${negotiationResult.details.agreement_terms}. Can we proceed?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare size={14} /> Accept & WhatsApp Partner
                    </a>
                  </Button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
