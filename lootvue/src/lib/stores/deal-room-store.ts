import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DealRoom, DealRoomComment, DealRoomScenario, DealRoomInterest } from "@/lib/types/marketplace";
import type { AnalysisResult } from "@/app/dashboard/analyze/_components";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(): string {
  return `dr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface DealRoomState {
  rooms: DealRoom[];
  createRoom: (analysis: AnalysisResult, title?: string) => string;
  getRoomByToken: (token: string) => DealRoom | undefined;
  addComment: (token: string, author: string, text: string) => void;
  addScenario: (token: string, scenario: Omit<DealRoomScenario, "id" | "createdAt">) => void;
  expressInterest: (token: string, interest: Omit<DealRoomInterest, "id" | "createdAt">) => void;
  incrementViews: (token: string) => void;
  updateStatus: (token: string, status: DealRoom["status"]) => void;
  getMyRooms: () => DealRoom[];
  getRecentRooms: (limit: number) => DealRoom[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDealRoomStore = create<DealRoomState>()(
  persist(
    (set, get) => ({
      rooms: [],

      createRoom: (analysis, title) => {
        const token = generateToken();
        const now = new Date().toISOString();
        const room: DealRoom = {
          id: generateId("room"),
          token,
          createdAt: now,
          updatedAt: now,
          createdBy: "Investor",
          analysis: { ...analysis },
          comments: [],
          scenarios: [],
          interests: [],
          title: title ?? `Deal Room — ${analysis.address}`,
          status: "active",
          viewCount: 0,
        };
        set((state) => ({ rooms: [...state.rooms, room] }));
        return token;
      },

      getRoomByToken: (token) =>
        get().rooms.find((r) => r.token === token),

      addComment: (token, author, text) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.token === token
              ? {
                  ...r,
                  comments: [
                    ...r.comments,
                    {
                      id: generateId("comment"),
                      author,
                      text,
                      createdAt: new Date().toISOString(),
                    } satisfies DealRoomComment,
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      addScenario: (token, scenario) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.token === token
              ? {
                  ...r,
                  scenarios: [
                    ...r.scenarios,
                    {
                      ...scenario,
                      id: generateId("scenario"),
                      createdAt: new Date().toISOString(),
                    } satisfies DealRoomScenario,
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      expressInterest: (token, interest) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.token === token
              ? {
                  ...r,
                  interests: [
                    ...r.interests,
                    {
                      ...interest,
                      id: generateId("interest"),
                      createdAt: new Date().toISOString(),
                    } satisfies DealRoomInterest,
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        })),

      incrementViews: (token) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.token === token
              ? { ...r, viewCount: r.viewCount + 1 }
              : r
          ),
        })),

      updateStatus: (token, status) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.token === token
              ? { ...r, status, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      getMyRooms: () =>
        get().rooms.filter((r) => r.createdBy === "Investor"),

      getRecentRooms: (limit) =>
        [...get().rooms]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, limit),
    }),
    {
      name: "deal-room-store",
    }
  )
);
