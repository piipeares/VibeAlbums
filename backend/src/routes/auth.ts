import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase.js';
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

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.ilike.${username},email.ilike.${email}`)
      .maybeSingle();

    if (existing) {
      res.status(400).json({ error: 'Username or email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`;

    const newUser = {
      id: uuidv4(),
      username,
      email,
      password_hash: passwordHash,
      display_name: displayName || username,
      avatar,
      bio: '',
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('users').insert(newUser);
    if (error) throw error;

    const token = generateToken({ userId: newUser.id, username: newUser.username });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
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

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await comparePassword(password, user.password_hash);
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
        displayName: user.display_name,
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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get stats via parallel count queries
    const [reviewsRes, listsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      bio: user.bio,
      stats: {
        reviews: reviewsRes.count ?? 0,
        lists: listsRes.count ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0
      },
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
