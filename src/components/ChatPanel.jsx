import {
    useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import { Send, Cpu } from "lucide-react";
import { gsap } from "gsap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useCognitiveStore from "../store/useCognitiveStore";
import ReasoningContextBar from "./ReasoningContextBar";
import { cleanLLMOutput } from "../utils/cleanLLMOutput";

/* ══════════════════════════════════════════════════════════════════════
   NEURAL NETWORK BACKGROUND
   A static SVG layout + GSAP slow per-node drift.
   Opacity max ~8%, no rapid motion.
══════════════════════════════════════════════════════════════════════ */

/** Deterministic pseudo-random (no Math.random so SSR-safe) */
const seeded = (seed) => {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
};

const NODES = (() => {
    const r = seeded(42);
    return Array.from({ length: 18 }, (_, i) => ({
        id: i,
        cx: r() * 100,   // % units
        cy: r() * 100,
        // each node gets its own slow drift budget
        driftX: (r() - 0.5) * 3.2,   // ±1.6%
        driftY: (r() - 0.5) * 3.2,
        dur: 14 + r() * 10,          // 14-24s
        r: 1.2 + r() * 1.4,        // radius 1.2–2.6
    }));
})();

const EDGES = (() => {
    const threshold = 32; // % distance to connect
    const edges = [];
    for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
            const dx = NODES[i].cx - NODES[j].cx;
            const dy = NODES[i].cy - NODES[j].cy;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) {
                edges.push({ i, j, key: `${i}-${j}` });
            }
        }
    }
    return edges;
})();

function NeuralBackground({ engineState }) {
    const svgRef = useRef(null);
    const nodeRefs = useRef([]);    // individual <circle> refs
    const edgeRefs = useRef([]);    // individual <line> refs
    const sweepRef = useRef(null);  // horizontal sweep line
    const idleCtxRef = useRef(null);

    /* ── Idle: slow per-node drift, looping yoyo ── */
    useEffect(() => {
        const nodes = nodeRefs.current.filter(Boolean);
        if (!nodes.length) return;

        const ctx = gsap.context(() => {
            nodes.forEach((el, i) => {
                const n = NODES[i];
                const svgW = svgRef.current?.clientWidth ?? 600;
                const svgH = svgRef.current?.clientHeight ?? 400;
                gsap.to(el, {
                    attr: {
                        cx: `${n.cx + n.driftX}%`,
                        cy: `${n.cy + n.driftY}%`,
                    },
                    duration: n.dur,
                    ease: "sine.inOut",
                    yoyo: true,
                    repeat: -1,
                    delay: i * 0.6,
                });
            });
        }, svgRef);

        idleCtxRef.current = ctx;
        return () => ctx.revert();
    }, []); // eslint-disable-line

    /* ── Thinking: pulse nodes + sweep line ── */
    useEffect(() => {
        const nodes = nodeRefs.current.filter(Boolean);
        const sweep = sweepRef.current;

        if (engineState === "thinking") {
            // gentle opacity pulse on nodes
            nodes.forEach((el, i) => {
                gsap.to(el, {
                    opacity: 0.55,
                    duration: 1.1,
                    ease: "sine.inOut",
                    yoyo: true,
                    repeat: -1,
                    delay: i * 0.08,
                    id: `pulse_${i}`,
                });
            });
            // horizontal sweep line
            if (sweep) {
                gsap.fromTo(sweep,
                    { attr: { x1: "0%", x2: "0%" }, opacity: 0 },
                    {
                        attr: { x1: "100%", x2: "100%" },
                        opacity: 1,
                        duration: 2.8,
                        ease: "power1.inOut",
                        repeat: -1,
                        repeatDelay: 0.6,
                        id: "sweep",
                    }
                );
            }
        } else {
            // stop pulses & sweep, reset to idle opacity
            nodes.forEach((el, i) => {
                gsap.killTweensOf(el);
                gsap.to(el, { opacity: 1, duration: 0.6, ease: "power1.out" });
            });
            if (sweep) {
                gsap.killTweensOf(sweep);
                gsap.to(sweep, { opacity: 0, duration: 0.4 });
            }
        }
    }, [engineState]);

    return (
        <svg
            ref={svgRef}
            aria-hidden="true"
            style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                overflow: "hidden", pointerEvents: "none",
                zIndex: 0,
                opacity: engineState === "thinking" ? 0.1 : 0.07,
                transition: "opacity 1.2s ease",
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
        >
            {/* Edges */}
            {EDGES.map(({ i, j, key }, idx) => (
                <line
                    key={key}
                    ref={el => (edgeRefs.current[idx] = el)}
                    x1={`${NODES[i].cx}%`} y1={`${NODES[i].cy}%`}
                    x2={`${NODES[j].cx}%`} y2={`${NODES[j].cy}%`}
                    stroke="#4A9BB5"
                    strokeWidth="0.18"
                    strokeOpacity="0.55"
                />
            ))}

            {/* Nodes */}
            {NODES.map((n, i) => (
                <circle
                    key={`bg-node-${n.id}`}
                    ref={el => (nodeRefs.current[i] = el)}
                    cx={`${n.cx}%`}
                    cy={`${n.cy}%`}
                    r={n.r * 0.35}
                    fill="#4A9BB5"
                    fillOpacity="0.85"
                />
            ))}

            {/* Thinking sweep line */}
            <line
                ref={sweepRef}
                x1="0%" y1="0%" x2="0%" y2="100%"
                stroke="#4A9BB5"
                strokeWidth="0.25"
                strokeOpacity="0.5"
                style={{ opacity: 0 }}
            />
        </svg>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   RADIAL GLOW (Layer 3 — behind input area)
══════════════════════════════════════════════════════════════════════ */
function RadialGlow({ active }) {
    return (
        <div
            aria-hidden="true"
            style={{
                position: "absolute",
                bottom: 0, left: "50%",
                transform: "translateX(-50%)",
                width: "70%", height: 220,
                background: "radial-gradient(ellipse at 50% 100%, rgba(74,155,181,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
                zIndex: 1,
                opacity: active ? 1 : 0.55,
                transition: "opacity 0.8s ease",
            }}
        />
    );
}

/* ══════════════════════════════════════════════════════════════════════
   RESPONDING FLASH (brief top-edge highlight)
══════════════════════════════════════════════════════════════════════ */
function useRespondingFlash(flashRef, engineState) {
    useEffect(() => {
        if (engineState !== "responding") return;
        const el = flashRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.timeline()
                .fromTo(el,
                    { opacity: 0, scaleX: 0 },
                    { opacity: 1, scaleX: 1, duration: 0.4, ease: "power2.out" }
                )
                .to(el, { opacity: 0, duration: 0.55, ease: "power1.in" });
        });
        return () => ctx.revert();
    }, [engineState, flashRef]);
}

/* ══════════════════════════════════════════════════════════════════════
   ENGINE ICON (replaces Sparkles)
══════════════════════════════════════════════════════════════════════ */
function EngineIcon({ thinking }) {
    const iconRef = useRef(null);

    useEffect(() => {
        const el = iconRef.current;
        if (!el) return;
        if (thinking) {
            gsap.to(el, {
                boxShadow: "0 0 14px rgba(74,155,181,0.35)",
                duration: 1.0,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut",
            });
        } else {
            gsap.killTweensOf(el);
            gsap.to(el, {
                boxShadow: "0 0 6px rgba(74,155,181,0.12)",
                duration: 0.6,
                ease: "power1.out",
            });
        }
    }, [thinking]);

    return (
        <div
            ref={iconRef}
            style={{
                padding: 7,
                background: "rgba(74,155,181,0.08)",
                border: "1px solid rgba(74,155,181,0.22)",
                borderRadius: 8,
                display: "flex", alignItems: "center",
                boxShadow: "0 0 6px rgba(74,155,181,0.12)",
                transition: "background 0.4s",
            }}
        >
            <Cpu size={15} color="#4A9BB5" />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   TYPING INDICATOR (GSAP, no framer-motion)
══════════════════════════════════════════════════════════════════════ */
function TypingIndicator() {
    const ref = useRef(null);
    const dots = useRef([]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 6 },
                { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
            );
            dots.current.forEach((d, i) => {
                if (!d) return;
                gsap.to(d, {
                    y: -3, opacity: 1,
                    duration: 0.5, ease: "sine.inOut",
                    yoyo: true, repeat: -1,
                    delay: i * 0.16,
                });
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={ref}
            style={{
                display: "flex", alignItems: "center", gap: 8,
                marginLeft: 48, marginBottom: 16,
                opacity: 0,
            }}
        >
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                    <span
                        key={`typing-dot-${i}`}
                        ref={el => (dots.current[i] = el)}
                        style={{
                            width: 4, height: 4, borderRadius: "50%",
                            background: "#4A9BB5", opacity: 0.5,
                            display: "block",
                        }}
                    />
                ))}
            </div>
            <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px", color: "#4A9BB5",
                letterSpacing: "0.06em", opacity: 0.7,
            }}>
                reasoning…
            </span>
        </div>
    );
}

/* InlineMarkdown is now handled by ReactMarkdown */

function ReasoningBlock({ content }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{
            margin: "6px 0 10px",
            border: "1px solid rgba(74,155,181,0.18)",
            borderLeft: "2px solid rgba(74,155,181,0.4)",
            borderRadius: "2px 8px 8px 2px",
            overflow: "hidden",
            background: "rgba(74,155,181,0.03)",
        }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px",
                    background: open ? "rgba(74,155,181,0.07)" : "rgba(74,155,181,0.04)",
                    border: "none", cursor: "pointer",
                    borderBottom: open ? "1px solid rgba(74,155,181,0.12)" : "none",
                    transition: "background 0.2s",
                }}
            >
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", letterSpacing: "0.10em", textTransform: "uppercase",
                    color: "rgba(74,155,181,0.6)",
                }}>
                    ◈ Reasoning trace
                </span>
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(74,155,181,0.35)",
                    marginLeft: "auto",
                }}>
                    {open ? "▲ collapse" : "▼ expand"}
                </span>
            </button>
            {open && (
                <div style={{ padding: "10px 14px" }}>
                    <pre style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "11px", lineHeight: 1.7,
                        color: "rgba(180,195,210,0.6)",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                        margin: 0,
                    }}>
                        {content.trim()}
                    </pre>
                </div>
            )}
        </div>
    );
}

function MarkdownRenderer({ text }) {
    if (!text) return null;

    // ── 0. Strip / Prepare ───────────────────────────────────────────
    const cleaned = cleanLLMOutput(text);

    // ── 1. Segment reasoning and markdown ────────────────────────────
    const blocks = [];
    const reasoningRegex = /<REASONING>([\s\S]*?)<\/REASONING>/gi;
    let cursor = 0;
    let rm;
    while ((rm = reasoningRegex.exec(cleaned)) !== null) {
        if (rm.index > cursor) {
            blocks.push({ type: "md", content: cleaned.slice(cursor, rm.index) });
        }
        blocks.push({ type: "reasoning", content: rm[1] });
        cursor = reasoningRegex.lastIndex;
    }
    if (cursor < cleaned.length) {
        blocks.push({ type: "md", content: cleaned.slice(cursor) });
    }

    // ── 2. Render ────────────────────────────────────────────────────
    return (
        <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13.5px", lineHeight: 1.7,
            color: "#D4DDE8",
            letterSpacing: "0.01em",
        }}>
            {blocks.map((block, bi) => {
                if (block.type === "reasoning") {
                    return <ReasoningBlock key={`block-reasoning-${bi}`} content={block.content} />;
                }

                return (
                    <ReactMarkdown
                        key={`block-md-${bi}`}
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => <p style={{ margin: "0 0 12px", color: "#D4DDE8" }}>{children}</p>,
                            h1: ({ children }) => <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "20px 0 10px", color: "#E8EDF3", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px" }}>{children}</h1>,
                            h2: ({ children }) => <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "18px 0 8px", color: "#E8EDF3", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "4px" }}>{children}</h2>,
                            h3: ({ children }) => <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "14px 0 6px", color: "#C8D4E0" }}>{children}</h3>,
                            h4: ({ children }) => <h4 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", fontWeight: 600, margin: "10px 0 4px", color: "rgba(74,155,181,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</h4>,
                            li: ({ children }) => <li style={{ marginBottom: "4px", color: "#C8D4E0" }}>{children}</li>,
                            ul: ({ children }) => <ul style={{ margin: "10px 0 14px 20px", listStyleType: "disc" }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ margin: "10px 0 14px 20px", listStyleType: "decimal" }}>{children}</ol>,
                            code: ({ node, inline, children, ...props }) => (
                                <code
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        background: "rgba(255,255,255,0.06)",
                                        padding: inline ? "2px 5px" : "12px",
                                        borderRadius: 4,
                                        fontSize: inline ? "11px" : "12px",
                                        display: inline ? "inline" : "block",
                                        overflowX: "auto",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        color: "#4A9BB5",
                                        margin: inline ? 0 : "12px 0",
                                    }}
                                    {...props}
                                >
                                    {children}
                                </code>
                            ),
                            table: ({ children }) => (
                                <div style={{ overflowX: "auto", margin: "16px 0" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden" }}>
                                        {children}
                                    </table>
                                </div>
                            ),
                            thead: ({ children }) => <thead style={{ background: "rgba(74,155,181,0.1)", borderBottom: "2px solid rgba(74,155,181,0.2)" }}>{children}</thead>,
                            th: ({ children }) => <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4A9BB5" }}>{children}</th>,
                            td: ({ children }) => <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "12.5px" }}>{children}</td>,
                            blockquote: ({ children }) => <blockquote style={{ margin: "16px 0", padding: "8px 20px", borderLeft: "3px solid #4A9BB5", background: "rgba(74,155,181,0.04)", color: "#C8D4E0", fontStyle: "italic" }}>{children}</blockquote>,
                            hr: () => <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", margin: "20px 0" }} />,
                        }}
                    >
                        {block.content}
                    </ReactMarkdown>
                );
            })}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   MESSAGE BUBBLE
══════════════════════════════════════════════════════════════════════ */
function MessageBubble({ message }) {
    const rowRef = useRef(null);
    const isUser = message.sender === "user";

    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, []); // eslint-disable-line

    return (
        <div
            ref={rowRef}
            style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                width: "100%",
                marginBottom: 20,
                opacity: 0,              /* GSAP reveals */
            }}
        >
            <div style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-start",
                gap: 12,
                maxWidth: "84%",
            }}>
                {/* Avatar */}
                <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    flexShrink: 0,
                    background: isUser
                        ? "rgba(189,0,255,0.10)"
                        : "rgba(74,155,181,0.10)",
                    border: `1px solid ${isUser ? "rgba(189,0,255,0.25)" : "rgba(74,155,181,0.25)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    {isUser ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(189,0,255,0.7)" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(74,155,181,0.7)" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    )}
                </div>

                {/* Bubble */}
                <div style={{
                    padding: message.isAutoSummary ? "0" : "11px 16px",
                    borderRadius: isUser ? "14px 2px 14px 14px" : "2px 14px 14px 14px",
                    background: isUser
                        ? "rgba(189,0,255,0.07)"
                        : message.isAutoSummary
                            ? "transparent"
                            : "rgba(255,255,255,0.03)",
                    border: isUser
                        ? "1px solid rgba(189,0,255,0.20)"
                        : message.isAutoSummary
                            ? "none"
                            : "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    position: "relative",
                    overflow: "hidden",
                    width: "100%",
                }}>
                    {/* Top sheen — non-summary only */}
                    {!message.isAutoSummary && (
                        <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 1,
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                        }} />
                    )}

                    {/* ── Auto-summary: special card layout ── */}
                    {message.isAutoSummary ? (
                        <div style={{
                            background: "rgba(74,155,181,0.04)",
                            border: "1px solid rgba(74,155,181,0.16)",
                            borderLeft: "2px solid rgba(74,155,181,0.45)",
                            borderRadius: "2px 10px 10px 2px",
                            overflow: "hidden",
                        }}>
                            {/* Banner header */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "10px 14px",
                                borderBottom: "1px solid rgba(74,155,181,0.1)",
                                background: "rgba(74,155,181,0.06)",
                            }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: "50%",
                                    background: "#5BA878",
                                    boxShadow: "0 0 6px #5BA878",
                                    flexShrink: 0,
                                }} />
                                <span style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: "9px", letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    color: "rgba(91,168,120,0.7)",
                                }}>
                                    Knowledge Base · Analysis Complete
                                </span>
                                <div style={{ flex: 1 }} />
                                <span style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: "8px", color: "rgba(74,155,181,0.35)",
                                    letterSpacing: "0.05em",
                                }}>
                                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                            {/* Summary body */}
                            <div style={{ padding: "12px 14px" }}>
                                <MarkdownRenderer text={cleanLLMOutput(message.text)} />
                            </div>
                        </div>
                    ) : (
                        /* ── Regular message ── */
                        isUser ? (
                            <p style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "13px", lineHeight: 1.65,
                                color: "#D4DDE8",
                                margin: 0, whiteSpace: "pre-wrap",
                                letterSpacing: "0.01em",
                            }}>
                                {message.text}
                            </p>
                        ) : (
                            /* AI — full markdown render */
                            <MarkdownRenderer text={message.text} />
                        )
                    )}

                    {/* AI metadata — skip for auto-summary (sources shown in banner) */}
                    {!isUser && !message.isAutoSummary && (message.intent || (Array.isArray(message.sources) && message.sources.length > 0)) && (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                            {message.intent && (
                                <span style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: "9px", color: "rgba(189,0,255,0.6)",
                                    letterSpacing: "0.06em", textTransform: "uppercase",
                                }}>
                                    Intent: {message.intent}
                                </span>
                            )}
                            {Array.isArray(message.sources) && message.sources.length > 0 && (
                                <span style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: "9px", color: "rgba(74,155,181,0.6)",
                                    letterSpacing: "0.04em",
                                }}>
                                    Sources: {message.sources.map(s => s?.source ?? s).join(", ")}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   SYSTEM SUMMARY BUBBLE
   Rendered when message.sender === 'system'.
   Uses message.summary produced by generateDocumentIntelligenceSummary().
══════════════════════════════════════════════════════════════════════ */

const BulletRow = ({ label, value }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 0" }}>
        <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px", color: "rgba(74,155,181,0.45)",
            flexShrink: 0, marginTop: 1, userSelect: "none",
        }}>▸</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
            <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px", color: "rgba(148,163,184,0.55)",
                letterSpacing: "0.04em", flexShrink: 0,
            }}>{label}:</span>
            <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px", color: "rgba(212,221,232,0.82)",
                lineHeight: 1.5,
            }}>{value}</span>
        </div>
    </div>
);

const BoolRow = ({ label, value }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0" }}>
        <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px", color: "rgba(74,155,181,0.45)",
            flexShrink: 0, userSelect: "none",
        }}>▸</span>
        <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px", color: "rgba(148,163,184,0.55)",
            letterSpacing: "0.04em",
        }}>{label}:</span>
        <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
            color: value ? "rgba(91,168,120,0.82)" : "rgba(192,82,74,0.72)",
            letterSpacing: "0.07em", marginLeft: 4,
        }}>{value ? "YES" : "NO"}</span>
    </div>
);

function SystemSummaryBubble({ message }) {
    const ref = useRef(null);
    const s = message.summary ?? {};

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, []); // eslint-disable-line

    return (
        <div ref={ref} style={{ opacity: 0, width: "100%", marginBottom: 24 }}>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(74,155,181,0.10)" }} />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(74,155,181,0.38)",
                    letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
                }}>
                    System · Document Intelligence
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(74,155,181,0.10)" }} />
            </div>

            {/* Card */}
            <div style={{
                background: "rgba(74,155,181,0.035)",
                border: "1px solid rgba(74,155,181,0.13)",
                borderLeft: "2px solid rgba(74,155,181,0.32)",
                borderRadius: "2px 8px 8px 2px",
                padding: "14px 16px",
                position: "relative", overflow: "hidden",
            }}>
                {/* Top sheen */}
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 1,
                    background: "linear-gradient(90deg, rgba(74,155,181,0.28), transparent 55%)",
                }} />

                {/* Title */}
                <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 600,
                    color: "rgba(212,221,232,0.88)", letterSpacing: "0.01em", marginBottom: 12,
                }}>
                    Document Intelligence Summary
                </div>

                {/* Bullets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <BulletRow
                        label="Documents indexed"
                        value={`${s.totalFiles ?? 0} ${(s.totalFiles ?? 0) === 1 ? "file" : "files"} · ${s.totalChunks ?? 0} chunks`}
                    />
                    {(s.fileTypes?.length ?? 0) > 0 && (
                        <BulletRow label="Types detected" value={s.fileTypes.join(", ")} />
                    )}
                    {(s.docTypes?.length ?? 0) > 0 && (
                        <BulletRow label="Document categories" value={s.docTypes.join(" · ")} />
                    )}
                    {(s.themes?.length ?? 0) > 0 && (
                        <BulletRow label="Primary themes" value={s.themes.join(", ")} />
                    )}
                    <BulletRow label="System type" value={s.systemType ?? "Undetermined"} />
                    <BoolRow label="Decision rules present" value={!!s.hasDecisionRules} />
                    <BoolRow label="Human-in-loop indicators" value={!!s.hasHumanInLoop} />
                    {(s.constraints?.length ?? 0) > 0 && (
                        <BulletRow label="Notable constraints" value={s.constraints.join(" · ")} />
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: 12, paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "center", gap: 6,
                }}>
                    <span style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: "rgba(91,168,120,0.7)", flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "9px", color: "rgba(91,168,120,0.56)",
                        letterSpacing: "0.07em", textTransform: "uppercase",
                    }}>
                        Semantic memory indexed · System ready to reason
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════════════════ */
function EmptyState() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.3 }
            );
        });
        return () => ctx.revert();
    }, []);

    return (
        <div ref={ref} style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", gap: 14, opacity: 0,
            userSelect: "none", pointerEvents: "none",
        }}>
            {/* Minimal logo mark */}
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="20" cy="20" r="19" stroke="rgba(74,155,181,0.2)" strokeWidth="0.8" />
                <circle cx="20" cy="20" r="2.4" fill="rgba(74,155,181,0.5)" />
                {[[12, 12], [28, 12], [20, 8], [12, 28], [28, 28], [20, 32]].map(([x, y], i) => (
                    <g key={`logo-point-${i}`}>
                        <circle cx={x} cy={y} r="1.6" fill="rgba(74,155,181,0.25)" />
                        <line x1="20" y1="20" x2={x} y2={y}
                            stroke="rgba(74,155,181,0.12)" strokeWidth="0.6" />
                    </g>
                ))}
            </svg>

            <div style={{ textAlign: "center" }}>
                <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px", fontWeight: 500,
                    color: "rgba(255,255,255,0.25)",
                    letterSpacing: "0.01em",
                }}>
                    Reasoning Engine at rest
                </div>
                <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "10px", color: "rgba(74,155,181,0.35)",
                    marginTop: 5, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                }}>
                    Submit a query to begin
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   SEND BUTTON
══════════════════════════════════════════════════════════════════════ */
function SendButton({ onClick, disabled }) {
    const ref = useRef(null);
    const ripRef = useRef(null);

    const handleClick = () => {
        if (disabled) return;
        /* micro ripple */
        const el = ripRef.current;
        if (el) {
            gsap.fromTo(el,
                { scale: 0, opacity: 0.5 },
                { scale: 2.2, opacity: 0, duration: 0.45, ease: "power1.out" }
            );
        }
        onClick?.();
    };

    return (
        <button
            ref={ref}
            onClick={handleClick}
            disabled={disabled}
            title="Submit query"
            aria-label="Submit query"
            style={{
                position: "relative",
                padding: 8,
                background: disabled ? "rgba(74,155,181,0.06)" : "rgba(74,155,181,0.14)",
                border: `1px solid ${disabled ? "rgba(74,155,181,0.12)" : "rgba(74,155,181,0.32)"}`,
                borderRadius: 8,
                color: disabled ? "rgba(74,155,181,0.3)" : "#4A9BB5",
                cursor: disabled ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
                transition: "background 0.2s, border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => {
                if (disabled) return;
                e.currentTarget.style.background = "rgba(74,155,181,0.24)";
                e.currentTarget.style.borderColor = "rgba(74,155,181,0.5)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = disabled ? "rgba(74,155,181,0.06)" : "rgba(74,155,181,0.14)";
                e.currentTarget.style.borderColor = disabled ? "rgba(74,155,181,0.12)" : "rgba(74,155,181,0.32)";
            }}
        >
            {/* Ripple */}
            <span
                ref={ripRef}
                aria-hidden="true"
                style={{
                    position: "absolute", inset: 0,
                    borderRadius: 8,
                    background: "rgba(74,155,181,0.25)",
                    transform: "scale(0)", opacity: 0,
                    pointerEvents: "none",
                }}
            />
            <Send size={15} />
        </button>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   SUGGESTIONS
   Hardcoded exploration paths — shown once, after first system message.
══════════════════════════════════════════════════════════════════════ */
const SUGGESTION_GROUPS = [
    {
        label: "Informational",
        color: "rgba(74,155,181,0.7)",
        bg: "rgba(74,155,181,0.06)",
        border: "rgba(74,155,181,0.18)",
        items: [
            "Explain the primary workflow described in the documents.",
            "Summarize the compliance reporting structure.",
            "Describe how data ingestion operates.",
        ],
    },
    {
        label: "Analytical",
        color: "rgba(200,168,75,0.7)",
        bg: "rgba(200,168,75,0.05)",
        border: "rgba(200,168,75,0.18)",
        items: [
            "Evaluate the automation level of this system.",
            "Identify recurring decision patterns.",
            "Detect human-in-loop dependencies.",
        ],
    },
    {
        label: "Advisory",
        color: "rgba(189,0,255,0.6)",
        bg: "rgba(189,0,255,0.05)",
        border: "rgba(189,0,255,0.16)",
        items: [
            "How can this semi-automated system evolve into an agentic architecture?",
            "What operational risks are currently present?",
            "Recommend improvements for compliance tracking.",
        ],
    },
];

function SuggestionsBlock({ onSelect }) {
    const containerRef = useRef(null);
    const chipRefs = useRef([]);

    /* Staggered entry */
    useEffect(() => {
        const chips = chipRefs.current.filter(Boolean);
        if (!chips.length) return;
        const ctx = gsap.context(() => {
            /* Container title fade */
            gsap.fromTo(containerRef.current,
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
            );
            /* Chips stagger */
            gsap.fromTo(chips,
                { opacity: 0, y: 6 },
                {
                    opacity: 1, y: 0,
                    duration: 0.28, ease: "power2.out",
                    stagger: 0.05,
                    delay: 0.15,
                }
            );
        });
        return () => ctx.revert();
    }, []);

    let chipIdx = 0;

    return (
        <div
            ref={containerRef}
            style={{ opacity: 0, marginBottom: 20 }}
        >
            {/* Section title */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
            }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(255,255,255,0.22)",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    whiteSpace: "nowrap",
                }}>
                    Suggested Exploration Paths
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Groups */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {SUGGESTION_GROUPS.map(group => (
                    <div key={`suggest-group-${group.label}`}>
                        {/* Group label */}
                        <div style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "9px", letterSpacing: "0.1em",
                            textTransform: "uppercase", marginBottom: 8,
                            color: group.color,
                        }}>
                            {group.label}
                        </div>
                        {/* Chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            {group.items.map((text) => {
                                const idx = chipIdx++;
                                return (
                                    <button
                                        key={`suggest-item-${text}`}
                                        ref={el => (chipRefs.current[idx] = el)}
                                        onClick={() => onSelect(text)}
                                        style={{
                                            opacity: 0,           /* GSAP reveals */
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: "11px", lineHeight: 1.4,
                                            color: "rgba(200,212,225,0.78)",
                                            background: group.bg,
                                            border: `1px solid ${group.border}`,
                                            borderRadius: 20,
                                            padding: "5px 13px",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s, color 0.18s",
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = "rgba(74,155,181,0.12)";
                                            e.currentTarget.style.borderColor = "rgba(74,155,181,0.38)";
                                            e.currentTarget.style.boxShadow = "0 0 10px rgba(74,155,181,0.14)";
                                            e.currentTarget.style.color = "rgba(212,230,245,0.95)";
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = group.bg;
                                            e.currentTarget.style.borderColor = group.border;
                                            e.currentTarget.style.boxShadow = "none";
                                            e.currentTarget.style.color = "rgba(200,212,225,0.78)";
                                        }}
                                    >
                                        {text}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   INPUT AREA  (controlled — value/onChange lifted to ChatPanel)
══════════════════════════════════════════════════════════════════════ */
function InputArea({ value, onChange, onSubmit, disabled }) {
    const wrapRef = useRef(null);
    const canSend = value.trim().length > 0 && !disabled;

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
        }
    };

    const onFocus = () => {
        const el = wrapRef.current;
        if (!el) return;
        gsap.to(el, {
            boxShadow: "0 0 0 1px rgba(74,155,181,0.25), 0 6px 24px rgba(0,0,0,0.4)",
            borderColor: "rgba(74,155,181,0.3)",
            duration: 0.24, ease: "power2.out",
        });
    };
    const onBlur = () => {
        const el = wrapRef.current;
        if (!el) return;
        gsap.to(el, {
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            borderColor: "rgba(255,255,255,0.08)",
            duration: 0.28, ease: "power1.out",
        });
    };

    return (
        <div
            ref={wrapRef}
            style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(13,16,23,0.8)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 14px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                backdropFilter: "blur(12px)",
                position: "relative",
            }}
        >
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Submit a cognitive query…"
                disabled={disabled}
                style={{
                    flex: 1,
                    background: "none", border: "none", outline: "none",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px", color: "#C8D4E0",
                    letterSpacing: "0.01em",
                    caretColor: "#4A9BB5",
                    opacity: disabled ? 0.4 : 1,
                }}
            />
            <SendButton onClick={onSubmit} disabled={!canSend} />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   FOLLOW-UP GENERATOR
   Client-side only. Extracts themes from the AI response
   and builds 4–5 structured follow-up questions.
══════════════════════════════════════════════════════════════════════ */

/** Extract the most significant noun-phrase fragment from free text */
function extractTopic(text) {
    if (!text) return "this topic";
    // Strip markdown-style formatting
    const clean = text.replace(/[*_`#>\[\]]/g, " ").replace(/\s+/g, " ").trim();
    // Pull the first sentence (max 120 chars)
    const first = clean.split(/[.!?]/)[0]?.trim() ?? clean;
    // Try to isolate a key subject: longest word-sequence between 3-6 words
    const words = first.split(" ").filter(w => w.length > 3);
    if (words.length === 0) return "this topic";
    const phrase = words.slice(0, Math.min(4, words.length)).join(" ").toLowerCase();
    return phrase || "this topic";
}

/** Lightweight term-frequency scorer to surface important concepts */
function topTerms(text, n = 3) {
    const stop = new Set([
        "the", "and", "for", "are", "this", "that", "with",
        "from", "have", "been", "also", "can", "will", "may",
        "which", "they", "their", "when", "than", "such",
        "into", "its", "not", "but", "all", "was", "used",
    ]);
    const freq = {};
    (text ?? "")
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 4 && !stop.has(w))
        .forEach(w => { freq[w] = (freq[w] ?? 0) + 1; });
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([w]) => w);
}

/**
 * generateFollowUps(responseText)
 * Returns an array of 4-5 question strings.
 * Questions are templated but filled with terms extracted from the response.
 */
export function generateFollowUps(responseText) {
    if (!responseText?.trim()) return [];

    const topic = extractTopic(responseText);
    const terms = topTerms(responseText, 3);
    const t0 = terms[0] ?? topic;
    const t1 = terms[1] ?? "related components";
    const t2 = terms[2] ?? "the system";

    const questions = [
        /* 1. Clarifying */
        `Can you elaborate on how ${t0} is defined or measured within this context?`,

        /* 2. Analytical deepening */
        `What are the key dependencies between ${t0} and ${t1}?`,

        /* 3. Risk / constraint */
        `What failure modes or constraints could emerge from the current approach to ${t0}?`,

        /* 4. Advisory / improvement */
        `How should ${t2} evolve to handle increased scale or complexity around ${t0}?`,
    ];

    /* 5. Optional edge-case — include if response is substantial (> 200 chars) */
    if (responseText.length > 200) {
        questions.push(
            `What edge cases or exception paths are not yet accounted for in the described ${t1} behavior?`
        );
    }

    return questions;
}

/* ──────────────────────────────────────────────────────────────────────
   FOLLOW-UP BLOCK COMPONENT
────────────────────────────────────────────────────────────────────── */
function FollowUpBlock({ questions, onSelect }) {
    const containerRef = useRef(null);
    const chipRefs = useRef([]);

    useEffect(() => {
        const chips = chipRefs.current.filter(Boolean);
        if (!chips.length) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(containerRef.current,
                { opacity: 0, y: 6 },
                { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
            );
            gsap.fromTo(chips,
                { opacity: 0, y: 5 },
                {
                    opacity: 1, y: 0,
                    duration: 0.24, ease: "power2.out",
                    stagger: 0.045, delay: 0.1,
                }
            );
        });
        return () => ctx.revert();
    }, [questions]); // re-animate when new questions arrive

    if (!questions?.length) return null;

    return (
        <div
            ref={containerRef}
            style={{ opacity: 0, margin: "10px 0 24px" }}
        >
            {/* Header divider */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
            }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(200,168,75,0.45)",
                    letterSpacing: "0.11em", textTransform: "uppercase",
                    whiteSpace: "nowrap",
                }}>
                    Follow-up Exploration
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
            </div>

            {/* Chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 680 }}>
                {questions.map((q, idx) => (
                    <button
                        key={`followup-${idx}`}
                        ref={el => (chipRefs.current[idx] = el)}
                        onClick={() => onSelect(q)}
                        style={{
                            opacity: 0,          /* GSAP reveals */
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "11.5px",
                            lineHeight: 1.45,
                            color: "rgba(200,212,225,0.75)",
                            background: "rgba(200,168,75,0.04)",
                            border: "1px solid rgba(200,168,75,0.14)",
                            borderLeft: "2px solid rgba(200,168,75,0.30)",
                            borderRadius: "2px 8px 8px 2px",
                            padding: "7px 14px",
                            cursor: "pointer",
                            transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s, color 0.18s",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(74,155,181,0.09)";
                            e.currentTarget.style.borderColor = "rgba(74,155,181,0.32)";
                            e.currentTarget.style.boxShadow = "0 0 8px rgba(74,155,181,0.10)";
                            e.currentTarget.style.color = "rgba(212,230,245,0.92)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(200,168,75,0.04)";
                            e.currentTarget.style.borderColor = "rgba(200,168,75,0.14)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.color = "rgba(200,212,225,0.75)";
                        }}
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   PANEL HEADER
══════════════════════════════════════════════════════════════════════ */
function PanelHeader({ engineState, connection }) {
    const stateColor = {
        idle: "#5BA878",
        thinking: "#C8A84B",
        responding: "#4A9BB5",
    }[engineState] ?? "#5BA878";

    const stateLabel = {
        idle: connection === "CONNECTED" ? "READY" : (connection ?? "OFFLINE"),
        thinking: "REASONING",
        responding: "RESPONDING",
    }[engineState] ?? "READY";

    return (
        <div style={{
            flexShrink: 0, height: 56,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "0 20px",
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(13,16,23,0.6)",
            backdropFilter: "blur(10px)",
            zIndex: 10, position: "relative",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <EngineIcon thinking={engineState === "thinking"} />
                <div>
                    <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px", fontWeight: 700,
                        letterSpacing: "0.16em", textTransform: "uppercase",
                        color: "rgba(255,255,255,0.88)",
                    }}>
                        Reasoning Engine
                    </div>
                    <div style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "9px", color: "rgba(255,255,255,0.28)",
                        letterSpacing: "0.06em", marginTop: 1,
                    }}>
                        Cognitive Core · ReasonedAI v4
                    </div>
                </div>
            </div>

            {/* State badge */}
            <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 10px",
                background: `${stateColor}11`,
                border: `1px solid ${stateColor}28`,
                borderRadius: 20,
            }}>
                <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: stateColor,
                    boxShadow: engineState === "thinking"
                        ? `0 0 6px ${stateColor}` : "none",
                    transition: "background 0.4s, box-shadow 0.4s",
                }} />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", letterSpacing: "0.08em",
                    color: stateColor,
                }}>
                    {stateLabel}
                </span>
            </div>
        </div>
    );
}

export default function ChatPanel() {
    const { messages, sendQuery, loadingState, systemStatus, vectorResults } = useCognitiveStore();
    const chunks = vectorResults ?? [];
    const messagesEndRef = useRef(null);
    const flashRef = useRef(null);
    const prevMsgCount = useRef(messages.length);

    /* ── Lifted input state (shared with InputArea + suggestions) ── */
    const [input, setInput] = useState("");

    /* ── Engine state machine ── */
    const [engineState, setEngineState] = useState("idle");

    useEffect(() => {
        if (loadingState.chat) {
            setEngineState("thinking");
            return;
        }
        if (messages.length > prevMsgCount.current) {
            const last = messages[messages.length - 1];
            if (last?.sender !== "user") {
                setEngineState("responding");
                const t = setTimeout(() => setEngineState("idle"), 1000);
                prevMsgCount.current = messages.length;
                return () => clearTimeout(t);
            }
        }
        prevMsgCount.current = messages.length;
        setEngineState("idle");
    }, [loadingState.chat, messages]);

    /* ── Responding flash ── */
    useRespondingFlash(flashRef, engineState);

    /* ── Auto-scroll on every new message or loading state change ── */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loadingState.chat]);

    /* ── Send handler ── */
    const handleSend = useCallback(async (query) => {
        const q = (query ?? input).trim();
        if (!q) return;
        setInput("");
        try { await sendQuery(q); } catch { /* store appends error message */ }
    }, [sendQuery, input]);

    /* ── Suggestion visibility ──
       Show  : at least one system/auto-summary message exists + no real user/AI
               conversation initiated + input empty
       Hide  : as soon as any real (non-auto-summary) user or AI message appears    */
    const hasSystemMsg = messages.some(m => m.sender === "system" || m.isAutoSummary);
    const hasRealConv = messages.some(m => (m.sender === "user" || m.sender === "ai") && !m.isAutoSummary);
    const showSuggestions = hasSystemMsg && !hasRealConv && input.trim() === "";

    /* ── Follow-up questions state ──
       For auto-summary messages: use the curated followUps from the store.
       For regular AI responses: derive from response text via NLP extractor.        */
    const followUpQuestions = useMemo(() => {
        const lastAi = [...messages].reverse().find((m) => m.sender === "ai");
        if (!lastAi) return [];
        // Always prefer a pre-set followUps array (set by auto-summary or chat handler)
        if (Array.isArray(lastAi.followUps) && lastAi.followUps.length > 0)
            return lastAi.followUps;
        // For auto-summary without followUps: return nothing (suggestions block handles it)
        if (lastAi.isAutoSummary) return [];
        return generateFollowUps(lastAi.text ?? "");
    }, [messages]);

    /* ── Chip click: fill state + immediately submit ── */
    const handleSuggestionSelect = useCallback((text) => {
        setInput(text);
        setTimeout(() => handleSend(text), 0);
    }, [handleSend]);

    /* ── Follow-up chip click ── */
    const handleFollowUpSelect = useCallback((text) => {
        setInput(text);
        setTimeout(() => handleSend(text), 0);
    }, [handleSend]);

    return (
        <div style={{
            display: "flex", flexDirection: "column",
            height: "100%", width: "100%",
            overflow: "hidden", position: "relative",
        }}>
            {/* ── Layer 1: gradient base ── */}
            <div aria-hidden="true" style={{
                position: "absolute", inset: 0, zIndex: 0,
                background: "linear-gradient(180deg, #0C0F16 0%, #090A0F 100%)",
            }} />

            {/* ── Layer 2: neural network ── */}
            <NeuralBackground engineState={engineState} />

            {/* ── Layer 3: radial glow ── */}
            <RadialGlow active={engineState !== "idle"} />

            {/* ── Responding flash bar (top edge) ── */}
            <div
                ref={flashRef}
                aria-hidden="true"
                style={{
                    position: "absolute", top: 56, left: 0, right: 0,
                    height: 1, zIndex: 11, transformOrigin: "left center",
                    background: "linear-gradient(90deg, transparent 0%, rgba(74,155,181,0.6) 50%, transparent 100%)",
                    opacity: 0, transform: "scaleX(0)",
                }}
            />

            {/* ── Header ── */}
            <PanelHeader engineState={engineState} connection={systemStatus?.connection} />

            {/* ── Messages area ── */}
            <div style={{
                flex: 1, minHeight: 0,
                overflowY: "auto", overflowX: "hidden",
                padding: "20px 20px 8px",
                position: "relative", zIndex: 2,
                scrollBehavior: "smooth",
            }}>
                {messages.length === 0 && !loadingState.chat
                    ? <EmptyState />
                    : messages.map(msg =>
                        msg.sender === "system"
                            ? <SystemSummaryBubble key={`msg-system-${msg.id}`} message={msg} />
                            : <MessageBubble key={`msg-user-${msg.id}`} message={msg} />
                    )
                }

                {/* ── Suggestion chips (shown once, before first query) ── */}
                {showSuggestions && (
                    <SuggestionsBlock onSelect={handleSuggestionSelect} />
                )}

                {/* ── Follow-up exploration chips (shown after each AI response) ── */}
                {!loadingState.chat && followUpQuestions.length > 0 && (
                    <FollowUpBlock
                        questions={followUpQuestions}
                        onSelect={handleFollowUpSelect}
                    />
                )}

                {loadingState.chat && <TypingIndicator key="typing" />}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input footer ── */}
            <div style={{
                flexShrink: 0,
                padding: "12px 16px 16px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(9,10,15,0.7)",
                backdropFilter: "blur(12px)",
                zIndex: 10, position: "relative",
                display: "flex", flexDirection: "column", gap: 8,
            }}>
                <ReasoningContextBar />
                <InputArea
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    disabled={loadingState.chat || chunks.length === 0}
                />
            </div>
        </div>
    );
}

