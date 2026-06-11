import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatar: string;
  bio: string;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'album' | 'track';
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImage: string;
  addedAt: string;
  note?: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  direction: 1 | -1;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  users: User[];
  reviews: Review[];
  lists: List[];
  follows: Follow[];
  reviewVotes: ReviewVote[];
  reviewComments: ReviewComment[];
}

const defaultData: DatabaseSchema = {
  users: [],
  reviews: [],
  lists: [],
  follows: [],
  reviewVotes: [],
  reviewComments: []
};

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const adapter = new JSONFile<DatabaseSchema>(dbPath);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDb(): Promise<void> {
  await db.read();
  // Ensure all arrays exist (also persists new fields to existing db.json)
  let needsWrite = false;
  if (!db.data.users) { db.data.users = []; needsWrite = true; }
  if (!db.data.reviews) { db.data.reviews = []; needsWrite = true; }
  if (!db.data.lists) { db.data.lists = []; needsWrite = true; }
  if (!db.data.follows) { db.data.follows = []; needsWrite = true; }
  if (!db.data.reviewVotes) { db.data.reviewVotes = []; needsWrite = true; }
  if (!db.data.reviewComments) { db.data.reviewComments = []; needsWrite = true; }

  // ─── Migration: v0 → v1 (spotifyAlbumId → targetId + targetType) ─────
  let migrated = false;
  for (const review of db.data.reviews) {
    const old = review as unknown as Record<string, unknown>;
    if (old.spotifyAlbumId && !old.targetId) {
      review.targetId = old.spotifyAlbumId as string;
      review.targetType = 'album';
      delete old.spotifyAlbumId;
      migrated = true;
    }
  }
  if (migrated) {
    console.log('[Migration] Reviews updated: spotifyAlbumId → targetId + targetType');
    needsWrite = true;
  }

  if (needsWrite) {
    await db.write();
  }
}

/**
 * Ensure all schema arrays exist after db.read().
 * Call this after every db.read() to guard against missing fields
 * in existing db.json files that haven't been fully migrated.
 */
export function ensureArrays(): void {
  if (!db.data.reviewVotes) db.data.reviewVotes = [];
  if (!db.data.reviewComments) db.data.reviewComments = [];
}

/**
 * Read the database and ensure all arrays exist.
 * Use this instead of db.read() in route handlers that access
 * reviewVotes or reviewComments.
 */
export async function safeRead(): Promise<void> {
  await db.read();
  ensureArrays();
}

export default db;
