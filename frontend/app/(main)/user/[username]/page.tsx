'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, ListMusic, Star, Users } from 'lucide-react'
import { usersApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProfileSkeleton, AlbumCardSkeleton } from '@/components/ui/skeleton'
import { ReviewCard } from '@/components/review/review-card'

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user: currentUser, token } = useAuthStore()

  const [profile, setProfile] = React.useState<any>(null)
  const [reviews, setReviews] = React.useState<any[]>([])
  const [lists, setLists] = React.useState<any[]>([])
  const [activeTab, setActiveTab] = React.useState<'reviews' | 'lists'>('reviews')
  const [isLoading, setIsLoading] = React.useState(true)

  const isOwnProfile = currentUser?.username === username

  React.useEffect(() => {
    async function loadData() {
      try {
        const [profileData, reviewsData, listsData] = await Promise.all([
          usersApi.getProfile(username, token || undefined),
          usersApi.getReviews(username),
          usersApi.getLists(username, token || undefined),
        ])
        setProfile(profileData)
        setReviews(reviewsData)
        setLists(listsData)
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [username, token])

  const handleFollow = async () => {
    if (!token || !profile) return
    try {
      if (profile.isFollowing) {
        await usersApi.unfollow(username, token)
        setProfile({ ...profile, isFollowing: false, stats: { ...profile.stats, followers: profile.stats.followers - 1 } })
      } else {
        await usersApi.follow(username, token)
        setProfile({ ...profile, isFollowing: true, stats: { ...profile.stats, followers: profile.stats.followers + 1 } })
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4">
        <ProfileSkeleton />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h1 className="text-2xl font-bold">User not found</h1>
        <Link href="/">
          <Button className="mt-4">Go Home</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center md:flex-row md:items-start gap-6 mb-8"
      >
        <Avatar className="h-32 w-32 border-2 border-primary">
          <AvatarImage src={profile.avatar} />
          <AvatarFallback className="text-2xl">{profile.displayName[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          <p className="text-zinc-500">@{profile.username}</p>

          {profile.bio && (
            <p className="mt-3 text-zinc-300">{profile.bio}</p>
          )}

          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Star className="h-4 w-4 text-highlight" />
              <span>{profile.stats?.reviews || 0} reviews</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <ListMusic className="h-4 w-4 text-secondary" />
              <span>{profile.stats?.lists || 0} lists</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Users className="h-4 w-4 text-primary" />
              <span>{profile.stats?.followers || 0} followers</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>{profile.stats?.following || 0} following</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <Calendar className="h-4 w-4" />
            Joined {formatDate(profile.createdAt)}
          </div>

          {!isOwnProfile && currentUser && (
            <Button
              className="mt-4"
              variant={profile.isFollowing ? 'outline' : 'default'}
              onClick={handleFollow}
            >
              {profile.isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'reviews'
              ? 'text-primary border-b-2 border-primary'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'lists'
              ? 'text-primary border-b-2 border-primary'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          Lists ({lists.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'reviews' ? (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <ReviewCard key={review.id} review={review} index={index} />
          ))}
          {reviews.length === 0 && (
            <div className="rounded-xl border border-border bg-surface-elevated p-8 text-center">
              <p className="text-zinc-500">No reviews yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/list/${list.id}`}>
                <div className="rounded-xl border border-border bg-surface-elevated p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold hover:text-primary transition-colors">{list.name}</h3>
                      {list.description && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{list.description}</p>
                      )}
                    </div>
                    {!list.isPublic && (
                      <Badge variant="outline" className="text-xs">Private</Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">{list.itemsCount} albums</p>
                </div>
              </Link>
            </motion.div>
          ))}
          {lists.length === 0 && (
            <div className="col-span-2 rounded-xl border border-border bg-surface-elevated p-8 text-center">
              <p className="text-zinc-500">No lists yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
