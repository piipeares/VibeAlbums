'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react'
import { Review } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'

interface ReviewCardProps {
  review: Review
  isOwner?: boolean
  onEdit?: () => void
  onDelete?: () => void
  index?: number
}

export function ReviewCard({ review, isOwner, onEdit, onDelete, index = 0 }: ReviewCardProps) {
  const [showMenu, setShowMenu] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl border border-border bg-surface-elevated p-4"
    >
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
    </motion.div>
  )
}
