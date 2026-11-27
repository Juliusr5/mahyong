// Definisi kartu.
// Kartu fisik = id 0..143. Jenis (kind):
//   0-8   Bambu 1-9
//   9-17  Lingkaran 1-9
//   18-26 Karakter 1-9
//   27-30 Angin Timur, Selatan, Barat, Utara
//   31-33 Naga Merah, Hijau, Putih
//   34-37 Bunga 1-4, 38-41 Musim 1-4 (masing-masing hanya 1 kartu)

export const TOTAL_TILES = 144;
export const SUIT_NAMES = ['Bambu', 'Lingkaran', 'Karakter'];
export const WIND_NAMES = ['Timur', 'Selatan', 'Barat', 'Utara'];
export const DRAGON_NAMES = ['Merah', 'Hijau', 'Putih'];
export const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

export const kindOf = (id) => (id < 136 ? id >> 2 : 34 + (id - 136));
export const isFlower = (k) => k >= 34;
export const isSuited = (k) => k < 27;
export const isHonor = (k) => k >= 27 && k < 34;
export const isWind = (k) => k >= 27 && k <= 30;
export const isDragon = (k) => k >= 31 && k <= 33;
export const suitOf = (k) => (k < 27 ? Math.floor(k / 9) : 3);
export const rankOf = (k) => (k % 9) + 1;
export const isTerminal = (k) => k < 27 && (k % 9 === 0 || k % 9 === 8);

export function tileName(k) {
  if (k < 27) return `${rankOf(k)} ${SUIT_NAMES[suitOf(k)]}`;
  if (k <= 30) return `Angin ${WIND_NAMES[k - 27]}`;
  if (k <= 33) return `Naga ${DRAGON_NAMES[k - 31]}`;
  if (k <= 37) return `Bunga ${k - 33}`;
  return `Musim ${k - 37}`;
}

// RNG deterministik (untuk tes & simulasi).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeWall(rng = Math.random) {
  return shuffle(Array.from({ length: TOTAL_TILES }, (_, i) => i), rng);
}

export const sortTiles = (ids) => ids.slice().sort((a, b) => kindOf(a) - kindOf(b) || a - b);

// Hitungan per jenis (34), bunga diabaikan. Menerima id fisik.
export function countsOf(ids) {
  const c = new Array(34).fill(0);
  for (const id of ids) {
    const k = kindOf(id);
    if (k < 34) c[k]++;
  }
  return c;
}

// Sama, tapi menerima daftar jenis.
export function countsOfKinds(kinds) {
  const c = new Array(34).fill(0);
  for (const k of kinds) if (k < 34) c[k]++;
  return c;
}
