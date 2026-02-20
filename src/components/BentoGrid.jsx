import { motion } from "framer-motion";

export default function BentoGrid({ children }) {
    return (
        <div className="grid grid-cols-12 auto-rows-[minmax(140px,auto)] gap-4 p-6 w-full max-w-[1920px] mx-auto">
            {children}
        </div>
    );
}

export function BentoCard({ children, className, title }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`bg-ai-panel border border-ai-border rounded-2xl shadow-lg relative overflow-hidden flex flex-col ${className}`}
        >
            {title && (
                <div className="px-5 py-4 border-b border-ai-border flex justify-between items-center bg-ai-panel/50 backdrop-blur-md z-10">
                    <h2 className="text-sm font-semibold text-ai-text-primary uppercase tracking-wider">
                        {title}
                    </h2>
                    <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-ai-border" />
                        <div className="w-1.5 h-1.5 rounded-full bg-ai-border" />
                    </div>
                </div>
            )}
            <div className="flex-1 min-h-0 relative z-0">{children}</div>
        </motion.div>
    );
}
