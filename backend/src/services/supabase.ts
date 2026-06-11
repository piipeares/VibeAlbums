import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Database Types ───────────────────────────────────────────────

export type DbUser = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar: string;
  bio: string;
  created_at: string;
};

export type DbReview = {
  id: string;
  user_id: string;
  target_id: string;
  target_type: 'album' | 'track';
  rating: number;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DbList = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  items: DbListItem[];
  created_at: string;
  updated_at: string;
};

export type DbListItem = {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImage: string;
  addedAt: string;
  note?: string;
};

export type DbFollow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type DbReviewVote = {
  id: string;
  review_id: string;
  user_id: string;
  direction: 1 | -1;
  created_at: string;
};

export type DbReviewComment = {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
};

// ─── API Response Types (camelCase) ──────────────────────────────

export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  stats?: {
    reviews: number;
    lists: number;
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
  createdAt?: string;
}

export interface ReviewResponse {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'album' | 'track';
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  voteScore: number;
  userVote: 1 | -1 | null;
  commentCount: number;
}

export interface ListResponse {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  items: DbListItem[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  isOwner?: boolean;
  itemsCount?: number;
}

export interface CommentResponse {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  replies?: CommentResponse[];
}

export interface VoteState {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 1 | -1 | null;
}
