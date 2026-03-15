"use client";

import { useState } from "react";
import {
  Wallet, Target, Users, MessageSquare, TrendingUp, MapPin, Building2,
  DollarSign, Clock, Award, ChevronRight,
} from "lucide-react";
import { useCapitalStore } from "@/lib/stores/capital-store";
import { MOCK_CAPITAL_POSTS } from "@/lib/mock/capital-data";
import { formatCurrency, formatCompact } from "@/lib/utils/format";
import type { CapitalPost } from "@/lib/types/marketplace";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterType = "all" | CapitalPost["type"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function typeBadge(type: CapitalPost["type"]) {
  switch (type) {
    case "seeking_equity": return { cls: "badge-amber", label: "Seeking Equity" };
    case "offering_equity": return { cls: "badge-emerald", label: "Offering Equity" };
    case "seeking_debt": return { cls: "badge-rose", label: "Seeking Debt" };
    case "jv_partner": return { cls: "badge-gold", label: "JV Partner" };
  }
}

function statusBadge(status: CapitalPost["status"]) {
  switch (status) {
    case "open": return { cls: "badge-emerald", label: "Open" };
    case "in_discussion": return { cls: "badge-amber", label: "In Discussion" };
    case "funded": return { cls: "badge-gold", label: "Funded" };
    case "closed": return { cls: "badge-rose", label: "Closed" };
  }
}

function oracleColor(accuracy: number) {
  if (accuracy >= 75) return "text-emerald-light";
  if (accuracy >= 50) return "text-amber-light";
  return "text-rose-light";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: CapitalPost }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { submitInquiry } = useCapitalStore();
  const type = typeBadge(post.type);
  const status = statusBadge(post.status);

  function handleSubmit() {
    if (!message.trim()) return;
    submitInquiry(post.id, "You", message.trim());
    setMessage("");
    setOpen(false);
  }

  return (
    <div className="card space-y-3">
      {/* Top row: badges + status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={type.cls}>{type.label}</span>
        <span className={status.cls}>{status.label}</span>
      </div>

      {/* Title + description */}
      <div>
        <p className="text-base font-semibold text-content-primary leading-snug">{post.title}</p>
        <p className="text-xs text-content-secondary mt-1 line-clamp-3 leading-relaxed">
          {post.description}
        </p>
      </div>

      {/* Location + property + hold metadata */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-content-tertiary">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {post.market}, {post.state}
        </span>
        <span className="text-surface-border">|</span>
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3 shrink-0" />
          {post.propertyType.toUpperCase()}
        </span>
        {post.holdPeriod && (
          <>
            <span className="text-surface-border">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              {post.holdPeriod}
            </span>
          </>
        )}
      </div>

      {/* Metric chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Deal Size
          </div>
          <div className="font-mono text-sm font-semibold text-content-primary">
            {formatCurrency(post.dealSize)}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Equity
          </div>
          <div className="font-mono text-sm font-semibold text-content-primary">
            {post.equityNeeded ? formatCurrency(post.equityNeeded) : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Target Return
          </div>
          <div className="font-mono text-sm font-semibold text-content-primary">
            {post.targetReturn ?? "—"}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
          <div className="text-[10px] text-content-disabled uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <Award className="w-3 h-3" /> Oracle
          </div>
          {post.oracleAccuracy != null ? (
            <div className={`font-mono text-sm font-semibold ${oracleColor(post.oracleAccuracy)}`}>
              {post.oracleAccuracy}%
              <span className="text-[10px] text-content-disabled font-normal ml-1">
                ({post.totalPredictions ?? 0})
              </span>
            </div>
          ) : (
            <div className="font-mono text-sm text-content-disabled">Unverified</div>
          )}
        </div>
      </div>

      {/* Footer: poster + inquiries + CTA */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-surface-border">
        <div className="flex items-center gap-3 text-xs text-content-tertiary">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {post.postedBy}
          </span>
          <span className="text-surface-border">·</span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span className="font-mono">{post.inquiryCount}</span> {post.inquiryCount === 1 ? "inquiry" : "inquiries"}
          </span>
          <span className="text-surface-border">·</span>
          <span className="font-mono">{timeAgo(post.createdAt)}</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost btn-sm flex items-center gap-1 text-gold-light hover:text-gold"
        >
          Send Inquiry <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline inquiry form */}
      {open && (
        <div className="pt-1 space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and ask your question..."
            rows={3}
            className="input resize-none text-xs"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-ghost btn-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={!message.trim()} className="btn-primary btn-sm">
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Seeking Equity", value: "seeking_equity" },
  { label: "Offering Equity", value: "offering_equity" },
  { label: "Seeking Debt", value: "seeking_debt" },
  { label: "JV Partner", value: "jv_partner" },
];

export default function CapitalPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { posts: storePosts } = useCapitalStore();

  // Merge store + mock, deduplicate by id (store posts take precedence)
  const storeIds = new Set(storePosts.map((p) => p.id));
  const allPosts: CapitalPost[] = [
    ...storePosts,
    ...MOCK_CAPITAL_POSTS.filter((p) => !storeIds.has(p.id)),
  ];

  const filtered = filter === "all" ? allPosts : allPosts.filter((p) => p.type === filter);
  const openPosts = allPosts.filter((p) => p.status === "open");
  const totalDealSize = openPosts.reduce((sum, p) => sum + p.dealSize, 0);
  const withOracle = allPosts.filter((p) => p.oracleAccuracy != null);
  const avgOracle =
    withOracle.length > 0
      ? Math.round(withOracle.reduce((s, p) => s + (p.oracleAccuracy ?? 0), 0) / withOracle.length)
      : null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="section-label flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5" /> Marketplace
        </div>
        <h1 className="text-lg font-semibold text-content-primary mt-1">Capital Partners</h1>
        <p className="text-[13px] text-content-tertiary mt-0.5">
          Find equity partners, JV opportunities, and co-investment deals.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-glass">
          <div className="metric-label mb-1.5 flex items-center gap-1.5">
            <Target className="w-3 h-3" /> Open Opportunities
          </div>
          <div className="metric-value text-xl">{openPosts.length}</div>
          <div className="text-xs text-content-tertiary mt-1 font-mono">active listings</div>
        </div>
        <div className="card-glass">
          <div className="metric-label mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" /> Total Deal Size
          </div>
          <div className="metric-value text-xl">${formatCompact(totalDealSize)}</div>
          <div className="text-xs text-content-tertiary mt-1 font-mono">across open posts</div>
        </div>
        <div className="card-glass">
          <div className="metric-label mb-1.5 flex items-center gap-1.5">
            <Award className="w-3 h-3" /> Avg Oracle Accuracy
          </div>
          {avgOracle != null ? (
            <>
              <div className={`metric-value text-xl ${oracleColor(avgOracle)}`}>{avgOracle}%</div>
              <div className="text-xs text-content-tertiary mt-1 font-mono">
                {withOracle.length} verified posters
              </div>
            </>
          ) : (
            <div className="metric-value text-xl text-content-disabled">—</div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={
              filter === tab.value
                ? "badge-gold btn btn-sm px-3 py-1 text-xs font-medium rounded-lg"
                : "btn-ghost btn-sm text-xs"
            }
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1 font-mono text-[10px] text-content-disabled">
                {allPosts.filter((p) => p.type === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <Wallet className="w-8 h-8 text-content-disabled mb-3" />
          <p className="text-sm text-content-tertiary">No posts match this filter.</p>
          <button onClick={() => setFilter("all")} className="btn-ghost btn-sm mt-3">
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
