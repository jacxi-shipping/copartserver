'use client'

import React from 'react'
import { Columns3, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export interface ColumnOption {
  key: string
  label: string
  defaultVisible: boolean
}

interface ColumnToggleProps {
  columns: ColumnOption[]
  visibleColumns: string[]
  onToggle: (key: string) => void
  onReset: () => void
}

export function ColumnToggle({ columns, visibleColumns, onToggle, onReset }: ColumnToggleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="size-3.5" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <Checkbox
                checked={visibleColumns.includes(col.key)}
                onCheckedChange={() => onToggle(col.key)}
              />
              <span className="flex-1 truncate">{col.label}</span>
            </label>
          ))}
        </div>
        <Separator className="my-1.5" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={onReset}
        >
          <RotateCcw className="mr-1.5 size-3" />
          Reset to Default
        </Button>
      </PopoverContent>
    </Popover>
  )
}
