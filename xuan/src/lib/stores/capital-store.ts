import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CapitalPost, CapitalInquiry } from "@/lib/types/marketplace";

// ─── State Interface ──────────────────────────────────────────────────────────

interface CapitalState {
  posts: CapitalPost[];
  inquiries: CapitalInquiry[];
  createPost: (
    post: Omit<CapitalPost, "id" | "createdAt" | "status" | "inquiryCount">
  ) => string;
  submitInquiry: (postId: string, from: string, message: string) => void;
  getOpenPosts: () => CapitalPost[];
  getMyPosts: () => CapitalPost[];
  updatePostStatus: (id: string, status: CapitalPost["status"]) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCapitalStore = create<CapitalState>()(
  persist(
    (set, get) => ({
      posts: [],
      inquiries: [],

      createPost: (post) => {
        const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const newPost: CapitalPost = {
          ...post,
          id,
          createdAt: new Date().toISOString(),
          status: "open",
          inquiryCount: 0,
        };
        set((state) => ({ posts: [...state.posts, newPost] }));
        return id;
      },

      submitInquiry: (postId, from, message) => {
        const inquiryId = `inq_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        const inquiry: CapitalInquiry = {
          id: inquiryId,
          postId,
          from,
          message,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          inquiries: [...state.inquiries, inquiry],
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, inquiryCount: p.inquiryCount + 1 }
              : p
          ),
        }));
      },

      getOpenPosts: () =>
        get().posts.filter((p) => p.status === "open"),

      getMyPosts: () =>
        get().posts.filter((p) => p.postedBy === "Investor"),

      updatePostStatus: (id, status) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === id ? { ...p, status } : p
          ),
        })),
    }),
    {
      name: "capital-store",
    }
  )
);
