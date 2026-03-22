"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoData } from "@/lib/hooks/useDemoData";
import { useUIStore } from "@/lib/stores/ui-store";
import { useGamificationStore } from "@/lib/stores/gamification-store";
import { AchievementToast } from "@/components/shared/AchievementToast";
import { XPBar } from "@/components/shared/XPBar";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { JOURNEY_STEPS } from "@/components/JourneyTracker";
import { LogoMark } from "@/components/Logo";
import {
  LayoutDashboard,
  BarChart3,
  Globe,
  Search,
  Kanban,
  SlidersHorizontal,
  Percent,
  Settings,
  Menu,
  X,
  User,
  Bot,
  Mic,
  Send,
  Bell,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION — 7 primary pages + settings
   ═══════════════════════════════════════════════════════════════ */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",            label: "Dashboard", icon: LayoutDashboard  },
  { href: "/dashboard/analyze",    label: "Analyze",   icon: BarChart3        },
  { href: "/dashboard/markets",    label: "Markets",   icon: Globe            },
  { href: "/dashboard/discover",   label: "Discover",  icon: Search           },
  { href: "/dashboard/pipeline",   label: "Pipeline",  icon: Kanban           },
  { href: "/dashboard/simulator",  label: "Simulator", icon: SlidersHorizontal },
  { href: "/dashboard/rates",      label: "Rates",     icon: Percent           },
];

const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard",           label: "Home",     icon: LayoutDashboard  },
  { href: "/dashboard/analyze",   label: "Analyze",  icon: BarChart3        },
  { href: "/dashboard/markets",   label: "Markets",  icon: Globe            },
  { href: "/dashboard/pipeline",  label: "Deals",    icon: Kanban           },
  { href: "/dashboard/simulator", label: "Simulate", icon: SlidersHorizontal },
];

/* ═══════════════════════════════════════════════════════════════
   AI COACH PANEL SHELL
   ═══════════════════════════════════════════════════════════════ */

function AiCoachPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <aside
      className="flex flex-col h-full glass-panel border-l border-white/[0.05] animate-slide-in-right"
      role="complementary"
      aria-label="AI Coach"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-black" aria-hidden="true" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-content-primary">AI Coach</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald block" aria-hidden="true" />
              <span className="text-[10px] text-content-disabled leading-none">Context-aware</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-content-disabled hover:text-content-primary hover:bg-white/[0.06] transition-colors"
          aria-label="Close AI Coach"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat body */}
      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="text-center max-w-[240px]">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-6 h-6 text-gold" aria-hidden="true" />
          </div>
          <p className="text-[13px] font-medium text-content-primary mb-1">Ask me anything</p>
          <p className="text-[11px] text-content-disabled leading-relaxed">
            I have full context on your deals, markets, and portfolio. Claude integration coming next session.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setInput("");
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="ai-coach-input" className="sr-only">
            Ask AI Coach a question
          </label>
          <input
            ref={inputRef}
            id="ai-coach-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any deal, market, or metric..."
            className="input-glass flex-1 text-[13px]"
            aria-label="Ask AI Coach"
          />
          <button
            type="button"
            className="p-2 rounded-lg text-content-disabled hover:text-gold hover:bg-gold/5 transition-colors"
            aria-label="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold/80 text-black flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition-all shrink-0"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[9px] text-content-disabled text-center mt-2">
          AI analysis is informational, not financial advice.
        </p>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useDemoData();

  const pathname = usePathname();
  const router = useRouter();

  /* ── Mobile drawer ── */
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── AI Coach ── */
  const aiCoachOpen = useUIStore((s) => s.aiCoachOpen);
  const toggleAiCoach = useUIStore((s) => s.toggleAiCoach);
  const setAiCoachOpen = useUIStore((s) => s.setAiCoachOpen);

  /* ── Quick Analyze search ── */
  const [searchValue, setSearchValue] = useState("");

  /* ── Gamification ── */
  const trackAction = useGamificationStore((s) => s.trackAction);
  const analysisCount = useGamificationStore((s) => s.analysisCount);
  const marketsExplored = useGamificationStore((s) => s.marketsExplored);
  const pagesVisited = useGamificationStore((s) => s.pagesVisited);
  const simulationCount = useGamificationStore((s) => s.simulationCount);
  const unlockedAchievements = useGamificationStore((s) => s.unlockedAchievements);

  /* ── Track page visits ── */
  useEffect(() => {
    const pageName = pathname.split("/").pop() || "dashboard";
    trackAction(`page_visited:${pageName}`);
  }, [pathname, trackAction]);

  /* ── Journey steps derived from gamification store ── */
  const completedSteps = useMemo(() => {
    const completed = new Set<string>();

    // "goal" is always complete once the user is on the dashboard
    completed.add("goal");

    if (marketsExplored.length >= 1) completed.add("market");
    if (pagesVisited.includes("discover")) completed.add("find");
    if (analysisCount >= 1) completed.add("analyze");
    if (unlockedAchievements.includes("compared_deals")) completed.add("risk");
    if (simulationCount >= 1) completed.add("decide");
    if (unlockedAchievements.includes("first_offer")) completed.add("execute");

    return completed;
  }, [analysisCount, marketsExplored, pagesVisited, simulationCount, unlockedAchievements]);

  // The current step is the first step that has not yet been completed.
  const currentStepId = useMemo(() => {
    for (const step of JOURNEY_STEPS) {
      if (!completedSteps.has(step.id)) return step.id;
    }
    // All steps completed — keep last step active
    return JOURNEY_STEPS[JOURNEY_STEPS.length - 1]?.id ?? "execute";
  }, [completedSteps]);

  /* ── Keyboard shortcut: Cmd/Ctrl+K → AI Coach ── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleAiCoach();
      }
      if (e.key === "Escape" && aiCoachOpen) {
        setAiCoachOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAiCoach, setAiCoachOpen, aiCoachOpen]);

  /* ── Active nav helper ── */
  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  /* ── Quick Analyze submit ── */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    setSearchValue("");
    router.push(`/dashboard/analyze?address=${encodeURIComponent(trimmed)}`);
  }

  const totalCompleted = completedSteps.size;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">

      {/* ═══════════════════════════════════════════════════════════
          TOP NAV BAR — Logo + Nav Links + Search | Journey + XP
          No sidebar. Everything horizontal. Flush.
          ═══════════════════════════════════════════════════════════ */}
      <header className="shrink-0 border-b border-black/[0.04] bg-white/60 backdrop-blur-md z-40">
        <div className="flex items-center h-11 px-3 gap-1">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
            <LogoMark size={20} />
            <span className="gold-shimmer-text text-[11px] font-bold tracking-[0.12em] select-none hidden sm:inline">
              LOOTVUE
            </span>
          </Link>

          {/* Nav links — horizontal, desktop only */}
          <nav className="hidden lg:flex items-center gap-0.5 shrink-0" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150",
                    active
                      ? "bg-gold/10 text-gold"
                      : "text-content-tertiary hover:text-content-primary hover:bg-white/[0.03]",
                  ].join(" ")}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}

            {/* AI Coach toggle */}
            <button
              onClick={toggleAiCoach}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150",
                aiCoachOpen
                  ? "bg-gold/10 text-gold"
                  : "text-content-tertiary hover:text-gold hover:bg-gold/5",
              ].join(" ")}
              aria-pressed={aiCoachOpen}
              aria-label={aiCoachOpen ? "Close AI Coach" : "Open AI Coach"}
            >
              <Bot className="w-3.5 h-3.5" aria-hidden="true" />
              Coach
              <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
            </button>

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              aria-current={isActive("/dashboard/settings") ? "page" : undefined}
              className={[
                "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] transition-all duration-150",
                isActive("/dashboard/settings")
                  ? "bg-gold/10 text-gold"
                  : "text-content-disabled hover:text-content-secondary hover:bg-white/[0.03]",
              ].join(" ")}
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>

            {/* Language Switcher */}
            <div className="mt-2 pt-2 border-t border-surface-border">
              <LanguageSwitcher size="sm" />
            </div>
          </nav>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center ml-2 w-[220px] lg:w-[260px] relative shrink-0"
            role="search"
          >
            <label htmlFor="quick-analyze-input" className="sr-only">Analyze any address</label>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-content-disabled pointer-events-none" aria-hidden="true" />
              <input
                id="quick-analyze-input"
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Analyze any address..."
                className="input-glass w-full pl-8 pr-8 py-1 text-[11px]"
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-content-disabled hover:text-gold transition-colors" aria-label="Voice input">
                <Mic className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06] mx-1 hidden lg:block" />

          {/* Journey steps — RIGHT side */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
            {JOURNEY_STEPS.map((step, i) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = step.id === currentStepId;
              return (
                <div key={step.id} className="flex items-center gap-1 shrink-0">
                  <div className={[
                    "flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium",
                    isCurrent ? "bg-gold/15 text-gold" : isCompleted ? "text-gold/60" : "text-content-disabled",
                  ].join(" ")}>
                    <span className={[
                      "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold",
                      isCurrent ? "bg-gold text-black" : isCompleted ? "bg-gold/30 text-gold" : "bg-white/5 text-content-disabled",
                    ].join(" ")}>
                      {isCompleted ? "✓" : i + 1}
                    </span>
                    <span className="hidden xl:inline">{step.label}</span>
                  </div>
                  {i < JOURNEY_STEPS.length - 1 && (
                    <div className={`w-2 h-px ${isCompleted ? "bg-gold/30" : "bg-white/[0.06]"}`} />
                  )}
                </div>
              );
            })}
            <span className="text-[8px] text-content-disabled font-mono ml-1">{totalCompleted}/{JOURNEY_STEPS.length}</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/[0.06] mx-1 hidden md:block" />

          {/* XP bar */}
          <div className="hidden md:flex items-center shrink-0">
            <XPBar variant="compact" />
          </div>

          {/* Language toggle */}
          <LanguageSwitcher size="sm" />

          {/* Notifications */}
          <button className="relative p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors shrink-0 ml-1" aria-label="Notifications">
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-gold rounded-full" aria-hidden="true" />
          </button>

          {/* User */}
          <div className="w-6 h-6 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center shrink-0 ml-1">
            <User className="w-3 h-3 text-gold" aria-hidden="true" />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          BODY — full width content + AI panel
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        {/* Mobile nav drawer */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col border-r border-white/[0.04] glass-strong lg:hidden",
            "transform transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          aria-label="Mobile navigation"
          aria-hidden={mobileOpen ? undefined : "true"}
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <LogoMark size={22} />
              <span className="gold-shimmer-text text-[12px] font-bold tracking-[0.12em]">LOOTVUE</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-1 text-content-disabled hover:text-content-primary transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={["flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all", active ? "bg-gold/10 text-gold" : "text-content-tertiary hover:text-content-primary hover:bg-white/[0.03]"].join(" ")}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content — FULL WIDTH */}
        <main className="flex-1 overflow-y-auto min-w-0" id="main-content">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
            {children}
          </div>
        </main>

        {/* AI Coach dockable panel */}
        {aiCoachOpen && (
          <div className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-white/[0.04]">
            <AiCoachPanel onClose={() => setAiCoachOpen(false)} />
          </div>
        )}

        {/* AI Coach mobile overlay */}
        {aiCoachOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAiCoachOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[380px]">
              <AiCoachPanel onClose={() => setAiCoachOpen(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden flex items-center justify-around h-16 border-t border-white/[0.04] glass-subtle shrink-0"
        aria-label="Mobile navigation"
      >
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex flex-col items-center gap-1 px-2 py-1.5 min-w-[56px] transition-colors",
                active ? "text-gold" : "text-content-disabled",
              ].join(" ")}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[11px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Achievement toast */}
      <AchievementToast />
    </div>
  );
}
