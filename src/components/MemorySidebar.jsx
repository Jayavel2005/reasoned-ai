import { useState, useRef, useEffect, useCallback } from "react";
import { HardDrive, FolderOpen, Loader2 } from "lucide-react";
import { gsap } from "gsap";
import useCognitiveStore from "../store/useCognitiveStore";
import IngestionModal from "./IngestionModal";

/* ─── helpers ─────────────────────────────────────────────────────────── */
const EXT_COLOR = {
    pdf: "#E05252", docx: "#4A8FD4", doc: "#4A8FD4",
    csv: "#5BB87A", json: "#E0A952", md: "#9B8ED4",
    txt: "#8099B0", xlsx: "#5BB87A",
};
const extOf = (n) => (n ?? "").split(".").pop().toLowerCase();

/* ═══ MEMORY FILE ROW ══════════════════════════════════════════════════ */
function MemoryFileRow({ file, onRemove }) {
    const rowRef = useRef(null);
    const [removing, setRemoving] = useState(false);
    const ext = extOf(file.name);
    const color = EXT_COLOR[ext] ?? "#6B7B8E";

    /* Entry animation — fires once on mount */
    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 7 },
                { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, []); // eslint-disable-line

    /* Remove: animate out → call API */
    const handleRemove = async () => {
        if (removing) return;
        setRemoving(true);
        const el = rowRef.current;
        if (!el) { await onRemove(file.name); return; }
        const ctx = gsap.context(() => {
            gsap.timeline({
                onComplete: async () => {
                    ctx.revert();
                    await onRemove(file.name);
                },
            })
                .to(el, { opacity: 0, x: -10, duration: 0.18, ease: "power2.in" })
                .to(el, { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, duration: 0.17, ease: "power2.inOut" });
        });
    };

    /* Format upload date */
    const uploadTime = file.createdAt
        ? new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <div
            ref={rowRef}
            style={{
                opacity: 0,
                display: "flex", alignItems: "center",
                gap: 9, padding: "8px 10px", marginBottom: 5,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 7, overflow: "hidden",
            }}
        >
            {/* File-type chip */}
            <div style={{
                width: 30, height: 30, borderRadius: 5, flexShrink: 0,
                background: `${color}1A`,
                border: `0.8px solid ${color}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "6.5px", fontWeight: 700,
                    color, textTransform: "uppercase",
                }}>
                    {ext.slice(0, 4).toUpperCase()}
                </span>
            </div>

            {/* Name + size + chunk count */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px", fontWeight: 500, color: "#C8D4E0",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                    {file.name}
                </div>
                <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9.5px", color: "#4E5A6A",
                    marginTop: 2, letterSpacing: "0.02em",
                }}>
                    {file.size} · {file.chunks ?? 0} chunks
                    {uploadTime && ` · ${uploadTime}`}
                </div>
            </div>

            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: "#5BA878", flexShrink: 0,
                }} />
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", color: "#5BA878", letterSpacing: "0.04em",
                }}>
                    Indexed
                </span>
            </div>

            {/* Remove button */}
            <button
                onClick={handleRemove}
                disabled={removing}
                title="Remove from memory"
                style={{
                    background: "none", border: "none",
                    padding: "4px 5px", cursor: removing ? "not-allowed" : "pointer",
                    color: "#2E3A48", borderRadius: 4,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                    transition: "color 0.16s",
                }}
                onMouseEnter={e => { if (!removing) e.currentTarget.style.color = "#C0524A"; }}
                onMouseLeave={e => (e.currentTarget.style.color = "#2E3A48")}
                aria-label={`Remove ${file.name}`}
            >
                {removing ? (
                    <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                        <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" />
                    </svg>
                )}
            </button>
        </div>
    );
}

/* ═══ MEMORY SIDEBAR ══════════════════════════════════════════════════ */
export default function MemorySidebar() {
    const {
        systemStatus,
        loadingState,
        memoryFiles,
        removeFile,
        uploadFiles,
    } = useCognitiveStore();

    const [modalOpen, setModalOpen] = useState(false);

    /* Computed totals */
    const totalChunks = memoryFiles.reduce((acc, f) => acc + (f.chunks ?? f.pointCount ?? 0), 0);

    /* ── called by IngestionModal with native File objects ── */
    const handleAllIndexed = useCallback(async (entries) => {
        if (!entries?.length) return;

        // entries from IngestionModal are the internal state objects, not File objects.
        // The real upload was already triggered inside IngestionModal via uploadFiles().
        // We just close the modal — store refresh already happened.
        setModalOpen(false);
    }, []);

    /* ── remove via API ── */
    const handleRemove = useCallback(async (filename) => {
        await removeFile(filename);
    }, [removeFile]);

    /* Status pill */
    const pill = loadingState?.memory
        ? { text: "#C8A84B", bg: "rgba(200,168,75,0.10)", border: "rgba(200,168,75,0.20)" }
        : systemStatus?.vectorIndex === "ERROR"
            ? { text: "#C0524A", bg: "rgba(192,82,74,0.10)", border: "rgba(192,82,74,0.28)" }
            : { text: "#5BA878", bg: "rgba(91,168,120,0.10)", border: "rgba(91,168,120,0.22)" };

    return (
        <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            gap: 0, overflow: "hidden", color: "#fff",
            fontFamily: "'Inter', sans-serif",
        }}>

            {/* ── Header ─────────────────────────────────────────────── */}
            <div style={{
                flexShrink: 0,
                padding: "0 0 14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14,
            }}>
                <h2 style={{
                    fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    color: "rgba(255,255,255,0.85)",
                    display: "flex", alignItems: "center", gap: 9, margin: 0,
                }}>
                    <HardDrive size={14} style={{ color: "#4A9BB5" }} />
                    Memory
                </h2>
                <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px", letterSpacing: "0.06em",
                    padding: "2px 8px", borderRadius: 4,
                    color: pill.text, background: pill.bg,
                    border: `1px solid ${pill.border}`,
                    display: "flex", alignItems: "center", gap: 5,
                }}>
                    {loadingState?.memory && <Loader2 size={8} style={{ animation: "spin 1s linear infinite" }} />}
                    {loadingState?.memory ? "LOADING" : (systemStatus?.vectorIndex ?? "READY")}
                </div>
            </div>

            {/* ── Upload trigger ─────────────────────────────────────── */}
            <button
                onClick={() => setModalOpen(true)}
                style={{
                    flexShrink: 0, marginBottom: 16,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 7,
                    width: "100%", padding: "9px 0",
                    background: "rgba(74,155,181,0.09)",
                    border: "1px solid rgba(74,155,181,0.28)",
                    borderRadius: 7,
                    fontSize: "11px", fontWeight: 600,
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    color: "#4A9BB5", cursor: "pointer",
                    transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(74,155,181,0.16)";
                    e.currentTarget.style.borderColor = "rgba(74,155,181,0.46)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(74,155,181,0.09)";
                    e.currentTarget.style.borderColor = "rgba(74,155,181,0.28)";
                }}
            >
                <FolderOpen size={13} />
                Upload Documents
            </button>

            {/* ── File list ──────────────────────────────────────────── */}
            <div style={{
                flex: 1, minHeight: 0,
                overflowY: "auto", overflowX: "hidden",
            }}>
                {loadingState?.memory && memoryFiles.length === 0 ? (
                    /* Loading state */
                    <div style={{
                        height: "100%", display: "flex",
                        flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        gap: 8, opacity: 0.5,
                    }}>
                        <Loader2 size={18} style={{ color: "#4A9BB5", animation: "spin 1s linear infinite" }} />
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "10px", color: "#4E5A6A",
                            letterSpacing: "0.08em", textTransform: "uppercase",
                        }}>
                            Loading files…
                        </span>
                    </div>
                ) : memoryFiles.length > 0 ? (
                    <>
                        {/* Section label */}
                        <div style={{
                            fontSize: "10px", fontWeight: 500,
                            letterSpacing: "0.1em", textTransform: "uppercase",
                            color: "#3E4A58", marginBottom: 8,
                        }}>
                            Indexed Files · {memoryFiles.length}
                        </div>
                        {memoryFiles.map(f => (
                            <MemoryFileRow
                                key={`memory-file-${f.id ?? f.name}`}
                                file={f}
                                onRemove={handleRemove}
                            />
                        ))}
                    </>
                ) : (
                    /* Empty state */
                    <div style={{
                        height: "100%", display: "flex",
                        flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        gap: 8, opacity: 0.32, userSelect: "none",
                    }}>
                        <FolderOpen size={22} style={{ color: "#4E5A6A" }} />
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "10px", color: "#4E5A6A",
                            letterSpacing: "0.08em", textTransform: "uppercase",
                        }}>
                            No files indexed
                        </span>
                    </div>
                )}
            </div>

            {/* ── Summary footer ─────────────────────────────────────── */}
            <div style={{
                flexShrink: 0,
                borderTop: "1px solid rgba(255,255,255,0.05)",
                paddingTop: 12, marginTop: 8,
                display: "flex", flexDirection: "column", gap: 6,
            }}>
                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10px", color: "#3E4A58", letterSpacing: "0.04em",
                    }}>
                        {memoryFiles.length} {memoryFiles.length === 1 ? "file" : "files"}
                    </span>
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10px",
                        color: totalChunks > 0 ? "#5BA878" : "#3E4A58",
                        letterSpacing: "0.04em",
                    }}>
                        {totalChunks > 0 ? `${totalChunks} chunks` : "0 chunks"}
                    </span>
                </div>

                {/* Vector store badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: memoryFiles.length > 0 ? "#5BA878" : "#3E4A58",
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "9px", letterSpacing: "0.06em",
                        color: memoryFiles.length > 0 ? "#5BA878" : "#3E4A58",
                        textTransform: "uppercase",
                    }}>
                        Vector Store · {memoryFiles.length > 0 ? "Ready" : "Empty"}
                    </span>
                </div>
            </div>

            {/* ── Modal ────────────────────────────────────────────────── */}
            <IngestionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onAllIndexed={handleAllIndexed}
            />

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
