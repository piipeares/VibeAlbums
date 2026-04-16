'use client'

import * as React from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StarRating } from '@/components/ui/star-rating'

interface ReviewFormProps {
  onSubmit: (data: { rating: number; content: string }) => void
  isLoading?: boolean
  initialRating?: number
  initialContent?: string
  submitLabel?: string
}

export function ReviewForm({
  onSubmit,
  isLoading,
  initialRating = 0,
  initialContent = '',
  submitLabel = 'Post Review'
}: ReviewFormProps) {
  const [rating, setRating] = React.useState(initialRating)
  const [content, setContent] = React.useState(initialContent)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    onSubmit({ rating, content })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Your Rating
        </label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onRate={setRating}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Your Review (optional)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts about this album..."
          rows={4}
          className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-white placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={rating === 0 || isLoading}
        isLoading={isLoading}
        className="w-full"
      >
        <Send className="mr-2 h-4 w-4" />
        {submitLabel}
      </Button>
    </form>
  )
}
