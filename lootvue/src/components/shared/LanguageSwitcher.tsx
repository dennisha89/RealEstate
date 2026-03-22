"use client";

/**
 * LanguageSwitcher — next-intl compatible language selector.
 *
 * Writes the `locale` cookie (read by src/i18n/request.ts on the server)
 * AND syncs the Zustand i18n store so that client components using
 * useTranslation() also update instantly without a page reload.
 * Calls router.refresh() so Server Components re-render in the new locale.
 *
 * Use this component in place of LanguageToggle wherever next-intl
 * useTranslations() is being adopted.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { useI18nStore } from "@/lib/i18n/useTranslation";
import type { Locale } from "@/lib/i18n/translations";

interface LocaleOption {
  code: Locale;
  /** English label shown as subtitle */
  label: string;
  /** Native script label shown as primary text */
  nativeLabel: string;
  /** Short badge shown on the trigger button */
  badge: string;
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { code: "en", label: "English",              nativeLabel: "English",     badge: "EN" },
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "中文（简体）",  badge: "ZH" },
  { code: "vi", label: "Vietnamese",           nativeLabel: "Tiếng Việt", badge: "VI" },
];

/** Write the locale cookie for next-intl server config. */
function setLocaleCookie(locale: Locale): void {
  document.cookie = `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

interface LanguageSwitcherProps {
  /** When true (default) shows only badge code. Set false for globe icon + label. */
  compact?: boolean;
  /** Alias for compact — accepts "sm" for compact mode. */
  size?: "sm" | "md";
}

export function LanguageSwitcher({ compact = true, size }: LanguageSwitcherProps) {
  // size="sm" is an alias for compact
  const _compact = size === "sm" ? true : compact;
  const router = useRouter();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // LOCALE_OPTIONS always has at least one entry (en), so fallback is safe.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentOption = (
    LOCALE_OPTIONS.find((o) => o.code === locale) ?? LOCALE_OPTIONS[0]
  )!;

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSelect(option: LocaleOption) {
    if (option.code === locale) {
      setOpen(false);
      return;
    }
    // 1. Update Zustand store — instant re-render for client components
    setLocale(option.code);
    // 2. Write cookie — next-intl server request config reads this
    setLocaleCookie(option.code);
    // 3. Re-run Server Components in the new locale
    router.refresh();
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${currentOption.nativeLabel}. Click to change.`}
        className={[
          "flex items-center gap-1 px-2 h-7 rounded-md text-[11px] font-medium transition-all duration-150 border",
          open
            ? "bg-gold/10 text-gold border-gold/30"
            : "bg-transparent text-content-tertiary border-white/[0.06] hover:text-content-primary hover:border-white/[0.12] hover:bg-white/[0.03]",
        ].join(" ")}
      >
        <span className="font-mono tracking-wide leading-none">
          {currentOption.badge}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className={[
            "absolute right-0 top-full mt-1.5 w-[204px] z-50",
            "bg-surface-card border border-surface-border rounded-xl shadow-2xl",
            "py-1",
          ].join(" ")}
        >
          {/* Section label */}
          <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest text-content-disabled font-medium select-none">
            Language
          </p>

          {LOCALE_OPTIONS.map((option) => {
            const isSelected = option.code === locale;
            return (
              <button
                key={option.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-100",
                  isSelected
                    ? "bg-gold/[0.08] text-gold"
                    : "text-content-secondary hover:bg-white/[0.04] hover:text-content-primary",
                ].join(" ")}
              >
                {/* Badge chip */}
                <span
                  className={[
                    "w-7 h-4 rounded text-[9px] font-bold font-mono flex items-center justify-center shrink-0",
                    isSelected
                      ? "bg-gold/20 text-gold"
                      : "bg-surface-elevated text-content-disabled",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {option.badge}
                </span>

                {/* Labels */}
                <div className="flex flex-col leading-none gap-0.5 flex-1 min-w-0">
                  <span className="text-[12px] font-medium truncate">
                    {option.nativeLabel}
                  </span>
                  <span className="text-[9px] text-content-disabled">
                    {option.label}
                  </span>
                </div>

                {isSelected && (
                  <Check
                    className="w-3 h-3 text-gold shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
