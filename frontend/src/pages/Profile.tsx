import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FarmBackground } from "@/components/FarmTheme";
import { AIOverview } from "@/components/AIOverview";
import {
  UserCircle, MapPin, LayoutGrid, Wheat, ShieldCheck,
  ExternalLink, Loader2, Pencil, Check, X, Cpu,
  Wifi, WifiOff, ShoppingCart, PhoneCall, Mail, Home, Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";

const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Shared design tokens (same as MandiRates / Trends) ──────────────────────
const css = {
  card: (isDark: boolean) => ({
    background: isDark ? 'rgba(20, 20, 25, 0.7)' : 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}`,
    borderRadius: '20px',
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.06)',
  } as React.CSSProperties),
  text: {
    primary:   (isDark: boolean) => isDark ? '#D4EDDA' : '#142A1A',
    secondary: (isDark: boolean) => isDark ? '#5A8A6A' : '#4D7060',
    accent:  '#2ECC71',
    danger:  '#EF4444',
    info:    '#3B82F6',
    warning: '#F59E0B',
  },
};

// ─── Reusable primitives ──────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'transparent', color, border: `1.5px solid ${color}`, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function PrimaryBtn({
  onClick, disabled, children, danger, outline,
}: {
  onClick?: () => void; disabled?: boolean;
  children: React.ReactNode; danger?: boolean; outline?: boolean;
}) {
  const bg = outline
    ? 'transparent'
    : danger
      ? '#EF4444'
      : '#2ECC71';
  const color = outline
    ? (danger ? '#EF4444' : '#2ECC71')
    : '#fff';
  const border = outline
    ? `1px solid ${danger ? '#EF4444' : '#2ECC71'}`
    : 'none';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '0 20px', height: 44, borderRadius: 12, border,
        background: bg, color, cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 14, transition: 'all 0.18s',
        opacity: disabled ? 0.65 : 1, width: '100%',
        boxShadow: (!outline && !disabled) ? `0 2px 10px ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(46,204,113,0.25)'}` : 'none',
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, icon, accentColor, isDark }: {
  label: string; value: string | number;
  icon: React.ReactNode; accentColor: string; isDark: boolean;
}) {
  return (
    <div style={{ ...css.card(isDark), padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'transparent', border: `1.5px solid ${accentColor}`, color: accentColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color: css.text.secondary(isDark), fontWeight: 600, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: css.text.primary(isDark), margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

// ─── Field row (view mode) ────────────────────────────────────────────────────
function FieldRow({ label, icon, value, onAdd, isDark }: {
  label: string; icon: React.ReactNode;
  value: string; onAdd?: () => void; isDark: boolean;
}) {
  const textPrimary   = css.text.primary(isDark);
  const textSecondary = css.text.secondary(isDark);
  const borderColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${borderColor}` }}>
      <p style={{ fontSize: 10, color: textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: css.text.accent, flexShrink: 0 }}>{icon}</span>
        {value
          ? <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{value}</span>
          : <span
              onClick={onAdd}
              style={{ fontSize: 13, color: textSecondary, fontStyle: 'italic', cursor: 'pointer' }}
            >Tap to add…</span>
        }
      </div>
    </div>
  );
}

// ─── Field input (edit mode) ──────────────────────────────────────────────────
function FieldInput({ label, value, onChange, placeholder, isDark }: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder: string; isDark: boolean;
}) {
  const borderColor = isDark ? 'rgba(46,204,113,0.25)' : 'rgba(30,100,50,0.22)';
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: css.text.secondary(isDark), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>{label}</p>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: `1.5px solid ${borderColor}`, background: 'transparent',
          color: css.text.primary(isDark), fontSize: 14, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─── Scheme card ──────────────────────────────────────────────────────────────
function SchemeCard({ scheme, isMatch, index, isDark }: {
  scheme: any; isMatch: boolean; index: number; isDark: boolean;
}) {
  const textPrimary   = css.text.primary(isDark);
  const textSecondary = css.text.secondary(isDark);
  const borderColor   = isMatch
    ? '#2ECC71'
    : (isDark ? 'rgba(46,204,113,0.25)' : 'rgba(30,100,50,0.22)');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
    >
      <div style={{
        ...css.card(isDark),
        border: `1.5px solid ${borderColor}`,
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        background: 'transparent',
      }}>
        {/* Local match ribbon */}
        {isMatch && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            background: '#2ECC71', color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '4px 12px',
            borderBottomLeftRadius: 10,
          }}>
            Local Match
          </div>
        )}

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <Badge
            label={scheme.state || 'All India'}
            color={isMatch ? '#2ECC71' : css.text.info}
            bg={isMatch ? 'rgba(46,204,113,0.12)' : 'rgba(59,130,246,0.12)'}
          />
          {scheme.scheme_type && (
            <Badge
              label={String(scheme.scheme_type).replace(/_/g, ' ')}
              color={textSecondary}
              bg={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
            />
          )}
          {scheme.status && (
            <Badge
              label={scheme.status}
              color='#2ECC71'
              bg='rgba(46,204,113,0.1)'
            />
          )}
        </div>

        {/* Name */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: '0 0 8px', paddingRight: isMatch ? 80 : 0, fontFamily: "'Nunito', sans-serif" }}>
          {scheme.scheme_name}
        </h3>

        {/* Description */}
        <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, margin: '0 0 16px' }}>
          {scheme.benefit_description || scheme.description}
        </p>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 16 }}>
          {scheme.applicable_crops && (
            <div>
              <p style={{ fontSize: 9, color: textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>Crops</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wheat size={13} color='#2ECC71' style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{scheme.applicable_crops}</span>
              </div>
            </div>
          )}
          {scheme.eligibility && (
            <div>
              <p style={{ fontSize: 9, color: textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>Eligibility</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={13} color='#2ECC71' style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{scheme.eligibility}</span>
              </div>
            </div>
          )}
        </div>

        {/* Contact strip */}
        {(scheme.helpline || scheme.email || scheme.contact_address) && (
          <div style={{
            padding: '12px 0 12px',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: scheme.contact_address ? 8 : 0 }}>
              {scheme.helpline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: textSecondary, fontWeight: 600 }}>
                  <PhoneCall size={13} color='#2ECC71' />
                  Call: {scheme.helpline}
                </div>
              )}
              {scheme.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: textSecondary, fontWeight: 600 }}>
                  <Mail size={13} color='#2ECC71' />
                  {scheme.email}
                </div>
              )}
            </div>
            {scheme.contact_address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, color: textSecondary }}>
                <Home size={12} color='#2ECC71' style={{ flexShrink: 0, marginTop: 2 }} />
                {scheme.contact_address}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PrimaryBtn onClick={() => {
            const url = scheme.official_url || scheme.link || '';
            const isBrokenStateUrl = !url || ['nsmn.mahait.org', 'agripb.gov.in', 'pgsindia-ncof', 'atma.dac', 'ysrrythu', 'mpeuparjan'].some(d => url.includes(d));
            const targetUrl = isBrokenStateUrl
              ? `https://www.myscheme.gov.in/search?query=${encodeURIComponent(scheme.scheme_name || '')}`
              : url;
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
          }}>
            <ExternalLink size={15} /> Apply / Official Portal
          </PrimaryBtn>

          <button
            onClick={() => {
              window.open(`https://www.myscheme.gov.in/search?query=${encodeURIComponent(scheme.scheme_name || '')}`, '_blank', 'noopener,noreferrer');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              color: textSecondary,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={14} color="#3B82F6" /> MyScheme Portal
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── LOCAL SCHEMES FALLBACK ───────────────────────────────────────────────────
const LOCAL_SCHEMES = [
  { scheme_id: "pm_kisan", scheme_name: "PM-Kisan Samman Nidhi", scheme_type: "income_support", state: "India", applicable_crops: "All eligible crops", benefit_description: "Direct income support of Rs. 6,000 per year in three equal instalments to all landholding farmer families.", eligibility: "Landholding farmer family", status: "Active", official_url: "https://pmkisan.gov.in/", helpline: "155261", email: "pmkisan-ict@gov.in", contact_address: "Department of Agriculture & Farmers Welfare, Government of India" },
  { scheme_id: "pmfby", scheme_name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)", scheme_type: "insurance", state: "India", applicable_crops: "All notified crops", benefit_description: "Financial support to farmers suffering crop loss or damage due to natural calamities, pests and diseases.", eligibility: "Insured farmer sowing notified crops in notified areas", status: "Active", official_url: "https://pmfby.gov.in/", helpline: "14447", email: "helpdesk-pmfby@gov.in", contact_address: "Pradhan Mantri Fasal Bima Yojana portal" },
  { scheme_id: "soil_health_card", scheme_name: "Soil Health Card Scheme", scheme_type: "soil_management", state: "India", applicable_crops: "All crops", benefit_description: "Helps farmers understand the nutrient status of their soil and use fertilizers judiciously to reduce costs.", eligibility: "All farmers owning cultivable land", status: "Active", official_url: "https://soilhealth.dac.gov.in/", helpline: "1800-180-1551", email: "support@soilhealth.gov.in", contact_address: "Department of Agriculture & Farmers Welfare, Government of India" },
  { scheme_id: "kcc", scheme_name: "Kisan Credit Card (KCC)", scheme_type: "credit", state: "India", applicable_crops: "All crops", benefit_description: "Provides farmers with timely and adequate credit for cultivation needs and short-term credit requirements.", eligibility: "Eligible farmer, tenant farmer, sharecropper", status: "Active", official_url: "https://www.myscheme.gov.in/schemes/kcc", helpline: "1800-11-0034", email: "support@myscheme.gov.in", contact_address: "MyScheme portal" },
  { scheme_id: "pkvy", scheme_name: "Paramparagat Krishi Vikas Yojana (PKVY)", scheme_type: "organic_farming", state: "India", applicable_crops: "Organic clusters", benefit_description: "Promotes organic farming through a cluster approach and PGS certification to improve soil health.", eligibility: "Organic farming cluster members", status: "Active", official_url: "https://pgsindia-ncof.dac.gov.in/pkvy/", helpline: "1800-180-1551", email: "pkvy-support@gov.in", contact_address: "National Centre of Organic Farming, Government of India" },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const textPrimary   = css.text.primary(isDark);
  const textSecondary = css.text.secondary(isDark);
  const borderColor   = isDark ? 'rgba(46,204,113,0.12)' : 'rgba(30,100,50,0.1)';

  const queryClient = useQueryClient();
  const phone = localStorage.getItem("user_phone") || "";

  const cachedProfile = {
    name:            localStorage.getItem("user_name") || "",
    land_size_acres: localStorage.getItem("user_land_size") || "",
    location:        localStorage.getItem("user_location") || "",
    crops:           localStorage.getItem("user_crops")
      ? localStorage.getItem("user_crops")!.split(",").map(c => c.trim()).filter(Boolean)
      : [],
    latitude:        localStorage.getItem("user_latitude") || "",
    longitude:       localStorage.getItem("user_longitude") || "",
    state:           localStorage.getItem("user_state") || "",
    district:        localStorage.getItem("user_district") || "",
    excess_resources: localStorage.getItem("user_excess_resources")
      ? localStorage.getItem("user_excess_resources")!.split(",").map(c => c.trim()).filter(Boolean)
      : [],
    required_resources: localStorage.getItem("user_required_resources")
      ? localStorage.getItem("user_required_resources")!.split(",").map(c => c.trim()).filter(Boolean)
      : [],
    whatsapp_number:  localStorage.getItem("user_whatsapp_number") || "",
  };

  const { data: profileData = cachedProfile } = useQuery({
    queryKey: ['profile', phone],
    queryFn: async () => {
      if (!phone) return cachedProfile;
      const res = await fetch(`${API_URL}/api/profile?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) return cachedProfile;
      const data = await res.json();
      if (data.status === "success" && data.profile) {
        const p = data.profile;
        const cropsList = p.crops?.length ? p.crops : [];
        const excessList = p.excess_resources?.length ? p.excess_resources : [];
        const requiredList = p.required_resources?.length ? p.required_resources : [];

        if (p.name)            localStorage.setItem("user_name", p.name);
        if (p.land_size_acres) localStorage.setItem("user_land_size", String(p.land_size_acres));
        if (p.location)        localStorage.setItem("user_location", p.location);
        if (cropsList?.length) localStorage.setItem("user_crops", cropsList.join(", "));
        
        localStorage.setItem("user_latitude", p.latitude ? String(p.latitude) : "");
        localStorage.setItem("user_longitude", p.longitude ? String(p.longitude) : "");
        localStorage.setItem("user_state", p.state || "");
        localStorage.setItem("user_district", p.district || "");
        localStorage.setItem("user_excess_resources", excessList.join(", "));
        localStorage.setItem("user_required_resources", requiredList.join(", "));
        localStorage.setItem("user_whatsapp_number", p.whatsapp_number || "");

        return {
          name: p.name || "",
          land_size_acres: String(p.land_size_acres || ""),
          location: p.location || "",
          crops: cropsList,
          latitude: p.latitude ? String(p.latitude) : "",
          longitude: p.longitude ? String(p.longitude) : "",
          state: p.state || "",
          district: p.district || "",
          excess_resources: excessList,
          required_resources: requiredList,
          whatsapp_number: p.whatsapp_number || "",
        };
      }
      return cachedProfile;
    },
    enabled: !!phone,
    initialData: cachedProfile,
  });

  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    land_size_acres: "",
    location: "",
    crops: "",
    latitude: "",
    longitude: "",
    state: "",
    district: "",
    excess_resources: "",
    required_resources: "",
    whatsapp_number: "",
  });
  const [saving, setSaving]     = useState(false);
  const [hwConnecting, setHwConnecting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { hardwareConnected, connectHardware, disconnectHardware } = useAuth();
  const navigate = useNavigate();

  const handleConnectHardware = async () => {
    setHwConnecting(true);
    await new Promise(r => setTimeout(r, 1500));
    connectHardware('AGRISENSE-WS01');
    setHwConnecting(false);
    toast({ title: "Hardware Connected", description: "AgriSense WS01 is now paired to your account." });
  };

  const { data: schemes = LOCAL_SCHEMES, isFetching: schemesLoading, refetch: refetchSchemes } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(`${API_URL}/api/schemes`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const backendSchemes = Array.isArray(data) ? data : Array.isArray(data?.schemes) ? data.schemes : [];
        return backendSchemes.length > 0 ? backendSchemes : LOCAL_SCHEMES;
      } catch { return LOCAL_SCHEMES; }
    },
  });

  const sortedSchemes = useMemo(() => {
    const userLoc = (profileData.location || '').trim().toLowerCase();
    return [...schemes].sort((a, b) => {
      const aState = (a.state || '').trim().toLowerCase();
      const bState = (b.state || '').trim().toLowerCase();
      if (userLoc && aState === userLoc && bState !== userLoc) return -1;
      if (userLoc && bState === userLoc && aState !== userLoc) return 1;
      const nat = (s: string) => ['india', 'national', 'central', ''].includes(s);
      if (nat(aState) && !nat(bState)) return -1;
      if (nat(bState) && !nat(aState)) return 1;
      return a.scheme_name.localeCompare(b.scheme_name);
    });
  }, [schemes, profileData.location]);

  const startEdit = () => {
    setEditForm({
      name:            profileData.name,
      land_size_acres: profileData.land_size_acres,
      location:        profileData.location,
      crops:           profileData.crops.join(", "),
      latitude:        profileData.latitude,
      longitude:       profileData.longitude,
      state:           profileData.state,
      district:        profileData.district,
      excess_resources: profileData.excess_resources.join(", "),
      required_resources: profileData.required_resources.join(", "),
      whatsapp_number: profileData.whatsapp_number,
    });
    setEditing(true);
  };

  const getGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setEditForm(f => ({
            ...f,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          }));
          toast({ title: "Coordinates Acquired", description: `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}` });
        },
        () => {
          toast({ title: "Geolocation Failed", description: "Please enter coordinates manually.", variant: "destructive" });
        }
      );
    } else {
      toast({ title: "Unsupported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    const cropsArr = editForm.crops.split(",").map(c => c.trim()).filter(Boolean);
    const excessArr = editForm.excess_resources.split(",").map(c => c.trim()).filter(Boolean);
    const requiredArr = editForm.required_resources.split(",").map(c => c.trim()).filter(Boolean);

    localStorage.setItem("user_name", editForm.name);
    localStorage.setItem("user_land_size", editForm.land_size_acres);
    localStorage.setItem("user_location", editForm.location);
    localStorage.setItem("user_crops", editForm.crops);
    localStorage.setItem("user_latitude", editForm.latitude);
    localStorage.setItem("user_longitude", editForm.longitude);
    localStorage.setItem("user_state", editForm.state);
    localStorage.setItem("user_district", editForm.district);
    localStorage.setItem("user_excess_resources", editForm.excess_resources);
    localStorage.setItem("user_required_resources", editForm.required_resources);
    localStorage.setItem("user_whatsapp_number", editForm.whatsapp_number);

    const updatedProfile = {
      name: editForm.name,
      land_size_acres: editForm.land_size_acres,
      location: editForm.location,
      crops: cropsArr,
      latitude: editForm.latitude,
      longitude: editForm.longitude,
      state: editForm.state,
      district: editForm.district,
      excess_resources: excessArr,
      required_resources: requiredArr,
      whatsapp_number: editForm.whatsapp_number,
    };

    queryClient.setQueryData(['profile', phone], updatedProfile);
    setEditing(false);
    try {
      await fetch(`${API_URL}/api/profile/save`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone,
          land_size_acres: editForm.land_size_acres ? parseFloat(editForm.land_size_acres) : null,
          location: editForm.location,
          crops: cropsArr,
          latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
          longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
          state: editForm.state,
          district: editForm.district,
          excess_resources: excessArr,
          required_resources: requiredArr,
          whatsapp_number: editForm.whatsapp_number,
        }),
      });
      toast({ title: "Profile saved", description: "Your details have been updated." });
    } catch {
      toast({ title: "Saved locally", description: "Could not reach server, but your details are saved on this device." });
    }
    refetchSchemes();
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FarmBackground />

      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={0} sensorNodeOnline={true} />
      </div>

      <main style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1360, margin: '0 auto',
        padding: '28px 24px 80px',
        boxSizing: 'border-box',
      }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Nunito', sans-serif", color: isDark ? '#A8D89A' : '#1B3A20' }}>
            {t('profile_title')}
          </h1>
          <p style={{ fontSize: 12, color: isDark ? '#A3B8A8' : '#2C3E30', margin: 0 }}>
            Manage your farm profile and discover government schemes
          </p>
        </div>

        <AIOverview page="schemes" />

        {/* ── Top stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard label="Farmer Name"  value={profileData.name}            icon={<UserCircle size={20} />} accentColor="#2ECC71" isDark={isDark} />
          <StatCard label="Land Size"    value={profileData.land_size_acres ? `${profileData.land_size_acres} Acres` : ''} icon={<LayoutGrid size={20} />} accentColor="#3B82F6" isDark={isDark} />
          <StatCard label="Location"     value={profileData.location}         icon={<MapPin size={20} />}    accentColor="#F59E0B" isDark={isDark} />
          <StatCard label="Crops Grown"  value={profileData.crops.join(', ')} icon={<Wheat size={20} />}    accentColor="#EF4444" isDark={isDark} />
        </div>

        {/* ── Main two-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>

            {/* Profile card */}
            <div
              className="scrollable-card"
              style={{
                ...css.card(isDark),
                padding: '20px',
                maxHeight: 'calc(100vh - 120px)',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} color="#2ECC71" />
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: textPrimary }}>
                    Profile
                  </span>
                </div>
                {!editing && (
                  <button
                    onClick={startEdit}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, display: 'flex', padding: 4 }}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>

              {editing ? (
                <div>
                  <FieldInput label="Full Name"   value={editForm.name}            onChange={v => setEditForm(f => ({ ...f, name: v }))}            placeholder="e.g. Rajan Kumar"     isDark={isDark} />
                  <FieldInput label="Land (Acres)"value={editForm.land_size_acres} onChange={v => setEditForm(f => ({ ...f, land_size_acres: v }))} placeholder="e.g. 5.5"            isDark={isDark} />
                  <FieldInput label="Location (Details)" value={editForm.location} onChange={v => setEditForm(f => ({ ...f, location: v }))}         placeholder="e.g. Pune, Maharashtra" isDark={isDark} />
                  <FieldInput label="State"       value={editForm.state}           onChange={v => setEditForm(f => ({ ...f, state: v }))}           placeholder="e.g. Maharashtra" isDark={isDark} />
                  <FieldInput label="District"    value={editForm.district}        onChange={v => setEditForm(f => ({ ...f, district: v }))}        placeholder="e.g. Pune" isDark={isDark} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}>
                    <div style={{ flex: 1 }}><FieldInput label="Latitude" value={editForm.latitude} onChange={v => setEditForm(f => ({ ...f, latitude: v }))} placeholder="e.g. 18.5204" isDark={isDark} /></div>
                    <div style={{ flex: 1 }}><FieldInput label="Longitude" value={editForm.longitude} onChange={v => setEditForm(f => ({ ...f, longitude: v }))} placeholder="e.g. 73.8567" isDark={isDark} /></div>
                  </div>
                  <button
                    onClick={getGeolocation}
                    type="button"
                    style={{
                      width: '100%', marginBottom: 14,
                      background: 'transparent',
                      border: '1.5px solid #2ECC71',
                      borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#2ECC71', cursor: 'pointer',
                    }}
                  >
                    📍 Get Current GPS Location
                  </button>
                  <FieldInput label="Crops Grown" value={editForm.crops}            onChange={v => setEditForm(f => ({ ...f, crops: v }))}            placeholder="e.g. Wheat, Rice"    isDark={isDark} />
                  <FieldInput label="Excess Resources (To Rent/Share)" value={editForm.excess_resources} onChange={v => setEditForm(f => ({ ...f, excess_resources: v }))} placeholder="e.g. Tractor, Labor" isDark={isDark} />
                  <FieldInput label="Required Resources (To Find)" value={editForm.required_resources} onChange={v => setEditForm(f => ({ ...f, required_resources: v }))} placeholder="e.g. Harvester, Compost" isDark={isDark} />
                  <FieldInput label="WhatsApp / Contact Number" value={editForm.whatsapp_number} onChange={v => setEditForm(f => ({ ...f, whatsapp_number: v }))} placeholder="e.g. +919011012345" isDark={isDark} />
                  
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <PrimaryBtn onClick={saveProfile} disabled={saving}>
                      {saving ? <Loader2 size={15} style={{ animation: 'profile-spin 1s linear infinite' }} /> : <Check size={15} />}
                      {saving ? 'Saving…' : 'Save'}
                    </PrimaryBtn>
                    <PrimaryBtn outline onClick={() => setEditing(false)}>
                      <X size={15} /> Cancel
                    </PrimaryBtn>
                  </div>
                </div>
              ) : (
                <>
                  <FieldRow label="Full Name"   icon={<UserCircle size={15} />} value={profileData.name}                              onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="Land Size"   icon={<LayoutGrid size={15} />} value={profileData.land_size_acres ? `${profileData.land_size_acres} Acres` : ''} onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="Location"    icon={<MapPin size={15} />}     value={profileData.location}                          onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="State / District" icon={<MapPin size={15} />} value={profileData.state ? `${profileData.state} / ${profileData.district || '—'}` : ''} onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="Crops Grown" icon={<Wheat size={15} />}      value={profileData.crops.join(', ')}                  onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="Coordinates" icon={<MapPin size={15} />}     value={profileData.latitude ? `Lat: ${profileData.latitude}, Lon: ${profileData.longitude}` : ''} onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="Available Excess" icon={<Check size={15} />} value={profileData.excess_resources.join(', ')}       onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="Needs / Required" icon={<X size={15} />}     value={profileData.required_resources.join(', ')}     onAdd={startEdit} isDark={isDark} />
                  <FieldRow label="WhatsApp"    icon={<PhoneCall size={15} />}  value={profileData.whatsapp_number}                   onAdd={startEdit} isDark={isDark} />
                </>
              )}
            </div>

            {/* Hardware card */}
            <div style={{ ...css.card(isDark), padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, paddingBottom: 14, borderBottom: `1.5px solid ${borderColor}` }}>
                <Cpu size={16} color="#2ECC71" />
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: textPrimary }}>
                  Hardware Device
                </span>
              </div>

              {hardwareConnected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    background: 'transparent',
                    border: '1.5px solid #2ECC71',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ECC71', animation: 'profile-pulse 2s infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: textPrimary, margin: 0 }}>AgriSense WS01</p>
                      <p style={{ fontSize: 11, color: textSecondary, margin: 0 }}>FPGA Weather Station · Live</p>
                    </div>
                    <Wifi size={16} color="#2ECC71" />
                  </div>
                  <PrimaryBtn danger outline onClick={() => { disconnectHardware(); toast({ title: "Hardware Disconnected" }); }}>
                    <WifiOff size={15} /> Disconnect
                  </PrimaryBtn>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    background: 'transparent',
                    border: `1.5px solid ${borderColor}`,
                  }}>
                    <WifiOff size={16} color={textSecondary} />
                    <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>No device connected</p>
                  </div>
                  <PrimaryBtn onClick={handleConnectHardware} disabled={hwConnecting}>
                    {hwConnecting
                      ? <><Loader2 size={15} style={{ animation: 'profile-spin 1s linear infinite' }} /> Connecting…</>
                      : <><Wifi size={15} /> Connect AgriSense WS01</>
                    }
                  </PrimaryBtn>
                  <PrimaryBtn outline onClick={() => navigate('/buy-hardware')}>
                    <ShoppingCart size={15} /> Buy New Hardware
                  </PrimaryBtn>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: SCHEMES ── */}
          <div>
            {/* Schemes header card */}
            <div style={{
              ...css.card(isDark),
              padding: '18px 22px',
              marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={20} color="#2ECC71" />
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0, fontFamily: "'Nunito', sans-serif" }}>
                    {t('Recommended Schemes')}
                  </h2>
                  <p style={{ fontSize: 12, color: textSecondary, margin: '2px 0 0' }}>
                    {sortedSchemes.length} schemes · Sorted by relevance
                  </p>
                </div>
                {schemesLoading && <Loader2 size={16} color={textSecondary} style={{ animation: 'profile-spin 1s linear infinite' }} />}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge
                  label={profileData.location ? `📍 ${profileData.location}` : 'All India'}
                  color="#2ECC71"
                  bg="rgba(46,204,113,0.1)"
                />
                <button
                  onClick={() => refetchSchemes()}
                  disabled={schemesLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 16px', height: 38, borderRadius: 10, border: 'none',
                    background: '#2ECC71', color: '#fff',
                    cursor: schemesLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 13, opacity: schemesLoading ? 0.65 : 1,
                    boxShadow: schemesLoading ? 'none' : '0 2px 10px rgba(46,204,113,0.25)',
                  }}
                >
                  <ShieldCheck size={14} />
                  {t('advisor_refresh')}
                </button>
              </div>
            </div>
            
            {/* Scheme cards list */}
            {schemesLoading && schemes.length === 0 ? (
              <div style={{
                ...css.card(isDark), padding: '60px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                <Loader2 size={32} color="#2ECC71" style={{ animation: 'profile-spin 1s linear infinite' }} />
                <p style={{ color: textSecondary, fontWeight: 600, fontSize: 14, margin: 0 }}>
                  {t('profile_loading_schemes')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sortedSchemes.map((scheme, i) => {
                  const userLoc  = (profileData.location || '').trim().toLowerCase();
                  const isMatch  = !!userLoc && (scheme.state || '').trim().toLowerCase() === userLoc;
                  return (
                    <SchemeCard
                      key={scheme.scheme_id || i}
                      scheme={scheme}
                      isMatch={isMatch}
                      index={i}
                      isDark={isDark}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes profile-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes profile-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        /* Custom scrollbar for scrollable cards */
        .scrollable-card::-webkit-scrollbar {
          width: 6px;
        }
        .scrollable-card::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollable-card::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'};
          border-radius: 3px;
        }
        .scrollable-card::-webkit-scrollbar-thumb:hover {
          background: #2ECC71;
        }
      `}</style>
    </div>
  );
}