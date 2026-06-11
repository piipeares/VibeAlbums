import dotenv from 'dotenv';
dotenv.config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

// ─── In-Memory Response Cache ────────────────────────────────────────────────
// Cachea respuestas GET a la API de Spotify para reducir rate limits.
// TAMBIÉN cachea errores para no reintentar requests que van a fallar.
//
// Jerarquía TTL (por tipo de error):
//   - Respuestas exitosas:      10 min  — cualquier resource encontrado
//   - 404 (Not Found):          10 min  — el resource NO existe en Spotify, NUNCA va a existir
//   - 4xx (excepto 429):         5 min  — error del cliente (no se va a resolver solo)
//   - 429 / 5xx:                  2 min  — rate limit o server error (puede recuperarse)
//   - Errores de red (sin status): 30s   — error transitorio (WiFi, DNS, etc.)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;    // 10 min — éxito
const NOT_FOUND_CACHE_TTL_MS = 10 * 60 * 1000;  // 10 min — 404 (nunca va a existir)
const CLIENT_ERROR_TTL_MS = 5 * 60 * 1000;       // 5 min  — errores 4xx (salvo 429)
const ERROR_CACHE_TTL_MS = 2 * 60 * 1000;        // 2 min  — rate-limit / server error
const NETWORK_ERROR_TTL_MS = 30 * 1000;           // 30s    — error de red

// Marcador para errores cacheados (objeto simple, compatible con JSON)
function createErrorMarker(): object {
  return { __cacheError: true, ts: Date.now() };
}
function isErrorMarker(v: unknown): boolean {
  return typeof v === 'object' && v !== null && (v as Record<string, unknown>).__cacheError === true;
}

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL_MS): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Cachea exitosamente o cachea el error para no reintentar. Devuelve la Promesa
// original (éxito → resuelve, error → rechaza igual).
async function withCacheOrError<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // 1. ¿Hay datos exitosos cacheados?
  const cached = getCached<T>(key);
  if (cached !== null && !isErrorMarker(cached)) {
    console.log(`[Spotify Cache HIT] ${key}`);
    return cached;
  }

  // 2. ¿Hay un error cacheado?
  if (cached !== null && isErrorMarker(cached)) {
    console.log(`[Spotify Cache HIT (error)] ${key} — skip retry`);
    throw new Error('Spotify API temporarily unavailable');
  }

  // 3. MISS — ejecutar fetch
  console.log(`[Spotify Cache MISS] ${key}`);
  try {
    const data = await fetchFn();
    setCache(key, data, DEFAULT_CACHE_TTL_MS);
    return data;
  } catch (error) {
    // Determinar TTL según el código de estado HTTP
    const status = (error as { status?: number }).status;
    let ttl: number;

    if (!status) {
      // Error de red (sin respuesta HTTP) — puede ser transitorio
      ttl = NETWORK_ERROR_TTL_MS;
    } else if (status === 404) {
      // Resource no existe en Spotify — NUNCA va a existir, cachear como éxito
      ttl = NOT_FOUND_CACHE_TTL_MS;
    } else if (status >= 400 && status < 500 && status !== 429) {
      // 4xx (excepto rate-limit) — error del cliente, no se resuelve solo
      ttl = CLIENT_ERROR_TTL_MS;
    } else {
      // 429, 5xx — error del server que puede recuperarse
      ttl = ERROR_CACHE_TTL_MS;
    }

    console.log(`[Spotify Cache ERROR] ${key} — caching error for ${ttl / 1000}s`);
    setCache(key, createErrorMarker() as T, ttl);
    throw error;
  }
}

// Builds a stable cache key from the endpoint path + query params
function cacheKey(endpoint: string): string {
  return endpoint;
}

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
    const err = new Error(`Spotify API error: ${error}`);
    (err as Error & { status: number }).status = response.status;
    throw err;
  }

  return response.json() as T;
}

// Spotify has a per-request limit of 10 for this API key
// We work around this by making multiple requests and combining results
const SPOTIFY_MAX_LIMIT = 10;

export async function searchSpotify(query: string, type: 'album' | 'track' | 'both' = 'both', limit = 20): Promise<SpotifySearchResult> {
  const key = cacheKey(`search:${query}:${type}:${limit}`);
  return withCacheOrError(key, async () => {
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
  });
}

export async function getAlbum(albumId: string): Promise<SpotifyAlbum> {
  const key = cacheKey(`album:${albumId}`);
  return withCacheOrError(key, async () => {
    const data = await spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`);
    return data;
  });
}

export async function getAlbumTracks(albumId: string): Promise<{ items: SpotifyTrack[] }> {
  const key = cacheKey(`albumTracks:${albumId}`);
  return withCacheOrError(key, async () => {
    // Albums typically have fewer than 50 tracks, but we batch to be safe
    const data = await spotifyFetch<{ items: SpotifyTrack[] }>(`/albums/${albumId}/tracks?limit=${SPOTIFY_MAX_LIMIT}`);
    return data;
  });
}

export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const key = cacheKey(`track:${trackId}`);
  return withCacheOrError(key, async () => {
    const data = await spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`);
    return data;
  });
}

export async function getNewReleases(limit = 20): Promise<{ albums: { items: SpotifyAlbum[] } }> {
  const key = cacheKey(`newReleases:${limit}`);
  return withCacheOrError(key, async () => {
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
  });
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
  const key = cacheKey(`artist:${artistId}`);
  return withCacheOrError(key, async () => {
    const data = await spotifyFetch<SpotifyArtistFull>(`/artists/${artistId}`);
    return data;
  });
}

export async function getArtistAlbums(artistId: string, limit = 20): Promise<{ items: SpotifyAlbum[] }> {
  const key = cacheKey(`artistAlbums:${artistId}:${limit}`);
  return withCacheOrError(key, async () => {
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
  });
}

/**
 * Home page: ejecuta múltiples queries de búsqueda, combina resultados,
 * deduplica por ID, y ordena por popularidad descendente.
 * La query se pasa exacta sin tokenización adicional.
 */
export async function getHomeAlbums(queries: string[], limitPerQuery = 4): Promise<SpotifyAlbum[]> {
  // Fetch all queries in parallel
  const promises = queries.map(q => searchSpotify(q, 'album', limitPerQuery));
  const results = await Promise.all(promises);

  // Combine and deduplicate
  const seen = new Set<string>();
  const allAlbums: SpotifyAlbum[] = [];

  for (const result of results) {
    for (const album of result.albums.items) {
      if (!seen.has(album.id)) {
        seen.add(album.id);
        allAlbums.push(album);
      }
    }
  }

  // Sort by popularity descending (unknown popularity goes last)
  allAlbums.sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1));

  return allAlbums;
}

/** Información básica para mostrar en cards de review (nombre + artista + imagen) */
export interface TargetInfo {
  targetId: string;
  targetType: 'album' | 'track';
  name: string;
  artist: string;
  image: string;
}

/**
 * Obtiene nombre, artista e imagen de un album o track desde Spotify.
 * Usa el caché automáticamente (withCacheOrError).
 */
export async function getTargetInfo(targetId: string, targetType: 'album' | 'track'): Promise<TargetInfo> {
  if (targetType === 'album') {
    const album = await getAlbum(targetId);
    return {
      targetId,
      targetType: 'album',
      name: album.name,
      artist: album.artists?.[0]?.name || 'Unknown Artist',
      image: album.images?.[0]?.url || '',
    };
  } else {
    const track = await getTrack(targetId);
    return {
      targetId,
      targetType: 'track',
      name: track.name,
      artist: track.artists?.[0]?.name || 'Unknown Artist',
      image: track.album?.images?.[0]?.url || '',
    };
  }
}

export async function getArtistTopTracks(artistId: string): Promise<{ tracks: SpotifyTrack[] }> {
  const key = cacheKey(`artistTopTracks:${artistId}`);
  return withCacheOrError(key, async () => {
    // Get top tracks - Spotify returns max 10 by default
    const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(`/artists/${artistId}/top-tracks?market=US`);
    return data;
  });
}
