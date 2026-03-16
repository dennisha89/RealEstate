"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, ArrowRight } from "lucide-react";
import { generateContextualResponse } from "@/lib/engines/ai-context-engine";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  "/dashboard": [
    "How is my portfolio performing?",
    "What should I invest in right now?",
    "Help me find my first deal",
  ],
  "/dashboard/analyze": [
    "What does DSCR mean?",
    "Is 7% a good cap rate for this area?",
    "Explain the stress test results",
  ],
  "/dashboard/simulator": [
    "What IRR does my simulation show?",
    "How does vacancy affect my returns?",
    "Run a recession scenario for me",
  ],
  "/dashboard/portfolio": [
    "How is my portfolio performing?",
    "What is my best performing asset?",
    "Should I sell any properties?",
  ],
  "/dashboard/discover": [
    "Which markets have the highest cap rates?",
    "Show me cash-flow positive properties",
    "What makes a good investment property?",
  ],
  "/dashboard/lending": [
    "What DSCR do lenders require?",
    "Should I go conventional or DSCR loan?",
    "How many points is too many?",
  ],
  "/dashboard/rates": [
    "How do rate changes affect my deals?",
    "Should I wait for rates to drop?",
    "What is the yield curve telling us?",
  ],
};

function getDefaultSuggestions(pathname: string): string[] {
  const direct = PAGE_SUGGESTIONS[pathname];
  if (direct) return direct;
  for (const key of Object.keys(PAGE_SUGGESTIONS)) {
    if (pathname.startsWith(key) && key !== "/dashboard") {
      const match = PAGE_SUGGESTIONS[key];
      if (match) return match;
    }
  }
  return PAGE_SUGGESTIONS["/dashboard"] ?? [];
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const pathname = usePathname();
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = getDefaultSuggestions(pathname) ?? PAGE_SUGGESTIONS["/dashboard"];

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Context-aware response using real store data
    setTimeout(() => {
      const response = generateContextualResponse(text, pathname);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response,
      }]);
      setTyping(false);
    }, 400 + Math.random() * 600);
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full bg-gradient-gold text-black flex items-center justify-center shadow-glow-gold hover:scale-105 active:scale-95 transition-transform"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:bg-black/20"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] bg-surface-secondary border-l border-surface-border flex flex-col animate-slide-in-right"
            role="complementary"
            aria-label="AI Investment Advisor"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-surface-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">LootVue AI</span>
                  <span className="text-[10px] text-content-disabled block leading-tight">Context-Aware Advisor</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/[0.06] text-content-disabled hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-gold-muted flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-gold-light" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">How can I help?</h3>
                  <p className="text-xs text-content-tertiary mb-6 max-w-[260px] mx-auto leading-relaxed">
                    I can see your deals, simulations, and watchlist. Ask me anything and I will reference your actual numbers.
                  </p>
                  <div className="space-y-2">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-white/[0.06] text-[13px] text-content-secondary hover:bg-white/[0.04] hover:border-gold/20 transition-all flex items-center justify-between group"
                      >
                        <span>{s}</span>
                        <ArrowRight className="w-3 h-3 text-content-disabled group-hover:text-gold-light transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-gold flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-black" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                      m.role === "user"
                        ? "bg-gold-muted text-gold-light rounded-br-sm"
                        : "bg-white/[0.04] text-content-secondary border border-white/[0.06] rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-black" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-pulse" />
                      <div className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-pulse [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-gold/60 rounded-full animate-pulse [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-surface-border shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about any deal, market, or metric..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-content-disabled outline-none focus:border-gold/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="w-9 h-9 rounded-lg bg-gradient-gold text-black flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[9px] text-content-disabled text-center mt-2">
                AI analysis is informational, not financial advice.
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
