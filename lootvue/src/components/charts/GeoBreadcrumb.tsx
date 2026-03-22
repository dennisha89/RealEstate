"use client";

import { ChevronRight, Globe, MapPin, RotateCcw } from "lucide-react";
import { useGeography } from "@/lib/hooks/useGeography";
import type { GeoLevel, GeoBreadcrumb } from "@/lib/hooks/useGeography";

// ─── Icon selection ────────────────────────────────────────────────────────────

function GeoIcon({ level }: { level: GeoLevel }) {
  if (level === "national") {
    return (
      <Globe
        className="w-3 h-3 flex-shrink-0"
        aria-hidden="true"
      />
    );
  }
  return (
    <MapPin
      className="w-3 h-3 flex-shrink-0"
      aria-hidden="true"
    />
  );
}

// ─── Single crumb ──────────────────────────────────────────────────────────────

interface CrumbProps {
  crumb: GeoBreadcrumb;
  isLast: boolean;
  onClick: () => void;
}

function Crumb({ crumb, isLast, onClick }: CrumbProps) {
  if (isLast) {
    // Current level — highlighted gold, not interactive
    return (
      <span
        className="flex items-center gap-1 text-gold font-medium"
        aria-current="page"
      >
        <GeoIcon level={crumb.level} />
        <span>{crumb.label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1",
        "text-content-secondary hover:text-content-primary",
        "transition-colors duration-150",
        "rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50",
        "cursor-pointer",
      ].join(" ")}
      aria-label={`Go back to ${crumb.label}`}
    >
      <GeoIcon level={crumb.level} />
      <span>{crumb.label}</span>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface GeoBreadcrumbProps {
  /** Additional Tailwind classes for the outer wrapper. */
  className?: string;
}

/**
 * GeoBreadcrumb — geography drill-down navigation bar.
 *
 * Reads from and writes to the shared useGeographyStore so every chart on
 * the page reacts automatically when the user navigates levels.
 *
 * Compact single-row layout:
 *   [Globe] National  >  [Pin] Texas  >  [Pin] Austin  >  [Pin] 78745  [Reset]
 */
export function GeoBreadcrumb({ className }: GeoBreadcrumbProps) {
  const { breadcrumbs, level, goToLevel, reset } = useGeography();

  // Don't render at national level — nothing to navigate back to
  const showReset = level !== "national";

  return (
    <nav
      aria-label="Geographic drill-down navigation"
      className={[
        "flex items-center gap-1.5",
        "bg-surface-elevated border border-surface-border rounded-lg px-3 py-2",
        "text-[12px] overflow-x-auto",
        "scrollbar-none",
        className ?? "",
      ].join(" ")}
    >
      <ol
        className="flex items-center gap-1 min-w-0"
        aria-label="Current geography selection"
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.level} className="flex items-center gap-1 min-w-0">
              {index > 0 && (
                <ChevronRight
                  className="w-3 h-3 text-content-disabled flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              <Crumb
                crumb={crumb}
                isLast={isLast}
                onClick={() => goToLevel(crumb.level)}
              />
            </li>
          );
        })}
      </ol>

      {showReset && (
        <>
          {/* Spacer pushes reset to the right */}
          <span className="flex-1" aria-hidden="true" />

          <button
            type="button"
            onClick={reset}
            className={[
              "flex items-center gap-1 flex-shrink-0",
              "text-content-disabled hover:text-content-secondary",
              "transition-colors duration-150",
              "rounded px-1.5 py-0.5",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50",
              "border border-transparent hover:border-surface-border",
            ].join(" ")}
            aria-label="Reset geography to National view"
          >
            <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </>
      )}
    </nav>
  );
}
