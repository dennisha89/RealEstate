type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-money-900/50 text-money-400 border-money-700/50",
  warning: "bg-gold-900/50 text-gold-400 border-gold-700/50",
  danger: "bg-red-900/50 text-red-400 border-red-700/50",
  info: "bg-blue-900/50 text-blue-400 border-blue-700/50",
  neutral: "bg-gray-800/50 text-gray-400 border-gray-700/50",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export default function Badge({ children, variant = "neutral", size = "sm" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
}
