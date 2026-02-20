import { useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, Loader2 } from "lucide-react";
import useCognitiveStore from "../../store/useCognitiveStore";

export default function ParameterTrendsChart() {
    const { analytics, loadingState, loadAnalytics } = useCognitiveStore();

    useEffect(() => {
        if (analytics.trends.length === 0) {
            loadAnalytics().catch(() => {});
        }
    }, [analytics.trends.length, loadAnalytics]);

    return (
        <div
            className="glass-panel w-full h-full rounded-2xl flex flex-col group overflow-hidden"
            style={{ borderBottom: "1px solid #00F0FF", boxShadow: "0 10px 40px -10px rgba(0, 240, 255, 0.1)" }}
        >
            <div className="flex-1 flex flex-col relative z-10 min-h-0">
                <div className="flex-none h-8 px-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-[#13141C]/30 border-b border-white/5">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[9px] font-bold text-white uppercase tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">Waves</h3>
                            <Zap size={10} className="text-[#BD00FF]" fill="#BD00FF" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#090A0F]/50 border border-white/10 rounded px-1.5 py-0.5 backdrop-blur-sm">
                        <span className="text-[9px] font-mono text-[#00F0FF]">Vibration</span>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-[300px] px-1 py-1 relative">
                    {loadingState.analytics ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center text-[#00F0FF] text-[10px] font-mono gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            LOADING TRENDS...
                        </div>
                    ) : null}
                    <div className="w-full h-[300px] min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.trends} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="rgba(148, 163, 184, 0.5)"
                                    fontSize={8}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={5}
                                    interval={2}
                                    fontFamily="monospace"
                                />
                                <YAxis
                                    stroke="rgba(148, 163, 184, 0.5)"
                                    fontSize={8}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-3}
                                    fontFamily="monospace"
                                />
                                <Tooltip
                                    cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1, strokeDasharray: "4 4" }}
                                    contentStyle={{
                                        backgroundColor: "rgba(19, 20, 28, 0.8)",
                                        backdropFilter: "blur(12px)",
                                        borderColor: "rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                        fontSize: "10px",
                                        color: "#fff",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                                        padding: "6px",
                                    }}
                                    labelStyle={{ color: "#94A3B8", marginBottom: "2px", fontSize: "9px", fontFamily: "monospace" }}
                                />
                                <Line
                                    type="basis"
                                    dataKey="faultlog"
                                    stroke="#00F0FF"
                                    strokeWidth={1.5}
                                    dot={false}
                                    activeDot={{ r: 3, stroke: "#fff", strokeWidth: 1, fill: "#00F0FF" }}
                                    style={{ filter: "drop-shadow(0 0 4px #00F0FF80)" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
