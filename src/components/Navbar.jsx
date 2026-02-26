import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import useCognitiveStore from "../store/useCognitiveStore";

/* ─────────────────────────────────────────────────────────────────────
   Cognitive Core SVG
   Outer ring · Inner triangle · Three nodes · Centre anchor
   All strokes are thin and structural. Zero fill gradients.
   36×36 viewBox, optically aligned to a 16px cap-height title.
───────────────────────────────────────────────────────────────────── */
function CognitiveCoreIcon() {
    return (
        <svg
            width="32"
            height="32"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Cognitive Core"
            role="img"
        >
            {/* Outer boundary ring — dashed, low contrast */}
            <circle
                cx="18" cy="18" r="16.5"
                stroke="#4A9BB5"
                strokeWidth="0.8"
                strokeDasharray="2.5 2"
                opacity="0.3"
            />

            {/* Structural triangle — thin, muted */}
            <polygon
                points="18,7 10,24 26,24"
                stroke="#4A9BB5"
                strokeWidth="0.85"
                strokeLinejoin="round"
                fill="none"
                opacity="0.4"
            />

            {/* Node: Informational (top) */}
            <circle cx="18" cy="7" r="2" stroke="#4A9BB5" strokeWidth="1.1" fill="#0E1017" />
            {/* Node: Analytical (bottom-left) */}
            <circle cx="10" cy="24" r="2" stroke="#4A9BB5" strokeWidth="1.1" fill="#0E1017" />
            {/* Node: Advisory (bottom-right) */}
            <circle cx="26" cy="24" r="2" stroke="#4A9BB5" strokeWidth="1.1" fill="#0E1017" />

            {/* Centre convergence dot */}
            <circle cx="18" cy="18" r="1.6" fill="#4A9BB5" opacity="0.65" />

            {/* Radials from centre to each node — very low opacity depth lines */}
            <line x1="18" y1="18" x2="18" y2="9" stroke="#4A9BB5" strokeWidth="0.6" opacity="0.2" />
            <line x1="18" y1="18" x2="11" y2="23" stroke="#4A9BB5" strokeWidth="0.6" opacity="0.2" />
            <line x1="18" y1="18" x2="25" y2="23" stroke="#4A9BB5" strokeWidth="0.6" opacity="0.2" />
        </svg>
    );
}

/* ─────────────────────────────────────────────────────────────────────
   Vertical divider — used inside the status rail
───────────────────────────────────────────────────────────────────── */
function VDivider() {
    return (
        <div
            aria-hidden="true"
            style={{
                width: 1,
                height: 14,
                background: "rgba(255,255,255,0.1)",
                flexShrink: 0,
            }}
        />
    );
}

/* ─────────────────────────────────────────────────────────────────────
   Status indicator — a dot + label pair
   dot: "green" | "cyan" | "neutral"
───────────────────────────────────────────────────────────────────── */
const DOT_COLORS = {
    green: "#5BA878",
    cyan: "#4A9BB5",
    neutral: "#5E6A7A",
};

function StatusItem({ dot = "neutral", label }) {
    const color = DOT_COLORS[dot] ?? DOT_COLORS.neutral;
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 16px",
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                    /* No glow — intentional */
                }}
            />
            <span
                style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "12px",
                    fontWeight: 400,
                    letterSpacing: "0.02em",
                    color: "#7A8899",
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                }}
            >
                {label}
            </span>
        </div>
    );
}

function NavTab({ active, title, subtitle, onClick, dataAnim }) {
    return (
        <button
            onClick={onClick}
            data-anim={dataAnim}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                position: "relative",
                textAlign: "left",
                outline: "none"
            }}
        >
            <span
                style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "16px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: active ? "#00F0FF" : "#DDE4EE",
                    textShadow: active ? "0 0 10px rgba(0, 240, 255, 0.4)" : "none",
                    lineHeight: 1,
                    transition: "color 0.3s ease, text-shadow 0.3s ease",
                }}
            >
                {title}
            </span>
            <span
                style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "11px",
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    color: active ? "rgba(0, 240, 255, 0.7)" : "rgba(180,192,210,0.55)",
                    lineHeight: 1,
                    transition: "color 0.3s ease",
                }}
            >
                {subtitle}
            </span>
            {/* Animated underline */}
            <div style={{
                position: "absolute",
                bottom: -8,
                left: 0,
                height: 2,
                width: active ? "100%" : "0%",
                background: "#00F0FF",
                boxShadow: "0 0 8px rgba(0, 240, 255, 0.6)",
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }} />
        </button>
    );
}

/* ─────────────────────────────────────────────────────────────────────
   Navbar
───────────────────────────────────────────────────────────────────── */
export default function Navbar({ className = "shrink-0" }) {
    const brandRef = useRef(null);
    const statusRef = useRef(null);
    const { activeMode, setActiveMode } = useCognitiveStore();

    /* ── Entry animation — three beats, no loop ── */
    useEffect(() => {
        const icon = brandRef.current?.querySelector("[data-anim='icon']");
        const title1 = brandRef.current?.querySelector("[data-anim='tab1']");
        const title2 = brandRef.current?.querySelector("[data-anim='tab2']");
        const badge = statusRef.current;

        // Hard-set initial states (avoids flash before JS runs)
        gsap.set([icon, title1, title2, badge], { opacity: 0 });
        gsap.set(icon, { y: 7 });
        gsap.set([title1, title2], { y: 4 });

        gsap.timeline({ defaults: { ease: "power2.out" } })
            // 1. Icon rises in
            .to(icon, { opacity: 1, y: 0, duration: 0.55 }, 0)
            // 2. Titles fade in 100ms later
            .to([title1, title2], { opacity: 1, y: 0, duration: 0.45, stagger: 0.1 }, 0.1)
            // 4. Status rail fades in last
            .to(badge, { opacity: 1, duration: 0.45 }, 0.35);
    }, []);

    return (
        <header
            className={className}
            style={{
                /* ── Geometry ── */
                height: 64,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                /* ── 8px padding rhythm: 24px = 3× grid unit ── */
                paddingLeft: 24,
                paddingRight: 24,
                /* ── Surface ── */
                background: "#0E1017",
                borderBottom: "1px solid rgba(255,255,255,0.09)",
                position: "relative",
                zIndex: 50,
                boxSizing: "border-box",
            }}
        >
            {/* ══════════════════════════════════
                LEFT — Brand block
            ══════════════════════════════════ */}
            <div
                ref={brandRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexShrink: 0,
                }}
            >
                {/* Icon */}
                <div data-anim="icon" style={{ lineHeight: 0, flexShrink: 0 }}>
                    <CognitiveCoreIcon />
                </div>

                {/* 1px separator — optical anchor between mark and wordmark */}
                <div
                    aria-hidden="true"
                    style={{
                        width: 1,
                        height: 32,
                        background: "rgba(255,255,255,0.08)",
                        flexShrink: 0,
                        marginRight: 8,
                    }}
                />

                <NavTab
                    active={activeMode === "ReasonedAI"}
                    title="ReasonedAI"
                    subtitle="Agentic Engine"
                    onClick={() => setActiveMode("ReasonedAI")}
                    dataAnim="tab1"
                />

                <NavTab
                    active={activeMode === "LeakSonic"}
                    title="LeakSonic"
                    subtitle="Physical Digital Twin"
                    onClick={() => setActiveMode("LeakSonic")}
                    dataAnim="tab2"
                />
            </div>

            {/* ══════════════════════════════════
                CENTER — Intentional negative space
            ══════════════════════════════════ */}
            <div aria-hidden="true" style={{ flex: 1 }} />

            {/* ══════════════════════════════════
                RIGHT — Unified system state rail
            ══════════════════════════════════ */}
            <div
                ref={statusRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    height: 32,
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.02)",
                    flexShrink: 0,
                    overflow: "hidden",       /* keeps rail edges clean */
                }}
            >
                <StatusItem dot="green" label="Stable" />
                <VDivider />
                <StatusItem dot="cyan" label={activeMode === "LeakSonic" ? "Sensor Network Active" : "Confidence Engine Active"} />
                <VDivider />
                <StatusItem dot="green" label="Governance Validated" />
            </div>
        </header>
    );
}
