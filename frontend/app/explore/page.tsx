'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Disc, Music2, Search as SearchIcon, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { spotifyApi, SpotifyAlbum, SpotifyTrack } from '@/lib/api'
import { AlbumCard } from '@/components/album/album-card'
import { AlbumCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { formatDuration } from '@/lib/utils'
import Image from 'next/image'

// Specific albums requested by user
const TOP_ALBUMS = [
  { name: 'DeBÍ TiRAR MáS FOToS', artist: 'Bad Bunny' },
  { name: 'ARIRANG', artist: 'BTS' },
  { name: 'The Art of Loving', artist: 'Olivia Dean' },
  { name: 'Un Verano Sin Ti', artist: 'Bad Bunny' },
  { name: 'The Life of a Showgirl', artist: 'Taylor Swift' },
  { name: 'KPop Demon Hunters Soundtrack', artist: 'Various Artists' },
  { name: 'DINASTÍA', artist: 'Peso Pluma / Tito Double P' },
  { name: 'HIT ME HARD AND SOFT', artist: 'Billie Eilish' },
  { name: 'I Barely Know Her', artist: 'sombr' },
  { name: "Man's Best Friend", artist: 'Sabrina Carpenter' },
  { name: 'SOUR', artist: 'Olivia Rodrigo' },
  { name: "I'm The Problem", artist: 'Morgan Wallen' },
  { name: '$AD BOYZ 4 LIFE II', artist: 'Junior H' },
  { name: 'Blonde', artist: 'Frank Ocean' },
  { name: 'Graduation', artist: 'Kanye West' },
  { name: 'Don\'t Forget About Me, Demos', artist: 'Dominic Fike' },
  { name: '111XPANTIA', artist: 'Fuerza Regida' },
  { name: 'Short n\' Sweet', artist: 'Sabrina Carpenter' },
  { name: 'AM', artist: 'Arctic Monkeys' },
  { name: 'Rebel', artist: 'EsDeeKid' },
]

// Specific songs requested by user
const TOP_SONGS = [
  { name: 'Beauty And A Beat', artist: 'Justin Bieber & Nicki Minaj' },
  { name: 'SWIM', artist: 'BTS' },
  { name: 'Babydoll', artist: 'Dominic Fike' },
  { name: 'DAISIES', artist: 'Justin Bieber' },
  { name: 'Baby', artist: 'Justin Bieber & Ludacris' },
  { name: 'Risk It All', artist: 'Bruno Mars' },
  { name: 'Sorry', artist: 'Justin Bieber' },
  { name: 'Confident', artist: 'Justin Bieber & Chance the Rapper' },
  { name: 'Stateside', artist: 'PinkPantheress & Zara Larsson' },
  { name: 'Eenie Meenie', artist: 'Sean Kingston & Justin Bieber' },
  { name: 'back to friends', artist: 'sombr' },
  { name: 'Love Yourself', artist: 'Justin Bieber' },
  { name: 'Dracula - JENNIE Remix', artist: 'Tame Impala & JENNIE' },
  { name: 'End of Beginning', artist: 'Djo' },
  { name: 'Man I Need', artist: 'Olivia Dean' },
  { name: 'Raindance', artist: 'Dave & Tems' },
  { name: 'So Easy (To Fall In Love)', artist: 'Olivia Dean' },
  { name: 'Body to Body', artist: 'BTS' },
  { name: 'The Fate of Ophelia', artist: 'Taylor Swift' },
  { name: 'DtMF', artist: 'Bad Bunny' },
]

export default function ExplorePage() {
  const router = useRouter()
  const [albums, setAlbums] = React.useState<SpotifyAlbum[]>([])
  const [tracks, setTracks] = React.useState<SpotifyTrack[]>([])
  const [heroAlbums, setHeroAlbums] = React.useState<SpotifyAlbum[]>([])
  const [currentHeroIndex, setCurrentHeroIndex] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'albums' | 'songs'>('albums')
  const [searchQuery, setSearchQuery] = React.useState('')

  React.useEffect(() => {
    loadContent()
  }, [])

  // Auto-rotate hero carousel
  React.useEffect(() => {
    if (heroAlbums.length === 0) return
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroAlbums.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [heroAlbums.length])

  async function loadContent() {
    setIsLoading(true)
    try {
      // Search for each specific album and collect results
      const albumPromises = TOP_ALBUMS.map(album => 
        spotifyApi.search(`${album.name} ${album.artist}`, 'album', 1)
          .then(result => result.albums.items[0])
          .catch(() => null)
      )
      const albumResults = await Promise.all(albumPromises)
      const validAlbums = albumResults.filter((a): a is SpotifyAlbum => a !== null && a !== undefined)
      setAlbums(validAlbums)

      // Use first 5 albums for hero carousel
      setHeroAlbums(validAlbums.slice(0, 5))

      // Search for each specific song and collect results
      const trackPromises = TOP_SONGS.map(song => 
        spotifyApi.search(`${song.name} ${song.artist}`, 'track', 1)
          .then(result => result.tracks.items[0])
          .catch(() => null)
      )
      const trackResults = await Promise.all(trackPromises)
      const validTracks = trackResults.filter((t): t is SpotifyTrack => t !== null && t !== undefined)
      setTracks(validTracks)
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const goToHero = (index: number) => {
    setCurrentHeroIndex(index)
  }

  const nextHero = () => {
    setCurrentHeroIndex((prev) => (prev + 1) % heroAlbums.length)
  }

  const prevHero = () => {
    setCurrentHeroIndex((prev) => (prev - 1 + heroAlbums.length) % heroAlbums.length)
  }

  const currentHero = heroAlbums[currentHeroIndex]

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero Section - Letterboxd Style */}
      {heroAlbums.length > 0 && (
        <section className="relative mb-10 -mx-4 md:-mx-6 lg:-mx-8 xl:-mx-12">
          {/* Hero Background */}
          <div className="relative h-[500px] md:h-[550px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentHero.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                {/* Blurred Background */}
                <div className="absolute inset-0">
                  <Image
                    src={currentHero.images[0]?.url || '/placeholder.png'}
                    alt=""
                    fill
                    className="object-cover scale-110 blur-2xl opacity-40"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Content */}
            <div className="relative h-full flex items-end pb-12 px-6 md:px-12 lg:px-16">
              <div className="flex items-end gap-6">
                {/* Album Art */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentHero.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="hidden md:block"
                  >
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                      <Image
                        src={currentHero.images[0]?.url || '/placeholder.png'}
                        alt={currentHero.name}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Info */}
                <div className="flex-1 pb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentHero.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <p className="text-sm text-zinc-400 uppercase tracking-wider mb-1">Trending</p>
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{currentHero.name}</h2>
                      <p className="text-lg text-zinc-400 mb-4">{currentHero.artists?.[0]?.name}</p>
                      <Button onClick={() => router.push(`/album/${currentHero.id}`)} size="lg">
                        Ver Album
                      </Button>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevHero}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextHero}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {heroAlbums.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToHero(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentHeroIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="text-gradient">Explorá</span> lo del momento
        </h1>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              type="search"
              placeholder="Buscar albums, canciones, artistas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-surface-elevated border-border"
            />
          </div>
          <Button type="submit" size="lg" className="px-6">
            Buscar
          </Button>
        </form>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'albums' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setActiveTab('albums')}
          className="gap-2"
        >
          <Disc className="h-5 w-5" />
          Álbumes
        </Button>
        <Button
          variant={activeTab === 'songs' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setActiveTab('songs')}
          className="gap-2"
        >
          <Music2 className="h-5 w-5" />
          Canciones
        </Button>
      </div>

      {/* Albums Section */}
      {activeTab === 'albums' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Disc className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Álbumes Populares</h2>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 15 }, (_, i) => <AlbumCardSkeleton key={i} />)}
            </div>
          ) : albums.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {albums.map((album, index) => (
                <AlbumCard key={album.id} album={album} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
              <p className="text-zinc-500">No se encontraron albums</p>
            </div>
          )}
        </motion.section>
      )}

      {/* Songs Section */}
      {activeTab === 'songs' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Music2 className="h-6 w-6 text-secondary" />
            <h2 className="text-xl font-bold">Canciones Populares</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface-elevated">
                  <div className="skeleton h-12 w-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-48" />
                    <div className="skeleton h-3 w-32" />
                  </div>
                  <div className="skeleton h-3 w-12" />
                </div>
              ))}
            </div>
          ) : tracks.length > 0 ? (
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div 
                  key={track.id}
                  className="group flex items-center gap-4 p-3 rounded-xl border border-border bg-surface-elevated hover:bg-surface-hover hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => router.push(`/album/${track.id}`)}
                >
                  {/* Rank */}
                  <span className="w-8 text-center font-mono text-lg text-zinc-500 group-hover:text-primary">
                    {index + 1}
                  </span>

                  {/* Album Art */}
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-surface shrink-0 border border-border">
                    {track.album?.images?.[0]?.url ? (
                      <Image
                        src={track.album.images[0].url}
                        alt={track.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white group-hover:text-primary transition-colors truncate">
                      {track.name}
                    </p>
                    <p className="text-sm text-zinc-400 truncate hover:text-primary cursor-pointer">
                      {track.artists?.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ', '}
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/artist/${a.id}`)
                            }}
                            className="hover:underline"
                          >
                            {a.name}
                          </span>
                        </span>
                      )) || 'Unknown Artist'}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-sm text-zinc-500 font-mono shrink-0">
                    {formatDuration(track.duration_ms)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
              <p className="text-zinc-500">No se encontraron canciones</p>
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}
