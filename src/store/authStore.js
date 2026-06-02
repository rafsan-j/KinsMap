import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  linkedPersonId: null,
  treeId: null,
  isLoading: true,

  setAuth: (user, treeId, role, linkedPersonId) =>
    set({
      user: user ?? null,
      treeId: treeId ?? null,
      role: role ?? null,
      linkedPersonId: linkedPersonId ?? null,
      isLoading: false,
    }),

  setAuthState: ({ user, role, linkedPersonId, treeId, isLoading = false }) =>
    set({
      user: user ?? null,
      role: role ?? null,
      linkedPersonId: linkedPersonId ?? null,
      treeId: treeId ?? null,
      isLoading,
    }),

  clearAuth: () =>
    set({
      user: null,
      role: null,
      linkedPersonId: null,
      treeId: null,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}))
