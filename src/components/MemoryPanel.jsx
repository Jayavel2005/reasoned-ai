import { Database } from "lucide-react";
import FileIngestion from "./FileIngestion";
import Vector3DView from "./Vector3DView";

export default function MemoryPanel() {
    return (
        <div className="h-full flex flex-col gap-6 relative overflow-hidden">

            {/* SECTION 1: File Ingestion Module */}
            <div className="flex-shrink-0">
                <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#4A9BB5", display: "inline-block" }} />
                    Knowledge Ingestion
                </h2>
                <FileIngestion />
            </div>

            {/* SECTION 2: 3D Vector Visualization */}
            <div className="flex-1 min-h-0 flex flex-col">
                <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2 flex-shrink-0">
                    <Database size={14} className="text-ai-accent" />
                    Vector Space
                </h2>
                <div className="flex-1 min-h-0 relative">
                    <Vector3DView />
                </div>
            </div>

        </div>
    );
}
