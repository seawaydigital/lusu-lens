'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Upload, GitCompare, Settings, Menu, X } from 'lucide-react'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/', label: 'Upload', icon: Upload },
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/study', label: 'The Study', icon: BarChart3 },
  { href: '/dashboard/outpost', label: 'The Outpost', icon: BarChart3 },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/manage', label: 'Manage', icon: Settings },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    return pathname === href ||
      (href !== '/' &&
       pathname.startsWith(href + '/') &&
       !NAV_ITEMS.some(
         other => other.href !== href &&
                  other.href.startsWith(href) &&
                  pathname.startsWith(other.href)
       ))
  }

  return (
    <nav className="bg-lusu-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Image
              src="/lusu-lens/logos/lusu.png"
              alt="LUSU"
              width={70}
              height={40}
              className="object-contain"
            />
            <span className="text-xl font-bold tracking-tight">
              LUSU <span className="text-lusu-cyan">Lens</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-lusu-cyan/20 text-lusu-cyan'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10">
          <div className="px-4 py-2 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-lusu-cyan/20 text-lusu-cyan'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
