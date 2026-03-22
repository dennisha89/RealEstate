import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

type Trend = "up" | "down" | "flat";
type MetricColor = "green" | "red" | "gold" | "blue" | "gray";

interface MetricCardProps {
  label: string;
  value: string;
  trend?: Trend;
  trendValue?: string;
  color?: MetricColor;
  icon?: LucideIcon;
}

const colorMap: Record<MetricColor, { bg: string; text: string; icon: string }> = {
  green: { bg: "bg-money-900/40", text: "text-money-400", icon: "text-money-500" },
  red: { bg: "bg-red-900/40", text: "text-red-400", icon: "text-red-500" },
  gold: { bg: "bg-gold-900/40", text: "text-gold-400", icon: "text-gold-500" },
  blue: { bg: "bg-blue-900/40", text: "text-blue-400", icon: "text-blue-500" },
  gray: { bg: "bg-gray-800/40", text: "text-gray-400", icon: "text-gray-500" },
};

const trendIcons: Record<Trend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors: Record<Trend, string> = {
  up: "text-money-400",
  down: "text-red-400",
  flat: "text-gray-400",
};

export default function MetricCard({
  label,
  value,
  trend,
  trendValue,
  color = "green",
  icon: Icon,
}: MetricCardProps) {
  const colors = colorMap[color];
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-surface-muted transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
          {trend && trendValue && TrendIcon && (
            <div className={`flex items-center gap-1 mt-2 ${trendColors[trend]}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${colors.bg} p-2.5 rounded-lg`}>
            <Icon className={`h-5 w-5 ${colors.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}
