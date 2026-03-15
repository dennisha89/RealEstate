/**
 * LootVue Logo Component
 *
 * The mark: A gem/diamond shape formed by intersecting chart lines —
 * representing "finding hidden gems through data analysis."
 * The gold gradient conveys wealth. The geometric precision conveys quant.
 */

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9A7B1A" />
          <stop offset="40%" stopColor="#C9A227" />
          <stop offset="70%" stopColor="#E8C547" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="gold-gradient-subtle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A227" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="20" cy="20" r="19" fill="url(#gold-gradient-subtle)" stroke="url(#gold-gradient)" strokeWidth="1" />
      {/* Diamond/gem shape — formed by converging lines like chart data forming a gem */}
      <path d="M20 6 L30 16 L20 34 L10 16 Z" fill="none" stroke="url(#gold-gradient)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Inner facet lines — suggesting data analysis / chart lines */}
      <path d="M10 16 L30 16" stroke="url(#gold-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      <path d="M20 6 L14 16" stroke="url(#gold-gradient)" strokeWidth="0.75" strokeOpacity="0.4" />
      <path d="M20 6 L26 16" stroke="url(#gold-gradient)" strokeWidth="0.75" strokeOpacity="0.4" />
      {/* Small dot at the top — the "find" / discovery point */}
      <circle cx="20" cy="6" r="1.5" fill="url(#gold-gradient)" />
    </svg>
  );
}

export function LogoFull({ size = 32, showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="font-display font-bold text-white tracking-[0.15em] text-sm">
          LOOTVUE
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ size = 24 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export default LogoFull;
