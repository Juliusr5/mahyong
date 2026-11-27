// Analisis tangan: dekomposisi menang, shanten, ukeire. Semua memakai array hitungan 34 jenis.
import { ORPHANS } from './tiles.js';

// Semua cara memecah hitungan menjadi needSets set + 1 pasang.
export function decompositions(counts, needSets) {
  const c = Array.from(counts);
  const out = [];
  const sets = [];
  (function rec(i, pair) {
    while (i < 34 && c[i] === 0) i++;
    if (i === 34) {
      if (pair >= 0 && sets.length === needSets) out.push({ pair, sets: sets.slice() });
      return;
    }
    if (pair < 0 && c[i] >= 2) { c[i] -= 2; rec(i, i); c[i] += 2; }
    if (c[i] >= 3) { c[i] -= 3; sets.push({ t: 'pong', k: i }); rec(i, pair); sets.pop(); c[i] += 3; }
    if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
      c[i]--; c[i + 1]--; c[i + 2]--;
      sets.push({ t: 'chi', k: i }); rec(i, pair); sets.pop();
      c[i]++; c[i + 1]++; c[i + 2]++;
    }
  })(0, -1);
  return out;
}

const total = (c) => c.reduce((a, b) => a + b, 0);

// Seven Pairs: 7 pasang berbeda (kartu kembar 4 tidak dihitung 2 pasang).
export function isSevenPairs(c) {
  return total(c) === 14 && c.filter((x) => x === 2).length === 7;
}

export function isThirteenOrphans(c) {
  if (total(c) !== 14) return false;
  for (let k = 0; k < 34; k++) if (c[k] && !ORPHANS.includes(k)) return false;
  return ORPHANS.every((k) => c[k] >= 1);
}

export function isWinningShape(c, nMelds) {
  if (total(c) !== 14 - 3 * nMelds) return false;
  if (nMelds === 0 && (isSevenPairs(c) || isThirteenOrphans(c))) return true;
  return decompositions(c, 4 - nMelds).length > 0;
}

// ---------- Shanten cepat dengan tabel per kelompok (cache) ----------
// Untuk tiap kelompok (3 jenis angka + kehormatan) disimpan: best[m*2+p] = jumlah taatsu maksimum
// dengan m set dan p (0/1) pasang.
const caches = [new Map(), new Map()]; // [boleh chi, tanpa chi]

function groupOpts(c, off, len, chi) {
  let key = 0;
  for (let i = 0; i < len; i++) key = key * 5 + c[off + i];
  key = key * 2 + (len === 9 ? 1 : 0);
  const cache = caches[chi ? 0 : 1];
  let best = cache.get(key);
  if (best) return best;
  best = new Int8Array(10).fill(-1);
  const a = [];
  for (let i = 0; i < len; i++) a.push(c[off + i]);
  (function search(i, m, t, p) {
    while (i < len && a[i] === 0) i++;
    if (i === len) {
      const idx = Math.min(m, 4) * 2 + p;
      if (t > best[idx]) best[idx] = Math.min(t, 8);
      return;
    }
    if (a[i] >= 3) { a[i] -= 3; search(i, m + 1, t, p); a[i] += 3; }
    if (chi && i + 2 < len && a[i + 1] && a[i + 2]) {
      a[i]--; a[i + 1]--; a[i + 2]--; search(i, m + 1, t, p); a[i]++; a[i + 1]++; a[i + 2]++;
    }
    if (a[i] >= 2) {
      a[i] -= 2;
      if (!p) search(i, m, t, 1);
      search(i, m, t + 1, p);
      a[i] += 2;
    }
    if (chi && i + 1 < len && a[i + 1]) { a[i]--; a[i + 1]--; search(i, m, t + 1, p); a[i]++; a[i + 1]++; }
    if (chi && i + 2 < len && a[i + 2]) { a[i]--; a[i + 2]--; search(i, m, t + 1, p); a[i]++; a[i + 2]++; }
    a[i]--; search(i, m, t, p); a[i]++;
  })(0, 0, 0, 0);
  cache.set(key, best);
  return best;
}

const EMPTY = (() => { const b = new Int8Array(10).fill(-1); b[0] = 0; return b; })();

// opts.noChi: hanya pong (untuk rencana "semua pong").
// opts.groups: array 4 boolean, kelompok yang boleh dipakai (rencana satu jenis).
export function shantenStd(c, nMelds, opts = {}) {
  let dp = EMPTY;
  for (let g = 0; g < 4; g++) {
    const allowed = !opts.groups || opts.groups[g];
    const go = allowed ? groupOpts(c, g * 9, g < 3 ? 9 : 7, g < 3 && !opts.noChi) : EMPTY;
    const nd = new Int8Array(10).fill(-1);
    for (let i = 0; i < 10; i++) {
      if (dp[i] < 0) continue;
      for (let j = 0; j < 10; j++) {
        if (go[j] < 0) continue;
        const m = (i >> 1) + (j >> 1);
        if (m > 4) continue;
        let p = (i & 1) + (j & 1);
        let t = dp[i] + go[j];
        if (p > 1) { p = 1; t += 1; }
        const idx = m * 2 + p;
        if (t > nd[idx]) nd[idx] = Math.min(t, 8);
      }
    }
    dp = nd;
  }
  const N = 4 - nMelds;
  let best = 8;
  for (let i = 0; i < 10; i++) {
    if (dp[i] < 0) continue;
    const M = Math.min(i >> 1, N);
    const T = Math.min(dp[i], N - M);
    const s = 2 * (N - M) - T - (i & 1);
    if (s < best) best = s;
  }
  return best;
}

export function shantenPairs(c) {
  let pairs = 0, kinds = 0;
  for (let k = 0; k < 34; k++) { if (c[k] >= 1) kinds++; if (c[k] >= 2) pairs++; }
  return 6 - pairs + Math.max(0, 7 - kinds);
}

export function shantenOrphans(c) {
  let kinds = 0, pair = 0;
  for (const k of ORPHANS) { if (c[k]) kinds++; if (c[k] >= 2) pair = 1; }
  return 13 - kinds - pair;
}

export function shanten(c, nMelds) {
  let s = shantenStd(c, nMelds);
  if (nMelds === 0) s = Math.min(s, shantenPairs(c), shantenOrphans(c));
  return s;
}

// Jenis kartu yang menurunkan shanten dari tangan 13 (atau 13-3m) kartu.
// unseen: array 34 jumlah kartu yang belum terlihat. fn: fungsi shanten (default: shanten umum).
export function ukeire(c, nMelds, unseen, fn = shanten) {
  const base = fn(c, nMelds);
  const kinds = [];
  let count = 0;
  for (let k = 0; k < 34; k++) {
    if (!unseen[k] || c[k] >= 4) continue;
    c[k]++;
    if (fn(c, nMelds) < base) { kinds.push(k); count += unseen[k]; }
    c[k]--;
  }
  return { shanten: base, kinds, count };
}
