'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Upload, CalendarClock, Download, ArrowRight, Bell, Eye, Heart, GitCompare, Filter, Clock, CheckSquare, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore, type ActivityItem } from '@/lib/store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getRelativeTime } from '@/lib/format'

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.2 },
}

interface QuickActionConfig {
  label: string
  description: string
  icon: typeof Upload
  tab: string
  accentGradient: string
  iconBg: string
  iconBgHover: string
  iconColor: string
  hoverBorder: string
  hoverBg: string
  shortcut: string
  countKey?: 'watchlist'
  countColor: string
}

const actions: QuickActionConfig[] = [
  {
    label: 'Import CSV',
    description: 'Upload lot data from a CSV file',
    icon: Upload,
    tab: 'import',
    accentGradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/60 dark:to-emerald-800/40',
    iconBgHover: 'bg-gradient-to-br from-emerald-200 to-emerald-300 dark:from-emerald-800/60 dark:to-emerald-700/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
    shortcut: '⌘I',
    countColor: 'bg-emerald-500',
  },
  {
    label: 'Search Vehicles',
    description: 'Find vehicles by make, model, year, and more',
    icon: Search,
    tab: 'search',
    accentGradient: 'from-teal-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/60 dark:to-teal-800/40',
    iconBgHover: 'bg-gradient-to-br from-teal-200 to-teal-300 dark:from-teal-800/60 dark:to-teal-700/50',
    iconColor: 'text-teal-600 dark:text-teal-400',
    hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-600',
    hoverBg: 'hover:bg-teal-50/50 dark:hover:bg-teal-950/20',
    shortcut: '/',
    countColor: 'bg-teal-500',
  },
  {
    label: 'View Upcoming',
    description: 'Browse upcoming lots',
    icon: CalendarClock,
    tab: 'upcoming',
    accentGradient: 'from-amber-400 to-amber-600',
    iconBg: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/40',
    iconBgHover: 'bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-800/60 dark:to-amber-700/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
    shortcut: '⌘U',
    countColor: 'bg-amber-500',
  },
  {
    label: 'Export Data',
    description: 'Download filtered lot data as CSV',
    icon: Download,
    tab: 'search',
    accentGradient: 'from-rose-400 to-rose-600',
    iconBg: 'bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/60 dark:to-rose-800/40',
    iconBgHover: 'bg-gradient-to-br from-rose-200 to-rose-300 dark:from-rose-800/60 dark:to-rose-700/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
    hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
    shortcut: '⌘E',
    countColor: 'bg-rose-500',
  },
]

// ─── Activity Icon Mapping ─────────────────────────────────────────────────

const iconMap: Record<string, typeof Eye> = {
  search: Search,
  heart: Heart,
  'git-compare': GitCompare,
  download: Download,
  upload: Upload,
  eye: Eye,
  filter: Filter,
  'check-square': CheckSquare,
  list: List,
  clock: Clock,
}

function getActivityIconComponent(iconName: string) {
  return iconMap[iconName] ?? List
}

const accentColors: Record<string, string> = {
  search: 'border-l-teal-400',
  heart: 'border-l-rose-400',
  'git-compare': 'border-l-amber-400',
  download: 'border-l-emerald-400',
  upload: 'border-l-emerald-400',
  eye: 'border-l-sky-400',
  filter: 'border-l-violet-400',
  'check-square': 'border-l-cyan-400',
  list: 'border-l-gray-400',
  clock: 'border-l-gray-400',
}

// ─── Recent Activity Mini-Feed ──────────────────────────────────────────────

function RecentActivityFeed() {
  const { activities } = useAppStore()
  const recent = activities.slice(0, 3)

  if (recent.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <Bell className="size-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground/70 py-3 text-center">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
            {activities.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-0">
        {recent.map((activity: ActivityItem, i: number) => {
          const IconComp = getActivityIconComponent(activity.icon)
          const borderColor = accentColors[activity.icon] ?? 'border-l-gray-400'
          return (
            <div key={activity.id}>
              {i > 0 && <div className="border-t border-border/40 my-2" />}
              <div className={`flex items-start gap-2.5 border-l-2 pl-2.5 py-0.5 ${borderColor}`}>
                <IconComp className="size-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate leading-tight">{activity.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {getRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Quick Action Button ───────────────────────────────────────────────────

function QuickActionButton({ action, index }: { action: QuickActionConfig; index: number }) {
  const { setActiveTab, watchlist } = useAppStore()
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = () => {
    // Press-down micro animation
    setIsPressed(true)
    setTimeout(() => {
      setIsPressed(false)
      setActiveTab(action.tab)
    }, 120)
  }

  const count = action.countKey === 'watchlist' ? watchlist.length : 0

  return (
    <motion.div {...scaleIn} transition={{ delay: index * 0.06 }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={`group/action h-auto w-full flex-col items-start gap-2.5 border p-4 transition-all duration-200 ${action.hoverBorder} ${action.hoverBg} hover:shadow-md relative overflow-hidden`}
            onClick={handleClick}
          >
            {/* Animated gradient border shimmer on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/action:opacity-100">
              <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${action.accentGradient} p-[1.5px]`} style={{ animation: 'gradientBorder 2.5s ease infinite', backgroundSize: '200% 200%' }}>
                <div className="h-full w-full rounded-[7px] bg-card" />
              </div>
            </div>

            <div className="relative flex w-full items-start justify-between">
              <motion.div
                className={`flex size-11 items-center justify-center rounded-xl ${action.iconBg} transition-all duration-200 group-hover/action:scale-110 group-hover/action:${action.iconBgHover}`}
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
              >
                <action.icon className={`size-5 ${action.iconColor}`} />
              </motion.div>
              {/* Keyboard shortcut badge */}
              <span className="kbd text-[9px] opacity-60 group-hover/action:opacity-100 transition-opacity duration-200">{action.shortcut}</span>
            </div>
            <div className="text-left w-full">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold">{action.label}</p>
                {count > 0 && (
                  <Badge className={`h-4 min-w-4 px-1 text-[9px] ${action.countColor} text-white border-0`}>{count}</Badge>
                )}
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground mt-0.5">
                {action.description}
              </p>
            </div>
            {/* Arrow icon on hover */}
            <ArrowRight className={`absolute right-3 bottom-3 size-3.5 text-muted-foreground/0 transition-all duration-200 group-hover/action:text-muted-foreground/50 group-hover/action:translate-x-0.5`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{action.label}</p>
          <p className="text-[10px] text-muted-foreground">Shortcut: {action.shortcut}</p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  )
}

export function QuickActions() {
  return (
    <div className="space-y-4">
      <motion.div {...staggerContainer} animate className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <QuickActionButton key={action.label} action={action} index={i} />
        ))}
      </motion.div>
      <RecentActivityFeed />
    </div>
  )
}
