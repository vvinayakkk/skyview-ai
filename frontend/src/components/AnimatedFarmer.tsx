// Farmer with Pitchfork - Professional Illustration
export function FarmerWithPitchfork({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className}>
      {/* Background circle */}
      <circle cx="100" cy="60" r="70" fill="#b8dff0" opacity="0.8" />
      
      {/* Sky clouds */}
      <ellipse cx="40" cy="30" rx="25" ry="15" fill="#f5e6d3" opacity="0.9" />
      <ellipse cx="160" cy="35" rx="20" ry="12" fill="#f5e6d3" opacity="0.9" />
      
      {/* Hat - dark brown */}
      <ellipse cx="100" cy="38" rx="26" ry="14" fill="#3d2817" />
      <path d="M 74 38 Q 100 25 126 38" fill="#4a3520" />
      
      {/* Head */}
      <circle cx="100" cy="60" r="20" fill="#d9a67b" />
      
      {/* Face */}
      <circle cx="94" cy="57" r="2.5" fill="#2d1810" />
      <circle cx="106" cy="57" r="2.5" fill="#2d1810" />
      <path d="M 94 64 Q 100 67 106 64" stroke="#2d1810" strokeWidth="1.5" fill="none" />
      
      {/* Red shirt/collar */}
      <path d="M 82 78 L 100 85 L 118 78 L 115 95 L 85 95 Z" fill="#d84343" />
      
      {/* Brown overalls/apron - detailed */}
      <path d="M 80 95 L 120 95 L 125 165 L 75 165 Z" fill="#8b6f47" />
      <rect x="82" y="100" width="12" height="20" fill="#6b5837" opacity="0.6" />
      <rect x="106" y="100" width="12" height="20" fill="#6b5837" opacity="0.6" />
      <circle cx="88" cy="105" r="2" fill="#5a4d38" />
      <circle cx="112" cy="105" r="2" fill="#5a4d38" />
      
      {/* Arms with hands */}
      <ellipse cx="70" cy="88" rx="15" ry="7" fill="#d9a67b" transform="rotate(-20 70 88)" />
      <ellipse cx="130" cy="88" rx="15" ry="7" fill="#d9a67b" transform="rotate(20 130 88)" />
      <circle cx="60" cy="92" r="6" fill="#d9a67b" />
      <circle cx="140" cy="92" r="6" fill="#d9a67b" />
      
      {/* Left hand holding pitchfork */}
      <g>
        <line x1="58" y1="88" x2="40" y2="50" stroke="#8b6f47" strokeWidth="3.5" strokeLinecap="round" />
        {/* Pitchfork prongs */}
        <line x1="40" y1="50" x2="30" y2="45" stroke="#6b6b6b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="50" x2="40" y2="42" stroke="#6b6b6b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="50" x2="50" y2="45" stroke="#6b6b6b" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      
      {/* Legs */}
      <rect x="94" y="165" width="5" height="35" fill="#3d3428" />
      <rect x="101" y="165" width="5" height="35" fill="#3d3428" />
      
      {/* Shoes */}
      <ellipse cx="96.5" cy="202" rx="5" ry="4" fill="#1a1410" />
      <ellipse cx="103.5" cy="202" rx="5" ry="4" fill="#1a1410" />
      
      {/* Grass ground */}
      <ellipse cx="100" cy="220" rx="80" ry="18" fill="#6b8e23" />
      <path d="M 30 220 Q 50 210 70 220 T 110 220 T 150 220 T 170 220" stroke="#7ba428" strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );
}

// Farmer Harvesting Garden - Professional Illustration
export function FarmerHarvesting({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className}>
      {/* Background circle */}
      <circle cx="100" cy="70" r="65" fill="#b8dff0" opacity="0.8" />
      
      {/* Hat - orange/tan */}
      <ellipse cx="100" cy="45" rx="24" ry="13" fill="#f5a623" />
      <path d="M 76 45 Q 100 32 124 45" fill="#ff9500" />
      
      {/* Head */}
      <circle cx="100" cy="65" r="18" fill="#d9a67b" />
      
      {/* Face expression */}
      <circle cx="95" cy="62" r="2" fill="#2d1810" />
      <circle cx="105" cy="62" r="2" fill="#2d1810" />
      <path d="M 95 68 Q 100 70 105 68" stroke="#2d1810" strokeWidth="1.2" fill="none" />
      
      {/* Brown shirt */}
      <rect x="88" y="83" width="24" height="28" fill="#8b6f47" rx="2" />
      
      {/* Arms extended outward */}
      <ellipse cx="70" cy="92" rx="18" ry="6.5" fill="#d9a67b" transform="rotate(-15 70 92)" />
      <ellipse cx="130" cy="92" rx="18" ry="6.5" fill="#d9a67b" transform="rotate(15 130 92)" />
      <circle cx="60" cy="90" r="5.5" fill="#d9a67b" />
      <circle cx="140" cy="90" r="5.5" fill="#d9a67b" />
      
      {/* Wooden basket in center with vegetables */}
      <g transform="translate(100, 100)">
        {/* Basket body */}
        <path d="M -18 5 L 18 5 L 20 35 L -20 35 Z" fill="#c19a6b" stroke="#8b6f47" strokeWidth="1.5" />
        {/* Basket weave pattern */}
        <line x1="-15" y1="5" x2="-17" y2="35" stroke="#8b6f47" strokeWidth="1" opacity="0.5" />
        <line x1="0" y1="5" x2="-2" y2="35" stroke="#8b6f47" strokeWidth="1" opacity="0.5" />
        <line x1="15" y1="5" x2="13" y2="35" stroke="#8b6f47" strokeWidth="1" opacity="0.5" />
        
        {/* Vegetables in basket */}
        <circle cx="-8" cy="12" r="6" fill="#e74c3c" />
        <circle cx="4" cy="10" r="6" fill="#e74c3c" />
        <circle cx="12" cy="15" r="6" fill="#e74c3c" />
        <circle cx="-5" cy="22" r="5.5" fill="#e74c3c" />
        <circle cx="8" cy="24" r="5.5" fill="#e74c3c" />
        
        {/* Tomato highlights */}
        <circle cx="-8" cy="10" r="1.5" fill="#ff6b6b" opacity="0.7" />
        <circle cx="4" cy="8" r="1.5" fill="#ff6b6b" opacity="0.7" />
      </g>
      
      {/* Legs */}
      <rect x="95" y="145" width="5" height="32" fill="#3d3428" />
      <rect x="100" y="145" width="5" height="32" fill="#3d3428" />
      
      {/* Shoes */}
      <ellipse cx="97.5" cy="178" rx="4.5" ry="3.5" fill="#1a1410" />
      <ellipse cx="102.5" cy="178" rx="4.5" ry="3.5" fill="#1a1410" />
      
      {/* Garden vegetables around */}
      <g transform="translate(30, 140)">
        <ellipse cx="0" cy="0" rx="7" ry="13" fill="#ff9500" opacity="0.85" />
        <path d="M -2 -13 L 0 -20 L 2 -13" fill="#6b8e23" strokeWidth="1" />
      </g>
      
      <g transform="translate(170, 145)">
        <ellipse cx="0" cy="0" rx="8" ry="14" fill="#ff9500" opacity="0.85" />
        <path d="M -2 -14 L 0 -22 L 2 -14" fill="#6b8e23" strokeWidth="1" />
      </g>
      
      {/* Ground grass */}
      <ellipse cx="100" cy="215" rx="85" ry="20" fill="#6b8e23" />
      <path d="M 20 215 L 35 205 L 50 215 L 65 208 L 80 215 L 95 210 L 110 215 L 125 208 L 140 215 L 155 210 L 180 215" stroke="#7ba428" strokeWidth="2" fill="none" opacity="0.7" />
    </svg>
  );
}

// Farmer on Tractor - Professional Illustration
export function FarmerOnTractor({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className}>
      {/* Sky background */}
      <ellipse cx="120" cy="45" rx="110" ry="50" fill="#ffd89b" opacity="0.9" />
      
      {/* Sun */}
      <circle cx="180" cy="30" r="20" fill="#ffeb3b" />
      <circle cx="180" cy="30" r="18" fill="#ffd700" />
      
      {/* Tractor body - red */}
      <rect x="50" y="85" width="90" height="45" fill="#dc4038" rx="3" />
      
      {/* Tractor cabin/cab */}
      <rect x="120" y="70" width="22" height="30" fill="#dc4038" rx="2" />
      <rect x="123" y="73" width="16" height="18" fill="#87ceeb" opacity="0.8" stroke="#666" strokeWidth="1" />
      
      {/* Farmer in cab - head visible */}
      <circle cx="131" cy="80" r="7" fill="#d9a67b" />
      <circle cx="128" cy="78" r="1.2" fill="#2d1810" />
      <circle cx="134" cy="78" r="1.2" fill="#2d1810" />
      
      {/* Steering wheel */}
      <circle cx="130" cy="95" r="5.5" fill="none" stroke="#8b6f47" strokeWidth="2" opacity="0.8" />
      <line x1="126" y1="95" x2="134" y2="95" stroke="#8b6f47" strokeWidth="1.5" opacity="0.6" />
      
      {/* Engine detail */}
      <rect x="55" y="88" width="20" height="12" fill="#333" />
      <circle cx="65" cy="92" r="3" fill="#666" />
      
      {/* Smokestack */}
      <rect x="63" y="60" width="4" height="25" fill="#555" rx="1" />
      <ellipse cx="65" cy="58" rx="3" ry="2.5" fill="#888" />
      
      {/* Large rear wheels - detailed */}
      <circle cx="70" cy="135" r="20" fill="#1a1410" stroke="#333" strokeWidth="2" />
      <circle cx="70" cy="135" r="16" fill="#2d2d2d" />
      <circle cx="70" cy="135" r="12" fill="#444" />
      <circle cx="70" cy="135" r="8" fill="#666" opacity="0.6" />
      {/* Tire tread */}
      <line x1="60" y1="120" x2="80" y2="120" stroke="#999" strokeWidth="1" opacity="0.7" />
      <line x1="58" y1="135" x2="82" y2="135" stroke="#999" strokeWidth="1" opacity="0.7" />
      <line x1="60" y1="150" x2="80" y2="150" stroke="#999" strokeWidth="1" opacity="0.7" />
      
      {/* Right rear wheel */}
      <circle cx="150" cy="135" r="20" fill="#1a1410" stroke="#333" strokeWidth="2" />
      <circle cx="150" cy="135" r="16" fill="#2d2d2d" />
      <circle cx="150" cy="135" r="12" fill="#444" />
      <circle cx="150" cy="135" r="8" fill="#666" opacity="0.6" />
      <line x1="140" y1="120" x2="160" y2="120" stroke="#999" strokeWidth="1" opacity="0.7" />
      <line x1="138" y1="135" x2="162" y2="135" stroke="#999" strokeWidth="1" opacity="0.7" />
      <line x1="140" y1="150" x2="160" y2="150" stroke="#999" strokeWidth="1" opacity="0.7" />
      
      {/* Front wheels - smaller */}
      <circle cx="60" cy="130" r="11" fill="#1a1410" stroke="#333" strokeWidth="1.5" />
      <circle cx="60" cy="130" r="8" fill="#3d3d3d" />
      <circle cx="60" cy="130" r="5" fill="#555" />
      
      <circle cx="160" cy="130" r="11" fill="#1a1410" stroke="#333" strokeWidth="1.5" />
      <circle cx="160" cy="130" r="8" fill="#3d3d3d" />
      <circle cx="160" cy="130" r="5" fill="#555" />
      
      {/* Cornfield - corn plants */}
      <g transform="translate(20, 150)">
        <ellipse cx="0" cy="0" rx="8" ry="16" fill="#7cb342" opacity="0.85" />
        <path d="M -3 -16 L 0 -25 L 3 -16 M -2 -10 L -5 -8 L 0 -12 L 5 -8 L 2 -10" fill="#9ccc65" strokeWidth="0.5" />
      </g>
      
      <g transform="translate(200, 155)">
        <ellipse cx="0" cy="0" rx="9" ry="17" fill="#7cb342" opacity="0.85" />
        <path d="M -3 -17 L 0 -27 L 3 -17 M -2 -11 L -5 -9 L 0 -13 L 5 -9 L 2 -11" fill="#9ccc65" strokeWidth="0.5" />
      </g>
      
      <g transform="translate(50, 165)">
        <ellipse cx="0" cy="0" rx="7" ry="15" fill="#7cb342" opacity="0.85" />
        <path d="M -3 -15 L 0 -23 L 3 -15" fill="#9ccc65" strokeWidth="0.5" />
      </g>
      
      {/* Ground/field */}
      <ellipse cx="120" cy="170" rx="120" ry="18" fill="#8bc34a" />
      <path d="M 0 170 Q 30 160 60 170 T 120 170 T 180 170 T 240 170" stroke="#7cb342" strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );
}
