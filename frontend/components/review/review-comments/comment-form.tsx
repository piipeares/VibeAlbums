'use client'

import * as React from 'react'
import { Send } from 'lucide-react'
import { ReviewCommentData, reviewsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface CommentFormProps {
  reviewId: string
  parentCommentId?: string
  token: string
  onSuccess: (comment: ReviewCommentData) => void
  onCancel?: () => void
  placeholder?: string
}

export function CommentForm({
  reviewId,
  parentCommentId,
  token,
  onSuccess,
  onCancel,
  placeholder = 'Write a comment...'
}: CommentFormProps) {
  const [content, setContent] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      const response = await reviewsApi.createComment(
        reviewId,
        { content: content.trim(), parentCommentId },
        token
      )
      onSuccess(response.comment)
      setContent('')
      textareaRef.current?.focus()
    } catch (error) {
      toast({
        title: 'Failed to post comment',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>
      <div className="flex flex-col gap-2 justify-end">
        <Button
          type="submit"
          size="sm"
          variant="default"
          isLoading={isSubmitting}
          disabled={!content.trim()}
          className="h-9 w-9 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
        {onCancel && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
