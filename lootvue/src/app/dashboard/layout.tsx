"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoData } from "@/lib/hooks/useDemoData";
import { AiAssistant } from "@/components/AiAssistant";
import { NextSteps } from "@/components/NextSteps";
import { LogoMark } from "@/components/Logo";
import {
  LayoutDashboard, Search, SlidersHorizontal, Building2, Compass,
  Settings, LogOut, Menu, X, User, Bell, ChevronLeft, ChevronRight,
  Command, Layers, Scale, TrendingDown,
  DoorOpen, Landmark, Globe, Sparkles,
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION — organized by investor journey
   ═══════════════════════════════════════════════════════════════ */

interface NavItem {
  name: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "MARKET PULSE",
    items: [
      { name: "Home", desc: "Command center", href: "/dashboard", icon: LayoutDashboard },
      { name: "Rates", desc: "Live rate environment", href: "/dashboard/rates", icon: TrendingDown },
      { name: "Markets", desc: "City trends & signals", href: "/dashboard/markets", icon: Globe },
    ],
  },
  {
    label: "ANALYZE",
    items: [
      { name: "Find Deals", desc: "Browse opportunities", href: "/dashboard/discover", icon: Compass },
      { name: "Score Property", desc: "12-engine analysis", href: "/dashboard/analyze", icon: Search },
      { name: "Simulate", desc: "DCF + Monte Carlo", href: "/dashboard/simulator", icon: SlidersHorizontal },
    ],
  },
  {
    label: "DEAL FLOW",
    items: [
      { name: "Pipeline", desc: "Track active deals", href: "/dashboard/pipeline", icon: Layers },
      { name: "Compare", desc: "Side-by-side analysis", href: "/dashboard/compare", icon: Scale },
      { name: "Deal Room", desc: "Collaborate & close", href: "/dashboard/deal-room", icon: DoorOpen },
    ],
  },
  {
    label: "FINANCE & TRACK",
    items: [
      { name: "Lending", desc: "Match with lenders", href: "/dashboard/lending", icon: Landmark },
      { name: "Portfolio", desc: "Monitor performance", href: "/dashboard/portfolio", icon: Building2 },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

const MOBILE_TABS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyze", href: "/dashboard/analyze", icon: Search },
  { name: "Simulate", href: "/dashboard/simulator", icon: SlidersHorizontal },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Building2 },
];

function getPageName(pathname: string): string {
  for (const item of ALL_ITEMS) {
    if (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)) {
      return item.name;
    }
  }
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  return "Dashboard";
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useDemoData();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sw = collapsed ? "w-[60px]" : "w-[260px]";

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  const navLink = (item: NavItem, onClick?: () => void) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        title={collapsed ? `${item.name} — ${item.desc}` : undefined}
        className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] transition-all relative group ${
          active
            ? "bg-gold-muted text-gold-light font-medium"
            : "text-content-secondary hover:text-gold-light hover:bg-white/[0.03]"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-gold rounded-r" />}
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="block">{item.name}</span>
            <span className={`block text-[10px] leading-tight mt-px transition-colors ${
              active ? "text-gold/60" : "text-content-disabled group-hover:text-content-tertiary"
            }`}>
              {item.desc}
            </span>
          </div>
        )}
      </Link>
    );
  };

  /* ─── Sidebar content ─── */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-[56px] shrink-0">
        <LogoMark size={collapsed ? 24 : 28} />
        {!collapsed && (
          <span className="text-[13px] font-semibold text-content-primary tracking-[0.12em]">LOOTVUE</span>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-[7px] rounded-lg bg-white/[0.04] border border-white/[0.06] text-content-disabled text-xs cursor-pointer hover:bg-white/[0.06] hover:border-gold/20 transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1">Search...</span>
            <kbd className="text-[10px] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">/</kbd>
          </div>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] px-3 mb-1.5 font-medium">
                {section.label}
              </div>
            )}
            {collapsed && section !== NAV_SECTIONS[0] && (
              <div className="border-t border-surface-border mb-2 mt-2" />
            )}
            <div className="space-y-px">
              {section.items.map(item => navLink(item, () => setMobileOpen(false)))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-border px-2 py-2 space-y-px shrink-0">
        {/* AI Assistant shortcut — desktop only */}
        {!collapsed && (
          <div className="px-3 py-2 mb-1 rounded-lg bg-gold-muted/40 border border-gold/10">
            <div className="flex items-center gap-2 text-[11px] text-gold-light">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-medium">AI Assistant available</span>
            </div>
            <p className="text-[10px] text-content-disabled mt-0.5 pl-[22px]">
              Click the gold button to ask anything
            </p>
          </div>
        )}

        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[13px] text-content-secondary hover:text-gold-light hover:bg-white/[0.03] transition-colors ${
            collapsed ? "justify-center px-0" : ""
          } ${isActive("/dashboard/settings") ? "bg-gold-muted text-gold-light font-medium" : ""}`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <div className={`flex items-center gap-2.5 px-3 py-[6px] rounded-md ${collapsed ? "justify-center px-0" : ""}`}>
          <div className="w-6 h-6 rounded-full bg-gold-muted flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-gold-light" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-content-primary truncate">Investor</div>
            </div>
          )}
          {!collapsed && (
            <button className="text-content-disabled hover:text-rose-light transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-9 border-t border-surface-border text-content-disabled hover:text-content-secondary transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col ${sw} bg-surface-secondary border-r border-surface-border transition-all duration-200 shrink-0`}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-surface-secondary border-r border-surface-border transform transition-transform duration-200 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 text-content-disabled hover:text-content-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-4 lg:px-6 border-b border-surface-border glass-subtle shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-content-secondary hover:text-content-primary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <LogoMark size={20} />
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[13px]">
              <span className="text-content-disabled">LootVue</span>
              <span className="text-content-disabled">/</span>
              <span className="text-content-primary font-medium">{getPageName(pathname)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-content-disabled text-xs hover:bg-white/[0.06] hover:border-gold/20 transition-colors">
              <Command className="w-3 h-3" /><span>K</span>
            </button>
            <button className="relative p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
            <NextSteps />
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex items-center justify-around h-14 border-t border-surface-border bg-surface-secondary shrink-0">
          {MOBILE_TABS.map(tab => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-gold-light" : "text-content-disabled"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* AI Assistant — floating on all pages */}
      <AiAssistant />
    </div>
  );
}
