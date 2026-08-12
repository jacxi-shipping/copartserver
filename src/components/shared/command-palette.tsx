'use client'

import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  Search,
  Upload,
  CalendarClock,
  Calendar,
  Heart,
  Sun,
  Moon,
  Bell,
  Trash2,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAppStore } from '@/lib/store'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string
  keywords: string[]
  action: () => void
  group: 'navigation' | 'actions'
}

// ─── Platform detection ─────────────────────────────────────────────────────

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.platform?.toUpperCase().includes('MAC') ?? false
}

const modKey = isMac() ? '⌘' : 'Ctrl'

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { mounted, setTheme, theme } = useThemeState()
  const {
    setActiveTab,
    clearWatchlist,
    clearCompare,
    setNotificationOpen,
    watchlist,
    compareList,
  } = useAppStore()

  // ── Build command list with memoized actions ─────────────────────────────

  const commands = useMemo<CommandItem[]>(() => [
    // Navigation group
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      shortcut: '1',
      keywords: ['home', 'overview', 'stats', 'main'],
      group: 'navigation',
      action: () => {
        setActiveTab('dashboard')
        toast.info('Navigated to Dashboard')
      },
    },
    {
      id: 'nav-search',
      label: 'Search',
      icon: Search,
      shortcut: '2',
      keywords: ['find', 'query', 'filter', 'vehicles', 'browse'],
      group: 'navigation',
      action: () => {
        setActiveTab('search')
        toast.info('Navigated to Search')
      },
    },
    {
      id: 'nav-analytics',
      label: 'Analytics',
      icon: BarChart3,
      shortcut: '3',
      keywords: ['charts', 'market', 'data', 'insights', 'trends', 'statistics'],
      group: 'navigation',
      action: () => {
        setActiveTab('analytics')
        toast.info('Navigated to Analytics')
      },
    },
    {
      id: 'nav-import',
      label: 'Import',
      icon: Upload,
      shortcut: '4',
      keywords: ['upload', 'csv', 'data', 'file', 'bulk'],
      group: 'navigation',
      action: () => {
        setActiveTab('import')
        toast.info('Navigated to Import')
      },
    },
    {
      id: 'nav-upcoming',
      label: 'Upcoming Lots',
      icon: CalendarClock,
      shortcut: '5',
      keywords: ['future', 'scheduled', 'later', 'soon', 'calendar'],
      group: 'navigation',
      action: () => {
        setActiveTab('upcoming')
        toast.info('Navigated to Upcoming Lots')
      },
    },
    {
      id: 'nav-today',
      label: "Today's Lots",
      icon: Calendar,
      shortcut: '6',
      keywords: ['live', 'current', 'active', 'now', 'today'],
      group: 'navigation',
      action: () => {
        setActiveTab('today')
        toast.info('Navigated to Today\'s Lots')
      },
    },
    {
      id: 'nav-watchlist',
      label: 'Watchlist',
      icon: Heart,
      shortcut: '7',
      keywords: ['favorites', 'saved', 'tracked', 'heart'],
      group: 'navigation',
      action: () => {
        setActiveTab('watchlist')
        toast.info('Navigated to Watchlist')
      },
    },
    // Actions group
    {
      id: 'action-toggle-theme',
      label: 'Toggle Theme',
      icon: theme === 'dark' ? Sun : Moon,
      keywords: ['dark', 'light', 'mode', 'appearance', 'switch'],
      group: 'actions',
      action: () => {
        if (mounted) setTheme(theme === 'dark' ? 'light' : 'dark')
      },
    },
    {
      id: 'action-clear-watchlist',
      label: 'Clear Watchlist',
      icon: Trash2,
      keywords: ['remove', 'delete', 'reset', 'favorites', 'unwatch'],
      group: 'actions',
      action: () => {
        if (watchlist.length === 0) {
          toast.info('Watchlist is already empty')
          return
        }
        clearWatchlist()
        toast.success(`Cleared ${watchlist.length} items from watchlist`)
      },
    },
    {
      id: 'action-clear-compare',
      label: 'Clear Compare List',
      icon: Trash2,
      keywords: ['remove', 'delete', 'reset', 'comparison'],
      group: 'actions',
      action: () => {
        if (compareList.length === 0) {
          toast.info('Compare list is already empty')
          return
        }
        clearCompare()
        toast.success('Cleared compare list')
      },
    },
    {
      id: 'action-open-activity',
      label: 'Open Activity Feed',
      icon: Bell,
      keywords: ['notifications', 'history', 'log', 'recent', 'events'],
      group: 'actions',
      action: () => {
        setNotificationOpen(true)
      },
    },
    {
      id: 'action-focus-search',
      label: 'Focus Quick Search',
      icon: Search,
      shortcut: '/',
      keywords: ['header', 'search bar', 'input', 'focus'],
      group: 'actions',
      action: () => {
        // Delay slightly so the dialog has time to close
        setTimeout(() => {
          const desktopInput = document.querySelector<HTMLInputElement>('[data-quick-search]')
          const mobileInput = document.querySelector<HTMLInputElement>('[data-mobile-search]')
          desktopInput?.focus()
          mobileInput?.focus()
        }, 100)
      },
    },
  ], [setActiveTab, clearWatchlist, clearCompare, setNotificationOpen, setTheme, theme, mounted, watchlist.length, compareList.length])

  // ── Filtered commands by group ───────────────────────────────────────────

  const navigationCommands = useMemo(
    () => commands.filter((c) => c.group === 'navigation'),
    [commands],
  )

  const actionCommands = useMemo(
    () => commands.filter((c) => c.group === 'actions'),
    [commands],
  )

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Execute command and close ─────────────────────────────────────────────

  const handleSelect = useCallback((cmd: CommandItem) => {
    cmd.action()
    setOpen(false)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
      />
      <CommandList className="max-h-80">
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => handleSelect(cmd)}
              className="data-[selected=true]:bg-emerald-500/10 data-[selected=true]:text-emerald-700 dark:data-[selected=true]:text-emerald-400 cursor-pointer"
            >
              <cmd.icon className="size-4 text-muted-foreground data-[selected=true]:text-emerald-600 dark:data-[selected=true]:text-emerald-400" />
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <CommandShortcut className="text-muted-foreground/60">
                  {cmd.shortcut}
                </CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              onSelect={() => handleSelect(cmd)}
              className="data-[selected=true]:bg-emerald-500/10 data-[selected=true]:text-emerald-700 dark:data-[selected=true]:text-emerald-400 cursor-pointer"
            >
              <cmd.icon className="size-4 text-muted-foreground data-[selected=true]:text-emerald-600 dark:data-[selected=true]:text-emerald-400" />
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <CommandShortcut className="text-muted-foreground/60">
                  {cmd.shortcut}
                </CommandShortcut>
              )}
              {cmd.id === 'action-toggle-theme' && (
                <CommandShortcut className="text-muted-foreground/60">
                  {modKey}+K
                </CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

// ─── Helper: safe theme hook (handles SSR) ─────────────────────────────────

function useThemeState() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return {
    mounted,
    theme: mounted ? resolvedTheme : 'light',
    setTheme,
  }
}
