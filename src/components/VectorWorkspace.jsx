import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html, Line, Sparkles, Grid } from "@react-three/drei";
import * as THREE from "three";

// Simulated Semantic Clusters
const clusters = [
    { id: "finance", label: "Financial_Report", color: "#22C55E", center: [2, 1, 0] },
    { id: "tech", label: "Sys_Architecture", color: "#6366F1", center: [-2, 0.5, 1] },
    { id: "legal", label: "Compliance_SOP", color: "#EF4444", center: [0, -1, -2] },
];

function DataPoint({ position, color, label, setHoveredGlobal }) {
    const mesh = useRef();
    const [hovered, setHover] = useState(false);

    useFrame((state) => {
        if (mesh.current) {
            // Breathing scale animation
            const scale = hovered ? 1.5 : 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
            mesh.current.scale.setScalar(scale);
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh
                ref={mesh}
                position={position}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHover(true);
                    setHoveredGlobal(label);
                }}
                onPointerOut={() => {
                    setHover(false);
                    setHoveredGlobal(null);
                }}
            >
                <sphereGeometry args={[0.06, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 3 : 1.5}
                    toneMapped={false}
                />
                {hovered && (
                    <Html distanceFactor={6}>
                        <div className="bg-ai-panel/90 backdrop-blur-md border border-ai-accent/30 px-3 py-2 rounded-lg text-xs text-ai-text-primary whitespace-nowrap shadow-[0_0_15px_rgba(0,0,0,0.5)] transform -translate-y-10 pointer-events-none select-none z-50">
                            <div className="font-bold text-ai-accent mb-0.5">{label}</div>
                            <div className="text-[9px] text-ai-text-secondary font-mono flex flex-col gap-0.5">
                                <span>VEC: [{position[0].toFixed(2)}, {position[2].toFixed(2)}]</span>
                                <span>CONF: {(0.8 + Math.random() * 0.2).toFixed(4)}</span>
                            </div>
                        </div>
                    </Html>
                )}
            </mesh>
        </Float>
    );
}

function DataConnections({ points }) {
    const lines = useMemo(() => {
        const l = [];
        // Connect proximate points
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const p1 = new THREE.Vector3(...points[i].position);
                const p2 = new THREE.Vector3(...points[j].position);
                const dist = p1.distanceTo(p2);

                if (dist < 1.8) {
                    l.push({
                        start: points[i].position,
                        end: points[j].position,
                        opacity: Math.max(0.02, (1.8 - dist) / 1.8) * 0.4,
                        color: points[i].color
                    })
                }
            }
        }
        return l;
    }, [points]);

    return (
        <group>
            {lines.map((line, i) => (
                <Line
                    key={i}
                    points={[line.start, line.end]}
                    color={line.color}
                    transparent
                    opacity={line.opacity}
                    lineWidth={1}
                />
            ))}
        </group>
    )
}

function Scene({ setHoveredGlobal }) {
    const points = useMemo(() => {
        const p = [];
        clusters.forEach(cluster => {
            const count = 6 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                p.push({
                    id: `${cluster.id}-${i}`,
                    position: [
                        cluster.center[0] + (Math.random() - 0.5) * 3,
                        cluster.center[1] + (Math.random() - 0.5) * 2,
                        cluster.center[2] + (Math.random() - 0.5) * 3,
                    ],
                    color: cluster.color,
                    label: `${cluster.label}_${i + 1}`
                })
            }
        });
        return p;
    }, []);

    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -5, -10]} intensity={0.5} color="#6366F1" />

            {/* High-tech Grid Floor */}
            <Grid
                position={[0, -2, 0]}
                args={[20, 20]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#374151"
                sectionSize={2.5}
                sectionThickness={1}
                sectionColor="#4B5563"
                fadeDistance={25}
                fadeStrength={1}
            />

            <DataConnections points={points} />

            <group>
                {points.map((pt) => (
                    <DataPoint key={pt.id} {...pt} setHoveredGlobal={setHoveredGlobal} />
                ))}
            </group>
            {/* Background Ambience */}
            <Sparkles count={50} scale={15} size={2} speed={0.2} opacity={0.15} color="#ffffff" />
        </>
    );
}

export default function VectorWorkspace() {
    const [hoveredLabel, setHoveredGlobal] = useState(null);

    return (
        <div className="w-full h-full relative overflow-hidden bg-ai-panel/30 border-b border-ai-border group shadow-inner">
            {/* Radial Gradient overlay for depth */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_10%,_rgba(11,15,23,0.5)_100%)] pointer-events-none" />

            <Canvas camera={{ position: [6, 4, 8], fov: 45 }} dpr={[1, 2]}>
                <Scene setHoveredGlobal={setHoveredGlobal} />
                <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    autoRotate={true}
                    autoRotateSpeed={0.3}
                    maxPolarAngle={Math.PI / 2 - 0.1}
                    minDistance={4}
                    maxDistance={20}
                    target={[0, 0, 0]}
                />
            </Canvas>

            {/* Overlay UI */}
            <div className="absolute top-4 left-4 pointer-events-none z-10 flex flex-col gap-1">
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-ai-bg/60 border border-ai-border/50 backdrop-blur-sm w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-ai-accent animate-pulse" />
                    <span className="text-[10px] font-mono text-ai-text-secondary uppercase tracking-widest">
                        3D COGNITIVE FIELD
                    </span>
                </div>
                <div className="text-[8px] font-mono text-ai-text-secondary opacity-60 ml-1">
                    NAVIGATE: DRAG TO ROTATE • SCROLL TO ZOOM
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-ai-bg/60 backdrop-blur-md border border-ai-border/50 px-3 py-2 rounded-lg pointer-events-none z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                    {clusters.map(cluster => (
                        <div key={cluster.id} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: cluster.color }} />
                            <span className="text-[9px] text-ai-text-secondary font-mono tracking-tight">{cluster.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Global Status Overlay (if hovered) */}
            {hoveredLabel && (
                <div className="absolute top-4 right-4 bg-ai-accent/10 backdrop-blur border border-ai-accent/30 px-3 py-1 rounded pointer-events-none" >
                    <span className="text-[10px] font-mono text-ai-accent tracking-tighter animate-pulse">
                        LOCK_ON: {hoveredLabel}
                    </span>
                </div>
            )}
        </div>
    );
}
