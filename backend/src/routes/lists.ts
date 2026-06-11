import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────

async function attachUserToList(list: any) {
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name, avatar')
    .eq('id', list.user_id)
    .single();

  return {
    ...list,
    user: user ? {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar
    } : { id: '', username: 'Deleted', displayName: 'Deleted', avatar: '' }
  };
}

function mapListResponse(l: any) {
  return {
    id: l.id,
    userId: l.user_id,
    name: l.name,
    description: l.description,
    isPublic: l.is_public,
    items: l.items || [],
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    user: l.user,
    ...(l.isOwner !== undefined ? { isOwner: l.isOwner } : {}),
    ...(l.itemsCount !== undefined ? { itemsCount: l.itemsCount } : {})
  };
}

// Get all public lists (for discovery)
router.get('/public', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '20', offset = '0' } = req.query;
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

    const { data: lists, count } = await supabase
      .from('lists')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const mapped = await Promise.all(
      (lists || []).map(async (l) => {
        const enriched = await attachUserToList(l);
        return {
          id: enriched.id,
          name: enriched.name,
          description: enriched.description,
          itemsCount: enriched.items?.length || 0,
          createdAt: enriched.created_at,
          user: enriched.user
        };
      })
    );

    res.json({
      lists: mapped,
      total: count ?? 0
    });
  } catch (error) {
    console.error('Get public lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own lists
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: lists } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false });

    const mapped = (lists || []).map(l => ({
      id: l.id,
      name: l.name,
      description: l.description,
      isPublic: l.is_public,
      itemsCount: l.items?.length || 0,
      createdAt: l.created_at,
      updatedAt: l.updated_at
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Get my lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single list
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: list } = await supabase
      .from('lists')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const isOwner = req.user?.userId === list.user_id;
    if (!list.is_public && !isOwner) {
      res.status(403).json({ error: 'This list is private' });
      return;
    }

    const enriched = await attachUserToList(list);
    const response = mapListResponse({ ...enriched, isOwner });

    res.json(response);
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

    const now = new Date().toISOString();
    const newList = {
      id: uuidv4(),
      user_id: req.user!.userId,
      name,
      description: description || '',
      is_public: isPublic ?? true,
      items: [],
      created_at: now,
      updated_at: now
    };

    const { error } = await supabase.from('lists').insert(newList);
    if (error) throw error;

    res.status(201).json(mapListResponse(newList));
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update list
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic } = req.body;

    const { data: list } = await supabase
      .from('lists')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    if (list.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) updates.is_public = isPublic;

    const { error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', req.params.id);

    if (error) throw error;

    const { data: updated } = await supabase
      .from('lists')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json(mapListResponse(updated));
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete list
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: list } = await supabase
      .from('lists')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    if (list.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { error } = await supabase.from('lists').delete().eq('id', req.params.id);
    if (error) throw error;

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

    const { data: list } = await supabase
      .from('lists')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    if (list.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Check if album already in list
    const existingItem = (list.items || []).find((item: any) => item.albumId === albumId);
    if (existingItem) {
      res.status(400).json({ error: 'Album already in this list' });
      return;
    }

    const newItem = {
      albumId,
      albumName,
      albumArtist: albumArtist || '',
      albumImage: albumImage || '',
      addedAt: new Date().toISOString(),
      note
    };

    const updatedItems = [...(list.items || []), newItem];

    const { error } = await supabase
      .from('lists')
      .update({ items: updatedItems, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from list
router.delete('/:id/items/:albumId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: list } = await supabase
      .from('lists')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    if (list.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updatedItems = (list.items || []).filter(
      (item: any) => item.albumId !== req.params.albumId
    );

    if (updatedItems.length === (list.items || []).length) {
      res.status(404).json({ error: 'Item not found in list' });
      return;
    }

    const { error } = await supabase
      .from('lists')
      .update({ items: updatedItems, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

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

    const { data: list } = await supabase
      .from('lists')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    if (list.user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Reorder based on itemIds array
    const reorderedItems = itemIds
      .map((id: string) => (list.items || []).find((item: any) => item.albumId === id))
      .filter(Boolean);

    const { error } = await supabase
      .from('lists')
      .update({ items: reorderedItems, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json(mapListResponse({ ...list, items: reorderedItems }));
  } catch (error) {
    console.error('Reorder items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
