'use client'

import React from 'react'
import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ─── Shortcut Category Definition ──────────────────────────────────────────────

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  title: string
  shortcuts: ShortcutEntry[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['/'], description: 'Focus search bar' },
      { keys: ['1'], description: 'Switch to Dashboard' },
      { keys: ['2'], description: 'Switch to Search' },
      { keys: ['3'], description: 'Switch to Analytics' },
      { keys: ['4'], description: 'Switch to Import' },
      { keys: ['5'], description: 'Switch to Upcoming Lots' },
      { keys: ['6'], description: "Switch to Today's Lots" },
      { keys: ['7'], description: 'Switch to Watchlist' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', 'D'], description: 'Toggle dark / light theme' },
      { keys: ['Esc'], description: 'Close panels & dialogs' },
    ],
  },
  {
    title: 'Search',
    shortcuts: [
      { keys: ['Enter'], description: 'Execute search' },
      { keys: ['Ctrl', 'Click'], description: 'Open vehicle detail' },
    ],
  },
]

// ─── Kbd Badge ─────────────────────────────────────────────────────────────────

function KbdBadge({ label }: { label: string }) {
  return <kbd className="kbd">{label}</kbd>
}

// ─── Shortcut Row ───────────────────────────────────────────────────────────────

function ShortcutRow({ shortcut }: { shortcut: ShortcutEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{shortcut.description}</span>
      <div className="flex items-center gap-1 shrink-0">
        {shortcut.keys.map((key, i) => (
          <React.Fragment key={key}>
            {i > 0 && <span className="text-xs text-muted-foreground/50 mr-0.5">+</span>}
            <KbdBadge label={key} />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ─── Category Section ──────────────────────────────────────────────────────────

function CategorySection({ category, isLast }: { category: ShortcutCategory; isLast: boolean }) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
        {category.title}
      </h3>
      <div className="space-y-0.5">
        {category.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.description} shortcut={shortcut} />
        ))}
      </div>
      {!isLast && <Separator className="mt-3 mb-3" />}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Keyboard className="size-4 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
              <DialogDescription>
                Navigate and control the app faster with these shortcuts.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="-mx-2 px-2 max-h-72 overflow-y-auto scrollbar-none">
          {shortcutCategories.map((category, idx) => (
            <CategorySection
              key={category.title}
              category={category}
              isLast={idx === shortcutCategories.length - 1}
            />
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="tabular-nums"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
