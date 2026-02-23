import { create } from "zustand";

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

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const hashString = (value = "") => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
        h = (h << 5) - h + value.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
};

const seeded = (seed) => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
};

const parseSizeFromDisplay = (value) => {
    if (typeof value !== "string") return 0;
    const match = value.trim().match(/^([\d.]+)\s*(KB|MB|GB)$/i);
    if (!match) return 0;
    const amount = Number(match[1]);
    const unit = match[2].toUpperCase();
    if (!Number.isFinite(amount)) return 0;
    if (unit === "KB") return Math.round(amount * 1024);
    if (unit === "MB") return Math.round(amount * 1024 * 1024);
    if (unit === "GB") return Math.round(amount * 1024 * 1024 * 1024);
    return 0;
};

const toFileSizeLabel = (bytes = 0) => {
    if (bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const fileExt = (name = "") => name.split(".").pop()?.toLowerCase() || "";

const categoryForFile = (name = "") => CATEGORY_BY_EXT[fileExt(name)] || "General";

const chunkCountFromSize = (sizeBytes) => {
    const sizeMB = sizeBytes > 0 ? sizeBytes / (1024 * 1024) : 0.35;
    const scaled = 5 + Math.floor(sizeMB * 2.5);
    return clamp(scaled, 5, 20);
};

const cosineSimilarity = (a, b) => {
    const dot = a.x * b.x + a.y * b.y + a.z * b.z;
    const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
};

const normalizeUploadEntry = (file, index = 0) => {
    const name = file?.name || file?.file_name || `uploaded-${index + 1}.txt`;
    const sizeBytes =
        Number(file?.size) ||
        Number(file?._size) ||
        Number(file?.sizeBytes) ||
        parseSizeFromDisplay(file?.size);
    const category = categoryForFile(name);
    const idSeed = hashString(`${name}-${sizeBytes}-${index}`);

    return {
        id: `doc-${idSeed}`,
        name,
        sizeBytes,
        size: toFileSizeLabel(sizeBytes),
        status: "Indexed",
        type: (fileExt(name) || "doc").slice(0, 4),
        activity: "active",
        category,
        color: COLOR_BY_CATEGORY[category] || COLOR_BY_CATEGORY.General,
        createdAt: new Date().toISOString(),
    };
};

const buildMemoryArtifacts = (documents) => {
    const chunks = [];
    const vectors = {};

    documents.forEach((doc, docIndex) => {
        const count = chunkCountFromSize(doc.sizeBytes);
        const baseSeed = hashString(`${doc.id}:${doc.name}:${doc.sizeBytes}`);
        const rand = seeded(baseSeed || docIndex + 1);

        for (let i = 0; i < count; i += 1) {
            const chunkId = `${doc.id}-chunk-${i + 1}`;
            const textPreview = `${doc.name} segment ${i + 1}: extracted ${doc.category.toLowerCase()} context for semantic indexing and retrieval.`;
            const chunk = {
                id: chunkId,
                documentId: doc.id,
                documentName: doc.name,
                chunkId: i + 1,
                textPreview,
                category: doc.category,
                color: doc.color,
                createdAt: new Date().toISOString(),
            };

            if (!vectors[chunkId]) {
                vectors[chunkId] = {
                    x: Number(((rand() * 100) - 50).toFixed(4)),
                    y: Number(((rand() * 100) - 50).toFixed(4)),
                    z: Number(((rand() * 100) - 50).toFixed(4)),
                };
            }

            chunks.push(chunk);
        }
    });

    const vectorResults = chunks.map((chunk) => {
        const vector = vectors[chunk.id] || { x: 0, y: 0, z: 0 };
        return {
            ...chunk,
            position: [vector.x, vector.y, vector.z],
        };
    });

    return { chunks, vectors, vectorResults };
};

const generateSummaryMessage = (documents, chunks) => {
    const categories = [...new Set(documents.map((d) => d.category))];
    const totalSize = documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
    const avgChunks = documents.length ? (chunks.length / documents.length).toFixed(1) : "0.0";

    return {
        id: makeId(),
        sender: "system",
        summary: {
            totalFiles: documents.length,
            totalChunks: chunks.length,
            fileTypes: [...new Set(documents.map((d) => d.type.toUpperCase()))],
            docTypes: categories,
            themes: categories.map((c) => `${c.toLowerCase()} reasoning`),
            systemType: "Frontend Mock RAG Pipeline",
            hasDecisionRules: categories.includes("Configuration") || categories.includes("Analytics"),
            hasHumanInLoop: true,
            constraints: [
                `Average chunk density: ${avgChunks} segments per document`,
                `Indexed corpus size: ${toFileSizeLabel(totalSize)}`,
                "Similarity calculations are simulation-grade only",
            ],
            fileNames: documents.map((d) => d.name),
        },
        text: "Document intelligence summary generated.",
        createdAt: Date.now(),
    };
};

const generateQueryVector = (query) => {
    const seed = hashString(query || "query");
    const rand = seeded(seed || 1);
    return {
        x: Number(((rand() * 100) - 50).toFixed(4)),
        y: Number(((rand() * 100) - 50).toFixed(4)),
        z: Number(((rand() * 100) - 50).toFixed(4)),
    };
};

const generateAnswerText = (query, retrievedChunks) => {
    const categories = [...new Set(retrievedChunks.map((c) => c.category))];
    const themes = categories.length ? categories.join(", ") : "general context";
    const docs = [...new Set(retrievedChunks.map((c) => c.documentName))];
    const previews = retrievedChunks
        .slice(0, 3)
        .map((c) => c.textPreview.replace(/\.$/, ""))
        .join("; ");

    return [
        "Title: Contextual Response",
        `• Summary insight: The query \"${query}\" aligns with retrieved semantic memory from ${docs.join(", ") || "the active corpus"}.`,
        `• Retrieved segments count: ${retrievedChunks.length} segments were used for synthesis.`,
        `• Key themes detected: ${themes}.`,
        `• Structured explanation: Relevant previews indicate ${previews || "limited context"}, which forms the basis of this simulated response.`,
    ].join("\n");
};

const generateFollowUps = (retrievedChunks) => {
    const category = retrievedChunks[0]?.category?.toLowerCase() || "the indexed corpus";
    const doc = retrievedChunks[0]?.documentName || "the uploaded documents";

    return [
        `Which additional ${category} signals should be prioritized from ${doc}?`,
        `Can we compare these retrieved segments against another document cluster?`,
        "What confidence threshold should be used for this retrieval path?",
        "Do you want a focused breakdown by segment and similarity score?",
    ].slice(0, 4);
};

const useCognitiveStore = create((set, get) => ({
    // Chat + system
    messages: [],
    systemEvents: [{ id: makeId(), timestamp: Date.now(), type: "system", description: "Cognitive Engine Online" }],
    toast: null,

    // Centralized mock-RAG state
    documents: [],
    chunks: [],
    vectors: {},
    memoryState: { documents: [], chunks: [], vectors: {} },
    semanticMemoryIndexed: false,
    summaryGenerated: false,
    queryVector: null,
    selectedChunks: [],
    selectedChunkIds: [],
    similarityScores: {},

    // Compatibility state used by existing UI
    memoryFiles: [],
    chunkVectors: [],
    vectorResults: [],
    analytics: { trends: [], faults: [] },
    loadingState: DEFAULT_LOADING_STATE,
    systemStatus: DEFAULT_SYSTEM_STATUS,
    chatContext: {
        intent: "IDLE",
        activeDocuments: [],
        retrievedChunks: 0,
    },
    hoveredChunk: null,
    selectedNode: null,
    isFullscreenVector: false,

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

    setHoveredChunk: (chunk) => set({ hoveredChunk: chunk || null }),
    setSelectedNode: (node) => set({ selectedNode: node || null }),
    toggleFullscreenVector: () => set((state) => ({ isFullscreenVector: !state.isFullscreenVector })),

    resetQueryState: () =>
        set({
            queryVector: null,
            selectedChunks: [],
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

    addSystemMessage: ({ summary, uploadBatch }) => {
        const message = {
            id: makeId(),
            sender: "system",
            summary: summary || null,
            uploadBatch: uploadBatch || [],
            text: "Document intelligence summary generated.",
            createdAt: Date.now(),
        };

        set((state) => ({
            messages: [...state.messages, message],
            summaryGenerated: true,
        }));
    },

    processUploadedFiles: (entries = []) => {
        const { addSystemEvent } = get();
        const normalizedDocs = entries.map((entry, index) => normalizeUploadEntry(entry, index));
        const uniqueDocs = [];
        const seenDocIds = new Set();

        normalizedDocs.forEach((doc) => {
            if (seenDocIds.has(doc.id)) return;
            seenDocIds.add(doc.id);
            uniqueDocs.push(doc);
        });

        const { chunks, vectors, vectorResults } = buildMemoryArtifacts(uniqueDocs);
        const memoryUsage = clamp(Math.round(uniqueDocs.length * 8 + chunks.length * 0.4), 0, 100);

        set((state) => ({
            ...state,
            loadingState: { ...state.loadingState, memory: false },
            // Full reset on new upload per requirements
            messages: [],
            queryVector: null,
            selectedChunks: [],
            selectedChunkIds: [],
            similarityScores: {},
            hoveredChunk: null,
            selectedNode: null,
            chatContext: { intent: "IDLE", activeDocuments: [], retrievedChunks: 0 },

            documents: uniqueDocs,
            chunks,
            vectors,
            memoryState: { documents: uniqueDocs, chunks, vectors },
            semanticMemoryIndexed: uniqueDocs.length > 0,
            summaryGenerated: false,

            // Compatibility mirrors
            memoryFiles: uniqueDocs.map((doc) => ({
                id: doc.id,
                name: doc.name,
                size: doc.size,
                sizeBytes: doc.sizeBytes,
                status: "Indexed",
                type: doc.type,
                activity: "active",
                chunks: chunks.filter((c) => c.documentId === doc.id).length,
                pointCount: chunks.filter((c) => c.documentId === doc.id).length,
                color: doc.color,
            })),
            chunkVectors: vectorResults,
            vectorResults,
            systemStatus: {
                ...state.systemStatus,
                connection: "CONNECTED",
                vectorIndex: uniqueDocs.length ? "READY" : "EMPTY",
                embeddingModel: uniqueDocs.length ? "READY" : "IDLE",
                llmStatus: "IDLE",
                activeMemoryCount: uniqueDocs.length,
                totalVectorNodes: chunks.length,
                memoryUsage,
            },
        }));

        if (uniqueDocs.length > 0) {
            const summaryMessage = generateSummaryMessage(uniqueDocs, chunks);
            set((state) => ({
                messages: [summaryMessage],
                summaryGenerated: true,
            }));

            addSystemEvent({
                type: "index",
                description: `Indexed ${uniqueDocs.length} document(s) into semantic memory (${chunks.length} chunks).`,
            });
        }

        get().loadAnalytics();
        return uniqueDocs;
    },

    uploadFile: async (file) => {
        set((state) => ({ loadingState: { ...state.loadingState, memory: true } }));
        try {
            const docs = get().processUploadedFiles([file]);
            return { ok: true, documents: docs };
        } finally {
            set((state) => ({ loadingState: { ...state.loadingState, memory: false } }));
        }
    },

    loadMemoryFiles: async () => {
        const { documents, chunks, vectors } = get();
        set((state) => ({
            memoryFiles: state.memoryFiles,
            chunkVectors: state.vectorResults,
            vectorResults: state.vectorResults,
            memoryState: { documents, chunks, vectors },
            systemStatus: {
                ...state.systemStatus,
                activeMemoryCount: documents.length,
                totalVectorNodes: chunks.length,
                vectorIndex: documents.length ? "READY" : "EMPTY",
            },
        }));
        return get().memoryFiles;
    },

    searchVectors: async (query) => {
        const { chunks, vectors, addSystemEvent } = get();

        set((state) => ({
            loadingState: { ...state.loadingState, vectors: true },
            queryVector: null,
            selectedChunks: [],
            selectedChunkIds: [],
            similarityScores: {},
        }));

        if (!chunks.length) {
            set((state) => ({ loadingState: { ...state.loadingState, vectors: false } }));
            return [];
        }

        try {
            const queryVec = generateQueryVector(query);
            const similarityScores = {};

            const scored = chunks.map((chunk) => {
                const vector = vectors[chunk.id] || { x: 0, y: 0, z: 0 };
                const score = cosineSimilarity(queryVec, vector);
                similarityScores[chunk.id] = score;
                return {
                    ...chunk,
                    score,
                    position: [vector.x, vector.y, vector.z],
                };
            });

            const topCount = clamp(Math.round(chunks.length / 8), 3, 5);
            const ranked = scored
                .sort((a, b) => b.score - a.score)
                .slice(0, Math.min(topCount, scored.length));

            const fallback = scored.slice(0, Math.min(3, scored.length));
            const selected = ranked.length ? ranked : fallback;

            set((state) => ({
                queryVector: [queryVec.x, queryVec.y, queryVec.z],
                selectedChunks: selected,
                selectedChunkIds: selected.map((c) => c.id),
                similarityScores,
                loadingState: { ...state.loadingState, vectors: false },
            }));

            addSystemEvent({ type: "search", description: `Similarity search complete (${selected.length} chunks selected).` });
            return selected;
        } catch (error) {
            const fallback = chunks.slice(0, 3).map((chunk) => {
                const vector = vectors[chunk.id] || { x: 0, y: 0, z: 0 };
                return { ...chunk, score: 0, position: [vector.x, vector.y, vector.z] };
            });

            set((state) => ({
                queryVector: [0, 0, 0],
                selectedChunks: fallback,
                selectedChunkIds: fallback.map((c) => c.id),
                similarityScores: {},
                loadingState: { ...state.loadingState, vectors: false },
            }));

            addSystemEvent({ type: "system", description: `Similarity fallback used: ${error.message}` });
            return fallback;
        }
    },

    sendQuery: async (query) => {
        const { chunks, searchVectors, addSystemEvent } = get();

        if (!chunks.length) {
            get().showToast("Upload and index documents before querying.");
            return { answer: "", chunks: [] };
        }

        const userMessage = { id: makeId(), sender: "user", text: query, createdAt: Date.now() };

        set((state) => ({
            loadingState: { ...state.loadingState, chat: true },
            messages: [...state.messages.map((m) => ({ ...m, followUps: undefined })), userMessage],
            queryVector: null,
            selectedChunks: [],
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
            const retrieved = await searchVectors(query);
            const answerText = generateAnswerText(query, retrieved);
            const followUps = generateFollowUps(retrieved);
            const activeDocuments = [...new Set(retrieved.map((c) => c.documentName))];
            const topCategory = retrieved[0]?.category?.toUpperCase() || "ANALYSIS";

            const aiMessage = {
                id: makeId(),
                sender: "ai",
                text: answerText,
                intent: topCategory,
                sources: activeDocuments,
                followUps,
                createdAt: Date.now(),
            };

            set((state) => ({
                messages: [...state.messages, aiMessage],
                chatContext: {
                    intent: topCategory,
                    activeDocuments,
                    retrievedChunks: retrieved.length,
                },
                loadingState: { ...state.loadingState, chat: false },
                systemStatus: {
                    ...state.systemStatus,
                    connection: "CONNECTED",
                    llmStatus: "READY",
                },
            }));

            addSystemEvent({ type: "search", description: "RAG pipeline response generated." });
            return { answer: answerText, chunks: retrieved };
        } catch (error) {
            const errorMessage = {
                id: makeId(),
                sender: "ai",
                text: `Cognitive failure: ${error.message}`,
                intent: "ERROR",
                sources: [],
                createdAt: Date.now(),
            };

            set((state) => ({
                messages: [...state.messages, errorMessage],
                loadingState: { ...state.loadingState, chat: false },
                systemStatus: {
                    ...state.systemStatus,
                    connection: "ERROR",
                    llmStatus: "ERROR",
                },
            }));

            addSystemEvent({ type: "system", description: `Query failed: ${error.message}` });
            return { answer: errorMessage.text, chunks: [] };
        }
    },

    loadAnalytics: async () => {
        const { memoryFiles } = get();
        set((state) => ({ loadingState: { ...state.loadingState, analytics: true } }));

        try {
            const trends = (memoryFiles.length ? memoryFiles : [{ pointCount: 1 }, { pointCount: 2 }, { pointCount: 3 }])
                .slice(0, 10)
                .map((f, i) => ({
                    time: `${i + 1}`,
                    faultlog: Number(f.pointCount || f.chunks || 1) * 9 + i * 2,
                }));

            const faults = memoryFiles.length
                ? memoryFiles.slice(0, 6).map((f) => ({ name: f.name, count: Math.max(1, Math.round((f.chunks || 1) / 2)) }))
                : [{ name: "No Fault Data", count: 0 }];

            set((state) => ({
                analytics: { trends, faults },
                loadingState: { ...state.loadingState, analytics: false },
            }));
            return { trends, faults };
        } catch (error) {
            set((state) => ({ loadingState: { ...state.loadingState, analytics: false } }));
            throw error;
        }
    },
}));

export default useCognitiveStore;

