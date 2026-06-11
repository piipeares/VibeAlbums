import { Router, Request, Response } from 'express';
import { searchSpotify, getAlbum, getAlbumTracks, getTrack, getNewReleases, getAlbumWithTracks, getArtist, getArtistAlbums, getArtistTopTracks, getHomeAlbums } from '../services/spotify.js';

const router = Router();

// Search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type = 'both', limit } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    // Validate and clamp limit (Spotify max is 50)
    let limitNum = 20;
    if (limit !== undefined) {
      limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    }

    const result = await searchSpotify(
      q as string,
      type as 'album' | 'track' | 'both',
      limitNum
    );

    res.json(result);
  } catch (error) {
    console.error('Spotify search error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to search Spotify', details: message });
  }
});

// Home page — múltiples queries combinadas, ordenadas por popularidad
router.get('/home', async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" (comma-separated) is required' });
      return;
    }

    // Split by comma, trim each query
    const queries = q.split(',').map(s => s.trim()).filter(Boolean);

    if (queries.length === 0) {
      res.status(400).json({ error: 'At least one query is required' });
      return;
    }

    let limitNum = 4;
    if (limit !== undefined) {
      limitNum = Math.min(10, Math.max(1, parseInt(String(limit), 10) || 4));
    }

    const albums = await getHomeAlbums(queries, limitNum);
    res.json({ items: albums });
  } catch (error) {
    console.error('Spotify home error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to load home albums', details: message });
  }
});

// Get album
router.get('/album/:id', async (req: Request, res: Response) => {
  try {
    const album = await getAlbum(req.params.id);
    res.json(album);
  } catch (error) {
    console.error('Spotify get album error:', error);
    res.status(500).json({ error: 'Failed to get album' });
  }
});

// Get album tracks
router.get('/album/:id/tracks', async (req: Request, res: Response) => {
  try {
    const tracks = await getAlbumTracks(req.params.id);
    res.json(tracks);
  } catch (error) {
    console.error('Spotify get tracks error:', error);
    res.status(500).json({ error: 'Failed to get tracks' });
  }
});

// Get album with tracks (combined)
router.get('/album/:id/full', async (req: Request, res: Response) => {
  try {
    const result = await getAlbumWithTracks(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Spotify get full album error:', error);
    res.status(500).json({ error: 'Failed to get album details' });
  }
});

// Get track
router.get('/track/:id', async (req: Request, res: Response) => {
  try {
    const track = await getTrack(req.params.id);
    res.json(track);
  } catch (error) {
    console.error('Spotify get track error:', error);
    res.status(500).json({ error: 'Failed to get track' });
  }
});

// Get new releases
router.get('/new-releases', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    
    // Validate and clamp limit (Spotify max is 50)
    let limitNum = 20;
    if (limit !== undefined) {
      limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    }
    
    const result = await getNewReleases(limitNum);
    res.json(result);
  } catch (error) {
    console.error('Spotify new releases error:', error);
    res.status(500).json({ error: 'Failed to get new releases' });
  }
});

// Get artist
router.get('/artist/:id', async (req: Request, res: Response) => {
  try {
    const artist = await getArtist(req.params.id);
    res.json(artist);
  } catch (error) {
    console.error('Spotify get artist error:', error);
    res.status(500).json({ error: 'Failed to get artist' });
  }
});

// Get artist albums
router.get('/artist/:id/albums', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    let limitNum = 20;
    if (limit !== undefined) {
      limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
    }
    const albums = await getArtistAlbums(req.params.id, limitNum);
    res.json(albums);
  } catch (error) {
    console.error('Spotify get artist albums error:', error);
    res.status(500).json({ error: 'Failed to get artist albums' });
  }
});

// Get artist top tracks
router.get('/artist/:id/top-tracks', async (req: Request, res: Response) => {
  try {
    const tracks = await getArtistTopTracks(req.params.id);
    res.json(tracks);
  } catch (error) {
    console.error('Spotify get artist top tracks error:', error);
    res.status(500).json({ error: 'Failed to get artist top tracks' });
  }
});

export default router;
