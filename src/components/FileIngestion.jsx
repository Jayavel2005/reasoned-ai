import { useState, useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";

/* ─── constants ─────────────────────────────────────────────────────── */
const ACCEPTED = ["pdf", "csv", "docx", "json", "md", "txt", "xlsx"];
const UPLOAD_MS = 1800;
const PROCESSING_MS = 2200;

/* ─── helpers ───────────────────────────────────────────────────────── */
let _uid = 0;
const uid = () => `f${++_uid}`;

function fmtSize(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    return bytes > 1_048_576
        ? `${(bytes / 1_048_576).toFixed(1)} MB`
        : `${(bytes / 1024).toFixed(0)} KB`;
}

/* ─── icons ─────────────────────────────────────────────────────────── */
function UploadArrowIcon({ size = 22 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M4 20h16" />
        </svg>
    );
}

function FileTypeIcon({ ext }) {
    const COLORS = {
        pdf: "#E05252", csv: "#5BB87A", docx: "#4A8FD4",
        json: "#E0A952", md: "#9B8ED4", xlsx: "#5BB87A",
    };
    const color = COLORS[ext] ?? "#6B7B8E";
    return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none"
            xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
            style={{ flexShrink: 0 }}>
            <rect width="26" height="26" rx="4" fill={color} fillOpacity="0.12" />
            <rect width="26" height="26" rx="4" stroke={color} strokeWidth="0.8" strokeOpacity="0.35" />
            <text x="13" y="17" textAnchor="middle"
                style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 6.5,
                    fontWeight: 600,
                    fill: color,
                    textTransform: "uppercase",
                }}>
                {(ext ?? "FILE").toUpperCase().slice(0, 4)}
            </text>
        </svg>
    );
}

function CrossIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            aria-hidden="true">
            <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" />
        </svg>
    );
}

/* ─── progress bar ──────────────────────────────────────────────────── */
function ProgressBar({ pct = 0, shimmer = false }) {
    const fillRef = useRef(null);

    useEffect(() => {
        if (!fillRef.current || shimmer) return;
        gsap.to(fillRef.current, {
            width: `${Math.min(100, Math.max(0, pct))}%`,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto",
        });
    }, [pct, shimmer]);

    return (
        <div style={{
            position: "relative",
            height: 2,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 2,
            overflow: "hidden",
            width: "100%",
            flexShrink: 0,
        }}>
            {shimmer ? (
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, transparent 0%, rgba(74,155,181,0.6) 40%, rgba(74,155,181,0.9) 50%, rgba(74,155,181,0.6) 60%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerSweep 1.4s linear infinite",
                }} />
            ) : (
                <div
                    ref={fillRef}
                    style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: "0%",
                        background: "#4A9BB5",
                        borderRadius: 2,
                    }}
                />
            )}
        </div>
    );
}

/* ─── status badge ──────────────────────────────────────────────────── */
function StatusBadge({ status, error }) {
    const S = {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
    };

    if (status === "indexed") {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#5BA878", flexShrink: 0 }} />
                <span style={{ ...S, color: "#5BA878" }}>Indexed</span>
            </div>
        );
    }
    if (status === "error") {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#C0524A", flexShrink: 0 }} />
                <span style={{ ...S, color: "#C0524A" }}>{error ?? "Failed"}</span>
            </div>
        );
    }
    if (status === "uploading") return <span style={{ ...S, color: "#4A9BB5" }}>Uploading…</span>;
    if (status === "processing") return <span style={{ ...S, color: "#7A8899" }}>Processing…</span>;
    return null;
}

/* ─── file row (local simulated) ────────────────────────────────────── */
function FileRow({ file, onRemove }) {
    const rowRef = useRef(null);
    const hasBar = file.status === "uploading" || file.status === "processing";

    // Entry animation — scoped, guarded
    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
            );
        });
        return () => ctx.revert();
    }, []);

    const handleRemove = () => {
        const el = rowRef.current;
        if (!el) { onRemove(file.id); return; }

        const ctx = gsap.context(() => {
            gsap.timeline()
                .to(el, { opacity: 0, x: -10, duration: 0.2, ease: "power2.in" })
                .to(el, {
                    height: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    marginBottom: 0,
                    duration: 0.18,
                    ease: "power2.inOut",
                    onComplete: () => {
                        ctx.revert();
                        onRemove(file.id);
                    },
                });
        });
    };

    const ext = file.name?.split(".")?.pop()?.toLowerCase() ?? "";

    return (
        <div
            ref={rowRef}
            style={{
                opacity: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "9px 11px",
                marginBottom: 6,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 6,
                overflow: "hidden",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <FileTypeIcon ext={ext} />

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#C8D4E0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                    }}>
                        {file.name ?? "unnamed"}
                    </span>
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10px",
                        color: "#4E5A6A",
                        letterSpacing: "0.03em",
                    }}>
                        {file.size ?? ""}
                    </span>
                </div>

                <StatusBadge status={file.status ?? "uploading"} error={file.error} />

                <button
                    onClick={handleRemove}
                    title="Remove"
                    style={{
                        background: "none",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                        color: "#3E4A58",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "color 0.18s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#C0524A")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#3E4A58")}
                >
                    <CrossIcon />
                </button>
            </div>

            {hasBar && (
                <ProgressBar
                    pct={file.progress ?? 0}
                    shimmer={file.status === "processing"}
                />
            )}
        </div>
    );
}

/* ─── store file row (read-only, from real backend) ─────────────────── */
function StoreFileRow({ file }) {
    if (!file) return null;
    const ext = file.name?.split(".")?.pop()?.toLowerCase() ?? "";
    const isActive = file.activity === "active";
    const isProcss = file.status === "Indexing";

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 11px",
            marginBottom: 6,
            background: isActive ? "rgba(74,155,181,0.06)" : "rgba(255,255,255,0.02)",
            border: isActive
                ? "1px solid rgba(74,155,181,0.2)"
                : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
        }}>
            <FileTypeIcon ext={ext} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#C8D4E0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                }}>
                    {file.name ?? "unnamed"}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "#4E5A6A" }}>
                    {file.size ?? ""}
                </span>
            </div>
            {isProcss ? (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "#7A8899" }}>Processing…</span>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: isActive ? "#4A9BB5" : "#5BA878",
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10px",
                        color: isActive ? "#4A9BB5" : "#5BA878",
                        letterSpacing: "0.04em",
                    }}>
                        {isActive ? "In Use" : "Indexed"}
                    </span>
                </div>
            )}
        </div>
    );
}

/* ─── indexed chunks counter ────────────────────────────────────────── */
/*  FIX: gsap.fromTo requires (targets, fromVars, toVars) — 3 arguments.
    Passing a plain object as the "target" causes GSAP to try to set
    internal props (like `parent`) on it, crashing if the object is frozen
    or if the structure GSAP expects isn't there.
    Correct approach: use a ref-object holder so GSAP has a real mutable
    target, and read `.val` inside onUpdate.             */
function ChunkCounter({ count = 0 }) {
    const numRef = useRef(null);
    const counterRef = useRef({ val: 0 });   // mutable GSAP target

    useEffect(() => {
        if (!numRef.current) return;

        const from = counterRef.current.val;
        const safeCount = typeof count === "number" && isFinite(count) ? count : 0;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                counterRef.current,             // ← valid mutable object target
                { val: from },
                {
                    val: safeCount,
                    duration: 0.7,
                    ease: "power2.out",
                    onUpdate() {
                        if (numRef.current) {
                            numRef.current.textContent = Math.round(counterRef.current.val);
                        }
                    },
                    onComplete() {
                        counterRef.current.val = safeCount;
                    },
                }
            );
        });

        return () => ctx.revert();
    }, [count]);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5,
            background: "rgba(255,255,255,0.015)",
            flexShrink: 0,
        }}>
            <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                fontWeight: 400,
                color: "#4E5A6A",
                letterSpacing: "0.04em",
            }}>
                Indexed Chunks
            </span>
            <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "13px",
                fontWeight: 500,
                color: "#5BA878",
                minWidth: 28,
                textAlign: "right",
            }}>
                <span ref={numRef}>{count}</span>
            </span>
        </div>
    );
}

/* ─── main component ─────────────────────────────────────────────────── */
export default function FileIngestion({
    onUpload = null,
    storeFiles = [],
    isIndexing = false,
    memoryUsage = undefined,
}) {
    const [files, setFiles] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [chunks, setChunks] = useState(0);
    const inputRef = useRef(null);
    const zoneRef = useRef(null);
    const timers = useRef({});

    /* ── pipeline: upload → processing → indexed ── */
    const runPipeline = useCallback((id) => {
        let pct = 0;
        const interval = setInterval(() => {
            pct = Math.min(pct + Math.random() * 18 + 8, 100);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: Math.round(pct) } : f));

            if (pct >= 100) {
                clearInterval(interval);
                setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "processing", progress: 100 } : f));
                timers.current[id] = setTimeout(() => {
                    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "indexed" } : f));
                    setChunks(c => c + Math.floor(Math.random() * 40 + 20));
                    delete timers.current[id];
                }, PROCESSING_MS);
            }
        }, UPLOAD_MS / 12);

        timers.current[`interval_${id}`] = interval;
    }, []);

    /* ── ingest ── */
    const ingest = useCallback((rawFiles) => {
        const incoming = Array.from(rawFiles ?? []).filter(f => {
            const ext = f.name?.split(".")?.pop()?.toLowerCase() ?? "";
            return ACCEPTED.includes(ext);
        });
        if (!incoming.length) return;

        const entries = incoming.map(f => ({
            id: uid(),
            name: f.name,
            size: fmtSize(f.size),
            status: "uploading",
            progress: 0,
        }));

        setFiles(prev => [...prev, ...entries]);
        entries.forEach(e => runPipeline(e.id));

        if (onUpload) {
            incoming.forEach(f => onUpload(f).catch(() => { }));
        }
    }, [runPipeline, onUpload]);

    /* ── remove ── */
    const removeFile = useCallback((id) => {
        clearTimeout(timers.current[id]);
        clearInterval(timers.current[`interval_${id}`]);
        delete timers.current[id];
        delete timers.current[`interval_${id}`];
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    /* ── cleanup ── */
    useEffect(() => {
        const t = timers.current;
        return () => Object.values(t).forEach(id => {
            clearTimeout(id);
            clearInterval(id);
        });
    }, []);

    /* ── drag zone ── */
    const onDragEnter = (e) => {
        e.preventDefault();
        setDragging(true);
        if (zoneRef.current) {
            gsap.to(zoneRef.current, { borderColor: "rgba(74,155,181,0.45)", duration: 0.18 });
        }
    };
    const onDragLeave = (e) => {
        e.preventDefault();
        setDragging(false);
        if (zoneRef.current) {
            gsap.to(zoneRef.current, { borderColor: "rgba(255,255,255,0.10)", duration: 0.22 });
        }
    };
    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (zoneRef.current) {
            gsap.to(zoneRef.current, { borderColor: "rgba(255,255,255,0.10)", duration: 0.22 });
        }
        ingest(e.dataTransfer.files);
    };

    const safeStoreFiles = Array.isArray(storeFiles) ? storeFiles : [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* ── Upload zone ─────────────────────────────────────── */}
            <div
                ref={zoneRef}
                role="button"
                tabIndex={0}
                aria-label="Drop cognitive files or click to upload"
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
                onDragEnter={onDragEnter}
                onDragOver={e => e.preventDefault()}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={{
                    border: "1px dashed rgba(255,255,255,0.10)",
                    borderRadius: 8,
                    padding: "18px 14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    background: dragging ? "rgba(74,155,181,0.045)" : "transparent",
                    transition: "background 0.18s",
                    userSelect: "none",
                }}
            >
                <div style={{
                    color: dragging ? "#4A9BB5" : "#3E4A58",
                    transition: "color 0.18s, transform 0.18s",
                    transform: dragging ? "scale(1.06)" : "scale(1)",
                    lineHeight: 0,
                }}>
                    <UploadArrowIcon size={20} />
                </div>

                <div style={{ textAlign: "center" }}>
                    <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#8B98A8",
                        lineHeight: 1,
                    }}>
                        Ingest Cognitive Files
                    </div>
                    <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "10px",
                        color: "#3E4A58",
                        marginTop: 5,
                        letterSpacing: "0.04em",
                    }}>
                        PDF · CSV · DOCX · JSON · XLSX · MD
                    </div>
                </div>

                <button
                    onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                    style={{
                        marginTop: 2,
                        padding: "4px 14px",
                        background: "rgba(74,155,181,0.1)",
                        border: "1px solid rgba(74,155,181,0.25)",
                        borderRadius: 4,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "11px",
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        color: "#4A9BB5",
                        cursor: "pointer",
                        transition: "background 0.18s, border-color 0.18s",
                        lineHeight: "22px",
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(74,155,181,0.18)";
                        e.currentTarget.style.borderColor = "rgba(74,155,181,0.45)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(74,155,181,0.1)";
                        e.currentTarget.style.borderColor = "rgba(74,155,181,0.25)";
                    }}
                >
                    Select Files
                </button>
            </div>

            {/* Hidden input */}
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED.map(e => `.${e}`).join(",")}
                style={{ display: "none" }}
                onChange={e => { ingest(e.target.files); e.target.value = ""; }}
            />

            {/* ── Local queue ──────────────────────────────────────── */}
            {files.length > 0 && (
                <div>
                    <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        color: "#3E4A58",
                        textTransform: "uppercase",
                        marginBottom: 7,
                    }}>
                        Ingestion Queue
                    </div>
                    {files.map(f => (
                        <FileRow key={`upload-row-${f.id}`} file={f} onRemove={removeFile} />
                    ))}
                </div>
            )}

            {/* ── Store-backed active vectors ───────────────────────── */}
            {safeStoreFiles.length > 0 && (
                <div>
                    <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        color: "#3E4A58",
                        textTransform: "uppercase",
                        marginBottom: 7,
                    }}>
                        Active Vectors
                    </div>
                    {safeStoreFiles.map(f => (
                        <StoreFileRow key={`active-vector-${f.id ?? f.name}`} file={f} />
                    ))}
                </div>
            )}

            {/* ── Indexed chunks counter ────────────────────────────── */}
            <ChunkCounter count={chunks} />

            {/* ── Neural capacity bar (when connected to store) ─────── */}
            {typeof memoryUsage === "number" && (
                <div style={{
                    padding: "8px 12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.015)",
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "10px",
                            color: "#4E5A6A",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                        }}>
                            Neural Capacity
                        </span>
                        <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "10px",
                            color: "#5BA878",
                        }}>
                            {memoryUsage}%
                        </span>
                    </div>
                    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                            height: "100%",
                            width: `${Math.min(100, Math.max(0, memoryUsage))}%`,
                            background: "#4A9BB5",
                            borderRadius: 2,
                            transition: "width 0.8s ease",
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
}
