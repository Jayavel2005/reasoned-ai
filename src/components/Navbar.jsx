import { Layers } from "lucide-react";

export default function Navbar({ className = "h-14 shrink-0" }) {
    return (
        <div className={`${className} w-full flex items-center justify-between px-6 relative z-50`}>
            {/* Logo Section */}
            <div className="flex items-center gap-4 cursor-pointer group">
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#00F0FF] opacity-10 blur-xl rounded-full group-hover:opacity-30 transition-opacity duration-500" />
                    <div className="relative w-full h-full bg-[#13141C]/80 border border-[#00F0FF]/30 rounded-xl backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.1)] group-hover:border-[#00F0FF] transition-all">
                        <Layers className="text-[#00F0FF] group-hover:scale-110 transition-transform duration-300" size={24} />
                    </div>
                </div>

                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-white tracking-widest leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        ANTIGRAVITY
                    </h1>
                    <div className="flex items-center gap-2 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_5px_#00F0FF]" />
                        <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-[0.3em]">
                            Reasoning Engine v4.0
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#13141C]/30 border border-white/5 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-[#00FFA3] shadow-[0_0_8px_#00FFA3]" />
                    <span className="text-xs font-mono text-white/50 uppercase tracking-wider">System Optimal</span>
                </div>
            </div>
        </div>
    )
}
