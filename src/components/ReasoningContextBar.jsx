import { Layers, Activity, Server, Cpu } from "lucide-react";
import useCognitiveStore from "../store/useCognitiveStore";
import { motion, AnimatePresence } from "framer-motion";

export default function ReasoningContextBar() {
    const { chatContext } = useCognitiveStore();

    if (!chatContext) return null;

    return (
        <div className="flex-none h-8 px-6 mb-2 flex items-center gap-4 z-10 w-full overflow-hidden">

            {/* Intent Badge */}
            <div className="flex items-center gap-2 bg-[#BD00FF]/10 border border-[#BD00FF]/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#BD00FF] animate-pulse shadow-[0_0_5px_#BD00FF]" />
                <span className="text-[9px] font-mono text-[#BD00FF] uppercase tracking-wider">{chatContext.intent}</span>
            </div>

            {/* Context Stats */}
            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center gap-2 text-[9px] font-mono text-[#94A3B8]">
                <Layers size={10} className="text-[#00F0FF]" />
                <span>SOURCES: {chatContext.activeDocuments.length}</span>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-[#94A3B8]">
                <Activity size={10} className="text-[#00FFA3]" />
                <span>CHUNKS: {chatContext.retrievedChunks}</span>
            </div>

            {/* Dynamic Source Ticker */}
            <div className="flex-1 min-w-0 flex justify-end gap-2 overflow-hidden">
                <AnimatePresence>
                    {chatContext.activeDocuments.map((doc, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[120px]"
                        >
                            {doc}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
