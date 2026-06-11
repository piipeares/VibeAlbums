'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MoreHorizontal, Edit2, Trash2, Disc, Music2, MessageCircle } from 'lucide-react'
import { Review } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import { ReviewVoteButtons } from '@/components/review/review-vote-buttons'
import { CommentSection } from '@/components/review/review-comments/comment-section'

interface ReviewCardProps {
  review: Review
  isOwner?: boolean
  onEdit?: () => void
  onDelete?: () => void
  index?: number
}

export function ReviewCard({ review, isOwner, onEdit, onDelete, index = 0 }: ReviewCardProps) {
  const [showMenu, setShowMenu] = React.useState(false)
  const [showComments, setShowComments] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl border border-border bg-surface-elevated p-4"
    >
      {/* Target info — qué se está reseñando */}
      {review.targetName && (
        <Link
          href={`/album/${review.targetId}`}
          className="flex items-center gap-3 mb-3 rounded-lg bg-surface-hover/50 p-2 hover:bg-surface-hover transition-colors group"
        >
          {review.targetImage ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
              <Image
                src={review.targetImage}
                alt={review.targetName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface">
              {review.targetType === 'track' ? (
                <Music2 className="h-5 w-5 text-zinc-500" />
              ) : (
                <Disc className="h-5 w-5 text-zinc-500" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white group-hover:text-primary transition-colors">
              {review.targetName}
            </p>
            {review.targetArtist && (
              <p className="truncate text-xs text-zinc-500">
                {review.targetArtist}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">
            {review.targetType === 'track' ? 'Canción' : 'Álbum'}
          </span>
        </Link>
      )}

      <div className="flex items-start justify-between">
        {/* User info */}
        <Link href={`/user/${review.user.username}`} className="flex items-center gap-3 group">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.user.avatar} />
            <AvatarFallback>{review.user.displayName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-white group-hover:text-primary transition-colors">
              {review.user.displayName}
            </p>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-zinc-500">
                {formatRelativeTime(review.createdAt)}
              </span>
            </div>
          </div>
        </Link>

        {/* Actions for owner */}
        {isOwner && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-border bg-surface-elevated p-1 shadow-xl z-10"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setShowMenu(false)
                      onEdit?.()
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-error hover:text-error"
                    onClick={() => {
                      setShowMenu(false)
                      onDelete?.()
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Review content */}
      {review.content && (
        <p className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">
          {review.content}
        </p>
      )}

      {/* Footer: vote buttons + comment toggle */}
      <div className="mt-3 flex items-center justify-between">
        <ReviewVoteButtons
          reviewId={review.id}
          initialVoteScore={review.voteScore ?? 0}
          initialUserVote={review.userVote ?? null}
        />

        <button
          onClick={() => setShowComments(!showComments)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
            showComments
              ? 'text-primary bg-primary/10'
              : 'text-zinc-500 hover:text-white hover:bg-surface-hover'
          )}
          aria-label={showComments ? 'Hide comments' : 'Show comments'}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium tabular-nums">{review.commentCount ?? 0}</span>
        </button>
      </div>

      {/* Comment section */}
      {showComments && (
        <CommentSection
          reviewId={review.id}
          commentCount={review.commentCount ?? 0}
        />
      )}
    </motion.div>
  )
}
