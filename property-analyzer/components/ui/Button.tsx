"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-money-600 hover:bg-money-500 text-white border-money-600 hover:border-money-500 glow-green",
  secondary:
    "bg-surface-elevated hover:bg-surface-muted text-gray-200 border-surface-border",
  ghost:
    "bg-transparent hover:bg-surface-elevated text-gray-300 border-transparent",
  danger:
    "bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/40",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all duration-150
          ${variantStyles[variant]} ${sizeStyles[size]}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"}
          ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
