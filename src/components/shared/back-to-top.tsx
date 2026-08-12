'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Check if the main scrollable area is scrolled down
      const mainEl = document.querySelector('main')
      if (mainEl) {
        setVisible(mainEl.scrollTop > 400)
      } else {
        setVisible(window.scrollY > 400)
      }
    }

    const target = document.querySelector('main') || window
    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed right-6 bottom-20 z-50"
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="flex size-10 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl"
            aria-label="Back to top"
          >
            <ArrowUp className="size-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
