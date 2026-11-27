// Model bahaya: seberapa mungkin sebuah jenis kartu menjadi kartu menang lawan.
// Hanya memakai data publik dari view.
import { kindOf, isSuited, suitOf, isDragon } from '../tiles.js';
import { basePay, scoreHand, MIN_FAN } from '../scoring.js';
import { shanten, shantenStd } from '../hand.js';

const PROG = [0.02, 0.02, 0.03, 0.04, 0.06, 0.09, 0.12, 0.16, 0.21, 0.27, 0.33, 0.4, 0.46, 0.52, 0.57, 0.62];

export function readOpponent(view, o, unseen) {
  const log = view.discardLog.filter((d) => d.seat === o).map((d) => kindOf(d.tile));
  const melds = view.melds[o];
  const open = melds.filter((m) => !m.concealed);
  let tenpai = PROG[Math.min(log.length, PROG.length - 1)];
  tenpai += 0.12 * open.length + (open.length >= 3 ? 0.15 : 0);

  // perubahan pola: awal membuang kehormatan/ujung, lalu mulai membuang kartu tengah
  if (log.length >= 7) {
    const early = log.slice(0, Math.floor(log.length / 2));
    const late = log.slice(-3);
    const edge = early.filter((k) => !isSuited(k) || k % 9 === 0 || k % 9 === 8).length / early.length;
    const mid = late.filter((k) => isSuited(k) && k % 9 >= 2 && k % 9 <= 6).length / late.length;
    if (edge >= 0.5 && mid >= 0.66) tenpai += 0.12;
  }
  tenpai = Math.min(0.92, tenpai);

  // indikasi satu jenis: set terbuka satu jenis, atau satu jenis tidak pernah dibuang
  let flush = -1;
  const meldSuits = new Set(open.map((m) => suitOf(m.kind)).filter((s) => s < 3));
  if (meldSuits.size === 1 && open.length >= 1) flush = [...meldSuits][0];
  if (flush < 0 && log.length >= 8) {
    const cnt = [0, 0, 0];
    log.forEach((k) => { if (k < 27) cnt[suitOf(k)]++; });
    const zero = [0, 1, 2].filter((s) => cnt[s] === 0);
    if (zero.length === 1 && meldSuits.size <= 1 && (meldSuits.size === 0 || meldSuits.has(zero[0]))) flush = zero[0];
  }
  const pongs = open.filter((m) => m.type !== 'chi').length;
  const allPong = pongs >= 2 && !open.some((m) => m.type === 'chi');

  let fan = 1 + (flush >= 0 ? 2 : 0) + open.filter((m) => m.type !== 'chi' && (isDragon(m.kind) || m.kind === 27 + view.roundWind)).length + (allPong ? 1 : 0);
  const loss = 2 * basePay(Math.min(5, fan));

  // bobot tiap jenis sebagai kartu tunggu
  const w = new Array(34).fill(0);
  const discarded = new Set(log);
  for (let k = 0; k < 34; k++) {
    if (!unseen[k]) continue; // semua terlihat -> tidak mungkin ditunggu (kecuali sudah di tangan sendiri)
    let x;
    if (!isSuited(k)) x = unseen[k] >= 3 ? 0.5 : unseen[k] === 2 ? 0.35 : 0.04;
    else {
      const r = k % 9;
      x = r === 0 || r === 8 ? 0.6 : r === 1 || r === 7 ? 0.8 : 1.0;
      // suji: buangan r±3 membuat tunggu dua sisi lebih kecil kemungkinannya
      if (r >= 3 && discarded.has(k - 3)) x *= 0.6;
      if (r <= 5 && discarded.has(k + 3)) x *= 0.6;
      if (unseen[k] === 1) x *= 0.5;
    }
    if (discarded.has(k)) x *= 0.15; // pernah dibuang lawan ini: relatif aman
    if (flush >= 0) x *= isSuited(k) ? (suitOf(k) === flush ? 2.2 : 0.08) : 1.3;
    if (allPong) x *= isSuited(k) ? 0.6 : 1.6;
    w[k] = x;
  }
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const pk = w.map((x) => Math.min(0.9, (x / sum) * 2.3)); // rata-rata ~2.3 jenis tunggu
  return { tenpai, pk, loss, flush, fan };
}

// Lawan yang tangannya diintip: kartu tunggu & kebutuhan klaimnya diketahui pasti.
// exact[k] = Kecik ekstra yang hilang kalau membuang k (pembuang bayar 2x, bukan 1x).
// block[k] = seberapa besar membuang k membantu lawan lewat pong/chi (dalam langkah shanten).
function exactOpponent(view, o) {
  const hand = view.peek[o].map(kindOf);
  const melds = view.melds[o];
  const nM = melds.length;
  const c = new Array(34).fill(0);
  hand.forEach((k) => { if (k < 34) c[k]++; });
  const exact = new Array(34).fill(0);
  const block = new Array(34).fill(0);
  const s = shanten(c, nM);
  if (s === 0) {
    const seatWind = (o - view.dealer + 4) % 4;
    for (let k = 0; k < 34; k++) {
      if (c[k] >= 4) continue;
      c[k]++;
      if (shanten(c, nM) === -1) {
        const kinds = [];
        for (let j = 0; j < 34; j++) for (let n = 0; n < c[j]; n++) kinds.push(j);
        const sc = scoreHand({ kinds, melds, selfDrawn: false, seatWind, roundWind: view.roundWind, flowers: view.flowers[o].map(kindOf) });
        if (sc && sc.fan >= MIN_FAN) exact[k] = basePay(sc.fan);
      }
      c[k]--;
    }
  }
  if (s >= 0) {
    const canChi = o === (view.seat + 1) % 4;
    for (let k = 0; k < 34; k++) {
      let best = s;
      if (c[k] >= 2) { c[k] -= 2; best = Math.min(best, shantenStd(c, nM + 1)); c[k] += 2; }
      if (canChi && k < 27) {
        for (let st = k - 2; st <= k; st++) {
          if (st < 0 || Math.floor(st / 9) !== Math.floor(k / 9) || st % 9 > 6) continue;
          const need = [st, st + 1, st + 2].filter((x) => x !== k);
          if (need.every((x) => c[x] > 0)) {
            need.forEach((x) => c[x]--);
            best = Math.min(best, shantenStd(c, nM + 1));
            need.forEach((x) => c[x]++);
          }
        }
      }
      if (best < s) block[k] = (s - best) * (best === 0 ? 2 : 1);
    }
  }
  return { tenpai: exact.some((x) => x > 0) ? 1 : 0, exact, block, pk: new Array(34).fill(0), loss: 0 };
}

export function dangerMap(view, unseen) {
  const danger = new Array(34).fill(0);
  const exact = new Array(34).fill(0);
  const block = new Array(34).fill(0);
  const opps = [];
  for (let i = 1; i < 4; i++) {
    const o = (view.seat + i) % 4;
    if (view.peek && view.peek[o]) {
      const r = exactOpponent(view, o);
      opps.push(r);
      for (let k = 0; k < 34; k++) { exact[k] += r.exact[k]; block[k] += r.block[k]; }
    } else {
      const r = readOpponent(view, o, unseen);
      opps.push(r);
      for (let k = 0; k < 34; k++) danger[k] += r.tenpai * r.pk[k] * r.loss;
    }
  }
  return { danger, exact, block, opps };
}
