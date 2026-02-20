import { motion } from "framer-motion";
import MemoryPanel from "../components/MemoryPanel";
import ChatPanel from "../components/ChatPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";

export default function Dashboard() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-ai-bg text-ai-text-primary font-sans antialiased selection:bg-ai-accent selection:text-white">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ai-accent/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
            </div>

            {/* Main Content Grid */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex w-full h-full relative z-10"
            >

                {/* Left Panel: System Memory */}
                <div className="w-[20%] min-w-[280px] h-full border-r border-ai-border/40 backdrop-blur-sm bg-gradient-to-b from-ai-panel/80 to-ai-bg/90">
                    <MemoryPanel />
                </div>

                {/* Center Panel: Reasoning Engine */}
                <div className="w-[60%] flex-1 h-full shadow-2xl z-20 bg-ai-bg/50 backdrop-blur-sm relative">
                    <ChatPanel />
                </div>

                {/* Right Panel: Global Analytics */}
                <div className="w-[20%] min-w-[280px] h-full border-l border-ai-border/40 backdrop-blur-sm bg-gradient-to-b from-ai-panel/80 to-ai-bg/90">
                    <AnalyticsPanel />
                </div>

            </motion.div>
        </div>
    );
}
