import { create } from "zustand";
import { loginRequest, meRequest } from "../api/auth";
import { Officer } from "../types";

type AuthState = {
  officer: Officer | null;
  token: string | null;
  loading: boolean;
  login: (badgeNumber: string, password: string) => Promise<void>;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  officer: null,
  token: null,
  loading: false,
  login: async (badgeNumber, password) => {
    set({ loading: true });
    const data = await loginRequest(badgeNumber, password);
    set({ officer: data.officer, token: data.token, loading: false });
  },
  bootstrap: async () => {
    try {
      const officer = await meRequest();
      set({ officer });
    } catch {
      set({ officer: null, token: null });
    }
  }
}));
