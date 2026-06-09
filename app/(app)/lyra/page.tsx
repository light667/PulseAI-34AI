"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Leaf, Heart, Moon, Sun,
         RefreshCw, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  { emoji: "😔", label: "Je me sens anxieux(se)", en: "I feel anxious" },
  { emoji: "😴", label: "Je n'arrive pas à dormir", en: "I can't sleep" },
  { emoji: "😢", label: "Je me sens seul(e)", en: "I feel lonely" },
  { emoji: "😤", label: "Je suis très stressé(e)", en: "I'm very stressed" },
  { emoji: "💔", label: "J'ai de la peine", en: "I'm heartbroken" },
  { emoji: "😶", label: "Je ne sais pas quoi ressentir", en: "I don't know how to feel" },
];

const OPENING_MESSAGE: Message = {
  id: "lyra-opening",
  role: "assistant",
  content: "Bonjour 🌿 Je suis Lyra. Je suis là pour t'écouter, sans jugement, à ton rythme. Comment te sens-tu aujourd'hui ?",
  timestamp: new Date(),
};

// ─── Composant Avatar Lyra ────────────────────────────────────────────────────

function LyraAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full flex-shrink-0 flex items-center justify-center
                 bg-gradient-to-br from-[#5EEAD4] to-[#A78BFA] shadow-lg
                 shadow-purple-500/20"
    >
      <Leaf size={size * 0.45} className="text-white" />
    </div>
  );
}

// ─── Composant Message ────────────────────────────────────────────────────────

function MessageBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}
    >
      {!isUser && <LyraAvatar size={32} />}

      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? "bg-[var(--accent-green)] text-[var(--text-inverse)] rounded-br-sm"
            : "bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-sm"
          }`}
      >
        {msg.content}
        {!isUser && isLast && msg.content === "" && (
          <span className="flex gap-1 py-1">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[var(--bg-tertiary)]
                        border border-[var(--border-default)] flex items-center justify-center">
          <Heart size={14} className="text-[var(--accent-green)]" />
        </div>
      )}
    </motion.div>
  );
}

// ─── Page Lyra ────────────────────────────────────────────────────────────────

export default function LyraPage() {
  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Scroll auto ─────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!atBottom);
  };

  // ─── Textarea auto-resize ─────────────────────────────────────────────────

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  // ─── Charger historique Supabase ─────────────────────────────────────────
  // (optionnel — persistance entre sessions)

  // ─── Envoyer message ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/lyra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history, language }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Réponse invalide");
      }

      // Lecture streaming SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullContent += parsed.token;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            } catch {
              // skip
            }
          }
        }
      }

      // Sauvegarder la conversation en Supabase (optionnel)
      // await saveConversation([...messages, userMsg, { ...assistantMsg, content: fullContent }]);

    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: "Je suis là, mais j'ai eu du mal à répondre. Réessaie dans un moment. 🌿" }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetConversation = () => {
    setMessages([OPENING_MESSAGE]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-[calc(100vh-64px)] overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex items-center gap-3">
          <LyraAvatar size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="font-semibold text-base"
                style={{ fontFamily: "Syne, sans-serif", color: "var(--text-primary)" }}
              >
                Lyra 🌿
              </h1>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(94,234,212,0.15)",
                  color: "#5EEAD4",
                  border: "1px solid rgba(94,234,212,0.3)",
                }}
              >
                En ligne
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Thérapeute virtuelle · Toujours disponible
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(l => l === "fr" ? "en" : "fr")}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {language === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}
          </button>

          {/* Reset */}
          <button
            onClick={resetConversation}
            className="p-2 rounded-lg transition-all hover:bg-[var(--bg-tertiary)]"
            title="Nouvelle conversation"
          >
            <RefreshCw size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{ scrollBehavior: "smooth" }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isLast={i === messages.length - 1}
            />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Scroll to bottom ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-32 right-6 p-2 rounded-full shadow-lg z-10"
            style={{ background: "var(--accent-green)", color: "var(--text-inverse)" }}
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Suggestions rapides ────────────────────────────────────────────── */}
      {messages.length <= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide flex-wrap"
        >
          {QUICK_SUGGESTIONS.map(s => (
            <button
              key={s.label}
              onClick={() => sendMessage(language === "fr" ? s.label : s.en)}
              className="text-xs px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0
                         transition-all hover:border-[var(--accent-green)]
                         hover:text-[var(--accent-green)]"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              {s.emoji} {language === "fr" ? s.label : s.en}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Input zone ────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 border-t"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === "fr"
              ? "Écris ce que tu ressens..."
              : "Write what you feel..."}
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm
                       leading-relaxed disabled:opacity-50"
            style={{
              color: "var(--text-primary)",
              fontFamily: "DM Sans, sans-serif",
              maxHeight: "120px",
            }}
          />

          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl flex-shrink-0 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:brightness-110 active:scale-95"
            style={{
              background: input.trim() && !isLoading
                ? "var(--accent-green)"
                : "var(--bg-primary)",
              color: input.trim() && !isLoading
                ? "var(--text-inverse)"
                : "var(--text-tertiary)",
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <p
          className="text-center text-xs mt-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Lyra n'est pas un substitut à un professionnel de santé mentale.
        </p>
      </div>
    </div>
  );
}