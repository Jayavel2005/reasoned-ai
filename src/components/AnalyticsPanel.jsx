import { motion } from "framer-motion";
import { Activity, Cpu, Server, Layers, Zap, TrendingUp, AlertCircle, Database } from "lucide-react";

export default function AnalyticsPanel() {
    const stats = [
        {
            id: 1,
            label: "System Load",
            value: "32%",
            change: "+2.4%",
            icon: Activity,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            id: 2,
            label: "Memory Alloc",
            value: "6.4GB",
            change: "Stable",
            icon: Database,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            id: 3,
            label: "Vector Nodes",
            value: "8,942",
            change: "+124",
            icon: Layers,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
        }
    ];

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 relative">

            {/* Header */}
            <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                <TrendingUp size={14} className="text-ai-accent" />
                Live Analytics
            </h2>

            {/* KPI Cards */}
            <div className="grid gap-3">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-4 rounded-xl border ${stat.border} bg-ai-panel/30 hover:bg-ai-panel-hover transition-all group backdrop-blur-sm relative overflow-hidden`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={14} />
                            </div>
                            <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${stat.bg} ${stat.color} border ${stat.border}`}>
                                {stat.change}
                            </div>
                        </div>
                        <div>
                            <span className="block text-[10px] font-medium text-ai-text-secondary uppercase tracking-wider mb-0.5">{stat.label}</span>
                            <span className="text-xl font-bold text-ai-text-primary custom-font-mono tracking-tight">{stat.value}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Inference Performance Graph Placeholder */}
            <div className="flex-1 min-h-[140px] border border-ai-border/50 rounded-xl bg-ai-panel/10 p-4 relative overflow-hidden backdrop-blur-sm">
                <h3 className="text-[10px] items-center gap-2 flex font-semibold text-ai-text-secondary uppercase tracking-widest mb-4">
                    <Zap size={12} className="text-ai-warning" />
                    Inference Latency
                </h3>

                <div className="flex items-end gap-1 h-[80px] w-full">
                    {[30, 45, 20, 60, 40, 70, 30, 50, 25, 65, 35, 20].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: "10%" }}
                            animate={{ height: `${h}%` }}
                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 2, delay: i * 0.1 }}
                            className="flex-1 bg-ai-warning/20 rounded-t-sm hover:bg-ai-warning/40 transition-colors"
                        />
                    ))}
                </div>
            </div>

            {/* System Events Log */}
            <div className="mt-auto">
                <h3 className="text-[10px] font-semibold text-ai-text-secondary uppercase tracking-widest mb-3 border-t border-ai-border pt-4">System Events</h3>
                <div className="space-y-3 pl-1">
                    {[
                        { msg: "Vector index optimization complete", time: "10:42:15", type: "success" },
                        { msg: "Ingested 'Q3_Report.pdf'", time: "10:38:09", type: "info" },
                        { msg: "Memory pressure stabilized", time: "09:15:22", type: "warning" }
                    ].map((log, i) => (
                        <div key={i} className="flex gap-3 items-start relative pb-3 last:pb-0">
                            {/* Timeline line */}
                            {i !== 2 && <div className="absolute left-[3.5px] top-[14px] bottom-[-6px] w-[1px] bg-ai-border/40" />}

                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${log.type === "success" ? "bg-ai-success" : log.type === "warning" ? "bg-ai-warning" : "bg-ai-accent"
                                }`} />

                            <div className="flex flex-col">
                                <span className="text-[10px] text-ai-text-primary font-medium leading-tight">{log.msg}</span>
                                <span className="text-[9px] text-ai-text-secondary font-mono opacity-60 mt-0.5">{log.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
