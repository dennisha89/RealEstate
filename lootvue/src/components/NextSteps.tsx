"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search, SlidersHorizontal, Building2, Compass, Globe,
  Layers, Scale, TrendingDown, DoorOpen, Landmark,
  ArrowRight, Sparkles,
} from "lucide-react";

interface Step {
  label: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

/* ═══════════════════════════════════════════════════════════════
   FLOW MAP — every page knows what comes next
   ═══════════════════════════════════════════════════════════════ */

const FLOW: Record<string, Step[]> = {
  "/dashboard": [
    { label: "Check Rates", desc: "See today's rate environment before making moves", href: "/dashboard/rates", icon: TrendingDown },
    { label: "Explore Markets", desc: "Find which cities have the best signals", href: "/dashboard/markets", icon: Globe },
    { label: "Score a Property", desc: "Run a 12-engine analysis on any address", href: "/dashboard/analyze", icon: Search },
  ],
  "/dashboard/rates": [
    { label: "Explore Markets", desc: "See which cities are hot right now", href: "/dashboard/markets", icon: Globe },
    { label: "Score a Property", desc: "How do current rates affect this deal?", href: "/dashboard/analyze", icon: Search },
    { label: "Find Deals", desc: "Browse investment opportunities", href: "/dashboard/discover", icon: Compass },
  ],
  "/dashboard/markets": [
    { label: "Find Deals", desc: "Browse properties in top-scoring markets", href: "/dashboard/discover", icon: Compass },
    { label: "Score a Property", desc: "Deep-dive on a specific address", href: "/dashboard/analyze", icon: Search },
  ],
  "/dashboard/analyze": [
    { label: "Simulate Scenarios", desc: "Model returns with DCF + Monte Carlo", href: "/dashboard/simulator", icon: SlidersHorizontal },
    { label: "Compare Deals", desc: "Stack this against other properties", href: "/dashboard/compare", icon: Scale },
    { label: "Add to Pipeline", desc: "Track this deal through your funnel", href: "/dashboard/pipeline", icon: Layers },
  ],
  "/dashboard/discover": [
    { label: "Score a Property", desc: "Get the full 12-engine breakdown", href: "/dashboard/analyze", icon: Search },
    { label: "Compare Deals", desc: "Side-by-side analysis of top picks", href: "/dashboard/compare", icon: Scale },
  ],
  "/dashboard/simulator": [
    { label: "Compare Deals", desc: "How does this stack up against alternatives?", href: "/dashboard/compare", icon: Scale },
    { label: "Add to Pipeline", desc: "Save this deal to track progress", href: "/dashboard/pipeline", icon: Layers },
    { label: "Find Lending", desc: "Match with lenders for this deal", href: "/dashboard/lending", icon: Landmark },
  ],
  "/dashboard/pipeline": [
    { label: "Compare Deals", desc: "Stack your pipeline deals side-by-side", href: "/dashboard/compare", icon: Scale },
    { label: "Open Deal Room", desc: "Collaborate with partners on a deal", href: "/dashboard/deal-room", icon: DoorOpen },
    { label: "Find Lending", desc: "Get financing lined up", href: "/dashboard/lending", icon: Landmark },
  ],
  "/dashboard/compare": [
    { label: "Add to Pipeline", desc: "Track the winning deal", href: "/dashboard/pipeline", icon: Layers },
    { label: "Open Deal Room", desc: "Share analysis with partners", href: "/dashboard/deal-room", icon: DoorOpen },
    { label: "Find Lending", desc: "Start the financing process", href: "/dashboard/lending", icon: Landmark },
  ],
  "/dashboard/deal-room": [
    { label: "Find Lending", desc: "Secure financing for this deal", href: "/dashboard/lending", icon: Landmark },
    { label: "Track in Portfolio", desc: "Monitor performance after closing", href: "/dashboard/portfolio", icon: Building2 },
  ],
  "/dashboard/lending": [
    { label: "Open Deal Room", desc: "Share loan package with your team", href: "/dashboard/deal-room", icon: DoorOpen },
    { label: "Track in Portfolio", desc: "Add to your portfolio after closing", href: "/dashboard/portfolio", icon: Building2 },
  ],
  "/dashboard/portfolio": [
    { label: "Score a Property", desc: "Find your next investment", href: "/dashboard/analyze", icon: Search },
    { label: "Check Markets", desc: "How are your markets trending?", href: "/dashboard/markets", icon: Globe },
    { label: "Explore Refinance", desc: "Check if better rates are available", href: "/dashboard/lending", icon: Landmark },
  ],
  "/dashboard/settings": [],
};

/* ═══════════════════════════════════════════════════════════════
   JOURNEY BAR — shows where you are in the flow
   ═══════════════════════════════════════════════════════════════ */

const JOURNEY = [
  { label: "Rates", href: "/dashboard/rates" },
  { label: "Markets", href: "/dashboard/markets" },
  { label: "Analyze", href: "/dashboard/analyze" },
  { label: "Simulate", href: "/dashboard/simulator" },
  { label: "Compare", href: "/dashboard/compare" },
  { label: "Pipeline", href: "/dashboard/pipeline" },
  { label: "Deal Room", href: "/dashboard/deal-room" },
  { label: "Lending", href: "/dashboard/lending" },
  { label: "Portfolio", href: "/dashboard/portfolio" },
];

function getSteps(pathname: string): Step[] {
  const direct = FLOW[pathname];
  if (direct) return direct;
  for (const key of Object.keys(FLOW)) {
    if (pathname.startsWith(key) && key !== "/dashboard") {
      const match = FLOW[key];
      if (match) return match;
    }
  }
  return FLOW["/dashboard"] ?? [];
}

function getCurrentJourneyIndex(pathname: string): number {
  return JOURNEY.findIndex(j =>
    j.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(j.href)
  );
}

export function NextSteps() {
  const pathname = usePathname();
  const steps = getSteps(pathname) ?? [];
  const currentIdx = getCurrentJourneyIndex(pathname);

  if (steps.length === 0) return null;

  const stepNumber = currentIdx >= 0 ? currentIdx + 1 : null;
  const totalSteps = JOURNEY.length;
  const progressPct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / totalSteps) * 100) : 0;

  return (
    <div className="mb-6 pb-4 border-b border-surface-border">
      {/* Journey progress bar */}
      {currentIdx >= 0 && (
        <div className="mb-5 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-gradient-to-r from-gold/[0.03] to-transparent border-b border-gold/[0.06]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-gold-light" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-[0.08em]">
                Your Journey
              </span>
            </div>
            <span className="text-[11px] font-mono text-content-tertiary">
              Step {stepNumber} of {totalSteps} &mdash; {progressPct}%
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {JOURNEY.map((j, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <div key={j.href} className="flex items-center shrink-0">
                  <Link
                    href={j.href}
                    title={j.label}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                      isCurrent
                        ? "bg-gold-muted text-gold-light border border-gold/30"
                        : isPast
                          ? "text-emerald-light hover:bg-white/[0.05] border border-transparent"
                          : "text-content-disabled hover:text-content-tertiary hover:bg-white/[0.04] border border-transparent"
                    }`}
                    style={isCurrent ? { boxShadow: "0 0 12px -2px rgba(201,162,39,0.35)" } : undefined}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 ${
                        isCurrent
                          ? "bg-gold text-black"
                          : isPast
                            ? "bg-emerald/20 text-emerald-light"
                            : "bg-white/[0.08] text-content-disabled"
                      }`}
                      aria-hidden="true"
                    >
                      {isPast ? "\u2713" : i + 1}
                    </span>
                    {j.label}
                  </Link>
                  {i < JOURNEY.length - 1 && (
                    <div
                      className={`w-3 h-px mx-0.5 shrink-0 ${i < currentIdx ? "bg-emerald/30" : "bg-white/[0.05]"}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next step cards */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-gold-light" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-[0.08em]">What&apos;s Next</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map(s => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-gold-light" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white group-hover:text-gold-light transition-colors flex items-center gap-1.5">
                  {s.label}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                </div>
                <div className="text-[11px] text-content-tertiary mt-0.5 leading-relaxed">{s.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
