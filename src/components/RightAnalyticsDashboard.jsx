import { useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, CartesianGrid,
} from "recharts";
import { FileText, GitBranch, AlertTriangle, Zap, X, Loader2, Download } from "lucide-react";
import VectorPanel from "./VectorPanel";
import useCognitiveStore from "../store/useCognitiveStore";
import { generateAuditReport, generateBlueprint } from "../lib/api";

/* ──────────────────────────────────────────────────────────────────────
   OFFLINE / EMPTY FALLBACKS
   Shown only when the backend has not returned analytics data yet.
   Once the store populates analytics.faults / analytics.trends, the
   real data takes over automatically.
────────────────────────────────────────────────────────────────────── */
const FALLBACK_FAULTS = [
    { name: "Auth Timeout", count: 14 },
    { name: "Vector Mismatch", count: 9 },
    { name: "Index Stale", count: 7 },
    { name: "LLM Overload", count: 5 },
    { name: "Parse Error", count: 3 },
];

const FALLBACK_WAVES = [
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
   REPORT VIEWER MODAL
────────────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────────
   SYNTAX-HIGHLIGHTED JSON RENDERER
────────────────────────────────────────────────────────────────────── */
function JsonToken({ type, children }) {
    const colors = {
        key: "#79C0FF",
        string: "#A8FF78",
        number: "#FFD700",
        boolean: "#FF9F43",
        null: "#FF6B6B",
        punct: "rgba(200,212,225,0.35)",
    };
    return <span style={{ color: colors[type] || "#C8D4E0" }}>{children}</span>;
}

function syntaxHighlight(json) {
    // tokenise the JSON string into React spans
    const tokens = [];
    let i = 0;
    const str = typeof json === "string" ? json : JSON.stringify(json, null, 2);
    // Simple regex-based tokeniser
    const regex = /("(?:\\.|[^"\\])*")\s*(:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;
    let last = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
        if (match.index > last) {
            tokens.push(<span key={`w${i++}`} style={{ color: "#C8D4E0" }}>{str.slice(last, match.index)}</span>);
        }
        if (match[1]) {
            // string or key
            if (match[2] === ":") {
                tokens.push(<JsonToken key={i++} type="key">{match[1]}</JsonToken>);
                tokens.push(<JsonToken key={i++} type="punct">:</JsonToken>);
            } else {
                tokens.push(<JsonToken key={i++} type="string">{match[1]}</JsonToken>);
            }
        } else if (match[3] !== undefined) {
            tokens.push(<JsonToken key={i++} type="boolean">{match[3]}</JsonToken>);
        } else if (match[4] !== undefined) {
            tokens.push(<JsonToken key={i++} type="number">{match[4]}</JsonToken>);
        } else if (match[5]) {
            tokens.push(<JsonToken key={i++} type="punct">{match[5]}</JsonToken>);
        }
        last = regex.lastIndex;
    }
    if (last < str.length) {
        tokens.push(<span key={i++} style={{ color: "#C8D4E0" }}>{str.slice(last)}</span>);
    }
    return tokens;
}

function ReportModal({ title, content, mode, onClose }) {
    // mode: "markdown" | "json"
    const handleDownload = () => {
        const ext = mode === "json" ? "json" : "md";
        const mime = mode === "json" ? "application/json" : "text/markdown";
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Accent colors
    const accent = mode === "json" ? "#00F0FF" : "rgba(167,139,250,0.9)";
    const accentBg = mode === "json" ? "rgba(0,240,255,0.08)" : "rgba(139,92,246,0.08)";
    const accentBorder = mode === "json" ? "rgba(0,240,255,0.22)" : "rgba(139,92,246,0.25)";

    // For JSON mode, parse and pretty-print
    let jsonObj = null;
    let displayContent = content;
    if (mode === "json") {
        try {
            jsonObj = typeof content === "string" ? JSON.parse(content) : content;
            displayContent = JSON.stringify(jsonObj, null, 2);
        } catch {
            // not valid JSON, fall back to raw display
            displayContent = content;
        }
    }

    return (
        <div
            onClick={e => e.target === e.currentTarget && onClose()}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(5,6,12,0.82)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 24,
            }}
        >
            <div style={{
                width: "100%", maxWidth: 860, maxHeight: "90vh",
                background: "#0C0F16",
                border: `1px solid ${accentBorder}`,
                borderRadius: 14,
                boxShadow: `0 40px 90px rgba(0,0,0,0.75), 0 0 40px ${accentBg}`,
                display: "flex", flexDirection: "column",
                overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: `1px solid ${accentBorder}`,
                    flexShrink: 0,
                    background: `${accentBg}`,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: accent,
                            boxShadow: `0 0 8px ${accent}`,
                        }} />
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 10.5, letterSpacing: "0.09em",
                            textTransform: "uppercase",
                            color: accent,
                        }}>
                            {title}
                        </span>
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 8, letterSpacing: "0.06em",
                            color: "rgba(148,163,184,0.4)", textTransform: "uppercase",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 4, padding: "2px 6px",
                        }}>
                            {mode === "json" ? "JSON" : "MARKDOWN"}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={handleDownload}
                            style={{
                                background: accentBg,
                                border: `1px solid ${accentBorder}`,
                                borderRadius: 6, padding: "5px 10px",
                                display: "flex", alignItems: "center", gap: 5,
                                color: accent, cursor: "pointer",
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 9, letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                transition: "opacity 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                            <Download size={10} />
                            Export {mode === "json" ? ".json" : ".md"}
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: "none",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 6, padding: 6,
                                color: "#4E5A6A", cursor: "pointer",
                                display: "flex", alignItems: "center",
                                transition: "color 0.18s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "#C8D4E0"}
                            onMouseLeave={e => e.currentTarget.style.color = "#4E5A6A"}
                        >
                            <X size={13} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px" }}>
                    {mode === "json" && jsonObj !== null ? (
                        // Syntax-highlighted JSON
                        <pre style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11.5, lineHeight: 1.8,
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            margin: 0,
                            background: "rgba(0,0,0,0.25)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: 8, padding: 16,
                        }}>
                            {syntaxHighlight(displayContent)}
                        </pre>
                    ) : (
                        // Plain pre for markdown / fallback
                        <pre style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11.5, lineHeight: 1.75,
                            color: "#C8D4E0",
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            margin: 0,
                        }}>
                            {displayContent || "(No content returned — the backend may have returned an empty response.)"}
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: "10px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    flexShrink: 0,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 8.5, letterSpacing: "0.06em",
                        color: "rgba(148,163,184,0.3)", textTransform: "uppercase",
                    }}>
                        ReasonedAI · {new Date().toLocaleString()}
                    </span>
                    {mode === "json" && (
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 8, color: "rgba(0,240,255,0.35)",
                        }}>
                            {displayContent ? `${displayContent.split("\n").length} lines` : ""}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────
   RIGHT ANALYTICS DASHBOARD
────────────────────────────────────────────────────────────────────── */
export default function RightAnalyticsDashboard() {
    const { analytics, systemStatus, memoryFiles } = useCognitiveStore();

    const faults = analytics?.faults?.length ? analytics.faults : FALLBACK_FAULTS;
    const waves = analytics?.trends?.length
        ? analytics.trends.map(d => ({ t: d.time, v: d.faultlog }))
        : FALLBACK_WAVES;

    /* ── Report generation state ── */
    const [reportState, setReportState] = useState({ loading: null, modal: null, content: "", title: "", mode: "markdown" });
    const isConnected = systemStatus?.connection === "CONNECTED";
    const hasFiles = memoryFiles.length > 0;
    const canGenerate = isConnected && hasFiles;

    const handleGenerateReport = async (type) => {
        setReportState(s => ({ ...s, loading: type }));
        try {
            const res = type === "audit"
                ? await generateAuditReport()
                : await generateBlueprint();

            // ── Audit Report: extract the markdown string ──────────────────────
            // The backend may use any of these keys. Try them all before falling back.
            let content = "";
            let mode = "markdown";
            let title = "";

            if (type === "audit") {
                title = "Audit Report";
                mode = "markdown";
                // Try every field name the backend might use
                const candidate = [
                    res?.report,
                    res?.audit_report,
                    res?.content,
                    res?.text,
                    res?.markdown,
                    res?.result,
                    res?.message,
                    res?.output,
                ].find(v => typeof v === "string" && v.trim().length > 0);

                if (candidate) {
                    content = candidate;
                } else if (typeof res === "string" && res.trim().length > 0) {
                    // Entire response IS the string
                    content = res;
                } else {
                    // Last resort: pretty-print the whole object so user can see what arrived
                    content = JSON.stringify(res, null, 2);
                    mode = "json";
                    title = "Audit Report (raw response)";
                }

            } else {
                // ── Blueprint: the backend returns a JSON string inside the "blueprint" field ──
                title = "Agentic Blueprint";
                mode = "json";

                const rawBlueprint = [
                    res?.blueprint,
                    res?.result,
                    res?.content,
                    res?.output,
                    res?.text,
                ].find(v => v !== undefined && v !== null);

                if (typeof rawBlueprint === "string") {
                    // Could be JSON-encoded text or plain text
                    try {
                        const parsed = JSON.parse(rawBlueprint);
                        content = JSON.stringify(parsed, null, 2);
                    } catch {
                        // Not valid JSON — display as plain text
                        content = rawBlueprint;
                        mode = "markdown";
                    }
                } else if (rawBlueprint && typeof rawBlueprint === "object") {
                    content = JSON.stringify(rawBlueprint, null, 2);
                } else if (typeof res === "object") {
                    // Entire response object is the blueprint
                    content = JSON.stringify(res, null, 2);
                } else {
                    content = String(res ?? "(empty response)");
                    mode = "markdown";
                }
            }

            setReportState({ loading: null, modal: type, content, title, mode });

        } catch (err) {
            setReportState({
                loading: null, modal: "error",
                content: `Error generating report:\n\n${err.message}`,
                title: "Generation Failed",
                mode: "markdown",
            });
        }
    };

    return (
        <>
            <div
                className="custom-scrollbar"
                style={{
                    display: "flex", flexDirection: "column",
                    height: "100%", overflowY: "auto", overflowX: "hidden",
                    minHeight: 0, padding: "0 28px 20px 16px", scrollbarGutter: "stable",
                }}
            >
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.04);
                        background-clip: padding-box;
                        border: 2px solid transparent;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(255,255,255,0.12);
                        background-clip: padding-box;
                        border: 2px solid transparent;
                    }
                    @keyframes rai-spin { to { transform: rotate(360deg); } }
                `}</style>

                {/* ══ SECTION 1 — 3D Cognitive Field ══ */}
                <section style={{ padding: "16px 0 20px", flexShrink: 0 }}>
                    <SectionTitle label="3D Cognitive Field" />
                    <div style={{
                        height: 240, borderRadius: 10, overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.07)", background: "#101218",
                    }}>
                        <VectorPanel className="w-full h-full" />
                    </div>
                </section>

                {/* ══ GRID — Anomalies | Waves | Reports ══ */}
                <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
                    background: "rgba(255,255,255,0.07)",
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    flexShrink: 0,
                }}>

                    {/* ── Cell A: Anomalies ── */}
                    <div style={{ background: "#090A0F", padding: "16px 0 18px" }}>
                        <SectionTitle icon={AlertTriangle} label="Anomalies" iconColor="#BD00FF" />
                        {faults.length === 0 ? (
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "rgba(148,163,184,0.4)" }}>
                                No fault data
                            </span>
                        ) : (
                            <div style={{ height: 155, width: "100%", minWidth: 0, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={faults} layout="vertical" margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
                                        <XAxis type="number" hide padding={{ left: 5, right: 5 }} />
                                        <YAxis
                                            dataKey="name" type="category" width={66}
                                            tick={{ fontSize: 7.5, fill: "rgba(148,163,184,0.65)", fontFamily: "monospace" }}
                                            axisLine={false} tickLine={false} interval={0}
                                        />
                                        <Tooltip cursor={{ fill: "rgba(189,0,255,0.07)" }} contentStyle={tooltipStyle} itemStyle={{ color: "#BD00FF" }} />
                                        <Bar dataKey="count" barSize={4} radius={[0, 3, 3, 0]}>
                                            {faults.map((_, i) => (
                                                <Cell key={`f-${i}`} fill="#BD00FF" fillOpacity={Math.max(0.28, 1 - i * 0.13)} />
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
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: 7.5, color: "#00F0FF",
                                background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.14)",
                                borderRadius: 4, padding: "2px 5px",
                            }}>Vibr</span>
                        </div>
                        <div style={{ height: 155, width: "100%", minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={waves} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="t" stroke="rgba(148,163,184,0.3)" fontSize={7.5} tickLine={false} axisLine={false} dy={4} interval={2} fontFamily="monospace" padding={{ left: 10, right: 10 }} />
                                    <YAxis stroke="rgba(148,163,184,0.3)" fontSize={7.5} tickLine={false} axisLine={false} fontFamily="monospace" />
                                    <Tooltip cursor={{ stroke: "rgba(255,255,255,0.10)", strokeWidth: 1, strokeDasharray: "4 4" }} contentStyle={tooltipStyle} labelStyle={{ color: "#94A3B8", fontSize: 9, fontFamily: "monospace" }} />
                                    <Line type="basis" dataKey="v" stroke="#00F0FF" strokeWidth={1.5} dot={false}
                                        activeDot={{ r: 3, stroke: "#fff", strokeWidth: 1, fill: "#00F0FF" }}
                                        style={{ filter: "drop-shadow(0 0 3px rgba(0,240,255,0.30))" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ── Cell C: Reports (full width) ── */}
                    <div style={{ gridColumn: "1 / -1", background: "#090A0F", padding: "16px 0 20px" }}>
                        <SectionTitle icon={FileText} label="Reports" iconColor="rgba(167,139,250,0.7)" />

                        {!canGenerate && (
                            <p style={{
                                fontFamily: "'Inter', sans-serif", fontSize: 10.5,
                                color: "rgba(148,163,184,0.45)", lineHeight: 1.5, marginBottom: 12,
                            }}>
                                {!isConnected
                                    ? "Connect to the backend and upload documents to enable report generation."
                                    : "Upload at least one document to enable AI report generation."}
                            </p>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {/* Audit Report */}
                            <button
                                id="btn-audit-report"
                                disabled={!canGenerate || reportState.loading !== null}
                                onClick={() => handleGenerateReport("audit")}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    padding: "9px 10px", borderRadius: 7,
                                    border: `1px solid ${canGenerate ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.14)"}`,
                                    background: canGenerate ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.04)",
                                    color: canGenerate ? "rgba(167,139,250,0.9)" : "rgba(167,139,250,0.35)",
                                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5,
                                    letterSpacing: "0.09em", textTransform: "uppercase",
                                    cursor: canGenerate && reportState.loading === null ? "pointer" : "not-allowed",
                                    transition: "background 0.2s, border-color 0.2s",
                                }}
                                onMouseEnter={e => { if (canGenerate) e.currentTarget.style.background = "rgba(139,92,246,0.18)"; }}
                                onMouseLeave={e => { if (canGenerate) e.currentTarget.style.background = "rgba(139,92,246,0.10)"; }}
                            >
                                {reportState.loading === "audit"
                                    ? <><Loader2 size={9} style={{ animation: "rai-spin 1s linear infinite" }} />&nbsp;Generating…</>
                                    : <><FileText size={9} />&nbsp;Audit Report</>}
                            </button>

                            {/* Agentic Blueprint */}
                            <button
                                id="btn-blueprint"
                                disabled={!canGenerate || reportState.loading !== null}
                                onClick={() => handleGenerateReport("blueprint")}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    padding: "9px 10px", borderRadius: 7,
                                    border: `1px solid ${canGenerate ? "rgba(0,240,255,0.28)" : "rgba(0,240,255,0.10)"}`,
                                    background: canGenerate ? "rgba(0,240,255,0.07)" : "rgba(0,240,255,0.03)",
                                    color: canGenerate ? "rgba(0,240,255,0.85)" : "rgba(0,240,255,0.30)",
                                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 8.5,
                                    letterSpacing: "0.09em", textTransform: "uppercase",
                                    cursor: canGenerate && reportState.loading === null ? "pointer" : "not-allowed",
                                    transition: "background 0.2s, border-color 0.2s",
                                }}
                                onMouseEnter={e => { if (canGenerate) e.currentTarget.style.background = "rgba(0,240,255,0.13)"; }}
                                onMouseLeave={e => { if (canGenerate) e.currentTarget.style.background = "rgba(0,240,255,0.07)"; }}
                            >
                                {reportState.loading === "blueprint"
                                    ? <><Loader2 size={9} style={{ animation: "rai-spin 1s linear infinite" }} />&nbsp;Generating…</>
                                    : <><GitBranch size={9} />&nbsp;Blueprint</>}
                            </button>
                        </div>

                        {/* Status indicator */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            marginTop: 12, paddingTop: 10,
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                        }}>
                            <div style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: canGenerate ? "#5BA878" : isConnected ? "#C8A84B" : "#C0524A",
                                flexShrink: 0,
                                boxShadow: canGenerate ? "0 0 5px #5BA878" : "none",
                                transition: "background 0.4s",
                            }} />
                            <span style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                                letterSpacing: "0.08em", textTransform: "uppercase",
                                color: canGenerate ? "rgba(91,168,120,0.65)" : "rgba(192,82,74,0.55)",
                            }}>
                                {canGenerate
                                    ? `Ready · ${memoryFiles.length} doc${memoryFiles.length !== 1 ? "s" : ""} indexed`
                                    : !isConnected ? "Backend Offline" : "No documents indexed"}
                            </span>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Report Viewer Modal ── */}
            {reportState.modal && (
                <ReportModal
                    title={reportState.title}
                    content={reportState.content}
                    mode={reportState.mode}
                    onClose={() => setReportState({ loading: null, modal: null, content: "", title: "", mode: "markdown" })}
                />
            )}
        </>
    );
}
