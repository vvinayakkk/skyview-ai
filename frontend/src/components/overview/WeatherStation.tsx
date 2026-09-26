import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    PerspectiveCamera,
    Environment,
    Float,
    ContactShadows,
    Text,
    Html,
} from '@react-three/drei';
import * as THREE from 'three';

interface WeatherStationProps {
    onSelectSensor: (sensor: string | null) => void;
}

interface SensorComponentProps {
    isActive: boolean;
    onClick: () => void;
    position?: [number, number, number];
}

interface RotatingSensorProps extends SensorComponentProps {
    isRotating: boolean;
}

export function WeatherStation({ onSelectSensor }: WeatherStationProps) {
    const [activeSensor, setActiveSensor] = useState<string | null>(null);
    const [rotations, setRotations] = useState({ windVane: true, anemometer: true });

    const handleSelect = (name: string) => {
        const newActive = activeSensor === name ? null : name;
        setActiveSensor(newActive);
        onSelectSensor(newActive);

        if (name === 'windVane') setRotations(prev => ({ ...prev, windVane: !prev.windVane }));
        if (name === 'anemometer') setRotations(prev => ({ ...prev, anemometer: !prev.anemometer }));
    };

    return (
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
            <PerspectiveCamera makeDefault position={[6, 5, 12]} fov={30} />
            <OrbitControls
                enablePan={false}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2.1}
                minDistance={5}
                maxDistance={20}
                makeDefault
                autoRotate={!activeSensor}
                autoRotateSpeed={0.5}
            />

            <ambientLight intensity={0.9} />
            <spotLight position={[15, 20, 15]} angle={0.3} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-15, 10, -10]} intensity={1} color="#2ECC71" />

            <group position={[0, -0.5, 0]} scale={0.9}>
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                    {/* Ground / Base Board */}
                    <BaseBoard isActive={activeSensor === 'board'} onClick={() => handleSelect('board')} />

                    {/* Main Pipe Structure */}
                    <Structure />

                    {/* Sensors */}
                    <WindVane
                        position={[-2.5, 3, 0]}
                        isActive={activeSensor === 'windVane'}
                        isRotating={rotations.windVane}
                        onClick={() => handleSelect('windVane')}
                    />

                    <Anemometer
                        position={[2.5, 3, 0]}
                        isActive={activeSensor === 'anemometer'}
                        isRotating={rotations.anemometer}
                        onClick={() => handleSelect('anemometer')}
                    />

                    <RainGauge
                        position={[-1.8, 0.4, 1.2]}
                        isActive={activeSensor === 'rainGauge'}
                        onClick={() => handleSelect('rainGauge')}
                    />

                    <Controller
                        position={[0.8, 0.2, -0.2]}
                        isActive={activeSensor === 'controller'}
                        onClick={() => handleSelect('controller')}
                    />

                    <LCD
                        position={[0, 0.2, 1.5]}
                        isActive={activeSensor === 'lcd'}
                        onClick={() => handleSelect('lcd')}
                    />

                    <SolarPanel
                        position={[1.8, 0.2, 1.2]}
                        isActive={activeSensor === 'solarPanel'}
                        onClick={() => handleSelect('solarPanel')}
                    />

                    <SoilMoisture
                        position={[3.8, 0.2, 1.5]}
                        isActive={activeSensor === 'soilSensor'}
                        onClick={() => handleSelect('soilSensor')}
                    />

                    {/* Interactive labels */}
                    <SensorLabel position={[-2.5, 4.6, 0]} label="Wind Direction" onClick={() => handleSelect('windVane')} active={activeSensor === 'windVane'} />
                    <SensorLabel position={[2.5, 4.6, 0]} label="Wind Speed" onClick={() => handleSelect('anemometer')} active={activeSensor === 'anemometer'} />
                    <SensorLabel position={[-1.8, 1.8, 1.2]} label="Rainfall Gauge" onClick={() => handleSelect('rainGauge')} active={activeSensor === 'rainGauge'} />
                    <SensorLabel position={[0.8, 1.0, -0.2]} label="ESP32 Brain" onClick={() => handleSelect('controller')} active={activeSensor === 'controller'} />
                    <SensorLabel position={[0, 1.0, 1.5]} label="Status Display" onClick={() => handleSelect('lcd')} active={activeSensor === 'lcd'} />
                    <SensorLabel position={[1.8, 1.0, 2.2]} label="Solar Array" onClick={() => handleSelect('solarPanel')} active={activeSensor === 'solarPanel'} />
                    <SensorLabel position={[3.8, 2.2, 1.5]} label="Soil Probe" onClick={() => handleSelect('soilSensor')} active={activeSensor === 'soilSensor'} />
                </Float>
            </group>

            <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={25} blur={2.5} far={5} />
            <Environment preset="city" />
        </Canvas>
    );
}

function SensorLabel({ position, label, onClick, active }: { position: [number, number, number], label: string, onClick: () => void, active: boolean }) {
    return (
        <Html position={position} center distanceFactor={10}>
            <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                style={{
                    padding: '6px 16px',
                    background: active ? '#2ECC71' : 'rgba(15, 23, 42, 0.85)',
                    color: 'white',
                    border: active ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '40px',
                    fontSize: '12px',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    backdropFilter: 'blur(15px)',
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: active ? 'scale(1.1) translateY(-10px)' : 'scale(1)',
                    boxShadow: active
                        ? '0 15px 30px -8px rgba(46,204,113,0.7), 0 0 20px rgba(255,255,255,0.4)'
                        : '0 8px 25px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: active ? 'white' : '#2ECC71',
                    boxShadow: active ? '0 0 10px white' : '0 0 10px #2ECC71',
                }} />
                {label}
            </button>
        </Html>
    );
}

function BaseBoard({ isActive, onClick }: SensorComponentProps) {
    return (
        <mesh position={[0, 0, 0.5]} receiveShadow onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <boxGeometry args={[7.5, 0.3, 5]} />
            <meshStandardMaterial color={isActive ? "#fcd34d" : "#B08D57"} roughness={0.6} metalness={0.2} />
        </mesh>
    );
}

function Structure() {
    return (
        <group>
            {/* Main vertical pole */}
            <mesh position={[0, 1.5, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 3]} />
                <meshStandardMaterial color="#D1D5DB" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Base flange */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.1]} />
                <meshStandardMaterial color="#9CA3AF" metalness={1} />
            </mesh>
            {/* Horizontal bar */}
            <mesh position={[0, 3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 6]} />
                <meshStandardMaterial color="#D1D5DB" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* T-junction */}
            <mesh position={[0, 3, 0]}>
                <sphereGeometry args={[0.22]} />
                <meshStandardMaterial color="#9CA3AF" metalness={1} />
            </mesh>
            {/* End collars */}
            <mesh position={[-2.5, 3, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.18, 0.18, 0.4]} />
                <meshStandardMaterial color="#9CA3AF" />
            </mesh>
            <mesh position={[2.5, 3, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.18, 0.18, 0.4]} />
                <meshStandardMaterial color="#9CA3AF" />
            </mesh>
        </group>
    );
}

function WindVane({ position, isActive, isRotating, onClick }: RotatingSensorProps) {
    const group = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (isRotating && group.current) {
            group.current.rotation.y += delta * 1.5;
        }
    });

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Base for vane */}
            <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.6]} />
                <meshStandardMaterial color={isActive ? "#60a5fa" : "#F9FAFB"} metalness={0.5} roughness={0.2} />
            </mesh>
            <Text position={[0, -0.2, 0.36]} fontSize={0.3} color="#1d4ed8" fontWeight="bold">N</Text>

            {/* Rotating part */}
            <group ref={group}>
                <mesh position={[0, 0.3, 0]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.6]} />
                    <meshStandardMaterial color="#F3F4F6" />
                </mesh>
                {/* Arrow shaft */}
                <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 1.2]} />
                    <meshStandardMaterial color="#111827" />
                </mesh>
                {/* Arrow head */}
                <mesh position={[0, 0.6, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.12, 0.3, 8]} />
                    <meshStandardMaterial color="#111827" />
                </mesh>
                {/* Arrow fin */}
                <mesh position={[0, 0.8, -0.6]}>
                    <boxGeometry args={[0.04, 0.5, 0.5]} />
                    <meshStandardMaterial color="#111827" />
                </mesh>
            </group>
        </group>
    );
}

function Anemometer({ position, isActive, isRotating, onClick }: RotatingSensorProps) {
    const group = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (isRotating && group.current) {
            group.current.rotation.y += delta * 6;
        }
    });

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.6]} />
                <meshStandardMaterial color={isActive ? "#60a5fa" : "#F9FAFB"} metalness={0.5} roughness={0.2} />
            </mesh>

            <group ref={group} position={[0, 0.4, 0]}>
                <mesh>
                    <cylinderGeometry args={[0.25, 0.25, 0.4]} />
                    <meshStandardMaterial color="#F3F4F6" />
                </mesh>

                {/* 3 Cups */}
                {[0, 1, 2].map((i) => (
                    <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
                        <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.05, 0.05, 1.2]} />
                            <meshStandardMaterial color="#374151" />
                        </mesh>
                        <mesh position={[1.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <sphereGeometry args={[0.3, 32, 32, 0, Math.PI]} />
                            <meshStandardMaterial color="#FFFFFF" side={THREE.DoubleSide} roughness={0.05} />
                        </mesh>
                    </group>
                ))}
            </group>
        </group>
    );
}

function RainGauge({ position, isActive, onClick }: SensorComponentProps) {
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Main body */}
            <mesh castShadow>
                <cylinderGeometry args={[0.6, 0.6, 1.2, 32]} />
                <meshStandardMaterial color={isActive ? "#60a5fa" : "#FDFDFD"} metalness={0.05} roughness={0.1} />
            </mesh>
            {/* Funnel top */}
            <mesh position={[0, 0.65, 0]} castShadow>
                <cylinderGeometry args={[0.7, 0.6, 0.3, 32]} />
                <meshStandardMaterial color="#F9FAFB" />
            </mesh>
            {/* Inside look */}
            <mesh position={[0, 0.75, 0]}>
                <cylinderGeometry args={[0.65, 0.65, 0.02, 32]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
        </group>
    );
}

function Controller({ position, isActive, onClick }: SensorComponentProps) {
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* PCB */}
            <mesh castShadow>
                <boxGeometry args={[1, 0.1, 1.2]} />
                <meshStandardMaterial color={isActive ? "#4ade80" : "#1B4332"} roughness={0.4} />
            </mesh>
            {/* Components */}
            <mesh position={[0.25, 0.2, 0.25]}>
                <boxGeometry args={[0.4, 0.25, 0.4]} />
                <meshStandardMaterial color="#0F172A" />
            </mesh>
            <mesh position={[-0.25, 0.2, -0.35]}>
                <boxGeometry args={[0.3, 0.25, 0.5]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {/* LED Status */}
            <mesh position={[-0.3, 0.2, 0.3]}>
                <sphereGeometry args={[0.06]} />
                <meshStandardMaterial color="#2ECC71" emissive="#2ECC71" emissiveIntensity={4} />
            </mesh>
        </group>
    );
}

function LCD({ position, isActive, onClick }: SensorComponentProps) {
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Case */}
            <mesh castShadow>
                <boxGeometry args={[1.6, 0.4, 0.9]} />
                <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.22, 0]}>
                <boxGeometry args={[1.3, 0.05, 0.65]} />
                <meshStandardMaterial
                    color={isActive ? "#2ECC71" : "#2563EB"}
                    emissive={isActive ? "#2ECC71" : "#1D4ED8"}
                    emissiveIntensity={isActive ? 5 : 2}
                />
            </mesh>
            <Text position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.1} color="white" fontWeight="900">
                PRO-STATUS: 100%
            </Text>
        </group>
    );
}

function SolarPanel({ position, isActive, onClick }: SensorComponentProps) {
    return (
        <group position={position} rotation={[-0.35, 0, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Frame */}
            <mesh castShadow>
                <boxGeometry args={[1.8, 0.12, 1.8]} />
                <meshStandardMaterial color="#1F2937" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Cells */}
            <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[1.65, 0.02, 1.65]} />
                <meshStandardMaterial
                    color={isActive ? "#60A5FA" : "#0F172A"}
                    metalness={1}
                    roughness={0.05}
                />
            </mesh>
            {/* Grid lines */}
            <group position={[0, 0.12, 0]}>
                {[-0.5, -0.25, 0, 0.25, 0.5].map(x => (
                    <mesh key={`h-${x}`} position={[x, 0, 0]}>
                        <boxGeometry args={[0.015, 0.015, 1.65]} />
                        <meshStandardMaterial color="#475569" />
                    </mesh>
                ))}
                {[-0.5, -0.25, 0, 0.25, 0.5].map(z => (
                    <mesh key={`v-${z}`} position={[0, 0, z]}>
                        <boxGeometry args={[1.65, 0.015, 0.015]} />
                        <meshStandardMaterial color="#475569" />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

function SoilMoisture({ position, isActive, onClick }: SensorComponentProps) {
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Soil patch */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.2, 64]} />
                <meshStandardMaterial color="#302015" roughness={1} />
            </mesh>
            {/* Soil displacement */}
            <mesh position={[0, 0.08, 0]}>
                <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#402D20" roughness={1} />
            </mesh>
            {/* Sensor handle */}
            <mesh position={[0, 1.3, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 1]} />
                <meshStandardMaterial color={isActive ? "#60a5fa" : "#1E293B"} roughness={0.2} metalness={0.3} />
            </mesh>
            {/* Probe */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 1.8]} />
                <meshStandardMaterial color="#F3F4F6" metalness={1} roughness={0} />
            </mesh>
        </group>
    );
}
