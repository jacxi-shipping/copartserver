'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Search,
  Heart,
  GitCompare,
  Download,
  Upload,
  Eye,
  Filter,
  CheckSquare,
  List,
  Trash2,
  Clock,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore, type ActivityItem, type ActivityIcon } from '@/lib/store'

// ─── Icon mapper ───────────────────────────────────────────────────────────────

const iconMap: Record<ActivityIcon, typeof Bell> = {
  search: Search,
  heart: Heart,
  'git-compare': GitCompare,
  download: Download,
  upload: Upload,
  eye: Eye,
  filter: Filter,
  'check-square': CheckSquare,
  list: List,
}

const iconColorMap: Record<ActivityIcon, string> = {
  search: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50',
  heart: 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
  'git-compare': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
  download: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
  upload: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50',
  eye: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50',
  filter: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50',
  'check-square': 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
  list: 'text-muted-foreground bg-muted',
}

// ─── Time formatter ────────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ activity, isLatest }: { activity: ActivityItem; isLatest: boolean }) {
  const IconComponent = iconMap[activity.icon] || List
  const colorClasses = iconColorMap[activity.icon] || iconColorMap.list

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, x: -12 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
    >
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${colorClasses} transition-transform duration-200 group-hover:scale-110`}>
        <IconComponent className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-tight">{activity.label}</p>
        {activity.description && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {activity.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Clock className="size-2.5" />
          {formatTimeAgo(activity.timestamp)}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ActivityFeed() {
  const { activities, unreadCount, notificationOpen, setNotificationOpen, markAllRead, clearActivities } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-refresh timestamps every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t: number) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Mark as read when opening
  useEffect(() => {
    if (notificationOpen) {
      markAllRead()
    }
  }, [notificationOpen, markAllRead])

  return (
    <>
      {/* Trigger Button in header */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            onClick={() => setNotificationOpen(true)}
            aria-label="Activity feed"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Activity Feed{unreadCount > 0 ? ` (${unreadCount} new)` : ''}</p>
        </TooltipContent>
      </Tooltip>

      {/* Drawer */}
      <Sheet open={notificationOpen} onOpenChange={setNotificationOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4" />
                Activity Feed
                {activities.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {activities.length} event{activities.length !== 1 ? 's' : ''}
                  </span>
                )}
              </SheetTitle>
              {activities.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                  onClick={clearActivities}
                >
                  <Trash2 className="mr-1 size-3" />
                  Clear
                </Button>
              )}
            </div>
          </SheetHeader>

          <Separator />

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
                <Bell className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Your actions will appear here as you browse and interact with the platform.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-100px)]" ref={scrollRef}>
              <div className="divide-y divide-border/50 p-2">
                {activities.map((activity, i) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    isLatest={i === 0}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
