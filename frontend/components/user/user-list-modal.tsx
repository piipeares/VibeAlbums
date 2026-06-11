'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { X, Users } from 'lucide-react'
import { usersApi, User } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserListModalProps {
  username: string
  type: 'followers' | 'following'
  isOpen: boolean
  onClose: () => void
}

export function UserListModal({ username, type, isOpen, onClose }: UserListModalProps) {
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) return

    async function load() {
      setIsLoading(true)
      try {
        const data = type === 'followers'
          ? await usersApi.getFollowers(username)
          : await usersApi.getFollowing(username)
        setUsers(data)
      } catch (err) {
        console.error('Failed to load users:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [isOpen, username, type])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl border border-border bg-surface-elevated"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">
              {type === 'followers' ? 'Followers' : 'Following'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-surface-hover hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Users className="mx-auto h-8 w-8 mb-2 text-zinc-600" />
              <p>No {type} yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/user/${u.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{u.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{u.displayName}</p>
                    <p className="truncate text-xs text-zinc-500">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
