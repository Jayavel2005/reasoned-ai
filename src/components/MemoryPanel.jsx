import { useRef } from "react";
import { Upload, FileText, CheckCircle, Clock, Trash2, Database } from "lucide-react";
import { motion } from "framer-motion";
import Vector3DView from "./Vector3DView";

const mockFiles = [
    { id: 1, name: "Project_Specs.pdf", status: "indexed", size: "2.4MB" },
    { id: 2, name: "Meeting_Notes_Q3.docx", status: "processing", size: "1.1MB" },
    { id: 3, name: "Financial_Report_2025.xlsx", status: "indexed", size: "4.8MB" },
    { id: 4, name: "System_Architecture.md", status: "queued", size: "15KB" },
    { id: 5, name: "User_Research_Data.csv", status: "indexed", size: "12MB" },
];

export default function MemoryPanel() {
    return (
        <div className="h-full flex flex-col gap-6 relative overflow-hidden">

            {/* SECTION 1: Upload Area */}
            <div className="flex-shrink-0">
                <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Upload size={14} className="text-ai-accent" />
                    Ingest Data
                </h2>
                <div className="border border-dashed border-ai-border rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-ai-accent hover:bg-ai-accent/5 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-ai-panel border border-ai-border flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                        <Upload size={18} className="text-ai-text-secondary group-hover:text-ai-accent" />
                    </div>
                    <p className="text-sm font-medium text-ai-text-primary">Click to upload</p>
                    <p className="text-xs text-ai-text-secondary mt-1">or drag and drop</p>
                </div>
            </div>

            {/* SECTION 2: Active Documents List */}
            <div className="flex-1 min-h-0 flex flex-col">
                <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2 flex-shrink-0">
                    <FileText size={14} className="text-ai-accent" />
                    Active Memory
                </h2>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {mockFiles.map((file, i) => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-3 rounded-lg border border-ai-border bg-ai-panel/50 hover:bg-ai-panel-hover hover:border-ai-accent/30 transition-all group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-1.5 rounded bg-ai-bg/50 border border-ai-border/50 text-ai-text-secondary">
                                    <FileText size={14} />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-medium text-ai-text-primary truncate">{file.name}</span>
                                    <span className="text-[10px] text-ai-text-secondary font-mono">{file.size}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {file.status === "indexed" ? (
                                    <div className="flex items-center gap-1 text-[10px] text-ai-success bg-ai-success/10 px-1.5 py-0.5 rounded border border-ai-success/20">
                                        <CheckCircle size={10} />
                                        <span>RDY</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-[10px] text-ai-warning bg-ai-warning/10 px-1.5 py-0.5 rounded border border-ai-warning/20">
                                        <Clock size={10} className="animate-spin" />
                                        <span>PROC</span>
                                    </div>
                                )}
                                <button className="text-ai-text-secondary hover:text-ai-warning opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* SECTION 3: 3D Vector Visualization */}
            <div className="flex-shrink-0 h-[280px] flex flex-col">
                <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Database size={14} className="text-ai-accent" />
                    Vector Space
                </h2>

                {/* The 3D View Container */}
                <div className="flex-1 min-h-0 relative">
                    <Vector3DView />
                </div>
            </div>
        </div>
    );
}
