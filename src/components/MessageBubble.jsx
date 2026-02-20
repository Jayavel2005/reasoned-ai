import { motion } from "framer-motion";
import { User, Cpu } from "lucide-react";

export default function MessageBubble({ message }) {
    const isUser = message.sender === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
        >
            <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start gap-3`}>
                {/* Avatar / Icon */}
                <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isUser
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                >
                    {isUser ? <User size={14} /> : <Cpu size={14} />}
                </div>

                {/* Message Content */}
                <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed border backdrop-blur-sm ${isUser
                            ? "bg-ai-accent/10 border-ai-accent/20 text-ai-text-primary rounded-tr-sm"
                            : "bg-ai-panel border-ai-border text-ai-text-secondary rounded-tl-sm shadow-sm"
                        }`}
                >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
            </div>
        </motion.div>
    );
}
