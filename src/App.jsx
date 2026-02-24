import Navbar from "./components/Navbar";
import ConnectionStatusToast from "./components/ConnectionStatusToast";
import MemorySidebar from "./components/MemorySidebar";
import ChatPanel from "./components/ChatPanel";
import RightAnalyticsDashboard from "./components/RightAnalyticsDashboard";
import useCognitiveStore from "./store/useCognitiveStore";
import { useEffect } from "react";

function ToastBanner() {
    const { toast } = useCognitiveStore();
    if (!toast) return null;

    return (
        <div className="fixed top-16 right-4 z-[120]">
            <div className="glass-panel px-4 py-2 rounded-lg border border-[#FF4D6D]/30 text-[12px] font-medium text-[#FFD5DD] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                {toast}
            </div>
        </div>
    );
}

function ErrorBanner() {
    const { error } = useCognitiveStore();
    if (!error) return null;

    return (
        <div style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 120, background: "rgba(192,82,74,0.12)",
            border: "1px solid rgba(192,82,74,0.3)", borderRadius: 8,
            padding: "6px 16px",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            color: "rgba(192,82,74,0.9)", letterSpacing: "0.04em",
            pointerEvents: "none",
        }}>
            API Error: {error}
        </div>
    );
}

export default function App() {
    const { loadMemoryFiles, loadVectors, loadAnalytics } = useCognitiveStore();

    useEffect(() => {
        loadMemoryFiles();
        loadVectors();
        loadAnalytics();
    }, [loadMemoryFiles, loadVectors, loadAnalytics]);

    return (
        <div className="h-screen flex flex-col w-full bg-[#090A0F] text-white font-sans antialiased selection:bg-[#BD00FF] selection:text-white overflow-hidden">
            <Navbar />

            <div className="flex flex-1 overflow-hidden p-4 gap-4 min-h-0">
                <div className="w-[20%] h-full overflow-hidden glass-panel rounded-2xl p-4">
                    <MemorySidebar />
                </div>

                <div className="w-[45%] h-full overflow-hidden glass-panel rounded-2xl">
                    <ChatPanel />
                </div>

                <div className="w-[35%] h-full overflow-hidden flex flex-col min-h-0">
                    <RightAnalyticsDashboard />
                </div>
            </div>

            <ToastBanner />
            <ErrorBanner />
            <ConnectionStatusToast />
        </div>
    );
}
