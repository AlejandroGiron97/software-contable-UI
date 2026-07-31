export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return fallback;
    return parsed.data as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify({ v: 1, data }));
  } catch {
    // cuota excedida / modo incógnito: se ignora, la sesión sigue funcionando en memoria
  }
}
