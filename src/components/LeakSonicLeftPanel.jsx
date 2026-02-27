import useLeaksonicStore from "../store/useLeaksonicStore";
import { useEspTelemetry } from "../hooks/useEspTelemetry";

function SystemControlPanel() {
    const { telemetry, connected } = useEspTelemetry();

    return (
        <div className="mb-6 flex flex-col gap-3 flex-shrink-0 bg-[rgba(14,16,23,0.6)] backdrop-blur-sm border border-[rgba(0,240,255,0.2)] rounded-lg p-4 shadow-[0_4px_15px_rgba(0,240,255,0.05)]">
            <div className="flex justify-between items-center border-b border-[rgba(0,240,255,0.1)] pb-2 mb-1">
                <span className="font-mono text-[#00F0FF] text-[10px] tracking-widest uppercase">System Control</span>
                <span className="font-mono text-[9px] text-[#7A8899] uppercase tracking-wider flex items-center gap-1.5">
                    {connected ? 'LIVE TELEMETRY' : 'OFFLINE'}
                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#06D6A0] animate-pulse shadow-[0_0_5px_#06D6A0]' : 'bg-[#FF4D6D]'}`} />
                </span>
            </div>

            <div className="flex justify-between items-center mt-2">
                <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] px-3 py-4 rounded flex flex-col gap-1 items-center w-full justify-center text-center">
                    <span className="font-mono text-[#7A8899] text-[10px] uppercase tracking-widest">Sys Pressure</span>
                    <span className={`font-mono text-2xl font-bold ${telemetry.systemPressurePsi > 5 ? 'text-[#06D6A0]' : 'text-[#7A8899]'}`}>
                        {connected ? telemetry.systemPressurePsi.toFixed(1) : '---'} <span className="text-xs text-[#7A8899]">PSI</span>
                    </span>
                </div>
            </div>
            <div className="flex justify-between items-center mt-1">
                <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.02)] px-3 py-2 rounded flex gap-3 items-center w-full justify-center">
                    <span className="font-mono text-[#4A9BB5] text-[9px] uppercase tracking-widest">HARDWARE DATALINK ACTIVE</span>
                </div>
            </div>
        </div>
    );
}

export default function LeakSonicLeftPanel() {
    const { processingDelayMs } = useLeaksonicStore();
    const { telemetry, connected } = useEspTelemetry();

    // Mapping our real ESP32 points into the UI format
    const activeNodes = [
        {
            id: 'PR-01',
            name: 'Pressure Sensor 01',
            type: 'PRESSURE',
            location: 'INLET PIPE',
            value: telemetry.inletPressurePsi,
            metric: 'PSI',
            statusColor: connected ? '#06D6A0' : '#FF4D6D',
            statusText: connected ? 'ONLINE' : 'OFFLINE',
            isWarning: false
        },
        {
            id: 'US-01',
            name: 'Ultrasonic Node 01',
            type: 'ULTRASONIC',
            location: 'MAIN JUNCTION',
            value: telemetry.leakVoltage,
            metric: 'V',
            statusColor: !connected ? '#FF4D6D' : (telemetry.leakDetected ? '#FF4D6D' : '#06D6A0'),
            statusText: !connected ? 'OFFLINE' : (telemetry.leakDetected ? 'WARNING' : 'ONLINE'),
            isWarning: connected && telemetry.leakDetected,
            extra: telemetry.leakDetected ? 'LEAK DETECTED' : 'CLEAR'
        },
        {
            id: 'PR-02',
            name: 'Pressure Sensor 02',
            type: 'PRESSURE',
            location: 'OUTLET PIPE',
            value: telemetry.outletPressurePsi,
            metric: 'PSI',
            statusColor: connected ? '#06D6A0' : '#FF4D6D',
            statusText: connected ? 'ONLINE' : 'OFFLINE',
            isWarning: false
        }
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <SystemControlPanel />

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
                        POLL: 200ms
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {activeNodes.map((node) => {
                    const isLeaking = node.isWarning;
                    const statusColor = node.statusColor;

                    return (
                        <div
                            key={node.id}
                            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg p-3 flex flex-col gap-2 transition-colors duration-300 relative overflow-hidden"
                            style={{
                                borderLeft: `3px solid ${statusColor}`,
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
                                    <span className="text-[#DDE4EE] text-xs font-bold font-mono tracking-tight">{node.name}</span>
                                    <span className="text-[#7A8899] font-mono text-[8px] uppercase">{node.type} • {node.location}</span>
                                </div>
                                <span
                                    className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                                    style={{
                                        color: statusColor,
                                        backgroundColor: `${statusColor}1A`,
                                    }}
                                >
                                    {node.statusText}
                                </span>
                            </div>

                            {node.type === "ULTRASONIC" && (
                                <div className="grid grid-cols-2 gap-2 py-1">
                                    <div className="flex flex-col">
                                        <span className="text-[#7A8899] font-mono text-[9px] uppercase">Peak Amplitude</span>
                                        <span className={`font-mono text-[12px] font-bold ${node.isWarning ? 'text-[#FF4D6D]' : 'text-[#06D6A0]'}`}>
                                            {connected ? node.value.toFixed(2) : '---'} <span className="text-[9px] text-[#7A8899]">{node.metric}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[#7A8899] font-mono text-[9px] uppercase">Leak Classification</span>
                                        <span className={`font-mono text-[10px] mt-1 tracking-widest ${node.isWarning ? 'text-[#FFD60A]' : 'text-[#B4C0D2]'}`}>
                                            {connected ? node.extra : '---'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {node.type === "PRESSURE" && (
                                <div className="grid grid-cols-2 gap-2 py-1">
                                    <div className="flex flex-col">
                                        <span className="text-[#7A8899] font-mono text-[9px] uppercase">Internal Pressure</span>
                                        <span className={`font-mono text-[12px] font-bold ${node.value < 0.5 ? 'text-[#FFD60A]' : 'text-[#06D6A0]'}`}>
                                            {connected ? node.value.toFixed(2) : '---'} <span className="text-[9px] text-[#7A8899]">{node.metric}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[#7A8899] font-mono text-[9px] uppercase">Data Source</span>
                                        <span className="font-mono text-[10px] mt-1 text-[#B4C0D2] uppercase">
                                            {connected ? node.id.includes('1') ? 'pressure-node1.local' : 'pressure-node3.local' : 'OFFLINE'}
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

            {/* Hardware Status */}
            <div className={`mt-3 flex-shrink-0 w-full py-2 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[9px] tracking-widest text-center flex items-center justify-center gap-2 ${connected ? 'text-[#06D6A0]' : 'text-[#FF4D6D]'}`}>
                <div className={`w-1 h-1 rounded flex-shrink-0 ${connected ? 'bg-[#06D6A0]' : 'bg-[#FF4D6D]'}`} />
                {connected ? 'ESP32 TELEMETRY CONNECTED' : 'WAITING FOR SENSOR NETWORK'}
            </div>
        </div>
    );
}
