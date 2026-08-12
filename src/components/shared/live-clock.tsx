'use client'

import React, { useState, useEffect } from 'react'

export function LiveClock() {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
      setDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="hidden items-center gap-2 md:flex">
      <div className="text-right">
        <div className="text-xs font-mono tabular-nums leading-none text-muted-foreground">
          {time}
        </div>
        <div className="text-[10px] leading-none text-muted-foreground/60 mt-0.5">
          {date}
        </div>
      </div>
    </div>
  )
}
