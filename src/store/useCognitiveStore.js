import { create } from "zustand";
import {
    getFiles,
    uploadAndWait,
    deleteFile,
    getVectorSpace,
    sendChatMessage,
    getAnalytics,
} from "../lib/api";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_SYSTEM_STATUS = {
    connection: "CONNECTED",
    vectorIndex: "READY",
    embeddingModel: "READY",
    llmStatus: "IDLE",
    activeMemoryCount: 0,
    totalVectorNodes: 0,
    memoryUsage: 0,
};

const DEFAULT_LOADING_STATE = {
    chat: false,
    memory: false,
    vectors: false,
    analytics: false,
};

/* ── helpers ────────────────────────────────────────────── */
const CATEGORY_BY_EXT = {
    pdf: "Compliance",
    csv: "Analytics",
    json: "Configuration",
    docx: "Operations",
    doc: "Operations",
    txt: "Logging",
    md: "Architecture",
    xlsx: "Reporting",
};

const COLOR_BY_CATEGORY = {
    Compliance: "#00F0FF",
    Analytics: "#BD00FF",
    Configuration: "#00FFA3",
    Operations: "#FFD600",
    Logging: "#FF8A00",
    Architecture: "#5BA878",
    Reporting: "#FF4D4D",
    General: "#7A8899",
};

/**
 * Direct mapping from the backend's doc_type strings to vivid colors.
 * These match exactly what the FastAPI backend returns in /vector-space.
 */
const DOC_TYPE_COLORS = {
    Standard_Operating_Procedure: "#00F0FF",   // cyan
    Maintenance_Manual: "#9D4EDD",   // violet
    Historical_Fault_Log: "#FF4D6D",   // rose-red
    Equipment_Rulebook: "#FFD60A",   // amber
    Continuous_Data_Log: "#06D6A0",   // mint-green
    General_Document: "#7A8899",   // muted
};

const fileExt = (name = "") => name.split(".").pop()?.toLowerCase() || "";
const categoryForFile = (name = "") => CATEGORY_BY_EXT[fileExt(name)] || "General";

const toFileSizeLabel = (bytes = 0) => {
    if (bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** Normalise a raw file entry from the backend /files response */
const normalizeFileEntry = (file, index = 0) => {
    const name = file?.file_name || file?.filename || file?.name || `file-${index + 1}`;
    const sizeBytes = Number(file?.size_bytes || file?.size || file?.sizeBytes || 0);
    const chunks = Number(file?.chunk_count || file?.chunks || 0);
    const category = categoryForFile(name);
    const ext = fileExt(name);
    const uploadedAt = file?.uploaded_at || file?.upload_time || new Date().toISOString();

    return {
        id: `doc-${name}-${index}`,
        name,
        sizeBytes,
        size: toFileSizeLabel(sizeBytes),
        chunks,
        pointCount: chunks,
        status: "Indexed",
        type: (ext || "doc").slice(0, 4),
        activity: "active",
        category,
        color: COLOR_BY_CATEGORY[category] || COLOR_BY_CATEGORY.General,
        createdAt: uploadedAt,
    };
};

/**
 * Normalise a raw vector point from the backend /vector-space response.
 *
 * The backend returns PCA-reduced coordinates in roughly [-0.5, 0.5].
 * We scale by 100 to spread them across the Three.js scene which has
 * a grid at y=-25 and camera at [60,40,60].
 */
const PCA_SCALE = 100;

const normalizeVectorPoint = (point, index = 0) => {
    const x = Number(point?.x ?? point?.position?.[0] ?? 0) * PCA_SCALE;
    const y = Number(point?.y ?? point?.position?.[1] ?? 0) * PCA_SCALE;
    const z = Number(point?.z ?? point?.position?.[2] ?? 0) * PCA_SCALE;
    const source = point?.source || point?.file_name || point?.documentName || "unknown";
    const excerpt = point?.excerpt || point?.text_preview || point?.textPreview || "";
    const docType = point?.doc_type || point?.category || categoryForFile(source);
    const id = String(point?.id ?? point?.chunk_id ?? `vec-${index}`);

    // Prefer exact doc_type match → file-category color → general fallback
    const color =
        DOC_TYPE_COLORS[docType] ||
        COLOR_BY_CATEGORY[CATEGORY_BY_EXT[source.split(".").pop()?.toLowerCase() || ""] || ""] ||
        COLOR_BY_CATEGORY.General;

    return {
        id,
        position: [x, y, z],
        source,
        excerpt,
        doc_type: docType,
        category: docType,          // used by tooltip badge
        color,
        documentName: source,
        textPreview: excerpt,
        chunkId: index + 1,
    };
};

const generateFollowUps = (responseText) => {
    if (!responseText?.trim()) return [];
    const topic = responseText.split(" ").slice(0, 5).join(" ");
    return [
        `Can you expand on: "${topic}"?`,
        "What are the key dependencies or constraints?",
        "What failure modes or risks should be considered?",
        "How can this be improved or automated?",
    ];
};

const useCognitiveStore = create((set, get) => ({
    // Chat + system
    messages: [],
    systemEvents: [{ id: makeId(), timestamp: Date.now(), type: "system", description: "Cognitive Engine Online" }],
    toast: null,
    sessionId: makeId(),

    // Real data state
    memoryFiles: [],
    vectorResults: [],
    analytics: { trends: [], faults: [] },
    loadingState: DEFAULT_LOADING_STATE,
    systemStatus: DEFAULT_SYSTEM_STATUS,
    error: null,

    // Chat context
    chatContext: {
        intent: "IDLE",
        activeDocuments: [],
        retrievedChunks: 0,
    },

    // Vector selection state (for RAG highlight)
    queryVector: null,
    selectedChunkIds: [],
    similarityScores: {},

    // UI state
    hoveredChunk: null,
    selectedNode: null,
    isFullscreenVector: false,

    // ── Toasts / Events ────────────────────────────────────────
    addSystemEvent: (event) =>
        set((state) => ({
            systemEvents: [{ id: makeId(), timestamp: Date.now(), ...event }, ...state.systemEvents].slice(0, 100),
        })),

    showToast: (message) => {
        set({ toast: message });
        setTimeout(() => {
            if (get().toast === message) set({ toast: null });
        }, 2800);
    },
    clearToast: () => set({ toast: null }),

    // ── UI toggles ─────────────────────────────────────────────
    setHoveredChunk: (chunk) => set({ hoveredChunk: chunk || null }),
    setSelectedNode: (node) => set({ selectedNode: node || null }),
    toggleFullscreenVector: () => set((state) => ({ isFullscreenVector: !state.isFullscreenVector })),

    resetQueryState: () =>
        set({
            queryVector: null,
            selectedChunkIds: [],
            similarityScores: {},
            hoveredChunk: null,
            selectedNode: null,
        }),

    clearChatHistory: () =>
        set({
            messages: [],
            chatContext: { intent: "IDLE", activeDocuments: [], retrievedChunks: 0 },
        }),

    // ── Load files from backend ────────────────────────────────
    loadMemoryFiles: async () => {
        set((state) => ({ loadingState: { ...state.loadingState, memory: true }, error: null }));
        try {
            const raw = await getFiles();
            const files = Array.isArray(raw)
                ? raw.map((f, i) => normalizeFileEntry(f, i))
                : Array.isArray(raw?.files)
                    ? raw.files.map((f, i) => normalizeFileEntry(f, i))
                    : [];

            set((state) => ({
                memoryFiles: files,
                loadingState: { ...state.loadingState, memory: false },
                systemStatus: {
                    ...state.systemStatus,
                    activeMemoryCount: files.length,
                    vectorIndex: files.length ? "READY" : "EMPTY",
                },
            }));
            return files;
        } catch (err) {
            console.error("[loadMemoryFiles]", err);
            set((state) => ({
                loadingState: { ...state.loadingState, memory: false },
                error: err.message,
            }));
            get().addSystemEvent({ type: "system", description: `File load failed: ${err.message}` });
            return [];
        }
    },

    // ── Upload files (sync with polling) ──────────────────────
    uploadFiles: async (files) => {
        const { addSystemEvent, loadMemoryFiles, loadVectors, loadAnalytics } = get();

        // Snapshot: is this the very first time documents are being indexed?
        const isFirstUpload = get().memoryFiles.length === 0;

        set((state) => ({
            loadingState: { ...state.loadingState, memory: true },
            error: null,
            systemStatus: { ...state.systemStatus, connection: "PROCESSING" },
        }));

        try {
            const result = await uploadAndWait(files);
            addSystemEvent({ type: "index", description: `Uploaded ${files.length} file(s) successfully.` });

            // Refresh all panels
            await loadMemoryFiles();
            await loadVectors();
            await loadAnalytics();

            set((state) => ({
                loadingState: { ...state.loadingState, memory: false },
                systemStatus: { ...state.systemStatus, connection: "CONNECTED" },
            }));

            const fileNames = Array.from(files).map(f => f.name);
            const totalChunks = get().vectorResults.length;

            // ── Build the chat message ─────────────────────────────────
            let msgText;

            if (isFirstUpload) {
                // Use the LLM-generated auto_summary from the backend job result
                const backendSummary = result?.result?.auto_summary;

                if (backendSummary && backendSummary.trim() && !backendSummary.startsWith("Auto-summary failed")) {
                    msgText = backendSummary;
                } else {
                    // Graceful fallback if LLM call failed on the backend
                    msgText = [
                        `<REASONING>\nAnalyzed ${fileNames.length} document(s): ${fileNames.join(", ")}.\n`,
                        `Semantic chunking complete — ${totalChunks} vector fragments indexed.\n</REASONING>\n\n`,
                        `<ANSWER>\n**Knowledge Base Initialized.**\n\n`,
                        `Successfully ingested **${fileNames.length} document(s)** into semantic memory:\n\n`,
                        fileNames.map(n => `• \`${n}\``).join("\n"),
                        `\n\n**${totalChunks} vector chunks** are now searchable. `,
                        `You can now ask questions about the uploaded content.\n</ANSWER>`,
                    ].join("");
                }
            } else {
                // Subsequent uploads — brief confirmation, no full summary
                msgText = [
                    `<REASONING>\nNew documents appended to existing knowledge base.\n</REASONING>\n\n`,
                    `<ANSWER>\n**${fileNames.length} document(s) indexed** into semantic memory:\n\n`,
                    fileNames.map(n => `• \`${n}\``).join("\n"),
                    `\n\nKnowledge base now contains **${totalChunks} total vector chunks**.\n</ANSWER>`,
                ].join("");
            }

            const summaryMessage = {
                id: makeId(),
                sender: "ai",           // renders with full AI styling in ChatPanel
                text: msgText,
                intent: "INFORMATIONAL",
                sources: fileNames.map(n => ({ source: n, excerpt: "" })),
                followUps: isFirstUpload ? [
                    "Summarize the key findings across all documents.",
                    "What are the most critical compliance points?",
                    "Are there any recurring fault patterns in the logs?",
                    "What maintenance actions are overdue?",
                ] : [
                    `What's new in the recently uploaded documents?`,
                    "How does this compare to previous data?",
                ],
                createdAt: Date.now(),
                isAutoSummary: true,    // flag so ChatPanel can style it differently if needed
            };

            set((state) => ({ messages: [...state.messages, summaryMessage] }));

            return result;
        } catch (err) {
            console.error("[uploadFiles]", err);
            set((state) => ({
                loadingState: { ...state.loadingState, memory: false },
                error: err.message,
                systemStatus: { ...state.systemStatus, connection: "ERROR" },
            }));
            get().showToast(`Upload failed: ${err.message}`);
            addSystemEvent({ type: "system", description: `Upload failed: ${err.message}` });
            throw err;
        }
    },


    // ── Delete file ────────────────────────────────────────────
    removeFile: async (filename) => {
        const { addSystemEvent, loadVectors } = get();

        // ── Optimistic removal: update UI instantly ──────────────
        const previousFiles = get().memoryFiles;
        set((state) => ({
            memoryFiles: state.memoryFiles.filter(f => f.name !== filename),
        }));

        try {
            await deleteFile(filename);
            addSystemEvent({ type: "system", description: `Removed file: ${filename}` });
            // Refresh vectors to reflect the removal (no need to re-fetch files)
            await loadVectors();
        } catch (err) {
            console.error("[removeFile]", err);
            // Revert optimistic removal on failure
            set(() => ({ memoryFiles: previousFiles }));
            get().showToast(`Delete failed: ${err.message}`);
        }
    },


    // ── Load vector space ─────────────────────────────────────
    loadVectors: async () => {
        set((state) => ({ loadingState: { ...state.loadingState, vectors: true }, error: null }));
        try {
            const raw = await getVectorSpace();
            const points = Array.isArray(raw)
                ? raw.map((p, i) => normalizeVectorPoint(p, i))
                : Array.isArray(raw?.vectors)
                    ? raw.vectors.map((p, i) => normalizeVectorPoint(p, i))
                    : Array.isArray(raw?.points)
                        ? raw.points.map((p, i) => normalizeVectorPoint(p, i))
                        : [];

            set((state) => ({
                vectorResults: points,
                loadingState: { ...state.loadingState, vectors: false },
                systemStatus: {
                    ...state.systemStatus,
                    totalVectorNodes: points.length,
                    embeddingModel: points.length ? "READY" : "IDLE",
                },
            }));
            return points;
        } catch (err) {
            console.error("[loadVectors]", err);
            set((state) => ({
                loadingState: { ...state.loadingState, vectors: false },
                error: err.message,
            }));
            return [];
        }
    },

    // ── Load analytics ────────────────────────────────────────
    loadAnalytics: async () => {
        set((state) => ({ loadingState: { ...state.loadingState, analytics: true } }));
        try {
            const raw = await getAnalytics();

            // Normalise into the shape the UI expects: { trends, faults }
            const trends = Array.isArray(raw?.trends)
                ? raw.trends.map((d, i) => ({
                    time: String(d.time ?? d.t ?? i + 1),
                    faultlog: Number(d.faultlog ?? d.v ?? d.value ?? 0),
                }))
                : [];

            const faults = Array.isArray(raw?.faults)
                ? raw.faults.map((f) => ({ name: f.name ?? f.label ?? "Unknown", count: Number(f.count ?? f.value ?? 0) }))
                : Array.isArray(raw?.top_faults)
                    ? raw.top_faults.map((f) => ({ name: f.name ?? f.label ?? "Unknown", count: Number(f.count ?? f.value ?? 0) }))
                    : [];

            set((state) => ({
                analytics: { trends, faults, raw },
                loadingState: { ...state.loadingState, analytics: false },
            }));
            return { trends, faults };
        } catch (err) {
            console.error("[loadAnalytics]", err);
            set((state) => ({ loadingState: { ...state.loadingState, analytics: false } }));
            return { trends: [], faults: [] };
        }
    },

    // ── Send chat message ──────────────────────────────────────
    sendQuery: async (query) => {
        const { addSystemEvent, sessionId } = get();

        const userMessage = { id: makeId(), sender: "user", text: query, createdAt: Date.now() };

        set((state) => ({
            loadingState: { ...state.loadingState, chat: true },
            messages: [...state.messages.map((m) => ({ ...m, followUps: undefined })), userMessage],
            queryVector: null,
            selectedChunkIds: [],
            similarityScores: {},
            systemStatus: {
                ...state.systemStatus,
                connection: "PROCESSING",
                llmStatus: "PROCESSING",
            },
        }));

        addSystemEvent({ type: "search", description: `Processing query: ${query}` });

        try {
            const result = await sendChatMessage(query, sessionId);

            const responseText =
                result?.answer ||
                result?.response ||
                result?.text ||
                result?.message ||
                "No response received.";

            const intent = result?.intent || result?.category || "ANALYSIS";
            const sources = Array.isArray(result?.sources) ? result.sources : [];
            const retrievedIds = Array.isArray(result?.retrieved_chunk_ids)
                ? result.retrieved_chunk_ids
                : Array.isArray(result?.chunk_ids)
                    ? result.chunk_ids
                    : [];

            const followUps = generateFollowUps(responseText);

            const aiMessage = {
                id: makeId(),
                sender: "ai",
                text: responseText,
                intent,
                sources,
                followUps,
                createdAt: Date.now(),
            };

            // Build similarity scores for vector highlight
            const similarityScores = {};
            if (Array.isArray(result?.similarity_scores)) {
                result.similarity_scores.forEach(({ id, score }) => {
                    similarityScores[id] = score;
                });
            }

            set((state) => ({
                messages: [...state.messages, aiMessage],
                chatContext: { intent, activeDocuments: sources, retrievedChunks: retrievedIds.length },
                selectedChunkIds: retrievedIds,
                queryVector: Array.isArray(result?.query_vector) ? result.query_vector : null,
                similarityScores,
                loadingState: { ...state.loadingState, chat: false },
                systemStatus: { ...state.systemStatus, connection: "CONNECTED", llmStatus: "READY" },
            }));

            addSystemEvent({ type: "search", description: "Response generated." });
            return { answer: responseText, chunks: retrievedIds };
        } catch (err) {
            console.error("[sendQuery]", err);
            const errorMessage = {
                id: makeId(),
                sender: "ai",
                text: `Cognitive failure: ${err.message}`,
                intent: "ERROR",
                sources: [],
                createdAt: Date.now(),
            };

            set((state) => ({
                messages: [...state.messages, errorMessage],
                loadingState: { ...state.loadingState, chat: false },
                systemStatus: { ...state.systemStatus, connection: "ERROR", llmStatus: "ERROR" },
            }));

            addSystemEvent({ type: "system", description: `Query failed: ${err.message}` });
            return { answer: errorMessage.text, chunks: [] };
        }
    },

    // ── Legacy compat shim used by FileIngestion ───────────────
    processUploadedFiles: (entries = []) => {
        // No-op shim: real uploads go through uploadFiles()
        // Kept so IngestionModal.onAllIndexed doesn't crash
    },

    // ── Legacy compat: uploadFile (single) ────────────────────
    uploadFile: async (file) => {
        return get().uploadFiles([file]);
    },
}));

export default useCognitiveStore;
