/**
 * Data migration: lowdb (db.json) → Supabase via REST API
 *
 * Pre-requisite: Run schema.sql in the Supabase SQL Editor FIRST.
 * Run: npx tsx scripts/migrate-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateData() {
  console.log('🚀 Starting data migration to Supabase...\n');

  // ─── Load data ──────────────────────────────────────────────────
  const dbPath = join(__dirname, '..', 'src', 'data', 'db.json');
  let dbData: any;
  try {
    dbData = JSON.parse(readFileSync(dbPath, 'utf-8'));
    console.log(`📖 Loaded data from ${dbPath}`);
  } catch {
    console.log('⚠️  No db.json found — nothing to migrate.');
    return;
  }

  // ─── 1. Users ───────────────────────────────────────────────────
  if (dbData.users?.length) {
    console.log(`👤 Migrating ${dbData.users.length} users...`);
    const records = dbData.users.map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      password_hash: u.passwordHash,
      display_name: u.displayName,
      avatar: u.avatar || '',
      bio: u.bio || '',
      created_at: u.createdAt,
    }));
    const { error } = await supabase.from('users').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Users insert failed: ${error.message}`);
    console.log('✅ Users migrated.\n');
  }

  // ─── 2. Reviews ─────────────────────────────────────────────────
  if (dbData.reviews?.length) {
    console.log(`📝 Migrating ${dbData.reviews.length} reviews...`);
    const records = dbData.reviews.map((r: any) => ({
      id: r.id,
      user_id: r.userId,
      target_id: r.targetId,
      target_type: r.targetType,
      rating: r.rating,
      content: r.content || '',
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));
    const { error } = await supabase.from('reviews').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Reviews insert failed: ${error.message}`);
    console.log('✅ Reviews migrated.\n');
  }

  // ─── 3. Lists ───────────────────────────────────────────────────
  if (dbData.lists?.length) {
    console.log(`📋 Migrating ${dbData.lists.length} lists...`);
    const records = dbData.lists.map((l: any) => ({
      id: l.id,
      user_id: l.userId,
      name: l.name,
      description: l.description || '',
      is_public: l.isPublic ?? true,
      items: l.items || [],
      created_at: l.createdAt,
      updated_at: l.updatedAt,
    }));
    const { error } = await supabase.from('lists').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Lists insert failed: ${error.message}`);
    console.log('✅ Lists migrated.\n');
  }

  // ─── 4. Follows ─────────────────────────────────────────────────
  if (dbData.follows?.length) {
    console.log(`🤝 Migrating ${dbData.follows.length} follows...`);
    const records = dbData.follows.map((f: any) => ({
      follower_id: f.followerId,
      following_id: f.followingId,
      created_at: f.createdAt,
    }));
    const { error } = await supabase.from('follows').upsert(records, { onConflict: 'follower_id,following_id' });
    if (error) throw new Error(`Follows insert failed: ${error.message}`);
    console.log('✅ Follows migrated.\n');
  }

  // ─── 5. Review Votes ────────────────────────────────────────────
  if (dbData.reviewVotes?.length) {
    console.log(`🗳️  Migrating ${dbData.reviewVotes.length} votes...`);
    const records = dbData.reviewVotes.map((v: any) => ({
      id: v.id,
      review_id: v.reviewId,
      user_id: v.userId,
      direction: v.direction,
      created_at: v.createdAt,
    }));
    const { error } = await supabase.from('review_votes').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Votes insert failed: ${error.message}`);
    console.log('✅ Votes migrated.\n');
  }

  // ─── 6. Review Comments ─────────────────────────────────────────
  if (dbData.reviewComments?.length) {
    console.log(`💬 Migrating ${dbData.reviewComments.length} comments...`);
    const records = dbData.reviewComments.map((c: any) => ({
      id: c.id,
      review_id: c.reviewId,
      user_id: c.userId,
      content: c.content,
      parent_comment_id: c.parentCommentId || null,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }));
    const { error } = await supabase.from('review_comments').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Comments insert failed: ${error.message}`);
    console.log('✅ Comments migrated.\n');
  }

  if (!dbData.users?.length && !dbData.reviews?.length && !dbData.lists?.length &&
      !dbData.follows?.length && !dbData.reviewVotes?.length && !dbData.reviewComments?.length) {
    console.log('📭 No data found in db.json to migrate. Starting fresh.\n');
  }

  console.log('✨ Data migration complete!');
}

migrateData().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
