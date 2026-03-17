"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Achievement Definitions ─────────────────────────────────────────────────

export type AchievementCategory =
  | "analyze"
  | "market"
  | "pipeline"
  | "simulate"
  | "explore"
  | "streak";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  category: AchievementCategory;
  unlockedAt?: string; // ISO date
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Analyze ──────────────────────────────────────────────────────────────
  {
    id: "first_analysis",
    name: "First Blood",
    description: "Analyze your first property",
    icon: "🎯",
    xp: 50,
    category: "analyze",
  },
  {
    id: "five_analyses",
    name: "Deal Hunter",
    description: "Analyze 5 properties",
    icon: "🔍",
    xp: 100,
    category: "analyze",
  },
  {
    id: "twenty_analyses",
    name: "Serial Analyzer",
    description: "Analyze 20 properties",
    icon: "⚡",
    xp: 250,
    category: "analyze",
  },
  {
    id: "stress_tested",
    name: "Stress Warrior",
    description: "Run a stress test on a deal",
    icon: "🛡️",
    xp: 75,
    category: "analyze",
  },
  {
    id: "monte_carlo",
    name: "Probability Master",
    description: "Run Monte Carlo simulation",
    icon: "🎲",
    xp: 100,
    category: "analyze",
  },
  {
    id: "all_tabs",
    name: "Deep Diver",
    description: "View all 5 analysis tabs on one deal",
    icon: "🤿",
    xp: 150,
    category: "analyze",
  },

  // ── Market ────────────────────────────────────────────────────────────────
  {
    id: "first_market",
    name: "Market Scout",
    description: "Explore your first market",
    icon: "🗺️",
    xp: 50,
    category: "market",
  },
  {
    id: "five_markets",
    name: "Globe Trotter",
    description: "Explore 5 different markets",
    icon: "🌍",
    xp: 150,
    category: "market",
  },
  {
    id: "used_4d",
    name: "Dimension Shifter",
    description: "Use the 4D Explorer",
    icon: "🔮",
    xp: 100,
    category: "market",
  },
  {
    id: "changed_dimensions",
    name: "Axis Master",
    description: "Change all 4 dimensions in the Explorer",
    icon: "📊",
    xp: 75,
    category: "market",
  },
  {
    id: "time_traveler",
    name: "Time Traveler",
    description: "Scrub through 3+ years of market data",
    icon: "⏳",
    xp: 100,
    category: "market",
  },

  // ── Pipeline ──────────────────────────────────────────────────────────────
  {
    id: "first_save",
    name: "Deal Saver",
    description: "Save your first deal to pipeline",
    icon: "📌",
    xp: 50,
    category: "pipeline",
  },
  {
    id: "five_pipeline",
    name: "Pipeline Builder",
    description: "Have 5 deals in your pipeline",
    icon: "🏗️",
    xp: 150,
    category: "pipeline",
  },
  {
    id: "first_offer",
    name: "Offer Maker",
    description: "Move a deal to Offer stage",
    icon: "✍️",
    xp: 200,
    category: "pipeline",
  },
  {
    id: "first_close",
    name: "Closer",
    description: "Close your first deal",
    icon: "🏆",
    xp: 500,
    category: "pipeline",
  },
  {
    id: "compared_deals",
    name: "Comparison King",
    description: "Compare 2 deals side by side",
    icon: "⚖️",
    xp: 75,
    category: "pipeline",
  },

  // ── Simulate ──────────────────────────────────────────────────────────────
  {
    id: "first_sim",
    name: "What If",
    description: "Run your first simulation",
    icon: "🧪",
    xp: 50,
    category: "simulate",
  },
  {
    id: "sensitivity",
    name: "Sensitivity Analyst",
    description: "Find the most sensitive variable",
    icon: "🎛️",
    xp: 100,
    category: "simulate",
  },
  {
    id: "saved_scenario",
    name: "Scenario Planner",
    description: "Save a simulation scenario",
    icon: "💾",
    xp: 75,
    category: "simulate",
  },

  // ── Explore ───────────────────────────────────────────────────────────────
  {
    id: "visited_all_pages",
    name: "Explorer",
    description: "Visit all 7 dashboard pages",
    icon: "🧭",
    xp: 200,
    category: "explore",
  },
  {
    id: "used_ai_coach",
    name: "AI Apprentice",
    description: "Ask the AI Coach a question",
    icon: "🤖",
    xp: 50,
    category: "explore",
  },
  {
    id: "shared_analysis",
    name: "Social Investor",
    description: "Share a deal analysis",
    icon: "📤",
    xp: 100,
    category: "explore",
  },

  // ── Streaks ───────────────────────────────────────────────────────────────
  {
    id: "streak_3",
    name: "On a Roll",
    description: "3-day analysis streak",
    icon: "🔥",
    xp: 100,
    category: "streak",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "7-day analysis streak",
    icon: "💪",
    xp: 250,
    category: "streak",
  },
  {
    id: "streak_30",
    name: "Iron Investor",
    description: "30-day analysis streak",
    icon: "🏅",
    xp: 1000,
    category: "streak",
  },
];

// ─── Level Definitions ────────────────────────────────────────────────────────

export interface Level {
  level: number;
  name: string;
  minXP: number;
  icon: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: "Rookie",     minXP: 0,    icon: "🌱" },
  { level: 2, name: "Scout",      minXP: 100,  icon: "🔍" },
  { level: 3, name: "Analyst",    minXP: 300,  icon: "📊" },
  { level: 4, name: "Strategist", minXP: 600,  icon: "♟️" },
  { level: 5, name: "Veteran",    minXP: 1000, icon: "⭐" },
  { level: 6, name: "Expert",     minXP: 1500, icon: "💎" },
  { level: 7, name: "Master",     minXP: 2500, icon: "👑" },
  { level: 8, name: "Legend",     minXP: 4000, icon: "🏆" },
];

// ─── Helper: compute level from XP ───────────────────────────────────────────

export function getLevel(totalXP: number): Level {
  let current: Level = LEVELS[0]!;
  for (const level of LEVELS) {
    if (totalXP >= level.minXP) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevel(totalXP: number): Level | null {
  const current = getLevel(totalXP);
  return LEVELS.find((l) => l.level === current.level + 1) ?? null;
}

export function getLevelProgress(totalXP: number): number {
  const current = getLevel(totalXP);
  const next = getNextLevel(totalXP);
  if (!next) return 1; // max level — full bar
  const range = next.minXP - current.minXP;
  const earned = totalXP - current.minXP;
  return Math.min(1, Math.max(0, earned / range));
}

// ─── Action → Achievement mapping (internal) ─────────────────────────────────

const ALL_DASHBOARD_PAGES = new Set([
  "dashboard",
  "analyze",
  "markets",
  "discover",
  "pipeline",
  "simulator",
  "settings",
]);

// ─── Store State & Actions ────────────────────────────────────────────────────

interface GamificationState {
  // XP & Level
  totalXP: number;

  // Achievements
  unlockedAchievements: string[];
  // ISO date strings keyed by achievement ID
  achievementUnlockDates: Record<string, string>;

  // Progress counters
  analysisCount: number;
  marketsExplored: string[];
  pagesVisited: string[];
  pipelineCount: number;
  simulationCount: number;

  // Analysis tab tracking (per-session, keyed by address)
  analysisTabsSeen: Record<string, string[]>;

  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // "YYYY-MM-DD"

  // Toast queue — most recently unlocked achievement
  recentUnlock: Achievement | null;

  // Actions
  trackAction: (action: string, meta?: Record<string, string>) => void;
  dismissRecentUnlock: () => void;
  reset: () => void;
}

// ─── Date helper ─────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_STATE: Omit<
  GamificationState,
  "trackAction" | "dismissRecentUnlock" | "reset"
> = {
  totalXP: 0,
  unlockedAchievements: [],
  achievementUnlockDates: {},
  analysisCount: 0,
  marketsExplored: [],
  pagesVisited: [],
  pipelineCount: 0,
  simulationCount: 0,
  analysisTabsSeen: {},
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  recentUnlock: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      trackAction: (action: string, meta?: Record<string, string>) => {
        const state = get();
        const today = todayString();
        const yesterday = yesterdayString();

        // ── Streak maintenance ─────────────────────────────────────────────
        let newStreak = state.currentStreak;
        let newLongest = state.longestStreak;
        let lastActiveDate = state.lastActiveDate;

        if (state.lastActiveDate === null || state.lastActiveDate < yesterday) {
          // Gap of 2+ days — reset streak
          newStreak = 1;
        } else if (state.lastActiveDate === yesterday) {
          // Consecutive day — increment
          newStreak = state.currentStreak + 1;
        }
        // If lastActiveDate === today, streak stays unchanged

        if (newStreak > newLongest) newLongest = newStreak;
        lastActiveDate = today;

        // ── Counter updates ────────────────────────────────────────────────
        let analysisCount = state.analysisCount;
        let marketsExplored = state.marketsExplored;
        let pagesVisited = state.pagesVisited;
        let pipelineCount = state.pipelineCount;
        let simulationCount = state.simulationCount;
        let analysisTabsSeen = state.analysisTabsSeen;

        const [actionType, actionMeta] = action.split(":");

        switch (actionType) {
          case "analysis_complete":
            analysisCount += 1;
            break;

          case "market_explored":
            if (actionMeta && !marketsExplored.includes(actionMeta)) {
              marketsExplored = [...marketsExplored, actionMeta];
            }
            break;

          case "page_visited":
            if (actionMeta && !pagesVisited.includes(actionMeta)) {
              pagesVisited = [...pagesVisited, actionMeta];
            }
            break;

          case "deal_saved":
            pipelineCount += 1;
            break;

          case "simulation_run":
            simulationCount += 1;
            break;

          case "analysis_tab_viewed": {
            // meta is "address" key from the trackAction meta param
            const address = meta?.address ?? "unknown";
            const tab = actionMeta ?? "";
            const existing = analysisTabsSeen[address] ?? [];
            if (tab && !existing.includes(tab)) {
              analysisTabsSeen = {
                ...analysisTabsSeen,
                [address]: [...existing, tab],
              };
            }
            break;
          }

          default:
            // Actions with no counter side-effect are still valid (e.g.,
            // "stress_test_run", "monte_carlo_run", "deal_offer",
            // "deal_closed", "deals_compared", "scenario_saved",
            // "ai_coach_used", "analysis_shared", "4d_explorer_used",
            // "dimensions_changed", "time_scrubbed")
            break;
        }

        // ── Achievement evaluation ─────────────────────────────────────────
        const alreadyUnlocked = new Set(state.unlockedAchievements);
        let totalXP = state.totalXP;
        let newlyUnlocked: Achievement | null = null;

        // Process candidates in order — first match wins the toast
        const candidates: Array<{ id: string; condition: boolean }> = [
          // Analyze
          { id: "first_analysis",   condition: analysisCount >= 1 },
          { id: "five_analyses",    condition: analysisCount >= 5 },
          { id: "twenty_analyses",  condition: analysisCount >= 20 },
          { id: "stress_tested",    condition: action === "stress_test_run" },
          { id: "monte_carlo",      condition: action === "monte_carlo_run" },
          {
            id: "all_tabs",
            condition: (() => {
              if (actionType !== "analysis_tab_viewed") return false;
              const address = meta?.address ?? "unknown";
              const tabs = analysisTabsSeen[address] ?? [];
              const requiredTabs = ["summary", "financials", "risk", "market", "financing"];
              return requiredTabs.every((t) => tabs.includes(t));
            })(),
          },

          // Market
          { id: "first_market",       condition: marketsExplored.length >= 1 },
          { id: "five_markets",       condition: marketsExplored.length >= 5 },
          { id: "used_4d",            condition: action === "4d_explorer_used" },
          { id: "changed_dimensions", condition: action === "dimensions_changed" },
          { id: "time_traveler",      condition: action === "time_scrubbed" },

          // Pipeline
          { id: "first_save",     condition: pipelineCount >= 1 },
          { id: "five_pipeline",  condition: pipelineCount >= 5 },
          { id: "first_offer",    condition: action === "deal_offer" },
          { id: "first_close",    condition: action === "deal_closed" },
          { id: "compared_deals", condition: action === "deals_compared" },

          // Simulate
          { id: "first_sim",      condition: simulationCount >= 1 },
          { id: "sensitivity",    condition: action === "sensitivity_found" },
          { id: "saved_scenario", condition: action === "scenario_saved" },

          // Explore
          {
            id: "visited_all_pages",
            condition: ALL_DASHBOARD_PAGES.size > 0 &&
              [...ALL_DASHBOARD_PAGES].every((p) => pagesVisited.includes(p)),
          },
          { id: "used_ai_coach",   condition: action === "ai_coach_used" },
          { id: "shared_analysis", condition: action === "analysis_shared" },

          // Streaks
          { id: "streak_3",  condition: newStreak >= 3 },
          { id: "streak_7",  condition: newStreak >= 7 },
          { id: "streak_30", condition: newStreak >= 30 },
        ];

        const nowISO = new Date().toISOString();
        const unlockDates: Record<string, string> = {
          ...state.achievementUnlockDates,
        };

        for (const { id, condition } of candidates) {
          if (condition && !alreadyUnlocked.has(id)) {
            const achievement = ACHIEVEMENTS.find((a) => a.id === id);
            if (achievement) {
              alreadyUnlocked.add(id);
              unlockDates[id] = nowISO;
              totalXP += achievement.xp;
              if (!newlyUnlocked) {
                newlyUnlocked = {
                  ...achievement,
                  unlockedAt: nowISO,
                };
              }
            }
          }
        }

        set({
          totalXP,
          analysisCount,
          marketsExplored,
          pagesVisited,
          pipelineCount,
          simulationCount,
          analysisTabsSeen,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate,
          unlockedAchievements: [...alreadyUnlocked],
          achievementUnlockDates: unlockDates,
          recentUnlock: newlyUnlocked ?? state.recentUnlock,
        });
      },

      dismissRecentUnlock: () => set({ recentUnlock: null }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: "lootvue-gamification-v1",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return;
          localStorage.removeItem(name);
        },
      },
    }
  )
);
