import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Zap } from "lucide-react";

/* Mock data — used when store returns nothing (offline / backend down) */
const MOCK_TRENDS = [
    { time: "1", faultlog: 12 },
    { time: "2", faultlog: 19 },
    { time: "3", faultlog: 9 },
    { time: "4", faultlog: 27 },
    { time: "5", faultlog: 15 },
    { time: "6", faultlog: 33 },
    { time: "7", faultlog: 21 },
    { time: "8", faultlog: 40 },
    { time: "9", faultlog: 29 },
    { time: "10", faultlog: 38 },
];

const CHART_H = 220; // explicit pixel height

export default function ParameterTrendsChart() {
    const [data, setData] = useState(MOCK_TRENDS);

    useEffect(() => {
        let live = true;
        (async () => {
            try {
                const { default: useCognitiveStore } = await import("../../store/useCognitiveStore");
                const store = useCognitiveStore.getState();
                if (store.analytics?.trends?.length > 0) {
                    if (live) setData(store.analytics.trends);
                } else {
                    await store.loadAnalytics().catch(() => { });
                    const fresh = useCognitiveStore.getState().analytics?.trends ?? [];
                    if (live && fresh.length > 0) setData(fresh);
                }
            } catch {
                /* keep mock data — no crash */
            }
        })();
        return () => { live = false; };
    }, []);

    return (
        <div
            className="glass-panel w-full rounded-2xl flex flex-col overflow-hidden"
            style={{ borderBottom: "1px solid #00F0FF", height: "100%" }}
        >
            {/* Header */}
            <div className="flex-none px-3 py-2 border-b border-white/5 bg-[#13141C]/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Waves</h3>
                    <Zap size={9} className="text-[#BD00FF]" fill="#BD00FF" />
                </div>
                <span className="text-[9px] font-mono text-[#00F0FF] bg-[#090A0F]/50 border border-white/10 rounded px-1.5 py-0.5">
                    Vibration
                </span>
            </div>

            {/* Chart — fills available flex height */}
            <div style={{ width: "100%", flex: 1, minHeight: 0, padding: "4px 2px 0" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 4, right: 4, left: -24, bottom: 4 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="time"
                            stroke="rgba(148,163,184,0.4)"
                            fontSize={8}
                            tickLine={false}
                            axisLine={false}
                            dy={4}
                            interval={1}
                            fontFamily="monospace"
                        />
                        <YAxis
                            stroke="rgba(148,163,184,0.4)"
                            fontSize={8}
                            tickLine={false}
                            axisLine={false}
                            dx={-2}
                            fontFamily="monospace"
                        />
                        <Tooltip
                            cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1, strokeDasharray: "4 4" }}
                            contentStyle={{
                                backgroundColor: "rgba(19, 20, 28, 0.88)",
                                borderColor: "rgba(255,255,255,0.1)",
                                borderRadius: 10,
                                fontSize: 10,
                                color: "#fff",
                                padding: 6,
                            }}
                            labelStyle={{ color: "#94A3B8", fontSize: 9, fontFamily: "monospace" }}
                        />
                        <Line
                            type="basis"
                            dataKey="faultlog"
                            stroke="#00F0FF"
                            strokeWidth={1.5}
                            dot={false}
                            activeDot={{ r: 3, stroke: "#fff", strokeWidth: 1, fill: "#00F0FF" }}
                            style={{ filter: "drop-shadow(0 0 4px rgba(0, 240, 255, 0.5))" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
