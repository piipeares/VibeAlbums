/**
 * Migration script: lowdb (db.json) → Supabase PostgreSQL
 *
 * Run: npx tsx scripts/migrate-to-supabase.ts
 *
 * Creates all tables and migrates existing data from db.json.
 * Safe to re-run — drops tables first for a clean slate.
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Force IPv4 resolution (Supabase may only return AAAA records for direct DB)
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('🚀 Starting Supabase migration...\n');

  // ─── 1. Create schema ───────────────────────────────────────────
  console.log('📦 Creating tables...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('album', 'track')),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      content TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lists (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_public BOOLEAN DEFAULT true,
      items JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS review_votes (
      id UUID PRIMARY KEY,
      review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction SMALLINT NOT NULL CHECK (direction IN (1, -1)),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (review_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS review_comments (
      id UUID PRIMARY KEY,
      review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_comment_id UUID REFERENCES review_comments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  console.log('✅ Tables ready.\n');

  // ─── 2. Load data from db.json ──────────────────────────────────
  const dbPath = join(__dirname, '..', 'src', 'data', 'db.json');
  console.log(`📖 Reading data from ${dbPath}...`);

  let dbData: any;
  try {
    dbData = JSON.parse(readFileSync(dbPath, 'utf-8'));
  } catch {
    console.log('⚠️  No db.json found or empty — starting fresh.');
    dbData = {};
  }

  // ─── 3. Insert users ────────────────────────────────────────────
  if (dbData.users?.length) {
    console.log(`👤 Migrating ${dbData.users.length} users...`);
    for (const u of dbData.users) {
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash, display_name, avatar, bio, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, u.email, u.passwordHash, u.displayName, u.avatar, u.bio, u.createdAt]
      );
    }
    console.log(`✅ Users migrated.\n`);
  }

  // ─── 4. Insert reviews ──────────────────────────────────────────
  if (dbData.reviews?.length) {
    console.log(`📝 Migrating ${dbData.reviews.length} reviews...`);
    for (const r of dbData.reviews) {
      await pool.query(
        `INSERT INTO reviews (id, user_id, target_id, target_type, rating, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.userId, r.targetId, r.targetType, r.rating, r.content, r.createdAt, r.updatedAt]
      );
    }
    console.log(`✅ Reviews migrated.\n`);
  }

  // ─── 5. Insert lists ────────────────────────────────────────────
  if (dbData.lists?.length) {
    console.log(`📋 Migrating ${dbData.lists.length} lists...`);
    for (const l of dbData.lists) {
      await pool.query(
        `INSERT INTO lists (id, user_id, name, description, is_public, items, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.userId, l.name, l.description, l.isPublic, JSON.stringify(l.items), l.createdAt, l.updatedAt]
      );
    }
    console.log(`✅ Lists migrated.\n`);
  }

  // ─── 6. Insert follows ──────────────────────────────────────────
  if (dbData.follows?.length) {
    console.log(`🤝 Migrating ${dbData.follows.length} follows...`);
    for (const f of dbData.follows) {
      await pool.query(
        `INSERT INTO follows (follower_id, following_id, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [f.followerId, f.followingId, f.createdAt]
      );
    }
    console.log(`✅ Follows migrated.\n`);
  }

  // ─── 7. Insert review_votes ─────────────────────────────────────
  if (dbData.reviewVotes?.length) {
    console.log(`🗳️  Migrating ${dbData.reviewVotes.length} votes...`);
    for (const v of dbData.reviewVotes) {
      await pool.query(
        `INSERT INTO review_votes (id, review_id, user_id, direction, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [v.id, v.reviewId, v.userId, v.direction, v.createdAt]
      );
    }
    console.log(`✅ Votes migrated.\n`);
  }

  // ─── 8. Insert review_comments ──────────────────────────────────
  if (dbData.reviewComments?.length) {
    console.log(`💬 Migrating ${dbData.reviewComments.length} comments...`);
    for (const c of dbData.reviewComments) {
      await pool.query(
        `INSERT INTO review_comments (id, review_id, user_id, content, parent_comment_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.reviewId, c.userId, c.content, c.parentCommentId || null, c.createdAt, c.updatedAt]
      );
    }
    console.log(`✅ Comments migrated.\n`);
  }

  // ─── 9. Create indexes ──────────────────────────────────────────
  console.log('📊 Creating indexes...');
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_target_id ON reviews(target_id);
    CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
    CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);
    CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);
  `);
  console.log('✅ Indexes created.\n');

  console.log('✨ Migration complete!');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  pool.end();
  process.exit(1);
});
