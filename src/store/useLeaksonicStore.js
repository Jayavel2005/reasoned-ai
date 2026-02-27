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
        // Mock simulation removed
        // System is now driven by real ESP32 Telemetry
        if (get().simulationActive) return;
        set({ simulationActive: true });
    },

    stopSimulation: () => {
        set({ simulationActive: false });
    },

    resolveLeak: () => set({ leakEvent: null, leakState: "NORMAL", leakLocation: null, leakEnabled: false })
}));

export default useLeaksonicStore;
