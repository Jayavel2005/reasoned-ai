import { useEffect } from "react";
import useLeaksonicStore from "../store/useLeaksonicStore";
import LeakSonicLeftPanel from "./LeakSonicLeftPanel";
import LeakSonicCenterPanel from "./LeakSonicCenterPanel";
import LeakSonicRightPanel from "./LeakSonicRightPanel";

export default function LeakSonicLayout() {
    const { startSimulation, stopSimulation, telemetryCollapsed } = useLeaksonicStore();

    useEffect(() => {
        startSimulation();
        return () => {
            stopSimulation();
        };
    }, [startSimulation, stopSimulation]);

    return (
        <div className="flex flex-1 overflow-hidden p-4 gap-4 min-h-0 w-full h-full absolute top-0 left-0 bg-[#090A0F]">
            <div className="w-[20%] min-w-[260px] max-w-[320px] h-full overflow-hidden glass-panel rounded-2xl p-4 flex flex-col shrink-0">
                <LeakSonicLeftPanel />
            </div>

            <div className="flex-1 w-full h-full overflow-hidden glass-panel rounded-2xl flex flex-col">
                <LeakSonicCenterPanel />
            </div>

            <div className={`shrink-0 h-full overflow-hidden flex flex-col min-h-0 transition-all duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] ${telemetryCollapsed ? 'w-[60px] min-w-[60px]' : 'w-[20%] max-w-[360px] min-w-[260px]'
                }`}>
                <LeakSonicRightPanel />
            </div>
        </div>
    );
}
