'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, User } from 'lucide-react'
import { usersApi, UserSearchResult } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function UsersPage() {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<UserSearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setHasSearched(true)
    try {
      const data = await usersApi.search(query.trim())
      setResults(data)
    } catch (err) {
      console.error('Search users failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-6">Discover Users</h1>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by username or display name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button type="submit" size="lg" isLoading={isLoading}>
              Search
            </Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
            <User className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">No users found</h3>
            <p className="text-zinc-500 mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((u) => (
              <Link
                key={u.id}
                href={`/user/${u.username}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-4 hover:border-primary/30 transition-all"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback className="text-lg">{u.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.displayName}</p>
                  <p className="text-sm text-zinc-500">@{u.username}</p>
                  {u.bio && (
                    <p className="mt-1 text-sm text-zinc-400 line-clamp-1">{u.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!hasSearched && (
          <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium">Find people</h3>
            <p className="text-zinc-500 mt-2">
              Search for users by username or display name
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
