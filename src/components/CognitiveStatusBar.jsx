import { Layers, Activity, Server, Cpu } from "lucide-react";
import useCognitiveStore from "../store/useCognitiveStore";

export default function CognitiveStatusBar() {
    const { systemStatus } = useCognitiveStore();

    return (
        <div className="h-8 w-full flex-none px-6 py-1 bg-[#13141C]/40 border-b border-white/5 backdrop-blur-md flex items-center justify-between z-30 pointer-events-none sticky top-20">
            {/* Left: Vector Index */}
            <div className="flex items-center gap-6 pointer-events-auto">
                <div className="flex items-center gap-2 group">
                    <Server size={12} className={`${systemStatus.vectorIndex === 'READY' ? 'text-[#00FFA3]' : 'text-[#FFD600] animate-pulse'}`} />
                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-wide group-hover:text-white transition-colors">Vector Index:</span>
                    <span className={`text-[10px] font-bold ${systemStatus.vectorIndex === 'READY' ? 'text-[#00FFA3]' : 'text-[#FFD600]'}`}>{systemStatus.vectorIndex}</span>
                </div>

                {/* Embedding Model */}
                <div className="flex items-center gap-2 group hidden md:flex">
                    <Layers size={12} className={`${systemStatus.embeddingModel === 'READY' ? 'text-[#00F0FF]' : 'text-[#FFD600] animate-spin-slow'}`} />
                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-wide group-hover:text-white transition-colors">Embedding Model:</span>
                    <span className={`text-[10px] font-bold ${systemStatus.embeddingModel === 'READY' ? 'text-[#00F0FF]' : 'text-[#FFD600]'}`}>{systemStatus.embeddingModel}</span>
                </div>

                {/* LLM Status */}
                <div className="flex items-center gap-2 group hidden lg:flex">
                    <Cpu size={12} className={`${systemStatus.llmStatus === 'READY' ? 'text-[#BD00FF]' : 'text-[#FFD600] animate-pulse'}`} />
                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-wide group-hover:text-white transition-colors">LLM Cortex:</span>
                    <span className={`text-[10px] font-bold ${systemStatus.llmStatus === 'READY' ? 'text-[#BD00FF]' : 'text-[#FFD600]'}`}>{systemStatus.llmStatus}</span>
                </div>
            </div>

            {/* Right: Metrics */}
            <div className="flex items-center gap-4 pointer-events-auto">
                <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse shadow-[0_0_5px_#00FFA3]" />
                    <span className="text-[9px] font-mono text-[#94A3B8]">NODES: {systemStatus.totalVectorNodes}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    <Activity size={10} className="text-[#BD00FF]" />
                    <span className="text-[9px] font-mono text-[#94A3B8]">MEM: {systemStatus.memoryUsage}%</span>
                </div>
            </div>
        </div>
    );
}
