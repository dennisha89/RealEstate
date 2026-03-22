"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { CHART_COLORS } from "@/components/charts/ChartTheme";

interface ActionItem {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
}

interface StoryActionProps {
  intro?: string;
  recommendations?: string[];
  actions: ActionItem[];
  className?: string;
}

const VARIANT_CLASS: Record<ActionItem["variant"], string> = {
  primary: "btn-primary btn-sm inline-flex items-center gap-1.5",
  secondary: "btn-secondary btn-sm inline-flex items-center gap-1.5",
  ghost: "btn-ghost btn-sm inline-flex items-center gap-1.5",
};

export function StoryAction({
  intro = "Based on everything above:",
  recommendations = [],
  actions,
  className = "",
}: StoryActionProps) {
  return (
    <section
      role="region"
      aria-label="Recommended actions"
      className={`rounded-xl border p-5 ${className}`}
      style={{
        borderColor: `${CHART_COLORS.gold}26`,
        backgroundColor: `${CHART_COLORS.gold}08`,
      }}
    >
      <p className="text-[13px] font-semibold mb-3" style={{ color: CHART_COLORS.gold }}>
        {intro}
      </p>

      {recommendations.length > 0 && (
        <ul className="space-y-1.5 mb-4" aria-label="Recommendations">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-content-secondary">
              <span
                className="mt-px shrink-0 font-medium"
                style={{ color: CHART_COLORS.gold }}
                aria-hidden="true"
              >
                →
              </span>
              {rec}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link key={action.href + action.label} href={action.href}>
            <span className={VARIANT_CLASS[action.variant]}>
              {action.icon ?? (action.variant !== "ghost" && (
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              ))}
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
