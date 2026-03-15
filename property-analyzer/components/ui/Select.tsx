"use client";

import { ChevronDown } from "lucide-react";

interface SelectProps {
  id: string;
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = "",
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-gray-400 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 pr-8 text-sm text-gray-200 appearance-none focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors disabled:opacity-50"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
}
