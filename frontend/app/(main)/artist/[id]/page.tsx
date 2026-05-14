'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Disc, Disc3, Layers, Music2, User } from 'lucide-react'
import { spotifyApi, SpotifyArtist, SpotifyAlbum, SpotifyTrack } from '@/lib/api'
import { AlbumCard } from '@/components/album/album-card'
import { AlbumCardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string

  const [artist, setArtist] = React.useState<SpotifyArtist | null>(null)
  const [albums, setAlbums] = React.useState<SpotifyAlbum[]>([])
  const [topTracks, setTopTracks] = React.useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  type Tab = 'albums' | 'singles' | 'compilations' | 'songs'
  const [activeTab, setActiveTab] = React.useState<Tab>('albums')

  const albumsByType = React.useMemo(() => ({
    albums: albums.filter((a) => a.album_type === 'album'),
    singles: albums.filter((a) => a.album_type === 'single'),
    compilations: albums.filter((a) => a.album_type === 'compilation'),
  }), [albums])

  React.useEffect(() => {
    loadData()
  }, [artistId])

  async function loadData() {
    setIsLoading(true)
    try {
      // Load artist info
      const artistData = await spotifyApi.getArtist(artistId)
      setArtist(artistData)

      // Load artist albums
      const albumsData = await spotifyApi.getArtistAlbums(artistId, 20)
      setAlbums(albumsData.items || [])

      // Load top tracks
      const tracksData = await spotifyApi.getArtistTopTracks(artistId)
      setTopTracks(tracksData.tracks || [])
    } catch (error) {
      console.error('Failed to load artist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-48 h-48 rounded-full overflow-hidden bg-surface-elevated" />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="h-12 w-64 mx-auto md:mx-0 bg-surface-elevated rounded" />
            <div className="h-6 w-32 mx-auto md:mx-0 bg-surface-elevated rounded" />
          </div>
        </div>
        <div className="mt-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }, (_, i) => <AlbumCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="mx-auto max-w-7xl px-4 text-center py-20">
        <h1 className="text-2xl font-bold mb-4">No se encontró este artista</h1>
        <Link href="/explore">
          <Button>Volver a Explorar</Button>
        </Link>
      </div>
    )
  }

  const artistImage = artist.images?.[0]?.url || null

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Back button */}
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      {/* Artist Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12"
      >
        {/* Artist Image */}
        <div className="relative w-48 h-48 shrink-0">
          {artistImage ? (
            <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl shadow-primary/20 bg-surface">
              <Image
                src={artistImage}
                alt={artist.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-full bg-surface-elevated flex items-center justify-center">
              <User className="h-24 w-24 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Artist Info */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <Badge variant="outline" className="mb-2">ARTISTA</Badge>
            <h1 className="text-4xl md:text-5xl font-bold">{artist.name}</h1>
          </div>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {artist.genres.slice(0, 5).map((genre) => (
                <Badge key={genre} variant="secondary" className="capitalize">
                  {genre.replace(/-/g, ' ')}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 justify-center md:justify-start">
            <span>{artist.followers?.total?.toLocaleString() || 0} seguidores</span>
            <span>•</span>
            <span>Popularidad: {artist.popularity || 0}/100</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === 'albums' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setActiveTab('albums')}
          className="gap-2"
        >
          <Disc className="h-5 w-5" />
          Álbumes ({albumsByType.albums.length})
        </Button>
        <Button
          variant={activeTab === 'singles' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setActiveTab('singles')}
          className="gap-2"
        >
          <Disc3 className="h-5 w-5" />
          Singles ({albumsByType.singles.length})
        </Button>
        <Button
          variant={activeTab === 'compilations' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setActiveTab('compilations')}
          className="gap-2"
        >
          <Layers className="h-5 w-5" />
          Compilaciones ({albumsByType.compilations.length})
        </Button>
        <Button
          variant={activeTab === 'songs' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setActiveTab('songs')}
          className="gap-2"
        >
          <Music2 className="h-5 w-5" />
          Top Canciones ({topTracks.length})
        </Button>
      </div>

      {/* Releases Section (albums / singles / compilations) */}
      {activeTab !== 'songs' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12"
        >
          {albumsByType[activeTab].length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {albumsByType[activeTab].map((album, index) => (
                <AlbumCard key={album.id} album={album} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-elevated p-12 text-center">
              <p className="text-zinc-500">
                {activeTab === 'albums' && 'No se encontraron álbumes'}
                {activeTab === 'singles' && 'No se encontraron singles'}
                {activeTab === 'compilations' && 'No se encontraron compilaciones'}
              </p>
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
          {topTracks.length > 0 ? (
            <div className="space-y-2">
              {topTracks.map((track, index) => (
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
                    <p className="text-sm text-zinc-500 truncate">
                      {track.album?.name || 'Single'}
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
