"use client";

import { useState } from "react";
import Link from "next/link";
import { DoorOpen, Plus, Clock, Eye, MessageSquare, Users, ChevronRight } from "lucide-react";
import { useDealRoomStore } from "@/lib/stores/deal-room-store";
import { formatCurrency } from "@/lib/utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(n: number) {
  if (n >= 75) return "text-emerald-light";
  if (n >= 55) return "text-amber-light";
  return "text-rose-light";
}

function verdictBadge(v: "BUY" | "PASS") {
  return v === "BUY" ? "badge-emerald" : "badge-rose";
}

function statusBadge(s: "active" | "closed" | "archived") {
  if (s === "active") return "badge-emerald";
  if (s === "closed") return "badge-amber";
  return "badge-rose";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealRoomPage() {
  const rooms = useDealRoomStore((s) => s.rooms);
  const [_tab, _setTab] = useState<"all" | "active">("all");

  const sorted = [...rooms].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalViews = rooms.reduce((sum, r) => sum + r.viewCount, 0);
  const activeCount = rooms.filter((r) => r.status === "active").length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="section-label flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Marketplace
          </div>
          <h1 className="text-lg font-semibold text-content-primary mt-1">Deal Rooms</h1>
          <p className="text-xs text-content-tertiary mt-0.5">
            Share analyses with partners, investors, or lenders via a private link.
          </p>
        </div>
        <button className="btn-primary btn-sm" disabled title="Rooms are created from the Analyze page">
          <Plus className="w-3.5 h-3.5" />
          Create Room
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Rooms", value: rooms.length.toString() },
          { label: "Active", value: activeCount.toString() },
          { label: "Total Views", value: totalViews.toString() },
        ].map((s) => (
          <div key={s.label} className="card-glass !p-3">
            <div className="metric-label mb-1">{s.label}</div>
            <div className="font-mono text-lg font-bold text-content-primary">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sorted.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center">
            <DoorOpen className="w-6 h-6 text-content-disabled" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-content-secondary">No deal rooms yet</p>
            <p className="text-xs text-content-tertiary mt-1 max-w-[260px]">
              Analyze a property and click &ldquo;Share Deal Room&rdquo; to create your first room.
            </p>
          </div>
        </div>
      )}

      {/* Room List */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] text-content-disabled uppercase tracking-[0.1em] font-medium flex items-center gap-2">
            <DoorOpen className="w-3.5 h-3.5" />
            Your Rooms
          </div>

          {sorted.map((room) => {
            const { analysis } = room;
            return (
              <div key={room.id} className="card hover:bg-surface-elevated transition-colors">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-content-primary truncate max-w-[200px]">
                        {room.title}
                      </span>
                      <span className={statusBadge(room.status)}>{room.status}</span>
                    </div>
                    <p className="text-xs text-content-secondary mt-0.5 truncate">{analysis.address}</p>
                  </div>
                  {/* Score + verdict */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-sm font-bold ${scoreColor(analysis.score)}`}>
                      {analysis.score}
                    </span>
                    <span className={verdictBadge(analysis.verdict)}>{analysis.verdict}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-[11px] text-content-disabled mb-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {room.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {room.comments.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {room.interests.length}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {timeAgo(room.createdAt)}
                  </span>
                </div>

                {/* Key metrics */}
                <div className="flex items-center gap-4 text-xs text-content-tertiary border-t border-surface-border pt-2.5">
                  <span>
                    Cap{" "}
                    <span className="font-mono text-content-secondary">
                      {analysis.capRate.toFixed(1)}%
                    </span>
                  </span>
                  <span>
                    CF{" "}
                    <span className={`font-mono ${analysis.monthlyCashFlow >= 0 ? "text-emerald-light" : "text-rose-light"}`}>
                      {formatCurrency(analysis.monthlyCashFlow)}/mo
                    </span>
                  </span>
                  <span>
                    DSCR{" "}
                    <span className="font-mono text-content-secondary">
                      {analysis.dscr.toFixed(2)}x
                    </span>
                  </span>
                  <Link
                    href={`/dashboard/deal-room/${room.token}`}
                    className="ml-auto flex items-center gap-1 text-[11px] text-gold-light hover:text-gold-bright transition-colors font-medium"
                  >
                    Open
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
