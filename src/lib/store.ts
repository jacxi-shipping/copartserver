import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Saved Search Type ────────────────────────────────────────────────────────

export interface SavedSearch {
  id: string
  query: string
  filters: Record<string, unknown>
  label: string
  createdAt: number
}

// ─── Activity Types ────────────────────────────────────────────────────────────

export type ActivityType =
  | 'search'
  | 'watchlist_add'
  | 'watchlist_remove'
  | 'watchlist_clear'
  | 'compare_add'
  | 'compare_remove'
  | 'compare_clear'
  | 'export_csv'
  | 'export_json'
  | 'import_upload'
  | 'vehicle_view'
  | 'recent_view'
  | 'filter_apply'
  | 'bulk_select'
  | 'bulk_watchlist'
  | 'bulk_export'

export type ActivityIcon = 'search' | 'heart' | 'git-compare' | 'download' | 'upload' | 'eye' | 'filter' | 'check-square' | 'list' | 'clock'

export interface ActivityItem {
  id: string
  type: ActivityType
  icon: ActivityIcon
  label: string
  description: string
  timestamp: number
  meta?: Record<string, string | number>
}

// ─── App State Interface ───────────────────────────────────────────────────────

interface AppState {
  // Navigation
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Search
  searchQuery: string
  setSearchQuery: (q: string) => void
  clearSearchQuery: () => void

  // Watchlist
  watchlist: number[]
  toggleWatchlist: (id: number, label?: string) => void
  isInWatchlist: (id: number) => boolean
  addManyToWatchlist: (ids: number[]) => void
  clearWatchlist: () => void

  // Compare
  compareList: number[]
  toggleCompare: (id: number, label?: string) => void
  isInCompare: (id: number) => boolean
  clearCompare: () => void

  // Bulk Selection
  bulkSelected: number[]
  setBulkSelected: (ids: number[]) => void
  toggleBulkSelect: (id: number) => void
  selectAll: (ids: number[]) => void
  clearBulkSelection: () => void
  isInBulkSelected: (id: number) => boolean

  // Bookmarks
  bookmarkedIds: number[]
  toggleBookmark: (id: number, label?: string) => void
  isBookmarked: (id: number) => boolean

  // Activity Feed
  activities: ActivityItem[]
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void
  clearActivities: () => void
  unreadCount: number
  markAllRead: () => void

  // Recently Viewed
  recentlyViewed: number[]
  addRecentlyViewed: (id: number, label?: string) => void
  clearRecentlyViewed: () => void

  // Notification drawer
  notificationOpen: boolean
  setNotificationOpen: (open: boolean) => void

  // Saved Searches
  savedSearches: SavedSearch[]
  saveSearch: (query: string, filters: Record<string, unknown>) => void
  deleteSavedSearch: (id: string) => void
  clearSavedSearches: () => void
}

// ─── Activity helper ───────────────────────────────────────────────────────────

let activityCounter = 0
function nextId() {
  return `act_${Date.now()}_${++activityCounter}`
}

function getActivityIcon(type: ActivityType): ActivityIcon {
  switch (type) {
    case 'search': return 'search'
    case 'watchlist_add':
    case 'watchlist_remove':
    case 'watchlist_clear': return 'heart'
    case 'compare_add':
    case 'compare_remove':
    case 'compare_clear': return 'git-compare'
    case 'export_csv':
    case 'export_json': return 'download'
    case 'import_upload': return 'upload'
    case 'vehicle_view': return 'eye'
    case 'recent_view': return 'clock'
    case 'filter_apply': return 'filter'
    case 'bulk_select':
    case 'bulk_watchlist':
    case 'bulk_export': return 'check-square'
    default: return 'list'
  }
}

// ─── Max activities kept in memory ─────────────────────────────────────────────

const MAX_ACTIVITIES = 50

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Search
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      clearSearchQuery: () => set({ searchQuery: '' }),

      // Watchlist
      watchlist: [],
      toggleWatchlist: (id, label) => {
        const isIn = get().watchlist.includes(id)
        set((state) => ({
          watchlist: isIn
            ? state.watchlist.filter((w) => w !== id)
            : [...state.watchlist, id],
        }))
        // Track activity
        get().addActivity({
          type: isIn ? 'watchlist_remove' : 'watchlist_add',
          icon: getActivityIcon(isIn ? 'watchlist_remove' : 'watchlist_add'),
          label: isIn ? 'Removed from watchlist' : 'Added to watchlist',
          description: label || `Vehicle #${id}`,
          meta: { vehicleId: id },
        })
      },
      isInWatchlist: (id) => get().watchlist.includes(id),
      addManyToWatchlist: (ids) => {
        const current = get().watchlist
        const newIds = ids.filter((id) => !current.includes(id))
        set({ watchlist: [...current, ...newIds] })
        if (newIds.length > 0) {
          get().addActivity({
            type: 'bulk_watchlist',
            icon: 'check-square',
            label: `Added ${newIds.length} vehicles to watchlist`,
            description: `Bulk action: ${newIds.length} new vehicles added`,
          })
        }
      },
      clearWatchlist: () => {
        const count = get().watchlist.length
        set({ watchlist: [] })
        get().addActivity({
          type: 'watchlist_clear',
          icon: 'heart',
          label: 'Watchlist cleared',
          description: `Removed ${count} vehicle${count !== 1 ? 's' : ''} from watchlist`,
        })
      },

      // Compare
      compareList: [],
      toggleCompare: (id, label) => {
        const isIn = get().compareList.includes(id)
        if (isIn) {
          set({ compareList: get().compareList.filter((c) => c !== id) })
        } else {
          if (get().compareList.length >= 3) return
          set({ compareList: [...get().compareList, id] })
        }
        get().addActivity({
          type: isIn ? 'compare_remove' : 'compare_add',
          icon: 'git-compare',
          label: isIn ? 'Removed from comparison' : 'Added to comparison',
          description: label || `Vehicle #${id}`,
          meta: { vehicleId: id },
        })
      },
      isInCompare: (id) => get().compareList.includes(id),
      clearCompare: () => {
        const count = get().compareList.length
        set({ compareList: [] })
        get().addActivity({
          type: 'compare_clear',
          icon: 'git-compare',
          label: 'Comparison cleared',
          description: `Removed ${count} vehicle${count !== 1 ? 's' : ''} from comparison`,
        })
      },

      // Bulk Selection
      bulkSelected: [],
      setBulkSelected: (ids) => set({ bulkSelected: ids }),
      toggleBulkSelect: (id) =>
        set((state) => ({
          bulkSelected: state.bulkSelected.includes(id)
            ? state.bulkSelected.filter((s) => s !== id)
            : [...state.bulkSelected, id],
        })),
      selectAll: (ids) => set({ bulkSelected: [...ids] }),
      clearBulkSelection: () => set({ bulkSelected: [] }),
      isInBulkSelected: (id) => get().bulkSelected.includes(id),

      // Bookmarks
      bookmarkedIds: [],
      toggleBookmark: (id, label) => {
        const isIn = get().bookmarkedIds.includes(id)
        set((state) => ({
          bookmarkedIds: isIn
            ? state.bookmarkedIds.filter((b) => b !== id)
            : [...state.bookmarkedIds, id],
        }))
        get().addActivity({
          type: 'filter_apply',
          icon: 'filter',
          label: isIn ? 'Removed bookmark' : 'Added bookmark',
          description: label || `Vehicle #${id}`,
          meta: { vehicleId: id },
        })
      },
      isBookmarked: (id) => get().bookmarkedIds.includes(id),

      // Activity Feed
      activities: [],
      addActivity: (activity) =>
        set((state) => {
          const newActivity: ActivityItem = {
            ...activity,
            id: nextId(),
            timestamp: Date.now(),
          }
          const updated = [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES)
          return {
            activities: updated,
            unreadCount: state.unreadCount + 1,
          }
        }),
      clearActivities: () => set({ activities: [], unreadCount: 0 }),
      unreadCount: 0,
      markAllRead: () => set({ unreadCount: 0 }),

      // Recently Viewed
      recentlyViewed: [],
      addRecentlyViewed: (id, label) => {
        set((state) => {
          const filtered = state.recentlyViewed.filter((v) => v !== id)
          return { recentlyViewed: [id, ...filtered].slice(0, 12) }
        })
        get().addActivity({
          type: 'recent_view',
          icon: 'clock',
          label: 'Viewed vehicle',
          description: label || `Vehicle #${id}`,
          meta: { vehicleId: id },
        })
      },
      clearRecentlyViewed: () => {
        const count = get().recentlyViewed.length
        set({ recentlyViewed: [] })
        if (count > 0) {
          get().addActivity({
            type: 'vehicle_view',
            icon: 'clock',
            label: 'Recently viewed cleared',
            description: `Cleared ${count} vehicle${count !== 1 ? 's' : ''} from history`,
          })
        }
      },

      // Notification drawer
      notificationOpen: false,
      setNotificationOpen: (open) => set({ notificationOpen: open }),

      // Saved Searches
      savedSearches: [],
      saveSearch: (query, filters) => {
        const parts: string[] = []
        if (query) parts.push(query.toUpperCase())
        const f = filters as Record<string, unknown>
        if (f.makes && Array.isArray(f.makes) && f.makes.length > 0) {
          parts.push((f.makes as string[]).slice(0, 2).join(', '))
        }
        if (f.yearMin) parts.push(String(f.yearMin))
        if (f.yearMax) parts.push(String(f.yearMax))
        if (f.states && Array.isArray(f.states) && f.states.length > 0) {
          parts.push((f.states as string[])[0])
        }
        const label = parts.length > 0 ? parts.join(', ') : 'All vehicles'
        const newSearch: SavedSearch = {
          id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          query,
          filters,
          label,
          createdAt: Date.now(),
        }
        set((state) => ({
          savedSearches: [newSearch, ...state.savedSearches].slice(0, 20),
        }))
      },
      deleteSavedSearch: (id) =>
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== id),
        })),
      clearSavedSearches: () => set({ savedSearches: [] }),
    }),
    {
      name: 'copart-app-store',
      partialize: (state) => ({
        watchlist: state.watchlist,
        compareList: state.compareList,
        bookmarkedIds: state.bookmarkedIds,
        activities: state.activities,
        recentlyViewed: state.recentlyViewed,
        savedSearches: state.savedSearches,
      }),
    }
  )
)