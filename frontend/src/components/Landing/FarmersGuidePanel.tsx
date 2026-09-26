import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sprout,
    Thermometer,
    Droplets,
    MessageSquare,
    BarChart3,
    X,
    ChevronDown,
} from 'lucide-react';

export default function FarmersGuidePanel({ onClose }: { onClose: () => void }) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const guides = [
        {
            icon: Sprout,
            title: "Getting Started with SkyView AI",
            color: "#16A34A",
            bg: "#F0FDF4",
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
            color: "#15803D",
            bg: "#F0FDF4",
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
            color: "#16A34A",
            bg: "#F0FDF4",
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
            color: "#15803D",
            bg: "#F0FDF4",
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
            color: "#16A34A",
            bg: "#F0FDF4",
            steps: [
                "Visit the Trends page to view historical sensor data over days, weeks, or months.",
                "Compare seasons to identify patterns in soil health and weather impact.",
                "Generate PDF reports from the Reports page to share with agricultural advisors.",
                "Use trend data to plan crop rotation, fertilization, and harvest timing.",
            ],
        },
    ];

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '82vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: '24px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#F0FDF4',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            padding: '10px',
                            borderRadius: '14px',
                            background: '#DCFCE7',
                            border: '1px solid #BBF7D0',
                        }}>
                            <Sprout style={{ width: 22, height: 22, color: '#16A34A' }} />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#111827',
                                letterSpacing: '-0.3px',
                                margin: 0,
                            }}>
                                Farmer's Guide
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                Mastering precision agriculture with SkyView AI
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            borderRadius: '50%',
                            border: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            background: '#FFFFFF',
                            color: '#9CA3AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F3F4F6';
                            e.currentTarget.style.color = '#374151';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.color = '#9CA3AF';
                        }}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {guides.map((guide, idx) => {
                            const isOpen = openIndex === idx;
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        borderRadius: '16px',
                                        border: isOpen
                                            ? '1px solid #BBF7D0'
                                            : '1px solid #F3F4F6',
                                        background: isOpen ? '#F0FDF4' : '#FAFAFA',
                                        transition: 'all 0.3s ease',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <button
                                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                                        style={{
                                            width: '100%',
                                            padding: '18px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div style={{
                                            padding: '8px',
                                            borderRadius: '10px',
                                            background: '#DCFCE7',
                                            flexShrink: 0,
                                        }}>
                                            <guide.icon style={{ width: 18, height: 18, color: guide.color }} />
                                        </div>
                                        <span style={{
                                            flex: 1,
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            color: '#111827',
                                            letterSpacing: '-0.2px',
                                        }}>
                                            {guide.title}
                                        </span>
                                        <ChevronDown style={{
                                            width: 16,
                                            height: 16,
                                            color: '#9CA3AF',
                                            transition: 'transform 0.3s ease',
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                                        }} />
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{
                                                    padding: '4px 20px 20px',
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                                    gap: '10px',
                                                }}>
                                                    {guide.steps.map((step, sIdx) => (
                                                        <motion.div
                                                            key={sIdx}
                                                            initial={{ y: 6, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: sIdx * 0.07 }}
                                                            style={{
                                                                display: 'flex',
                                                                gap: '12px',
                                                                padding: '14px 16px',
                                                                borderRadius: '12px',
                                                                background: '#FFFFFF',
                                                                border: '1px solid #E5E7EB',
                                                                transition: 'all 0.2s',
                                                                cursor: 'default',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#F0FDF4';
                                                                e.currentTarget.style.borderColor = '#BBF7D0';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#FFFFFF';
                                                                e.currentTarget.style.borderColor = '#E5E7EB';
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: '#DCFCE7',
                                                                color: '#16A34A',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                flexShrink: 0,
                                                                marginTop: '1px',
                                                            }}>
                                                                {sIdx + 1}
                                                            </div>
                                                            <p style={{
                                                                fontSize: '13px',
                                                                lineHeight: 1.6,
                                                                color: '#4B5563',
                                                                margin: 0,
                                                            }}>
                                                                {step}
                                                            </p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '18px 32px',
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: '#FAFAFA',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 28px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#16A34A',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#15803D';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#16A34A';
                        }}
                    >
                        Got it
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
