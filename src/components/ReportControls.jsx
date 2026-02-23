import { FileText, GitBranch } from "lucide-react";

/* Pure UI panel — no API calls. Buttons trigger local toast only. */
export default function ReportControls() {
  return (
    <div
      className="glass-panel rounded-2xl flex flex-col overflow-hidden"
      style={{ height: "100%" }}
    >
      {/* Header */}
      <div className="flex-none px-3 py-2 border-b border-white/5 bg-[#13141C]/40 flex items-center gap-2">
        <FileText size={10} className="text-purple-400" />
        <h3 className="text-[9px] font-bold text-white uppercase tracking-widest">
          Reports
        </h3>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-3 p-4 min-h-0">
        <p className="text-[10px] text-white/40 font-mono leading-relaxed">
          Cognitive report generation requires an active backend connection.
        </p>

        {/* Audit */}
        <button
          disabled
          className="w-full flex items-center gap-2 justify-center py-2 px-3 rounded-lg border border-purple-500/20 bg-purple-500/8 text-purple-300 text-[10px] font-semibold uppercase tracking-widest opacity-50 cursor-not-allowed"
        >
          <FileText size={10} />
          Audit Report
        </button>

        {/* Blueprint */}
        <button
          disabled
          className="w-full flex items-center gap-2 justify-center py-2 px-3 rounded-lg border border-cyan-500/20 bg-cyan-500/8 text-cyan-300 text-[10px] font-semibold uppercase tracking-widest opacity-50 cursor-not-allowed"
        >
          <GitBranch size={10} />
          Agentic Blueprint
        </button>

        {/* Status indicator */}
        <div className="mt-auto flex items-center gap-2 pt-3 border-t border-white/5">
          <span
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#C0524A",
              flexShrink: 0,
            }}
          />
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
            Backend Offline
          </span>
        </div>
      </div>
    </div>
  );
}
