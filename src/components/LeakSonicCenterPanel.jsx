import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Sparkles, Html, Float } from "@react-three/drei";
import * as THREE from "three";
import useLeaksonicStore from "../store/useLeaksonicStore";

// Glass-like transparent material for pipes
function PipeMaterial({ pressure }) {
    // Pressure mapping: 0 = dark blue, 100 = bright cyan
    const pressureRatio = Math.min(1, Math.max(0, pressure / 120));

    // Low pressure = #0B1E36, High pressure = #00F0FF
    const color = new THREE.Color().lerpColors(
        new THREE.Color("#0B1E36"),
        new THREE.Color("#00F0FF"),
        pressureRatio
    );

    return (
        <meshPhysicalMaterial
            color="#a0b0c0"
            transparent={true}
            opacity={0.3}
            roughness={0.1}
            metalness={0.2}
            transmission={0.8}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            emissive={color}
            emissiveIntensity={0.2 + (pressureRatio * 0.8)}
            side={THREE.DoubleSide}
            depthWrite={false}
        />
    );
}

function PhysicalPipeSegment({ segment, leakEvent, currentSystemPressure }) {
    const pipeGeo = useMemo(() => {
        const start = new THREE.Vector3(...segment.start);
        const end = new THREE.Vector3(...segment.end);
        const length = start.distanceTo(end);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        return { start, end, midPoint, length };
    }, [segment]);

    const vecStart = new THREE.Vector3(...segment.start);
    const vecEnd = new THREE.Vector3(...segment.end);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(vecEnd, vecStart).normalize());

    return (
        <group position={pipeGeo.midPoint} quaternion={quaternion}>
            <mesh>
                <cylinderGeometry args={[0.5, 0.5, pipeGeo.length, 32]} />
                <PipeMaterial pressure={currentSystemPressure} />
            </mesh>

            {/* Edge / Outer Shell to retain shape definition */}
            <mesh>
                <cylinderGeometry args={[0.52, 0.52, pipeGeo.length, 32]} />
                <meshBasicMaterial color="#00F0FF" transparent opacity={0.05} wireframe={true} />
            </mesh>
        </group>
    );
}

function AirflowParticles({ curve, leakEvent, currentSystemPressure, compressorActive, inletValveState, middleValveState, outletValveState, flowVelocity }) {
    const count = 1200;
    const meshRef = useRef();

    const particles = useMemo(() => {
        return Array.from({ length: count }).map(() => ({
            progress: Math.random(),
            radiusOffset: Math.random() * 0.2, // Tightly inside pipe radius (0.5)
            angleOffset: Math.random() * Math.PI * 2,
            speedOffset: 0.5 + Math.random() * 1.5
        }));
    }, [count]);

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const colorObj = useMemo(() => new THREE.Color(), []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Base velocity from unified simulation engine
        const velocity = Math.max(0.02, flowVelocity);

        // Pressure mapping: 50 = dark blue, 120 = electric cyan
        const pressureRatio = Math.max(0, Math.min(1, (currentSystemPressure - 50) / 70));
        const baseColor = new THREE.Color().lerpColors(
            new THREE.Color("#0B1E36"),
            new THREE.Color("#00F0FF"), // bright cyan
            pressureRatio
        );
        const leakColor = new THREE.Color("#FFFFFF"); // bright white for escaping energy

        particles.forEach((p, i) => {
            let currentValveState = 1.0;
            let currentVelocity = velocity;
            p.scale = 1.0; // Reset scale for each frame

            // Segment 1: Source to Inlet Valve [-22 to -18] => approx 0.057 distance
            if (p.progress <= 0.057) {
                currentValveState = inletValveState;
            }
            // Segment 2: Inlet Valve to Middle Valve [-18 to 0, 12] => approx 0.5 distance
            else if (p.progress <= 0.5) {
                currentVelocity *= Math.max(0.1, inletValveState); // Slows if upstream choked
                currentValveState = middleValveState;
                if (inletValveState === 0) p.scale = 0; // Destroy particle if 100% starved
            }
            // Segment 3: Middle Valve to Outlet Valve [0, 12 to 18, 2] => approx 0.943 distance
            else if (p.progress <= 0.943) {
                currentVelocity *= Math.max(0.1, inletValveState * middleValveState);
                currentValveState = outletValveState;
                if (inletValveState === 0 || middleValveState === 0) p.scale = 0; // Starved
            }
            // Segment 4: Outlet Valve to Exit [18, 2 to 22, 2]
            else {
                currentVelocity *= Math.max(0.1, inletValveState * middleValveState * outletValveState);
                if (inletValveState === 0 || middleValveState === 0 || outletValveState === 0) p.scale = 0;
            }

            // Visual dimming downstream
            let targetColor = baseColor.clone();
            if (p.progress > 0.5 && middleValveState < 1.0) {
                targetColor.lerp(new THREE.Color("#0B1E36"), 1 - middleValveState);
            }

            // Collision Constraints at Valves
            if (p.progress < 0.057 && p.progress + currentVelocity * p.speedOffset * delta >= 0.057) {
                if (Math.random() >= inletValveState) p.progress = Math.random() * 0.055; // Bounces back
            }
            if (p.progress < 0.5 && p.progress > 0.057 && p.progress + currentVelocity * p.speedOffset * delta >= 0.5) {
                if (Math.random() >= middleValveState) p.progress = 0.057 + Math.random() * (0.5 - 0.057); // Bounces
            }
            if (p.progress < 0.943 && p.progress > 0.5 && p.progress + currentVelocity * p.speedOffset * delta >= 0.943) {
                if (Math.random() >= outletValveState) p.progress = 0.5 + Math.random() * (0.943 - 0.5); // Bounces
            }

            p.progress += currentVelocity * p.speedOffset * delta;

            if (p.progress > 1) {
                p.progress -= 1;
            }

            const pos = curve.getPointAt(p.progress);

            // Internal movement jitter
            const jitterRadius = p.radiusOffset + Math.sin(state.clock.elapsedTime * 10 + i) * 0.05;

            const tangent = curve.getTangentAt(p.progress);
            const axis = new THREE.Vector3(0, 1, 0);
            let normal = tangent.clone().cross(axis);
            if (normal.lengthSq() < 0.01) normal = tangent.clone().cross(new THREE.Vector3(1, 0, 0));

            normal.normalize().multiplyScalar(jitterRadius);
            normal.applyAxisAngle(tangent, p.angleOffset + state.clock.elapsedTime * (i % 2 === 0 ? 2 : -2)); // swirl effect

            pos.add(normal);

            if (leakEvent) {
                const leakPos = new THREE.Vector3(...leakEvent.position);
                const distToLeak = pos.distanceTo(leakPos);
                if (distToLeak < 4) {
                    // Gravity-like pull towards the leak
                    const pullStrength = Math.max(0, 1 - (distToLeak / 4));
                    const force = leakPos.clone().sub(pos).multiplyScalar(pullStrength * 0.4 * (leakEvent.intensity / 100));
                    pos.add(force);

                    colorObj.lerpColors(targetColor, leakColor, pullStrength);
                } else {
                    colorObj.copy(targetColor);
                }
            } else {
                colorObj.copy(targetColor);
            }

            dummy.position.copy(pos);
            // Elongate particles in the direction of flow
            dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            dummy.scale.set(0.6, compressorActive ? 4.0 + currentVelocity * 15 : 1.0, 0.6);

            dummy.updateMatrix();

            meshRef.current.setMatrixAt(i, dummy.matrix);
            meshRef.current.setColorAt(i, colorObj);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
}

// Directional Jet Emission for Leaks
function LeakJetParticles({ leakEvent }) {
    const count = 300;
    const meshRef = useRef();

    const particles = useMemo(() => {
        return Array.from({ length: count }).map(() => ({
            life: Math.random(),
            speed: 15 + Math.random() * 10,
            angle: Math.random() * Math.PI * 2,
            radius: Math.random() * 0.15
        }));
    }, [count]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        if (!meshRef.current || !leakEvent) return;

        particles.forEach((p, i) => {
            p.life += delta * (p.speed * 0.1);
            if (p.life > 1) p.life -= 1;

            // Jet shoots straight UP and fans out slightly from the leak position
            // Main horizontal pipe has surface normal facing UP or OUT. Assuming top pipe, let's shoot UP.

            const y = p.life * 4.0; // Shoot up 4 units
            const spread = p.life * 1.2; // Fan out

            const xOffset = Math.cos(p.angle) * p.radius + Math.cos(p.angle) * spread;
            const zOffset = Math.sin(p.angle) * p.radius + Math.sin(p.angle) * spread;

            dummy.position.set(
                leakEvent.position[0] + xOffset,
                leakEvent.position[1] + 0.5 + y, // Start on pipe surface (radius 0.5)
                leakEvent.position[2] + zOffset
            );

            const scale = (1.0 - p.life) * (leakEvent.intensity / 50 + 0.5);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (!leakEvent || leakEvent.intensity < 0.1) return null;

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <sphereGeometry args={[0.06, 4, 4]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
}

// Compressor Model (Water Magic BM-60L style)
function AirCompressor() {
    return (
        <group position={[-24, 1, 0]}>
            {/* Main Tank - Horizontal */}
            <mesh position={[0, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[1.5, 1.5, 5, 32]} />
                <meshStandardMaterial color="#0E4A6F" metalness={0.6} roughness={0.4} /> {/* Deep industrial blue */}
            </mesh>
            {/* Tank end caps */}
            <mesh position={[-2.5, 0, 0]}>
                <sphereGeometry args={[1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#0E4A6F" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[2.5, 0, 0]} rotation-z={Math.PI}>
                <sphereGeometry args={[1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#0E4A6F" metalness={0.6} roughness={0.4} />
            </mesh>

            {/* MotorBlock */}
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[2, 1.5, 1.5]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Wheels */}
            <mesh position={[-2, -1.2, 1]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-2, -1.2, -1]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Front Leg */}
            <mesh position={[2, -1.2, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
                <meshStandardMaterial color="#111" />
            </mesh>

            {/* Label */}
            <Html position={[0, 0, 1.6]} transform center>
                <div className="text-[10px] font-bold text-white uppercase tracking-widest opacity-80">
                    WM BM-60L
                </div>
            </Html>
        </group>
    );
}

function CornerJointMesh({ position, pressure }) {
    return (
        <group position={position}>
            <mesh>
                <sphereGeometry args={[0.6, 32, 32]} />
                <PipeMaterial pressure={pressure} />
            </mesh>
            <mesh>
                <sphereGeometry args={[0.62, 16, 16]} />
                <meshBasicMaterial color="#00F0FF" transparent opacity={0.05} wireframe={true} />
            </mesh>
        </group>
    );
}

function CompressorConnectionJoint() {
    return (
        <group>
            {/* Supply Tube connecting Compressor Air to Pipe Network Inlet */}
            <mesh position={[-23, 2, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.3, 0.3, 2, 24]} />
                <meshStandardMaterial color="#1a1c23" roughness={0.9} /> {/* Rubber hose material */}
            </mesh>
            {/* Hose clamps / ridges */}
            <mesh position={[-22.2, 2, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.35, 0.35, 0.1, 16]} />
                <meshStandardMaterial color="#E0E0E0" metalness={0.9} />
            </mesh>
            <mesh position={[-23.8, 2, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.35, 0.35, 0.1, 16]} />
                <meshStandardMaterial color="#E0E0E0" metalness={0.9} />
            </mesh>
        </group>
    );
}

// Industrial Isolation Valve Model
function IndustrialValve({ position, rotation = [0, 0, 0], valveState }) {
    // 0 = closed (perpendicular to pipe flow), 1 = open (parallel to pipe flow)
    const handleRotation = (1 - valveState) * (Math.PI / 2);

    return (
        <group position={position} rotation={rotation}>
            {/* Valve Body */}
            <mesh rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.7, 0.7, 1.2, 32]} />
                <meshStandardMaterial color="#4A5A6A" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshStandardMaterial color="#3A4A5A" metalness={0.8} roughness={0.4} />
            </mesh>
            {/* Valve Stem */}
            <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.6, 16]} />
                <meshStandardMaterial color="#E0E0E0" metalness={0.9} />
            </mesh>
            {/* Valve Handle */}
            <group position={[0, 1.1, 0]} rotation-y={handleRotation}>
                <mesh position={[0.6, 0, 0]}>
                    <boxGeometry args={[1.6, 0.1, 0.3]} />
                    <meshStandardMaterial color="#D32F2F" roughness={0.6} /> {/* Safety Red Handle */}
                </mesh>
            </group>

            {/* Flanges securing to transparent pipe */}
            <mesh position={[-0.75, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
            <mesh position={[0.75, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
        </group>
    );
}

// Physical Outlet visualization (Pressure Sink)
function OutletJoint() {
    return (
        <group position={[22, 2, 0]}>
            <mesh position={[0.2, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.55, 0.55, 0.4, 32]} />
                <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0.4, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.4, 0.4, 0.2, 32]} />
                <meshStandardMaterial color="#111" />
            </mesh>
        </group>
    );
}

function UltrasonicSensor({ node, leakState, leakEvent }) {
    const isLeaking = leakState === "CRITICAL" || leakState === "DETECTED";
    const statusColor = node.status === "WARNING" ? "#FF4D6D" : node.status === "ONLINE" ? "#06D6A0" : "#5E6A7A";
    const [hovered, setHover] = useState(false);
    const ledRef = useRef();
    const shockwaveRef = useRef();

    useFrame((state) => {
        if (ledRef.current) {
            const pulse = node.status === "WARNING" ? Math.sin(state.clock.elapsedTime * 15) * 0.5 + 0.5 : 1;
            ledRef.current.emissiveIntensity = pulse * 2.5;
        }

        if (shockwaveRef.current && node.status === "WARNING") {
            const t = (state.clock.elapsedTime * 2) % 1;
            shockwaveRef.current.scale.setScalar(1 + t * 4);
            shockwaveRef.current.material.opacity = Math.max(0, 0.5 - t * 0.5);
        }
    });

    return (
        <group position={node.position}>
            {/* Clamp */}
            <mesh rotation-x={Math.PI / 2}>
                <torusGeometry args={[0.55, 0.08, 16, 32]} />
                <meshStandardMaterial color="#111" metalness={0.3} roughness={0.8} />
            </mesh>

            {/* Sensor Housing */}
            <mesh
                position={[0.5, 0, 0]}
                rotation-z={Math.PI / 2}
                onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
                onPointerOut={() => setHover(false)}
            >
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Indicator LED */}
            <mesh position={[0.7, 0, 0]} ref={ledRef}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color={statusColor} emissive={statusColor} toneMapped={false} />
            </mesh>

            {/* Ultrasonic Shockwave Ripple */}
            {node.status === "WARNING" && (
                <mesh position={[0.5, 0, 0]} ref={shockwaveRef}>
                    <ringGeometry args={[0.2, 0.3, 32]} />
                    <meshBasicMaterial color="#FF4D6D" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
                </mesh>
            )}

            {hovered && (
                <Html distanceFactor={15}>
                    <div className="bg-[rgba(14,16,23,0.95)] backdrop-blur-md border border-[rgba(0,240,255,0.3)] p-3 rounded-lg text-xs shadow-2xl transform -translate-y-16 pointer-events-none select-none z-50 min-w-[140px]">
                        <div className="font-bold text-[#00F0FF] mb-1 flex items-center justify-between">
                            {node.id}
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                        </div>
                        <div className="text-[10px] text-[#7A8899] font-mono grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                            <span>AMP:</span>
                            <span className="text-[#06D6A0] text-right">{node.rawAmplitude.toFixed(1)} dB</span>
                            {node.featureVector && (
                                <>
                                    <span>PEAK:</span>
                                    <span className="text-right">{(node.featureVector.peakFrequency / 1000).toFixed(1)} kHz</span>
                                    <span>SNR:</span>
                                    <span className="text-right">{node.featureVector.signalToNoiseRatio.toFixed(1)} dB</span>
                                    <span>CONF:</span>
                                    <span className="text-[#00F0FF] text-right">{(node.confidence * 100).toFixed(0)}%</span>
                                </>
                            )}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

function PressureSensor({ node }) {
    const isPressureLow = node.pressurePSI < 95;
    const statusColor = isPressureLow ? "#FFD60A" : "#06D6A0";

    return (
        <group position={node.position}>
            <mesh position={[-0.6, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.6, 0.6, 0.3, 32]} />
                <meshStandardMaterial color="#222" metalness={0.7} />
            </mesh>
            <mesh position={[-0.4, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
                <meshStandardMaterial color="#555" metalness={0.8} />
            </mesh>

            <Html position={[-1.2, 0, 0]} center distanceFactor={20}>
                <div className="bg-[rgba(14,16,23,0.8)] border border-[#4A9BB5]/30 px-2 py-1 rounded select-none pointer-events-none text-center">
                    <span className="block text-[#4A9BB5] font-mono text-[8px] uppercase">{node.id} Inline</span>
                    <span className="text-lg font-mono font-bold" style={{ color: statusColor }}>
                        {node.pressurePSI.toFixed(1)} <span className="text-[10px] text-[#7A8899]">PSI</span>
                    </span>
                </div>
            </Html>
        </group>
    );
}

function PhysicalTwinScene() {
    const { pipeGeometry, nodes, leakEvent, leakState, currentSystemPressure, compressorActive, inletValveState, middleValveState, outletValveState, flowVelocity } = useLeaksonicStore();

    // The open directed topology from source to sink
    const curvePoints = useMemo(() => [
        new THREE.Vector3(-22, 2, 0), // Source Connection
        new THREE.Vector3(-14, 2, 0), // Turn Up
        new THREE.Vector3(-14, 12, 0), // Turn Right
        new THREE.Vector3(14, 12, 0),  // Turn Down
        new THREE.Vector3(14, 2, 0),   // Turn Right (to outlet)
        new THREE.Vector3(22, 2, 0),   // Sink Exit
    ], []);

    // Exact straight-line path ensuring particles never exit the pipe geometry
    const curve = useMemo(() => {
        const path = new THREE.CurvePath();
        for (let i = 0; i < curvePoints.length - 1; i++) {
            path.add(new THREE.LineCurve3(curvePoints[i], curvePoints[i + 1]));
        }
        return path;
    }, [curvePoints]);

    const usNodes = nodes.filter(n => n.type === "ULTRASONIC");
    const pressNodes = nodes.filter(n => n.type === "PRESSURE");

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 15]} intensity={1.5} color="#e0eaff" />
            <pointLight position={[-10, 0, -10]} intensity={0.5} color="#BD00FF" />
            <pointLight position={[0, 5, 0]} intensity={0.6} color="#00F0FF" />

            <mesh position={[0, -5, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#05070a" metalness={0.2} roughness={0.9} />
            </mesh>

            <Grid
                position={[0, -4.9, 0]}
                args={[80, 80]}
                cellSize={2}
                cellThickness={0.5}
                cellColor="#00F0FF"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#00F0FF"
                fadeDistance={50}
                fadeStrength={1.5}
            />

            <group position={[0, 2, 0]}>
                <AirCompressor />
                <CompressorConnectionJoint />

                <OutletJoint />

                {/* Inlet Valve - Upstream nearest to compressor */}
                <IndustrialValve position={[-18, 2, 0]} rotation={[0, 0, Math.PI / 2]} valveState={inletValveState} />

                {/* Middle Valve - Main Top Branch Inline */}
                <IndustrialValve position={[0, 15, 0]} rotation={[0, 0, Math.PI / 2]} valveState={middleValveState} />

                {/* Outlet Valve - Downstream nearest to exit */}
                <IndustrialValve position={[18, 2, 0]} rotation={[0, 0, Math.PI / 2]} valveState={outletValveState} />

                {pipeGeometry.map((seg) => (
                    <PhysicalPipeSegment
                        key={seg.id}
                        segment={seg}
                        leakEvent={leakEvent}
                        currentSystemPressure={currentSystemPressure}
                    />
                ))}

                {curvePoints.map((pos, i) => {
                    // Filter out the junction from generic corners rendering if needed, 
                    // but we need it since our geometry doesn't cap connection automatically well.
                    return <CornerJointMesh key={i} position={pos} pressure={currentSystemPressure} />
                })}

                <AirflowParticles
                    curve={curve}
                    leakEvent={leakEvent}
                    currentSystemPressure={currentSystemPressure}
                    compressorActive={compressorActive}
                    inletValveState={inletValveState}
                    middleValveState={middleValveState}
                    outletValveState={outletValveState}
                    flowVelocity={flowVelocity}
                />

                <LeakJetParticles leakEvent={leakEvent} />

                {usNodes.map(node => (
                    <UltrasonicSensor key={node.id} node={node} leakState={leakState} leakEvent={leakEvent} />
                ))}

                {pressNodes.map(node => (
                    <PressureSensor key={node.id} node={node} />
                ))}
            </group>
        </>
    );
}


export default function LeakSonicCenterPanel() {
    const { leakState, systemConfidence, leakEvent } = useLeaksonicStore();

    return (
        <div className="flex flex-col h-full w-full relative">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
                <span className="font-mono text-[10px] tracking-widest text-[#00F0FF] uppercase">
                    3D Kinematic Model
                </span>
                <h2 className="text-[#DDE4EE] text-lg font-medium tracking-tight">
                    Physical Digital Twin Field
                </h2>
            </div>

            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1 pointer-events-none">
                <div className={`backdrop-blur border px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors duration-500
                    ${leakState === 'CRITICAL' ? 'bg-[rgba(255,77,109,0.2)] border-[#FF4D6D]/40 shadow-[0_0_15px_rgba(255,77,109,0.3)]' :
                        leakState === 'DETECTED' ? 'bg-[rgba(255,214,10,0.2)] border-[#FFD60A]/40' :
                            'bg-[rgba(14,16,23,0.6)] border-[rgba(255,255,255,0.05)]'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${leakState === 'CRITICAL' ? 'bg-[#FF4D6D] animate-ping' : leakState === 'DETECTED' ? 'bg-[#FFD60A]' : 'bg-[#06D6A0]'}`} />
                    <span className="font-mono text-xs tracking-wider text-[#DDE4EE]">
                        {leakState === 'CRITICAL' ? 'LEAK CRITICAL' : leakState === 'DETECTED' ? 'ANOMALY DETECTED' : 'SYSTEM OPTIMAL'}
                    </span>
                </div>

                {leakEvent && leakEvent.intensity > 0.1 && (
                    <div className="mt-2 bg-[rgba(14,16,23,0.8)] border border-[#FF4D6D]/30 px-3 py-2 rounded pointer-events-auto">
                        <span className="text-[#FF4D6D] font-mono text-[10px] uppercase block mb-1">Spatial Anomaly Log</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                            <span className="text-[#7A8899]">SEGMENT:</span><span className="text-right text-[#DDE4EE]">{leakEvent.segment}</span>
                            <span className="text-[#7A8899]">GROWTH:</span><span className="text-right text-[#FFD60A]">+( {leakEvent.growthRate.toFixed(3)} u/s )</span>
                            <span className="text-[#7A8899]">MAGNITUDE:</span><span className="text-right text-[#FF4D6D]">{(leakEvent.intensity * 100).toFixed(0)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full relative rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)] bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(9,10,15,0.9)_100%)]">
                <Canvas camera={{ position: [0, 8, 30], fov: 45 }} dpr={[1, 2]}>
                    <PhysicalTwinScene />
                    <OrbitControls
                        enableZoom={true}
                        autoRotate={false}
                        maxPolarAngle={Math.PI / 2 - 0.05}
                        minDistance={10}
                        maxDistance={50}
                        target={[0, 8, 0]}
                    />
                </Canvas>

                {leakState === 'CRITICAL' && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-[#FF4D6D] shadow-[inset_0_0_80px_rgba(255,77,109,0.15)] animate-pulse" />
                )}
            </div>

            <div className="absolute bottom-4 left-4 z-10 flex gap-6 pointer-events-none">
                <div className="flex flex-col">
                    <span className="text-[#7A8899] font-mono text-[10px] uppercase">Edge Confidence</span>
                    <span className="text-[#00F0FF] font-mono text-sm">{(systemConfidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[#7A8899] font-mono text-[10px] uppercase">Simulation</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-[#06D6A0] rounded-full animate-pulse" />
                        <span className="text-[#06D6A0] font-mono text-sm">ACTIVE // 60Hz // CNN READY</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
