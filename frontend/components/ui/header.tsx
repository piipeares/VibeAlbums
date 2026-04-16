'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search,
  Home,
  ListMusic,
  User,
  LogOut,
  Plus,
  Music
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { Button } from './button'
import { Input } from './input'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

interface HeaderProps {
  onSearch?: (query: string) => void
  searchQuery?: string
}

export function Header({ onSearch, searchQuery = '' }: HeaderProps) {
  const pathname = usePathname()
  const { user, token, clearAuth } = useAuthStore()
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [showUserMenu, setShowUserMenu] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { href: '/explore', label: 'Explorar', icon: Home },
    { href: '/lists', label: 'Listas', icon: ListMusic },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'glass' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/explore" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">VibeAlbums</span>
        </Link>

        {/* Search */}
        {onSearch && (
          <div className="hidden flex-1 justify-center px-8 md:flex">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="search"
                placeholder="Buscar albums, canciones..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'gap-2',
                      isActive && 'bg-surface-hover text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-hover transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-surface-elevated p-2 shadow-xl"
                  >
                    <div className="px-3 py-2">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-zinc-500">@{user.username}</p>
                    </div>
                    <div className="mt-2 border-t border-border pt-2">
                      <Link href={`/user/${user.username}`}>
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                          <User className="h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link href="/my-lists">
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                          <ListMusic className="h-4 w-4" />
                          My Lists
                        </Button>
                      </Link>
                      <Link href="/create-list">
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                          <Plus className="h-4 w-4" />
                          Create List
                        </Button>
                      </Link>
                    </div>
                    <div className="mt-2 border-t border-border pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-error hover:text-error"
                        onClick={clearAuth}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Mobile search */}
      {onSearch && (
        <div className="flex px-4 pb-3 md:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}
    </header>
  )
}
