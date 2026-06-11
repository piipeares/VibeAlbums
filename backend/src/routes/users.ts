import { Router, Response } from 'express';
import db, { User, safeRead } from '../services/db.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { getTargetInfo } from '../services/spotify.js';

const router = Router();

// Search users by username or displayName
router.get('/search', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      res.json([]);
      return;
    }

    await safeRead();

    const query = q.toLowerCase().trim();
    const results = db.data.users
      .filter(u =>
        u.username.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query)
      )
      .slice(0, 20)
      .map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio
      }));

    res.json(results);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/:username', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const user = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get stats
    const reviewsCount = db.data.reviews.filter(r => r.userId === user.id).length;
    const listsCount = db.data.lists.filter(l => l.userId === user.id && l.isPublic).length;
    const followersCount = db.data.follows.filter(f => f.followingId === user.id).length;
    const followingCount = db.data.follows.filter(f => f.followerId === user.id).length;

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user) {
      const follow = db.data.follows.find(
        f => f.followerId === req.user!.userId && f.followingId === user.id
      );
      isFollowing = !!follow;
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      stats: {
        reviews: reviewsCount,
        lists: listsCount,
        followers: followersCount,
        following: followingCount
      },
      isFollowing,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/:username', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const user = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Can only update own profile
    if (user.id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { displayName, avatar, bio } = req.body;

    if (displayName !== undefined) user.displayName = displayName;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;

    await db.write();

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow user
router.post('/:username/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const targetUser = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser.id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot follow yourself' });
      return;
    }

    // Check if already following
    const existingFollow = db.data.follows.find(
      f => f.followerId === req.user!.userId && f.followingId === targetUser.id
    );

    if (existingFollow) {
      res.status(400).json({ error: 'Already following this user' });
      return;
    }

    db.data.follows.push({
      followerId: req.user!.userId,
      followingId: targetUser.id,
      createdAt: new Date().toISOString()
    });

    await db.write();

    res.json({ success: true, message: `Now following ${targetUser.username}` });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow user
router.delete('/:username/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const targetUser = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const followIndex = db.data.follows.findIndex(
      f => f.followerId === req.user!.userId && f.followingId === targetUser.id
    );

    if (followIndex === -1) {
      res.status(400).json({ error: 'Not following this user' });
      return;
    }

    db.data.follows.splice(followIndex, 1);
    await db.write();

    res.json({ success: true, message: `Unfollowed ${targetUser.username}` });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user followers
router.get('/:username/followers', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const user = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const followers = db.data.follows
      .filter(f => f.followingId === user.id)
      .map(f => {
        const follower = db.data.users.find(u => u.id === f.followerId)!;
        return {
          id: follower.id,
          username: follower.username,
          displayName: follower.displayName,
          avatar: follower.avatar,
          bio: follower.bio
        };
      });

    res.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user following
router.get('/:username/following', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const user = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const following = db.data.follows
      .filter(f => f.followerId === user.id)
      .map(f => {
        const followed = db.data.users.find(u => u.id === f.followingId)!;
        return {
          id: followed.id,
          username: followed.username,
          displayName: followed.displayName,
          avatar: followed.avatar,
          bio: followed.bio
        };
      });

    res.json(following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user reviews (enriquecidas con nombre/artista desde Spotify)
router.get('/:username/reviews', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await safeRead();

    const user = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const rawReviews = db.data.reviews
      .filter(r => r.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Compute vote data helper
    function getReviewVoteData(reviewId: string) {
      const votes = db.data.reviewVotes.filter(v => v.reviewId === reviewId);
      const upvotes = votes.filter(v => v.direction === 1).length;
      const downvotes = votes.filter(v => v.direction === -1).length;
      const voteScore = upvotes - downvotes;
      let userVote: 1 | -1 | null = null;
      if (req.user) {
        const found = votes.find(v => v.userId === req.user!.userId);
        if (found) userVote = found.direction;
      }
      return { voteScore, userVote };
    }

    // Enriquecer con nombre + artista desde Spotify (en paralelo, usa caché)
    const enriched = await Promise.all(
      rawReviews.map(async (r) => {
        try {
          const info = await getTargetInfo(r.targetId, r.targetType);
      const commentCount = db.data.reviewComments.filter(c => c.reviewId === r.id).length;
      return {
        id: r.id,
        targetId: r.targetId,
        targetType: r.targetType,
        targetName: info.name,
        targetArtist: info.artist,
        targetImage: info.image,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar
        },
        ...getReviewVoteData(r.id),
        commentCount
      };
    } catch {
      // Si falla Spotify, devolver sin targetName (se muestra como "Unknown")
      const commentCount = db.data.reviewComments.filter(c => c.reviewId === r.id).length;
      return {
        id: r.id,
        targetId: r.targetId,
        targetType: r.targetType,
        targetName: 'Unknown',
        targetArtist: '',
        targetImage: '',
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar
        },
        ...getReviewVoteData(r.id),
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
    await safeRead();

    const user = db.data.users.find(u => u.username.toLowerCase() === req.params.username.toLowerCase());

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // If viewing own profile, show all lists; otherwise only public
    const isOwnProfile = req.user?.userId === user.id;

    const lists = db.data.lists
      .filter(l => l.userId === user.id && (isOwnProfile || l.isPublic))
      .map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        isPublic: l.isPublic,
        itemsCount: l.items.length,
        createdAt: l.createdAt,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar
        }
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(lists);
  } catch (error) {
    console.error('Get user lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
