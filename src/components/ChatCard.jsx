import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Paperclip } from "lucide-react";
import { BentoCard } from "./BentoGrid";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatCard({ className }) {
    const [messages, setMessages] = useState([
        { id: 1, sender: "ai", text: "ReasonedAI initializing...\nConnected to Memory Node 0x8F2A.\nAwaiting input." }
    ]);
    const [input, setInput] = useState("");
    const endRef = useRef(null);

    const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => scrollToBottom(), [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages(p => [...p, { id: Date.now(), sender: "user", text: input }]);
        setInput("");
        setTimeout(() => {
            setMessages(p => [...p, { id: Date.now() + 1, sender: "ai", text: "Analyzing trends across Q3 Financials... \n\nFound 3 correlating vectors in 'report_2025.xlsx'. Suggest reviewing line 42 for variance." }]);
        }, 1200);
    };

    return (
        <BentoCard className={`${className} flex flex-col`} title="Reasoning Engine">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map(m => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex w-full ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.sender === "user" ? "bg-ai-accent text-white rounded-tr-none" : "bg-ai-panel border border-ai-border text-ai-text-secondary rounded-tl-none border-t-0"}`}>
                                {m.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={endRef} />
            </div>

            <div className="p-4 border-t border-ai-border bg-ai-panel/50">
                <div className="flex items-center gap-2 bg-ai-bg border border-ai-border p-2 rounded-xl focus-within:ring-1 focus-within:ring-ai-accent/50 transition-all">
                    <Paperclip size={18} className="text-ai-text-secondary w-8 cursor-pointer hover:text-ai-accent" />
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-sm text-ai-text-primary placeholder-ai-text-secondary/50"
                        placeholder="Input cognitive parameters..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                    />
                    <button onClick={handleSend} className="p-2 bg-ai-accent hover:bg-ai-accent/80 text-white rounded-lg transition-colors">
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </BentoCard>
    );
}
