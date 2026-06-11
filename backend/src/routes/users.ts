import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { getTargetInfo } from '../services/spotify.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

function mapUser(u: any, isFollowing?: boolean, stats?: any) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatar: u.avatar,
    bio: u.bio,
    ...(stats ? { stats } : {}),
    ...(isFollowing !== undefined ? { isFollowing } : {}),
    ...(u.created_at ? { createdAt: u.created_at } : {})
  };
}

async function getUserByUsername(username: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  return data;
}

async function getReviewVoteData(reviewId: string, userId?: string) {
  const { data: votes } = await supabase
    .from('review_votes')
    .select('*')
    .eq('review_id', reviewId);

  const allVotes = votes || [];
  const upvotes = allVotes.filter(v => v.direction === 1).length;
  const downvotes = allVotes.filter(v => v.direction === -1).length;
  const voteScore = upvotes - downvotes;
  let userVote: 1 | -1 | null = null;
  if (userId) {
    const found = allVotes.find(v => v.user_id === userId);
    if (found) userVote = found.direction;
  }
  return { voteScore, userVote };
}

// Search users by username or displayName
router.get('/search', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      res.json([]);
      return;
    }

    const query = q.toLowerCase().trim();
    const { data: users } = await supabase
      .from('users')
      .select('id, username, display_name, avatar, bio')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    const mapped = (users || []).map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatar: u.avatar,
      bio: u.bio
    }));

    res.json(mapped);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/:username', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get stats in parallel
    const [reviewsRes, listsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    let isFollowing = false;
    if (req.user) {
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', req.user.userId)
        .eq('following_id', user.id)
        .maybeSingle();
      isFollowing = !!follow;
    }

    res.json(mapUser(user, isFollowing, {
      reviews: reviewsRes.count ?? 0,
      lists: listsRes.count ?? 0,
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0
    }));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/:username', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { displayName, avatar, bio } = req.body;
    const updates: any = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (avatar !== undefined) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
      if (error) throw error;
    }

    // Re-fetch to get updated data
    const { data: updated } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json(mapUser(updated));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow user
router.post('/:username/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const targetUser = await getUserByUsername(req.params.username);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser.id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot follow yourself' });
      return;
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', req.user!.userId)
      .eq('following_id', targetUser.id)
      .maybeSingle();

    if (existing) {
      res.status(400).json({ error: 'Already following this user' });
      return;
    }

    const { error } = await supabase.from('follows').insert({
      follower_id: req.user!.userId,
      following_id: targetUser.id,
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    res.json({ success: true, message: `Now following ${targetUser.username}` });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow user
router.delete('/:username/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const targetUser = await getUserByUsername(req.params.username);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', req.user!.userId)
      .eq('following_id', targetUser.id)
      .maybeSingle();

    if (!existing) {
      res.status(400).json({ error: 'Not following this user' });
      return;
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', req.user!.userId)
      .eq('following_id', targetUser.id);

    if (error) throw error;

    res.json({ success: true, message: `Unfollowed ${targetUser.username}` });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user followers
router.get('/:username/followers', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { data: follows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id);

    if (!follows?.length) {
      res.json([]);
      return;
    }

    const followerIds = follows.map(f => f.follower_id);
    const { data: followers } = await supabase
      .from('users')
      .select('id, username, display_name, avatar, bio')
      .in('id', followerIds);

    const mapped = (followers || []).map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatar: u.avatar,
      bio: u.bio
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user following
router.get('/:username/following', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (!follows?.length) {
      res.json([]);
      return;
    }

    const followingIds = follows.map(f => f.following_id);
    const { data: following } = await supabase
      .from('users')
      .select('id, username, display_name, avatar, bio')
      .in('id', followingIds);

    const mapped = (following || []).map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatar: u.avatar,
      bio: u.bio
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user reviews (enriched with Spotify data)
router.get('/:username/reviews', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { data: rawReviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const reviews = rawReviews || [];

    // Enrich with Spotify data and vote/comment counts
    const enriched = await Promise.all(
      reviews.map(async (r) => {
        const voteData = await getReviewVoteData(r.id, req.user?.userId);

        let commentCount = 0;
        const { count } = await supabase
          .from('review_comments')
          .select('id', { count: 'exact', head: true })
          .eq('review_id', r.id);
        commentCount = count ?? 0;

        try {
          const info = await getTargetInfo(r.target_id, r.target_type);
          return {
            id: r.id,
            targetId: r.target_id,
            targetType: r.target_type,
            targetName: info.name,
            targetArtist: info.artist,
            targetImage: info.image,
            rating: r.rating,
            content: r.content,
            createdAt: r.created_at,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              avatar: user.avatar
            },
            ...voteData,
            commentCount
          };
        } catch {
          return {
            id: r.id,
            targetId: r.target_id,
            targetType: r.target_type,
            targetName: 'Unknown',
            targetArtist: '',
            targetImage: '',
            rating: r.rating,
            content: r.content,
            createdAt: r.created_at,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              avatar: user.avatar
            },
            ...voteData,
            commentCount
          };
        }
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user lists
router.get('/:username/lists', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isOwnProfile = req.user?.userId === user.id;

    let query = supabase
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!isOwnProfile) {
      query = query.eq('is_public', true);
    }

    const { data: lists } = await query;

    const mapped = (lists || []).map(l => ({
      id: l.id,
      name: l.name,
      description: l.description,
      isPublic: l.is_public,
      itemsCount: l.items?.length || 0,
      createdAt: l.created_at,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar
      }
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Get user lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
