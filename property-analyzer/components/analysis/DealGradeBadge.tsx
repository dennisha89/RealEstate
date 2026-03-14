interface DealGradeBadgeProps {
  grade: string;
  score?: number;
  size?: "sm" | "md" | "lg";
}

function gradeColors(grade: string) {
  if (grade === "A+" || grade === "A") return { bg: "bg-money-900/60", text: "text-money-400", border: "border-money-700/50", glow: "glow-green" };
  if (grade === "A-" || grade === "B+") return { bg: "bg-money-900/40", text: "text-money-500", border: "border-money-800/40", glow: "" };
  if (grade === "B" || grade === "B-") return { bg: "bg-gold-900/40", text: "text-gold-400", border: "border-gold-700/40", glow: "glow-gold" };
  if (grade === "C+" || grade === "C") return { bg: "bg-gold-900/30", text: "text-gold-500", border: "border-gold-800/40", glow: "" };
  return { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-700/40", glow: "glow-red" };
}

const sizeStyles = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
};

export default function DealGradeBadge({ grade, score, size = "md" }: DealGradeBadgeProps) {
  const colors = gradeColors(grade);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeStyles[size]} ${colors.bg} ${colors.border} ${colors.glow} border rounded-xl flex items-center justify-center font-bold ${colors.text}`}
      >
        {grade}
      </div>
      {score !== undefined && (
        <div>
          <p className={`text-lg font-bold ${colors.text}`}>{score}/100</p>
          <p className="text-xs text-gray-500">AI Score</p>
        </div>
      )}
    </div>
  );
}
