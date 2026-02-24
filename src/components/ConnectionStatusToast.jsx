import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { getHealth } from "../lib/api";

/* ─── status config ─────────────────────────────────────── */
const STATUS_CONFIG = {
    checking: {
        dot: "#C8A84B",
        border: "rgba(200,168,75,0.28)",
        bg: "rgba(200,168,75,0.07)",
        glow: "rgba(200,168,75,0.18)",
        label: "CONNECTING",
        sub: "Reaching cognitive backend…",
        pulse: true,
        autoDismiss: false,
    },
    connected: {
        dot: "#5BA878",
        border: "rgba(91,168,120,0.30)",
        bg: "rgba(91,168,120,0.07)",
        glow: "rgba(91,168,120,0.15)",
        label: "BACKEND ONLINE",
        sub: "Cognitive engine ready",
        pulse: false,
        autoDismiss: 3200,
    },
    error: {
        dot: "#C0524A",
        border: "rgba(192,82,74,0.32)",
        bg: "rgba(192,82,74,0.07)",
        glow: "rgba(192,82,74,0.14)",
        label: "CONNECTION FAILED",
        sub: "Backend unreachable — retrying offline",
        pulse: false,
        autoDismiss: 5000,
    },
};

/* ─── Signal icon (animated bars) ───────────────────────── */
function SignalIcon({ color, pulse }) {
    const b1 = useRef(null);
    const b2 = useRef(null);
    const b3 = useRef(null);

    useEffect(() => {
        if (!pulse) return;
        const bars = [b1.current, b2.current, b3.current].filter(Boolean);
        const ctx = gsap.context(() => {
            bars.forEach((bar, i) => {
                gsap.to(bar, {
                    scaleY: 0.25,
                    duration: 0.45,
                    ease: "power1.inOut",
                    repeat: -1,
                    yoyo: true,
                    delay: i * 0.14,
                });
            });
        });
        return () => ctx.revert();
    }, [pulse]);

    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16 }}>
            {[b1, b2, b3].map((ref, i) => (
                <div
                    key={i}
                    ref={ref}
                    style={{
                        width: 3,
                        height: `${9 + i * 4}px`,
                        background: color,
                        borderRadius: 2,
                        transformOrigin: "bottom",
                        opacity: pulse ? 0.9 : 1,
                    }}
                />
            ))}
        </div>
    );
}

/* ─── Check icon ─────────────────────────────────────────── */
function CheckIcon({ color }) {
    const pathRef = useRef(null);
    useEffect(() => {
        if (!pathRef.current) return;
        const len = pathRef.current.getTotalLength?.() ?? 20;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                pathRef.current,
                { strokeDasharray: len, strokeDashoffset: len },
                { strokeDashoffset: 0, duration: 0.45, ease: "power2.out", delay: 0.1 }
            );
        });
        return () => ctx.revert();
    }, []);
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <polyline
                ref={pathRef}
                points="3 8 6.5 11.5 13 5"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ─── Cross icon ─────────────────────────────────────────── */
function CrossIcon({ color }) {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2 12 12M12 2 2 12" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    );
}

/* ─── Close button ───────────────────────────────────────── */
function DismissBtn({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: "none", border: "none",
                padding: 3, cursor: "pointer",
                color: "rgba(148,163,184,0.45)",
                display: "flex", alignItems: "center",
                borderRadius: 4, flexShrink: 0,
                transition: "color 0.16s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(200,212,225,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,163,184,0.45)")}
            aria-label="Dismiss"
        >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M1 1 9 9M9 1 1 9" />
            </svg>
        </button>
    );
}

/* ─── Progress bar (for auto-dismiss timer) ──────────────── */
function DismissBar({ duration, color }) {
    const barRef = useRef(null);
    useEffect(() => {
        if (!barRef.current || !duration) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                barRef.current,
                { scaleX: 1 },
                { scaleX: 0, duration: duration / 1000, ease: "none", transformOrigin: "left" }
            );
        });
        return () => ctx.revert();
    }, [duration, color]);
    return (
        <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden",
        }}>
            <div ref={barRef} style={{
                height: "100%", background: color,
                opacity: 0.5, borderRadius: 2,
            }} />
        </div>
    );
}

/* ═══ TOAST ════════════════════════════════════════════════ */
function Toast({ status, onDismiss }) {
    const cfg = STATUS_CONFIG[status];
    const wrapRef = useRef(null);
    const glowRef = useRef(null);

    /* Slide-in animation */
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, x: 60, scale: 0.94 },
                { opacity: 1, x: 0, scale: 1, duration: 0.42, ease: "power3.out" }
            );
        });
        return () => ctx.revert();
    }, [status]);

    /* Glow pulse on connected */
    useEffect(() => {
        if (status !== "connected" || !glowRef.current) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(glowRef.current,
                { opacity: 0.5, scale: 0.9 },
                { opacity: 0, scale: 1.8, duration: 0.9, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, [status]);

    /* Auto-dismiss */
    useEffect(() => {
        if (!cfg.autoDismiss) return;
        const timer = setTimeout(onDismiss, cfg.autoDismiss);
        return () => clearTimeout(timer);
    }, [cfg.autoDismiss, onDismiss]);

    const iconNode = status === "checking"
        ? <SignalIcon color={cfg.dot} pulse />
        : status === "connected"
            ? <CheckIcon color={cfg.dot} />
            : <CrossIcon color={cfg.dot} />;

    return (
        <div
            ref={wrapRef}
            role="status"
            aria-live="polite"
            style={{
                position: "relative",
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px",
                background: "rgba(9,10,15,0.92)",
                border: `1px solid ${cfg.border}`,
                backdropFilter: "blur(18px)",
                borderRadius: 12,
                boxShadow: `0 24px 56px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), 0 0 28px ${cfg.glow}`,
                minWidth: 260, maxWidth: 340,
                overflow: "hidden",
            }}
        >
            {/* Glow burst (connected only) */}
            <div ref={glowRef} style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(circle at 10% 50%, ${cfg.glow} 0%, transparent 70%)`,
                pointerEvents: "none", opacity: 0,
            }} />

            {/* Icon container */}
            <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, position: "relative",
            }}>
                {/* Pulse ring */}
                {status === "checking" && (
                    <div style={{
                        position: "absolute", inset: -3,
                        borderRadius: 12,
                        border: `1px solid ${cfg.dot}`,
                        animation: "connectionPulse 1.6s ease-in-out infinite",
                        opacity: 0.4,
                    }} />
                )}
                {iconNode}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.10em",
                    color: cfg.dot,
                    textTransform: "uppercase",
                    lineHeight: 1,
                }}>
                    {cfg.label}
                </div>
                <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    color: "rgba(148,163,184,0.75)",
                    marginTop: 4, lineHeight: 1.3,
                }}>
                    {cfg.sub}
                </div>
            </div>

            {/* Live dot */}
            <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: cfg.dot,
                flexShrink: 0,
                boxShadow: `0 0 8px ${cfg.dot}`,
                animation: status === "checking"
                    ? "connectionDotBlink 1.1s ease-in-out infinite"
                    : "none",
            }} />

            {/* Dismiss */}
            {status !== "checking" && <DismissBtn onClick={onDismiss} />}

            {/* Auto-dismiss progress bar */}
            {cfg.autoDismiss && (
                <DismissBar duration={cfg.autoDismiss} color={cfg.dot} />
            )}
        </div>
    );
}

/* ═══ PUBLIC COMPONENT ══════════════════════════════════════
   Drop this anywhere in the tree (e.g. App.jsx).
   It mounts once, pings /health, shows checking → connected/error.
══════════════════════════════════════════════════════════════ */
export default function ConnectionStatusToast() {
    const [status, setStatus] = useState("checking");
    const [visible, setVisible] = useState(true);
    const containerRef = useRef(null);

    const dismiss = () => {
        const el = containerRef.current;
        if (!el) { setVisible(false); return; }
        const ctx = gsap.context(() => {
            gsap.to(el, {
                opacity: 0, x: 50, scale: 0.94,
                duration: 0.28, ease: "power2.in",
                onComplete: () => { ctx.revert(); setVisible(false); },
            });
        });
    };

    useEffect(() => {
        let cancelled = false;
        getHealth()
            .then(() => { if (!cancelled) setStatus("connected"); })
            .catch(() => { if (!cancelled) setStatus("error"); });
        return () => { cancelled = true; };
    }, []);

    if (!visible) return null;

    return createPortal(
        <div
            ref={containerRef}
            style={{
                position: "fixed",
                bottom: 28, right: 28,
                zIndex: 99999,
                pointerEvents: "auto",
            }}
        >
            <Toast status={status} onDismiss={dismiss} />

            <style>{`
                @keyframes connectionPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.15); opacity: 0.15; }
                }
                @keyframes connectionDotBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.25; }
                }
            `}</style>
        </div>,
        document.body
    );
}
