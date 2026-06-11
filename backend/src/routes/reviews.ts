import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { Review, safeRead } from '../services/db.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helper: attach user info to reviews ──────────────────────────
function attachUser(review: Review) {
  const user = db.data.users.find(u => u.id === review.userId);
  if (!user) return { ...review, user: { id: '', username: 'Deleted', displayName: 'Deleted', avatar: '' } };
  return {
    ...review,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar
    }
  };
}

// ─── Helper: attach vote data to review responses ────────────────
function attachVoteData(reviewId: string, userId?: string) {
  const votes = db.data.reviewVotes.filter(v => v.reviewId === reviewId);
  const upvotes = votes.filter(v => v.direction === 1).length;
  const downvotes = votes.filter(v => v.direction === -1).length;
  const voteScore = upvotes - downvotes;
  let userVote: 1 | -1 | null = null;
  if (userId) {
    const found = votes.find(v => v.userId === userId);
    if (found) userVote = found.direction;
  }
  return { voteScore, userVote };
}

function computeStats(reviews: Review[]) {
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

// Lookup existing review for a user + target combination
async function findExistingReview(userId: string, targetId: string, targetType: 'album' | 'track'): Promise<Review | undefined> {
  await safeRead();
  return db.data.reviews.find(r => r.userId === userId && r.targetId === targetId && r.targetType === targetType);
}

// Get reviews (with optional filters: targetId, targetType, userId)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const { targetId, targetType, userId, limit = '20', offset = '0' } = req.query;

    let reviews = [...db.data.reviews];

    if (targetId) reviews = reviews.filter(r => r.targetId === targetId);
    if (targetType) reviews = reviews.filter(r => r.targetType === targetType);
    if (userId) reviews = reviews.filter(r => r.userId === userId);

    // Sort by newest first
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);
    const sliced = reviews.slice(offsetNum, offsetNum + limitNum);

    const enriched = sliced.map(r => ({
      ...attachUser(r),
      ...attachVoteData(r.id, req.user?.userId),
      commentCount: db.data.reviewComments.filter(c => c.reviewId === r.id).length
    }));

    res.json({
      reviews: enriched,
      total: reviews.length,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reviews + stats for a specific target (album or track)
async function getTargetReviews(targetId: string, userId?: string) {
  await safeRead();
  return db.data.reviews
    .filter(r => r.targetId === targetId)
    .map(r => ({
      ...attachUser(r),
      ...attachVoteData(r.id, userId),
      commentCount: db.data.reviewComments.filter(c => c.reviewId === r.id).length
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// GET /api/reviews/album/:id — reviews for an album
router.get('/album/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await getTargetReviews(req.params.id, req.user?.userId);
    res.json({ reviews, stats: computeStats(db.data.reviews.filter(r => r.targetId === req.params.id)) });
  } catch (error) {
    console.error('Get album reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reviews/track/:id — reviews for a track
router.get('/track/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await getTargetReviews(req.params.id, req.user?.userId);
    res.json({ reviews, stats: computeStats(db.data.reviews.filter(r => r.targetId === req.params.id)) });
  } catch (error) {
    console.error('Get track reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create review
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
    const existing = await findExistingReview(req.user!.userId, targetId, targetType);
    if (existing) {
      res.status(400).json({ error: 'You already reviewed this. Use PUT to update.' });
      return;
    }

    await safeRead();

    const newReview: Review = {
      id: uuidv4(),
      userId: req.user!.userId,
      targetId,
      targetType,
      rating,
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.data.reviews.push(newReview);
    await db.write();

    res.status(201).json({ ...attachUser(newReview), commentCount: 0 });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, content } = req.body;

    await safeRead();

    const reviewIndex = db.data.reviews.findIndex(r => r.id === req.params.id);
    if (reviewIndex === -1) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const review = db.data.reviews[reviewIndex];

    if (review.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to update this review' });
      return;
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
      }
      review.rating = rating;
    }

    if (content !== undefined) {
      review.content = content;
    }

    review.updatedAt = new Date().toISOString();
    await db.write();

    res.json({
      ...attachUser(review),
      commentCount: db.data.reviewComments.filter(c => c.reviewId === review.id).length
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const reviewIndex = db.data.reviews.findIndex(r => r.id === req.params.id);
    if (reviewIndex === -1) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const review = db.data.reviews[reviewIndex];
    if (review.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to delete this review' });
      return;
    }

    db.data.reviews.splice(reviewIndex, 1);

    // Cascade delete votes and comments for this review
    db.data.reviewVotes = db.data.reviewVotes.filter(v => v.reviewId !== req.params.id);
    db.data.reviewComments = db.data.reviewComments.filter(c => c.reviewId !== req.params.id);

    await db.write();

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
