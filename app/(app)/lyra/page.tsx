"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, RefreshCw, BookOpen } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { Button } from "@/components/ui/button";

interface LyraMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const OPENING_MSG = (lang: string): LyraMessage => ({
  role: "assistant",
  content:
    lang === "fr"
      ? "Bonjour, je suis Lyra. Comment te sens-tu aujourd'hui ? Je suis là, sans jugement. 🌿"
      : "Hello, I am Lyra. How are you feeling today? I am here, without judgment. 🌿",
  timestamp: new Date().toISOString(),
});

const SUGGESTIONS = {
  fr: [
    { emoji: "😔", text: "Je me sens anxieux·se" },
    { emoji: "😴", text: "Je n'arrive pas à dormir" },
    { emoji: "😢", text: "Je me sens seul·e" },
    { emoji: "😤", text: "Je suis stressé·e" },
  ],
  en: [
    { emoji: "😔", text: "I feel anxious" },
    { emoji: "😴", text: "I can't sleep" },
    { emoji: "😢", text: "I feel lonely" },
    { emoji: "😤", text: "I'm stressed" },
  ],
};

export default function LyraPage() {
  const language = useHealthStore((s) => s.language) || "fr";
  const { user } = useAuth();

  const [messages, setMessages] = useState<LyraMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from LocalStorage (based on Firebase user UID)
  useEffect(() => {
    function loadHistory() {
      if (!user) {
        setMessages([OPENING_MSG(language)]);
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      try {
        const stored = localStorage.getItem(`lyra_history_${user.uid}`);
        if (stored) {
          setMessages(JSON.parse(stored) as LyraMessage[]);
        } else {
          setMessages([OPENING_MSG(language)]);
        }
      } catch (err) {
        console.error("Failed to load Lyra history from localStorage:", err);
        setMessages([OPENING_MSG(language)]);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [user, language]);

  // Save history helper
  const saveLocalHistory = (updated: LyraMessage[]) => {
    if (user) {
      try {
        localStorage.setItem(`lyra_history_${user.uid}`, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save Lyra history to localStorage:", err);
      }
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: LyraMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveLocalHistory(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Determine backend endpoint (Render backend or local route proxy)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/lyra`
        : "/api/lyra";

      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: updatedMessages,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact Lyra virtual therapist");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to initiate text stream");
      }

      const assistantMsgId = Math.random().toString();
      const newAssistantMsg: LyraMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        id: assistantMsgId,
      };

      setMessages((prev) => [...prev, newAssistantMsg]);

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          try {
            const parsed = JSON.parse(cleanLine);
            if (parsed.type === "chunk" && parsed.text) {
              assistantReply += parsed.text;
              setMessages((prev) => {
                const updated = prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: assistantReply } : m
                );
                // save ongoing stream to local storage
                saveLocalHistory(updated);
                return updated;
              });
            } else if (parsed.type === "metadata" && parsed.retrievedChunks) {
              setRetrievedChunks(parsed.retrievedChunks);
            }
          } catch (err) {
            // Partial chunk parsing error, wait for next buffer chunk
          }
        }
      }
    } catch (err) {
      console.error("Lyra sending error:", err);
      const errorMsg: LyraMessage = {
        role: "assistant",
        content:
          language === "fr"
            ? "Désolée, j'ai du mal à me connecter en ce moment. Réessayons dans un instant. 🌿"
            : "Sorry, I am having trouble connecting right now. Let's try again in a moment. 🌿",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev, errorMsg];
        saveLocalHistory(updated);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (loading) return;
    const initial = [OPENING_MSG(language)];
    setMessages(initial);
    setRetrievedChunks([]);
    saveLocalHistory(initial);
  };

  const activeSuggestions = language === "fr" ? SUGGESTIONS.fr : SUGGESTIONS.en;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-4.5rem)] flex-col gap-4 overflow-hidden relative bg-white dark:bg-black text-zinc-900 dark:text-zinc-100"
    >
      {/* Header Panel - White in light, black in dark with green accents */}
      <div className="flex items-center justify-between shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 backdrop-blur rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Avatar Lyra - circular gradient green/emerald */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#34D399] to-[#10B981] flex items-center justify-center shadow-md relative">
            <span className="text-base">🌿</span>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border border-white dark:border-zinc-950" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
              Lyra <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold py-0.5 px-2 bg-emerald-500/10 rounded-full">Therapist</span>
            </h2>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">
              {language === "fr" ? "Écoute bienveillante & sans jugement" : "Compassionate, non-judgmental support"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={loading || historyLoading}
          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl gap-1.5 text-xs bg-zinc-100/50 dark:bg-zinc-900/50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {language === "fr" ? "Nouvelle session" : "New session"}
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 min-h-0 flex flex-col">
        {historyLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
            <p className="text-xs font-semibold">
              {language === "fr" ? "Chargement de la conversation..." : "Loading conversation..."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "bg-emerald-600 text-white shadow-md font-medium"
                          : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm"
                      }`}
                    >
                      {/* Avatar header inside message bubble */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                          <span>Lyra</span>
                          <span>•</span>
                          <span className="text-[9px] text-zinc-500 capitalize">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                      {isUser && (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                          <span>{language === "fr" ? "Vous" : "You"}</span>
                          <span>•</span>
                          <span className="text-[9px] text-emerald-200/75">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing Indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3.5 flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* RAG Context Display Indicator */}
      {retrievedChunks.length > 0 && (
        <div className="flex gap-2 items-center text-[10px] text-zinc-500 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl self-start max-w-full overflow-hidden shrink-0">
          <BookOpen size={10} className="text-emerald-500 shrink-0" />
          <span className="truncate">
            {language === "fr"
              ? `RAG: ${retrievedChunks.length} ressources de bien-être mental chargées`
              : `RAG: ${retrievedChunks.length} mental health resources loaded`}
          </span>
        </div>
      )}

      {/* Suggestions and Input Form */}
      <div className="flex flex-col gap-3 shrink-0">
        {/* Suggestion Pills */}
        {!loading && messages.length <= 2 && (
          <div className="flex flex-wrap gap-2">
            {activeSuggestions.map((s) => (
              <button
                key={s.text}
                onClick={() => handleSend(s.text)}
                className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200 shadow-sm"
              >
                {s.emoji} {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2 items-center"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={
              language === "fr" ? "Dis-moi ce que tu as sur le cœur..." : "Tell me what's on your mind..."
            }
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 px-4 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? (
              <Loader2 className="animate-spin text-white" size={18} />
            ) : (
              <Send size={18} className="text-white ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
