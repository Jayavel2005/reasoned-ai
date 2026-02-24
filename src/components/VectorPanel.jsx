import { useRef, useMemo, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Line, Sparkles, Grid } from "@react-three/drei";
import { Maximize2, Bot, Loader2, X } from "lucide-react";
import * as THREE from "three";
import { gsap } from "gsap";
import useCognitiveStore from "../store/useCognitiveStore";

/* ──────────────────────────────────────────────────────────────────────
   3D SCENE COMPONENTS
────────────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────
   3D SCENE COMPONENTS
   ────────────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────
   SCAN RING — pulsing toroidal wave that radiates during retrieval
────────────────────────────────────────────────────────────────────── */
function ScanRing({ isScanning }) {
    const meshRef = useRef();
    const matRef = useRef();
    // Animate: expand from radius 0 → 180, fade opacity, loop while scanning
    useFrame((state) => {
        if (!meshRef.current || !matRef.current) return;
        if (!isScanning) {
            matRef.current.opacity = 0;
            return;
        }
        const t = (state.clock.elapsedTime * 0.55) % 1.0;
        const r = t * 190;
        meshRef.current.scale.setScalar(r / 3.5);
        // Fade: bright at 0.1, transparent at 1.0
        matRef.current.opacity = Math.max(0, (1 - t) * 0.55 * Math.min(t * 8, 1));
    });
    return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3.5, 0.18, 8, 80]} />
            <meshStandardMaterial
                ref={matRef}
                color="#00F0FF"
                emissive="#00F0FF"
                emissiveIntensity={4}
                transparent
                opacity={0}
                toneMapped={false}
                depthWrite={false}
            />
        </mesh>
    );
}

/* Second ring at offset phase */
function ScanRing2({ isScanning }) {
    const meshRef = useRef();
    const matRef = useRef();
    useFrame((state) => {
        if (!meshRef.current || !matRef.current) return;
        if (!isScanning) { matRef.current.opacity = 0; return; }
        const t = ((state.clock.elapsedTime * 0.55) + 0.45) % 1.0;
        const r = t * 190;
        meshRef.current.scale.setScalar(r / 3.5);
        matRef.current.opacity = Math.max(0, (1 - t) * 0.45 * Math.min(t * 8, 1));
    });
    return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3.5, 0.12, 8, 80]} />
            <meshStandardMaterial
                ref={matRef}
                color="#BD00FF"
                emissive="#BD00FF"
                emissiveIntensity={3}
                transparent
                opacity={0}
                toneMapped={false}
                depthWrite={false}
            />
        </mesh>
    );
}

function DataPoint({ node, isSelected, isSelectionActive, queryVector, onSelect, onHover, isScanning }) {
    const mesh = useRef();
    const material = useRef();
    const [hovered, setHovered] = useState(false);
    // Each node gets a random scan phase so the wave ripples across the field
    const scanPhaseOffset = useMemo(() => Math.random() * Math.PI * 2, []);

    // Initial and Default sizes
    const baseScale = 0.75;
    const selectedScale = baseScale * 1.45;

    useLayoutEffect(() => {
        if (!mesh.current || !material.current) return;

        const ctx = gsap.context(() => {
            // 1. Opacity Control
            let targetOpacity = 0.75;
            if (isSelectionActive) {
                targetOpacity = isSelected ? 1.0 : 0.35;
            }

            if (material.current) {
                gsap.to(material.current, {
                    opacity: targetOpacity,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }

            // 2. Magnetic Pull
            if (isSelected && queryVector && mesh.current) {
                const targetPos = [
                    node.position[0] + (queryVector[0] - node.position[0]) * 0.05,
                    node.position[1] + (queryVector[1] - node.position[1]) * 0.05,
                    node.position[2] + (queryVector[2] - node.position[2]) * 0.05
                ];

                // Animate pull
                gsap.to(mesh.current.position, {
                    x: targetPos[0],
                    y: targetPos[1],
                    z: targetPos[2],
                    duration: 0.6,
                    ease: "power2.out",
                    onComplete: () => {
                        // Resettle
                        if (mesh.current) {
                            gsap.to(mesh.current.position, {
                                x: node.position[0],
                                y: node.position[1],
                                z: node.position[2],
                                duration: 0.4,
                                ease: "power2.inOut",
                                delay: 0.5
                            });
                        }
                    }
                });
            } else if (mesh.current) {
                // Return to base if not selected
                gsap.to(mesh.current.position, {
                    x: node.position[0],
                    y: node.position[1],
                    z: node.position[2],
                    duration: 0.4,
                    ease: "power2.out"
                });
            }

            // 3. Scale
            if (mesh.current) {
                const targetScale = isSelected ? selectedScale : baseScale;
                const finalScale = hovered ? targetScale * 1.1 : targetScale;

                gsap.to(mesh.current.scale, {
                    x: finalScale,
                    y: finalScale,
                    z: finalScale,
                    duration: 0.2,
                    ease: "power2.out"
                });
            }
        });

        return () => ctx.revert();
    }, [isSelected, isSelectionActive, queryVector, hovered, node.position, baseScale, selectedScale]);

    useFrame((state) => {
        if (!mesh.current || !material.current) return;

        if (isScanning) {
            // Rolling wave: each node lights up at a different phase
            const wave = Math.sin(state.clock.elapsedTime * 3.5 + scanPhaseOffset);
            const scanEmissive = Math.max(0, wave) * 6 + 1.0;
            material.current.emissiveIntensity = scanEmissive;
            // Scale breathe during scan
            const breathe = 1 + Math.abs(Math.sin(state.clock.elapsedTime * 2.8 + scanPhaseOffset)) * 0.25;
            mesh.current.scale.setScalar(baseScale * breathe);
        } else {
            // Normal subtle pulse
            const pulseAmount = isSelected ? 0.08 : 0.03;
            const pulseFreq = isSelected ? 4 : 1.5;
            const s = 1 + Math.sin(state.clock.elapsedTime * pulseFreq) * pulseAmount;
            const base = hovered ? 1.1 : 1.0;
            mesh.current.scale.setScalar((isSelected ? selectedScale : baseScale) * s * base);
            // Restore normal emissive
            const targetEmissive = isSelected ? (hovered ? 7 : 5) : (hovered ? 3 : 1.8);
            material.current.emissiveIntensity += (targetEmissive - material.current.emissiveIntensity) * 0.1;
        }
    });

    return (
        <mesh
            ref={mesh}
            position={node.position}
            onClick={(e) => { e.stopPropagation(); onSelect(node); }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                onHover(node);
            }}
            onPointerOut={() => {
                setHovered(false);
                onHover(null);
            }}
        >
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial
                ref={material}
                color={node.color || "#00F0FF"}
                emissive={node.color || "#00F0FF"}
                emissiveIntensity={isSelected ? (hovered ? 7 : 5) : (hovered ? 3 : 1.8)}
                transparent
                opacity={0.75}
                toneMapped={false}
            />
        </mesh>
    );
}

function QueryNode({ position }) {
    if (!position) return null;
    const mesh = useRef();
    const group = useRef();

    useLayoutEffect(() => {
        if (!group.current) return;

        const ctx = gsap.context(() => {
            if (group.current) {
                gsap.fromTo(group.current.scale,
                    { x: 0, y: 0, z: 0 },
                    { x: 1, y: 1, z: 1, duration: 0.4, ease: "power3.out" }
                );
            }
        });

        return () => ctx.revert();
    }, [position]);

    useFrame((state) => {
        if (mesh.current) {
            const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
            mesh.current.scale.setScalar(s);
        }
    });

    return (
        <group ref={group} position={position}>
            <mesh ref={mesh}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial
                    color="#00F0FF"
                    emissive="#00F0FF"
                    emissiveIntensity={8}
                    toneMapped={false}
                    transparent
                    opacity={1.0}
                />
            </mesh>
            {/* Outer Glow / Halo (Part 4) */}
            <mesh scale={2.4}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial
                    color="#00F0FF"
                    transparent
                    opacity={0.15}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}

function ProgressiveLine({ start, end, color }) {
    const [progress, setProgress] = useState(0);
    const lineContainerRef = useRef(null);

    useLayoutEffect(() => {
        if (!lineContainerRef.current) return undefined;

        const tweenState = { p: 0 };
        const ctx = gsap.context(() => {
            gsap.fromTo(
                tweenState,
                { p: 0 },
                {
                    p: 1,
                    duration: 0.5,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        setProgress(tweenState.p);
                    },
                }
            );
        });

        return () => ctx.revert();
    }, [start, end]);

    const currentEnd = [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
        start[2] + (end[2] - start[2]) * progress
    ];

    return (
        <group ref={lineContainerRef}>
            <Line
                points={[start, currentEnd]}
                color={color}
                lineWidth={1.2}
                transparent
                opacity={0.4 * progress}
            />
        </group>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   COLOR LEGEND — doc_type labels with swatches
────────────────────────────────────────────────────────────────────── */
const DOC_TYPE_LEGEND = [
    { label: "SOP", color: "#00F0FF", key: "Standard_Operating_Procedure" },
    { label: "Maintenance", color: "#9D4EDD", key: "Maintenance_Manual" },
    { label: "Fault Log", color: "#FF4D6D", key: "Historical_Fault_Log" },
    { label: "Rulebook", color: "#FFD60A", key: "Equipment_Rulebook" },
    { label: "Data Log", color: "#06D6A0", key: "Continuous_Data_Log" },
];

function ColorLegend() {
    return (
        <div style={{
            position: "absolute", bottom: 16, left: 16, zIndex: 10,
            display: "flex", flexDirection: "column", gap: 5,
            pointerEvents: "none",
        }}>
            {DOC_TYPE_LEGEND.map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 8,
                        color: "rgba(200,212,225,0.55)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                    }}>{label}</span>
                </div>
            ))}
        </div>
    );
}

function Scene({ nodes, queryVector, selectedChunkIds, onNodeSelect, onHover, isScanning }) {
    const isSelectionActive = selectedChunkIds.length > 0;

    return (
        <>
            <ambientLight intensity={isScanning ? 0.9 : 0.6} />
            <pointLight position={[20, 30, 20]} intensity={isScanning ? 3.5 : 2.0} color="#BD00FF" />
            <pointLight position={[-20, -30, -20]} intensity={isScanning ? 3.5 : 2.0} color="#00F0FF" />
            <pointLight position={[0, 60, 0]} intensity={isScanning ? 2.0 : 1.0} color="#ffffff" />

            <Grid
                position={[0, -55, 0]} args={[400, 400]}
                cellSize={20} cellThickness={0.8}
                cellColor="#00f0ff"
                sectionSize={100} sectionThickness={1.5}
                sectionColor="#bd00ff"
                fadeDistance={500} fadeStrength={1}
            />

            {/* Scan rings — only visible during retrieval */}
            <ScanRing isScanning={isScanning} />
            <ScanRing2 isScanning={isScanning} />

            {/* Context Lines (Progressive) */}
            {queryVector && selectedChunkIds.map(id => {
                const node = nodes.find(n => n.id === id);
                if (!node) return null;
                return (
                    <ProgressiveLine
                        key={`line-${id}`}
                        start={queryVector}
                        end={node.position}
                        color="#00F0FF"
                    />
                );
            })}

            {/* Query Node */}
            <QueryNode position={queryVector} />

            {/* Document Chunks */}
            {nodes.map(n => (
                <DataPoint
                    key={n.id}
                    node={n}
                    isSelected={selectedChunkIds.includes(n.id)}
                    isSelectionActive={isSelectionActive}
                    queryVector={queryVector}
                    onSelect={onNodeSelect}
                    onHover={onHover}
                    isScanning={isScanning}
                />
            ))}

            <Sparkles
                count={isScanning ? 400 : 200}
                scale={300}
                size={isScanning ? 2.5 : 1.5}
                speed={isScanning ? 0.55 : 0.15}
                opacity={isScanning ? 0.35 : 0.15}
                color={isScanning ? "#00F0FF" : "#ffffff"}
            />
        </>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   HOVER TOOLTIP (Part 3)
   ────────────────────────────────────────────────────────────────────── */
function HoverTooltip({ node, score, mouseX, mouseY }) {
    const ref = useRef();

    useLayoutEffect(() => {
        if (!node || !ref.current) return undefined;

        const ctx = gsap.context(() => {
            if (ref.current) {
                gsap.fromTo(ref.current,
                    { opacity: 0, y: 6 },
                    { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }
                );
            }
        }, ref.current);

        return () => ctx.revert();
    }, [node]);

    if (!node) return null;

    return (
        <div
            ref={ref}
            style={{
                position: "fixed",
                pointerEvents: "none",
                background: "rgba(9, 11, 17, 0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "12px 14px",
                width: 280,
                zIndex: 10000,
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                backdropFilter: "blur(12px)",
                transform: `translate(20px, -50%)`,
                left: mouseX,
                top: mouseY,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                <span style={{
                    fontFamily: "'IBM Plex Mono'",
                    fontSize: 8,
                    color: node.color,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    background: `${node.color}15`,
                    padding: "2px 6px",
                    borderRadius: 4
                }}>
                    {node.category}
                </span>
                {typeof score === "number" && score > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, color: "rgba(255,255,255,0.4)" }}>SIM:</span>
                        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 9, color: "#00FFA3", fontWeight: 700 }}>
                            {score.toFixed(4)}
                        </span>
                    </div>
                )}
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
                {node.documentName}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 8.5, color: "rgba(148,163,184,0.4)", marginBottom: 10 }}>
                # {node.chunkId} — FRAGMENT_ID: {node.id.split('-').pop()}
            </div>
            <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.7)",
                lineHeight: 1.5, margin: 0,
                borderLeft: `2px solid ${node.color}50`, paddingLeft: 10,
                background: "rgba(255,255,255,0.03)",
                padding: "8px 10px",
                borderRadius: "0 6px 6px 0"
            }}>
                "{node.textPreview}..."
            </p>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   NODE INSPECTOR (floats inside canvas area)
   ────────────────────────────────────────────────────────────────────── */
function NodeInspector({ node, loading, onClose }) {
    if (!node) return null;
    return (
        <div style={{
            position: "absolute", top: 60, right: 16, width: 300,
            background: "rgba(9, 11, 17, 0.98)",
            border: "1px solid rgba(0,240,255,0.2)",
            borderRadius: 16, padding: 20,
            display: "flex", flexDirection: "column", gap: 12,
            zIndex: 20, pointerEvents: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
            backdropFilter: "blur(14px)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 10px #00F0FF" }} />
                    <span style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        textTransform: "uppercase",
                        letterSpacing: "0.15em"
                    }}>
                        Vector Fragment
                    </span>
                </div>
                <button onClick={onClose} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(148,163,184,0.6)",
                    padding: 6,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center"
                }}>
                    <X size={12} />
                </button>
            </div>

            <div style={{
                fontFamily: "'IBM Plex Mono'",
                fontSize: 10,
                color: "rgba(148,163,184,0.8)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6
            }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>DOCUMENT</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{node.documentName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>CATEGORY</span>
                    <span style={{ color: node.color, fontWeight: 700 }}>{node.category.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>COORDINATES</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        {node.position[0].toFixed(1)}, {node.position[1].toFixed(1)}, {node.position[2].toFixed(1)}
                    </span>
                </div>
            </div>

            <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.85)",
                lineHeight: 1.6, background: "rgba(255,255,255,0.03)",
                padding: "12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.05)", margin: 0,
                fontStyle: "italic"
            }}>
                {loading ? "Synthesizing vector data…" : `"${node.textPreview}"`}
            </p>

            <button style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "10px 16px", borderRadius: 10,
                border: "1px solid rgba(0,240,255,0.2)", background: "rgba(0,240,255,0.1)",
                color: "#00F0FF", fontFamily: "'Outfit', sans-serif", fontSize: 11,
                fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
                transition: "all 0.2s ease"
            }}>
                <Bot size={14} /> Analyze Segment
            </button>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   CANVAS CONTENT (shared between inline & modal)
   ────────────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────
   RETRIEVAL HUD — shown during chat query processing
────────────────────────────────────────────────────────────────────── */
const RETRIEVAL_PHASES = [
    { label: "EMBEDDING QUERY", color: "#BD00FF", bg: "rgba(189,0,255,0.08)", border: "rgba(189,0,255,0.28)" },
    { label: "VECTOR SEARCH", color: "#00F0FF", bg: "rgba(0,240,255,0.08)", border: "rgba(0,240,255,0.28)" },
    { label: "RANKING CONTEXT", color: "#00FFA3", bg: "rgba(0,255,163,0.07)", border: "rgba(0,255,163,0.25)" },
    { label: "SYNTHESISING ANSWER", color: "#FFD600", bg: "rgba(255,214,0,0.07)", border: "rgba(255,214,0,0.22)" },
];

function RetrievalHUD({ isScanning }) {
    const [phase, setPhase] = useState(0);
    const [blink, setBlink] = useState(true);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isScanning) {
            setPhase(0);
            clearInterval(timerRef.current);
            return;
        }
        setPhase(0);
        timerRef.current = setInterval(() => {
            setPhase(p => (p + 1) % RETRIEVAL_PHASES.length);
        }, 900);
        return () => clearInterval(timerRef.current);
    }, [isScanning]);

    // Blink cursor
    useEffect(() => {
        const id = setInterval(() => setBlink(b => !b), 530);
        return () => clearInterval(id);
    }, []);

    if (!isScanning) return null;

    const p = RETRIEVAL_PHASES[phase];
    return (
        <div style={{
            position: "absolute", top: 62, left: 16, zIndex: 10,
            display: "flex", flexDirection: "column", gap: 6,
            pointerEvents: "none",
        }}>
            {/* Main phase badge */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: p.bg,
                border: `1px solid ${p.border}`,
                borderRadius: 7, padding: "6px 12px",
                backdropFilter: "blur(10px)",
                boxShadow: `0 0 18px ${p.color}22`,
                transition: "all 0.3s ease",
            }}>
                <Loader2
                    size={11}
                    color={p.color}
                    style={{ animation: "vp-spin 0.8s linear infinite", flexShrink: 0 }}
                />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9, letterSpacing: "0.10em",
                    color: p.color, fontWeight: 600,
                }}>
                    {p.label}
                    <span style={{ opacity: blink ? 1 : 0 }}>_</span>
                </span>
            </div>

            {/* Phase dots */}
            <div style={{ display: "flex", gap: 4, paddingLeft: 4 }}>
                {RETRIEVAL_PHASES.map((ph, i) => (
                    <div key={i} style={{
                        width: i === phase ? 14 : 5,
                        height: 5, borderRadius: 3,
                        background: i === phase ? ph.color : "rgba(255,255,255,0.12)",
                        transition: "all 0.3s ease",
                        boxShadow: i === phase ? `0 0 6px ${ph.color}` : "none",
                    }} />
                ))}
            </div>
        </div>
    );
}

function VectorCanvas({
    nodes, queryVector, selectedChunkIds, similarityScores,
    selectedNode, loadingState, onNodeSelect, isModal
}) {
    const { setSelectedNode, setHoveredChunk, hoveredChunk } = useCognitiveStore();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const isScanning = !!loadingState?.chat;

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <style>{`@keyframes vp-spin { to { transform: rotate(360deg); } }`}</style>
            <Canvas
                camera={{ position: [120, 80, 120], fov: 50 }}
                dpr={[1, 2]}
                style={{ borderRadius: isModal ? 14 : 10, background: "#05060A" }}
            >
                <Scene
                    nodes={nodes}
                    queryVector={queryVector}
                    selectedChunkIds={selectedChunkIds}
                    onNodeSelect={onNodeSelect}
                    onHover={setHoveredChunk}
                    isScanning={isScanning}
                />
                <OrbitControls
                    enableZoom enablePan
                    autoRotate={!selectedNode && !queryVector}
                    autoRotateSpeed={isScanning ? 1.8 : 0.4}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                    minDistance={30} maxDistance={500}
                    target={[0, 0, 0]} dampingFactor={0.05}
                />
            </Canvas>

            {/* Tooltip Overlay */}
            <HoverTooltip
                node={hoveredChunk}
                score={hoveredChunk ? similarityScores[hoveredChunk.id] : 0}
                mouseX={mousePos.x}
                mouseY={mousePos.y}
            />

            {/* Color Legend */}
            <ColorLegend />

            {/* Status Overlays */}
            <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10, pointerEvents: "none" }}>
                <h2 style={{
                    fontFamily: "'Outfit', sans-serif", fontSize: isModal ? 12 : 10,
                    fontWeight: 700, color: "#fff",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    display: "flex", alignItems: "center", gap: 8,
                    textShadow: isScanning ? "0 0 20px rgba(0,240,255,0.7)" : "0 0 15px rgba(0,240,255,0.4)",
                    marginBottom: 4,
                    transition: "text-shadow 0.4s",
                }}>
                    Cognitive Retrieval Field
                    <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: isScanning ? "#BD00FF" : queryVector ? "#00FFA3" : "#00F0FF",
                        boxShadow: isScanning
                            ? "0 0 14px #BD00FF, 0 0 30px #BD00FF55"
                            : `0 0 10px ${queryVector ? "#00FFA3" : "#00F0FF"}`,
                        animation: isScanning ? "vp-pulse 0.8s ease-in-out infinite alternate" : "none",
                        transition: "all 0.3s",
                    }} />
                </h2>
                <div style={{
                    display: "flex", gap: 14,
                    fontFamily: "'IBM Plex Mono'", fontSize: 8.5,
                    color: "rgba(148,163,184,0.5)",
                    letterSpacing: "0.05em",
                }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", border: "1px solid currentColor" }} />
                        MEMORIES: {nodes.length}
                    </span>
                    <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        color: isScanning ? "#BD00FF" : selectedChunkIds.length ? "#00FFA3" : "inherit",
                        transition: "color 0.3s",
                    }}>
                        <div style={{
                            width: 4, height: 4, borderRadius: "50%",
                            background: isScanning ? "#BD00FF" : selectedChunkIds.length ? "#00FFA3" : "transparent",
                            border: "1px solid currentColor",
                        }} />
                        PIPELINE: {isScanning ? "SCANNING" : selectedChunkIds.length ? "RETRIEVAL_ACTIVE" : "STANDBY"}
                    </span>
                </div>
            </div>

            {/* Retrieval phase HUD */}
            <RetrievalHUD isScanning={isScanning} />

            {/* Vectors loading (index refresh) */}
            {loadingState?.vectors && !isScanning && (
                <div style={{
                    position: "absolute", top: 62, left: 16, zIndex: 10,
                    display: "flex", alignItems: "center", gap: 10,
                    fontFamily: "'IBM Plex Mono'", fontSize: 9.5, color: "#00F0FF",
                    background: "rgba(13,16,23,0.9)", border: "1px solid rgba(0,240,255,0.3)",
                    borderRadius: 8, padding: "6px 12px",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(8px)",
                }}>
                    <Loader2 size={12} style={{ animation: "vp-spin 1s linear infinite" }} />
                    SYNCING INDEX...
                </div>
            )}

            <style>{`
                @keyframes vp-pulse {
                    from { transform: scale(1); opacity: 0.8; }
                    to   { transform: scale(1.6); opacity: 1; }
                }
            `}</style>

            <NodeInspector
                node={selectedNode}
                loading={loadingState?.vectors}
                onClose={() => setSelectedNode(null)}
            />
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   MODAL OVERLAY (portal)
   ────────────────────────────────────────────────────────────────────── */
function VectorModal({ onClose, nodes, queryVector, selectedChunkIds, similarityScores, selectedNode, loadingState, onNodeSelect }) {
    const backdropRef = useRef(null);
    const cardRef = useRef(null);
    const modalScopeRef = useRef(null);
    const [isClosing, setIsClosing] = useState(false);

    useLayoutEffect(() => {
        if (!modalScopeRef.current || !backdropRef.current || !cardRef.current) return undefined;

        const ctx = gsap.context(() => {
            gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 });
            gsap.fromTo(cardRef.current, { opacity: 0, scale: 0.96, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.28 });
        }, modalScopeRef.current);

        return () => ctx.revert();
    }, []);

    useLayoutEffect(() => {
        if (!isClosing) return undefined;
        if (!modalScopeRef.current || !backdropRef.current || !cardRef.current) {
            onClose();
            return undefined;
        }

        const ctx = gsap.context(() => {
            gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
            gsap.to(cardRef.current, { opacity: 0, scale: 0.96, y: 10, duration: 0.2, onComplete: onClose });
        }, modalScopeRef.current);

        return () => ctx.revert();
    }, [isClosing, onClose]);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
    };

    return createPortal(
        <div ref={modalScopeRef}>
            <div ref={backdropRef} onClick={handleClose} style={{
                position: "fixed", inset: 0, zIndex: 9000,
                background: "rgba(4,5,9,0.85)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
            }}>
                <div ref={cardRef} onClick={e => e.stopPropagation()} style={{
                    position: "relative", width: "100%", maxWidth: 1200, height: "85vh",
                    background: "#090A0F", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
                }}>
                    <VectorCanvas
                        nodes={nodes}
                        queryVector={queryVector}
                        selectedChunkIds={selectedChunkIds}
                        similarityScores={similarityScores}
                        selectedNode={selectedNode}
                        loadingState={loadingState}
                        onNodeSelect={onNodeSelect}
                        isModal
                    />
                    <button onClick={handleClose} style={{
                        position: "absolute", top: 16, right: 16, zIndex: 20,
                        width: 32, height: 32, background: "rgba(13,16,23,0.8)",
                        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "rgba(200,212,225,0.7)"
                    }}>
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ──────────────────────────────────────────────────────────────────────
   VECTOR PANEL
   ────────────────────────────────────────────────────────────────────── */
export default function VectorPanel({ className }) {
    const {
        vectorResults, queryVector, selectedChunkIds, similarityScores,
        setSelectedNode, selectedNode, loadingState,
        isFullscreenVector, toggleFullscreenVector,
    } = useCognitiveStore();

    const handleNodeSelect = (node) => {
        setSelectedNode(node);
    };

    return (
        <>
            <div className={`w-full h-full relative rounded-xl overflow-hidden ${className ?? ""}`} style={{ background: "#05060A" }}>
                <VectorCanvas
                    nodes={vectorResults}
                    queryVector={queryVector}
                    selectedChunkIds={selectedChunkIds}
                    similarityScores={similarityScores}
                    selectedNode={selectedNode}
                    loadingState={loadingState}
                    onNodeSelect={handleNodeSelect}
                    isModal={false}
                />
                <button
                    onClick={() => toggleFullscreenVector()}
                    style={{
                        position: "absolute", top: 10, right: 10, zIndex: 10,
                        width: 28, height: 28, background: "rgba(13,16,23,0.75)",
                        border: "1px solid rgba(148,163,184,0.2)", borderRadius: 7,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "rgba(148,163,184,0.8)"
                    }}
                >
                    <Maximize2 size={13} />
                </button>
            </div>

            {isFullscreenVector && (
                <VectorModal
                    onClose={() => toggleFullscreenVector()}
                    nodes={vectorResults}
                    queryVector={queryVector}
                    selectedChunkIds={selectedChunkIds}
                    similarityScores={similarityScores}
                    selectedNode={selectedNode}
                    loadingState={loadingState}
                    onNodeSelect={handleNodeSelect}
                />
            )}
        </>
    );
}
