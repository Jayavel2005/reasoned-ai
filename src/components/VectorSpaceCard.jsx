import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html, Line, Grid, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { BentoCard } from "./BentoGrid";

const clusters = [
    { id: "finance", label: "Finance", color: "#22C55E", center: [2, 1, 0] },
    { id: "tech", label: "Tech", color: "#6366F1", center: [-2, 0.5, 1] },
    { id: "legal", label: "Legal", color: "#EF4444", center: [0, -1, -2] },
];

function Scene() {
    const points = useMemo(() => {
        const p = [];
        clusters.forEach(cluster => {
            const count = 10;
            for (let i = 0; i < count; i++) {
                p.push({
                    id: `${cluster.id}-${i}`,
                    position: [
                        cluster.center[0] + (Math.random() - 0.5) * 3,
                        cluster.center[1] + (Math.random() - 0.5) * 2,
                        cluster.center[2] + (Math.random() - 0.5) * 3,
                    ],
                    color: cluster.color,
                })
            }
        });
        return p;
    }, []);

    // Create lines
    const lines = useMemo(() => {
        const l = [];
        points.forEach((p1, i) => {
            points.slice(i + 1).forEach(p2 => {
                const dist = new THREE.Vector3(...p1.position).distanceTo(new THREE.Vector3(...p2.position));
                if (dist < 2) {
                    l.push({ start: p1.position, end: p2.position, color: p1.color, opacity: (2 - dist) / 4 });
                }
            })
        });
        return l;
    }, [points]);

    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Grid args={[20, 20]} cellSize={0.5} cellThickness={0.5} cellColor="#374151" sectionSize={2.5} sectionColor="#4B5563" fadeDistance={25} position={[0, -2, 0]} />

            <group>
                {points.map((pt) => (
                    <Float key={pt.id} speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                        <mesh position={pt.position} scale={0.7}>
                            <sphereGeometry args={[0.08, 32, 32]} />
                            <meshStandardMaterial color={pt.color} emissive={pt.color} emissiveIntensity={2} toneMapped={false} />
                        </mesh>
                    </Float>
                ))}
            </group>

            <group>
                {lines.map((l, i) => (
                    <Line key={i} points={[l.start, l.end]} color={l.color} transparent opacity={l.opacity} lineWidth={1} />
                ))}
            </group>

            <Sparkles count={40} scale={15} size={2} color="#fff" opacity={0.2} />
        </>
    );
}

export default function VectorSpaceCard({ className }) {
    return (
        <BentoCard className={className} title="Vector Memory Space">
            <div className="w-full h-full relative bg-ai-panel/30">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_10%,_rgba(11,15,23,0.5)_100%)] pointer-events-none" />
                <Canvas camera={{ position: [5, 4, 8], fov: 45 }}>
                    <Scene />
                    <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={true} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={4} maxDistance={15} />
                </Canvas>

                <div className="absolute bottom-4 right-4 flex gap-4 pointer-events-none">
                    {clusters.map(c => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-1 bg-ai-bg/60 rounded-full border border-ai-border/50 text-xs backdrop-blur-sm">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-ai-text-secondary">{c.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </BentoCard>
    );
}
