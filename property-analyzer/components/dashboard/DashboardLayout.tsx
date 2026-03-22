"use client";

import Sidebar from "./Sidebar";
import HeaderBar from "./HeaderBar";
import MobileNav from "./MobileNav";
import MobileHeader from "./MobileHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile header — hidden on desktop */}
      <MobileHeader />

      <div className="md:ml-60 transition-all duration-200">
        {/* Desktop header — hidden on mobile */}
        <div className="hidden md:block">
          <HeaderBar />
        </div>

        <main className="p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileNav />
    </div>
  );
}
