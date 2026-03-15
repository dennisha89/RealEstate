"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Building2,
  TrendingUp,
  BarChart3,
  Settings,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Radar,
  LineChart,
  Scale,
  Workflow,
  Percent,
} from "lucide-react";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { label: string; items: NavItem[]; primary?: boolean };

const navSections: NavSection[] = [
  {
    label: "",
    primary: true,
    items: [
      { href: "/workflow", label: "\u5929\u6A5F Pathway", icon: Workflow },
    ],
  },
  {
    label: "Dashboard",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "\u5929 Heaven",
    items: [
      { href: "/rates", label: "\u5929\u6CB3 Rates", icon: Percent },
      { href: "/trends", label: "Trends", icon: TrendingUp },
    ],
  },
  {
    label: "\u5730 Earth",
    items: [
      { href: "/discover", label: "Discover", icon: Radar },
      { href: "/analyze", label: "Analyze", icon: Search },
      { href: "/markets", label: "Markets", icon: BarChart3 },
      { href: "/compare", label: "Compare", icon: Scale },
      { href: "/deals", label: "Deals", icon: DollarSign },
    ],
  },
  {
    label: "\u4EBA Human",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: Building2 },
      { href: "/money-flow", label: "Money Flow", icon: Banknote },
      { href: "/microeconomics", label: "Microeconomics", icon: LineChart },
    ],
  },
];

const bottomSection: NavSection = {
  label: "Settings",
  items: [
    { href: "/settings", label: "Settings", icon: Settings },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface-card border-r border-surface-border flex flex-col z-40 transition-all duration-200
        ${collapsed ? "w-16" : "w-60"}`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-surface-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-money-500 to-money-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-bold leading-none">LV</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-bold text-gray-100">LootVue</p>
              <p className="text-[10px] text-money-500 font-medium tracking-wider uppercase">
                Real Estate Intelligence
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label || "_primary"} className={section.primary ? "mb-2" : ""}>
            {/* Section header */}
            {section.label && !collapsed && (
              <div className="text-[10px] text-gray-600 uppercase tracking-wider px-3 py-2 border-t border-gray-800/60 mt-1">
                {section.label}
              </div>
            )}
            {section.label && collapsed && (
              <div className="border-t border-gray-800/60 mt-1 mb-1" />
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isPrimary = section.primary;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                    ${
                      isPrimary && !active
                        ? "text-money-400 hover:text-money-300 hover:bg-money-900/30 border border-money-800/40"
                        : active
                          ? "bg-money-900/40 text-money-400 border border-money-800/50"
                          : "text-gray-400 hover:text-gray-200 hover:bg-surface-elevated border border-transparent"
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isPrimary && !active
                        ? "text-money-400"
                        : active
                          ? "text-money-400"
                          : "text-gray-500 group-hover:text-gray-300"
                    }`}
                  />
                  {!collapsed && <span className="animate-fade-in">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="px-2 pb-2 space-y-1">
        {!collapsed && (
          <div className="text-[10px] text-gray-600 uppercase tracking-wider px-3 py-2 border-t border-gray-800/60">
            {bottomSection.label}
          </div>
        )}
        {collapsed && <div className="border-t border-gray-800/60 mb-1" />}
        {bottomSection.items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${
                  active
                    ? "bg-surface-elevated text-gray-200"
                    : "text-gray-500 hover:text-gray-300 hover:bg-surface-elevated"
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-surface-elevated w-full transition-all"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
