# VibeAlbums

Tu plataforma de reseñas de música. Un "Letterboxd" para albums y canciones.

## Stack Tecnológico

### Backend
- Node.js + Express
- TypeScript
- LowDB (base de datos JSON)
- Spotify API (proxy)
- JWT Authentication

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (state management)
- Radix UI / shadcn/ui

## Estructura del Proyecto

```
VibeAlbums/
├── backend/                 # API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (Spotify, DB, Auth)
│   │   ├── middleware/      # Auth middleware
│   │   └── data/            # JSON files (database)
│   └── package.json
│
├── frontend/               # Next.js app
│   ├── app/                 # Pages (App Router)
│   ├── components/          # React components
│   ├── lib/                 # Utilities, API client, store
│   └── package.json
│
└── SPEC.md                  # Especificaciones del proyecto
```

## Cómo Ejecutar

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

El backend se ejecutará en `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se ejecutará en `http://localhost:3000`

## Variables de Entorno

### Backend (`backend/.env`)
```
PORT=3001
JWT_SECRET=tu-secret-aqui
SPOTIFY_CLIENT_ID=tu-client-id
SPOTIFY_CLIENT_SECRET=tu-client-secret
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Features

### Autenticación
- Registro con username, email, password
- Login con email y password
- JWT tokens (7 días de expiración)
- Persistencia en localStorage

### Exploración
- Nuevos lanzamientos de Spotify
- Búsqueda de albums y tracks
- Grid responsive de albums

### Albums
- Detalle completo del album
- Tracklist con duración
- Reviews y ratings de la comunidad
- Estadísticas de rating (distribución)

### Reviews
- Escribir reseñas con rating (1-5 estrellas)
- Editar y eliminar tus reseñas
- Una reseña por album por usuario

### Listas
- Crear listas públicas o privadas
- Agregar albums a listas
- Reordenar items
- Compartir listas públicas

### Perfiles de Usuario
- Información del usuario
- Stats (reviews, listas, followers)
- Reviews y listas del usuario
- Seguir/dejar de seguir usuarios

## API Endpoints

### Auth
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual

### Users
- `GET /api/users/:username` - Perfil
- `PUT /api/users/:username` - Editar perfil
- `POST /api/users/:username/follow` - Seguir
- `DELETE /api/users/:username/follow` - Dejar de seguir

### Reviews
- `GET /api/reviews` - Todas las reviews
- `GET /api/reviews/album/:id` - Reviews de un album
- `POST /api/reviews` - Crear review
- `PUT /api/reviews/:id` - Editar review
- `DELETE /api/reviews/:id` - Eliminar review

### Lists
- `GET /api/lists` - Mis listas
- `GET /api/lists/public` - Listas públicas
- `GET /api/lists/:id` - Detalle de lista
- `POST /api/lists` - Crear lista
- `PUT /api/lists/:id` - Editar lista
- `DELETE /api/lists/:id` - Eliminar lista
- `POST /api/lists/:id/items` - Agregar album
- `DELETE /api/lists/:id/items/:albumId` - Quitar album

### Spotify (Proxy)
- `GET /api/spotify/search` - Buscar
- `GET /api/spotify/album/:id` - Detalle album
- `GET /api/spotify/album/:id/tracks` - Tracks
- `GET /api/spotify/album/:id/full` - Album + tracks
- `GET /api/spotify/new-releases` - Nuevos lanzamientos

## Diseño

### Paleta de Colores
- **Background**: Negro puro (#000000)
- **Surface**: Capas sutiles (#0a0a0a, #141414)
- **Primary**: Violeta neon (#A855F7)
- **Secondary**: Fucsia (#EC4899)
- **Accent**: Rosa (#F472B6)
- **Highlight**: Cyan (#22D3EE)

### Tipografía
- **Inter**: UI y texto
- **JetBrains Mono**: Números y stats

### Animaciones
- Fade-in en cargas
- Hover effects suaves
- Transiciones de página

## Próximos Pasos (Futuro)

- [ ] Testing con Jest/React Testing Library
- [ ] Infinite scroll en grids
- [ ] Notificaciones
- [ ] Activity feed
- [ ] Comments en reviews
- [ ] Likes/favorites
- [ ] PWA support
- [ ] Real-time updates

## Licencia

MIT
