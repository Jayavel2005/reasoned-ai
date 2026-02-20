import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function ReportControls() {

  const [audit, setAudit] = useState("");
  const [blueprint, setBlueprint] = useState("");
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingBlueprint, setLoadingBlueprint] = useState(false);

  const generateAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`${API_BASE}/reports/audit`, {
        method: "POST"
      });
      const data = await res.json();
      setAudit(data.report);
    } catch (err) {
      setAudit("Failed to generate audit report.");
    }
    setLoadingAudit(false);
  };

  const generateBlueprint = async () => {
    setLoadingBlueprint(true);
    try {
      const res = await fetch(`${API_BASE}/reports/blueprint`, {
        method: "POST"
      });
      const data = await res.json();
      setBlueprint(data.blueprint);
    } catch (err) {
      setBlueprint("Failed to generate blueprint.");
    }
    setLoadingBlueprint(false);
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 h-full">

      <h2 className="text-sm text-purple-300 font-semibold">
        Cognitive Reports
      </h2>

      <button
        onClick={generateAudit}
        disabled={loadingAudit}
        className="bg-purple-600 hover:bg-purple-500 transition p-2 rounded text-white text-sm"
      >
        {loadingAudit ? "Generating Audit..." : "Generate Audit Report"}
      </button>

      <button
        onClick={generateBlueprint}
        disabled={loadingBlueprint}
        className="bg-cyan-600 hover:bg-cyan-500 transition p-2 rounded text-white text-sm"
      >
        {loadingBlueprint ? "Generating Blueprint..." : "Generate Agentic Blueprint"}
      </button>

      {audit && (
        <div className="glass-panel p-3 overflow-y-auto max-h-60 text-xs text-gray-300 whitespace-pre-wrap">
          {audit}
        </div>
      )}

      {blueprint && (
        <div className="glass-panel p-3 overflow-y-auto max-h-60 text-xs text-gray-300 whitespace-pre-wrap">
          {blueprint}
        </div>
      )}

    </div>
  );
}
