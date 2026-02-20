import VectorPanel from "./VectorPanel";
import RecurringFaultsChart from "./charts/RecurringFaultsChart";
import ParameterTrendsChart from "./charts/ParameterTrendsChart";
import ReportControls from "./ReportControls";
import useCognitiveStore from "../store/useCognitiveStore";

export default function RightAnalyticsDashboard() {
    const { isFullscreenVector } = useCognitiveStore();

    if (isFullscreenVector) {
        return (
            <div className="w-full h-full min-h-[400px]">
                <VectorPanel className="w-full h-full" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 gap-4 overflow-hidden">
            <div className="w-full h-[56%] min-h-[400px]">
                <VectorPanel className="w-full h-full" />
            </div>

            <div className="w-full h-[44%] min-h-[300px] grid grid-cols-3 gap-4">
                <div className="w-full h-full min-h-[300px]">
                    <RecurringFaultsChart />
                </div>
                <div className="w-full h-full min-h-[300px]">
                    <ParameterTrendsChart />
                </div>
                <div className="w-full h-full min-h-[300px]">
                    <ReportControls />
                </div>
            </div>
        </div>
    );
}
