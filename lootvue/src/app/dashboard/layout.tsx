"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoData } from "@/lib/hooks/useDemoData";
import { useUIStore } from "@/lib/stores/ui-store";
import { JourneyTracker, JOURNEY_STEPS } from "@/components/JourneyTracker";
import { LogoMark } from "@/components/Logo";
import {
  LayoutDashboard,
  BarChart3,
  Globe,
  Search,
  Kanban,
  SlidersHorizontal,
  Settings,
  Menu,
  X,
  User,
  Bot,
  Mic,
  Send,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
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
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/dashboard/settings",   label: "Settings",  icon: Settings         },
];

const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard",           label: "Home",      icon: LayoutDashboard  },
  { href: "/dashboard/analyze",   label: "Analyze",   icon: BarChart3        },
  { href: "/dashboard/simulator", label: "Simulate",  icon: SlidersHorizontal },
  { href: "/dashboard/pipeline",  label: "Pipeline",  icon: Kanban           },
];

/* ═══════════════════════════════════════════════════════════════
   JOURNEY STATE HELPERS — localStorage-backed
   ═══════════════════════════════════════════════════════════════ */

const JOURNEY_STORAGE_KEY = "lootvue-journey-v1";

interface JourneyState {
  currentStep: string;
  completedSteps: Record<string, string>;
  completedSubSteps: string[]; // serialised Set as array
}

const DEFAULT_JOURNEY: JourneyState = {
  currentStep: JOURNEY_STEPS[0]?.id ?? "goal",
  completedSteps: {},
  completedSubSteps: [],
};

function loadJourney(): JourneyState {
  if (typeof window === "undefined") return DEFAULT_JOURNEY;
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return DEFAULT_JOURNEY;
    const parsed = JSON.parse(raw) as Partial<JourneyState>;
    return {
      currentStep: parsed.currentStep ?? DEFAULT_JOURNEY.currentStep,
      completedSteps: parsed.completedSteps ?? {},
      completedSubSteps: Array.isArray(parsed.completedSubSteps) ? parsed.completedSubSteps : [],
    };
  } catch {
    return DEFAULT_JOURNEY;
  }
}

function saveJourney(state: JourneyState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable in some browser contexts — fail silently
  }
}

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

  /* ── Sidebar collapse (desktop) ── */
  const [collapsed, setCollapsed] = useState(false);

  /* ── Mobile drawer ── */
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── AI Coach ── */
  const aiCoachOpen = useUIStore((s) => s.aiCoachOpen);
  const toggleAiCoach = useUIStore((s) => s.toggleAiCoach);
  const setAiCoachOpen = useUIStore((s) => s.setAiCoachOpen);

  /* ── Quick Analyze search ── */
  const [searchValue, setSearchValue] = useState("");

  /* ── Journey state (localStorage-backed) ── */
  const [journey, setJourney] = useState<JourneyState>(DEFAULT_JOURNEY);
  const [journeyHydrated, setJourneyHydrated] = useState(false);
  const [journeyCollapsed, setJourneyCollapsed] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setJourney(loadJourney());
    setJourneyHydrated(true);
  }, []);

  // Persist on every journey change
  useEffect(() => {
    if (!journeyHydrated) return;
    saveJourney(journey);
  }, [journey, journeyHydrated]);

  // Collapse journey tracker on small screens
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setJourneyCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => setJourneyCollapsed(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  /* ── Journey handlers ── */
  const handleStepClick = useCallback((stepId: string) => {
    setJourney((prev) => ({ ...prev, currentStep: stepId }));
  }, []);

  const handleSubStepToggle = useCallback(
    (stepId: string, subStepId: string, checked: boolean) => {
      const key = `${stepId}__${subStepId}`;
      setJourney((prev) => {
        const existing = new Set(prev.completedSubSteps);
        if (checked) {
          existing.add(key);
        } else {
          existing.delete(key);
        }
        return { ...prev, completedSubSteps: Array.from(existing) };
      });
    },
    [],
  );

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

  const sidebarW = collapsed ? "w-[64px]" : "w-[240px]";
  const completedSubStepsSet = new Set(journey.completedSubSteps);

  /* ── Nav link factory ── */
  function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={[
          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
          active
            ? "bg-gold/10 text-gold border-l-2 border-l-gold pl-[10px]"
            : "text-content-tertiary hover:text-content-primary hover:bg-white/[0.03] border-l-2 border-l-transparent pl-[10px]",
          collapsed ? "justify-center pl-0 border-l-0" : "",
        ].join(" ")}
      >
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  /* ── Sidebar content ── */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div
        className={[
          "flex items-center h-14 shrink-0 px-4",
          collapsed ? "justify-center" : "gap-3",
        ].join(" ")}
      >
        <LogoMark size={collapsed ? 24 : 26} />
        {!collapsed && (
          <span
            className="gold-shimmer-text text-[13px] font-bold tracking-[0.15em] select-none"
            aria-label="LootVue"
          >
            LOOTVUE
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.04] mx-3" aria-hidden="true" />

      {/* Primary nav */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
        aria-label="Primary navigation"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="border-t border-white/[0.04] mx-3" aria-hidden="true" />

      {/* Bottom items */}
      <div className="px-2 py-2 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.04] mx-3" aria-hidden="true" />

      {/* AI Coach toggle */}
      <div className="px-2 py-2">
        <button
          onClick={toggleAiCoach}
          className={[
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
            aiCoachOpen
              ? "bg-gold/10 text-gold border border-gold/20"
              : "text-content-tertiary hover:text-gold hover:bg-gold/5 border border-transparent",
            collapsed ? "justify-center px-0 border-0" : "",
          ].join(" ")}
          aria-pressed={aiCoachOpen}
          aria-label={aiCoachOpen ? "Close AI Coach" : "Open AI Coach (Cmd+K)"}
          title={collapsed ? "AI Coach (Cmd+K)" : undefined}
        >
          <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
          {!collapsed && (
            <span className="flex-1 text-left">AI Coach</span>
          )}
          {!collapsed && (
            <kbd className="text-[10px] font-mono text-content-disabled bg-white/[0.04] px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.04] mx-3" aria-hidden="true" />

      {/* User avatar */}
      <div
        className={[
          "flex items-center gap-2.5 px-3 py-3 shrink-0",
          collapsed ? "justify-center" : "",
        ].join(" ")}
      >
        <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-content-primary truncate">Investor</div>
              <div className="text-[10px] text-content-disabled truncate">Free plan</div>
            </div>
            <button
              className="p-1 text-content-disabled hover:text-rose transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden lg:flex items-center justify-center h-8 border-t border-white/[0.04] text-content-disabled hover:text-content-secondary transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-luxury">

      {/* ── Journey Tracker — ALWAYS at the very top, prominent ── */}
      {journeyHydrated && (
        <div className="shrink-0 border-b border-white/[0.04] glass-subtle px-4 py-2.5">
          <div className="max-w-[1400px] mx-auto flex items-center gap-3">
            <span className="text-[9px] text-content-disabled uppercase tracking-wider font-medium shrink-0">Journey</span>
            <div className="flex items-center gap-2 flex-1">
              {JOURNEY_STEPS.map((step, i) => {
                const isCompleted = step.id in journey.completedSteps;
                const isCurrent = step.id === journey.currentStep;
                const isPast = JOURNEY_STEPS.findIndex(s => s.id === journey.currentStep) > i;
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleStepClick(step.id)}
                      className={[
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200",
                        isCurrent
                          ? "bg-gold/15 text-gold border border-gold/30"
                          : isCompleted || isPast
                          ? "text-gold/70 hover:text-gold"
                          : "text-content-disabled",
                      ].join(" ")}
                      aria-label={`${step.label}: ${isCompleted ? 'completed' : isCurrent ? 'current step' : 'upcoming'}`}
                    >
                      <span className={[
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                        isCurrent ? "bg-gold text-black" : isCompleted || isPast ? "bg-gold/30 text-gold" : "bg-white/5 text-content-disabled",
                      ].join(" ")}>
                        {isCompleted || isPast ? "✓" : i + 1}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {i < JOURNEY_STEPS.length - 1 && (
                      <div className={[
                        "w-4 h-px hidden sm:block",
                        isPast || isCompleted ? "bg-gold/40" : "bg-white/10",
                      ].join(" ")} />
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-content-disabled shrink-0 hidden md:block">
              Step {Math.max(1, JOURNEY_STEPS.findIndex(s => s.id === journey.currentStep) + 1)} of {JOURNEY_STEPS.length}
            </span>
          </div>
        </div>
      )}

      {/* ── Body row (sidebar + content + AI panel) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Desktop sidebar ── */}
        <aside
          className={[
            "hidden lg:flex flex-col shrink-0 border-r border-white/[0.04]",
            "glass transition-all duration-300",
            sidebarW,
          ].join(" ")}
          aria-label="Application sidebar"
        >
          {sidebarContent}
        </aside>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile sidebar drawer ── */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col border-r border-white/[0.04] glass-strong lg:hidden",
            "transform transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          aria-label="Application sidebar"
          aria-hidden={mobileOpen ? undefined : "true"}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-3 p-1 text-content-disabled hover:text-content-primary transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
          {sidebarContent}
        </aside>

        {/* ── Main content column ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-4 lg:px-5 border-b border-white/[0.04] glass-subtle shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors"
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2">
                <LogoMark size={20} />
              </div>

              {/* Quick Analyze search bar — sticky top of content */}
              <form
                onSubmit={handleSearch}
                className="hidden sm:flex items-center gap-2 w-[280px] lg:w-[340px] relative"
                role="search"
              >
                <label htmlFor="quick-analyze-input" className="sr-only">
                  Analyze any address
                </label>
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-disabled pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="quick-analyze-input"
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Analyze any address..."
                    className="input-glass w-full pl-9 pr-9 py-1.5 text-[13px]"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-content-disabled hover:text-gold transition-colors"
                    aria-label="Voice input"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              {/* Cmd+K hint — desktop */}
              <button
                onClick={toggleAiCoach}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-content-disabled text-[11px] hover:border-gold/20 hover:text-gold transition-all"
                aria-label="Toggle AI Coach (Cmd+K)"
              >
                <kbd className="font-mono text-[10px]">⌘</kbd>
                <kbd className="font-mono text-[10px]">K</kbd>
              </button>

              {/* Notifications */}
              <button
                className="relative p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold rounded-full"
                  aria-hidden="true"
                />
              </button>
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto" id="main-content">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>

          {/* Mobile bottom tab bar */}
          <nav
            className="lg:hidden flex items-center justify-around h-14 border-t border-white/[0.04] glass-subtle shrink-0"
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
                    "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
                    active ? "text-gold" : "text-content-disabled",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── AI Coach dockable panel ── */}
        {aiCoachOpen && (
          <div className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-white/[0.04]">
            <AiCoachPanel onClose={() => setAiCoachOpen(false)} />
          </div>
        )}

        {/* ── AI Coach mobile fullscreen overlay ── */}
        {aiCoachOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setAiCoachOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[380px]">
              <AiCoachPanel onClose={() => setAiCoachOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
