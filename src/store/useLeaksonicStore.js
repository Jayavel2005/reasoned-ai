import { create } from "zustand";
import { computeFFTMagnitude } from "../utils/fft";

// Realistic Pipe Geometry forming an open directed pneumatic system (Slightly compressed horizontally constraint for 3D Camera rendering view)
const PIPE_GEOMETRY = [
    { id: "SEG_COMP_CONN", type: "horizontal", start: [-22, 2, 0], end: [-14, 2, 0], length: 8 },
    { id: "SEG_LEFT_VERT", type: "vertical", start: [-14, 2, 0], end: [-14, 12, 0], length: 10 },
    { id: "SEG_MAIN_HORIZ", type: "horizontal", start: [-14, 12, 0], end: [14, 12, 0], length: 28 },
    { id: "SEG_VENT_BRANCH", type: "vertical", start: [0, 12, 0], end: [0, 18, 0], length: 6 },
    { id: "SEG_RIGHT_VERT", type: "vertical", start: [14, 12, 0], end: [14, 2, 0], length: 10 },
    { id: "SEG_OUTLET", type: "horizontal", start: [14, 2, 0], end: [22, 2, 0], length: 8 }
];

// Exact Sensor Positions
const INITIAL_NODES = [
    { id: "PR-01", type: "PRESSURE", segment: "SEG_LEFT_VERT", position: [-14, 6, 0.4], status: "ONLINE", pressurePSI: 0, pressureDropRate: 0 },
    { id: "US-01", type: "ULTRASONIC", segment: "SEG_MAIN_HORIZ", position: [-5, 12, 0.4], status: "ONLINE", rawAmplitude: 12, featureVector: null, confidence: 0 },
    { id: "PR-02", type: "PRESSURE", segment: "SEG_RIGHT_VERT", position: [14, 6, 0.4], status: "ONLINE", pressurePSI: 0, pressureDropRate: 0 }
];

const useLeaksonicStore = create((set, get) => ({
    pipeGeometry: PIPE_GEOMETRY,
    nodes: INITIAL_NODES,
    leakEvent: null, // { position: [x,y,z], segment, intensity, startTime }
    systemConfidence: 0.99,
    leakState: "NORMAL",
    simulationActive: false,

    // Valve States (0 = closed, 1 = open)
    inletValveState: 1.0,
    middleValveState: 1.0,
    outletValveState: 1.0,
    setInletValveState: (state) => set({ inletValveState: state }),
    setMiddleValveState: (state) => set({ middleValveState: state }),
    setOutletValveState: (state) => set({ outletValveState: state }),
    leakEnabled: false,
    leakActive: false,
    toggleLeak: () => set(state => ({ leakEnabled: !state.leakEnabled })),

    // Compressor State
    compressorActive: true,
    compressorTargetPressure: 100, // GUI target
    compressorPressure: 0,         // Physical output
    currentSystemPressure: 0,      // Avg modeled pressure

    // NEW SIMULATION STATES
    pipePressureDistribution: { "PR-01": 0, "PR-02": 0 },
    flowVelocity: 0,
    leakLocation: null,
    ultrasonicSignalBuffer: new Float64Array(1024),
    fftSpectrumData: Array(128).fill(0), // Final telemetry passed to UI

    // Telemetry History
    pressureHistory: Array(50).fill(0),
    waveformHistory: Array(50).fill(12),
    fftData: Array(128).fill(0), // Still present for compat, but FFT maps to fftSpectrumData

    // Process timings
    processingDelayMs: 0,
    detectedLocation: null,

    // UI State
    telemetryCollapsed: false,
    setTelemetryCollapsed: (collapsed) => set({ telemetryCollapsed: collapsed }),

    setCompressorActive: (active) => set({ compressorActive: active }),
    setCompressorPressure: (pressure) => set({ compressorTargetPressure: pressure }),

    startSimulation: () => {
        if (get().simulationActive) return;
        set({ simulationActive: true });

        // Phase accumulator for continuous time-domain signal across frames
        let phase = 0;
        let lastTime = performance.now();

        // Real-time Physics Update Loop (60 Hz)
        const tick = () => {
            if (!get().simulationActive) return;

            const now = performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.1); // max 100ms dt to prevent spiral
            lastTime = now;

            const state = get();
            let currentLeak = state.leakEvent;

            // Auto disable leak when pressure drops
            const MIN_PRESSURE = 5;
            let currentLeakEnabled = state.leakEnabled;
            if (state.compressorPressure <= MIN_PRESSURE && currentLeakEnabled) {
                currentLeakEnabled = false;
            }

            const currentLeakActive = currentLeakEnabled && state.compressorPressure > MIN_PRESSURE;

            if (currentLeakActive && !currentLeak) {
                currentLeak = {
                    segment: "SEG_VENT_BRANCH",
                    position: [0, 15, 0],
                    intensity: 0.1,
                    startTime: Date.now(),
                    growthRate: 15
                };
            } else if (!currentLeakActive && currentLeak) {
                currentLeak = null;
            }

            // Evolve leak
            let leakLoss = 0;
            let currentLeakLoc = null;
            if (currentLeak && currentLeakActive) {
                const elapsedS = (Date.now() - currentLeak.startTime) / 1000;
                currentLeak.intensity = Math.min(100, 0.1 + elapsedS * currentLeak.growthRate);
                leakLoss = Math.min(20, currentLeak.intensity * 0.2);
                currentLeakLoc = currentLeak.position;
            }

            // 1. COMPUTE PRESSURE DISTRIBUTION
            let targetComp = state.compressorActive ? state.compressorTargetPressure : 0;
            let currentComp = state.compressorPressure;
            currentComp += (targetComp - currentComp) * 0.05; // smoothing logic (60Hz)

            // P1 = Upstream (PR-01 area), P2 = Downstream (PR-02 area)
            let p1 = currentComp * state.inletValveState;
            p1 += p1 * (1.0 - state.middleValveState) * 0.1;

            let p2 = p1 * state.middleValveState;
            p2 += p2 * (1.0 - state.outletValveState) * 0.2;

            if (currentLeakActive && p2 > 10) {
                p2 = Math.max(0, p2 - leakLoss);
            }

            const newPressureDist = { "PR-01": p1, "PR-02": p2 };
            const avgPressure = (p1 + p2) / 2;
            let newSystemPressure = state.currentSystemPressure;
            newSystemPressure += (avgPressure - newSystemPressure) * 0.1;

            // 2. COMPUTE FLOW VELOCITY
            const openFactor = state.inletValveState * state.middleValveState * state.outletValveState;
            const targetFlow = state.compressorActive ? (0.4 * openFactor * (newSystemPressure / 100)) : 0.05 * (newSystemPressure / 100);
            let currentFlow = state.flowVelocity || 0;
            currentFlow += (targetFlow - currentFlow) * 0.1;

            // 3. ULTRASONIC TIME-DOMAIN SIGNAL GENERATOR
            const N = 1024;
            const signalBuffer = new Float64Array(N);
            const sampleRate = 100000; // 100 kHz for 50 kHz Nyquist
            const timeStep = 1.0 / sampleRate;

            const baseCarrierFreq = 32000;
            const leakFreq = 38000;
            const isLeakActive = currentLeakActive;

            let maxAmp = 0;
            let rmsSum = 0;

            for (let i = 0; i < N; i++) {
                const t = phase + i * timeStep;
                let val = 0;
                let baseNoise = (Math.random() - 0.5) * (state.compressorActive ? 8.0 : 2.0);

                if (state.compressorActive) {
                    val += Math.sin(2 * Math.PI * baseCarrierFreq * t) * 5.0;
                    val += Math.sin(2 * Math.PI * 5000 * t) * 10.0;
                }

                if (isLeakActive) {
                    const noiseComponent = (Math.random() - 0.5);
                    const leakAmplitude = (currentLeak.intensity * newSystemPressure * state.middleValveState) / 100;
                    val += Math.sin(2 * Math.PI * leakFreq * t) * leakAmplitude;
                    val += leakAmplitude * noiseComponent * 2.0;
                }

                signalBuffer[i] = val + baseNoise;

                if (Math.abs(val) > maxAmp) maxAmp = Math.abs(val);
                rmsSum += signalBuffer[i] * signalBuffer[i];
            }
            phase += N * timeStep;

            const rmsValue = Math.sqrt(rmsSum / N);

            // 4. REAL FFT COMPUTATION PIPELINE
            const realFftMagnitudes = computeFFTMagnitude(signalBuffer); // returns N/2 (512) bins

            // Map 512 bins -> 128 bins (for telemetry UI)
            const newFftSpectrumData = Array(128).fill(0);
            const prevFft = state.fftSpectrumData;
            for (let i = 0; i < 128; i++) {
                let sum = 0;
                for (let j = 0; j < 4; j++) {
                    // Safe access in case realFftMagnitudes ends early, but we know it's 512 long
                    const v = realFftMagnitudes[i * 4 + j];
                    sum += isNaN(v) ? 0 : v;
                }
                const targetVal = (sum / 4.0) * 1.5;

                // Exponential moving average for liquid-smooth spectrum visualization
                const prevVal = prevFft && prevFft[i] !== undefined ? prevFft[i] : 0;
                newFftSpectrumData[i] = prevVal + (targetVal - prevVal) * 0.2;
            }

            // 5. UPDATE SENSOR NODES
            const updatedNodes = state.nodes.map(node => {
                if (node.type === "PRESSURE") {
                    const p = newPressureDist[node.id] || 0;
                    const drop = Math.max(0, node.pressurePSI - p);
                    return {
                        ...node,
                        pressurePSI: p,
                        pressureDropRate: drop > 0 ? drop * 60 : 0 // scale by 60 for rough PSI/s
                    };
                } else if (node.type === "ULTRASONIC") {
                    let ambientNoise = 10 + (state.compressorActive ? 2 : 0);
                    let signalStrength = ambientNoise + rmsValue;

                    let snr = signalStrength / ambientNoise;
                    let leakConf = isLeakActive ? Math.min(1, (signalStrength - ambientNoise) / 40) : 0;

                    let curConf = node.confidence || 0;
                    curConf += (leakConf - curConf) * 0.1; // Smooth confidence

                    return {
                        ...node,
                        rawAmplitude: signalStrength,
                        confidence: curConf,
                        status: curConf > 0.6 ? "WARNING" : "ONLINE",
                        featureVector: {
                            nodeId: node.id,
                            peakFrequency: isLeakActive ? leakFreq : baseCarrierFreq,
                            spectralEnergy: rmsValue * 1.5,
                            rmsAmplitude: rmsValue,
                            signalToNoiseRatio: snr,
                            timestamp: Date.now()
                        }
                    };
                }
                return node;
            });

            // 6. OVERALL LEAK STATE & CONFIDENCE
            const usNodes = updatedNodes.filter(n => n.type === "ULTRASONIC");
            const cloudConfidence = Math.max(...usNodes.map(n => n.confidence), 0);
            const leakStateStr = cloudConfidence > 0.8 ? "CRITICAL" : cloudConfidence > 0.4 ? "DETECTED" : "NORMAL";

            const newPressureHistory = [...state.pressureHistory.slice(1), newSystemPressure];
            const newWaveformHistory = [...state.waveformHistory.slice(1), rmsValue + 10]; // Added offset to match old UI amplitude

            set({
                compressorPressure: currentComp,
                currentSystemPressure: newSystemPressure,
                pipePressureDistribution: newPressureDist,
                flowVelocity: currentFlow,
                leakEvent: currentLeak,
                leakState: leakStateStr,
                leakLocation: currentLeakLoc,
                leakEnabled: currentLeakEnabled,
                leakActive: currentLeakActive,
                nodes: updatedNodes,
                ultrasonicSignalBuffer: signalBuffer,
                fftSpectrumData: newFftSpectrumData,
                fftData: newFftSpectrumData, // Fallback property
                pressureHistory: newPressureHistory,
                waveformHistory: newWaveformHistory,
                systemConfidence: 0.99 - (cloudConfidence * 0.3),
                processingDelayMs: 16.66 + Math.random() * 5
            });

            setTimeout(tick, 1000 / 60);
        };
        tick();
    },

    stopSimulation: () => {
        set({ simulationActive: false });
    },

    resolveLeak: () => set({ leakEvent: null, leakState: "NORMAL", leakLocation: null, leakEnabled: false })
}));

export default useLeaksonicStore;
