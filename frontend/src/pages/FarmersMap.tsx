import { useState, useEffect, useRef } from "react";
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
  MapPin, PhoneCall, MessageSquare, Search, RotateCw, X, ChevronRight, Users, Wheat, Check, Shield
} from "lucide-react";

declare global {
  interface Window {
    L: any;
  }
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function FarmersMap() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();

  const [lReady, setLReady] = useState(false);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<any>(null);

  // Load Leaflet dynamically from CDN to bypass Vite bundling and TypeScript build issues
  useEffect(() => {
    if (window.L) {
      setLReady(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLReady(true);
    document.head.appendChild(script);
  }, []);

  // Fetch farmers list
  const loadFarmers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/marketplace/farmers`);
      const data = await res.json();
      if (data.status === "success") {
        setFarmers(data.farmers);
      }
    } catch {
      toast({ title: "Could not fetch farmers data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmers();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!lReady || !mapContainerRef.current || mapRef.current) return;

    // Center of India coordinates
    const map = window.L.map(mapContainerRef.current).setView([22.9734, 78.6569], 5);
    mapRef.current = map;

    // Apply reliable OpenStreetMap tiles (No API key required)
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    window.L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      className: isDark ? "dark-map-tiles" : "",
    }).addTo(map);

    markersGroupRef.current = window.L.layerGroup().addTo(map);

    // Listen to AIOverview custom event triggers for map focus
    const handleFocusEvent = (e: Event) => {
      const { lat, lon, zoom } = (e as CustomEvent).detail;
      if (mapRef.current) {
        mapRef.current.setView([lat, lon], zoom, { animate: true, duration: 1.5 });
        toast({ title: "Zooming in", description: `Centering on regional agricultural hub.` });
      }
    };
    window.addEventListener("map-focus", handleFocusEvent);
    return () => window.removeEventListener("map-focus", handleFocusEvent);
  }, [lReady, isDark]);

  // Redraw Markers when farmers data or searchQuery changes
  useEffect(() => {
    if (!lReady || !mapRef.current || !markersGroupRef.current) return;

    // Clear previous markers
    markersGroupRef.current.clearLayers();

    // Filter farmers based on query
    const query = searchQuery.toLowerCase();
    const filtered = farmers.filter(f => {
      if (!f.latitude || !f.longitude) return false;
      if (!query) return true;
      return (
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.crops.some((c: string) => c.toLowerCase().includes(query)) ||
        f.excess_resources.some((r: string) => r.toLowerCase().includes(query))
      );
    });

    filtered.forEach(farmer => {
      // Glow marker icon matching the agricultural green theme
      const customIcon = window.L.divIcon({
        className: 'custom-pulsing-marker',
        html: `
          <div style="
            position: relative;
            width: 16px;
            height: 16px;
            background: #10B981;
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(16,185,129,0.8), 0 0 16px rgba(16,185,129,0.5);
            cursor: pointer;
          ">
            <span style="
              position: absolute;
              top: -3px;
              left: -3px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 2px solid #10B981;
              animation: map-pulse 1.8s infinite;
              opacity: 0;
            "></span>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = window.L.marker([farmer.latitude, farmer.longitude], { icon: customIcon });
      
      // Hook click to show sliding panel profile details
      marker.on("click", () => {
        setSelectedFarmer(farmer);
        mapRef.current.setView([farmer.latitude, farmer.longitude], 8, { animate: true });
      });

      markersGroupRef.current.addLayer(marker);
    });
  }, [farmers, searchQuery, lReady]);

  // Update Map Tile Layer on Theme change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    window.L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      className: isDark ? "dark-map-tiles" : "",
    }).addTo(mapRef.current);
  }, [isDark]);

  const getWhatsAppLink = (f: any) => {
    const text = `Hi ${f.name}, I saw your location and listing for resource sharing on the SkyView Farmers Map! I am interested in connecting.`;
    return `https://wa.me/${f.whatsapp_number.replace(/[+\s-]/g, '')}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <FarmBackground />
      <div style={{ position: "relative", zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={0} sensorNodeOnline={true} />
      </div>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem", position: "relative", zIndex: 40 }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 className="text-3xl font-bold font-sans" style={{ color: isDark ? '#A8D89A' : '#1B3A20' }}>
              Decentralized Resource Distribution Map
            </h1>
            <p className="text-sm mt-1" style={{ color: isDark ? '#A3B8A8' : '#2C3E30' }}>
              Visualizing matching hubs and geographical density of agricultural resources.
            </p>
          </div>
          <Button onClick={loadFarmers} disabled={loading} variant="outline" className="border-emerald-600/30">
            <RotateCw size={15} className={loading ? "animate-spin" : ""} /> Refresh Map
          </Button>
        </div>

        {/* AI Overview Panel */}
        <AIOverview page="map" />

        {/* Map and Filter Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", position: "relative" }}>
          
          {/* Main Map Box */}
          <GlassSection style={{ padding: "12px", height: "620px", position: "relative", overflow: "hidden" }}>
            
            {/* Overlay Search Bar */}
            <div style={{
              position: "absolute",
              top: "24px",
              left: "24px",
              zIndex: 1000,
              width: "320px",
              display: "flex",
              gap: "8px",
            }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter map by resource or state..."
                  className="pl-9 bg-white/90 dark:bg-black/80 backdrop-blur-md shadow-md border-emerald-600/20"
                />
              </div>
            </div>

            {/* Map Placeholder/Container */}
            {!lReady && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900/40 rounded-xl">
                <RotateCw size={36} className="animate-spin text-emerald-500 mb-2" />
                <p className="text-gray-500 font-semibold">Loading map components...</p>
              </div>
            )}
            
            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "14px",
                overflow: "hidden",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)"
              }}
            />

            {/* Drawer: Detailed Profile View on Pin Click */}
            <AnimatePresence>
              {selectedFarmer && (
                <motion.div
                  initial={{ x: 380, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 380, opacity: 0 }}
                  transition={{ type: "spring", damping: 22, stiffness: 150 }}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    bottom: "12px",
                    width: "360px",
                    zIndex: 1001,
                    background: isDark ? "rgba(10,20,12,0.92)" : "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "14px",
                    border: `1.5px solid ${isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.2)"}`,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    boxSizing: "border-box"
                  }}
                >
                  {/* Close drawer button */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <span style={{
                      background: "rgba(16,185,129,0.12)", color: "#10B981",
                      padding: "2px 10px", borderRadius: "12px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase"
                    }}>
                      Farmer Profile
                    </span>
                    <button
                      onClick={() => setSelectedFarmer(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: isDark ? "white" : "black" }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }} className="scrollbar-none">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedFarmer.name}</h3>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      <MapPin size={13} color="#10B981" />
                      <span>{selectedFarmer.district ? `${selectedFarmer.district}, ${selectedFarmer.state}` : selectedFarmer.location}</span>
                    </div>

                    <div style={{ margin: "20px 0", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }} />

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-600/10">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Landholding</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-1 block">
                          {selectedFarmer.land_size_acres ? `${selectedFarmer.land_size_acres} Acres` : "Not specified"}
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-600/10">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Active Crops</span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-1 block truncate" title={selectedFarmer.crops.join(', ')}>
                          {selectedFarmer.crops.join(', ') || "None"}
                        </span>
                      </div>
                    </div>

                    {/* Excess Listings */}
                    <div className="mb-4">
                      <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <Check size={14} /> Available Excess (Offering)
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedFarmer.excess_resources?.length > 0 ? (
                          selectedFarmer.excess_resources.map((r: string, idx: number) => (
                            <span key={idx} className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-md">
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-gray-500">No tools listed</span>
                        )}
                      </div>
                    </div>

                    {/* Required Listings */}
                    <div className="mb-6">
                      <h4 className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <Shield size={14} className="text-amber-500" /> Resources Needed (Seeking)
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedFarmer.required_resources?.length > 0 ? (
                          selectedFarmer.required_resources.map((r: string, idx: number) => (
                            <span key={idx} className="text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-md">
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-gray-500">No resources needed</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Call to Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                    <Button
                      asChild
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 w-full"
                    >
                      <a href={getWhatsAppLink(selectedFarmer)} target="_blank" rel="noopener noreferrer">
                        <MessageSquare size={16} /> Contact on WhatsApp
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-emerald-600/30 text-emerald-800 dark:text-emerald-300 font-semibold gap-2 w-full"
                    >
                      <a href={`tel:${selectedFarmer.phone}`}>
                        <PhoneCall size={14} /> Direct Call: {selectedFarmer.phone}
                      </a>
                    </Button>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </GlassSection>
        </div>
      </main>

      <style>{`
        @keyframes map-pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .dark-map-tiles {
          filter: invert(0.9) hue-rotate(180deg) brightness(0.95) contrast(1.1) !important;
        }
      `}</style>
    </div>
  );
}
