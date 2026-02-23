import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import MemoryPanel from "../components/MemoryPanel";
import ChatPanel from "../components/ChatPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";

/* ──────────────────────────────────────────────────────────────────────
   DASHBOARD
   Grid: 280px | 1fr | 280px
   Outer padding 20px · Gap 20px · Rounded panel cards
   No z-index · No backdrop-blur stacking · Single ambient layer
────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
    const gridRef = useRef(null);

    useEffect(() => {
        const el = gridRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 6 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, []);

    return (
        /* Outer shell: full viewport, outer padding, dark base */
        <div className="h-screen w-screen bg-ai-bg text-ai-text-primary p-5 relative overflow-hidden">

            {/* ── Ambient glow — stays behind everything, no z-index needed ── */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ai-accent/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ai-accent-purple/5 rounded-full blur-[100px]" />
            </div>

            {/* ── Grid ── */}
            <div
                ref={gridRef}
                className="grid h-full grid-cols-[280px_1fr_280px] gap-5"
                style={{ opacity: 0 /* GSAP reveals */ }}
            >

                {/* Left — Memory Panel */}
                <div className="rounded-xl border border-ai-border bg-ai-panel flex flex-col min-h-0 overflow-hidden">
                    <MemoryPanel />
                </div>

                {/* Center — Reasoning Engine (primary, slightly darker/cleaner) */}
                <div className="rounded-xl border border-ai-border bg-ai-bg flex flex-col min-h-0 overflow-hidden">
                    <ChatPanel />
                </div>

                {/* Right — Analytics Panel */}
                <div className="rounded-xl border border-ai-border bg-ai-panel flex flex-col min-h-0 overflow-hidden">
                    <AnalyticsPanel />
                </div>

            </div>
        </div>
    );
}
