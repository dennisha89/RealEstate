"use client";

import { Lightbulb, Code2 } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";

/**
 * ModeToggle — switches between Simple and Advanced dashboard modes.
 * Lives in the dashboard header bar.
 */
export function ModeToggle() {
  const appMode = useUIStore((state) => state.appMode);
  const setAppMode = useUIStore((state) => state.setAppMode);

  return (
    <div
      role="group"
      aria-label="Switch between simple and advanced mode"
      className="flex items-center h-8 p-0.5 bg-surface-secondary border border-surface-border rounded-lg"
    >
      <button
        onClick={() => setAppMode("simple")}
        aria-pressed={appMode === "simple"}
        className={[
          "flex items-center gap-1.5 px-2.5 h-full rounded-md text-[12px] font-medium transition-all duration-200",
          appMode === "simple"
            ? "bg-gold-muted text-gold-light"
            : "text-content-disabled hover:text-content-secondary",
        ].join(" ")}
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Simple</span>
      </button>

      <button
        onClick={() => setAppMode("advanced")}
        aria-pressed={appMode === "advanced"}
        className={[
          "flex items-center gap-1.5 px-2.5 h-full rounded-md text-[12px] font-medium transition-all duration-200",
          appMode === "advanced"
            ? "bg-gold-muted text-gold-light"
            : "text-content-disabled hover:text-content-secondary",
        ].join(" ")}
      >
        <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Advanced</span>
      </button>
    </div>
  );
}
