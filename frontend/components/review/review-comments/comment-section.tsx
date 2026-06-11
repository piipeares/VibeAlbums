'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { ReviewCommentData, reviewsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from '@/components/ui/toast'
import { CommentCard } from './comment-card'
import { CommentForm } from './comment-form'

interface CommentSectionProps {
  reviewId: string
  token?: string
  commentCount: number
}

export function CommentSection({ reviewId, token: propToken, commentCount: initialCount }: CommentSectionProps) {
  const { token: storeToken, user: currentUser } = useAuthStore()
  const token = propToken || storeToken
  const currentUserId = currentUser?.id

  const [isExpanded, setIsExpanded] = React.useState(false)
  const [comments, setComments] = React.useState<ReviewCommentData[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [replyToId, setReplyToId] = React.useState<string | null>(null)

  async function loadComments() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await reviewsApi.getComments(reviewId, token || undefined)
      setComments(response.comments)
    } catch (err) {
      setError('Failed to load comments')
      console.error('Load comments error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function handleToggle() {
    if (!isExpanded) {
      setIsExpanded(true)
      if (comments.length === 0) {
        loadComments()
      }
    } else {
      setIsExpanded(false)
    }
  }

  // ─── CRUD handlers ────────────────────────────────────────────

  function handleCreateSuccess(newComment: ReviewCommentData) {
    if (newComment.parentCommentId) {
      // Reply: add to parent's replies array
      setComments(prev =>
        prev.map(c =>
          c.id === newComment.parentCommentId
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        )
      )
    } else {
      // Top-level: prepend
      setComments(prev => [{ ...newComment, replies: [] }, ...prev])
    }
    setReplyToId(null)
  }

  async function handleEdit(commentId: string, content: string) {
    if (!token) return
    try {
      const response = await reviewsApi.updateComment(commentId, { content }, token)
      const updated = response.comment

      // Try top-level first
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return { ...c, content: updated.content, updatedAt: updated.updatedAt }
          }
          // Search in replies
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId
                  ? { ...r, content: updated.content, updatedAt: updated.updatedAt }
                  : r
              )
            }
          }
          return c
        })
      )
    } catch (err) {
      toast({
        title: 'Failed to update comment',
        variant: 'error'
      })
      throw err // Re-throw so CommentCard can handle it
    }
  }

  async function handleDelete(commentId: string) {
    if (!token) return
    try {
      await reviewsApi.deleteComment(commentId, token)

      // Try top-level first
      let found = comments.some(c => c.id === commentId)
      if (found) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      } else {
        // Search in replies
        setComments(prev =>
          prev.map(c => ({
            ...c,
            replies: (c.replies || []).filter(r => r.id !== commentId)
          }))
        )
      }
    } catch (err) {
      toast({
        title: 'Failed to delete comment',
        variant: 'error'
      })
      throw err
    }
  }

  function handleReply(parentId: string) {
    setReplyToId(prev => (prev === parentId ? null : parentId))
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Toggle header */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors group"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <MessageCircle className="h-4 w-4" />
        <span>
          Comments <span className="text-zinc-500">({initialCount})</span>
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              )}

              {/* Error state */}
              {!isLoading && error && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-sm text-zinc-500">{error}</p>
                  <button
                    onClick={loadComments}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !error && comments.length === 0 && (
                <p className="text-sm text-zinc-500 py-4 text-center">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}

              {/* Comment list */}
              {!isLoading && !error && comments.length > 0 && (
                <div className="space-y-1">
                  {comments.map(comment => (
                    <div key={comment.id}>
                      <CommentCard
                        comment={comment}
                        currentUserId={currentUserId}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReply={handleReply}
                      />

                      {/* Reply form (when reply button clicked) */}
                      {replyToId === comment.id && token && (
                        <div className="ml-10 mt-3">
                          <CommentForm
                            reviewId={reviewId}
                            parentCommentId={comment.id}
                            token={token}
                            onSuccess={handleCreateSuccess}
                            onCancel={() => setReplyToId(null)}
                            placeholder={`Reply to ${comment.user.displayName}...`}
                          />
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="border-l-2 border-border/50 ml-[1.125rem] pl-2">
                          {comment.replies.map(reply => (
                            <CommentCard
                              key={reply.id}
                              comment={reply}
                              isReply
                              currentUserId={currentUserId}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Top-level comment form (if authenticated) */}
              {!isLoading && token && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <CommentForm
                    reviewId={reviewId}
                    token={token}
                    onSuccess={handleCreateSuccess}
                  />
                </div>
              )}

              {/* Sign in prompt (if not authenticated) */}
              {!isLoading && !token && (
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  <a href="/login" className="text-primary hover:text-primary/80 transition-colors">
                    Sign in
                  </a>{' '}
                  to leave a comment
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
