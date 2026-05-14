import dotenv from 'dotenv';
dotenv.config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  popularity?: number;
  genres?: string[];
  album_type?: 'album' | 'single' | 'compilation';
}

export interface SpotifyArtistFull {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  popularity: number;
  followers: { total: number };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  album?: {
    id: string;
    name: string;
    images: SpotifyImage[];
  };
}

export interface SpotifySearchResult {
  albums: {
    items: SpotifyAlbum[];
    total: number;
  };
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify auth failed: ${error}`);
  }

  const data = await response.json() as SpotifyTokenResponse;

  // Cache the token with a 1-minute buffer before expiry
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000) - 60000
  };

  return cachedToken.token;
}

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();

  const url = `${API_BASE}${endpoint}`;
  console.log(`[Spotify Request] ${url}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Spotify Error] Status: ${response.status}, Body: ${error}`);
    throw new Error(`Spotify API error: ${error}`);
  }

  return response.json() as T;
}

// Spotify has a per-request limit of 10 for this API key
// We work around this by making multiple requests and combining results
const SPOTIFY_MAX_LIMIT = 10;

export async function searchSpotify(query: string, type: 'album' | 'track' | 'both' = 'both', limit = 20): Promise<SpotifySearchResult> {
  const types = type === 'both' ? 'album,track' : type;

  // If limit is within max, make a single request
  if (limit <= SPOTIFY_MAX_LIMIT) {
    const params = new URLSearchParams({
      q: query,
      type: types,
      limit: limit.toString()
    });

    console.log(`[Search Spotify] query="${query}", type="${types}", limit=${limit} (single request)`);
    const data = await spotifyFetch<SpotifySearchResult>(`/search?${params}`);
    return data;
  }

  // For higher limits, make multiple requests with offset and combine
  console.log(`[Search Spotify] query="${query}", type="${types}", limit=${limit} (multiple requests)`);

  const albums: SpotifyAlbum[] = [];
  const tracks: SpotifyTrack[] = [];
  let totalAlbums = 0;
  let totalTracks = 0;
  let offset = 0;

  // Make requests in batches of SPOTIFY_MAX_LIMIT
  const batches = Math.ceil(limit / SPOTIFY_MAX_LIMIT);

  for (let i = 0; i < batches; i++) {
    const batchLimit = Math.min(SPOTIFY_MAX_LIMIT, limit - albums.length - (type === 'track' ? tracks.length : 0));
    const params = new URLSearchParams({
      q: query,
      type: types,
      limit: batchLimit.toString(),
      offset: offset.toString()
    });

    console.log(`[Search Spotify] Batch ${i + 1}/${batches}, limit=${batchLimit}, offset=${offset}`);
    const data = await spotifyFetch<SpotifySearchResult>(`/search?${params}`);

    // Accumulate results based on type
    if (type === 'album' || type === 'both') {
      albums.push(...(data.albums?.items || []));
      totalAlbums = data.albums?.total || 0;
    }
    if (type === 'track' || type === 'both') {
      tracks.push(...(data.tracks?.items || []));
      totalTracks = data.tracks?.total || 0;
    }

    // Increment offset for next batch
    offset += batchLimit;
  }

  return {
    albums: { items: albums, total: totalAlbums },
    tracks: { items: tracks, total: totalTracks }
  };
}

export async function getAlbum(albumId: string): Promise<SpotifyAlbum> {
  const data = await spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`);
  return data;
}

export async function getAlbumTracks(albumId: string): Promise<{ items: SpotifyTrack[] }> {
  // Albums typically have fewer than 50 tracks, but we batch to be safe
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(`/albums/${albumId}/tracks?limit=${SPOTIFY_MAX_LIMIT}`);
  return data;
}

export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const data = await spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`);
  return data;
}

export async function getNewReleases(limit = 20): Promise<{ albums: { items: SpotifyAlbum[] } }> {
  // Spotify has a per-request limit of 10 for new releases
  // We work around this by making multiple requests with offset and combining results

  if (limit <= SPOTIFY_MAX_LIMIT) {
    console.log(`[New Releases] limit=${limit} (single request)`);
    const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>(`/browse/new-releases?limit=${limit}`);
    return data;
  }

  console.log(`[New Releases] limit=${limit} (multiple requests)`);
  const albums: SpotifyAlbum[] = [];
  let offset = 0;
  const batches = Math.ceil(limit / SPOTIFY_MAX_LIMIT);

  for (let i = 0; i < batches; i++) {
    const batchLimit = Math.min(SPOTIFY_MAX_LIMIT, limit - albums.length);
    console.log(`[New Releases] Batch ${i + 1}/${batches}, limit=${batchLimit}, offset=${offset}`);
    const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>(`/browse/new-releases?limit=${batchLimit}&offset=${offset}`);
    albums.push(...(data.albums?.items || []));
    offset += batchLimit;
  }

  return { albums: { items: albums } };
}

export async function getAlbumWithTracks(albumId: string): Promise<{ album: SpotifyAlbum; tracks: SpotifyTrack[] }> {
  const [album, tracksData] = await Promise.all([
    getAlbum(albumId),
    getAlbumTracks(albumId)
  ]);

  return {
    album,
    tracks: tracksData.items
  };
}

export async function getArtist(artistId: string): Promise<SpotifyArtistFull> {
  const data = await spotifyFetch<SpotifyArtistFull>(`/artists/${artistId}`);
  return data;
}

export async function getArtistAlbums(artistId: string, limit = 20): Promise<{ items: SpotifyAlbum[] }> {
  if (limit <= SPOTIFY_MAX_LIMIT) {
    console.log(`[Artist Albums] artist=${artistId}, limit=${limit} (single request)`);
    const data = await spotifyFetch<{ items: SpotifyAlbum[] }>(`/artists/${artistId}/albums?limit=${limit}&include_groups=album,single,compilation`);
    return data;
  }

  console.log(`[Artist Albums] artist=${artistId}, limit=${limit} (multiple requests)`);
  const albums: SpotifyAlbum[] = [];
  let offset = 0;
  const batches = Math.ceil(limit / SPOTIFY_MAX_LIMIT);

  for (let i = 0; i < batches; i++) {
    const batchLimit = Math.min(SPOTIFY_MAX_LIMIT, limit - albums.length);
    console.log(`[Artist Albums] Batch ${i + 1}/${batches}, limit=${batchLimit}, offset=${offset}`);
    const data = await spotifyFetch<{ items: SpotifyAlbum[] }>(`/artists/${artistId}/albums?limit=${batchLimit}&offset=${offset}&include_groups=album,single,compilation`);
    albums.push(...(data.items || []));
    offset += batchLimit;
  }

  return { items: albums };
}

export async function getArtistTopTracks(artistId: string): Promise<{ tracks: SpotifyTrack[] }> {
  // Get top tracks - Spotify returns max 10 by default
  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(`/artists/${artistId}/top-tracks?market=US`);
  return data;
}
