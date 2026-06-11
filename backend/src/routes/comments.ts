import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

async function attachUserToComment(comment: any) {
  let userInfo = { id: '', username: 'Deleted', displayName: 'Deleted', avatar: '' };

  if (comment.user_id) {
    const { data: u } = await supabase
      .from('users')
      .select('id, username, display_name, avatar')
      .eq('id', comment.user_id)
      .single();

    if (u) {
      userInfo = { id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar };
    }
  }

  return {
    id: comment.id,
    reviewId: comment.review_id,
    userId: comment.user_id,
    content: comment.content,
    parentCommentId: comment.parent_comment_id,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    user: userInfo
  };
}

// GET /api/reviews/:id/comments — get comments for a review
router.get('/reviews/:id/comments', optionalAuth, async (req: AuthRequest, res: Response) => {
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

    const { data: allComments } = await supabase
      .from('review_comments')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    const comments = allComments || [];

    // Separate top-level from replies
    const topLevel = comments.filter(c => !c.parent_comment_id);
    const replies = comments.filter(c => c.parent_comment_id);

    const mapped = await Promise.all(
      topLevel.map(async (parent) => {
        const parentWithUser = await attachUserToComment(parent);
        const replyPromises = replies
          .filter(r => r.parent_comment_id === parent.id)
          .map(r => attachUserToComment(r));
        const replyResults = await Promise.all(replyPromises);
        return {
          ...parentWithUser,
          replies: replyResults
        };
      })
    );

    res.json({ comments: mapped });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reviews/:id/comments — create a comment
router.post('/reviews/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentCommentId } = req.body as { content?: string; parentCommentId?: string };
    const reviewId = req.params.id;

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Content is required and cannot be empty' });
      return;
    }

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

    // If replying, verify parent comment exists and belongs to same review
    let resolvedParentId: string | undefined;

    if (parentCommentId) {
      const { data: parentComment } = await supabase
        .from('review_comments')
        .select('id, parent_comment_id, review_id')
        .eq('id', parentCommentId)
        .eq('review_id', reviewId)
        .maybeSingle();

      if (!parentComment) {
        res.status(404).json({ error: 'Parent comment not found or does not belong to this review' });
        return;
      }
      // Flatten to one level: if replying to a reply, attach to the top-level parent instead
      resolvedParentId = parentComment.parent_comment_id || parentCommentId;
    }

    const now = new Date().toISOString();
    const newComment = {
      id: uuidv4(),
      review_id: reviewId,
      user_id: req.user!.userId,
      content: content.trim(),
      parent_comment_id: resolvedParentId || null,
      created_at: now,
      updated_at: now
    };

    const { error } = await supabase.from('review_comments').insert(newComment);
    if (error) throw error;

    const enriched = await attachUserToComment(newComment);
    res.status(201).json({ comment: enriched });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/comments/:id — update a comment
router.put('/comments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body as { content?: string };

    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'Content is required and cannot be empty' });
      return;
    }

    const { data: comment, error: fetchError } = await supabase
      .from('review_comments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to update this comment' });
      return;
    }

    const { error } = await supabase
      .from('review_comments')
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    const { data: updated } = await supabase
      .from('review_comments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    const enriched = await attachUserToComment(updated);
    res.json({ comment: enriched });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/comments/:id — delete a comment (cascade replies via DB)
router.delete('/comments/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: comment, error: fetchError } = await supabase
      .from('review_comments')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized to delete this comment' });
      return;
    }

    // Delete the comment (replies cascade via DB foreign key)
    const { error } = await supabase
      .from('review_comments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
