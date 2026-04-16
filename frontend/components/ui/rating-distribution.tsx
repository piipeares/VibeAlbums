'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingDistributionProps {
  distribution: Record<number, number>
  averageRating: number
  totalReviews: number
}

export function RatingDistribution({ distribution, averageRating, totalReviews }: RatingDistributionProps) {
  const maxCount = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-4">
      {/* Average */}
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold text-white">{averageRating.toFixed(1)}</span>
        <div className="space-y-1">
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < Math.round(averageRating)
                    ? 'fill-highlight text-highlight'
                    : 'fill-transparent text-zinc-600'
                )}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-500">{totalReviews} reviews</p>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0
          const percentage = (count / maxCount) * 100

          return (
            <div key={star} className="flex items-center gap-2">
              <span className="w-3 text-xs text-zinc-500">{star}</span>
              <Star className="h-3 w-3 fill-highlight text-highlight" />
              <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-highlight rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-xs text-zinc-500 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
