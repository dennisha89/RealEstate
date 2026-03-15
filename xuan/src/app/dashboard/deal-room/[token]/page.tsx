"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Eye, MessageSquare, Users, Send, Clock, UserCircle,
  Handshake, Search as SearchIcon, Glasses,
} from "lucide-react";
import Link from "next/link";
import { useDealRoomStore } from "@/lib/stores/deal-room-store";
import { formatCurrency } from "@/lib/utils/format";
import {
  MetricsGrid, CalculationChain, InstitutionalCard, StressTestCard,
  ExitCapTable, VerdictCard, scoreColor, scoreBg, verdictBadge,
  type AnalysisResult,
} from "../../analyze/_components";

// ─── Role helpers ─────────────────────────────────────────────────────────────

const roleIcon = {
  buyer: Handshake,
  partner: Users,
  lender: SearchIcon,
  observer: Glasses,
} as const;

const roleLabel = {
  buyer: "Buyer",
  partner: "Partner",
  lender: "Lender",
  observer: "Observer",
} as const;

type Role = keyof typeof roleIcon;

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const statusBadge = (s: string) =>
  s === "active" ? "badge-emerald" : s === "closed" ? "badge-rose" : "badge-gold";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealRoomDetailPage() {
  const { token } = useParams<{ token: string }>();

  const room         = useDealRoomStore((s) => s.rooms.find((r) => r.token === token));
  const addComment   = useDealRoomStore((s) => s.addComment);
  const expressInt   = useDealRoomStore((s) => s.expressInterest);
  const incViews     = useDealRoomStore((s) => s.incrementViews);

  // Collaboration state
  const [commentText, setCommentText]     = useState("");
  const [commentAuthor] = useState("Investor");
  const [interestRole, setInterestRole]   = useState<Role>("buyer");
  const [interestName]   = useState("Investor");
  const [interestMsg, setInterestMsg]     = useState("");

  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current || !room) return;
    viewedRef.current = true;
    incViews(token);
  }, [room, token, incViews]);

  if (!room) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card text-center max-w-sm w-full">
        <p className="text-4xl font-bold mb-3">404</p>
        <p className="text-content-secondary mb-4">Deal Room not found or the link has expired.</p>
        <Link href="/dashboard/deal-room" className="btn-primary btn-sm">Back to Deal Rooms</Link>
      </div>
    </div>
  );

  const r = room.analysis;

  const handleComment = () => {
    const t = commentText.trim();
    if (!t) return;
    addComment(token, commentAuthor || "Anonymous", t);
    setCommentText("");
  };
  const handleInterest = () => {
    expressInt(token, { name: interestName || "Anonymous", role: interestRole, message: interestMsg.trim() || undefined });
    setInterestMsg("");
  };

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6">

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══ Left: Analysis (2/3) ═══ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Back nav */}
          <Link
            href="/dashboard/deal-room"
            className="inline-flex items-center gap-1.5 text-sm text-content-tertiary hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Deal Rooms
          </Link>

          {/* Header card */}
          <div className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-content-primary leading-snug">{room.title}</h1>
                <p className="text-xs text-content-disabled mt-0.5 font-mono">{token}</p>
              </div>
              <span className={`${statusBadge(room.status)} capitalize`}>{room.status}</span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-content-tertiary">
              {([
                [Eye, `${room.viewCount} views`],
                [MessageSquare, `${room.comments.length} comments`],
                [Users, `${room.interests.length} interested`],
                [Clock, `Created ${relativeTime(room.createdAt)}`],
              ] as [React.ElementType, string][]).map(([Icon, label]) => (
                <span key={label} className="inline-flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5" />{label}
                </span>
              ))}
            </div>
          </div>

          {/* Property summary */}
          <div className="card-glass flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-content-primary">{r.address}</p>
              <p className="text-xs text-content-tertiary mt-0.5">
                {r.beds} bd · {r.baths} ba · {r.sqft.toLocaleString()} sqft · {r.yearBuilt}
              </p>
            </div>
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${scoreBg(r.score)}`}>
              <span className={`font-mono text-2xl font-bold tabular-nums ${scoreColor(r.score)}`}>
                {r.score}
              </span>
              <span className={`${verdictBadge(r.verdict)} text-sm font-semibold`}>{r.verdict}</span>
            </div>
          </div>

          {/* Core analysis components */}
          <MetricsGrid r={r} />
          <CalculationChain r={r} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InstitutionalCard inst={r.institutional} />
            <StressTestCard stress={r.stress} />
          </div>

          <ExitCapTable sens={r.institutional.exitCapRateSensitivity} />
          <VerdictCard r={r} />
        </div>

        {/* ═══ Right: Collaboration sidebar (1/3) ═══ */}
        <div className="lg:col-span-1 space-y-4">

          {/* Interest section */}
          <div className="card space-y-3">
            <div className="section-label flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Express Interest
            </div>

            <select
              value={interestRole}
              onChange={(e) => setInterestRole(e.target.value as Role)}
              className="input text-sm"
            >
              {(Object.keys(roleLabel) as Role[]).map((k) => (
                <option key={k} value={k}>{roleLabel[k]}</option>
              ))}
            </select>

            <textarea
              rows={2}
              placeholder="Optional message..."
              value={interestMsg}
              onChange={(e) => setInterestMsg(e.target.value)}
              className="input text-sm resize-none"
            />

            <button onClick={handleInterest} className="btn-primary w-full btn-sm">
              Express Interest
            </button>

            {room.interests.length > 0 && (
              <ul className="space-y-2 pt-1">
                {room.interests.map((int) => {
                  const Icon = roleIcon[int.role];
                  return (
                    <li key={int.id} className="flex items-start gap-2">
                      <Icon className="w-3.5 h-3.5 text-gold-light mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-content-primary truncate">
                          {int.name}
                          <span className="ml-1 text-content-disabled font-normal">· {roleLabel[int.role]}</span>
                        </div>
                        {int.message && (
                          <p className="text-[11px] text-content-tertiary leading-snug mt-0.5 line-clamp-2">{int.message}</p>
                        )}
                        <span className="text-[10px] text-content-disabled">{relativeTime(int.createdAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Comments section */}
          <div className="card space-y-3">
            <div className="section-label flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Discussion
            </div>

            <div className="flex gap-2">
              <textarea
                rows={2}
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="input text-sm resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleComment();
                }}
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="btn-secondary btn-sm self-end shrink-0"
                aria-label="Send comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {room.comments.length === 0 ? (
              <p className="text-[11px] text-content-disabled text-center py-2">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {room.comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <UserCircle className="w-4 h-4 text-content-disabled mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-content-primary">{c.author}</span>
                        <span className="text-[10px] text-content-disabled">{relativeTime(c.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-content-secondary leading-snug mt-0.5">{c.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Scenarios section */}
          {room.scenarios.length > 0 && (
            <div className="card space-y-3">
              <div className="section-label flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                What-If Scenarios
              </div>
              <ul className="space-y-3">
                {room.scenarios.map((s) => (
                  <li key={s.id} className="card-glass !p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-content-primary">{s.label}</div>
                    <p className="text-[11px] text-content-tertiary leading-snug">{s.description}</p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {[
                        s.overrides.purchasePrice !== undefined && `Price: ${formatCurrency(s.overrides.purchasePrice)}`,
                        s.overrides.monthlyRent   !== undefined && `Rent: ${formatCurrency(s.overrides.monthlyRent)}/mo`,
                        s.overrides.rate          !== undefined && `Rate: ${s.overrides.rate.toFixed(2)}%`,
                        s.overrides.downPct       !== undefined && `Down: ${s.overrides.downPct}%`,
                      ].filter(Boolean).map((label) => (
                        <span key={label as string} className="badge-gold text-[10px]">{label}</span>
                      ))}
                    </div>
                    <div className="text-[10px] text-content-disabled">{relativeTime(s.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
