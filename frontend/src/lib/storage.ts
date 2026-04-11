const STORAGE_PREFIX = "technexus:";

export function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
}

export function removeStorage(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
}

export function clearStoragePrefix(prefix = STORAGE_PREFIX) {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove = Object.keys(window.localStorage).filter((key) => key.startsWith(prefix));

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}
