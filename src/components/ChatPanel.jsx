import { useState, useRef, useEffect } from "react";
import { Send, Bot, Paperclip, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import useCognitiveStore from "../store/useCognitiveStore";
import ReasoningContextBar from "./ReasoningContextBar";

function UserIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[#BD00FF] drop-shadow-[0_0_5px_currentColor]"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    );
}

function MessageBubble({ message }) {
    const isUser = message.sender === "user";
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`flex w-full mb-6 ${isUser ? "justify-end" : "justify-start"} group perspective-1000`}
        >
            <div className={`flex max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start gap-4`}>
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md relative overflow-hidden ${
                        isUser ? "bg-gradient-to-br from-[#BD00FF]/20 to-[#BD00FF]/5" : "bg-gradient-to-br from-[#00F0FF]/20 to-[#00F0FF]/5"
                    }`}
                >
                    <div className={`absolute inset-0 opacity-50 blur-lg ${isUser ? "bg-[#BD00FF]" : "bg-[#00F0FF]"}`} />
                    <div className="relative z-10">
                        {isUser ? <UserIcon /> : <Bot size={18} className="text-[#00F0FF] drop-shadow-[0_0_5px_currentColor]" />}
                    </div>
                </div>

                <div
                    className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed backdrop-blur-xl border border-white/10 shadow-lg relative ${
                        isUser
                            ? "bg-[#BD00FF]/10 text-white rounded-tr-none border-[#BD00FF]/30 shadow-[0_4px_20px_-5px_rgba(189,0,255,0.3)]"
                            : "bg-[#13141C]/60 text-[#E2E8F0] rounded-tl-none border-[#00F0FF]/20 shadow-[0_4px_20px_-5px_rgba(0,240,255,0.15)]"
                    }`}
                >
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                    <p className="whitespace-pre-wrap font-sans tracking-wide drop-shadow-sm">{message.text}</p>

                    {!isUser && (
                        <div className="mt-3 space-y-1">
                            {message.intent ? (
                                <div className="text-[10px] text-[#BD00FF] font-mono uppercase tracking-wider">Intent: {message.intent}</div>
                            ) : null}
                            {Array.isArray(message.sources) && message.sources.length > 0 ? (
                                <div className="text-[10px] text-[#00F0FF] font-mono">
                                    Sources: {message.sources.join(", ")}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[10px] text-[#00F0FF] font-mono ml-12 mb-4"
        >
            <span className="relative inline-flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-70 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00F0FF]" />
            </span>
            <span>AI typing...</span>
        </motion.div>
    );
}

export default function ChatPanel() {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);
    const { messages, sendQuery, loadingState, systemStatus } = useCognitiveStore();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loadingState.chat]);

    const handleSend = async () => {
        const query = input.trim();
        if (!query || loadingState.chat) return;
        setInput("");
        try {
            await sendQuery(query);
        } catch {
            // Error message is appended by store action.
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const statusColor =
        systemStatus.connection === "CONNECTED"
            ? "text-[#00FFA3]"
            : systemStatus.connection === "PROCESSING"
              ? "text-[#FFD600]"
              : "text-[#FF4D6D]";

    return (
        <div className="flex flex-col h-full relative w-full overflow-hidden">
            <div className="absolute inset-0 bg-[#090A0F] opacity-90 -z-20" />

            <div className="flex-none h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#13141C]/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-[#00F0FF]/20 to-transparent rounded-lg border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                        <Sparkles size={16} className="text-[#00F0FF]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                            Reasoning Engine
                        </h2>
                        <span className={`text-[9px] font-mono animate-pulse ${statusColor}`}>
                            STATUS: {systemStatus.connection}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-2 scroll-smooth relative z-0">
                <AnimatePresence initial={false} mode="popLayout">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {loadingState.chat ? <TypingIndicator key="typing-indicator" /> : null}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 p-4 bg-gradient-to-t from-[#090A0F] to-transparent z-10 w-full">
                <ReasoningContextBar />
                <div className="relative flex items-center gap-4 bg-[#13141C]/60 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all focus-within:border-[#00F0FF]/50 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.15)] group w-full">
                    <Paperclip size={18} className="text-[#94A3B8]" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Input cognitive query..."
                        className="flex-1 bg-transparent border-none text-[#E2E8F0] placeholder-white/20 focus:ring-0 text-sm h-6 outline-none font-sans tracking-wide"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loadingState.chat}
                        className="p-2 bg-[#00F0FF]/10 text-[#00F0FF] rounded-xl border border-[#00F0FF]/20 hover:bg-[#00F0FF] hover:text-[#090A0F] hover:shadow-[0_0_15px_#00F0FF] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        <Send size={16} />
                    </button>
                    <div className="absolute inset-x-4 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                </div>
            </div>
        </div>
    );
}
