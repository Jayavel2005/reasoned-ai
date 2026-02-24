import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import useCognitiveStore from "../store/useCognitiveStore";

/* ─── constants ─────────────────────────────────────────────────────── */
const ACCEPTED_EXT = ["pdf", "docx", "doc", "csv", "json", "md", "txt", "xlsx"];
const ACCEPTED_MIME = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/csv", "application/json", "text/markdown", "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const SUCCESS_HOLD_MS = 600; // brief success flash before auto-close

/* ─── helpers ───────────────────────────────────────────────────────── */
let _uid = 0;
const uid = () => `fi_${++_uid}`;
const extOf = (n) => (n ?? "").split(".").pop().toLowerCase();
const fmtSz = (b) => b > 1_048_576
    ? `${(b / 1_048_576).toFixed(1)} MB`
    : `${Math.round(b / 1024)} KB`;

const EXT_COLOR = {
    pdf: "#E05252", docx: "#4A8FD4", doc: "#4A8FD4",
    csv: "#5BB87A", json: "#E0A952", md: "#9B8ED4",
    txt: "#8099B0", xlsx: "#5BB87A",
};

/* ═══ ICONS ═══════════════════════════════════════════════════════════ */
function UploadCloudIcon({ size = 34, color = "currentColor" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="1.25" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M1.5 1.5 11.5 11.5M11.5 1.5 1.5 11.5" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 9 7 13 15 5" />
        </svg>
    );
}

function FileTypeChip({ ext }) {
    const color = EXT_COLOR[ext] ?? "#6B7B8E";
    return (
        <div style={{
            width: 32, height: 32, borderRadius: 5, flexShrink: 0,
            background: `${color}1E`,
            border: `0.8px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "6.5px", fontWeight: 700,
                color, textTransform: "uppercase", letterSpacing: "0.03em",
            }}>
                {(ext ?? "FILE").slice(0, 4).toUpperCase()}
            </span>
        </div>
    );
}

/* ═══ PROGRESS BAR ════════════════════════════════════════════════════ */
function ProgressBar({ pct = 0, shimmer = false }) {
    const fillRef = useRef(null);

    useEffect(() => {
        if (!fillRef.current || shimmer) return;
        gsap.to(fillRef.current, {
            width: `${Math.min(100, pct)}%`,
            duration: 0.28,
            ease: "power2.out",
            overwrite: "auto",
        });
    }, [pct, shimmer]);

    return (
        <div style={{
            height: 2, background: "rgba(255,255,255,0.07)",
            borderRadius: 2, overflow: "hidden", width: "100%", flexShrink: 0,
        }}>
            {shimmer ? (
                <div style={{
                    position: "relative", inset: 0, height: "100%",
                    background: "linear-gradient(90deg,transparent 0%,rgba(74,155,181,.65) 40%,rgba(74,155,181,.9) 50%,rgba(74,155,181,.65) 60%,transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerSweep 1.4s linear infinite",
                }} />
            ) : (
                <div ref={fillRef} style={{
                    height: "100%", width: "0%",
                    background: "#4A9BB5", borderRadius: 2,
                }} />
            )}
        </div>
    );
}

/* ═══ STATUS BADGE ════════════════════════════════════════════════════ */
function StatusBadge({ status, error }) {
    const mono = {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px", letterSpacing: "0.04em", whiteSpace: "nowrap",
    };
    const dot = (c) => (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0 }} />
    );

    if (status === "indexed") return <div style={{ display: "flex", alignItems: "center", gap: 5 }}>{dot("#5BA878")}<span style={{ ...mono, color: "#5BA878" }}>Indexed</span></div>;
    if (status === "error") return <div style={{ display: "flex", alignItems: "center", gap: 5 }}>{dot("#C0524A")}<span style={{ ...mono, color: "#C0524A" }}>{error ?? "Failed"}</span></div>;
    if (status === "uploading") return <span style={{ ...mono, color: "#4A9BB5" }}>Uploading…</span>;
    if (status === "processing") return <span style={{ ...mono, color: "#7A8899" }}>Processing…</span>;
    return null;
}

/* ═══ UPLOAD FILE ROW (modal-only, no remove) ════════════════════════ */
function UploadRow({ file }) {
    const rowRef = useRef(null);
    const hasBar = file.status === "uploading" || file.status === "processing";

    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 7 },
                { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, []); // eslint-disable-line

    return (
        <div
            ref={rowRef}
            style={{
                opacity: 0,
                display: "flex", flexDirection: "column", gap: 7,
                padding: "9px 12px", marginBottom: 6,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 7, overflow: "hidden",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileTypeChip ext={extOf(file.name)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: "'Inter', sans-serif", fontSize: "12px",
                        fontWeight: 500, color: "#C8D4E0",
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}>
                        {file.name}
                    </div>
                    <div style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10px", color: "#4E5A6A",
                        letterSpacing: "0.03em", marginTop: 2,
                    }}>
                        {file.size}
                    </div>
                </div>
                <StatusBadge status={file.status} error={file.error} />
            </div>
            {hasBar && <ProgressBar pct={file.progress ?? 0} shimmer={file.status === "processing"} />}
        </div>
    );
}

/* ═══ MODAL CONTENT ═══════════════════════════════════════════════════ */
/**
 * onAllIndexed(entries) — called ONCE when every queued file reaches
 * "indexed". Passes the final file entries so MemorySidebar can store them.
 */
function ModalContent({ onClose, onAllIndexed }) {
    const { uploadFiles } = useCognitiveStore();
    const [files, setFiles] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRef = useRef(null);
    const zoneRef = useRef(null);

    const isProcessing = files.some(f => f.status === "uploading" || f.status === "processing");

    /* ── ingest: kick off real API upload ── */
    const ingest = useCallback(async (rawFiles) => {
        const incoming = Array.from(rawFiles ?? []).filter(file => {
            const ext = extOf(file.name);
            if (!ACCEPTED_EXT.includes(ext)) return false;
            return !files.some(ex => ex.name === file.name && ex._size === file.size);
        });
        if (!incoming.length) return;

        // Build local display entries
        const entries = incoming.map(f => ({
            id: uid(),
            name: f.name,
            size: fmtSz(f.size),
            _size: f.size,
            status: "processing",  // shimmer from the start (server is doing the work)
            progress: 100,
            chunks: 0,
        }));
        setFiles(prev => [...prev, ...entries]);

        try {
            // Real API call through the store (also refreshes vectors + analytics)
            await uploadFiles(incoming);

            // Mark all entries as indexed
            setFiles(prev =>
                prev.map(f =>
                    entries.some(e => e.id === f.id)
                        ? { ...f, status: "indexed" }
                        : f
                )
            );

            setSuccess(true);
            setTimeout(() => {
                onAllIndexed(entries.map(e => ({ ...e, status: "indexed" })));
                onClose();
            }, SUCCESS_HOLD_MS);
        } catch (err) {
            setFiles(prev =>
                prev.map(f =>
                    entries.some(e => e.id === f.id)
                        ? { ...f, status: "error", error: err.message ?? "Upload failed" }
                        : f
                )
            );
        }
    }, [files, uploadFiles, onAllIndexed, onClose]);


    /* ── drag ── */
    const onDragEnter = (e) => {
        e.preventDefault(); setDragging(true);
        if (zoneRef.current) gsap.to(zoneRef.current, { borderColor: "rgba(74,155,181,0.48)", duration: 0.18, overwrite: "auto" });
    };
    const onDragLeave = (e) => {
        e.preventDefault(); setDragging(false);
        if (zoneRef.current) gsap.to(zoneRef.current, { borderColor: "rgba(255,255,255,0.12)", duration: 0.2, overwrite: "auto" });
    };
    const onDrop = (e) => {
        e.preventDefault(); setDragging(false);
        if (zoneRef.current) gsap.to(zoneRef.current, { borderColor: "rgba(255,255,255,0.12)", duration: 0.2, overwrite: "auto" });
        ingest(e.dataTransfer.files);
    };

    /* ── success overlay ── */
    if (success) {
        return (
            <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
                padding: 40,
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "rgba(91,168,120,0.12)",
                    border: "1px solid rgba(91,168,120,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#5BA878",
                }}>
                    <CheckIcon />
                </div>
                <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "13px",
                    fontWeight: 500, color: "#5BA878",
                }}>
                    Indexed successfully
                </div>
                <div style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
                    color: "#3E4A58", letterSpacing: "0.05em",
                }}>
                    Files added to Memory Panel
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* ── Header ── */}
            <div style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                padding: "22px 24px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
            }}>
                <div>
                    <h2 style={{
                        fontFamily: "'Inter', sans-serif", fontSize: "15px",
                        fontWeight: 600, color: "#D4DDE8",
                        letterSpacing: "-0.01em", lineHeight: 1, margin: 0,
                    }}>
                        Knowledge Ingestion
                    </h2>
                    <p style={{
                        fontFamily: "'Inter', sans-serif", fontSize: "11px",
                        color: "#4E5A6A", marginTop: 6, lineHeight: 1,
                    }}>
                        Upload documents to index into semantic memory
                    </p>
                </div>
                <button
                    onClick={onClose}
                    disabled={isProcessing}
                    title="Close"
                    style={{
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6, padding: 6,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        color: isProcessing ? "#2A3440" : "#4E5A6A",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "color 0.18s",
                    }}
                    onMouseEnter={e => { if (!isProcessing) e.currentTarget.style.color = "#C8D4E0"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = isProcessing ? "#2A3440" : "#4E5A6A"; }}
                >
                    <CloseIcon />
                </button>
            </div>

            {/* ── Body ── */}
            <div style={{
                flex: 1, overflowY: "auto", overflowX: "hidden",
                padding: "18px 24px",
                display: "flex", flexDirection: "column", gap: 14,
            }}>
                {/* Drop zone */}
                <div
                    ref={zoneRef}
                    role="button" tabIndex={0}
                    aria-label="Drop files or click to browse"
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
                    onDragEnter={onDragEnter}
                    onDragOver={e => e.preventDefault()}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    style={{
                        border: "1px dashed rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        padding: "30px 20px",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 10,
                        cursor: "pointer",
                        background: dragging ? "rgba(74,155,181,0.04)" : "rgba(255,255,255,0.01)",
                        transition: "background 0.18s",
                        userSelect: "none", flexShrink: 0,
                    }}
                >
                    <div style={{
                        color: dragging ? "#4A9BB5" : "#3E4A58",
                        transition: "color 0.18s, transform 0.2s",
                        transform: dragging ? "scale(1.06)" : "scale(1)",
                        lineHeight: 0,
                    }}>
                        <UploadCloudIcon color={dragging ? "#4A9BB5" : "#3E4A58"} />
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            fontFamily: "'Inter', sans-serif", fontSize: "13px",
                            fontWeight: 500,
                            color: dragging ? "#7AB8C8" : "#8B98A8",
                            lineHeight: 1, transition: "color 0.18s",
                        }}>
                            Drag &amp; Drop Files
                        </div>
                        <div style={{
                            fontFamily: "'Inter', sans-serif", fontSize: "11px",
                            color: "#3E4A58", marginTop: 5, letterSpacing: "0.02em",
                        }}>
                            or click to browse
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
                        {["PDF", "DOCX", "CSV", "JSON", "XLSX", "MD"].map(fmt => (
                            <span key={fmt} style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "9px", letterSpacing: "0.08em",
                                color: "#4E5A6A",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: 4, padding: "2px 7px",
                            }}>
                                {fmt}
                            </span>
                        ))}
                    </div>
                </div>

                <input
                    ref={inputRef} type="file" multiple
                    accept={[...ACCEPTED_EXT.map(e => `.${e}`), ...ACCEPTED_MIME].join(",")}
                    style={{ display: "none" }}
                    onChange={e => { ingest(e.target.files); e.target.value = ""; }}
                />

                {/* Upload queue */}
                {files.length > 0 && (
                    <div>
                        <div style={{
                            fontFamily: "'Inter', sans-serif", fontSize: "10px",
                            fontWeight: 500, letterSpacing: "0.1em",
                            color: "#3E4A58", textTransform: "uppercase", marginBottom: 8,
                        }}>
                            Ingestion Queue · {files.length} {files.length === 1 ? "file" : "files"}
                        </div>
                        {files.map(f => <UploadRow key={`upload-item-${f.id}`} file={f} />)}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 24px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
                    color: "#3E4A58", letterSpacing: "0.03em",
                }}>
                    {files.length === 0
                        ? "No files selected"
                        : `${files.length} ${files.length === 1 ? "file" : "files"} · auto-closes on completion`}
                </span>

                <button
                    onClick={() => files.length === 0 && inputRef.current?.click()}
                    disabled={isProcessing || files.length === 0}
                    style={{
                        padding: "8px 20px",
                        background: isProcessing
                            ? "rgba(74,155,181,0.06)"
                            : files.length === 0
                                ? "rgba(74,155,181,0.1)"
                                : "rgba(74,155,181,0.16)",
                        border: `1px solid ${isProcessing
                            ? "rgba(74,155,181,0.12)"
                            : "rgba(74,155,181,0.32)"}`,
                        borderRadius: 6,
                        fontFamily: "'Inter', sans-serif", fontSize: "11px",
                        fontWeight: 600, letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        color: isProcessing ? "#3A6070" : "#4A9BB5",
                        cursor: isProcessing || files.length === 0 ? "not-allowed" : "default",
                        transition: "background 0.18s, border-color 0.18s, color 0.18s",
                    }}
                    onMouseEnter={e => {
                        if (!isProcessing && files.length > 0) {
                            e.currentTarget.style.background = "rgba(74,155,181,0.24)";
                            e.currentTarget.style.borderColor = "rgba(74,155,181,0.5)";
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = isProcessing ? "rgba(74,155,181,0.06)" : "rgba(74,155,181,0.16)";
                        e.currentTarget.style.borderColor = isProcessing ? "rgba(74,155,181,0.12)" : "rgba(74,155,181,0.32)";
                    }}
                >
                    {isProcessing ? "Uploading & Indexing…" : "Upload & Index"}
                </button>
            </div>
        </div>
    );
}

/* ═══ MODAL SHELL (backdrop + card + GSAP) ════════════════════════════ */
function ModalShell({ onClose, onAllIndexed }) {
    const backdropRef = useRef(null);
    const cardRef = useRef(null);

    /* Open */
    useEffect(() => {
        const bd = backdropRef.current, cd = cardRef.current;
        if (!bd || !cd) return;
        const ctx = gsap.context(() => {
            gsap.timeline()
                .fromTo(bd, { opacity: 0 }, { opacity: 1, duration: 0.26, ease: "power2.out" })
                .fromTo(cd, { opacity: 0, scale: 0.97, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.30, ease: "power2.out" }, "-=0.16");
        });
        return () => ctx.revert();
    }, []);

    /* Close with animation */
    const animateClose = useCallback(() => {
        const bd = backdropRef.current, cd = cardRef.current;
        if (!bd || !cd) { onClose(); return; }
        const ctx = gsap.context(() => {
            gsap.timeline({ onComplete: () => { ctx.revert(); onClose(); } })
                .to(cd, { opacity: 0, scale: 0.97, y: 4, duration: 0.2, ease: "power2.in" })
                .to(bd, { opacity: 0, duration: 0.16, ease: "power2.in" }, "-=0.08");
        });
    }, [onClose]);

    /* ESC */
    useEffect(() => {
        const h = (e) => { if (e.key === "Escape") animateClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [animateClose]);

    /* Backdrop click */
    const onBackdropClick = (e) => {
        if (e.target === backdropRef.current) animateClose();
    };

    return createPortal(
        <div
            ref={backdropRef}
            onClick={onBackdropClick}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(5,6,12,0.74)",
                backdropFilter: "blur(5px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "24px", opacity: 0,
            }}
            aria-modal="true" role="dialog" aria-label="Knowledge Ingestion"
        >
            <div
                ref={cardRef}
                style={{
                    width: "100%", maxWidth: 548, maxHeight: "84vh",
                    background: "#0C0F16",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 14,
                    boxShadow: "0 40px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden", opacity: 0,
                }}
            >
                <ModalContent onClose={animateClose} onAllIndexed={onAllIndexed} />
            </div>
        </div>,
        document.body
    );
}

/* ═══ PUBLIC API ═══════════════════════════════════════════════════════
   Props:
     open           boolean
     onClose()      called after close animation completes
     onAllIndexed(entries[])  called with indexed file entries before close
══════════════════════════════════════════════════════════════════════ */
export default function IngestionModal({ open, onClose, onAllIndexed }) {
    if (!open) return null;
    return <ModalShell onClose={onClose} onAllIndexed={onAllIndexed ?? (() => { })} />;
}
