import { useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BentoCard } from "./BentoGrid";

const data = [
    { name: '10:00', uv: 4000, pv: 2400, amt: 2400 },
    { name: '10:05', uv: 3000, pv: 1398, amt: 2210 },
    { name: '10:10', uv: 2000, pv: 9800, amt: 2290 },
    { name: '10:15', uv: 2780, pv: 3908, amt: 2000 },
    { name: '10:20', uv: 1890, pv: 4800, amt: 2181 },
    { name: '10:25', uv: 2390, pv: 3800, amt: 2500 },
    { name: '10:30', uv: 3490, pv: 4300, amt: 2100 },
];

export default function TrendsCard({ className }) {
    return (
        <BentoCard className={className} title="Log Parameter Trends">
            <div className="w-full h-full p-4 flex flex-col">
                <div className="flex justify-between mb-4 text-xs font-mono text-ai-text-secondary">
                    <span>SOURCE: SYSTEM_LOGS_Q3</span>
                    <span className="text-ai-success">LIVE INJEST</span>
                </div>
                <div className="flex-1 min-h-[150px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} vertical={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                                itemStyle={{ color: '#E5E7EB' }}
                            />
                            <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" strokeWidth={2} />
                            <Area type="monotone" dataKey="pv" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPv)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </BentoCard>
    );
}
