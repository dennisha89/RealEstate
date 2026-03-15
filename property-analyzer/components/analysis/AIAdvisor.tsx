"use client";

import { useState } from "react";
import { Sparkles, Send, ArrowRight } from "lucide-react";
import type { AdvisorResponse } from "@/lib/engines/ai-advisor-engine";

interface AIAdvisorProps {
  propertyContext?: {
    address: string;
    price: number;
    capRate: number;
    cashFlow: number;
    hyperScore: number;
    appreciation: number;
  };
}

interface Message {
  role: "user" | "advisor";
  text: string;
  data?: AdvisorResponse;
}

const SUGGESTED_QUESTIONS = [
  "Should I buy this property?",
  "How does this fit my portfolio?",
  "What's the risk profile?",
];

const REC_STYLES: Record<string, { label: string; className: string }> = {
  BUY: { label: "BUY", className: "bg-money-900/50 text-money-400 border-money-700/50" },
  PASS: { label: "PASS", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  RESEARCH_MORE: { label: "RESEARCH MORE", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PORTFOLIO_ADJUSTMENT: { label: "ADJUST", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

export default function AIAdvisor({ propertyContext }: AIAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, propertyContext }),
      });
      const data: AdvisorResponse = await res.json();
      setMessages((prev) => [...prev, { role: "advisor", text: data.answer, data }]);
    } catch {
      setMessages((prev) => [...prev, { role: "advisor", text: "Unable to reach advisor. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const visible = messages.slice(-5);

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-money-400" />
        <h4 className="text-sm font-semibold text-gray-200">AI Deal Advisor</h4>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[120px] max-h-[360px] overflow-y-auto scrollbar-hide">
        {visible.length === 0 && !loading && (
          <p className="text-xs text-gray-500 text-center py-6">
            Ask a question about this deal or your portfolio.
          </p>
        )}

        {visible.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-money-900/30 text-gray-200 rounded-br-sm"
                  : "bg-surface-elevated text-gray-300 rounded-bl-sm"
              }`}
            >
              {msg.text}

              {msg.data && (
                <div className="mt-2.5 space-y-2">
                  {/* Recommendation badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${REC_STYLES[msg.data.recommendation]?.className ?? ""}`}>
                    {REC_STYLES[msg.data.recommendation]?.label ?? msg.data.recommendation}
                    <span className="text-[10px] opacity-60 font-mono ml-1">
                      {msg.data.confidence}%
                    </span>
                  </span>

                  {/* Reasoning */}
                  {msg.data.reasoning.length > 0 && (
                    <ul className="space-y-1 mt-1.5">
                      {msg.data.reasoning.map((r, j) => (
                        <li key={j} className="text-xs text-gray-400 flex gap-1.5">
                          <span className="text-gray-600 shrink-0">-</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Portfolio impact */}
                  {msg.data.portfolioImpact && (
                    <div className="text-xs text-gray-500 border-t border-surface-border pt-1.5 mt-1.5">
                      Cash flow impact:{" "}
                      <span className={`font-mono ${msg.data.portfolioImpact.cashFlowImpact >= 0 ? "text-money-400" : "text-red-400"}`}>
                        ${msg.data.portfolioImpact.cashFlowImpact.toLocaleString()}/mo
                      </span>
                    </div>
                  )}

                  {/* Suggested actions */}
                  {msg.data.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.data.suggestedActions.map((action, j) => (
                        <button
                          key={j}
                          onClick={() => handleSend(action)}
                          className="inline-flex items-center gap-1 text-[11px] text-money-400 hover:text-money-300 bg-money-900/20 hover:bg-money-900/30 rounded px-2 py-1 transition-colors"
                        >
                          <ArrowRight className="h-3 w-3" />
                          {action.length > 40 ? action.slice(0, 40) + "..." : action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-elevated rounded-lg px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-xs text-gray-400 hover:text-gray-200 bg-surface-elevated hover:bg-surface-overlay rounded-md px-3 py-1.5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            placeholder="Ask about this deal..."
            disabled={loading}
            className="flex-1 bg-surface-secondary border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-money-600/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-money-600 hover:bg-money-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
