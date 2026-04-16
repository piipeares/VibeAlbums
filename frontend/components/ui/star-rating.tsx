'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onRate?: (rating: number) => void
  showValue?: boolean
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRate,
  showValue = false,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null)
  const [localRating, setLocalRating] = React.useState(rating)

  React.useEffect(() => {
    setLocalRating(rating)
  }, [rating])

  const sizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const displayRating = hoverRating ?? localRating

  const handleClick = (value: number) => {
    if (!interactive || !onRate) return
    setLocalRating(value)
    onRate(value)
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {Array.from({ length: maxRating }, (_, i) => {
          const value = i + 1
          const isFilled = value <= displayRating
          const isHalf = !isFilled && value - 0.5 <= displayRating

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(value)}
              onMouseEnter={() => interactive && setHoverRating(value)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={cn(
                'transition-colors duration-150',
                interactive && 'cursor-pointer hover:scale-110 active:scale-95',
                !interactive && 'cursor-default'
              )}
            >
              <Star
                className={cn(
                  sizes[size],
                  isFilled
                    ? 'fill-highlight text-highlight'
                    : isHalf
                    ? 'fill-highlight/50 text-highlight'
                    : 'fill-transparent text-zinc-600'
                )}
              />
            </button>
          )
        })}
      </div>
      {showValue && (
        <span className="ml-1 font-mono text-sm text-zinc-400">
          {localRating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
