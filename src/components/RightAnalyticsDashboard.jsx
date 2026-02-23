import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, CartesianGrid,
} from "recharts";
import { FileText, GitBranch, AlertTriangle, Zap } from "lucide-react";
import VectorPanel from "./VectorPanel";
import useCognitiveStore from "../store/useCognitiveStore";

/* ──────────────────────────────────────────────────────────────────────
   STATIC DATA (mock — replaced by store when backend is live)
────────────────────────────────────────────────────────────────────── */
const MOCK_FAULTS = [
    { name: "Auth Timeout", count: 14 },
    { name: "Vector Mismatch", count: 9 },
    { name: "Index Stale", count: 7 },
    { name: "LLM Overload", count: 5 },
    { name: "Parse Error", count: 3 },
];

const MOCK_WAVES = [
    { t: "1", v: 12 }, { t: "2", v: 19 }, { t: "3", v: 9 },
    { t: "4", v: 27 }, { t: "5", v: 15 }, { t: "6", v: 33 },
    { t: "7", v: 21 }, { t: "8", v: 40 }, { t: "9", v: 29 },
    { t: "10", v: 38 },
];

/* ──────────────────────────────────────────────────────────────────────
   SHARED SECTION HEADER
────────────────────────────────────────────────────────────────────── */
function SectionTitle({ icon: Icon, label, iconColor = "rgba(148,163,184,0.6)" }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            {Icon && <Icon size={11} color={iconColor} />}
            <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(148,163,184,0.6)",
            }}>
                {label}
            </span>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   TOOLTIP STYLE (shared for recharts)
────────────────────────────────────────────────────────────────────── */
const tooltipStyle = {
    backgroundColor: "rgba(13,16,23,0.95)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    fontSize: 10,
    color: "#fff",
    padding: "4px 8px",
};

/* ──────────────────────────────────────────────────────────────────────
   RIGHT ANALYTICS DASHBOARD
   Layout:
     ┌──────────────────────────┐
     │   3D Cognitive Field     │  fixed 240px
     ├─────────────┬────────────┤
     │  Anomalies  │   Waves    │  2-col grid, 160px charts
     ├─────────────┴────────────┤
     │   Reports (full width)   │
     └──────────────────────────┘
────────────────────────────────────────────────────────────────────── */
export default function RightAnalyticsDashboard() {
    const { analytics } = useCognitiveStore();

    const faults = analytics?.faults?.length ? analytics.faults : MOCK_FAULTS;
    const waves = analytics?.trends?.length
        ? analytics.trends.map(d => ({ t: d.time, v: d.faultlog }))
        : MOCK_WAVES;

    return (
        <div
            className="custom-scrollbar"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: 0,
                padding: "0 28px 20px 16px", /* Significant right spacing for scrollbar clearance */
                scrollbarGutter: "stable",
            }}
        >
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.04);
                    background-clip: padding-box;
                    border: 2px solid transparent; /* Gives thumb empty space around it */
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.12);
                    background-clip: padding-box;
                    border: 2px solid transparent;
                }
            `}</style>

            {/* ══ SECTION 1 — 3D Cognitive Field ══ */}
            <section style={{ padding: "16px 0 20px", flexShrink: 0 }}>
                <SectionTitle label="3D Cognitive Field" />
                <div style={{
                    height: 240,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "#101218",
                }}>
                    <VectorPanel className="w-full h-full" />
                </div>
            </section>

            {/* ══ GRID — Anomalies | Waves + Reports ══ */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                background: "rgba(255,255,255,0.07)",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
            }}>

                {/* ── Cell A: Anomalies ── */}
                <div style={{ background: "#090A0F", padding: "16px 0 18px" }}>
                    <SectionTitle icon={AlertTriangle} label="Anomalies" iconColor="#BD00FF" />

                    {faults.length === 0 ? (
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 9.5, color: "rgba(148,163,184,0.4)",
                        }}>
                            No fault data
                        </span>
                    ) : (
                        <div style={{ height: 155, width: "100%", minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={faults}
                                    layout="vertical"
                                    margin={{ top: 2, right: 10, left: 0, bottom: 2 }}
                                >
                                    <XAxis type="number" hide padding={{ left: 5, right: 5 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={66}
                                        tick={{ fontSize: 7.5, fill: "rgba(148,163,184,0.65)", fontFamily: "monospace" }}
                                        axisLine={false} tickLine={false} interval={0}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "rgba(189,0,255,0.07)" }}
                                        contentStyle={tooltipStyle}
                                        itemStyle={{ color: "#BD00FF" }}
                                    />
                                    <Bar dataKey="count" barSize={4} radius={[0, 3, 3, 0]}>
                                        {faults.map((_, i) => (
                                            <Cell
                                                key={`f-${i}`}
                                                fill="#BD00FF"
                                                fillOpacity={Math.max(0.28, 1 - i * 0.13)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* ── Cell B: Waves ── */}
                <div style={{ background: "#090A0F", padding: "16px 0 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <SectionTitle icon={Zap} label="Waves" iconColor="#BD00FF" />
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 7.5, color: "#00F0FF",
                            background: "rgba(0,240,255,0.06)",
                            border: "1px solid rgba(0,240,255,0.14)",
                            borderRadius: 4, padding: "2px 5px",
                        }}>
                            Vibr
                        </span>
                    </div>

                    <div style={{ height: 155, width: "100%", minWidth: 0, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={waves} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis
                                    dataKey="t"
                                    stroke="rgba(148,163,184,0.3)"
                                    fontSize={7.5} tickLine={false} axisLine={false}
                                    dy={4} interval={2} fontFamily="monospace"
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis
                                    stroke="rgba(148,163,184,0.3)"
                                    fontSize={7.5} tickLine={false} axisLine={false}
                                    fontFamily="monospace"
                                />
                                <Tooltip
                                    cursor={{ stroke: "rgba(255,255,255,0.10)", strokeWidth: 1, strokeDasharray: "4 4" }}
                                    contentStyle={tooltipStyle}
                                    labelStyle={{ color: "#94A3B8", fontSize: 9, fontFamily: "monospace" }}
                                />
                                <Line
                                    type="basis" dataKey="v"
                                    stroke="#00F0FF" strokeWidth={1.5}
                                    dot={false}
                                    activeDot={{ r: 3, stroke: "#fff", strokeWidth: 1, fill: "#00F0FF" }}
                                    style={{ filter: "drop-shadow(0 0 3px rgba(0,240,255,0.30))" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Cell C: Reports ── */}
                <div style={{ gridColumn: "1 / -1", background: "#090A0F", padding: "16px 0 20px" }}>
                    <SectionTitle icon={FileText} label="Reports" iconColor="rgba(167,139,250,0.7)" />

                    <p style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 10.5,
                        color: "rgba(148,163,184,0.48)",
                        lineHeight: 1.5,
                        marginBottom: 12,
                    }}>
                        Cognitive report generation requires an active backend connection.
                    </p>

                    {/* Buttons in their own 2-col sub-grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button disabled style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "8px 10px", borderRadius: 7,
                            border: "1px solid rgba(139,92,246,0.20)",
                            background: "rgba(139,92,246,0.05)",
                            color: "rgba(167,139,250,0.45)",
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 8.5, letterSpacing: "0.09em",
                            textTransform: "uppercase", cursor: "not-allowed", opacity: 0.65,
                        }}>
                            <FileText size={9} />
                            Audit Report
                        </button>

                        <button disabled style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "8px 10px", borderRadius: 7,
                            border: "1px solid rgba(0,240,255,0.15)",
                            background: "rgba(0,240,255,0.04)",
                            color: "rgba(0,240,255,0.38)",
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 8.5, letterSpacing: "0.09em",
                            textTransform: "uppercase", cursor: "not-allowed", opacity: 0.65,
                        }}>
                            <GitBranch size={9} />
                            Blueprint
                        </button>
                    </div>

                    {/* Status */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginTop: 12, paddingTop: 10,
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#C0524A", flexShrink: 0 }} />
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 8, letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "rgba(192,82,74,0.60)",
                        }}>
                            Backend Offline
                        </span>
                    </div>
                </div>

            </div>

        </div>
    );
}
