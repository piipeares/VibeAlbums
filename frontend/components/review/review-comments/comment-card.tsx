'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Edit2, Trash2, Reply, X, Check } from 'lucide-react'
import { ReviewCommentData } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface CommentCardProps {
  comment: ReviewCommentData
  isReply?: boolean
  currentUserId?: string
  onEdit: (commentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onReply?: (parentCommentId: string) => void
}

export function CommentCard({
  comment,
  isReply = false,
  currentUserId,
  onEdit,
  onDelete,
  onReply
}: CommentCardProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(comment.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isOwner = currentUserId === comment.userId

  async function handleSave() {
    if (!editContent.trim() || editContent.trim() === comment.content) {
      setIsEditing(false)
      return
    }
    setIsSubmitting(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setIsEditing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  async function handleDelete() {
    setIsSubmitting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : 'mt-4'}`}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={comment.user.avatar} />
        <AvatarFallback className="text-xs">
          {comment.user.displayName[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Header: user info + actions */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {comment.user.displayName}
          </span>
          <span className="text-xs text-zinc-500 truncate">
            @{comment.user.username}
          </span>
          <span className="text-xs text-zinc-600">&middot;</span>
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {/* Content or edit mode */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface p-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="default"
                onClick={handleSave}
                isLoading={isSubmitting}
                className="h-7 gap-1 text-xs"
              >
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="h-7 gap-1 text-xs"
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap break-words">
              {comment.content}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-1.5">
              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-primary transition-colors"
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </button>
              )}

              {isOwner && !showDeleteConfirm && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-error transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </>
              )}

              {isOwner && showDeleteConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Delete this comment?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    isLoading={isSubmitting}
                    className="h-6 px-2 text-xs"
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSubmitting}
                    className="h-6 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
