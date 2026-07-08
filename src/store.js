import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),

      // Active project
      activeProject: null,
      setActiveProject: (project) => set({ activeProject: project }),

      // Active milestone
      activeMilestone: 1,
      setActiveMilestone: (num) => set({ activeMilestone: num }),

      // Notifications count
      unreadCount: 0,
      setUnreadCount: (n) => set({ unreadCount: n }),

      // Sidebar collapsed
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Bumped whenever a project's selected milestones change (add/remove/reset),
      // so the AppLayout sidebar (which fetches independently) knows to refetch
      // even when the user hasn't navigated away from the configure page.
      milestonesVersion: 0,
      bumpMilestonesVersion: () => set((s) => ({ milestonesVersion: s.milestonesVersion + 1 })),
    }),
    { name: 'wbs-store', partialize: (s) => ({ user: s.user, token: s.token, activeProject: s.activeProject }) }
  )
)
