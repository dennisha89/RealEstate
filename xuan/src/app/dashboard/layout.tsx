"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  Compass,
  BarChart3,
  TrendingDown,
  LineChart,
  Search,
  Scale,
  Zap,
  Building2,
  Layers,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  Command,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "\u5929\u6A5F Pathway", href: "/dashboard/pathway", icon: Workflow },
    ],
  },
  {
    label: "RESEARCH",
    items: [
      { name: "Discover", href: "/dashboard/discover", icon: Compass },
      { name: "Markets", href: "/dashboard/markets", icon: BarChart3 },
      { name: "Rates", href: "/dashboard/rates", icon: TrendingDown },
      { name: "Trends", href: "/dashboard/trends", icon: LineChart },
    ],
  },
  {
    label: "INVEST",
    items: [
      { name: "Analyze", href: "/dashboard/analyze", icon: Search },
      { name: "Compare", href: "/dashboard/compare", icon: Scale },
      { name: "Deals", href: "/dashboard/deals", icon: Zap },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { name: "Portfolio", href: "/dashboard/portfolio", icon: Building2 },
      { name: "Pipeline", href: "/dashboard/pipeline", icon: Layers },
    ],
  },
];

const MOBILE_TABS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Discover", href: "/dashboard/discover", icon: Compass },
  { name: "Markets", href: "/dashboard/markets", icon: BarChart3 },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Building2 },
];

function getPageName(pathname: string): string {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === pathname) return item.name;
    }
  }
  return "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? "w-[60px]" : "w-[260px]";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[56px] shrink-0">
        <div className="w-8 h-8 rounded-full bg-emerald flex items-center justify-center text-white font-serif text-base font-bold shrink-0">
          玄
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold text-content-primary tracking-[0.08em]">
            XUAN
          </span>
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] px-3 mb-1 font-medium">
                {section.label}
              </div>
            )}
            <div className="space-y-px">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[13px] transition-colors relative
                      ${
                        active
                          ? "bg-accent-muted text-accent-light font-medium"
                          : "text-content-secondary hover:text-content-primary hover:bg-white/[0.03]"
                      }
                      ${collapsed ? "justify-center px-0" : ""}
                    `}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-accent-light rounded-r" />
                    )}
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-surface-border px-2 py-2 space-y-px shrink-0">
        <Link
          href="/dashboard/settings"
          className={`
            flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[13px] text-content-secondary
            hover:text-content-primary hover:bg-white/[0.03] transition-colors
            ${collapsed ? "justify-center px-0" : ""}
          `}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <div
          className={`
            flex items-center gap-2.5 px-3 py-[6px] rounded-md
            ${collapsed ? "justify-center px-0" : ""}
          `}
        >
          <div className="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-accent-light" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-content-primary truncate">
                Investor
              </div>
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
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col ${sidebarWidth} bg-surface-secondary border-r border-surface-border
          transition-all duration-200 shrink-0
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[260px] bg-surface-secondary border-r border-surface-border
          transform transition-transform duration-200 lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
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
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-content-secondary hover:text-content-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald flex items-center justify-center text-white font-serif text-[10px] font-bold">
                玄
              </div>
            </div>
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5 text-[13px]">
              <span className="text-content-disabled">Xuan</span>
              <span className="text-content-disabled">/</span>
              <span className="text-content-primary font-medium">
                {getPageName(pathname)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-content-disabled text-xs hover:bg-white/[0.06] transition-colors">
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
            <button className="relative p-1.5 rounded-md text-content-secondary hover:text-content-primary hover:bg-white/[0.04] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex items-center justify-around h-14 border-t border-surface-border bg-surface-secondary shrink-0">
          {MOBILE_TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  active ? "text-accent-light" : "text-content-disabled"
                }`}
              >
                <tab.icon className="w-4.5 h-4.5" />
                <span className="text-[10px] font-medium">{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
