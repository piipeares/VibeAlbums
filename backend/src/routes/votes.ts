import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { ReviewVote, safeRead } from '../services/db.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

function computeVoteState(reviewId: string, userId?: string) {
  const votes = db.data.reviewVotes.filter(v => v.reviewId === reviewId);
  const upvotes = votes.filter(v => v.direction === 1).length;
  const downvotes = votes.filter(v => v.direction === -1).length;
  const score = upvotes - downvotes;
  let userVote: 1 | -1 | null = null;
  if (userId) {
    const found = votes.find(v => v.userId === userId);
    if (found) userVote = found.direction;
  }
  return { upvotes, downvotes, score, userVote };
}

// ─── POST /api/reviews/:id/vote — toggle vote ────────────────────
router.post('/:id/vote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { direction } = req.body as { direction: 1 | -1 };

    if (direction !== 1 && direction !== -1) {
      res.status(400).json({ error: 'direction must be 1 (upvote) or -1 (downvote)' });
      return;
    }

    const reviewId = req.params.id;
    const userId = req.user!.userId;

    await safeRead();

    // Verify review exists
    const review = db.data.reviews.find(r => r.id === reviewId);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const existingIndex = db.data.reviewVotes.findIndex(
      v => v.reviewId === reviewId && v.userId === userId
    );

    const existingVote = existingIndex !== -1 ? db.data.reviewVotes[existingIndex] : null;

    if (existingVote && existingVote.direction === direction) {
      // Same direction → delete (toggle off)
      db.data.reviewVotes.splice(existingIndex, 1);
      await db.write();
      const state = computeVoteState(reviewId, userId);
      res.json({ vote: null, ...state });
      return;
    }

    if (existingVote && existingVote.direction !== direction) {
      // Opposite direction → update
      db.data.reviewVotes[existingIndex].direction = direction;
      db.data.reviewVotes[existingIndex].createdAt = new Date().toISOString();
      await db.write();
      const state = computeVoteState(reviewId, userId);
      res.json({ vote: db.data.reviewVotes[existingIndex], ...state });
      return;
    }

    // No existing vote → create new
    const newVote: ReviewVote = {
      id: uuidv4(),
      reviewId,
      userId,
      direction,
      createdAt: new Date().toISOString()
    };

    db.data.reviewVotes.push(newVote);
    await db.write();

    const state = computeVoteState(reviewId, userId);
    res.status(201).json({ vote: newVote, ...state });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/reviews/:id/votes — get vote state ─────────────────
router.get('/:id/votes', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const reviewId = req.params.id;

    // Verify review exists
    const review = db.data.reviews.find(r => r.id === reviewId);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const state = computeVoteState(reviewId, req.user?.userId);
    res.json(state);
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
