import useLeaksonicStore from "../store/useLeaksonicStore";

function CompressorControlPanel() {
    const {
        compressorActive,
        compressorTargetPressure,
        setCompressorActive,
        setCompressorPressure,
        currentSystemPressure,
        inletValveState,
        setInletValveState,
        middleValveState,
        setMiddleValveState,
        outletValveState,
        setOutletValveState
    } = useLeaksonicStore();

    return (
        <div className="mb-6 flex flex-col gap-3 flex-shrink-0 bg-[rgba(14,16,23,0.6)] backdrop-blur-sm border border-[rgba(0,240,255,0.2)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,240,255,0.05)]">
            <div className="flex justify-between items-center border-b border-[rgba(0,240,255,0.1)] pb-2 mb-1">
                <span className="font-mono text-[#00F0FF] text-[10px] tracking-widest uppercase">System Control</span>
                <span className="font-mono text-[9px] text-[#7A8899] uppercase tracking-wider">Air Compressor</span>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between font-mono text-xs">
                    <span className="text-[#7A8899]">Target Output</span>
                    <span className="text-[#DDE4EE]">{compressorTargetPressure} PSI</span>
                </div>
                <input
                    type="range"
                    min="80"
                    max="120"
                    value={compressorTargetPressure}
                    onChange={(e) => setCompressorPressure(Number(e.target.value))}
                    className="w-full accent-[#00F0FF] h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none outline-none cursor-pointer"
                    disabled={!compressorActive}
                />
            </div>

            <button
                onClick={() => setCompressorActive(!compressorActive)}
                className={`w-full py-2 mt-1 font-mono text-[10px] tracking-widest uppercase rounded border transition-all ${compressorActive
                    ? 'bg-[rgba(255,77,109,0.1)] text-[#FF4D6D] border-[#FF4D6D]/40 hover:bg-[rgba(255,77,109,0.2)] hover:shadow-[0_0_10px_rgba(255,77,109,0.2)]'
                    : 'bg-[rgba(6,214,160,0.1)] text-[#06D6A0] border-[#06D6A0]/40 hover:bg-[rgba(6,214,160,0.2)] hover:shadow-[0_0_10px_rgba(6,214,160,0.2)]'
                    }`}
            >
                {compressorActive ? 'SHUTDOWN MOTOR' : 'START MOTOR'}
            </button>

            {/* Valve Controls */}
            <div className="flex flex-col gap-3 border-t border-[rgba(0,240,255,0.1)] pt-3 mt-1">
                {/* Inlet Valve */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[10px] uppercase">
                        <span className="text-[#7A8899]">Inlet Valve</span>
                        <span className={inletValveState < 1 ? 'text-[#FFD60A]' : 'text-[#06D6A0]'}>{(inletValveState * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={inletValveState}
                        onChange={(e) => setInletValveState(Number(e.target.value))}
                        className="w-full accent-[#06D6A0] h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none outline-none cursor-pointer"
                    />
                </div>

                {/* Middle Valve */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[10px] uppercase">
                        <span className="text-[#7A8899]">Middle Valve</span>
                        <span className={middleValveState < 1 ? 'text-[#FFD60A]' : 'text-[#06D6A0]'}>{(middleValveState * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={middleValveState}
                        onChange={(e) => setMiddleValveState(Number(e.target.value))}
                        className="w-full accent-[#06D6A0] h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none outline-none cursor-pointer"
                    />
                </div>

                {/* Outlet Valve */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between font-mono text-[10px] uppercase">
                        <span className="text-[#7A8899]">Outlet Valve</span>
                        <span className={outletValveState < 1 ? 'text-[#FFD60A]' : 'text-[#06D6A0]'}>{(outletValveState * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={outletValveState}
                        onChange={(e) => setOutletValveState(Number(e.target.value))}
                        className="w-full accent-[#06D6A0] h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none outline-none cursor-pointer"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mt-1">
                <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] px-3 py-2 rounded flex gap-3 items-center w-full justify-between">
                    <span className="font-mono text-[#7A8899] text-[9px] uppercase">Sys Pressure</span>
                    <span className={`font-mono text-sm font-bold ${currentSystemPressure > 50 ? 'text-[#06D6A0]' : 'text-[#7A8899]'}`}>
                        {currentSystemPressure.toFixed(1)} PSI
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function LeakSonicLeftPanel() {
    const { nodes, leakEvent, processingDelayMs } = useLeaksonicStore();

    // Sort so ultrasonics are first, pressure at bottom
    // Oh wait, user asked for:
    // Pressure Sensor 01
    // Ultrasonic Node 01
    // Pressure Sensor 02
    // Let's sort them alphabetically by ID
    const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <CompressorControlPanel />

            {/* Header */}
            <div className="flex flex-col gap-1 mb-4 flex-shrink-0">
                <span className="font-mono text-[10px] tracking-widest text-[#4A9BB5] uppercase">
                    System Array
                </span>
                <div className="flex items-center justify-between">
                    <h2 className="text-[#DDE4EE] text-lg font-medium tracking-tight">
                        Sensor Network
                    </h2>
                    <span className="text-[#7A8899] font-mono text-[9px] uppercase tracking-wider bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">
                        DELAY: {processingDelayMs.toFixed(0)} ms
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {sortedNodes.map((node) => {
                    const isLeaking = node.status === "WARNING";
                    const statusColor = isLeaking ? "#FF4D6D" : node.status === "ONLINE" ? "#06D6A0" : "#5E6A7A";

                    return (
                        <div
                            key={node.id}
                            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg p-3 flex flex-col gap-2 transition-colors duration-300 relative overflow-hidden"
                            style={{
                                borderColor: isLeaking ? 'rgba(255, 77, 109, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                background: isLeaking ? 'rgba(255, 77, 109, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                            }}
                        >
                            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-2 mb-1">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full ${isLeaking ? 'animate-ping' : ''}`}
                                        style={{
                                            backgroundColor: statusColor,
                                            boxShadow: isLeaking ? `0 0 8px ${statusColor}` : 'none'
                                        }}
                                    />
                                    <span className="text-[#DDE4EE] text-xs font-bold font-mono tracking-tight">{node.id === "US-01" ? "Ultrasonic Node 01" : node.id === "PR-01" ? "Pressure Sensor 01" : node.id === "PR-02" ? "Pressure Sensor 02" : node.id}</span>
                                    <span className="text-[#7A8899] font-mono text-[8px] uppercase">{node.type} • {node.segment}</span>
                                </div>
                                <span
                                    className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                                    style={{
                                        color: statusColor,
                                        backgroundColor: `${statusColor}1A`,
                                    }}
                                >
                                    {node.status}
                                </span>
                            </div>

                            {node.type === "ULTRASONIC" && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[#7A8899] font-mono text-[9px] uppercase">Raw Amplitude</span>
                                            <span className="text-[#B4C0D2] font-mono text-[11px]">{node.rawAmplitude.toFixed(1)} <span className="text-[9px] text-[#7A8899]">dB</span></span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[#7A8899] font-mono text-[9px] uppercase">Peak Frequency</span>
                                            <span className="text-[#B4C0D2] font-mono text-[11px]">
                                                {node.featureVector ? (node.featureVector.peakFrequency / 1000).toFixed(1) : "0"} <span className="text-[9px] text-[#7A8899]">kHz</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* CNN Confidence Bar */}
                                    <div className="mt-1 flex flex-col gap-1">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[#7A8899] font-mono text-[8px] uppercase tracking-wide">CNN Edge Confidence</span>
                                            <span className="text-[#00F0FF] font-mono text-[10px]">{(node.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${node.confidence * 100}%`,
                                                    backgroundColor: isLeaking ? '#FF4D6D' : '#00F0FF',
                                                    boxShadow: `0 0 8px ${isLeaking ? '#FF4D6D' : '#00F0FF'}`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {node.type === "PRESSURE" && (
                                <div className="grid grid-cols-2 gap-2 py-1">
                                    <div className="flex flex-col">
                                        <span className="text-[#7A8899] font-mono text-[9px] uppercase">Internal Pressure</span>
                                        <span className={`font-mono text-[12px] font-bold ${node.pressurePSI < 95 ? 'text-[#FFD60A]' : 'text-[#06D6A0]'}`}>
                                            {node.pressurePSI.toFixed(2)} <span className="text-[9px] text-[#7A8899]">PSI</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[#7A8899] font-mono text-[9px] uppercase">Drop Rate</span>
                                        <span className={`font-mono text-[11px] ${node.pressureDropRate > 0.5 ? 'text-[#FF4D6D]' : 'text-[#B4C0D2]'}`}>
                                            -{node.pressureDropRate.toFixed(2)} <span className="text-[9px] text-[#7A8899]">PSI/s</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Leak Highlight Background Glow */}
                            {isLeaking && (
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,_rgba(255,77,109,0.1)_0%,_transparent_100%)] pointer-events-none" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Leak Action Button (simulates a manual override / fix) */}
            {leakEvent && leakEvent.intensity > 10 && (
                <button
                    onClick={() => useLeaksonicStore.getState().resolveLeak()}
                    className="mt-3 flex-shrink-0 w-full py-2 bg-[rgba(255,77,109,0.1)] border border-[#FF4D6D] rounded text-[#FF4D6D] font-mono text-[10px] uppercase hover:bg-[rgba(255,77,109,0.2)] transition-colors tracking-widest"
                >
                    Dispatch Maintenance Routine
                </button>
            )}
        </div>
    );
}
