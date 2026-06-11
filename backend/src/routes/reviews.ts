import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

async function enrichReview(review: any, userId?: string) {
  // Attach user info
  let userInfo = { id: '', username: 'Deleted', displayName: 'Deleted', avatar: '' };
  if (review.user_id) {
    const { data: u } = await supabase
      .from('users')
      .select('id, username, display_name, avatar')
      .eq('id', review.user_id)
      .single();
    if (u) {
      userInfo = { id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar };
    }
  }

  // Vote data
  const { data: votes } = await supabase
    .from('review_votes')
    .select('*')
    .eq('review_id', review.id);

  const allVotes = votes || [];
  const upvotes = allVotes.filter(v => v.direction === 1).length;
  const downvotes = allVotes.filter(v => v.direction === -1).length;
  const voteScore = upvotes - downvotes;
  let userVote: 1 | -1 | null = null;
  if (userId) {
    const found = allVotes.find(v => v.user_id === userId);
    if (found) userVote = found.direction;
  }

  // Comment count
  const { count } = await supabase
    .from('review_comments')
    .select('id', { count: 'exact', head: true })
    .eq('review_id', review.id);

  return {
    id: review.id,
    userId: review.user_id,
    targetId: review.target_id,
    targetType: review.target_type,
    rating: review.rating,
    content: review.content,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
    user: userInfo,
    voteScore,
    userVote,
    commentCount: count ?? 0
  };
}

function computeStats(reviews: any[]) {
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    distribution[r.rating as keyof typeof distribution]++;
  });
  return {
    count: reviews.length,
    averageRating: Math.round(avgRating * 10) / 10,
    distribution
  };
}

// GET /api/reviews — list with optional filters
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { targetId, targetType, userId, limit = '20', offset = '0' } = req.query;

    let query = supabase
      .from('reviews')
      .select('*', { count: 'exact' });

    if (targetId) query = query.eq('target_id', targetId as string);
    if (targetType) query = query.eq('target_type', targetType as string);
    if (userId) query = query.eq('user_id', userId as string);

    query = query.order('created_at', { ascending: false });

    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

    const { data: reviews, count } = await query.range(offsetNum, offsetNum + limitNum - 1);

    const enriched = await Promise.all(
      (reviews || []).map(r => enrichReview(r, req.user?.userId))
    );

    res.json({
      reviews: enriched,
      total: count ?? 0,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reviews/album/:id — reviews for an album
router.get('/album/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('target_id', req.params.id)
      .order('created_at', { ascending: false });

    const enriched = await Promise.all(
      (reviews || []).map(r => enrichReview(r, req.user?.userId))
    );

    res.json({
      reviews: enriched,
      stats: computeStats(reviews || [])
    });
  } catch (error) {
    console.error('Get album reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reviews/track/:id — reviews for a track
router.get('/track/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('target_id', req.params.id)
      .order('created_at', { ascending: false });

    const enriched = await Promise.all(
      (reviews || []).map(r => enrichReview(r, req.user?.userId))
    );

    res.json({
      reviews: enriched,
      stats: computeStats(reviews || [])
    });
  } catch (error) {
    console.error('Get track reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reviews — create review
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { targetId, targetType, rating, content } = req.body;

    if (!targetId || !targetType || !rating) {
      res.status(400).json({ error: 'targetId, targetType, and rating are required' });
      return;
    }

    if (targetType !== 'album' && targetType !== 'track') {
      res.status(400).json({ error: 'targetType must be "album" or "track"' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', req.user!.userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle();

    if (existing) {
      res.status(400).json({ error: 'You already reviewed this. Use PUT to update.' });
      return;
    }

    const now = new Date().toISOString();
    const newReview = {
      id: uuidv4(),
      user_id: req.user!.userId,
      target_id: targetId,
      target_type: targetType,
      rating,
      content: content || '',
      created_at: now,
      updated_at: now
    };

    const { error } = await supabase.from('reviews').insert(newReview);
    if (error) throw error;

    const enriched = await enrichReview(newReview, req.user!.userId);

    res.status(201).json(enriched);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/reviews/:id — update review
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, content } = req.body;

    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (review.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to update this review' });
      return;
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
      }
      updates.rating = rating;
    }
    if (content !== undefined) {
      updates.content = content;
    }

    const { error: updateError } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: updated } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', req.params.id)
      .single();

    const enriched = await enrichReview(updated, req.user!.userId);
    res.json(enriched);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/reviews/:id — delete review (cascade handled by DB)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (review.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to delete this review' });
      return;
    }

    // Delete the review (votes and comments cascade via DB foreign keys)
    const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
