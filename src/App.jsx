import Navbar from "./components/Navbar";
import MemorySidebar from "./components/MemorySidebar";
import ChatPanel from "./components/ChatPanel";
import RightAnalyticsDashboard from "./components/RightAnalyticsDashboard";
import useCognitiveStore from "./store/useCognitiveStore";

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

export default function App() {
    return (
        <div className="h-screen flex flex-col w-full bg-[#090A0F] text-white font-sans antialiased selection:bg-[#BD00FF] selection:text-white overflow-hidden">
            <Navbar className="h-14 shrink-0" />

            <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-4 min-h-0">
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
        </div>
    );
}
