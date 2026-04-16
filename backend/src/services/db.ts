import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatar: string;
  bio: string;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  spotifyAlbumId: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  reviews: Review[];
  lists: List[];
  follows: Follow[];
}

const defaultData: DatabaseSchema = {
  users: [],
  reviews: [],
  lists: [],
  follows: []
};

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const adapter = new JSONFile<DatabaseSchema>(dbPath);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDb(): Promise<void> {
  await db.read();
  // Ensure all arrays exist
  if (!db.data.users) db.data.users = [];
  if (!db.data.reviews) db.data.reviews = [];
  if (!db.data.lists) db.data.lists = [];
  if (!db.data.follows) db.data.follows = [];
  await db.write();
}

export default db;
