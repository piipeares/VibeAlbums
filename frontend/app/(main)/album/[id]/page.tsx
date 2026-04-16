'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, ListPlus, Play, Disc, Music2, User } from 'lucide-react'
import { spotifyApi, reviewsApi, listsApi, Review } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StarRating } from '@/components/ui/star-rating'
import { ReviewCard } from '@/components/review/review-card'
import { ReviewForm } from '@/components/review/review-form'
import { Skeleton } from '@/components/ui/skeleton'

export default function AlbumPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string
  const { user, token } = useAuthStore()

  const [album, setAlbum] = React.useState<any>(null)
  const [track, setTrack] = React.useState<any>(null)
  const [tracks, setTracks] = React.useState<any[]>([])
  const [isTrack, setIsTrack] = React.useState(false)
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [reviewStats, setReviewStats] = React.useState<{ count: number; averageRating: number; distribution: Record<number, number> }>({ count: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  const [userReview, setUserReview] = React.useState<Review | null>(null)
  const [myLists, setMyLists] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showReviewForm, setShowReviewForm] = React.useState(false)
  const [editingReview, setEditingReview] = React.useState<Review | null>(null)

  React.useEffect(() => {
    loadData()
  }, [itemId])

  async function loadData() {
    setIsLoading(true)
    try {
      // Try as album first
      try {
        const albumData = await spotifyApi.getAlbumFull(itemId)
        setAlbum(albumData.album)
        setTracks(albumData.tracks)
        setIsTrack(false)
      } catch {
      // Try as track
      try {
        const trackData = await spotifyApi.getTrack(itemId)
        setTrack(trackData)
        setAlbum({
          id: trackData.id,
          name: trackData.name,
          artists: trackData.artists,
          // Use album art from the track's album field if available
          images: trackData.album?.images || [{ url: 'https://via.placeholder.com/640' }],
          release_date: trackData.album?.release_date || '',
          total_tracks: 1,
          type: 'track',
          album_type: trackData.album?.album_type || 'single',
          // Keep the original album info for reference
          _albumRef: trackData.album
        })
        setTracks([])
        setIsTrack(true)
      } catch {
          // Neither worked
          setAlbum(null)
        }
      }

      // Load reviews
      const reviewsData = await reviewsApi.getForAlbum(itemId, token || undefined)
      setReviews(reviewsData.reviews)
      setReviewStats(reviewsData.stats)

      // Load user's lists
      if (token) {
        const listsData = await listsApi.getMyLists(token)
        setMyLists(listsData)
      }

      // Find user's own review
      if (user && reviewsData.reviews) {
        const ownReview = reviewsData.reviews.find((r: Review) => r.userId === user.id)
        if (ownReview) {
          setUserReview(ownReview)
        }
      }
    } catch (error) {
      console.error('Failed to load:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitReview = async (data: { rating: number; content: string }) => {
    if (!token) return
    setIsSubmitting(true)
    try {
      if (editingReview) {
        const updated = await reviewsApi.update(editingReview.id, data, token)
        setReviews(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
        setUserReview(updated)
      } else {
        const newReview = await reviewsApi.create({
          spotifyAlbumId: itemId,
          rating: data.rating,
          content: data.content,
        }, token)
        setReviews(prev => [newReview, ...prev])
        setUserReview(newReview)

        setReviewStats(prev => ({
          ...prev,
          count: prev.count + 1,
          averageRating: ((prev.averageRating * prev.count) + data.rating) / (prev.count + 1),
          distribution: {
            ...prev.distribution,
            [data.rating]: (prev.distribution[data.rating as keyof typeof prev.distribution] || 0) + 1,
          }
        }))
      }
      setShowReviewForm(false)
      setEditingReview(null)
    } catch (error) {
      console.error('Failed to submit review:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!token || !userReview) return
    if (!confirm('¿Estás seguro de eliminar esta reseña?')) return

    try {
      await reviewsApi.delete(userReview.id, token)
      setReviews(prev => prev.filter(r => r.id !== userReview.id))
      setUserReview(null)

      setReviewStats(prev => ({
        ...prev,
        count: Math.max(0, prev.count - 1),
        averageRating: prev.count > 1
          ? ((prev.averageRating * prev.count) - userReview.rating) / (prev.count - 1)
          : 0,
        distribution: {
          ...prev.distribution,
          [userReview.rating]: Math.max(0, (prev.distribution[userReview.rating as keyof typeof prev.distribution] || 0) - 1),
        }
      }))
    } catch (error) {
      console.error('Failed to delete review:', error)
    }
  }

  const handleAddToList = async (listId: string) => {
    if (!token || !album) return
    try {
      await listsApi.addItem(listId, {
        albumId: album.id,
        albumName: album.name,
        albumArtist: album.artists?.[0]?.name || '',
        albumImage: album.images?.[0]?.url || '',
      }, token)
      alert('¡Agregado a la lista!')
    } catch (error) {
      console.error('Failed to add to list:', error)
      alert('Error al agregar a la lista')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="h-64 w-64 rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="mx-auto max-w-7xl px-4 text-center py-20">
        <h1 className="text-2xl font-bold mb-4">No se encontró este contenido</h1>
        <Link href="/explore">
          <Button>Volver a Explorar</Button>
        </Link>
      </div>
    )
  }

  const imageUrl = album.images?.[0]?.url || '/placeholder.png'
  const artistName = album.artists?.[0]?.name || 'Unknown Artist'
  const artistId = album.artists?.[0]?.id || ''
  const totalDuration = tracks.reduce((acc: number, t: any) => acc + t.duration_ms, 0)
  const displayName = album.name
  const isSingle = album.album_type === 'single' || isTrack

  // Format date properly
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
      return `${parseInt(parts[2])} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`
    } else if (parts.length === 2) {
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
      return `${months[parseInt(parts[1]) - 1]} de ${parts[0]}`
    } else if (parts.length === 1) {
      return parts[0]
    }
    return dateStr
  }

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Back button - with higher z-index */}
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors z-10 relative">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Artwork */}
          <div className="relative w-full md:w-72 shrink-0">
            <div className="aspect-square rounded-xl overflow-hidden shadow-2xl shadow-primary/20 bg-surface">
              <Image src={imageUrl} alt={displayName} fill className="object-cover" priority />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <Badge variant="outline" className="mb-2">
                {isTrack ? 'CANCIÓN' : 'ÁLBUM'}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{displayName}</h1>
              {/* Artists - All Clickable */}
              <div className="flex items-center gap-2 flex-wrap">
                <User className="h-5 w-5 text-zinc-500" />
                <div className="flex items-center gap-2 flex-wrap">
                  {album.artists?.map((artist: any, index: number) => (
                    <React.Fragment key={artist.id}>
                      {index > 0 && <span className="text-zinc-500">,</span>}
                      <button
                        onClick={() => artist.id && router.push(`/artist/${artist.id}`)}
                        className={`text-xl ${artist.id ? 'hover:text-primary cursor-pointer' : 'text-zinc-400 cursor-default'}`}
                      >
                        {artist.name}
                      </button>
                    </React.Fragment>
                  )) || <span className="text-xl text-zinc-400">Unknown Artist</span>}
                </div>
              </div>
            </div>

            {/* Track info (for songs) */}
            {isTrack && (
              <div className="space-y-2">
                {/* Duration */}
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(track?.duration_ms || 0)}</span>
                </div>
                {/* Album link - only if not a single */}
                {album._albumRef && album._albumRef.id !== album.id && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span>De:</span>
                    <button
                      onClick={() => router.push(`/album/${album._albumRef.id}`)}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Disc className="h-4 w-4" />
                      {album._albumRef.name}
                    </button>
                  </div>
                )}
                {/* If it's a single (no album reference), show the song name again */}
                {!album._albumRef && (
                  <div className="text-zinc-500 italic">
                    Single
                  </div>
                )}
              </div>
            )}

            {/* Album info */}
            {!isTrack && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <span>{formatDate(album.release_date)}</span>
                <span>•</span>
                <span>{album.total_tracks} canciones</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.floor(totalDuration / 60000)} min
                </span>
              </div>
            )}

            {/* Rating summary */}
            {reviewStats.count > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{reviewStats.averageRating.toFixed(1)}</span>
                  <StarRating rating={reviewStats.averageRating} size="md" />
                  <span className="text-zinc-500">({reviewStats.count} reseñas)</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4">
              {user ? (
                <>
                  <Button onClick={() => setShowReviewForm(true)}>
                    <StarRating rating={0} size="sm" />
                    {userReview ? 'Editar Reseña' : 'Escribir Reseña'}
                  </Button>
                  <div className="relative group">
                    <Button variant="outline">
                      <ListPlus className="mr-2 h-4 w-4" />
                      Agregar a Lista
                    </Button>
                    {myLists.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-surface-elevated p-1 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        {myLists.map(list => (
                          <button
                            key={list.id}
                            onClick={() => handleAddToList(list.id)}
                            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors"
                          >
                            {list.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link href="/login">
                  <Button variant="outline">Iniciar sesión para reseñar</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6"
          >
            <h2 className="text-xl font-bold mb-4">
              {editingReview ? 'Editar Reseña' : 'Escribir Reseña'}
            </h2>
            <ReviewForm
              onSubmit={handleSubmitReview}
              isLoading={isSubmitting}
              initialRating={editingReview?.rating || userReview?.rating || 0}
              initialContent={editingReview?.content || userReview?.content || ''}
            />
            <Button variant="ghost" className="mt-3 w-full" onClick={() => { setShowReviewForm(false); setEditingReview(null) }}>
              Cancelar
            </Button>
          </motion.div>
        </div>
      )}

      {/* Tracklist (only for albums) */}
      {!isTrack && tracks.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Lista de Canciones</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 w-12">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Título</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 hidden md:table-cell">Artista</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500 w-20">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tracks.map((t: any, index: number) => (
                  <tr key={t.id} className="group hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium group-hover:text-primary transition-colors">{t.name}</span>
                          {t.preview_url && (
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="h-4 w-4 fill-current" />
                            </button>
                          )}
                        </div>
                        {/* Show artists for tracks with multiple artists */}
                        {t.artists && t.artists.length > 1 && (
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t.artists.map((a: any, i: number) => (
                              <React.Fragment key={a.id}>
                                {i > 0 && ', '}
                                <button
                                  onClick={() => a.id && router.push(`/artist/${a.id}`)}
                                  className="hover:text-primary hover:underline"
                                >
                                  {a.name}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <button
                        onClick={() => t.artists?.[0]?.id && router.push(`/artist/${t.artists[0].id}`)}
                        className="text-sm text-zinc-400 hover:text-primary transition-colors truncate"
                      >
                        {t.artists?.map((a: any) => a.name).join(', ') || 'Unknown'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-500 font-mono">
                      {formatDuration(t.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Reseñas</h2>
        </div>

        <div className="space-y-4">
          {reviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwner={user?.id === review.userId}
              onEdit={() => {
                setEditingReview(review)
                setShowReviewForm(true)
              }}
              onDelete={handleDeleteReview}
              index={index}
            />
          ))}
        </div>

        {reviews.length === 0 && (
          <div className="rounded-xl border border-border bg-surface-elevated p-8 text-center">
            <p className="text-zinc-500">No hay reseñas todavía. ¡Sé el primero!</p>
            {user && !showReviewForm && (
              <Button className="mt-4" onClick={() => setShowReviewForm(true)}>
                Escribir una Reseña
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
