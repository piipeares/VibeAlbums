import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

async function computeVoteState(reviewId: string, userId?: string) {
  const { data: votes } = await supabase
    .from('review_votes')
    .select('*')
    .eq('review_id', reviewId);

  const allVotes = votes || [];
  const upvotes = allVotes.filter(v => v.direction === 1).length;
  const downvotes = allVotes.filter(v => v.direction === -1).length;
  const score = upvotes - downvotes;
  let userVote: 1 | -1 | null = null;
  if (userId) {
    const found = allVotes.find(v => v.user_id === userId);
    if (found) userVote = found.direction;
  }
  return { upvotes, downvotes, score, userVote };
}

// POST /api/reviews/:id/vote — toggle vote
router.post('/:id/vote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { direction } = req.body as { direction: 1 | -1 };

    if (direction !== 1 && direction !== -1) {
      res.status(400).json({ error: 'direction must be 1 (upvote) or -1 (downvote)' });
      return;
    }

    const reviewId = req.params.id;
    const userId = req.user!.userId;

    // Verify review exists
    const { data: review } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .maybeSingle();

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    // Look for existing vote
    const { data: existingVote } = await supabase
      .from('review_votes')
      .select('*')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVote && existingVote.direction === direction) {
      // Same direction → delete (toggle off)
      await supabase
        .from('review_votes')
        .delete()
        .eq('id', existingVote.id);

      const state = await computeVoteState(reviewId, userId);
      res.json({ vote: null, ...state });
      return;
    }

    if (existingVote && existingVote.direction !== direction) {
      // Opposite direction → update
      await supabase
        .from('review_votes')
        .update({ direction, created_at: new Date().toISOString() })
        .eq('id', existingVote.id);

      const state = await computeVoteState(reviewId, userId);
      const { data: updatedVote } = await supabase
        .from('review_votes')
        .select('*')
        .eq('id', existingVote.id)
        .single();

      res.json({ vote: updatedVote, ...state });
      return;
    }

    // No existing vote → create
    const newVote = {
      id: uuidv4(),
      review_id: reviewId,
      user_id: userId,
      direction,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('review_votes').insert(newVote);
    if (error) throw error;

    const state = await computeVoteState(reviewId, userId);
    res.status(201).json({ vote: newVote, ...state });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reviews/:id/votes — get vote state
router.get('/:id/votes', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = req.params.id;

    // Verify review exists
    const { data: review } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .maybeSingle();

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const state = await computeVoteState(reviewId, req.user?.userId);
    res.json(state);
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
