"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { sendLyraMessage, type LyraMessage } from "@/lib/services/lyraService";
import LyraSuggestions from "./LyraSuggestions";

const OPENING: LyraMessage = {
  role: "assistant",
  content:
    "Bonjour, je suis Lyra. Comment te sens-tu aujourd'hui ? Je suis là, sans jugement. 🌿",
  timestamp: new Date().toISOString(),
};

export default function LyraChat() {
  const [messages, setMessages] = useState<LyraMessage[]>([OPENING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: LyraMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendLyraMessage(text, messages);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Je suis désolée, une erreur s'est produite. Réessaie dans un instant. 🌿",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-[var(--lyra-violet)]/20 to-[var(--lyra-teal)]/20 p-4">
        <h2 className="font-display text-lg font-bold text-[var(--lyra-violet)]">
          Lyra 🌿
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Always here. Always listening.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "bg-gradient-to-br from-[var(--lyra-violet)]/30 to-[var(--lyra-teal)]/20"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-1 px-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-[var(--lyra-violet)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <LyraSuggestions onSelect={send} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-[var(--border-default)] pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--lyra-violet)]"
        >
          {loading ? (
            <Loader2 className="animate-spin text-white" size={18} />
          ) : (
            <Send size={18} className="text-white" />
          )}
        </button>
      </form>
    </div>
  );
}
