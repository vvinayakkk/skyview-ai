import React from "react";

/**
 * GreenhouseBackground — A full SVG illustration of a greenhouse interior
 * matching the reference image: curved glass ceiling, tomato plants on both
 * sides, soil beds, root vegetables, and floating data dashboard panels.
 *
 * Usage: render as absolute/fixed behind a centered form card.
 */
export default function GreenhouseBackground() {
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                overflow: "hidden",
                zIndex: 0,
            }}
        >
            <svg
                viewBox="0 0 1440 810"
                preserveAspectRatio="xMidYMid slice"
                style={{ width: "100%", height: "100%", display: "block" }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Sky gradient behind the greenhouse glass */}
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#B8D8E8" />
                        <stop offset="60%" stopColor="#C5E3F0" />
                        <stop offset="100%" stopColor="#D6EAD4" />
                    </linearGradient>

                    {/* Glass panel gradient */}
                    <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(180,215,235,0.45)" />
                        <stop offset="100%" stopColor="rgba(200,230,220,0.25)" />
                    </linearGradient>

                    {/* Ground/soil gradient */}
                    <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6B4226" />
                        <stop offset="100%" stopColor="#4A2D14" />
                    </linearGradient>

                    {/* Walkway gradient */}
                    <linearGradient id="walkwayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B7355" />
                        <stop offset="100%" stopColor="#6B5235" />
                    </linearGradient>
                </defs>

                {/* ═══ SKY ═══ */}
                <rect width="1440" height="810" fill="url(#skyGrad)" />

                {/* ═══ DISTANT HILLS/TREES visible through glass ═══ */}
                <ellipse cx="720" cy="430" rx="900" ry="120" fill="#8CC07A" opacity="0.5" />
                <ellipse cx="400" cy="420" rx="350" ry="80" fill="#7AB868" opacity="0.4" />
                <ellipse cx="1100" cy="415" rx="380" ry="85" fill="#7AB868" opacity="0.4" />

                {/* ═══ GREENHOUSE FRAME ═══ */}
                {/* Main arch */}
                <path
                    d="M0,810 L0,350 Q0,60 360,30 Q720,-20 720,20 Q720,-20 1080,30 Q1440,60 1440,350 L1440,810 Z"
                    fill="url(#glassGrad)"
                    stroke="none"
                />

                {/* Glass panel frame lines (arch ribs) */}
                {[0, 180, 360, 540, 720, 900, 1080, 1260, 1440].map((x, i) => (
                    <path
                        key={`rib-${i}`}
                        d={`M${x},810 Q${x},${200 + Math.abs(x - 720) * 0.15} ${720},${20 + Math.abs(x - 720) * 0.02}`}
                        fill="none"
                        stroke="#A8C4B8"
                        strokeWidth="3"
                        opacity="0.6"
                    />
                ))}

                {/* Horizontal frame bars */}
                {[150, 280, 400].map((y, i) => (
                    <path
                        key={`hbar-${i}`}
                        d={`M${80 - i * 20},${y} Q720,${y - 30 + i * 10} ${1360 + i * 20},${y}`}
                        fill="none"
                        stroke="#A8C4B8"
                        strokeWidth="2.5"
                        opacity="0.5"
                    />
                ))}

                {/* Top arch thick frame */}
                <path
                    d="M0,350 Q0,60 360,30 Q720,-20 720,20 Q720,-20 1080,30 Q1440,60 1440,350"
                    fill="none"
                    stroke="#8FAFA3"
                    strokeWidth="5"
                    opacity="0.7"
                />

                {/* ═══ GROUND / SOIL AREA ═══ */}
                {/* Main ground */}
                <rect x="0" y="540" width="1440" height="270" fill="#5C3A1E" />

                {/* Central walkway (perspective) */}
                <path
                    d="M620,810 L660,540 L780,540 L820,810 Z"
                    fill="url(#walkwayGrad)"
                />
                <path
                    d="M620,810 L660,540 L780,540 L820,810 Z"
                    fill="none"
                    stroke="#7A6040"
                    strokeWidth="1.5"
                    opacity="0.5"
                />

                {/* ═══ LEFT SOIL BEDS ═══ */}
                {/* Raised bed left 1 */}
                <rect x="60" y="560" width="560" height="90" rx="4" fill="#6B4226" />
                <rect x="60" y="555" width="560" height="12" rx="3" fill="#8B6040" />

                {/* Left bed 2 (lower / foreground) */}
                <rect x="30" y="690" width="580" height="100" rx="4" fill="#5A3518" />
                <rect x="30" y="685" width="580" height="12" rx="3" fill="#7A5030" />

                {/* ═══ RIGHT SOIL BEDS ═══ */}
                <rect x="820" y="560" width="560" height="90" rx="4" fill="#6B4226" />
                <rect x="820" y="555" width="560" height="12" rx="3" fill="#8B6040" />

                <rect x="830" y="690" width="580" height="100" rx="4" fill="#5A3518" />
                <rect x="830" y="685" width="580" height="12" rx="3" fill="#7A5030" />

                {/* ═══ LEFT SIDE PLANTS ═══ */}
                {/* Tomato plants (tall with red fruits) */}
                {[120, 220, 320, 420, 520].map((x, i) => (
                    <g key={`ltomato-${i}`}>
                        {/* Stem */}
                        <line
                            x1={x}
                            y1={560}
                            x2={x + (i % 2 === 0 ? -5 : 5)}
                            y2={380 - i * 8}
                            stroke="#4A7A3A"
                            strokeWidth="3"
                        />
                        {/* Leaves */}
                        <ellipse
                            cx={x - 18}
                            cy={440 - i * 5}
                            rx="25"
                            ry="10"
                            fill="#5A9A40"
                            transform={`rotate(-20 ${x - 18} ${440 - i * 5})`}
                        />
                        <ellipse
                            cx={x + 18}
                            cy={460 - i * 5}
                            rx="22"
                            ry="9"
                            fill="#4A8A35"
                            transform={`rotate(15 ${x + 18} ${460 - i * 5})`}
                        />
                        <ellipse
                            cx={x - 15}
                            cy={490 - i * 5}
                            rx="20"
                            ry="8"
                            fill="#5A9A40"
                            transform={`rotate(-25 ${x - 15} ${490 - i * 5})`}
                        />
                        <ellipse
                            cx={x + 20}
                            cy={510 - i * 5}
                            rx="23"
                            ry="9"
                            fill="#4A8A35"
                            transform={`rotate(20 ${x + 20} ${510 - i * 5})`}
                        />
                        <ellipse
                            cx={x}
                            cy={530 - i * 3}
                            rx="28"
                            ry="12"
                            fill="#65A850"
                            transform={`rotate(5 ${x} ${530 - i * 3})`}
                        />
                        {/* Tomatoes */}
                        <circle cx={x - 12} cy={470 - i * 5} r="8" fill="#E84030" />
                        <circle cx={x + 10} cy={485 - i * 4} r="7" fill="#D63520" />
                        <circle cx={x - 8} cy={500 - i * 5} r="9" fill="#E84030" />
                        <circle cx={x + 14} cy={520 - i * 4} r="6" fill="#CC3020" />
                        {/* Small green tomatoes */}
                        <circle cx={x + 5} cy={445 - i * 5} r="5" fill="#7ABF50" />
                    </g>
                ))}

                {/* Foreground left plants (leafy greens + root vegetables) */}
                {[80, 170, 260, 350, 440, 530].map((x, i) => (
                    <g key={`lleafy-${i}`}>
                        {/* Leafy top */}
                        <ellipse cx={x} cy={680} rx="28" ry="20" fill="#4A8A35" />
                        <ellipse cx={x - 10} cy={675} rx="18" ry="14" fill="#5AA845" />
                        <ellipse cx={x + 12} cy={672} rx="16" ry="12" fill="#60B050" />
                        {/* Root peaking */}
                        {i % 3 === 0 && (
                            <ellipse cx={x} cy={698} rx="10" ry="14" fill="#C44070" />
                        )}
                        {i % 3 === 1 && (
                            <ellipse cx={x + 5} cy={700} rx="8" ry="12" fill="#E88030" />
                        )}
                    </g>
                ))}

                {/* ═══ RIGHT SIDE PLANTS ═══ */}
                {/* Tomato plants right */}
                {[920, 1020, 1120, 1220, 1320].map((x, i) => (
                    <g key={`rtomato-${i}`}>
                        <line
                            x1={x}
                            y1={560}
                            x2={x + (i % 2 === 0 ? 5 : -5)}
                            y2={380 - i * 8}
                            stroke="#4A7A3A"
                            strokeWidth="3"
                        />
                        <ellipse
                            cx={x + 18}
                            cy={440 - i * 5}
                            rx="25"
                            ry="10"
                            fill="#5A9A40"
                            transform={`rotate(20 ${x + 18} ${440 - i * 5})`}
                        />
                        <ellipse
                            cx={x - 18}
                            cy={460 - i * 5}
                            rx="22"
                            ry="9"
                            fill="#4A8A35"
                            transform={`rotate(-15 ${x - 18} ${460 - i * 5})`}
                        />
                        <ellipse
                            cx={x + 15}
                            cy={490 - i * 5}
                            rx="20"
                            ry="8"
                            fill="#5A9A40"
                            transform={`rotate(25 ${x + 15} ${490 - i * 5})`}
                        />
                        <ellipse
                            cx={x - 20}
                            cy={510 - i * 5}
                            rx="23"
                            ry="9"
                            fill="#4A8A35"
                            transform={`rotate(-20 ${x - 20} ${510 - i * 5})`}
                        />
                        <ellipse
                            cx={x}
                            cy={530 - i * 3}
                            rx="28"
                            ry="12"
                            fill="#65A850"
                            transform={`rotate(-5 ${x} ${530 - i * 3})`}
                        />
                        <circle cx={x + 12} cy={470 - i * 5} r="8" fill="#E84030" />
                        <circle cx={x - 10} cy={485 - i * 4} r="7" fill="#D63520" />
                        <circle cx={x + 8} cy={500 - i * 5} r="9" fill="#E84030" />
                        <circle cx={x - 14} cy={520 - i * 4} r="6" fill="#CC3020" />
                        <circle cx={x - 5} cy={445 - i * 5} r="5" fill="#7ABF50" />
                    </g>
                ))}

                {/* Foreground right leafy plants */}
                {[870, 960, 1050, 1140, 1230, 1340].map((x, i) => (
                    <g key={`rleafy-${i}`}>
                        <ellipse cx={x} cy={680} rx="28" ry="20" fill="#4A8A35" />
                        <ellipse cx={x + 10} cy={675} rx="18" ry="14" fill="#5AA845" />
                        <ellipse cx={x - 12} cy={672} rx="16" ry="12" fill="#60B050" />
                        {i % 3 === 0 && (
                            <ellipse cx={x} cy={698} rx="10" ry="14" fill="#C44070" />
                        )}
                        {i % 3 === 2 && (
                            <ellipse cx={x - 5} cy={700} rx="8" ry="12" fill="#E88030" />
                        )}
                    </g>
                ))}

                {/* ═══ DATA DASHBOARD PANELS (floating on glass walls) ═══ */}

                {/* LEFT PANEL 1 — Bar chart */}
                <g transform="translate(80, 180) rotate(-8)">
                    <rect
                        width="140"
                        height="110"
                        rx="8"
                        fill="rgba(220,235,248,0.85)"
                        stroke="#A0BCD0"
                        strokeWidth="1.5"
                    />
                    {/* Mini bar chart */}
                    <rect x="20" y="30" width="14" height="50" rx="2" fill="#5BAE50" />
                    <rect x="40" y="45" width="14" height="35" rx="2" fill="#7AC070" />
                    <rect x="60" y="25" width="14" height="55" rx="2" fill="#4A9A40" />
                    <rect x="80" y="38" width="14" height="42" rx="2" fill="#6AB460" />
                    <rect x="100" y="50" width="14" height="30" rx="2" fill="#8ACA80" />
                    {/* Label lines */}
                    <rect x="20" y="15" width="60" height="4" rx="2" fill="#7A9AB0" />
                    <rect x="20" y="88" width="95" height="3" rx="1" fill="#B0C8D8" />
                    {/* Plant icon */}
                    <circle cx="120" cy="18" r="8" fill="#D4E8D0" />
                    <line x1="120" y1="22" x2="120" y2="12" stroke="#4A8A35" strokeWidth="1.5" />
                    <ellipse cx="116" cy="14" rx="4" ry="3" fill="#5A9A40" />
                    <ellipse cx="124" cy="16" rx="4" ry="3" fill="#5A9A40" />
                </g>

                {/* LEFT PANEL 2 — Pie chart */}
                <g transform="translate(20, 330) rotate(-5)">
                    <rect
                        width="120"
                        height="100"
                        rx="8"
                        fill="rgba(220,235,248,0.80)"
                        stroke="#A0BCD0"
                        strokeWidth="1.5"
                    />
                    {/* Pie chart */}
                    <circle cx="60" cy="55" r="28" fill="#E8E0D0" />
                    <path d="M60,55 L60,27 A28,28 0 0,1 84,42 Z" fill="#5BAE50" />
                    <path d="M60,55 L84,42 A28,28 0 0,1 75,80 Z" fill="#E8A030" />
                    <path d="M60,55 L75,80 A28,28 0 0,1 38,76 Z" fill="#D05040" />
                    {/* Label */}
                    <rect x="15" y="12" width="50" height="4" rx="2" fill="#7A9AB0" />
                </g>

                {/* RIGHT PANEL 1 — Multi-color bar chart */}
                <g transform="translate(1220, 170) rotate(8)">
                    <rect
                        width="150"
                        height="115"
                        rx="8"
                        fill="rgba(220,235,248,0.85)"
                        stroke="#A0BCD0"
                        strokeWidth="1.5"
                    />
                    {/* Colorful bar chart */}
                    <rect x="15" y="35" width="16" height="50" rx="2" fill="#E84040" />
                    <rect x="35" y="28" width="16" height="57" rx="2" fill="#E8A030" />
                    <rect x="55" y="42" width="16" height="43" rx="2" fill="#50B050" />
                    <rect x="75" y="20" width="16" height="65" rx="2" fill="#4090D0" />
                    <rect x="95" y="38" width="16" height="47" rx="2" fill="#9060C0" />
                    <rect x="115" y="50" width="16" height="35" rx="2" fill="#D05080" />
                    {/* Label */}
                    <rect x="15" y="15" width="70" height="4" rx="2" fill="#7A9AB0" />
                    <rect x="15" y="92" width="115" height="3" rx="1" fill="#B0C8D8" />
                    {/* Pie mini */}
                    <circle cx="130" cy="18" r="8" fill="#D4E8D0" />
                </g>

                {/* RIGHT PANEL 2 — Line chart / dashboard */}
                <g transform="translate(1280, 320) rotate(6)">
                    <rect
                        width="130"
                        height="100"
                        rx="8"
                        fill="rgba(220,235,248,0.80)"
                        stroke="#A0BCD0"
                        strokeWidth="1.5"
                    />
                    {/* Horizontal lines */}
                    <rect x="15" y="25" width="100" height="3" rx="1" fill="#C0D0E0" />
                    <rect x="15" y="40" width="100" height="3" rx="1" fill="#C0D0E0" />
                    <rect x="15" y="55" width="100" height="3" rx="1" fill="#C0D0E0" />
                    {/* Bar mini */}
                    <rect x="15" y="65" width="20" height="15" rx="2" fill="#5BAE50" />
                    <rect x="40" y="62" width="20" height="18" rx="2" fill="#4A9A40" />
                    <rect x="65" y="68" width="20" height="12" rx="2" fill="#7AC070" />
                    <rect x="90" y="60" width="20" height="20" rx="2" fill="#5BAE50" />
                    {/* Pie chart mini */}
                    <circle cx="110" cy="18" r="10" fill="#E8E0D0" />
                    <path d="M110,18 L110,8 A10,10 0 0,1 118,14 Z" fill="#D05080" />
                    <path d="M110,18 L118,14 A10,10 0 0,1 114,27 Z" fill="#4090D0" />
                    {/* Label */}
                    <rect x="15" y="12" width="50" height="4" rx="2" fill="#7A9AB0" />
                </g>

                {/* ═══ EXTRA DETAILS ═══ */}

                {/* Soft light rays through glass */}
                <rect x="0" y="0" width="1440" height="810" fill="url(#glassGrad)" opacity="0.15" />

                {/* Floor edge shadow */}
                <rect x="0" y="538" width="1440" height="6" fill="rgba(0,0,0,0.08)" />

                {/* Small star/sparkle bottom right */}
                <polygon
                    points="1380,760 1384,770 1394,770 1386,776 1389,786 1380,780 1371,786 1374,776 1366,770 1376,770"
                    fill="#FFD700"
                    opacity="0.7"
                />
            </svg>

            {/* Subtle vignette overlay for depth */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.12) 100%)",
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
