import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,

      setAuth: (user, token) => set({ user, token, isLoading: false }),

      clearAuth: () => set({ user: null, token: null, isLoading: false }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'vibeauth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

interface UIState {
  searchQuery: string;
  searchType: 'album' | 'track' | 'both';
  setSearchQuery: (query: string) => void;
  setSearchType: (type: 'album' | 'track' | 'both') => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  searchType: 'both',

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchType: (type) => set({ searchType: type }),
}));
