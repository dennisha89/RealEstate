"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, SlidersHorizontal, Building2, Compass,
  Settings, LogOut, Menu, X, User, Bell, ChevronLeft, ChevronRight,
  Command, Layers, Scale, TrendingDown, ChevronDown, ChevronUp,
  DoorOpen, ArrowLeftRight, Wallet, Landmark,
} from "lucide-react";

// ─── Navigation Structure ─────────────────────────────────────────────────────
// 5 primary items always visible, secondary collapsed under "More"

const PRIMARY_NAV = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Discover", href: "/dashboard/discover", icon: Compass },
  { name: "Analyze", href: "/dashboard/analyze", icon: Search },
  { name: "Simulator", href: "/dashboard/simulator", icon: SlidersHorizontal },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Building2 },
];

const MARKETPLACE_NAV = [
  { name: "Deal Room", href: "/dashboard/deal-room", icon: DoorOpen },
  { name: "Exchange", href: "/dashboard/exchange", icon: ArrowLeftRight },
  { name: "Capital", href: "/dashboard/capital", icon: Wallet },
  { name: "Lending", href: "/dashboard/lending", icon: Landmark },
];

const SECONDARY_NAV = [
  { name: "Pipeline", href: "/dashboard/pipeline", icon: Layers },
  { name: "Compare", href: "/dashboard/compare", icon: Scale },
  { name: "Rates", href: "/dashboard/rates", icon: TrendingDown },
];

const MOBILE_TABS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyze", href: "/dashboard/analyze", icon: Search },
  { name: "Simulator", href: "/dashboard/simulator", icon: SlidersHorizontal },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Building2 },
];

function getPageName(pathname: string): string {
  for (const item of [...PRIMARY_NAV, ...SECONDARY_NAV]) {
    if (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)) {
      return item.name;
    }
  }
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  return "Dashboard";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const sw = collapsed ? "w-[60px]" : "w-[260px]";

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  const navLink = (item: (typeof PRIMARY_NAV)[number], onClick?: () => void) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] transition-colors relative ${
          active
            ? "bg-gold-muted text-gold-light font-medium"
            : "text-content-secondary hover:text-gold-light hover:bg-white/[0.03]"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-gold rounded-r" />}
        <item.icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-[56px] shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center shrink-0 shadow-glow-gold">
          <span className="text-[11px] font-bold text-black tracking-tight">LV</span>
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold text-content-primary tracking-[0.12em]">LOOTVUE</span>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-[7px] rounded-lg bg-white/[0.04] border border-white/[0.06] text-content-disabled text-xs cursor-pointer hover:bg-white/[0.06] transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1">Search...</span>
            <kbd className="text-[10px] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">/</kbd>
          </div>
        </div>
      )}

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {!collapsed && (
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] px-3 mb-1 font-medium">
            INVEST
          </div>
        )}
        <div className="space-y-px">
          {PRIMARY_NAV.map((item) => navLink(item, () => setMobileOpen(false)))}
        </div>

        {/* Secondary — "More" section */}
        {!collapsed && (
          <div className="mt-4">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium hover:text-content-tertiary transition-colors"
            >
              <span>More</span>
              {moreOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {moreOpen && (
              <div className="space-y-px animate-fade-in">
                {SECONDARY_NAV.map((item) => navLink(item, () => setMobileOpen(false)))}
              </div>
            )}
          </div>
        )}

        {/* Show secondary icons when collapsed */}
        {collapsed && (
          <div className="mt-3 pt-3 border-t border-surface-border space-y-px">
            {SECONDARY_NAV.map((item) => navLink(item, () => setMobileOpen(false)))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-border px-2 py-2 space-y-px shrink-0">
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-surface-secondary border-r border-surface-border transform transition-transform duration-200 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
              <div className="w-5 h-5 rounded-full bg-gradient-gold flex items-center justify-center">
                <span className="text-[8px] font-bold text-black tracking-tight">LV</span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[13px]">
              <span className="text-content-disabled">LootVue</span>
              <span className="text-content-disabled">/</span>
              <span className="text-content-primary font-medium">{getPageName(pathname)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-gold/20 text-content-disabled text-xs hover:bg-white/[0.06] hover:border-gold/40 transition-colors">
              <Command className="w-3 h-3" /><span>K</span>
            </button>
            <button className="relative p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex items-center justify-around h-14 border-t border-surface-border bg-surface-secondary shrink-0">
          {MOBILE_TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-gold-light" : "text-content-disabled"}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
