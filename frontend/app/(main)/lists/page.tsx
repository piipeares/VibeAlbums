'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ListMusic, Plus } from 'lucide-react'
import { listsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function ListsPage() {
  const { token } = useAuthStore()
  const [lists, setLists] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadLists() {
      try {
        const data = await listsApi.getPublicLists({ limit: 50 })
        setLists(data.lists)
      } catch (error) {
        console.error('Failed to load lists:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadLists()
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Public Lists</h1>
        {token && (
          <Link href="/create-list">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-elevated p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : lists.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/list/${list.id}`}>
                <div className="group rounded-xl border border-border bg-surface-elevated p-4 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                        {list.name}
                      </h3>
                      {list.description && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{list.description}</p>
                      )}
                    </div>
                    {!list.isPublic && (
                      <Badge variant="outline" className="ml-2 shrink-0">Private</Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={list.user?.avatar}
                        alt={list.user?.displayName}
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="text-sm text-zinc-500">
                        {list.user?.displayName}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500 flex items-center gap-1">
                      <ListMusic className="h-4 w-4" />
                      {list.itemsCount}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
          <ListMusic className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">No public lists yet</h3>
          <p className="text-zinc-500 mt-2">Be the first to create and share a list!</p>
          {token && (
            <Link href="/create-list">
              <Button className="mt-4">Create a List</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
