import { useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";
import useCognitiveStore from "../../store/useCognitiveStore";

export default function RecurringFaultsChart() {
    const { analytics, loadingState, loadAnalytics } = useCognitiveStore();

    useEffect(() => {
        if (analytics.faults.length === 0) {
            loadAnalytics().catch(() => {});
        }
    }, [analytics.faults.length, loadAnalytics]);

    return (
        <div
            className="glass-panel w-full h-full rounded-2xl flex flex-col group relative overflow-hidden"
            style={{ borderBottom: "1px solid #BD00FF", boxShadow: "0 10px 40px -10px rgba(189, 0, 255, 0.1)" }}
        >
            <div className="flex-none px-3 py-2 border-b border-white/5 bg-[#13141C]/40 backdrop-blur-sm flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={10} className="text-[#BD00FF] drop-shadow-[0_0_5px_currentColor]" />
                    <h3 className="text-[9px] font-bold text-white uppercase tracking-widest drop-shadow-md">Anomalies</h3>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px] px-1 relative z-0">
                {loadingState.analytics ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center text-[#BD00FF] text-[10px] font-mono gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        LOADING FAULTS...
                    </div>
                ) : null}
                <div className="w-full h-[300px] min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.faults} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={70}
                                tick={{ fontSize: 8, fill: "#94A3B8", fontFamily: "monospace" }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                            />
                            <Tooltip
                                cursor={{ fill: "rgba(189, 0, 255, 0.1)" }}
                                contentStyle={{
                                    backgroundColor: "rgba(19, 20, 28, 0.9)",
                                    backdropFilter: "blur(10px)",
                                    borderColor: "rgba(189, 0, 255, 0.2)",
                                    borderRadius: "8px",
                                    fontSize: "10px",
                                    color: "#fff",
                                    boxShadow: "0 0 15px rgba(189, 0, 255, 0.3)",
                                }}
                                itemStyle={{ color: "#BD00FF" }}
                            />
                            <Bar dataKey="count" barSize={4} radius={[0, 2, 2, 0]}>
                                {analytics.faults.map((entry, index) => (
                                    <Cell
                                        key={`cell-${entry.name}-${index}`}
                                        fill="#BD00FF"
                                        style={{ filter: `opacity(${1 - index * 0.15}) drop-shadow(0 0 4px rgba(189, 0, 255, 0.8))` }}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
