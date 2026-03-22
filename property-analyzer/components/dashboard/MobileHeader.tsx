"use client";

import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/analyze": "Analyze",
  "/deals": "Deal Scanner",
  "/markets": "Markets",
  "/money-flow": "Money Flow",
  "/microeconomics": "Microeconomics",
  "/portfolio": "Portfolio",
  "/trends": "Trends",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Check prefix matches for nested routes
  const match = Object.entries(pageTitles).find(
    ([href]) => href !== "/" && pathname.startsWith(href)
  );
  return match ? match[1] : "LootVue";
}

export default function MobileHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header
      className="sticky top-0 z-30 md:hidden bg-surface-card/95 backdrop-blur-sm border-b border-surface-border"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-4 h-12">
        {/* Left: App icon */}
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-money-500 to-money-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold leading-none">LV</span>
        </div>

        {/* Center: Page title */}
        <h1 className="text-sm font-semibold text-gray-100 absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>

        {/* Right: Bell + avatar */}
        <div className="flex items-center gap-2">
          <button className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-elevated transition-colors">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-money-500 rounded-full" />
          </button>
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-money-600 to-money-800 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
