"use client";

import {
  MapPin, Footprints, GraduationCap, ShieldCheck, Briefcase,
  TrendingUp, TrendingDown, ArrowRight, Building2,
} from "lucide-react";
import { Term } from "@/components/shared/Term";
import { CHART_COLORS, seededRandom } from "@/components/charts/ChartTheme";
import { formatNumber } from "@/lib/utils/format";
import type { AnalysisResult } from "./_components";

// ─── Types ────────────────────────────────────────────────────────────────────

interface School {
  level: "Elementary" | "Middle" | "High";
  name: string;
  rating: number;
}

interface Employer {
  name: string;
  distanceMi: number;
  employees: number;
}

interface NeighborhoodData {
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  schools: School[];
  crimeChange3yr: number;
  topEmployers: Employer[];
  avgCommuteMins: number;
  rentGrowthYoY: number;
  appreciation: { yr1: number; yr3: number; yr5: number };
}

// ─── Seeded data ──────────────────────────────────────────────────────────────

const STREETS  = ["Riverside", "Oakwood", "Maple", "Lincoln", "Jefferson", "Summit", "Valley", "Highland"];
const EMPLOYER_NAMES = [
  ["Amazon", "Boeing", "HCA Healthcare", "Tesla", "JPMorgan"],
  ["Deloitte", "State Farm", "Oracle", "FedEx", "Vanderbilt Univ."],
  ["HQ Regional Medical", "City Government", "AutoNation", "UPS", "Marriott"],
  ["Walmart Distribution", "Nissan Plant", "Cigna", "Comcast", "AT&T"],
  ["Community Bank", "Tyson Foods", "Dollar General HQ", "Ingram Micro", "Aramark"],
];

function buildNeighborhoodData(address: string): NeighborhoodData {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = ((h << 5) - h + address.charCodeAt(i)) | 0;
  const rng = seededRandom(Math.abs(h));
  const r = () => rng();

  return {
    walkScore:    Math.round(45 + r() * 50),
    transitScore: Math.round(30 + r() * 55),
    bikeScore:    Math.round(25 + r() * 60),
    schools: [
      { level: "Elementary", name: `${STREETS[Math.floor(r() * STREETS.length)]} Elementary`, rating: Math.round(5 + r() * 5) },
      { level: "Middle",     name: `${STREETS[Math.floor(r() * STREETS.length)]} Middle`,     rating: Math.round(4 + r() * 6) },
      { level: "High",       name: `${STREETS[Math.floor(r() * STREETS.length)]} High`,       rating: Math.round(4 + r() * 6) },
    ],
    crimeChange3yr: Math.round((-20 + r() * 35) * 10) / 10,
    topEmployers: EMPLOYER_NAMES.map((names) => ({
      name:       names[Math.floor(r() * names.length)]!,
      distanceMi: Math.round((1.5 + r() * 12) * 10) / 10,
      employees:  Math.round(500 + r() * 14000),
    })),
    avgCommuteMins: Math.round(18 + r() * 24),
    rentGrowthYoY:  Math.round((2.5 + r() * 9) * 10) / 10,
    appreciation: {
      yr1: Math.round((1 + r() * 9) * 10) / 10,
      yr3: Math.round((8 + r() * 22) * 10) / 10,
      yr5: Math.round((16 + r() * 42) * 10) / 10,
    },
  };
}

// ─── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const deg = (score / 100) * 360;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative w-16 h-16 rounded-full"
        style={{ background: `conic-gradient(${color} 0deg ${deg}deg, #1A1A1A ${deg}deg 360deg)` }}
        role="img"
        aria-label={`${label}: ${score} out of 100`}
      >
        <div className="absolute inset-1.5 rounded-full bg-surface-card flex items-center justify-center">
          <span className="font-mono text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] text-content-tertiary uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── School row ───────────────────────────────────────────────────────────────

function SchoolRow({ school }: { school: School }) {
  const color = school.rating >= 8 ? CHART_COLORS.emerald : school.rating >= 6 ? CHART_COLORS.amber : CHART_COLORS.rose;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] text-content-secondary truncate">{school.name}</p>
        <p className="text-[10px] text-content-disabled">{school.level}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-20 h-1.5 bg-surface-elevated rounded-full overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${school.rating * 10}%`, backgroundColor: color }} />
        </div>
        <span className="font-mono text-[13px] font-bold tabular-nums w-10 text-right" style={{ color }}>
          {school.rating}<span className="text-content-disabled text-[10px] font-normal">/10</span>
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NeighborhoodTab({ result }: { result: AnalysisResult }) {
  const d = buildNeighborhoodData(result.address);

  const walkColor  = d.walkScore >= 70 ? CHART_COLORS.emerald : d.walkScore >= 50 ? CHART_COLORS.amber : CHART_COLORS.rose;
  const walkLabel  = d.walkScore >= 90 ? "Walker's Paradise" : d.walkScore >= 70 ? "Very Walkable" : d.walkScore >= 50 ? "Somewhat Walkable" : "Car-Dependent";
  const crimeGood  = d.crimeChange3yr < 0;
  const aprColor   = (v: number) => v >= 5 ? "text-emerald-light" : v >= 2 ? "text-amber-light" : "text-rose-light";
  const annualAppreciation = Math.round(350000 * d.appreciation.yr1 / 100);

  return (
    <div className="space-y-4">

      {/* Walk / Transit / Bike */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-4">
          <Footprints className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Location Scores
        </div>
        <div className="flex flex-wrap items-start gap-6">
          <ScoreGauge score={d.walkScore}    label="Walk"    color={walkColor} />
          <ScoreGauge score={d.transitScore} label="Transit" color={CHART_COLORS.gold} />
          <ScoreGauge score={d.bikeScore}    label="Bike"    color={CHART_COLORS.textSecondary} />
          <div className="flex-1 min-w-[180px]">
            <p className="text-[13px] text-content-primary font-semibold mb-1">
              <Term id="walk-score" value={d.walkScore}>{d.walkScore} — {walkLabel}</Term>
            </p>
            <p className="text-[12px] text-content-secondary leading-relaxed">
              Walkable neighborhoods command{" "}
              <span className="text-emerald-light font-semibold">10–15% rent premiums</span>{" "}
              — tenants save $400–800/mo on car costs and pay for the convenience.
            </p>
            <p className="text-[11px] text-content-tertiary mt-2">
              Avg commute: <span className="font-mono text-content-primary tabular-nums">{d.avgCommuteMins} min</span>
              {d.avgCommuteMins <= 27 ? " — at or below national avg" : " — above national avg (27 min)"}
            </p>
          </div>
        </div>
      </div>

      {/* Schools */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <GraduationCap className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          School Ratings
          <span className="text-[10px] text-content-disabled ml-auto">GreatSchools · Demo</span>
        </div>
        <div className="space-y-3">
          {d.schools.map((s) => <SchoolRow key={s.level} school={s} />)}
        </div>
        <p className="text-[11px] text-content-tertiary mt-3 pt-3 border-t border-surface-border">
          Above-average schools drive tenant stability — families sign 2+ year leases to lock in school zones.
        </p>
      </div>

      {/* Crime + Rent Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="section-label flex items-center gap-2 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Crime Trend (3yr)
          </div>
          <div className="flex items-center gap-3 mb-2">
            {crimeGood
              ? <TrendingDown className="w-4 h-4 text-emerald-light" aria-label="Declining crime" />
              : <TrendingUp   className="w-4 h-4 text-rose-light"    aria-label="Rising crime" />}
            <span className={`font-mono text-xl font-bold tabular-nums ${crimeGood ? "text-emerald-light" : "text-rose-light"}`}>
              {crimeGood ? "" : "+"}{d.crimeChange3yr}%
            </span>
          </div>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            {crimeGood
              ? `Crime down ${Math.abs(d.crimeChange3yr)}% over 3 years — gentrification signal. Rising property values and tenant quality typically follow.`
              : `Crime up ${d.crimeChange3yr}% over 3 years. Factor this into vacancy assumptions and insurance premiums.`}
          </p>
        </div>

        <div className="card">
          <div className="section-label flex items-center gap-2 mb-3">
            <ArrowRight className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
            Rent Growth Velocity
          </div>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-light" aria-hidden="true" />
            <span className="font-mono text-xl font-bold tabular-nums text-emerald-light">
              +{d.rentGrowthYoY}% YoY
            </span>
          </div>
          <p className="text-[12px] text-content-secondary leading-relaxed">
            Rents in this ZIP growing at <span className="font-mono text-content-primary">{d.rentGrowthYoY}%/yr</span>.
            Your{" "}
            <Term id="cap-rate">cash flow grows automatically</Term>{" "}
            without doing anything — that's the power of rent growth compounding.
          </p>
        </div>
      </div>

      {/* Top Employers */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <Briefcase className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          Top Employers Within 15 Miles
          <span className="text-[10px] text-content-disabled ml-auto">BLS · Demo</span>
        </div>
        <div className="space-y-1.5">
          {d.topEmployers.map((emp, i) => (
            <div
              key={emp.name}
              className="flex items-center justify-between gap-3 py-2 border-b border-surface-border/40 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-content-disabled w-4 shrink-0">{i + 1}</span>
                <Building2 className="w-3.5 h-3.5 text-content-tertiary shrink-0" aria-hidden="true" />
                <span className="text-[13px] text-content-primary truncate">{emp.name}</span>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-content-disabled">Distance</p>
                  <p className="font-mono text-[12px] text-content-secondary tabular-nums">{emp.distanceMi} mi</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-content-disabled">Employees</p>
                  <p className="font-mono text-[12px] text-content-primary font-semibold tabular-nums">{formatNumber(emp.employees)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-content-tertiary mt-3">
          Anchor employers drive sustained rental demand. Workers within 15mi are your primary tenant pool.
        </p>
      </div>

      {/* Appreciation History */}
      <div className="card">
        <div className="section-label flex items-center gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-gold" aria-hidden="true" />
          ZIP Appreciation History
        </div>
        <div className="grid grid-cols-3 gap-3">
          {([["1yr", d.appreciation.yr1, 1], ["3yr", d.appreciation.yr3, 3], ["5yr", d.appreciation.yr5, 5]] as [string, number, number][]).map(([label, val, yrs]) => (
            <div key={label} className="card-glass !p-3 text-center">
              <p className="metric-label mb-1">{label}</p>
              <p className={`font-mono text-lg font-bold tabular-nums ${aprColor(val / yrs)}`}>+{val}%</p>
              <p className="text-[10px] text-content-disabled">total · {(val / yrs).toFixed(1)}%/yr</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-content-tertiary mt-3">
          <Term id="appreciation">Appreciation</Term> builds equity you never worked for. At{" "}
          <span className="font-mono text-content-primary tabular-nums">{d.appreciation.yr1}%/yr</span>,
          a $350K property gains{" "}
          <span className="text-emerald-light font-mono tabular-nums">${formatNumber(annualAppreciation)}</span>{" "}
          in value this year alone — before a single rent payment.
        </p>
      </div>

    </div>
  );
}
