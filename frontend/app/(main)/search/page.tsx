'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Disc, Music } from 'lucide-react'
import { spotifyApi, SpotifyAlbum, SpotifyTrack } from '@/lib/api'
import { AlbumCard } from '@/components/album/album-card'
import { AlbumCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = React.useState(initialQuery)
  const [type, setType] = React.useState<'album' | 'track' | 'both'>('both')
  const [albums, setAlbums] = React.useState<SpotifyAlbum[]>([])
  const [tracks, setTracks] = React.useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  React.useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery, type)
    }
  }, [])

  const handleSearch = async (searchQuery: string, searchType: 'album' | 'track' | 'both' = type) => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setHasSearched(true)
    setQuery(searchQuery)
    setType(searchType)

    router.push(`/search?q=${encodeURIComponent(searchQuery)}`, { scroll: false })

    try {
      const results = await spotifyApi.search(searchQuery, searchType, 50)
      setAlbums(results.albums.items)
      setTracks(results.tracks.items)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query, type)
  }

  const typeFilters = [
    { value: 'both', label: 'All', icon: Search },
    { value: 'album', label: 'Albums', icon: Disc },
    { value: 'track', label: 'Tracks', icon: Music },
  ] as const

  return (
    <div className="mx-auto max-w-7xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-6">Search</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search albums, tracks, or artists..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button type="submit" size="lg" isLoading={isLoading}>
              Search
            </Button>
          </div>

          <div className="flex gap-2">
            {typeFilters.map((filter) => {
              const Icon = filter.icon
              const isActive = type === filter.value
              return (
                <Button
                  key={filter.value}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setType(filter.value)
                    if (query) handleSearch(query, filter.value)
                  }}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                </Button>
              )
            })}
          </div>
        </form>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      ) : hasSearched ? (
        <>
          {(type === 'both' || type === 'album') && albums.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Disc className="h-5 w-5 text-primary" />
                Albums ({albums.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {albums.map((album, index) => (
                  <AlbumCard key={album.id} album={album} index={index} />
                ))}
              </div>
            </section>
          )}

          {(type === 'both' || type === 'track') && tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Music className="h-5 w-5 text-secondary" />
                Tracks ({tracks.length})
              </h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-border bg-surface">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">#</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Title</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tracks.map((track, index) => (
                      <tr key={track.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3 text-sm text-zinc-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{track.name}</p>
                          <p className="text-sm text-zinc-500">{track.artists?.[0]?.name}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-zinc-500 font-mono">
                          {Math.floor(track.duration_ms / 60000)}:{(track.duration_ms % 60000 / 1000).toFixed(0).padStart(2, '0')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {albums.length === 0 && tracks.length === 0 && (
            <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
              <Search className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium">No results found</h3>
              <p className="text-zinc-500 mt-2">Try different keywords or check the spelling</p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium">Start searching</h3>
          <p className="text-zinc-500 mt-2">Enter a search term to find albums, tracks, and artists</p>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4"><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{Array.from({ length: 10 }, (_, i) => (<div key={i} className="skeleton h-64 rounded-xl" />))}</div></div>}>
      <SearchContent />
    </Suspense>
  )
}
