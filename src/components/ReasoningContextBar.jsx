import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { Layers, Activity } from "lucide-react";
import useCognitiveStore from "../store/useCognitiveStore";

export default function ReasoningContextBar() {
    const { chatContext } = useCognitiveStore();
    const barRef = useRef(null);

    useEffect(() => {
        const el = barRef.current;
        if (!el || !chatContext) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 4 },
                { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, [chatContext]);

    if (!chatContext) return null;

    return (
        <div
            ref={barRef}
            style={{
                display: "flex", alignItems: "center", gap: 10,
                paddingBottom: 6,
                opacity: 0,   /* GSAP reveals */
            }}
        >
            {/* Intent badge */}
            <div style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(189,0,255,0.07)",
                border: "1px solid rgba(189,0,255,0.18)",
                padding: "2px 8px", borderRadius: 4,
            }}>
                <span style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: "#BD00FF", flexShrink: 0,
                }} />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(189,0,255,0.75)",
                    letterSpacing: "0.07em", textTransform: "uppercase",
                }}>
                    {chatContext.intent}
                </span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />

            {/* Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={9} color="rgba(74,155,181,0.6)" />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(148,163,184,0.6)",
                    letterSpacing: "0.04em",
                }}>
                    SOURCES: {chatContext.activeDocuments.length}
                </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={9} color="rgba(91,168,120,0.6)" />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "rgba(148,163,184,0.6)",
                    letterSpacing: "0.04em",
                }}>
                    CHUNKS: {chatContext.retrievedChunks}
                </span>
            </div>

            {/* Source tags */}
            <div style={{
                flex: 1, minWidth: 0,
                display: "flex", justifyContent: "flex-end",
                gap: 5, overflow: "hidden",
            }}>
                {chatContext.activeDocuments.slice(0, 3).map((doc, i) => (
                    <span key={i} style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "9px", color: "rgba(255,255,255,0.35)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        padding: "1px 6px", borderRadius: 3,
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", maxWidth: 110,
                    }}>
                        {doc}
                    </span>
                ))}
            </div>
        </div>
    );
}
