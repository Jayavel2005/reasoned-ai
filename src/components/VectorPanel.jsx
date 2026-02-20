import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Line, Sparkles, Grid } from "@react-three/drei";
import { Maximize2, Minimize2, Bot, Loader2 } from "lucide-react";
import useCognitiveStore from "../store/useCognitiveStore";

function DataPoint({ node, onSelect }) {
    const mesh = useRef();
    useFrame((state) => {
        if (mesh.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 1.8 + node.position[0]) * 0.08;
            mesh.current.scale.setScalar(scale);
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh
                ref={mesh}
                position={node.position}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                }}
            >
                <sphereGeometry args={[0.08, 24, 24]} />
                <meshStandardMaterial color={node.color || "#00F0FF"} emissive={node.color || "#00F0FF"} emissiveIntensity={1.5} toneMapped={false} />
            </mesh>
        </Float>
    );
}

function Scene({ nodes, onNodeSelect }) {
    const lines = useMemo(() => {
        const out = [];
        for (let i = 0; i < nodes.length; i += 1) {
            for (let j = i + 1; j < nodes.length; j += 1) {
                const a = nodes[i].position;
                const b = nodes[j].position;
                const dx = a[0] - b[0];
                const dy = a[1] - b[1];
                const dz = a[2] - b[2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < 2.2) {
                    out.push({
                        id: `${nodes[i].id}-${nodes[j].id}`,
                        points: [a, b],
                        color: nodes[i].color || "#00F0FF",
                        opacity: Math.max(0.05, (2.2 - dist) / 2.2) * 0.35,
                    });
                }
            }
        }
        return out;
    }, [nodes]);

    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[8, 6, 8]} intensity={1} color="#BD00FF" />
            <pointLight position={[-8, -4, -8]} intensity={0.9} color="#00F0FF" />

            <Grid
                position={[0, -2, 0]}
                args={[20, 20]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="rgba(255, 255, 255, 0.05)"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="rgba(255, 255, 255, 0.1)"
                fadeDistance={30}
                fadeStrength={1}
            />

            {lines.map((line) => (
                <Line key={line.id} points={line.points} color={line.color} transparent opacity={line.opacity} lineWidth={1} />
            ))}

            {nodes.map((node) => (
                <DataPoint key={node.id} node={node} onSelect={onNodeSelect} />
            ))}

            <Sparkles count={45} scale={15} size={2} speed={0.4} opacity={0.3} color="#ffffff" />
        </>
    );
}

function NodeInspectorPanel({ node, loading, onClose }) {
    if (!node) return null;

    return (
        <div className="absolute top-16 right-4 w-72 glass-panel rounded-xl p-4 flex flex-col gap-3 z-50 pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-[#00F0FF]/30">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">{node.label}</h3>
                </div>
                <button onClick={onClose} className="text-[#94A3B8] hover:text-white transition-colors">
                    <Minimize2 size={12} />
                </button>
            </div>

            <div className="text-[10px] text-[#94A3B8] font-mono border-t border-white/5 pt-2">
                <div className="flex justify-between mb-1">
                    <span>Similarity:</span>
                    <span className="text-[#00FFA3]">{typeof node.score === "number" ? node.score.toFixed(4) : "N/A"}</span>
                </div>
                <div className="flex justify-between mb-1">
                    <span>Source:</span>
                    <span className="text-white truncate max-w-[140px] text-right">{node.source || "Unknown"}</span>
                </div>
            </div>

            <p className="text-[10px] text-white/80 leading-relaxed bg-[#000000]/40 p-2 rounded border border-white/5 min-h-14">
                {loading ? "Searching vectors..." : node.summary}
            </p>

            <button className="flex items-center justify-center gap-2 w-full py-1.5 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/30 rounded text-[10px] font-bold text-[#00F0FF] uppercase tracking-wide transition-all">
                <Bot size={12} />
                Open in Reasoning
            </button>
        </div>
    );
}

export default function VectorPanel({ className }) {
    const {
        vectorResults,
        isFullscreenVector,
        toggleFullscreenVector,
        setSelectedNode,
        selectedNode,
        searchVectors,
        loadingState,
    } = useCognitiveStore();

    const containerClass = isFullscreenVector
        ? "w-full h-full min-h-[400px] relative"
        : `w-full h-full min-h-[400px] relative glass-panel rounded-2xl group ${className}`;

    const handleNodeSelect = async (node) => {
        setSelectedNode(node);
        try {
            const results = await searchVectors(node.label);
            if (Array.isArray(results) && results.length > 0) {
                setSelectedNode(results[0]);
            }
        } catch {
            // Store manages error state.
        }
    };

    return (
        <div className={containerClass}>
            <Canvas camera={{ position: [8, 5, 8], fov: 40 }} dpr={[1, 2]} className="z-0 rounded-2xl">
                <Scene nodes={vectorResults} onNodeSelect={handleNodeSelect} />
                <OrbitControls
                    enableZoom
                    enablePan
                    autoRotate={!selectedNode}
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 2 - 0.1}
                    minDistance={4}
                    maxDistance={30}
                    target={[0, 0, 0]}
                    dampingFactor={0.05}
                />
            </Canvas>

            <div className={`absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none ${isFullscreenVector ? "scale-110 origin-top-left" : ""}`}>
                <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 pointer-events-auto drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                    3D Cognitive Field
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_10px_#00F0FF]" />
                </h2>
                <div className="flex gap-3 text-[9px] font-mono text-[#94A3B8] pointer-events-auto opacity-70">
                    <span>NODES: {vectorResults.length}</span>
                    <span>STATE: {loadingState.vectors ? "PROCESSING" : "READY"}</span>
                </div>
            </div>

            <button
                onClick={toggleFullscreenVector}
                className="absolute top-4 right-4 z-10 p-2 bg-[#13141C]/60 backdrop-blur-md rounded-lg border border-white/10 text-white hover:text-[#00F0FF] hover:border-[#00F0FF]/50 transition-all shadow-lg"
            >
                {isFullscreenVector ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            {loadingState.vectors ? (
                <div className="absolute top-16 left-4 z-20 flex items-center gap-2 text-[10px] font-mono text-[#FFD600] bg-[#13141C]/70 border border-[#FFD600]/20 rounded px-2 py-1">
                    <Loader2 size={11} className="animate-spin" />
                    SEARCHING VECTORS...
                </div>
            ) : null}

            <NodeInspectorPanel node={selectedNode} loading={loadingState.vectors} onClose={() => setSelectedNode(null)} />
        </div>
    );
}
