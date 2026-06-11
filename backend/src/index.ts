import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './services/supabase.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import reviewsRoutes from './routes/reviews.js';
import votesRoutes from './routes/votes.js';
import listsRoutes from './routes/lists.js';
import commentsRoutes from './routes/comments.js';
import spotifyRoutes from './routes/spotify.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((o) => o.trim()) : []),
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/reviews', votesRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api', commentsRoutes);
app.use('/api/spotify', spotifyRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel serverless
export default app;

// Start server locally (Vercel handles this via serverless wrapper)
const isVercel = process.env.VERCEL === '1';
if (!isVercel) {
  async function start() {
    try {
      // Verify Supabase connection
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      if (error) {
        console.error('Supabase connection failed:', error.message);
        process.exit(1);
      }
      console.log('✅ Connected to Supabase');

      app.listen(PORT, () => {
        console.log(`🎸 VibeAlbums API running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  start();
}
