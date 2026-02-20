import { Activity, Clock, Database } from "lucide-react";
import { BentoCard } from "./BentoGrid";

export default function MemoryStatsCard({ className }) {
    return (
        <BentoCard className={`${className} p-4 flex flex-col justify-between`} title="Memory & Vector Stats">
            <div className="grid grid-cols-2 gap-4 h-full">
                <div className="bg-ai-bg/50 p-3 rounded-xl border border-ai-border/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <Activity size={16} className="text-ai-accent" />
                        <span className="text-[10px] text-ai-success">+2.4%</span>
                    </div>
                    <span className="text-2xl font-bold font-mono">32%</span>
                    <span className="text-xs text-ai-text-secondary">System Load</span>
                </div>

                <div className="bg-ai-bg/50 p-3 rounded-xl border border-ai-border/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <Database size={16} className="text-purple-400" />
                        <span className="text-[10px] text-ai-text-secondary">INDEXED</span>
                    </div>
                    <span className="text-2xl font-bold font-mono">8,942</span>
                    <span className="text-xs text-ai-text-secondary">Vector Count</span>
                </div>

                <div className="bg-ai-bg/50 p-3 rounded-xl border border-ai-border/50 col-span-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock size={16} className="text-ai-warning" />
                        <div>
                            <span className="block text-xl font-bold font-mono leading-none">42ms</span>
                            <span className="text-[10px] text-ai-text-secondary uppercase">Avg Latency</span>
                        </div>
                    </div>
                    <div className="flex gap-1 h-8 items-end w-24">
                        {[20, 50, 30, 80, 40, 60, 30, 70].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="w-2 bg-ai-warning/20 rounded-t-sm" />
                        ))}
                    </div>
                </div>
            </div>
        </BentoCard>
    );
}

export function SystemEventsCard({ className }) {
    return (
        <BentoCard className={`${className}`} title="System Events">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {[
                    { time: "10:42", msg: "Vector optimization complete", type: "success" },
                    { time: "10:38", msg: "User uploaded 'Q3Report.pdf'", type: "info" },
                    { time: "09:15", msg: "Memory pressure stabilized", type: "warning" },
                    { time: "08:59", msg: "System boot sequence initialized", type: "info" }
                ].map((e, i) => (
                    <div key={i} className="flex gap-3 text-xs border-b border-ai-border/30 pb-2 last:border-0">
                        <span className="text-ai-text-secondary font-mono w-10 shrink-0">{e.time}</span>
                        <span className={e.type === "success" ? "text-ai-success" : e.type === "warning" ? "text-ai-warning" : "text-ai-text-primary"}>
                            {e.msg}
                        </span>
                    </div>
                ))}
            </div>
        </BentoCard>
    )
}

export function DocumentMemoryCard({ className }) {
    return (
        <BentoCard className={className} title="Document Memory">
            <div className="flex-1 p-4 flex flex-col">
                <button className="w-full py-2 mb-3 bg-ai-accent/10 border border-ai-accent/20 text-ai-accent rounded-lg text-xs font-medium hover:bg-ai-accent hover:text-white transition-colors">
                    + UPLOAD NEW
                </button>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {["Project_Specs.pdf", "Financial_2025.xlsx", "Meeting_Notes.docx"].map((f, i) => (
                        <div key={i} className="p-2 border border-ai-border rounded bg-ai-bg/30 text-xs flex justify-between items-center group hover:border-ai-accent/30 transition-colors">
                            <span className="truncate max-w-[120px] text-ai-text-primary">{f}</span>
                            <span className="text-[10px] text-ai-success px-1.5 py-0.5 bg-ai-success/10 rounded">RDY</span>
                        </div>
                    ))}
                </div>
            </div>
        </BentoCard>
    )
}
