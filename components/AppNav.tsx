'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/generate', label: 'Generate' },
  { href: '/settings', label: 'Settings' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {links.map(({ href, label }) => {
        const active =
          href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-forest-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
