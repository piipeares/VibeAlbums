'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, GripVertical, Calendar, User } from 'lucide-react'
import { listsApi, spotifyApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function ListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const listId = params.id as string
  const { token } = useAuthStore()

  const [list, setList] = React.useState<any>(null)
  const [albumDetails, setAlbumDetails] = React.useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [addingAlbum, setAddingAlbum] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])

  const isOwner = list?.isOwner

  React.useEffect(() => {
    loadList()
  }, [listId])

  async function loadList() {
    try {
      const data = await listsApi.get(listId, token || undefined)
      setList(data)

      // Load album details for items
      if (data.items?.length > 0) {
        const details: Record<string, any> = {}
        await Promise.all(
          data.items.map(async (item: any) => {
            try {
              const album = await spotifyApi.getAlbum(item.albumId)
              details[item.albumId] = album
            } catch {
              // Album might not be available
            }
          })
        )
        setAlbumDetails(details)
      }
    } catch (error) {
      console.error('Failed to load list:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    try {
      const results = await spotifyApi.search(query, 'album', 10)
      // Filter out albums already in the list
      const existingIds = new Set(list?.items?.map((i: any) => i.albumId) || [])
      setSearchResults(results.albums.items.filter((a: any) => !existingIds.has(a.id)))
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleAddAlbum = async (album: any) => {
    if (!token) return
    try {
      await listsApi.addItem(listId, {
        albumId: album.id,
        albumName: album.name,
        albumArtist: album.artists?.[0]?.name || '',
        albumImage: album.images?.[0]?.url || '',
      }, token)
      setList({ ...list, items: [...list.items, { albumId: album.id, albumName: album.name, albumArtist: album.artists?.[0]?.name, albumImage: album.images?.[0]?.url, addedAt: new Date().toISOString() }] })
      setSearchQuery('')
      setSearchResults([])
      setAddingAlbum(false)
    } catch (error) {
      console.error('Failed to add album:', error)
    }
  }

  const handleRemoveAlbum = async (albumId: string) => {
    if (!token) return
    try {
      await listsApi.removeItem(listId, albumId, token)
      setList({ ...list, items: list.items.filter((i: any) => i.albumId !== albumId) })
    } catch (error) {
      console.error('Failed to remove album:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-12 w-full max-w-md mb-8" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h1 className="text-2xl font-bold">List not found</h1>
        <Link href="/">
          <Button className="mt-4">Go Home</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4">
      <Link href={isOwner ? '/my-lists' : '/lists'} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{list.name}</h1>
              <Badge variant={list.isPublic ? 'success' : 'warning'}>
                {list.isPublic ? 'Public' : 'Private'}
              </Badge>
            </div>
            {list.description && (
              <p className="text-zinc-400 mb-4">{list.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <Link href={`/user/${list.user?.username}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                <img src={list.user?.avatar} alt="" className="h-5 w-5 rounded-full" />
                {list.user?.displayName}
              </Link>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(list.createdAt)}
              </span>
              <span>{list.items?.length || 0} albums</span>
            </div>
          </div>

          {isOwner && (
            <Button onClick={() => setAddingAlbum(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Albums
            </Button>
          )}
        </div>
      </motion.div>

      {/* Add Album Modal */}
      {addingAlbum && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-xl border border-border bg-surface-elevated p-6"
          >
            <h2 className="text-xl font-bold mb-4">Add Albums</h2>
            <input
              type="search"
              placeholder="Search for albums..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleAddAlbum(album)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-surface-hover transition-colors text-left"
                  >
                    <img
                      src={album.images?.[0]?.url}
                      alt={album.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{album.name}</p>
                      <p className="text-sm text-zinc-500 truncate">{album.artists?.[0]?.name}</p>
                    </div>
                    <Plus className="h-5 w-5 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => {
                setAddingAlbum(false)
                setSearchQuery('')
                setSearchResults([])
              }}
            >
              Cancel
            </Button>
          </motion.div>
        </div>
      )}

      {/* Albums Grid */}
      {list.items?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.items.map((item: any, index: number) => (
            <motion.div
              key={item.albumId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex gap-4 rounded-xl border border-border bg-surface-elevated p-4"
            >
              {isOwner && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="h-5 w-5 text-zinc-500" />
                </div>
              )}
              <Link href={`/album/${item.albumId}`} className="shrink-0">
                <img
                  src={albumDetails[item.albumId]?.images?.[0]?.url || item.albumImage}
                  alt={item.albumName}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/album/${item.albumId}`} className="hover:text-primary transition-colors">
                  <h3 className="font-semibold truncate">{item.albumName}</h3>
                </Link>
                <p className="text-sm text-zinc-500 truncate">{item.albumArtist}</p>
                {item.note && (
                  <p className="text-xs text-zinc-400 mt-1">{item.note}</p>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => handleRemoveAlbum(item.albumId)}
                  className="shrink-0 p-2 text-zinc-500 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
          <p className="text-zinc-500">This list is empty</p>
          {isOwner && (
            <Button className="mt-4" onClick={() => setAddingAlbum(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Albums
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
