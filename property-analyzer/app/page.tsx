import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Shield,
  BarChart3,
  ArrowRight,
  Zap,
  Target,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-surface">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-money-950/50 via-surface to-surface" />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-money-900/40 border border-money-800/50 mb-8">
              <Zap className="h-3.5 w-3.5 text-money-400" />
              <span className="text-xs font-medium text-money-400">
                AI-Powered Investment Analysis
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-6 leading-tight">
              Make smarter{" "}
              <span className="text-money-gradient">real estate</span>{" "}
              investments
            </h1>

            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Analyze any property in seconds. Get AI-powered deal grades, financial
              projections, risk assessments, and market intelligence — all from
              one address.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-money-600 hover:bg-money-500 text-white font-semibold rounded-lg transition-all active:scale-[0.98] glow-green"
              >
                Start Analyzing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-surface-elevated hover:bg-surface-muted text-gray-300 font-medium rounded-lg border border-surface-border transition-all"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">
            Everything you need to evaluate deals
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            22 analysis engines, 11 data sources, and AI-powered scoring — condensed into one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: DollarSign,
              title: "Financial Analysis",
              description: "Cap rate, cash-on-cash, DSCR, cash flow projections with 3-scenario stress testing.",
              color: "money",
            },
            {
              icon: BarChart3,
              title: "Market Intelligence",
              description: "8-dimension market analysis — demographics, economics, infrastructure, and more.",
              color: "blue",
            },
            {
              icon: Shield,
              title: "Risk Assessment",
              description: "7-dimension risk scoring with climate, regulatory, and market risk factors.",
              color: "gold",
            },
            {
              icon: Target,
              title: "Deal Scanner",
              description: "AI-ranked investment opportunities across your target markets, sorted by grade.",
              color: "money",
            },
            {
              icon: TrendingUp,
              title: "Appreciation Forecasts",
              description: "1/3/5-year price predictions with confidence intervals and KPI drivers.",
              color: "blue",
            },
            {
              icon: Zap,
              title: "AI Deal Grades",
              description: "Composite A+ to D grading based on all financial, market, and risk factors.",
              color: "gold",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-surface-card border border-surface-border rounded-xl p-6 hover:border-surface-muted transition-all group"
            >
              <div className={`inline-flex p-3 rounded-lg mb-4 ${
                feature.color === "money" ? "bg-money-900/40" :
                feature.color === "blue" ? "bg-blue-900/40" :
                "bg-gold-900/40"
              }`}>
                <feature.icon className={`h-5 w-5 ${
                  feature.color === "money" ? "text-money-500" :
                  feature.color === "blue" ? "text-blue-500" :
                  "text-gold-500"
                }`} />
              </div>
              <h3 className="text-base font-semibold text-gray-200 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-money-950 to-surface-card border border-money-900/50 rounded-2xl p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Ready to find your next deal?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Enter any US property address and get a comprehensive investment analysis in under 60 seconds.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-8 py-4 bg-money-600 hover:bg-money-500 text-white font-semibold rounded-lg transition-all active:scale-[0.98] glow-green text-lg"
          >
            Analyze a Property
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
