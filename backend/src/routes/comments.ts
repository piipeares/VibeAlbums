import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { ReviewComment, safeRead } from '../services/db.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

function attachUser(comment: ReviewComment) {
  const user = db.data.users.find(u => u.id === comment.userId);
  if (!user) {
    return {
      ...comment,
      user: { id: '', username: 'Deleted', displayName: 'Deleted', avatar: '' }
    };
  }
  return {
    ...comment,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar
    }
  };
}

// Get comments for a review
// GET /api/reviews/:id/comments
router.get('/reviews/:id/comments', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const reviewId = req.params.id;

    // Verify review exists
    const review = db.data.reviews.find(r => r.id === reviewId);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const allComments = db.data.reviewComments
      .filter(c => c.reviewId === reviewId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Separate top-level from replies
    const topLevel = allComments.filter(c => !c.parentCommentId);
    const replies = allComments.filter(c => c.parentCommentId);

    const comments = topLevel.map(parent => ({
      ...attachUser(parent),
      replies: replies
        .filter(r => r.parentCommentId === parent.id)
        .map(r => attachUser(r))
    }));

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a comment on a review
// POST /api/reviews/:id/comments
router.post('/reviews/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentCommentId } = req.body as { content?: string; parentCommentId?: string };
    const reviewId = req.params.id;

    // Validate content
    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Content is required and cannot be empty' });
      return;
    }

    await safeRead();

    // Verify review exists
    const review = db.data.reviews.find(r => r.id === reviewId);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    // If replying, verify parent comment exists and belongs to same review
    let resolvedParentId: string | undefined;

    if (parentCommentId) {
      const parentComment = db.data.reviewComments.find(
        c => c.id === parentCommentId && c.reviewId === reviewId
      );
      if (!parentComment) {
        res.status(404).json({ error: 'Parent comment not found or does not belong to this review' });
        return;
      }
      // Flatten to one level: if replying to a reply, attach to the top-level parent instead
      resolvedParentId = parentComment.parentCommentId || parentCommentId;
    }

    const newComment: ReviewComment = {
      id: uuidv4(),
      reviewId,
      userId: req.user!.userId,
      content: content.trim(),
      parentCommentId: resolvedParentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.data.reviewComments.push(newComment);
    await db.write();

    res.status(201).json({ comment: attachUser(newComment) });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a comment
// PUT /api/comments/:id
router.put('/comments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body as { content?: string };

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Content is required and cannot be empty' });
      return;
    }

    await safeRead();

    const commentIndex = db.data.reviewComments.findIndex(c => c.id === req.params.id);
    if (commentIndex === -1) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const comment = db.data.reviewComments[commentIndex];
    if (comment.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to update this comment' });
      return;
    }

    comment.content = content.trim();
    comment.updatedAt = new Date().toISOString();
    await db.write();

    res.json({ comment: attachUser(comment) });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a comment (cascade: also deletes replies)
// DELETE /api/comments/:id
router.delete('/comments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const commentIndex = db.data.reviewComments.findIndex(c => c.id === req.params.id);
    if (commentIndex === -1) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const comment = db.data.reviewComments[commentIndex];
    if (comment.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to delete this comment' });
      return;
    }

    // Remove the comment
    db.data.reviewComments.splice(commentIndex, 1);

    // Cascade: also delete any replies to this comment
    db.data.reviewComments = db.data.reviewComments.filter(
      c => c.parentCommentId !== req.params.id
    );

    await db.write();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
