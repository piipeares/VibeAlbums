import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { Review } from '../services/db.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get reviews (with optional filters)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const { albumId, userId, limit = 20, offset = 0 } = req.query;

    let reviews = [...db.data.reviews];

    if (albumId) {
      reviews = reviews.filter(r => r.spotifyAlbumId === albumId);
    }

    if (userId) {
      reviews = reviews.filter(r => r.userId === userId);
    }

    // Sort by newest first
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Add user info
    const reviewsWithUser = reviews.slice(Number(offset), Number(offset) + Number(limit)).map(r => {
      const user = db.data.users.find(u => u.id === r.userId)!;
      return {
        ...r,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar
        }
      };
    });

    res.json({
      reviews: reviewsWithUser,
      total: reviews.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reviews for specific album
router.get('/album/:albumId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const reviews = db.data.reviews
      .filter(r => r.spotifyAlbumId === req.params.albumId)
      .map(r => {
        const user = db.data.users.find(u => u.id === r.userId)!;
        return {
          ...r,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
          }
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // Rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    res.json({
      reviews,
      stats: {
        count: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
        distribution
      }
    });
  } catch (error) {
    console.error('Get album reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create review
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { spotifyAlbumId, rating, content } = req.body;

    if (!spotifyAlbumId || !rating) {
      res.status(400).json({ error: 'Album ID and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    await db.read();

    // Check if user already reviewed this album
    const existingReview = db.data.reviews.find(
      r => r.userId === req.user!.userId && r.spotifyAlbumId === spotifyAlbumId
    );

    if (existingReview) {
      res.status(400).json({ error: 'You already reviewed this album. Use PUT to update.' });
      return;
    }

    const newReview: Review = {
      id: uuidv4(),
      userId: req.user!.userId,
      spotifyAlbumId,
      rating,
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.data.reviews.push(newReview);
    await db.write();

    const user = db.data.users.find(u => u.id === req.user!.userId)!;

    res.status(201).json({
      ...newReview,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, content } = req.body;

    await db.read();

    const reviewIndex = db.data.reviews.findIndex(r => r.id === req.params.id);

    if (reviewIndex === -1) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const review = db.data.reviews[reviewIndex];

    // Can only update own review
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

    const user = db.data.users.find(u => u.id === review.userId)!;

    res.json({
      ...review,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const reviewIndex = db.data.reviews.findIndex(r => r.id === req.params.id);

    if (reviewIndex === -1) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const review = db.data.reviews[reviewIndex];

    // Can only delete own review
    if (review.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to delete this review' });
      return;
    }

    db.data.reviews.splice(reviewIndex, 1);
    await db.write();

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
