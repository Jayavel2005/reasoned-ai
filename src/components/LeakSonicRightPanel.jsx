import useLeaksonicStore from "../store/useLeaksonicStore";
import { useEspTelemetry } from "../hooks/useEspTelemetry";

function SimpleSVGLineChart({ data, min, max, color, fill }) {
    if (!data || data.length === 0) return null;

    const w = 100;
    const h = 50;

    const range = max - min || 1;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * w;
        const clampedVal = Math.max(min, Math.min(max, val));
        const y = h - ((clampedVal - min) / range) * h;
        return `${x},${y}`;
    }).join(" ");

    return (
        <div className="w-full h-24 relative overflow-hidden bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.05)] rounded-lg">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                {/* Gradient Fill */}
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <polygon points={`0,${h} ${points} ${w},${h}`} fill={fill ? `url(#grad-${color})` : "none"} />
                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}

function FFTBarChart({ data, color }) {
    if (!data || data.length === 0) return null;

    const maxVal = Math.max(20, ...data);

    return (
        <div className="w-full h-24 flex items-end gap-[1px] bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.05)] rounded-lg p-2">
            {data.map((val, i) => {
                const heightPct = Math.min(100, Math.max(5, (val / maxVal) * 100));
                // Add a glow if the bar is very high
                return (
                    <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                            height: `${heightPct}%`,
                            backgroundColor: color,
                            boxShadow: heightPct > 80 ? `0 0 10px ${color}` : "none",
                            opacity: heightPct > 80 ? 1 : 0.6
                        }}
                    />
                );
            })}
        </div>
    );
}

export default function LeakSonicRightPanel() {
    const { telemetryCollapsed, setTelemetryCollapsed } = useLeaksonicStore();
    const { telemetry, connected, pressureHistory, waveformHistory, fftSpectrumData } = useEspTelemetry();

    let leakState = 'SYSTEM OPTIMAL';
    if (!connected) leakState = 'OFFLINE';
    else if (telemetry.leakDetected) leakState = 'CRITICAL';

    const leakActive = connected && telemetry.leakDetected;
    const systemConfidence = connected ? (telemetry.leakDetected ? 0.99 : 0.95) : 0;

    if (telemetryCollapsed) {
        return (
            <div className="flex flex-col h-full bg-[rgba(14,16,23,0.7)] backdrop-blur-md rounded-2xl p-2 border border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden items-center transition-all">
                <button
                    onClick={() => setTelemetryCollapsed(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors mb-4 group shrink-0"
                    title="Expand Telemetry"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#BD00FF] opacity-70 group-hover:opacity-100">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                <div className="flex flex-col items-center gap-6 mt-4 w-full opacity-60">
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-3 h-3 rounded-full animate-pulse blur-[2px] ${leakState === 'NORMAL' ? 'bg-[#00F0FF]' : 'bg-[#FF4D6D]'}`} />
                        <span className="font-mono flex flex-col items-center text-[8px] text-[#7A8899]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>TELEMETRY</span>
                    </div>

                    <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-[rgba(189,0,255,0.2)] to-transparent opacity-50 flex-1 my-2" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[rgba(14,16,23,0.7)] backdrop-blur-md rounded-2xl p-3 border border-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden transition-all">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-widest text-[#BD00FF] uppercase">
                        Telemetry
                    </span>
                    <h2 className="text-[#DDE4EE] text-base font-medium tracking-tight">
                        Signal Intelligence
                    </h2>
                </div>

                <button
                    onClick={() => setTelemetryCollapsed(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[rgba(255,255,255,0.1)] transition-colors group shrink-0"
                    title="Collapse Telemetry"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7A8899] group-hover:text-white transition-colors">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4">

                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-2 rounded-lg border border-[rgba(0,240,255,0.2)] bg-[rgba(0,240,255,0.05)] relative overflow-hidden">
                        <span className="text-[#7A8899] font-mono text-[9px] uppercase tracking-wider mb-0.5 z-10">Global Confidence</span>
                        <div className="flex items-baseline gap-1 z-10">
                            <span className="text-[#00F0FF] text-xl font-light tracking-tighter">{(systemConfidence * 100).toFixed(1)}</span>
                            <span className="text-[#00F0FF] text-[10px] font-mono">%</span>
                        </div>
                    </div>

                    <div className="flex flex-col p-2 rounded-lg border border-[rgba(255,77,109,0.2)] bg-[rgba(255,77,109,0.05)] relative overflow-hidden">
                        <span className="text-[#7A8899] font-mono text-[9px] uppercase tracking-wider mb-0.5 z-10">Status State</span>
                        <div className="flex items-baseline gap-1 z-10">
                            <span className="text-[12px] text-[#FF4D6D] font-mono tracking-tight mt-1 truncate">{leakState}</span>
                        </div>
                    </div>
                </div>

                {/* Leak Status Indicator */}
                <div className={`flex flex-col p-2 rounded-lg border relative overflow-hidden transition-colors ${leakActive ? 'border-[rgba(255,77,109,0.3)] bg-[rgba(255,77,109,0.05)]' : 'border-[rgba(6,214,160,0.3)] bg-[rgba(6,214,160,0.05)]'}`}>
                    <span className="text-[#7A8899] font-mono text-[9px] uppercase tracking-wider mb-0.5 z-10">Leak Status</span>
                    <div className="flex items-center gap-2 z-10 mt-1">
                        <div className={`w-2 h-2 rounded-full ${leakActive ? 'bg-[#FF4D6D] animate-ping shadow-[0_0_8px_#FF4D6D]' : 'bg-[#06D6A0] shadow-[0_0_8px_#06D6A0]'}`} />
                        <span className={`text-[12px] font-mono tracking-tight font-bold ${leakActive ? 'text-[#FF4D6D]' : 'text-[#06D6A0]'}`}>
                            {leakActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>
                </div>

                {/* Live Pressure Graph */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[#B4C0D2] font-mono text-[10px] uppercase tracking-widest shrink-0">Live Pressure (PSI)</span>
                        <span className="flex items-center gap-1.5 w-max justify-end shrink-0">
                            <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full animate-pulse shadow-[0_0_5px_#00F0FF]" />
                            <span className="text-[#00F0FF] font-mono text-[10px]">{pressureHistory[pressureHistory.length - 1]?.toFixed(1)}</span>
                        </span>
                    </div>
                    <SimpleSVGLineChart data={pressureHistory} min={40} max={110} color="#00F0FF" fill={true} />
                </div>

                {/* Ultrasonic Waveform Graph */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[#B4C0D2] font-mono text-[10px] uppercase tracking-widest shrink-0">Ultrasonic Amp (dB)</span>
                        <span className="flex items-center gap-1.5 w-max justify-end shrink-0">
                            <div className="w-1.5 h-1.5 bg-[#FFD60A] rounded-full animate-pulse shadow-[0_0_5px_#FFD60A]" />
                            <span className="text-[#FFD60A] font-mono text-[10px]">{waveformHistory[waveformHistory.length - 1]?.toFixed(1)}</span>
                        </span>
                    </div>
                    <SimpleSVGLineChart data={waveformHistory} min={0} max={100} color="#FFD60A" fill={true} />
                </div>

                {/* FFT Spectrum Analyzer */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[#B4C0D2] font-mono text-[10px] uppercase tracking-widest shrink-0">FFT Spectrum</span>
                        <span className="flex items-center gap-1.5 w-max justify-end shrink-0">
                            <div className="w-1.5 h-1.5 bg-[#BD00FF] rounded-full animate-pulse shadow-[0_0_5px_#BD00FF]" />
                            <span className="text-[#BD00FF] font-mono text-[10px]">REAL-TIME</span>
                        </span>
                    </div>
                    <FFTBarChart data={fftSpectrumData} color="#BD00FF" />
                </div>

            </div>
        </div>
    );
}
