// localStorage aman (Safari mode privat bisa melempar error).
const P = 'mjhk.';

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(P + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(P + key, JSON.stringify(value));
  } catch { /* penyimpanan penuh / tidak tersedia */ }
}

export function remove(key) {
  try { localStorage.removeItem(P + key); } catch { /* abaikan */ }
}

export const DEFAULT_SETTINGS = {
  level: 'sedang', length: 'east', speed: 'normal', sound: true, haptics: true, hints: false, tutorialDone: false, big: true,
};
export const DEFAULT_STATS = { rounds: 0, wins: 0, zimo: 0, dealtIn: 0, best: null, maxChips: 1000 };

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...load('settings', {}) });
export const loadStats = () => ({ ...DEFAULT_STATS, ...load('stats', {}) });
