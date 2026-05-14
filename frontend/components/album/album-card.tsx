'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { SpotifyAlbum } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AlbumCardProps {
  album: SpotifyAlbum
  index?: number
  onClick?: () => void
}

export function AlbumCard({ album, index = 0, onClick }: AlbumCardProps) {
  const imageUrl = album.images[0]?.url || '/placeholder-album.png'
  const artistName = album.artists?.[0]?.name || 'Unknown Artist'
  const releaseYear = album.release_date?.split('-')[0] || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/album/${album.id}`}>
        <div
          onClick={onClick}
          className={cn(
            'group cursor-pointer rounded-xl border border-transparent',
            'bg-surface-elevated p-3 transition-all duration-200',
            'hover:border-primary/30 hover:bg-surface-hover',
            'hover:shadow-lg hover:shadow-primary/10'
          )}
        >
          {/* Album Art */}
          <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
            <Image
              src={imageUrl}
              alt={album.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>

          {/* Album Info */}
          <div className="mt-3 space-y-1">
            <h3 className="truncate font-semibold text-white group-hover:text-primary transition-colors">
              {album.name}
            </h3>
            <p className="truncate text-sm text-zinc-400">
              {artistName}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {releaseYear && (
                <Badge variant="outline" className="text-xs">
                  {releaseYear}
                </Badge>
              )}
              {album.total_tracks && (
                <span className="text-xs text-zinc-500">
                  {album.total_tracks} tracks
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
