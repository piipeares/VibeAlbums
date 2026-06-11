import { withCache } from './cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || `HTTP ${response.status}`);
    (err as Error & { status: number }).status = response.status;
    throw err;
  }

  return response.json();
}

// Types
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  stats?: {
    reviews: number;
    lists: number;
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
  createdAt?: string;
}

export interface Review {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'album' | 'track';
  targetName?: string;
  targetArtist?: string;
  targetImage?: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  voteScore?: number;
  userVote?: 1 | -1 | null;
  commentCount?: number;
}

export interface VoteResponse {
  vote: {
    id: string;
    reviewId: string;
    userId: string;
    direction: 1 | -1;
    createdAt: string;
  } | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 1 | -1 | null;
}

export interface GetVotesResponse {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 1 | -1 | null;
}

export interface ReviewCommentData {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; displayName: string; avatar: string };
  replies?: ReviewCommentData[];
}

export interface ListItem {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImage: string;
  addedAt: string;
  note?: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  items: ListItem[];
  itemsCount?: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  isOwner?: boolean;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; height: number; width: number }[];
  release_date: string;
  total_tracks: number;
  popularity?: number;
  genres?: string[];
  album_type?: 'album' | 'single' | 'compilation';
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  album?: {
    id: string;
    name: string;
    album_type?: string;
    images: { url: string; height: number; width: number }[];
    release_date?: string;
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  popularity: number;
  followers: { total: number };
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string; displayName?: string }) =>
    apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: (token: string) =>
    apiFetch<User>('/api/auth/me', { token }),
};

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
}

// Users API
export const usersApi = {
  search: (q: string) =>
    apiFetch<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  getProfile: (username: string, token?: string) =>
    apiFetch<User>(`/api/users/${username}`, { token }),

  updateProfile: (username: string, data: Partial<User>, token: string) =>
    apiFetch<User>(`/api/users/${username}`, { method: 'PUT', body: JSON.stringify(data), token }),

  follow: (username: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/users/${username}/follow`, { method: 'POST', token }),

  unfollow: (username: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/users/${username}/follow`, { method: 'DELETE', token }),

  getFollowers: (username: string) =>
    apiFetch<User[]>(`/api/users/${username}/followers`),

  getFollowing: (username: string) =>
    apiFetch<User[]>(`/api/users/${username}/following`),

  getReviews: (username: string, token?: string) =>
    apiFetch<Review[]>(`/api/users/${username}/reviews`, { token }),

  getLists: (username: string, token?: string) =>
    apiFetch<List[]>(`/api/users/${username}/lists`, { token }),
};

// Reviews API
export const reviewsApi = {
  getAll: (params?: { targetId?: string; targetType?: string; userId?: string; limit?: number; offset?: number }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.targetId) searchParams.set('targetId', params.targetId);
    if (params?.targetType) searchParams.set('targetType', params.targetType);
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return apiFetch<{ reviews: Review[]; total: number }>(`/api/reviews${query ? `?${query}` : ''}`, { token });
  },

  getForAlbum: (albumId: string, token?: string) =>
    apiFetch<{ reviews: Review[]; stats: { count: number; averageRating: number; distribution: Record<number, number> } }>(
      `/api/reviews/album/${albumId}`,
      { token }
    ),

  getForTrack: (trackId: string, token?: string) =>
    apiFetch<{ reviews: Review[]; stats: { count: number; averageRating: number; distribution: Record<number, number> } }>(
      `/api/reviews/track/${trackId}`,
      { token }
    ),

  create: (data: { targetId: string; targetType: 'album' | 'track'; rating: number; content?: string }, token: string) =>
    apiFetch<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(data), token }),

  update: (id: string, data: { rating?: number; content?: string }, token: string) =>
    apiFetch<Review>(`/api/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/reviews/${id}`, { method: 'DELETE', token }),

  vote: (reviewId: string, direction: 1 | -1, token: string) =>
    apiFetch<VoteResponse>(`/api/reviews/${reviewId}/vote`, { method: 'POST', body: JSON.stringify({ direction }), token }),

  getVotes: (reviewId: string, token?: string) =>
    apiFetch<GetVotesResponse>(`/api/reviews/${reviewId}/votes`, { token }),

  // Comments
  getComments: (reviewId: string, token?: string) =>
    apiFetch<{ comments: ReviewCommentData[] }>(`/api/reviews/${reviewId}/comments`, { token }),

  createComment: (reviewId: string, data: { content: string; parentCommentId?: string }, token: string) =>
    apiFetch<{ comment: ReviewCommentData }>(`/api/reviews/${reviewId}/comments`, { method: 'POST', body: JSON.stringify(data), token }),

  updateComment: (commentId: string, data: { content: string }, token: string) =>
    apiFetch<{ comment: ReviewCommentData }>(`/api/comments/${commentId}`, { method: 'PUT', body: JSON.stringify(data), token }),

  deleteComment: (commentId: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/comments/${commentId}`, { method: 'DELETE', token }),
};

// Lists API
export const listsApi = {
  getMyLists: (token: string) =>
    apiFetch<List[]>('/api/lists', { token }),

  getPublicLists: (params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return apiFetch<{ lists: List[]; total: number }>(`/api/lists/public${query ? `?${query}` : ''}`);
  },

  get: (id: string, token?: string) =>
    apiFetch<List>(`/api/lists/${id}`, { token }),

  create: (data: { name: string; description?: string; isPublic?: boolean }, token: string) =>
    apiFetch<List>('/api/lists', { method: 'POST', body: JSON.stringify(data), token }),

  update: (id: string, data: Partial<List>, token: string) =>
    apiFetch<List>(`/api/lists/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/lists/${id}`, { method: 'DELETE', token }),

  addItem: (id: string, item: { albumId: string; albumName: string; albumArtist: string; albumImage: string; note?: string }, token: string) =>
    apiFetch<ListItem>(`/api/lists/${id}/items`, { method: 'POST', body: JSON.stringify(item), token }),

  removeItem: (id: string, albumId: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/lists/${id}/items/${albumId}`, { method: 'DELETE', token }),

  reorder: (id: string, itemIds: string[], token: string) =>
    apiFetch<List>(`/api/lists/${id}/reorder`, { method: 'PUT', body: JSON.stringify({ itemIds }), token }),
};

// ─── Frontend Cache Layer ──────────────────────────────────────────
// Cachea respuestas de Spotify en localStorage con TTL 6 horas.
// Reduce viajes al backend → menos requests a la API de Spotify.
// (withCache importado arriba con los demás imports)

// Helper: construye la key de caché a partir del endpoint completo
function spotifyCacheKey(endpoint: string): string {
  return endpoint;
}

// Spotify API (proxy through our backend) — cacheada en frontend
export const spotifyApi = {
  /** Home page: queries combinadas, resultados ordenados por popularidad */
  getHome: (queries: string[], limitPerQuery = 4) => {
    const q = queries.join(',');
    const endpoint = `/api/spotify/home?q=${encodeURIComponent(q)}&limit=${limitPerQuery}`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<{ items: SpotifyAlbum[] }>(endpoint)
    );
  },
  search: (query: string, type: 'album' | 'track' | 'both' = 'both', limit = 20) => {
    const endpoint = `/api/spotify/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`;
    const key = spotifyCacheKey(endpoint);
    return withCache(key, () =>
      apiFetch<{ albums: { items: SpotifyAlbum[]; total: number }; tracks: { items: SpotifyTrack[]; total: number } }>(endpoint)
    );
  },

  getAlbum: (id: string) => {
    const endpoint = `/api/spotify/album/${id}`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<SpotifyAlbum>(endpoint)
    );
  },

  getAlbumTracks: (id: string) => {
    const endpoint = `/api/spotify/album/${id}/tracks`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<{ items: SpotifyTrack[] }>(endpoint)
    );
  },

  getAlbumFull: (id: string) => {
    const endpoint = `/api/spotify/album/${id}/full`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<{ album: SpotifyAlbum; tracks: SpotifyTrack[] }>(endpoint)
    );
  },

  getTrack: (id: string) => {
    const endpoint = `/api/spotify/track/${id}`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<SpotifyTrack>(endpoint)
    );
  },

  getNewReleases: (limit = 20) => {
    const endpoint = `/api/spotify/new-releases?limit=${limit}`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<{ albums: { items: SpotifyAlbum[] } }>(endpoint)
    );
  },

  getArtist: (id: string) => {
    const endpoint = `/api/spotify/artist/${id}`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<SpotifyArtist>(endpoint)
    );
  },

  getArtistAlbums: (id: string, limit = 20) => {
    const endpoint = `/api/spotify/artist/${id}/albums?limit=${limit}`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<{ items: SpotifyAlbum[] }>(endpoint)
    );
  },

  getArtistTopTracks: (id: string) => {
    const endpoint = `/api/spotify/artist/${id}/top-tracks`;
    return withCache(spotifyCacheKey(endpoint), () =>
      apiFetch<{ tracks: SpotifyTrack[] }>(endpoint)
    );
  },
};
