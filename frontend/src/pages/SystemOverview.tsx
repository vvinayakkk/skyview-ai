import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FarmBackground, GlassSection } from '@/components/FarmTheme';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { getSystemHealth, SystemHealth } from '@/lib/weatherData';
import { WeatherStation } from '@/components/overview/WeatherStation';
import { Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

export default function SystemOverview() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t } = useLanguage();
    const [selectedSensor, setSelectedSensor] = useState<string | null>(null);

    const { data: systemHealth = null } = useQuery({
        queryKey: ['systemHealth'],
        queryFn: getSystemHealth,
        refetchInterval: 10000,
    });

    const sensorDescriptions: Record<string, { title: string; desc: string }> = {
        windVane: {
            title: "Wind Vane (Direction Sensor)",
            desc: "Measures the direction of the wind. The current model shows a fin and arrow design that aligns itself with the wind flow."
        },
        anemometer: {
            title: "Anemometer (Wind Speed)",
            desc: "Uses rotating cups to measure wind speed. The faster the cups spin, the higher the wind velocity."
        },
        rainGauge: {
            title: "Rain Gauge",
            desc: "A tipping-bucket mechanism that measures rainfall intensity and volume by counting the number of times the bucket tips."
        },
        solarPanel: {
            title: "Solar Panel",
            desc: "Provides renewable energy to power the entire sensor array and charge the internal batteries."
        },
        lcd: {
            title: "LCD Interface",
            desc: "Local display showing real-time statistics and system status for on-site monitoring."
        },
        soilSensor: {
            title: "Soil Moisture Sensor",
            desc: "Inserted into the ground to measure the volumetric water content in the soil, crucial for irrigation planning."
        },
        controller: {
            title: "Master Controller (ESP32/Arduino)",
            desc: "The 'brain' of the system that collects data from all sensors and transmits it to the cloud via Wi-Fi/LoRa."
        }
    };

    const sensorInfo = selectedSensor && sensorDescriptions[selectedSensor] ? sensorDescriptions[selectedSensor] : null;

    return (
        <div style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, overflow: 'hidden' }}>
            <FarmBackground />

            {/* Full Screen 3D Viewport */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <WeatherStation onSelectSensor={setSelectedSensor} />
            </div>

            {/* UI Overlay */}
            <div style={{ position: 'relative', zIndex: 50, height: '100%', pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <DashboardHeader
                        lastUpdateSeconds={systemHealth ? systemHealth.lastUpdateSeconds : 0}
                        sensorNodeOnline={systemHealth ? systemHealth.sensorNodeOnline : false}
                    />
                </div>

                {/* Bottom Interaction Guide */}
                {!selectedSensor && (
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(10px)',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        color: isDark ? 'white' : '#1B3A20',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 10px #2ECC71' }} />
                        Explore the system by clicking on the floating labels
                    </div>
                )}

                {/* Info Panel Overlay */}
                <AnimatePresence>
                    {sensorInfo && (
                        <motion.div
                            initial={{ x: 400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 400, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            style={{
                                position: 'absolute',
                                right: '30px',
                                top: '100px',
                                width: '380px',
                                pointerEvents: 'auto'
                            }}
                        >
                            <GlassSection
                                title={sensorInfo.title}
                                icon={<Info className="w-4 h-4" />}
                                noHeader={false}
                            >
                                <button
                                    onClick={() => setSelectedSensor(null)}
                                    style={{
                                        position: 'absolute',
                                        top: '15px',
                                        right: '15px',
                                        padding: '5px',
                                        borderRadius: '50%',
                                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: isDark ? 'white' : '#1B3A20'
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="mt-4">
                                    <p className={`${isDark ? 'text-white/80' : 'text-[#1B3A20]/80'} leading-relaxed text-sm`}>
                                        {sensorInfo.desc}
                                    </p>

                                    <div className="mt-8 space-y-4">
                                        <div className={`p-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border rounded-2xl`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#2ECC71]">Status</span>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className={`${isDark ? 'text-white' : 'text-[#1B3A20]'} font-bold`}>Operational</span>
                                                <div className="w-2 h-2 rounded-full bg-[#2ECC71] shadow-[0_0_10px_#2ECC71]" />
                                            </div>
                                        </div>

                                        <div className={`p-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border rounded-2xl`}>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-[#1B3A20]/50'}`}>Telemetry</span>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className={`${isDark ? 'text-white' : 'text-[#1B3A20]'} font-medium`}>Last Sync</span>
                                                <span className={`${isDark ? 'text-white/70' : 'text-[#1B3A20]/70'} text-sm`}>Just now</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-4 bg-[#2ECC71]/10 border border-[#2ECC71]/30 rounded-2xl text-[#2ECC71]">
                                        <p className="text-xs font-bold text-center">
                                            Active Interaction Enabled
                                        </p>
                                    </div>
                                </div>
                            </GlassSection>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
