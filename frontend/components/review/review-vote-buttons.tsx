'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { reviewsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from '@/components/ui/toast'

interface ReviewVoteButtonsProps {
  reviewId: string
  initialVoteScore: number
  initialUserVote?: 1 | -1 | null
}

export function ReviewVoteButtons({
  reviewId,
  initialVoteScore,
  initialUserVote = null,
}: ReviewVoteButtonsProps) {
  const { token } = useAuthStore()
  const [score, setScore] = React.useState(initialVoteScore)
  const [userVote, setUserVote] = React.useState<1 | -1 | null>(initialUserVote)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleVote(direction: 1 | -1) {
    if (!token) {
      toast({ title: 'Sign in to vote', variant: 'error' })
      return
    }

    if (isLoading) return

    // Optimistic update
    const prevScore = score
    const prevUserVote = userVote

    if (userVote === direction) {
      // Same direction → remove vote
      setScore(prev => prev - direction)
      setUserVote(null)
    } else if (userVote === null) {
      // No existing vote → create
      setScore(prev => prev + direction)
      setUserVote(direction)
    } else {
      // Opposite direction → switch
      setScore(prev => prev - userVote + direction)
      setUserVote(direction)
    }

    setIsLoading(true)

    try {
      const response = await reviewsApi.vote(reviewId, direction, token)
      // Reconcile with server state
      setScore(response.score)
      setUserVote(response.userVote)
    } catch (error) {
      // Revert on error
      setScore(prevScore)
      setUserVote(prevUserVote)
      toast({ title: 'Vote failed', variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading || !token}
        className={cn(
          'flex items-center justify-center rounded-md p-1 transition-colors',
          'hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed',
          userVote === 1
            ? 'text-primary'
            : 'text-zinc-500 hover:text-primary'
        )}
        title={!token ? 'Sign in to vote' : 'Upvote'}
        aria-label="Upvote"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <span
        className={cn(
          'min-w-[1.5rem] text-center text-sm font-medium tabular-nums',
          score > 0
            ? 'text-highlight'
            : score < 0
              ? 'text-error'
              : 'text-zinc-400'
        )}
      >
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading || !token}
        className={cn(
          'flex items-center justify-center rounded-md p-1 transition-colors',
          'hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed',
          userVote === -1
            ? 'text-error'
            : 'text-zinc-500 hover:text-error'
        )}
        title={!token ? 'Sign in to vote' : 'Downvote'}
        aria-label="Downvote"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  )
}
