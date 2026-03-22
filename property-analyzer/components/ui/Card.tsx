interface CardProps {
  children: React.ReactNode;
  header?: string;
  className?: string;
  glow?: "green" | "gold" | "red";
}

const glowStyles = {
  green: "glow-green",
  gold: "glow-gold",
  red: "glow-red",
};

export default function Card({ children, header, className = "", glow }: CardProps) {
  return (
    <div
      className={`bg-surface-card border border-surface-border rounded-xl ${glow ? glowStyles[glow] : ""} ${className}`}
    >
      {header && (
        <div className="px-6 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {header}
          </h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
