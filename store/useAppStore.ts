import { create } from "zustand";
import { UserProfile } from "@/lib/auth";

interface AppState {
  user: UserProfile | null;
  loading: boolean;
  role: "volunteer" | "ngo" | null;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setRole: (role: "volunteer" | "ngo" | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  loading: true,
  role: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setRole: (role) => set({ role }),
}));
