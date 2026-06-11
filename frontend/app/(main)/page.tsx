'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Search } from 'lucide-react'
import { spotifyApi, SpotifyAlbum } from '@/lib/api'
import { AlbumCard } from '@/components/album/album-card'
import { AlbumCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

// Popular queries to show on home page
const POPULAR_QUERIES = ['Rock', 'Pop', 'Hip Hop', 'Electronic', 'Jazz']

export default function HomePage() {
  const router = useRouter()
  const [featuredAlbums, setFeaturedAlbums] = React.useState<SpotifyAlbum[]>([])
  const [trending, setTrending] = React.useState<SpotifyAlbum[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        // Una sola llamada al backend: combina queries, deduplica, ordena por popularidad
        const result = await spotifyApi.getHome(POPULAR_QUERIES, 4)
        const albums = result.items

        // Ya vienen ordenados por popularidad descendente desde el backend
        setFeaturedAlbums(albums.slice(0, 10))
        setTrending(albums.slice(10, 20))

        // Si no alcanzan 20, pedir más
        if (albums.length < 20) {
          const more = await spotifyApi.getHome(['indie'], 20)
          const combined = [...albums, ...more.items.filter(a => !albums.find(existing => existing.id === a.id))]
          setFeaturedAlbums(combined.slice(0, 10))
          setTrending(combined.slice(10, 20))
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        // Fallback a new-releases
        try {
          const fallback = await spotifyApi.getNewReleases(20)
          const sorted = (fallback.albums.items || []).sort(
            (a, b) => (b.popularity ?? -1) - (a.popularity ?? -1)
          )
          setFeaturedAlbums(sorted.slice(0, 10))
          setTrending(sorted.slice(10, 20))
        } catch (e) {
          console.error('Fallback also failed:', e)
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-surface-elevated to-secondary/20 border border-primary/20 p-8 md:p-12"
      >
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-gradient">Discover Your Next</span>
            <br />
            <span className="text-white">Favorite Album</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-400">
            Join the community of music lovers. Rate albums, write reviews,
            create lists, and connect with fellow audiophiles.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button size="lg" onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })}>
              <Search className="mr-2 h-5 w-5" />
              Explore Albums
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push('/register')}>
              Join the Community
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Featured Albums */}
      <section id="featured" className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Featured Albums</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isLoading
            ? Array.from({ length: 10 }, (_, i) => <AlbumCardSkeleton key={i} />)
            : featuredAlbums.map((album, index) => (
                <AlbumCard key={album.id} album={album} index={index} />
              ))
          }
        </div>
        {featuredAlbums.length === 0 && !isLoading && (
          <div className="rounded-xl border border-border bg-surface-elevated p-8 text-center">
            <p className="text-zinc-500">No albums found. Try searching for something.</p>
          </div>
        )}
      </section>

      {/* More Albums */}
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-secondary" />
          <h2 className="text-2xl font-bold">More to Explore</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isLoading
            ? Array.from({ length: 10 }, (_, i) => <AlbumCardSkeleton key={i} />)
            : trending.map((album, index) => (
                <AlbumCard key={album.id} album={album} index={index} />
              ))
          }
        </div>
      </section>
    </div>
  )
}
