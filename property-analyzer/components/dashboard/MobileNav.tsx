"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Banknote,
  Menu,
  X,
  DollarSign,
  Building2,
  TrendingUp,
  LineChart,
  Settings,
  Scale,
  Workflow,
  Percent,
  Radar,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";

const primaryTabs = [
  { href: "/workflow", label: "\u5929\u6A5F Pathway", icon: Workflow },
  { href: "/discover", label: "Discover", icon: Radar },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Building2 },
];

const moreLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rates", label: "\u5929\u6CB3 Rates", icon: Percent },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/analyze", label: "Analyze", icon: Search },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/deals", label: "Deals", icon: DollarSign },
  { href: "/money-flow", label: "Money Flow", icon: Banknote },
  { href: "/microeconomics", label: "Microeconomics", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMoreActive = moreLinks.some((link) => isActive(link.href));

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  return (
    <>
      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeSheet}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-surface-card border-t border-surface-border rounded-t-2xl animate-slide-up-sheet pb-[env(safe-area-inset-bottom)]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-muted" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-sm font-semibold text-gray-200">More</h3>
              <button
                onClick={closeSheet}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-elevated transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="px-3 pb-4 space-y-1">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSheet}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                      ${
                        active
                          ? "bg-money-900/40 text-money-400 border border-money-800/50"
                          : "text-gray-400 hover:text-gray-200 hover:bg-surface-elevated border border-transparent"
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        active ? "text-money-400" : "text-gray-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-card border-t border-surface-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around min-h-[60px]">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors
                  ${active ? "text-money-400" : "text-gray-500"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setSheetOpen(!sheetOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors
              ${isMoreActive || sheetOpen ? "text-money-400" : "text-gray-500"}`}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
