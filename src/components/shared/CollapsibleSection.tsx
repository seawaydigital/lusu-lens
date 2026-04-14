'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  id: string
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleSection({
  id,
  label,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section id={id}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex items-center gap-3 w-full text-left ${open ? 'mb-6' : 'mb-2'}`}
      >
        <span className="section-label">{label}</span>
        <span className="flex-1 h-px bg-gray-200" />
        <ChevronDown
          size={15}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ml-1 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      {open && children}
    </section>
  )
}
