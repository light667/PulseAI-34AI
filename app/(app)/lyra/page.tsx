"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, RefreshCw, BookOpen } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
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
  const { user, supabaseToken } = useAuth();

  const [messages, setMessages] = useState<LyraMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from Supabase on mount/auth state change
  useEffect(() => {
    async function loadHistory() {
      if (!user || !supabaseToken) {
        setMessages([OPENING_MSG(language)]);
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      try {
        const supabase = createClient(supabaseToken);
        const { data, error } = await supabase
          .from("lyra_conversations")
          .select("messages")
          .eq("user_id", user.uid)
          .single();

        if (error || !data || !data.messages || data.messages.length === 0) {
          setMessages([OPENING_MSG(language)]);
        } else {
          setMessages(data.messages as LyraMessage[]);
        }
      } catch (err) {
        console.error("Failed to load Lyra history:", err);
        setMessages([OPENING_MSG(language)]);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [user, supabaseToken, language]);

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
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/lyra", {
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          id: assistantMsgId,
        },
      ]);

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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: assistantReply } : m
                )
              );
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "fr"
              ? "Désolée, j'ai du mal à me connecter en ce moment. Réessayons dans un instant. 🌿"
              : "Sorry, I am having trouble connecting right now. Let's try again in a moment. 🌿",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (loading) return;
    const initial = [OPENING_MSG(language)];
    setMessages(initial);
    setRetrievedChunks([]);

    if (user && supabaseToken) {
      try {
        const supabase = createClient(supabaseToken);
        await supabase
          .from("lyra_conversations")
          .upsert({
            user_id: user.uid,
            messages: initial,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      } catch (err) {
        console.error("Failed to reset Lyra conversation in Supabase:", err);
      }
    }
  };

  const activeSuggestions = language === "fr" ? SUGGESTIONS.fr : SUGGESTIONS.en;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-4.5rem)] flex-col gap-4 overflow-hidden relative"
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between shrink-0 border border-zinc-800 bg-zinc-950/80 backdrop-blur rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Avatar Lyra - circular gradient teal to violet */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#5EEAD4] to-[#A78BFA] flex items-center justify-center shadow-lg relative">
            <span className="text-base animate-pulse">🌿</span>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border border-zinc-950" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-100 flex items-center gap-1.5">
              Lyra <span className="text-[#A78BFA] text-xs font-semibold py-0.5 px-2 bg-[#A78BFA]/10 rounded-full">Therapist</span>
            </h2>
            <p className="text-[11px] text-[#5EEAD4] font-medium tracking-wide">
              {language === "fr" ? "Écoute bienveillante & sans jugement" : "Compassionate, non-judgmental support"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={loading || historyLoading}
          className="text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-xl gap-1.5 text-xs bg-zinc-900/50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {language === "fr" ? "Nouvelle session" : "New session"}
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 bg-zinc-950/30 border border-zinc-900/50 rounded-2xl p-4 min-h-0 flex flex-col">
        {historyLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <Loader2 className="animate-spin text-[#A78BFA]" size={24} />
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
                          ? "bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-md"
                          : "bg-gradient-to-br from-[#1E1B4B]/80 to-[#0F172A]/80 border border-[#A78BFA]/20 text-zinc-100 shadow-[#A78BFA]/5 shadow-lg"
                      }`}
                    >
                      {/* Avatar inside message bubble if Lyra */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider">
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
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#5EEAD4] font-bold uppercase tracking-wider">
                          <span>{language === "fr" ? "Vous" : "You"}</span>
                          <span>•</span>
                          <span className="text-[9px] text-zinc-500">
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
                <div className="bg-[#1E1B4B]/50 border border-[#A78BFA]/10 rounded-2xl px-5 py-3.5 flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#A78BFA] animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-[#5EEAD4] animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-[#A78BFA] animate-bounce" />
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* RAG Context Display Indicator */}
      {retrievedChunks.length > 0 && (
        <div className="flex gap-2 items-center text-[10px] text-zinc-500 bg-zinc-950/40 border border-zinc-900 px-3 py-1.5 rounded-xl self-start max-w-full overflow-hidden shrink-0">
          <BookOpen size={10} className="text-[#5EEAD4] shrink-0" />
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
                className="rounded-full border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-400 hover:border-[#A78BFA] hover:text-[#A78BFA] hover:bg-[#A78BFA]/5 transition-all duration-200 shadow-sm"
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
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#A78BFA]/50 focus:ring-1 focus:ring-[#A78BFA]/20 transition-all shadow-lg"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#5EEAD4] to-[#A78BFA] text-zinc-950 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {loading ? (
              <Loader2 className="animate-spin text-zinc-950" size={18} />
            ) : (
              <Send size={18} className="text-zinc-950 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
