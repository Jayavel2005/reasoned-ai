import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function MessageBubble({ message }) {
    const isUser = message.sender === "user";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`flex w-full mb-3 ${isUser ? "justify-end" : "justify-start"}`}
        >
            <div className={`flex max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start gap-3`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? "bg-ai-accent text-white" : "bg-ai-panel border border-ai-border text-ai-text-secondary"
                    }`}>
                    {isUser ? <UserIcon /> : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
                        ? "bg-ai-accent/10 border border-ai-accent/20 text-ai-text-primary rounded-tr-none backdrop-blur-sm"
                        : "bg-ai-panel border border-ai-border text-ai-text-secondary rounded-tl-none backdrop-blur-sm"
                    }`}>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
            </div>
        </motion.div>
    );
}

function UserIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    )
}

const initialMessages = [
    { id: 1, sender: "ai", text: "ReasonedAI Controller initializing...\nCognitive vectors loaded. Ready for queries." },
];

export default function ChatWorkspace() {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), sender: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        setTimeout(() => {
            const aiMsg = {
                id: Date.now() + 1,
                sender: "ai",
                text: "Correlation located in vector space [Quadrant 4]. \nReferencing 'Financial_Report_2025.xlsx' (Confidence: 94%).\n\nProjection suggests 15% optimization is possible.",
            };
            setMessages((prev) => [...prev, aiMsg]);
            scrollToBottom();
        }, 1200);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-full flex flex-col bg-ai-bg relative overflow-hidden backdrop-blur-sm">
            {/* Header - Minimal */}
            <div className="flex-none h-12 border-b border-ai-border px-6 flex items-center justify-between bg-ai-panel/20 z-10 backdrop-blur-md">
                <h2 className="text-xs font-semibold text-ai-text-secondary uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={14} className="text-ai-accent" />
                    Reasoning Engine
                </h2>
                <div className="flex items-center gap-2 bg-ai-bg/60 px-2 py-0.5 rounded border border-ai-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-ai-success animate-pulse" />
                    <span className="text-[9px] text-ai-text-secondary font-mono">LIVE</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar scroll-smooth space-y-4">
                <AnimatePresence initial={false} mode="popLayout">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-none p-4 px-6 border-t border-ai-border bg-ai-panel/10 backdrop-blur-md">
                <div className="relative flex items-center gap-3 bg-ai-panel/60 border border-ai-border/80 rounded-xl px-4 py-3 shadow-md focus-within:border-ai-accent focus-within:ring-1 focus-within:ring-ai-accent/30 transition-all hover:bg-ai-panel/80">
                    <Sparkles size={16} className="text-ai-text-secondary group-focus-within:text-ai-accent" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Input cognitive reasoning parameters..."
                        className="flex-1 bg-transparent border-none text-ai-text-primary placeholder-ai-text-secondary/50 focus:ring-0 text-sm h-6 outline-none"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-1.5 bg-ai-accent/10 hover:bg-ai-accent text-ai-accent hover:text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
