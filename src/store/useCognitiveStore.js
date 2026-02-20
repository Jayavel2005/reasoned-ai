import { create } from "zustand";
import {
    uploadFile as uploadFileRequest,
    queryAI,
    getMemory,
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

const getFileName = (item) => item?.name || item?.file_name || item?.filename || "unnamed";

const normalizeMemoryFile = (item) => {
    const name = getFileName(item);
    const sizeInBytes = item?.size_bytes || item?.size || 0;
    const sizeMB = Number(sizeInBytes) / 1024 / 1024;

    return {
        id: item?.id || name,
        name,
        sizeBytes: Number(sizeInBytes) || 0,
        size: `${sizeMB.toFixed(2)}MB`,
        status: item?.status || "Synced",
        type: (item?.type || name.split(".").pop() || "doc").toLowerCase().slice(0, 3),
        activity: item?.activity || "idle",
        preview: item?.preview || "",
        pointCount: Number(item?.point_count || item?.nodes || 1),
        color: item?.color || "#00F0FF",
    };
};

const normalizeMemoryPayload = (response) => {
    const filesRaw = response?.files || response?.data || response?.memory_files || response || [];
    if (Array.isArray(filesRaw)) {
        return filesRaw.map(normalizeMemoryFile);
    }

    if (filesRaw && typeof filesRaw === "object") {
        return Object.entries(filesRaw).map(([name, meta = {}]) =>
            normalizeMemoryFile({
                id: name,
                name,
                status: "Synced",
                point_count: Number(meta?.chunks || 1),
                preview: meta?.time ? `Indexed at ${meta.time}` : "",
                size: 0,
            })
        );
    }

    return [];
};

const normalizeTrendPoint = (point, index) => ({
    time: point?.time || point?.timestamp || point?.label || `${index + 1}`,
    faultlog: Number(point?.value ?? point?.faultlog ?? point?.count ?? 0),
});

const normalizeFaultPoint = (point) => ({
    name: point?.name || point?.label || point?.fault || "Unknown",
    count: Number(point?.count ?? point?.value ?? 0),
});

const toVectorNode = (item, index) => ({
    id: item?.id || item?.node_id || `vec-${index}`,
    label: item?.label || item?.name || item?.source || `Node ${index + 1}`,
    source: item?.source || item?.file || item?.document || "Unknown Source",
    summary: item?.summary || item?.text || item?.content || "No summary available.",
    score: Number(item?.score ?? item?.similarity ?? 0),
    color: item?.color || "#00F0FF",
    position: Array.isArray(item?.position)
        ? item.position
        : [Math.sin(index * 1.7) * 3, ((index % 5) - 2) * 0.7, Math.cos(index * 1.7) * 3],
});

const useCognitiveStore = create((set, get) => ({
    messages: [],
    memoryFiles: [],
    vectorResults: [],
    analytics: {
        trends: [],
        faults: [],
    },
    systemStatus: DEFAULT_SYSTEM_STATUS,
    loadingState: DEFAULT_LOADING_STATE,

    chatContext: {
        intent: "IDLE",
        activeDocuments: [],
        retrievedChunks: 0,
    },
    systemEvents: [{ id: 1, timestamp: Date.now(), type: "system", description: "Cognitive Engine Online" }],
    activeRetrieval: null,
    selectedNode: null,
    isFullscreenVector: false,
    toast: null,

    addSystemEvent: (event) =>
        set((state) => ({
            systemEvents: [{ id: makeId(), timestamp: Date.now(), ...event }, ...state.systemEvents].slice(0, 50),
        })),
    showToast: (message) => {
        set({ toast: message });
        setTimeout(() => {
            if (get().toast === message) {
                set({ toast: null });
            }
        }, 3200);
    },
    clearToast: () => set({ toast: null }),
    setSelectedNode: (node) => set({ selectedNode: node }),
    toggleFullscreenVector: () => set((state) => ({ isFullscreenVector: !state.isFullscreenVector })),
    setRetrievalState: (retrieval) => set({ activeRetrieval: retrieval }),

    uploadFile: async (file) => {
        const { addSystemEvent } = get();
        addSystemEvent({ type: "index", description: `Started indexing node: ${file.name}` });
        set((state) => ({
            loadingState: { ...state.loadingState, memory: true },
            systemStatus: {
                ...state.systemStatus,
                connection: "PROCESSING",
                vectorIndex: "INDEXING",
            },
        }));

        try {
            const response = await uploadFileRequest(file);
            await get().loadMemoryFiles();
            addSystemEvent({ type: "index", description: `Successfully embedded: ${file.name}` });
            set((state) => ({
                systemStatus: {
                    ...state.systemStatus,
                    connection: "CONNECTED",
                    vectorIndex: "READY",
                },
            }));
            return response;
        } catch (error) {
            addSystemEvent({ type: "system", description: `Upload failed: ${error.message}` });
            set((state) => ({
                systemStatus: {
                    ...state.systemStatus,
                    connection: "ERROR",
                    vectorIndex: "ERROR",
                },
            }));
            get().showToast("Connection to cognitive backend lost");
            throw error;
        } finally {
            set((state) => ({
                loadingState: { ...state.loadingState, memory: false },
            }));
        }
    },

    sendQuery: async (query) => {
        const { addSystemEvent } = get();
        const userMessage = { id: makeId(), sender: "user", text: query };

        set((state) => ({
            messages: [...state.messages, userMessage],
            loadingState: { ...state.loadingState, chat: true },
            systemStatus: {
                ...state.systemStatus,
                connection: "PROCESSING",
                llmStatus: "PROCESSING",
            },
        }));
        addSystemEvent({ type: "search", description: `Processing query: ${query}` });

        try {
            const response = await queryAI(query);
            const intent = response?.intent || response?.data?.intent || "ANALYSIS";
            const sources = response?.sources || response?.documents || response?.active_documents || [];
            const normalizedSources = Array.isArray(sources) ? sources.map((src) => String(src)) : [];
            const answer =
                response?.response ||
                response?.answer ||
                response?.message ||
                response?.output ||
                "No response received from backend.";

            const aiMessage = {
                id: makeId(),
                sender: "ai",
                text: String(answer),
                intent: String(intent),
                sources: normalizedSources,
            };

            set((state) => ({
                messages: [...state.messages, aiMessage],
                chatContext: {
                    intent: String(intent).toUpperCase(),
                    activeDocuments: normalizedSources,
                    retrievedChunks: Number(response?.retrieved_chunks || normalizedSources.length || 0),
                },
                systemStatus: {
                    ...state.systemStatus,
                    connection: "CONNECTED",
                    llmStatus: "READY",
                },
            }));
            addSystemEvent({ type: "search", description: "Query completed successfully" });
            return response;
        } catch (error) {
            const aiError = {
                id: makeId(),
                sender: "ai",
                text: `Backend error: ${error.message}`,
                intent: "ERROR",
                sources: [],
            };
            set((state) => ({
                messages: [...state.messages, aiError],
                chatContext: {
                    ...state.chatContext,
                    intent: "ERROR",
                    activeDocuments: [],
                    retrievedChunks: 0,
                },
                systemStatus: {
                    ...state.systemStatus,
                    connection: "ERROR",
                    llmStatus: "ERROR",
                },
            }));
            addSystemEvent({ type: "system", description: `Query failed: ${error.message}` });
            get().showToast("Connection to cognitive backend lost");
            throw error;
        } finally {
            set((state) => ({
                loadingState: { ...state.loadingState, chat: false },
            }));
        }
    },

    loadMemoryFiles: async () => {
        set((state) => ({
            loadingState: { ...state.loadingState, memory: true },
            systemStatus: {
                ...state.systemStatus,
                connection: "PROCESSING",
                vectorIndex: "INDEXING",
            },
        }));

        try {
            const response = await getMemory();
            const files = normalizeMemoryPayload(response);
            const totalNodes = files.reduce((sum, file) => sum + (Number(file.pointCount) || 0), 0);
            const memoryUsage =
                Number(response?.memory_usage) ||
                Number(response?.usage_percent) ||
                Math.min(100, files.length * 5);

            set((state) => ({
                memoryFiles: files,
                vectorResults: files.map((file, index) =>
                    toVectorNode(
                        {
                            id: file.id,
                            label: file.name,
                            source: file.name,
                            summary: file.preview || `${file.name} is indexed and available for retrieval.`,
                            color: file.color,
                        },
                        index
                    )
                ),
                systemStatus: {
                    ...state.systemStatus,
                    connection: "CONNECTED",
                    vectorIndex: "READY",
                    activeMemoryCount: files.length,
                    totalVectorNodes: totalNodes || files.length,
                    memoryUsage: memoryUsage,
                },
            }));
            return files;
        } catch (error) {
            set((state) => ({
                systemStatus: {
                    ...state.systemStatus,
                    connection: "ERROR",
                    vectorIndex: "ERROR",
                },
            }));
            get().showToast("Connection to cognitive backend lost");
            throw error;
        } finally {
            set((state) => ({
                loadingState: { ...state.loadingState, memory: false },
            }));
        }
    },

    searchVectors: async (query) => {
        set((state) => ({
            loadingState: { ...state.loadingState, vectors: true },
            systemStatus: {
                ...state.systemStatus,
                connection: "PROCESSING",
            },
        }));

        try {
            const currentNodes = get().vectorResults;
            const q = String(query || "").toLowerCase();
            const results = currentNodes.filter((node) => {
                const haystack = `${node.label} ${node.source} ${node.summary}`.toLowerCase();
                return haystack.includes(q);
            });
            const selectedResults = results.length > 0 ? results : currentNodes;
            const targetClusterIds = selectedResults.map((result) => result.id);

            set((state) => ({
                vectorResults: selectedResults,
                activeRetrieval: {
                    query,
                    targetClusterIds,
                },
                systemStatus: {
                    ...state.systemStatus,
                    connection: "CONNECTED",
                },
            }));
            return selectedResults;
        } catch (error) {
            set((state) => ({
                systemStatus: {
                    ...state.systemStatus,
                    connection: "ERROR",
                },
            }));
            get().showToast("Connection to cognitive backend lost");
            throw error;
        } finally {
            set((state) => ({
                loadingState: { ...state.loadingState, vectors: false },
            }));
        }
    },

    loadAnalytics: async () => {
        set((state) => ({
            loadingState: { ...state.loadingState, analytics: true },
            systemStatus: {
                ...state.systemStatus,
                connection: "PROCESSING",
            },
        }));

        try {
            const memoryFiles = get().memoryFiles;
            const trends = (memoryFiles.length > 0 ? memoryFiles : Array.from({ length: 6 }, (_, i) => ({ pointCount: i + 1 })))
                .slice(0, 10)
                .map((file, index) =>
                    normalizeTrendPoint(
                        {
                            time: `${index + 1}`,
                            value: Number(file.pointCount || 1) * 10 + index * 3,
                        },
                        index
                    )
                );
            const faults = memoryFiles.slice(0, 6).map((file) =>
                normalizeFaultPoint({
                    name: file.name,
                    count: Math.max(1, Math.round((file.pointCount || 1) / 2)),
                })
            );

            set((state) => ({
                analytics: { trends, faults: faults.length ? faults : [{ name: "No Fault Data", count: 0 }] },
                systemStatus: {
                    ...state.systemStatus,
                    connection: "CONNECTED",
                },
            }));
            return { trends, faults };
        } catch (error) {
            set((state) => ({
                systemStatus: {
                    ...state.systemStatus,
                    connection: "ERROR",
                },
            }));
            get().showToast("Connection to cognitive backend lost");
            throw error;
        } finally {
            set((state) => ({
                loadingState: { ...state.loadingState, analytics: false },
            }));
        }
    },
}));

export default useCognitiveStore;
