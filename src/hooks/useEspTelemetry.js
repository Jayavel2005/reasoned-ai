import { useState, useEffect, useRef } from "react";
import { fetchEspTelemetry } from "../services/espTelemetryService";
import { computeFFTMagnitude } from "../utils/fft";

export function useEspTelemetry() {
    const [telemetry, setTelemetry] = useState({
        inletPressurePsi: 0,
        outletPressurePsi: 0,
        inletVoltage: 0,
        outletVoltage: 0,
        leakVoltage: 0,
        leakDetected: false,
        systemPressurePsi: 0,
    });
    const [connected, setConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(0);

    const [pressureHistory, setPressureHistory] = useState(Array(50).fill(0));
    const [waveformHistory, setWaveformHistory] = useState(Array(50).fill(0));
    const [fftSpectrumData, setFftSpectrumData] = useState(Array(128).fill(0));

    const leakVoltageBuffer = useRef(new Float64Array(256));
    const lastLeakVoltage = useRef(0);
    const fftSmoothBuffer = useRef(Array(128).fill(0));

    useEffect(() => {
        let isActive = true;
        let timerId = null;

        const poll = async () => {
            const start = Date.now();
            const data = await fetchEspTelemetry();

            if (!isActive) return;

            if (data && data.connected) {
                setTelemetry({
                    inletPressurePsi: data.inletPressurePsi,
                    outletPressurePsi: data.outletPressurePsi,
                    inletVoltage: data.inletVoltage,
                    outletVoltage: data.outletVoltage,
                    leakVoltage: data.leakVoltage,
                    leakDetected: data.leakDetected,
                    systemPressurePsi: data.systemPressurePsi,
                });
                setConnected(true);
                setLastUpdate(data.lastUpdate);

                lastLeakVoltage.current = data.leakVoltage;

                setPressureHistory(prev => [...prev.slice(1), data.systemPressurePsi]);
                setWaveformHistory(prev => [...prev.slice(1), data.leakVoltage]);
            } else {
                setConnected(false);
            }

            const elapsed = Date.now() - start;
            const delay = Math.max(0, 200 - elapsed);
            timerId = setTimeout(poll, delay);
        };

        poll();

        return () => {
            isActive = false;
            if (timerId) clearTimeout(timerId);
        };
    }, []);

    // 10 FPS FFT Loop
    useEffect(() => {
        let isActive = true;
        const fftInterval = setInterval(() => {
            if (!isActive) return;

            // Shift buffer and add latest leakVoltage
            const newBuffer = new Float64Array(256);
            newBuffer.set(leakVoltageBuffer.current.slice(1));

            // Add a bit of noise to avoid flatline errors in FFT if signal is completely static
            const noise = (Math.random() - 0.5) * 0.01;
            newBuffer[255] = lastLeakVoltage.current + noise;
            leakVoltageBuffer.current = newBuffer;

            // Compute FFT
            const realFftMagnitudes = computeFFTMagnitude(newBuffer);

            // Map to 128 bins for UI
            const newFft = Array(128).fill(0);
            for (let i = 0; i < 128; i++) {
                const v1 = realFftMagnitudes[i * 2] || 0;
                const v2 = realFftMagnitudes[i * 2 + 1] || 0;
                const val = isNaN(v1) || isNaN(v2) ? 0 : (v1 + v2) / 2.0;

                // Exponential smoothing
                fftSmoothBuffer.current[i] = fftSmoothBuffer.current[i] + (val - fftSmoothBuffer.current[i]) * 0.3;
                newFft[i] = fftSmoothBuffer.current[i];
            }

            setFftSpectrumData(newFft);
        }, 100);

        return () => {
            isActive = false;
            clearInterval(fftInterval);
        };
    }, []);

    return { telemetry, connected, lastUpdate, pressureHistory, waveformHistory, fftSpectrumData };
}
