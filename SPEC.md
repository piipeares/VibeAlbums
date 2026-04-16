# VibeAlbums - Specification

## 1. Concept & Vision

**VibeAlbums** es una plataforma social para amantes de la música. Inspirada en Letterboxd pero enfocada en albums y canciones. Los usuarios pueden descubrir música, escribir reseñas, calificar albums, crear listas personalizadas y seguir a otros usuarios.

**Personalidad**: Oscura, inmersiva, con acentos neon que evocan la energía de la música nocturna. Cada interacción debe sentirse premium y fluida.

## 2. Design Language

### Aesthetic Direction
Dark mode brutal con glassmorphism sutil. Inspiración: Spotify meets cyberpunk meets editorial design. Interfaces que desaparecen cuando no las necesitás.

### Color Palette
```
--background:        #000000    (negro puro, espacio infinito)
--surface:           #0a0a0a    (capas sutiles)
--surface-elevated:  #141414    (cards, modals)
--surface-hover:     #1a1a1a    (hover states)
--primary:           #A855F7    (violeta neon - acciones principales)
--primary-glow:      #A855F780  (efectos glow)
--secondary:         #EC4899    (fucsia - highlights)
--accent:            #F472B6    (rosa - ratings, likes)
--highlight:         #22D3EE    (cyan - información, contrast)
--text:              #FAFAFA    (texto principal)
--text-secondary:    #A1A1AA    (texto secundario)
--text-muted:        #52525B    (placeholders, hints)
--border:            #27272A    (bordes sutiles)
--success:           #22C55E
--error:             #EF4444
--warning:           #F59E0B
```

### Typography
- **Display**: Inter (weight 700-900) - headlines, titles
- **Body**: Inter (weight 400-500) - paragraphs, UI text
- **Mono**: JetBrains Mono - ratings, stats, codes

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
- Border radius: sm=6px, md=8px, lg=12px, xl=16px, full=9999px
- Max content width: 1280px

### Motion Philosophy
- **Entrance**: fade-in + translateY(-10px), 300ms ease-out
- **Hover**: scale(1.02), 150ms ease
- **Click**: scale(0.98), 100ms ease
- **Page transitions**: crossfade 200ms
- **Stagger**: 50ms between items

### Visual Assets
- Icons: Lucide React
- Album art: Spotify CDN (high-res)
- User avatars: UI Avatars API o placeholder generativo
- Decorativos: Gradientes sutiles, blur effects

## 3. Layout & Structure

### Global Layout
```
┌─────────────────────────────────────────────────────┐
│  Header (sticky, glassmorphism)                     │
│  [Logo] [Search] [Nav: Explore|My Lists|Profile]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Main Content Area                                  │
│  (dynamic based on route)                            │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Footer (minimal)                                   │
└─────────────────────────────────────────────────────┘
```

### Pages
1. **Home/Explore**: Grid de albums trending, nuevos releases, recomendados
2. **Search**: Búsqueda con filtros (album/track, decade, genre)
3. **Album Detail**: Info completa + tracks + reviews + ratings stats
4. **Track Detail**: Info + reviews específicos
5. **Profile**: Bio, stats, reviews, listas, followers/following
6. **Lists**: Mis listas, crear/editar, ver públicas de otros
7. **Auth**: Login/Register (minimal, rápido)

### Responsive Strategy
- Mobile-first
- Breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px
- Grid: 2 cols mobile, 3 cols tablet, 4-5 cols desktop
- Sidebar: colapsable a bottom nav en mobile

## 4. Features & Interactions

### 4.1 Autenticación
- Register: username, email, password
- Login: email + password
- Persistencia: JWT en localStorage
- Validación: email format, password min 6 chars, username unique

### 4.2 Exploración
- **Trending Albums**: Los más reseñados recientemente
- **New Releases**: Últimos albums de Spotify
- **Search**: Búsqueda en tiempo real con debounce 300ms
- Filtros: tipo (album/track), año, género

### 4.3 Album/Track Detail
- Header: artwork grande, título, artista, año, duración total
- Info: géneros, tracks count, popularity score
- Tracklist: tabla con play preview (opcional), duración, track number
- Rating Distribution: histograma visual 1-5 estrellas
- Reviews: lista con paginación, ordenables por fecha/rating
- Actions: Rate, Add to List, Share

### 4.4 Reviews
- Crear: rating (1-5 estrellas) + texto opcional
- Editar: solo own reviews
- Eliminar: solo own reviews, confirmación
- Mostrar: username, avatar, rating, fecha, contenido
- Solo una review por album por usuario

### 4.5 Ratings
- Click en estrella = rate
- Hover preview antes de confirmar
- Average rating actualizado en tiempo real
- Rating count visible

### 4.6 Listas
- Crear: nombre, descripción, público/privado
- Agregar albums: search + add
- Reordenar: drag & drop
- Eliminar items con confirmación
- Eliminar lista con confirmación
- Ver listas de otros usuarios (solo públicas)

### 4.7 Perfil
- Avatar (generativo por default, editable URL)
- Display name
- Bio
- Stats: reviews count, lists count, followers, following
- Reviews timeline
- Listas públicas
- Follow/Unfollow otros usuarios

### 4.8 Social
- Follow/Unfollow
- Ver followers/following lists
- Ver actividad de users seguidos (futuro)

## 5. Component Inventory

### Layout Components
| Component | States | Notes |
|-----------|--------|-------|
| Header | default, scrolled (glass effect) | Sticky, search always visible |
| Sidebar | expanded, collapsed, mobile-hidden | Nav items con icons |
| Footer | default | Minimal, links importantes |

### UI Primitives (shadcn/ui based)
| Component | States | Notes |
|-----------|--------|-------|
| Button | default, hover, active, disabled, loading | primary, secondary, ghost, outline |
| Input | default, focus, error, disabled | With label y helper text |
| Card | default, hover | Album cards con artwork |
| Modal | open, closed | Para confirmaciones, forms |
| Dropdown | closed, open | User menu, actions |
| Toast | success, error, info | Auto-dismiss 3s |
| Skeleton | loading | Para grids de albums |
| Avatar | with-image, fallback | Initials como fallback |
| Badge | default, colored | Géneros, stats |
| Separator | default | Secciones |
| Tabs | active, inactive | Filtros, secciones |

### Feature Components
| Component | States | Notes |
|-----------|--------|-------|
| AlbumCard | default, hover, loading | Grid item |
| AlbumDetail | default, loading, error | Página completa |
| TrackRow | default, playing | Tabla de tracks |
| ReviewCard | default, own-review (edit/delete) | Con acciones |
| ReviewForm | default, submitting, error | Con rating input |
| StarRating | default, hover-preview, readonly | Interactive o display |
| RatingDistribution | default | Histograma |
| ListCard | default, own-list (edit) | Preview de lista |
| ListItem | default, dragging | Draggable |
| UserCard | default, follow-button | Para followers/following |
| SearchBar | default, focused, loading | Con clear button |
| EmptyState | default | Icon + mensaje + acción |

## 6. Technical Approach

### Stack
```
Frontend:              Backend:
├── Next.js 14         ├── Node.js + Express
├── React 18           ├── TypeScript
├── TypeScript         ├── lowdb (JSON files)
├── Tailwind CSS       ├── Spotify API proxy
├── shadcn/ui          ├── JWT auth
├── Framer Motion      └── CORS enabled
├── Zustand             │
└── Lucide React       │
```

### Project Structure
```
VibeAlbums/
├── SPEC.md
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── albums.ts
│   │   │   ├── reviews.ts
│   │   │   ├── lists.ts
│   │   │   ├── users.ts
│   │   │   └── spotify.ts
│   │   ├── services/
│   │   │   ├── spotify.ts
│   │   │   ├── db.ts
│   │   │   └── auth.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── data/           # JSON files
│   │   │   ├── users.json
│   │   │   ├── reviews.json
│   │   │   ├── lists.json
│   │   │   └── follows.json
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   ├── (main)/
    │   │   ├── album/[id]/
    │   │   ├── track/[id]/
    │   │   ├── user/[username]/
    │   │   ├── list/[id]/
    │   │   └── page.tsx
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── ui/
    │   ├── album/
    │   ├── review/
    │   ├── list/
    │   └── layout/
    ├── lib/
    │   ├── api.ts
    │   ├── store.ts
    │   └── utils.ts
    ├── package.json
    └── tailwind.config.ts
```

### API Endpoints

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Crear usuario |
| POST | /api/auth/login | Login, retorna JWT |
| GET | /api/auth/me | Get current user |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/:username | Get user profile |
| PUT | /api/users/:username | Update own profile |
| POST | /api/users/:username/follow | Follow user |
| DELETE | /api/users/:username/follow | Unfollow user |
| GET | /api/users/:username/followers | Get followers |
| GET | /api/users/:username/following | Get following |

#### Albums (Spotify Proxy)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/spotify/search | Search albums/tracks |
| GET | /api/spotify/album/:id | Get album details |
| GET | /api/spotify/album/:id/tracks | Get album tracks |
| GET | /api/spotify/track/:id | Get track details |
| GET | /api/spotify/new-releases | New releases |
| GET | /api/spotify/trending | Trending (mock o real) |

#### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reviews | Get reviews (filterable) |
| GET | /api/reviews/album/:id | Get reviews for album |
| POST | /api/reviews | Create review |
| PUT | /api/reviews/:id | Update own review |
| DELETE | /api/reviews/:id | Delete own review |

#### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/lists | Get own lists |
| GET | /api/lists/public | Get public lists |
| GET | /api/lists/:id | Get list details |
| POST | /api/lists | Create list |
| PUT | /api/lists/:id | Update own list |
| DELETE | /api/lists/:id | Delete own list |

### Data Models

#### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatar: string;
  bio: string;
  createdAt: string;
}
```

#### Review
```typescript
interface Review {
  id: string;
  userId: string;
  spotifyAlbumId: string;
  rating: number; // 1-5
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

#### List
```typescript
interface List {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  items: ListItem[];
  createdAt: string;
  updatedAt: string;
}

interface ListItem {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImage: string;
  addedAt: string;
  note?: string;
}
```

#### Follow
```typescript
interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}
```

### Authentication
- JWT tokens con expiry 7 days
- Password hashing con bcrypt
- Middleware que valida token y expone userId

### Environment Variables
```
# Backend
PORT=3001
JWT_SECRET=your-jwt-secret-here
SPOTIFY_CLIENT_ID=bdcfb8285d7c498eb745bf95e37514a7
SPOTIFY_CLIENT_SECRET=5ae79c1616634cef9b3935c34643441c

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```
