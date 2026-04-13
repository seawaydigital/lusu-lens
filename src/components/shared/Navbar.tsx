'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Upload, LayoutDashboard, Coffee, Zap, TrendingUp, SlidersHorizontal, Menu, X } from 'lucide-react'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/',                   label: 'Upload',      icon: Upload },
  { href: '/dashboard',          label: 'Overview',    icon: LayoutDashboard },
  { href: '/dashboard/study',    label: 'The Study',   icon: Coffee },
  { href: '/dashboard/outpost',  label: 'The Outpost', icon: Zap },
  { href: '/compare',            label: 'Compare',     icon: TrendingUp },
  { href: '/manage',             label: 'Manage',      icon: SlidersHorizontal },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    return (
      pathname === href ||
      (href !== '/' &&
        pathname.startsWith(href + '/') &&
        !NAV_ITEMS.some(
          other =>
            other.href !== href &&
            other.href.startsWith(href) &&
            pathname.startsWith(other.href)
        ))
    )
  }

  return (
    <nav className="bg-lusu-navy text-white sticky top-0 z-40 shadow-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px]">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/lusu-lens/logos/lusu.png"
              alt="LUSU"
              width={56}
              height={32}
              className="object-contain"
            />
            <div className="hidden sm:block">
              <span className="text-[15px] font-bold tracking-tight text-white leading-none">
                LUSU <span className="text-lusu-cyan">Lens</span>
              </span>
              <p className="text-[10px] text-white/40 tracking-widest uppercase leading-none mt-0.5">
                Business Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-white/55 hover:text-white/90'
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                  {active && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-lusu-cyan rounded-t-sm" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.08]">
          <div className="px-4 py-3 space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-lusu-cyan" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
