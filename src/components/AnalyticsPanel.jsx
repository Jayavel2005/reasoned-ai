import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import {
    Activity, Database, Layers, Zap, TrendingUp,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────
   KPI DATA
────────────────────────────────────────────────────────────────────── */
const KPI_STATS = [
    {
        id: 1,
        label: "System Load",
        value: "32%",
        change: "+2.4%",
        icon: Activity,
        accent: "rgba(96,165,250,0.8)",       /* blue-400 */
        bg: "rgba(59,130,246,0.07)",
        border: "rgba(59,130,246,0.18)",
    },
    {
        id: 2,
        label: "Memory Alloc",
        value: "6.4 GB",
        change: "Stable",
        icon: Database,
        accent: "rgba(167,139,250,0.8)",      /* purple-400 */
        bg: "rgba(139,92,246,0.07)",
        border: "rgba(139,92,246,0.18)",
    },
    {
        id: 3,
        label: "Vector Nodes",
        value: "8,942",
        change: "+124",
        icon: Layers,
        accent: "rgba(52,211,153,0.8)",       /* emerald-400 */
        bg: "rgba(16,185,129,0.07)",
        border: "rgba(16,185,129,0.18)",
    },
];

/* Latency bar data — static snapshot to avoid infinite motion */
const LATENCY_BARS = [30, 45, 20, 60, 40, 70, 30, 50, 25, 65, 35, 20];

/* System events */
const EVENTS = [
    { msg: "Vector index optimization complete", time: "10:42:15", type: "success" },
    { msg: "Ingested 'Q3_Report.pdf'", time: "10:38:09", type: "info" },
    { msg: "Memory pressure stabilized", time: "09:15:22", type: "warning" },
];

const EVENT_COLORS = {
    success: "#00FFA3",
    warning: "#FFD600",
    info: "#00F0FF",
};

/* ──────────────────────────────────────────────────────────────────────
   ANALYTICS PANEL
────────────────────────────────────────────────────────────────────── */
export default function AnalyticsPanel() {
    const kpiRefs = useRef([]);
    const barRefs = useRef([]);

    /* One-time load-in: KPI cards stagger */
    useEffect(() => {
        const cards = kpiRefs.current.filter(Boolean);
        if (!cards.length) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                cards,
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.07, delay: 0.1 }
            );
        });
        return () => ctx.revert();
    }, []);

    /* One-time load-in: latency bars grow from 0 */
    useEffect(() => {
        const bars = barRefs.current.filter(Boolean);
        if (!bars.length) return;
        const ctx = gsap.context(() => {
            LATENCY_BARS.forEach((h, i) => {
                gsap.fromTo(
                    bars[i],
                    { scaleY: 0 },
                    { scaleY: 1, duration: 0.4, ease: "power2.out", delay: 0.18 + i * 0.03 }
                );
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "2px 0",     /* tiny pad so focus rings aren't clipped */
        }}>

            {/* ── Section: Header ── */}
            <h2 style={{
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(148,163,184,0.7)",
                flexShrink: 0,
            }}>
                <TrendingUp size={12} color="#00F0FF" />
                Live Analytics
            </h2>

            {/* ── Section: KPI Cards ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                {KPI_STATS.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.id}
                            ref={el => (kpiRefs.current[i] = el)}
                            style={{
                                opacity: 0, /* GSAP reveals */
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: `1px solid ${stat.border}`,
                                background: stat.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                            }}
                        >
                            {/* Icon + label */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    background: stat.bg,
                                    border: `1px solid ${stat.border}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <Icon size={13} color={stat.accent} />
                                </div>
                                <span style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: 10,
                                    color: "rgba(148,163,184,0.8)",
                                    letterSpacing: "0.05em",
                                    textTransform: "uppercase",
                                }}>
                                    {stat.label}
                                </span>
                            </div>

                            {/* Value + delta */}
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#FFFFFF",
                                    lineHeight: 1,
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 8,
                                    color: stat.accent,
                                    marginTop: 2,
                                    letterSpacing: "0.06em",
                                }}>
                                    {stat.change}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Section divider ── */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />

            {/* ── Section: Inference Latency ── */}
            <div style={{ flexShrink: 0 }}>
                <h3 style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9, letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "rgba(148,163,184,0.65)",
                    marginBottom: 10,
                }}>
                    <Zap size={10} color="#FFD600" />
                    Inference Latency
                </h3>

                {/* Static bar chart — load-in only, no infinite loop */}
                <div style={{
                    display: "flex", alignItems: "flex-end", gap: 3,
                    height: 64,
                    padding: "0 2px",
                }}>
                    {LATENCY_BARS.map((h, i) => (
                        <div
                            key={i}
                            ref={el => (barRefs.current[i] = el)}
                            style={{
                                flex: 1,
                                height: `${h}%`,
                                background: `rgba(255,214,0,${0.15 + (h / 100) * 0.25})`,
                                borderRadius: "2px 2px 0 0",
                                transformOrigin: "bottom",
                                /* no transition — GSAP handles entry only */
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ── Section divider ── */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />

            {/* ── Section: System Events ── */}
            <div style={{ flexShrink: 0 }}>
                <h3 style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9, letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "rgba(148,163,184,0.65)",
                    marginBottom: 10,
                }}>
                    System Events
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {EVENTS.map((log, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex", gap: 10, alignItems: "flex-start",
                                position: "relative",
                                paddingBottom: i < EVENTS.length - 1 ? 12 : 0,
                            }}
                        >
                            {/* Timeline connector */}
                            {i < EVENTS.length - 1 && (
                                <div style={{
                                    position: "absolute",
                                    left: 3.5, top: 14,
                                    bottom: 0,
                                    width: 1,
                                    background: "rgba(255,255,255,0.08)",
                                }} />
                            )}

                            {/* Dot */}
                            <div style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: EVENT_COLORS[log.type],
                                flexShrink: 0, marginTop: 3,
                                boxShadow: `0 0 6px ${EVENT_COLORS[log.type]}55`,
                            }} />

                            {/* Text */}
                            <div>
                                <div style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: 10.5,
                                    color: "rgba(200,212,225,0.85)",
                                    lineHeight: 1.4,
                                }}>
                                    {log.msg}
                                </div>
                                <div style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 8.5,
                                    color: "rgba(148,163,184,0.45)",
                                    marginTop: 2,
                                    letterSpacing: "0.04em",
                                }}>
                                    {log.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
