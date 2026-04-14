'use client'

import { useState, useEffect } from 'react'

export interface NavSection {
  id: string
  label: string
}

interface SectionNavProps {
  sections: NavSection[]
}

export default function SectionNav({ sections }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id)
        },
        // Top 10% of viewport is excluded so active section updates
        // as the next section scrolls into view from the bottom
        { threshold: 0.15, rootMargin: '-10% 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [sections])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-end gap-3"
      aria-label="Page sections"
    >
      {sections.map(({ id, label }) => {
        const isActive = activeId === id
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="group flex items-center gap-2.5"
            aria-label={`Jump to ${label}`}
          >
            <span
              className={`text-[11px] font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'text-gray-800 opacity-100'
                  : 'text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-gray-600'
              }`}
            >
              {label}
            </span>
            <span
              className={`rounded-full transition-all duration-150 shrink-0 ${
                isActive
                  ? 'w-2.5 h-2.5 bg-gray-800'
                  : 'w-2 h-2 bg-gray-300 group-hover:bg-gray-500'
              }`}
            />
          </button>
        )
      })}
    </nav>
  )
}
