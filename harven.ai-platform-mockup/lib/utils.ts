
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Safely parse JSON from sessionStorage (primary) or localStorage (fallback).
 * Removes corrupt data and returns fallback value on error.
 */
export function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const item = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    return fallback;
  }
}
