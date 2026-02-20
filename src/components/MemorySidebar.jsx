import { useRef, useState, useEffect } from "react";
import { Upload, HardDrive, FileText, CheckCircle, Activity, Loader2 } from "lucide-react";
import useCognitiveStore from "../store/useCognitiveStore";

export default function MemorySidebar() {
    const { systemStatus, memoryFiles, loadingState, uploadFile, loadMemoryFiles } = useCognitiveStore();
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadMemoryFiles().catch(() => {});
    }, [loadMemoryFiles]);

    const handleFiles = async (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;
        const incomingFiles = Array.from(selectedFiles);

        for (const file of incomingFiles) {
            try {
                await uploadFile(file);
            } catch {
                // Store handles status/error state.
            }
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="h-full flex flex-col gap-6 relative overflow-hidden text-white font-sans">
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} />

            <div className="flex-none pb-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] flex items-center gap-3">
                    <HardDrive size={16} className="text-[#00FFA3] animate-pulse" />
                    Ingestion
                </h2>

                <div
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        loadingState.memory
                            ? "text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/20 animate-pulse"
                            : systemStatus.vectorIndex === "ERROR"
                              ? "text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/30"
                              : "text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20"
                    }`}
                >
                    {loadingState.memory ? "INDEXING" : systemStatus.vectorIndex}
                </div>
            </div>

            <div
                className={`flex-none p-6 rounded-2xl border border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center gap-3 relative overflow-hidden backdrop-blur-sm floating ${
                    dragActive
                        ? "bg-[#00F0FF]/20 border-[#00F0FF] shadow-[0_0_30px_rgba(0,240,255,0.3)] scale-105"
                        : "border-white/10 bg-[#13141C]/30 hover:bg-[#13141C]/50 hover:border-[#00F0FF]/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={onDrop}
                onClick={handleClick}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/0 to-[#00F0FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-transform duration-300 shadow-[0_0_15px_rgba(0,240,255,0.1)] ${
                        dragActive ? "bg-[#00F0FF] scale-110" : "bg-[#00F0FF]/10 border-[#00F0FF]/20 group-hover:scale-110"
                    }`}
                >
                    <Upload size={20} className={`${dragActive ? "text-white" : "text-[#00F0FF] group-hover:animate-bounce"}`} />
                </div>
                <div className="text-center z-10 pointer-events-none">
                    <span className="block text-xs font-semibold text-white tracking-wide group-hover:text-[#00F0FF] transition-colors">
                        {dragActive ? "Drop to Ingest" : "Drag Cognitive Files"}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-mono mt-1 group-hover:text-white/70">PDF, CSV, JSON Supported</span>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Active Vectors</span>
                    <span className="text-[10px] text-[#00FFA3] font-mono">{memoryFiles.length} FILES</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {loadingState.memory ? (
                        <div className="text-[10px] text-[#FFD600] font-mono px-2 py-3 flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            INDEXING FILES...
                        </div>
                    ) : null}

                    {memoryFiles.map((file) => (
                        <div
                            key={file.id}
                            className={`group flex items-center gap-3 p-3 rounded-xl bg-[#13141C]/40 border ${
                                file.activity === "active"
                                    ? "border-[#00F0FF]/40 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                                    : file.status === "Indexing"
                                      ? "border-[#FFD600]/30"
                                      : "border-white/5"
                            } hover:border-[#BD00FF]/50 hover:bg-[#13141C]/60 transition-all cursor-pointer backdrop-blur-sm`}
                        >
                            <div
                                className={`p-2 rounded-lg relative ${
                                    file.type === "pdf"
                                        ? "bg-red-500/10 text-red-400"
                                        : file.type === "csv"
                                          ? "bg-[#00FFA3]/10 text-[#00FFA3]"
                                          : "bg-[#00F0FF]/10 text-[#00F0FF]"
                                }`}
                            >
                                <FileText size={14} />
                                {file.activity === "active" ? (
                                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#00F0FF] rounded-full shadow-[0_0_5px_#00F0FF] animate-ping" />
                                ) : null}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-[#E2E8F0] truncate group-hover:text-white transition-colors">{file.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-[#94A3B8]">{file.size}</span>
                                    {file.status === "Indexing" || loadingState.memory ? (
                                        <span className="text-[9px] text-[#FFD600] animate-pulse font-mono">PROCESSING...</span>
                                    ) : null}
                                    {file.activity === "active" ? (
                                        <span className="text-[9px] text-[#00F0FF] font-mono flex items-center gap-1">
                                            <Activity size={8} /> IN USE
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {file.status !== "Indexing" ? (
                                <CheckCircle size={14} className="text-[#00FFA3] drop-shadow-[0_0_5px_currentColor] opacity-50 group-hover:opacity-100 transition-opacity" />
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-none pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#94A3B8] font-mono uppercase">Neural Capacity</span>
                    <span className="text-[10px] text-white font-bold">{systemStatus.memoryUsage}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#13141C] rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-[#00F0FF] via-[#BD00FF] to-[#00FFA3] shadow-[0_0_10px_rgba(0,240,255,0.5)] relative transition-all duration-1000"
                        style={{ width: `${systemStatus.memoryUsage}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </div>
                </div>
                <div className="mt-2 text-center">
                    <span className="text-[9px] text-[#94A3B8]/50 uppercase tracking-[0.2em]">0x8F2A-BLOCK-4</span>
                </div>
            </div>
        </div>
    );
}
