"use client";

import { Search, Bell, User } from "lucide-react";
import { useState } from "react";

export default function HeaderBar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="h-16 bg-surface-card/80 backdrop-blur-sm border-b border-surface-border flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address, zip code, or market..."
            className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-6">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-elevated transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-money-500 rounded-full" />
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-elevated transition-colors">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-money-600 to-money-800 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </button>
      </div>
    </header>
  );
}
