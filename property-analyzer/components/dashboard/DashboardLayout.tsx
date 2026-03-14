"use client";

import Sidebar from "./Sidebar";
import HeaderBar from "./HeaderBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="ml-60 transition-all duration-200">
        <HeaderBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
