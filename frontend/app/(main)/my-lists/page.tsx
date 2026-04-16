'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ListMusic, Plus, Trash2, Edit2, Lock, Globe } from 'lucide-react'
import { listsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function MyListsPage() {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const [lists, setLists] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadLists()
  }, [token])

  async function loadLists() {
    try {
      const data = await listsApi.getMyLists(token!)
      setLists(data)
    } catch (error) {
      console.error('Failed to load lists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return
    try {
      await listsApi.delete(listId, token!)
      setLists(prev => prev.filter(l => l.id !== listId))
    } catch (error) {
      console.error('Failed to delete list:', error)
    }
  }

  const handleTogglePrivacy = async (list: any) => {
    try {
      const updated = await listsApi.update(list.id, { isPublic: !list.isPublic }, token!)
      setLists(prev => prev.map(l => l.id === list.id ? { ...l, isPublic: updated.isPublic } : l))
    } catch (error) {
      console.error('Failed to update list:', error)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Lists</h1>
        <Link href="/create-list">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-elevated p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : lists.length > 0 ? (
        <div className="space-y-4">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link href={`/list/${list.id}`} className="hover:text-primary transition-colors">
                    <h3 className="font-semibold text-lg">{list.name}</h3>
                  </Link>
                  {list.description && (
                    <p className="text-sm text-zinc-500 mt-1">{list.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <Badge variant={list.isPublic ? 'success' : 'warning'} className="gap-1">
                      {list.isPublic ? (
                        <><Globe className="h-3 w-3" /> Public</>
                      ) : (
                        <><Lock className="h-3 w-3" /> Private</>
                      )}
                    </Badge>
                    <span className="text-sm text-zinc-500">{list.itemsCount || list.items?.length || 0} albums</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePrivacy(list)}
                    title={list.isPublic ? 'Make private' : 'Make public'}
                  >
                    {list.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Link href={`/edit-list/${list.id}`}>
                    <Button variant="ghost" size="icon">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-error hover:text-error"
                    onClick={() => handleDelete(list.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
          <ListMusic className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">No lists yet</h3>
          <p className="text-zinc-500 mt-2">Create your first list to organize your favorite albums!</p>
          <Link href="/create-list">
            <Button className="mt-4">Create a List</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
