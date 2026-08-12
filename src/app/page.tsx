'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car, Search, CalendarClock, Calendar, Import as FileImport, LayoutDashboard, Heart, Keyboard, Bell, Database, BarChart3, BookOpen,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarSeparator,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

// Store
import { useAppStore } from '@/lib/store'

// Tab components (static — always needed for sidebar counts)
import { DashboardTab } from '@/components/dashboard/stats-cards'
import { SearchTab } from '@/components/search/search-tab'
import { ImportTab } from '@/components/import/import-tab'
import { AllAuctionsTab } from '@/components/auctions/all-auctions-tab'
import { UpcomingTab } from '@/components/auctions/upcoming-tab'
import { TodayTab } from '@/components/auctions/today-tab'
import { WatchlistTab } from '@/components/watchlist/watchlist-tab'
import { AnalyticsTab } from '@/components/analytics/analytics-tab'
import { ApiDocsTab } from '@/components/docs/api-docs-tab'

// Shared components
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { ComparePanel } from '@/components/shared/compare-panel'
import { BackToTop } from '@/components/shared/back-to-top'
import { ActivityFeed } from '@/components/shared/activity-feed'
import { LiveClock } from '@/components/shared/live-clock'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'
import { CommandPalette } from '@/components/shared/command-palette'
import { KeyboardShortcutsDialog } from '@/components/shared/keyboard-shortcuts-dialog'
import type { Auction } from '@/lib/types'

// ─── Nav Items Config ────────────────────────────────────────────────────────

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'search', label: 'Search', icon: Search, badge: null },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
  { id: 'api-docs', label: 'API Docs', icon: BookOpen, badge: null },
  { id: 'import', label: 'Import', icon: FileImport, badge: null },
  { id: 'auctions', label: 'All Auctions', icon: Car, badge: null },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, badge: null },
  { id: 'today', label: "Today's Lots", icon: Calendar, badge: null },
]

// ─── Sidebar Count Hook ─────────────────────────────────────────────────────

interface SidebarCountsData {
  total: number
  upcoming: number
  today: number
  imports: number
}

function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCountsData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats/counts')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && data.data) {
          setCounts(data.data as SidebarCountsData)
          setLoaded(true)
        }
      })
      .catch(() => setLoaded(true))
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  return { counts, loaded }
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────

function AppSidebar() {
  const { activeTab, setActiveTab, watchlist, compareList, activities, unreadCount, bookmarkedIds } = useAppStore()
  const { setOpenMobile } = useSidebar()
  const { counts, loaded } = useSidebarCounts()

  const getCountForNav = (id: string): number | null => {
    if (!loaded || !counts) return null
    switch (id) {
      case 'dashboard': return counts.total
      case 'auctions': return counts.total
      case 'upcoming': return counts.upcoming
      case 'today': return counts.today
      case 'import': return counts.imports
      default: return null
    }
  }

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId)
    setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
            <Car className="size-4.5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <span className="block text-base font-bold tracking-tight">Copart Lots</span>
            <span className="block text-[10px] text-muted-foreground leading-none mt-0.5">Data Platform v6.0</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => handleNavClick(item.id)}
                    tooltip={item.label}
                    className="relative transition-colors duration-150"
                  >
                    {/* Animated emerald dot for active item */}
                    {activeTab === item.id && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                    {getCountForNav(item.id) != null && (
                      <Badge
                        variant="secondary"
                        className="ml-auto group-data-[collapsible=icon]:hidden h-5 min-w-5 px-1.5 text-[10px] font-semibold tabular-nums"
                      >
                        {getCountForNav(item.id)!.toLocaleString()}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collections Section */}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">Collections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Watchlist */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === 'watchlist'}
                  onClick={() => handleNavClick('watchlist')}
                  tooltip={`${watchlist.length} watchlisted`}
                  className="relative transition-colors duration-150"
                >
                  {activeTab === 'watchlist' && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <Heart className="size-4" />
                  <span>Watchlist</span>
                  {watchlist.length > 0 && (
                    <Badge variant="secondary" className="ml-auto group-data-[collapsible=icon]:hidden h-5 min-w-5 px-1.5 text-[10px] font-semibold tabular-nums">
                      {watchlist.length}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Activity Feed / Notifications with unread badge */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="relative transition-all duration-200 hover:border-l-2 hover:border-emerald-500 hover:pl-5"
                  tooltip={`${unreadCount} unread notifications`}
                >
                  <div className="relative">
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-sidebar">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>Activity Feed</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto group-data-[collapsible=icon]:hidden flex size-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats Section */}
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">Quick Stats</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="group-data-[collapsible=icon]:hidden space-y-0 px-2 py-1">
              {/* Watchlist */}
              <div className="flex items-center justify-between text-sm py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-rose-500" />
                  Watchlist
                </span>
                <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">{watchlist.length}</span>
              </div>
              <Separator className="opacity-40" />
              {/* Compare */}
              <div className="flex items-center justify-between text-sm py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  Compare
                </span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{compareList.length}/3</span>
              </div>
              <Separator className="opacity-40" />
              {/* Activities */}
              <div className="flex items-center justify-between text-sm py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-teal-500" />
                  Activities
                </span>
                <span className="font-semibold tabular-nums text-teal-600 dark:text-teal-400">{activities.length}</span>
              </div>
              <Separator className="opacity-40" />
              {/* Bookmarks */}
              <div className="flex items-center justify-between text-sm py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-amber-500" />
                  Bookmarks
                </span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{bookmarkedIds.length}</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="group-data-[collapsible=icon]:hidden space-y-2 px-1">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Keyboard className="size-3" />
            <span>Press <kbd className="kbd text-[9px]">/</kbd> to search, <kbd className="kbd text-[9px]">⌘K</kbd> commands, <kbd className="kbd text-[9px]">?</kbd> shortcuts</span>
          </div>
          <div className="text-[10px] text-muted-foreground/60">
            © {new Date().getFullYear()} Copart Data Platform · 12 phases
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const { activeTab, setActiveTab, setSearchQuery, addActivity, clearBulkSelection, bookmarkedIds } = useAppStore()
  const [searchInput, setSearchInput] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchedLot, setSearchedLot] = useState<Auction | null>(null)
  const [lotDetailOpen, setLotDetailOpen] = useState(false)
  const { counts } = useSidebarCounts()
  const dbRecordCount = counts?.total ?? null

  const allNavItems = [...navItems, { id: 'watchlist', label: 'Watchlist', icon: Heart }]
  const allTabIds = allNavItems.map((i) => i.id)
  const pageTitle = allNavItems.find((item) => item.id === activeTab)?.label ?? 'Dashboard'

  const handleQuickSearch = useCallback(async () => {
    const q = searchInput.trim()
    if (!q) return
    setSearchInput('')
    setMobileSearchOpen(false)

    // If pure numeric, treat as lot number lookup
    if (/^\d+$/.test(q)) {
      try {
        const res = await fetch(`/api/auctions/lot/${q}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setSearchedLot(json.data)
            setLotDetailOpen(true)
            addActivity({
              type: 'vehicle_view',
              icon: 'eye',
              label: `Looked up Lot #${q}`,
              description: `${json.data.year ?? ''} ${json.data.make ?? ''} ${json.data.modelGroup || json.data.modelDetail || ''}`.trim(),
            })
            return
          }
        }
      } catch {
        // fall through to normal search
      }
    }

    // Fallback: normal text search
    setSearchQuery(q)
    setActiveTab('search')
    addActivity({
      type: 'search',
      icon: 'search',
      label: `Searched for "${q}"`,
      description: 'Quick search from header',
    })
  }, [searchInput, setSearchQuery, setActiveTab, addActivity])

  // Keyboard shortcut: / to focus quick search
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        const desktopInput = document.querySelector<HTMLInputElement>('[data-quick-search]')
        const mobileInput = document.querySelector<HTMLInputElement>('[data-mobile-search]')
        if (mobileSearchOpen) {
          mobileInput?.focus()
        } else {
          desktopInput?.focus()
        }
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setShortcutsOpen(true)
      }
      if (e.key === 'Escape' && mobileSearchOpen) {
        setMobileSearchOpen(false)
        setSearchInput('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileSearchOpen])

  // Clear bulk selection when tab changes
  useEffect(() => {
    clearBulkSelection()
  }, [activeTab, clearBulkSelection])

  // Get page icon for header
  const pageIcon = allNavItems.find((item) => item.id === activeTab)?.icon ?? LayoutDashboard
  const PageIcon = pageIcon

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-3 px-4 md:px-6">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-muted transition-colors duration-200">
                  <PageIcon className="size-3.5 text-muted-foreground" />
                </div>
                <h1 className="text-base font-semibold tracking-tight">{pageTitle}</h1>
              </div>
              <div className="flex-1" />
              {/* Desktop quick search */}
              <div className="hidden items-center gap-2 sm:flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        data-quick-search
                        placeholder="Quick search... (press /)"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickSearch()
                          if (e.key === 'Escape') setSearchInput('')
                        }}
                        className="h-8 pl-8 pr-8 text-xs transition-all duration-200 focus:border-emerald-400 focus:ring-emerald-400/20 focus:w-72"
                      />
                      {searchInput && (
                        <button
                          onClick={() => setSearchInput('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Type to search, Enter to navigate</p>
                    <p className="text-xs text-muted-foreground mt-1">Numbers = lot lookup • <span className="kbd text-[9px]">/</span> focus • <span className="kbd text-[9px]">⌘K</span> commands</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {/* Mobile search toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden size-8"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                aria-label="Toggle search"
              >
                <Search className="size-4" />
              </Button>
              <LiveClock />
              <ActivityFeed />
              <ThemeToggle />
            </div>

            {/* Mobile search bar (collapsible) */}
            <AnimatePresence>
              {mobileSearchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-t sm:hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        data-mobile-search
                        placeholder="Search vehicles..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickSearch()
                          if (e.key === 'Escape') { setMobileSearchOpen(false); setSearchInput('') }
                        }}
                        autoFocus
                        className="h-9 pl-8 pr-8 text-sm"
                      />
                      {searchInput && (
                        <button
                          onClick={() => setSearchInput('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      )}
                    </div>
                    <Button size="sm" onClick={handleQuickSearch} className="shrink-0">
                      Search
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Main Content */}
          <main className="app-workspace flex-1 p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'search' && <SearchTab />}
                {activeTab === 'import' && <ImportTab />}
                {activeTab === 'auctions' && <AllAuctionsTab />}
                {activeTab === 'upcoming' && <UpcomingTab />}
                {activeTab === 'today' && <TodayTab />}
                {activeTab === 'analytics' && <AnalyticsTab />}
                {activeTab === 'api-docs' && <ApiDocsTab />}
                {activeTab === 'watchlist' && <WatchlistTab />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sticky Footer with enhancements */}
          <motion.footer
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.45 }}
            className="mt-auto bg-muted/30"
          >
            {/* Gradient accent line at top with shimmer animation */}
            <div className="shimmer-line h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 bg-[length:200%_100%]" />
            <div className="py-3">
              <div className="flex flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row md:px-6">
                {/* Left section */}
                <div className="flex items-center gap-3">
                  <div className="flex size-5 items-center justify-center rounded bg-emerald-600 text-white">
                    <Car className="size-3" />
                  </div>
                  <span className="font-medium">Copart Lot Data Platform</span>
                  <span className="hidden text-muted-foreground/50 sm:inline">·</span>
                  <span className="hidden text-muted-foreground/50 sm:inline">v6.0.0</span>
                </div>
                {/* Right section */}
                <div className="flex items-center gap-3 text-muted-foreground/70">
                  {/* Database records */}
                  <span className="hidden sm:inline-flex items-center gap-1">
                    <Database className="size-3 text-muted-foreground/50" />
                    {dbRecordCount != null ? dbRecordCount.toLocaleString() : '—'} records
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  {/* System online */}
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {' '}System Online
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  {/* Current tab */}
                  <span className="hidden sm:inline font-medium text-foreground/60">{pageTitle}</span>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  <span className="hidden sm:inline">7 tabs</span>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  <span className="hidden sm:inline">13 phases</span>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  {/* Made with heart + copyright */}
                  <span className="hidden sm:inline-flex items-center gap-1">
                    Made with <Heart className="size-3 text-rose-500 fill-rose-500" /> © {new Date().getFullYear()}
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  {/* Built with Next.js 16 */}
                  <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors duration-200">
                    Built with
                    <span className="font-medium text-foreground/70">Next.js 16</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.footer>
        </div>
      </SidebarInset>

      {/* Compare Panel */}
      <ComparePanel />

      {/* Lot Lookup Detail Sheet */}
      <VehicleDetailSheet
        vehicle={searchedLot}
        open={lotDetailOpen}
        onOpenChange={setLotDetailOpen}
      />

      {/* Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Back to Top Button */}
      <BackToTop />
    </SidebarProvider>
  )
}
