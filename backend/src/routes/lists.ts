import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { List, ListItem } from '../services/db.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all public lists (for discovery)
router.get('/public', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const { limit = 20, offset = 0 } = req.query;

    const lists = db.data.lists
      .filter(l => l.isPublic)
      .map(l => {
        const user = db.data.users.find(u => u.id === l.userId)!;
        return {
          id: l.id,
          name: l.name,
          description: l.description,
          itemsCount: l.items.length,
          createdAt: l.createdAt,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar
          }
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      lists,
      total: db.data.lists.filter(l => l.isPublic).length
    });
  } catch (error) {
    console.error('Get public lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own lists
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const lists = db.data.lists
      .filter(l => l.userId === req.user!.userId)
      .map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        isPublic: l.isPublic,
        itemsCount: l.items.length,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(lists);
  } catch (error) {
    console.error('Get my lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single list
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const list = db.data.lists.find(l => l.id === req.params.id);

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    // Check access
    const isOwner = req.user?.userId === list.userId;
    if (!list.isPublic && !isOwner) {
      res.status(403).json({ error: 'This list is private' });
      return;
    }

    const user = db.data.users.find(u => u.id === list.userId)!;

    res.json({
      ...list,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar
      },
      isOwner
    });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create list
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name) {
      res.status(400).json({ error: 'List name is required' });
      return;
    }

    await db.read();

    const newList: List = {
      id: uuidv4(),
      userId: req.user!.userId,
      name,
      description: description || '',
      isPublic: isPublic ?? true,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.data.lists.push(newList);
    await db.write();

    res.status(201).json(newList);
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update list
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic } = req.body;

    await db.read();

    const listIndex = db.data.lists.findIndex(l => l.id === req.params.id);

    if (listIndex === -1) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const list = db.data.lists[listIndex];

    if (list.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (name !== undefined) list.name = name;
    if (description !== undefined) list.description = description;
    if (isPublic !== undefined) list.isPublic = isPublic;
    list.updatedAt = new Date().toISOString();

    await db.write();

    res.json(list);
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete list
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const listIndex = db.data.lists.findIndex(l => l.id === req.params.id);

    if (listIndex === -1) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const list = db.data.lists[listIndex];

    if (list.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    db.data.lists.splice(listIndex, 1);
    await db.write();

    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to list
router.post('/:id/items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { albumId, albumName, albumArtist, albumImage, note } = req.body;

    if (!albumId || !albumName) {
      res.status(400).json({ error: 'Album ID and name are required' });
      return;
    }

    await db.read();

    const listIndex = db.data.lists.findIndex(l => l.id === req.params.id);

    if (listIndex === -1) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const list = db.data.lists[listIndex];

    if (list.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Check if album already in list
    const existingItem = list.items.find(item => item.albumId === albumId);
    if (existingItem) {
      res.status(400).json({ error: 'Album already in this list' });
      return;
    }

    const newItem: ListItem = {
      albumId,
      albumName,
      albumArtist: albumArtist || '',
      albumImage: albumImage || '',
      addedAt: new Date().toISOString(),
      note
    };

    list.items.push(newItem);
    list.updatedAt = new Date().toISOString();

    await db.write();

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from list
router.delete('/:id/items/:albumId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();

    const listIndex = db.data.lists.findIndex(l => l.id === req.params.id);

    if (listIndex === -1) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const list = db.data.lists[listIndex];

    if (list.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const itemIndex = list.items.findIndex(item => item.albumId === req.params.albumId);

    if (itemIndex === -1) {
      res.status(404).json({ error: 'Item not found in list' });
      return;
    }

    list.items.splice(itemIndex, 1);
    list.updatedAt = new Date().toISOString();

    await db.write();

    res.json({ success: true, message: 'Item removed from list' });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder items in list
router.put('/:id/reorder', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds)) {
      res.status(400).json({ error: 'itemIds must be an array' });
      return;
    }

    await db.read();

    const listIndex = db.data.lists.findIndex(l => l.id === req.params.id);

    if (listIndex === -1) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const list = db.data.lists[listIndex];

    if (list.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Reorder based on itemIds array
    const reorderedItems = itemIds
      .map(id => list.items.find(item => item.albumId === id))
      .filter(Boolean) as ListItem[];

    list.items = reorderedItems;
    list.updatedAt = new Date().toISOString();

    await db.write();

    res.json(list);
  } catch (error) {
    console.error('Reorder items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
