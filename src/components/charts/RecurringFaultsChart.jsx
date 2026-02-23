import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";

/* Mock data — used when store returns nothing (offline / backend down) */
const MOCK_FAULTS = [
    { name: "Auth Timeout", count: 14 },
    { name: "Vector Mismatch", count: 9 },
    { name: "Index Stale", count: 7 },
    { name: "LLM Overload", count: 5 },
    { name: "Parse Error", count: 3 },
];

const CHART_H = 220; // explicit pixel height — no 100% gymnastics

export default function RecurringFaultsChart() {
    const [data, setData] = useState(MOCK_FAULTS);

    /* Try to pull real analytics from store; fall back to mock on any error */
    useEffect(() => {
        let live = true;
        (async () => {
            try {
                const { default: useCognitiveStore } = await import("../../store/useCognitiveStore");
                const store = useCognitiveStore.getState();
                if (store.analytics?.faults?.length > 0) {
                    if (live) setData(store.analytics.faults);
                } else {
                    await store.loadAnalytics().catch(() => { });
                    const fresh = useCognitiveStore.getState().analytics?.faults ?? [];
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
            style={{ borderBottom: "1px solid #BD00FF", height: "100%" }}
        >
            {/* Header */}
            <div className="flex-none px-3 py-2 border-b border-white/5 bg-[#13141C]/40 flex items-center gap-2">
                <AlertTriangle size={10} className="text-[#BD00FF]" />
                <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">Anomalies</h3>
            </div>

            {/* Chart — fills available flex height */}
            <div style={{ width: "100%", flex: 1, minHeight: 0, padding: "4px 4px 0" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={80}
                            tick={{ fontSize: 8, fill: "#94A3B8", fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(189, 0, 255, 0.08)" }}
                            contentStyle={{
                                backgroundColor: "rgba(19, 20, 28, 0.92)",
                                borderColor: "rgba(189, 0, 255, 0.2)",
                                borderRadius: 8,
                                fontSize: 10,
                                color: "#fff",
                            }}
                            itemStyle={{ color: "#BD00FF" }}
                        />
                        <Bar dataKey="count" barSize={5} radius={[0, 2, 2, 0]}>
                            {data.map((entry, i) => (
                                <Cell
                                    key={`cell-${entry.name}-${i}`}
                                    fill="#BD00FF"
                                    fillOpacity={Math.max(0.35, 1 - i * 0.12)}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
