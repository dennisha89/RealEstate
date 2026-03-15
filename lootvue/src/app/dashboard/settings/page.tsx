"use client";

import { useState } from "react";
import {
  User, Target, Sliders, Bell, CreditCard, Shield, LogOut, Trash2,
  Crown, ChevronRight,
} from "lucide-react";
import { useUserProfileStore, type Strategy, type InvestorType } from "@/lib/stores/user-profile-store";
import { useBuyBoxStore } from "@/lib/stores/buybox-store";

// --- HELPERS ---
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const INVESTOR_LABELS: Record<InvestorType, string> = {
  first_time: "First-Time", growing: "Growing", experienced: "Experienced", professional: "Professional",
};
const STRATEGY_LABELS: Record<Strategy, string> = {
  cash_flow: "Cash Flow", appreciation: "Appreciation", both: "Balanced", brrrr: "BRRRR", unsure: "Unsure",
};
const PROP_TYPES: Record<string, string> = { sfr: "SFR", duplex: "Duplex", triplex: "Triplex", fourplex: "4-plex" };

export default function SettingsPage() {
  const profile = useUserProfileStore();
  const buyBox = useBuyBoxStore();

  const [notifs, setNotifs] = useState({ rateAlerts: true, dealAlerts: true, marketAlerts: false, weeklyDigest: true });
  const toggle = (k: keyof typeof notifs) => setNotifs((p) => ({ ...p, [k]: !p[k] }));
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "March 2026";

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-content-tertiary" />
          Account
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Settings</h1>
      </div>

      {/* Profile */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Profile
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Name</span>
            <span className="text-[13px] text-content-primary font-medium">
              {profile.name || "Investor"}
            </span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Email</span>
            <span className="text-[13px] text-content-disabled font-mono">investor@lootvue.com</span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Investor Type</span>
            <span className="badge-gold">{INVESTOR_LABELS[profile.investorType]}</span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Member Since</span>
            <span className="text-[13px] text-content-tertiary font-mono">{memberSince}</span>
          </div>
        </div>
      </section>

      {/* Investment Goals */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Investment Goals
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-content-secondary">Monthly Income Target</span>
              <span className="font-mono text-sm font-semibold text-content-primary">
                {fmt(profile.goalMonthlyIncome)}/mo
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={50000}
              step={500}
              value={profile.goalMonthlyIncome}
              onChange={(e) => profile.setGoalMonthlyIncome(parseInt(e.target.value))}
              className="w-full accent-gold h-1.5 bg-surface-muted rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-content-disabled font-mono mt-1">
              <span>$1,000</span>
              <span>$50,000</span>
            </div>
          </div>
          <div className="divider" />
          <div>
            <span className="text-[13px] text-content-secondary mb-2 block">Strategy</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(STRATEGY_LABELS) as [Strategy, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => profile.setStrategy(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    profile.strategy === key
                      ? "bg-gold-muted border-gold/30 text-gold-light"
                      : "bg-white/[0.02] border-white/[0.06] text-content-secondary hover:bg-white/[0.04]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Buy Box */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5" /> Buy Box
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Price Range</span>
            <span className="font-mono text-xs text-content-primary">
              {fmt(buyBox.criteria.minPrice)} - {fmt(buyBox.criteria.maxPrice)}
            </span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Property Types</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {buyBox.criteria.propertyTypes.length > 0
                ? buyBox.criteria.propertyTypes.map((t) => (
                    <span key={t} className="badge-gold">{PROP_TYPES[t] ?? t}</span>
                  ))
                : <span className="text-xs text-content-disabled">Any</span>
              }
            </div>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Target Markets</span>
            <span className="text-xs text-content-tertiary font-mono">
              {buyBox.criteria.targetMarkets.length > 0
                ? buyBox.criteria.targetMarkets.join(", ")
                : "Not set"}
            </span>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-secondary">Min Cap Rate</span>
            <span className="font-mono text-xs text-content-primary">{buyBox.criteria.minCapRate}%</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Bell className="w-3.5 h-3.5" /> Notifications
        </div>
        <div className="space-y-3">
          {([
            { key: "rateAlerts" as const, label: "Rate drop alerts", desc: "When rates hit your target" },
            { key: "dealAlerts" as const, label: "Deal alerts", desc: "Properties matching buy box" },
            { key: "marketAlerts" as const, label: "Market alerts", desc: "Changes in watched markets" },
            { key: "weeklyDigest" as const, label: "Weekly digest", desc: "Portfolio summary" },
          ]).map((n, i) => (
            <div key={n.key}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13px] text-content-primary">{n.label}</span>
                  <p className="text-[11px] text-content-disabled mt-0.5">{n.desc}</p>
                </div>
                <button
                  onClick={() => toggle(n.key)}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                    notifs[n.key] ? "bg-gold" : "bg-surface-muted"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    notifs[n.key] ? "left-[18px]" : "left-0.5"
                  }`} />
                </button>
              </div>
              {i < 3 && <div className="divider mt-3" />}
            </div>
          ))}
        </div>
      </section>

      {/* Billing */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5" /> Billing
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-content-secondary">Current Plan</span>
            <span className="badge-emerald flex items-center gap-1">
              <Crown className="w-3 h-3" /> Free
            </span>
          </div>
          <button className="btn-primary btn-sm">
            Upgrade <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Analyses This Month", value: "12 / 25" },
            { label: "Markets Watched", value: "3 / 5" },
            { label: "Pipeline Deals", value: "4 / 10" },
          ].map((u) => (
            <div key={u.label} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-1">{u.label}</div>
              <div className="font-mono text-sm font-semibold text-content-primary">{u.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="card">
        <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] mb-4 font-medium flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Account
        </div>
        <div className="space-y-2">
          {[
            { label: "Change password", icon: Shield, danger: false },
            { label: "Sign out", icon: LogOut, danger: false },
            { label: "Delete account", icon: Trash2, danger: true },
          ].map((a) => (
            <button key={a.label} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-[13px] ${
              a.danger ? "bg-rose-muted/30 hover:bg-rose-muted/50 text-rose-light" : "bg-white/[0.02] hover:bg-white/[0.04] text-content-secondary"
            }`}>
              <span className="flex items-center gap-2"><a.icon className="w-3.5 h-3.5" /> {a.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-content-disabled" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
