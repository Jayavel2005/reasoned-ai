import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import VectorPanel from "./VectorPanel";
import ChatPanel from "./ChatPanel";

export default function CenterWorkspace() {
    const [splitRatio, setSplitRatio] = useState(0.6); // Default 60% top / 40% bottom
    const containerRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [focusMode, setFocusMode] = useState("default"); // 'default', 'vector', 'chat'

    // Ref to track split for smoother dragging
    const splitRef = useRef(splitRatio);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";

        const startY = e.clientY;
        const startSplit = splitRef.current;

        const handleMouseMove = (moveEvent) => {
            if (!containerRef.current) return;
            const containerHeight = containerRef.current.offsetHeight;
            const delta = moveEvent.clientY - startY;
            const newRatio = Math.max(0.2, Math.min(0.8, startSplit + (delta / containerHeight)));

            setSplitRatio(newRatio);
            splitRef.current = newRatio;
            setFocusMode("default");
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = "default";
            document.body.style.userSelect = "auto";
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const toggleVectorFocus = () => {
        if (focusMode === "vector") {
            setSplitRatio(0.6);
            setFocusMode("default");
            splitRef.current = 0.6;
        } else {
            setSplitRatio(0.9);
            setFocusMode("vector");
            splitRef.current = 0.9;
        }
    };

    const toggleChatFocus = () => {
        if (focusMode === "chat") {
            setSplitRatio(0.6);
            setFocusMode("default");
            splitRef.current = 0.6;
        } else {
            setSplitRatio(0.2); // Give chat 80%
            setFocusMode("chat");
            splitRef.current = 0.2;
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full relative overflow-hidden bg-ai-bg/40">

            {/* Top Panel: Vector Space */}
            <motion.div
                className="relative w-full overflow-hidden"
                initial={false}
                animate={{ height: `${splitRatio * 100}%` }}
                transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
            >
                <VectorPanel
                    onFocusToggle={toggleVectorFocus}
                    isFocused={focusMode === "vector"}
                />
            </motion.div>

            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                className="w-full h-1.5 flex-none bg-ai-border hover:bg-ai-accent/50 cursor-row-resize z-50 transition-colors flex items-center justify-center group relative shadow-md"
            >
                {/* Invisible larger hit area for easier grabbing */}
                <div className="absolute inset-x-0 -top-2 -bottom-2 cursor-row-resize bg-transparent z-50" />
                <div className="w-16 h-1 rounded-full bg-ai-text-secondary/20 group-hover:bg-ai-text-secondary transition-colors" />
            </div>

            {/* Bottom Panel: Chat Workspace */}
            <div className="flex-1 w-full relative min-h-0 overflow-hidden">
                <ChatPanel
                    onFocusToggle={toggleChatFocus}
                    isFocused={focusMode === "chat"}
                />
            </div>

        </div>
    );
}
