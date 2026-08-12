'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { SavedSearch } from '@/lib/store'
import { getRelativeTime } from '@/lib/format'

interface SavedSearchesProps {
  onRestore: (search: SavedSearch) => void
}

export function SavedSearches({ onRestore }: SavedSearchesProps) {
  const [open, setOpen] = React.useState(false)
  const { savedSearches, deleteSavedSearch, clearSavedSearches } = useAppStore()

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground">
          <Bookmark className="size-3.5" />
          Saved Searches
          {savedSearches.length > 0 && (
            <span className="ml-1 rounded-full bg-muted-foreground/10 px-1.5 text-[10px] font-semibold tabular-nums">
              {savedSearches.length}
            </span>
          )}
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </CollapsibleTrigger>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5">
                {savedSearches.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    <Search className="size-3.5 shrink-0 opacity-50" />
                    <span>No saved searches yet. Search for something and click the save icon.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence mode="popLayout">
                        {savedSearches.map((search) => (
                          <motion.div
                            key={search.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            className="group flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs shadow-sm transition-colors hover:bg-accent cursor-pointer"
                            onClick={() => onRestore(search)}
                          >
                            <Bookmark className="size-3 text-muted-foreground" />
                            <span className="max-w-[180px] truncate font-medium">{search.label}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{getRelativeTime(search.createdAt)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSavedSearch(search.id)
                              }}
                              className="ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                              aria-label={`Delete saved search: ${search.label}`}
                            >
                              <X className="size-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    {savedSearches.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={clearSavedSearches}
                      >
                        <Trash2 className="mr-1 size-3" />
                        Clear All ({savedSearches.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CollapsibleContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  )
}
