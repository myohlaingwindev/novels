type Entry = { expires: number; value: unknown; generation: number };

const entries = new Map<string, Entry>();
const generations = new Map<string, number>();
const pending = new Map<string, Promise<unknown>>();

export const libraryCatalogKey = "library-catalog";
export const genreListKey = "genres";
export const readCacheTtlMs = 60_000;

export async function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const flight = pending.get(key);
  if (flight) return flight as Promise<T>;
  const generation = generations.get(key) ?? 0;
  const next = load()
    .then((value) => {
      if ((generations.get(key) ?? 0) === generation) {
        entries.set(key, { expires: Date.now() + ttlMs, value, generation });
      }
      return value;
    })
    .finally(() => {
      if (pending.get(key) === next) pending.delete(key);
    });
  pending.set(key, next);
  return next as Promise<T>;
}

export function forget(key: string) {
  generations.set(key, (generations.get(key) ?? 0) + 1);
  entries.delete(key);
}

export function clearMemoryCache() {
  entries.clear();
  generations.clear();
  pending.clear();
}
