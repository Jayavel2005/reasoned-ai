import { useRef } from "react";
import { motion, useDragControls } from "framer-motion";
import { GripHorizontal } from "lucide-react";

export default function ResizeDivider({ onResizeStart, onResizeEnd }) {
    const controls = useDragControls();

    return (
        <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={onResizeStart}
            onDragEnd={onResizeEnd}
            className="w-full h-1.5 bg-ai-border hover:bg-ai-accent/50 active:bg-ai-accent transition-colors cursor-row-resize flex items-center justify-center group z-50 relative"
        >
            <div className="absolute inset-x-0 -top-2 -bottom-2 cursor-row-resize bg-transparent z-50" />
            <div className="w-12 h-1 rounded-full bg-ai-text-secondary/20 group-hover:bg-ai-accent transition-colors flex items-center justify-center">
                <GripHorizontal size={12} className="text-transparent group-hover:text-ai-bg" />
            </div>
        </motion.div>
    );
}
