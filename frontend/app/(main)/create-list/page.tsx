'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Globe, Lock } from 'lucide-react'
import { listsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function CreateListPage() {
  const router = useRouter()
  const { token, user } = useAuthStore()

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isPublic, setIsPublic] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!token) {
      router.push('/login')
    }
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('List name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const list = await listsApi.create({
        name: name.trim(),
        description: description.trim(),
        isPublic,
      }, token!)
      router.push(`/list/${list.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create list')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl px-4">
      <Link href="/my-lists" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to My Lists
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-8">Create New List</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">List Name</label>
            <Input
              type="text"
              placeholder="My Favorite Albums"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Description (optional)</label>
            <textarea
              placeholder="A brief description of this list..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-white placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">Visibility</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-4 transition-all ${
                  isPublic
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface-elevated text-zinc-400 hover:border-primary/50'
                }`}
              >
                <Globe className="h-5 w-5" />
                <span className="font-medium">Public</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-4 transition-all ${
                  !isPublic
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border bg-surface-elevated text-zinc-400 hover:border-warning/50'
                }`}
              >
                <Lock className="h-5 w-5" />
                <span className="font-medium">Private</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              {isPublic
                ? 'Everyone can see this list'
                : 'Only you can see this list'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              Create List
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
