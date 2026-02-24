import { useRef, useEffect } from "react";
import useCognitiveStore from "../store/useCognitiveStore";
import { List, CheckCircle, Database, Search } from "lucide-react";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SystemEventsPanel() {
    const { systemEvents } = useCognitiveStore();
    // Using direct selector pattern if preferred, or the hook as is
    // const systemEvents = useCognitiveStore((state) => state.systemEvents); 

    const scrollRef = useRef(null);

    // Auto-Scroll to Top on New Event
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [systemEvents]);


    const getEventIcon = (type) => {
        switch (type) {
            case 'index': return <Database size={10} className="text-[#00FFA3]" />;
            case 'search': return <Search size={10} className="text-[#00F0FF]" />;
            case 'system': return <List size={10} className="text-[#BD00FF]" />;
            default: return <Activity size={10} className="text-white" />;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#13141C]/30 backdrop-blur-md border border-white/5 rounded-2xl relative overflow-hidden group hover:border-[#00F0FF]/30 transition-colors shadow-lg">

            {/* Header - Fixed */}
            <div className="flex-none h-8 px-3 flex items-center justify-between border-b border-white/5 bg-[#13141C]/60 backdrop-blur-xl z-20">
                <div className="flex items-center gap-2">
                    <Activity size={10} className="text-[#00F0FF]" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-sm">System Stream</span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse shadow-[0_0_5px_#00FFA3]" />
                    <span className="text-[9px] font-mono text-[#00FFA3] uppercase tracking-wide">LIVE</span>
                </div>
            </div>

            {/* List - Scrollable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative z-10 scroll-smooth">

                <AnimatePresence initial={false} mode="popLayout">
                    {systemEvents.map((event) => (
                        <motion.div
                            key={`event-${event.id}`}
                            layout
                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-start gap-3 p-2 rounded-lg bg-[#13141C]/60 border border-white/5 hover:border-[#00F0FF]/30 hover:bg-[#13141C]/80 transition-all group/item shrink-0 relative overflow-hidden"
                        >
                            {/* Status Line Indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${event.type === 'index' ? 'bg-[#00FFA3]' :
                                event.type === 'search' ? 'bg-[#00F0FF]' :
                                    'bg-[#BD00FF]'
                                }`} />

                            <div className="mt-0.5 opacity-70 group-hover/item:opacity-100 transition-opacity">
                                {getEventIcon(event.type)}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <div className="text-[10px] text-white/90 leading-tight break-words font-medium">{event.description}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[9px] text-[#94A3B8] font-mono flex items-center gap-1 opacity-70">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/5 ${event.type === 'index' ? 'text-[#00FFA3]' :
                                        event.type === 'search' ? 'text-[#00F0FF]' :
                                            'text-[#BD00FF]'
                                        }`}>{event.type}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
