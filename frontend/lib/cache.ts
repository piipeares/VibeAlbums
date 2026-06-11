/**
 * Frontend Cache Layer (localStorage + TTL)
 *
 * Cachea respuestas de la API de Spotify para reducir viajes al backend.
 * TTL: 6 horas (se configura via CACHE_TTL_MS).
 * Persiste cerrando el browser (localStorage).
 *
 * Uso:
 *   import { cacheGet, cacheSet } from '@/lib/cache'
 *   const cached = cacheGet<DataType>('/api/spotify/...')
 *   if (cached) return cached
 *   const fresh = await fetch(...)
 *   cacheSet('/api/spotify/...', fresh)
 *   return fresh
 */

const CACHE_PREFIX = 'vibe-cache:';
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Lee una entrada de caché. Si expiró, la borra y devuelve null.
 */
export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    // JSON corrupto o localStorage no disponible → limpiar y devolver miss
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch { /* ignora */ }
    return null;
  }
}

/**
 * Guarda una entrada en caché con el TTL por defecto (6 horas).
 * Si localStorage está lleno, captura el error silenciosamente.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (err) {
    // localStorage lleno o deshabilitado — no crítico, solo no se cachea
    console.warn('[Cache] Failed to write to localStorage:', err);
  }
}

// ─── Error Caching ────────────────────────────────────────────────
// Los errores también se cachean para no reintentar requests que van a fallar.
// Jerarquía TTL (misma que en el backend):
//   - 404 (Not Found):            10 min  — el resource no existe
//   - 4xx (excepto 429):           5 min  — error del cliente
//   - 429 / 5xx:                   2 min  — rate limit o server error
//   - Sin status (error de red):  30s     — error transitorio
const ERROR_CACHE_PREFIX = 'vibe-cache-error:';
const ERROR_NOT_FOUND_TTL_MS = 10 * 60 * 1000;   // 10 min — 404
const ERROR_CLIENT_TTL_MS = 5 * 60 * 1000;        // 5 min  — 4xx (salvo 429)
const ERROR_SERVER_TTL_MS = 2 * 60 * 1000;        // 2 min  — 429 / 5xx
const ERROR_NETWORK_TTL_MS = 30 * 1000;            // 30s    — error de red

function errorKey(key: string): string {
  return ERROR_CACHE_PREFIX + key;
}

function isErrorCached(key: string): boolean {
  try {
    const raw = localStorage.getItem(errorKey(key));
    if (!raw) return false;
    const entry: CacheEntry<true> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(errorKey(key));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Clasifica el TTL del error según el status HTTP (misma lógica que backend). */
function errorTtlForStatus(status?: number): number {
  if (!status) return ERROR_NETWORK_TTL_MS;
  if (status === 404) return ERROR_NOT_FOUND_TTL_MS;
  if (status >= 400 && status < 500 && status !== 429) return ERROR_CLIENT_TTL_MS;
  return ERROR_SERVER_TTL_MS; // 429, 5xx
}

function cacheError(key: string, ttlMs: number): void {
  try {
    const entry: CacheEntry<true> = { data: true, expiresAt: Date.now() + ttlMs };
    localStorage.setItem(errorKey(key), JSON.stringify(entry));
  } catch { /* localStorage lleno — ignorar */ }
}

/**
 * Helper: cachea Promesas automáticamente, incluídos errores.
 *
 * - Si hay caché de éxito vigente → devuelve el valor cacheado.
 * - Si hay caché de error vigente → lanza error sin ejecutar fetchFn.
 * - Si no hay caché → ejecuta fetchFn, guarda éxito o error, y propaga.
 *
 * @param key  Clave de caché (ej: '/api/spotify/album/123')
 * @param fetchFn  Función que devuelve la Promise a cachear
 * @param ttlMs  Opcional, sobreescribe CACHE_TTL_MS (solo éxito)
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  // 1. ¿Hay éxito cacheado?
  const cached = cacheGet<T>(key);
  if (cached !== null) {
    console.log(`[Frontend Cache HIT] ${key}`);
    return cached;
  }

  // 2. ¿Hay error cacheado?
  if (isErrorCached(key)) {
    console.log(`[Frontend Cache HIT (error)] ${key} — skip retry`);
    throw new Error('Service temporarily unavailable (cached error)');
  }

  // 3. MISS — ejecutar fetch
  console.log(`[Frontend Cache MISS] ${key}`);
  try {
    const data = await fetchFn();
    cacheSet(key, data, ttlMs);
    return data;
  } catch (error) {
    const status = (error as { status?: number }).status;
    const errTtl = errorTtlForStatus(status);
    console.log(`[Frontend Cache ERROR] ${key} — caching error for ${errTtl / 1000}s`);
    cacheError(key, errTtl);
    throw error;
  }
}

/**
 * Invalida una entrada de caché específica.
 * Útil si el usuario fuerza un refresh.
 */
export function cacheInvalidate(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch { /* ignora */ }
}

/**
 * Invalida TODAS las entradas de caché de la app (las que tienen el prefijo).
 */
export function cacheClearAll(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignora */ }
}
