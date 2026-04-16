import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { User } from '../services/db.js';
import { hashPassword, comparePassword, generateToken } from '../services/auth.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email and password are required' });
      return;
    }

    await db.read();

    // Check if user exists
    const existingUser = db.data.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      res.status(400).json({ error: 'Username or email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`;

    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      passwordHash,
      displayName: displayName || username,
      avatar,
      bio: '',
      createdAt: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const token = generateToken({ userId: newUser.id, username: newUser.username });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        avatar: newUser.avatar,
        bio: newUser.bio
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    await db.read();

    const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await comparePassword(password, user.passwordHash);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ userId: user.id, username: user.username });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const user = db.data.users.find(u => u.id === req.user!.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get stats
    const reviewsCount = db.data.reviews.filter(r => r.userId === user.id).length;
    const listsCount = db.data.lists.filter(l => l.userId === user.id).length;
    const followersCount = db.data.follows.filter(f => f.followingId === user.id).length;
    const followingCount = db.data.follows.filter(f => f.followerId === user.id).length;

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
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
