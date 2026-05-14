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
    throw new Error(error.error || `HTTP ${response.status}`);
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
  spotifyAlbumId: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: User;
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

// Users API
export const usersApi = {
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
  getAll: (params?: { albumId?: string; userId?: string; limit?: number; offset?: number }, token?: string) => {
    const searchParams = new URLSearchParams();
    if (params?.albumId) searchParams.set('albumId', params.albumId);
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

  create: (data: { spotifyAlbumId: string; rating: number; content?: string }, token: string) =>
    apiFetch<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(data), token }),

  update: (id: string, data: { rating?: number; content?: string }, token: string) =>
    apiFetch<Review>(`/api/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: (id: string, token: string) =>
    apiFetch<{ success: boolean }>(`/api/reviews/${id}`, { method: 'DELETE', token }),
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

// Spotify API (proxy through our backend)
export const spotifyApi = {
  search: (query: string, type: 'album' | 'track' | 'both' = 'both', limit = 20) =>
    apiFetch<{ albums: { items: SpotifyAlbum[]; total: number }; tracks: { items: SpotifyTrack[]; total: number } }>(
      `/api/spotify/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
    ),

  getAlbum: (id: string) =>
    apiFetch<SpotifyAlbum>(`/api/spotify/album/${id}`),

  getAlbumTracks: (id: string) =>
    apiFetch<{ items: SpotifyTrack[] }>(`/api/spotify/album/${id}/tracks`),

  getAlbumFull: (id: string) =>
    apiFetch<{ album: SpotifyAlbum; tracks: SpotifyTrack[] }>(`/api/spotify/album/${id}/full`),

  getTrack: (id: string) =>
    apiFetch<SpotifyTrack>(`/api/spotify/track/${id}`),

  getNewReleases: (limit = 20) =>
    apiFetch<{ albums: { items: SpotifyAlbum[] } }>(`/api/spotify/new-releases?limit=${limit}`),

  getArtist: (id: string) =>
    apiFetch<SpotifyArtist>(`/api/spotify/artist/${id}`),

  getArtistAlbums: (id: string, limit = 20) =>
    apiFetch<{ items: SpotifyAlbum[] }>(`/api/spotify/artist/${id}/albums?limit=${limit}`),

  getArtistTopTracks: (id: string) =>
    apiFetch<{ tracks: SpotifyTrack[] }>(`/api/spotify/artist/${id}/top-tracks`),
};
