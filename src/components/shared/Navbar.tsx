'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Upload, GitCompare, Settings } from 'lucide-react'
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

  return (
    <nav className="bg-lusu-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Image
              src="/lusu-lens/logos/lusu.png"
              alt="LUSU"
              width={40}
              height={40}
              className="rounded"
            />
            <span className="text-xl font-bold tracking-tight">
              LUSU <span className="text-lusu-cyan">Lens</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href ||
                (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-lusu-cyan/20 text-lusu-cyan'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
