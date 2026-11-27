// Penghitungan tai (gaya Singapura) dan pembayaran Kecik.
// Catatan: nama internal memakai "fan" (= nilai tangan); yang ditampilkan ke pemain adalah "tai".
import { countsOfKinds, suitOf, isDragon, isWind } from './tiles.js';
import { decompositions, isThirteenOrphans } from './hand.js';

export const MIN_FAN = 0; // Chicken Hand (0 tai) boleh menang
export const MAX_FAN = 5; // batas 5 tai
// Satu-satunya tempat tabel bayar. Nilai dasar per jumlah tai (berlipat ganda).
export const PAY_TABLE = { 0: 2, 1: 4, 2: 8, 3: 16, 4: 32, 5: 64 }; // 0 = Chicken Hand
export const basePay = (fan) => PAY_TABLE[Math.min(Math.max(0, fan), MAX_FAN)] ?? 0;
export const UNIT = 'tai';

// Nilai tai tiap pola, juga dipakai halaman Bantuan.
export const FAN = {
  chicken: ['Chicken Hand (tanpa tai)', 0],
  pingHu: ['Ping Hu (semua ciak, tanpa bunga)', 4],
  allChi: ['Semua ciak', 1],
  allPong: ['Tui tui hu (semua bong)', 2],
  mixed: ['Hun it sik (campur satu jenis)', 2],
  pure: ['Ceng it sik (satu jenis murni)', 4],
  dragon: ['Bong naga', 1],
  seatWind: ['Bong angin kursi', 1],
  roundWind: ['Bong angin putaran', 1],
  smallDragons: ['Tiga naga kecil', 4],
  bigDragons: ['Tiga naga besar', 5],
  smallWinds: ['Empat angin kecil', 4],
  bigWinds: ['Empat angin besar', 5],
  allHonors: ['Semua kartu kehormatan', 5],
  orphans: ['Thirteen Orphans', 5],
  flower: ['Bunga/musim sesuai kursi', 1],
  lastTile: ['Menang dari kartu terakhir dinding', 1],
  kongRep: ['Menang dari kartu pengganti kong', 1],
  robKong: ['Merampok kong', 1],
};

const item = (key, n = 1) => ({ key, name: FAN[key][0], fan: FAN[key][1] * n });

function suitItems(kinds) {
  const suits = new Set(kinds.map(suitOf));
  const hasHonor = suits.delete(3);
  if (suits.size === 0) return [item('allHonors')];
  if (suits.size === 1) return [item(hasHonor ? 'mixed' : 'pure')];
  return [];
}

function situationItems(ctx) {
  const out = [];
  const own = (ctx.flowers || []).filter((f) => f === 34 + ctx.seatWind || f === 38 + ctx.seatWind).length;
  if (own) out.push(item('flower', own));
  if (ctx.last) out.push(item('lastTile'));
  if (ctx.kongRep) out.push(item('kongRep'));
  if (ctx.robKong) out.push(item('robKong'));
  return out;
}

function finish(items) {
  if (!items.length) items = [item('chicken')]; // tangan lengkap tanpa pola bernilai
  const raw = items.reduce((a, b) => a + b.fan, 0);
  return { fan: Math.min(raw, MAX_FAN), raw, limit: raw >= MAX_FAN, items };
}

// ctx: { kinds: jenis kartu tertutup termasuk kartu menang, melds: [{type, kind, concealed}],
//        selfDrawn, seatWind, roundWind, flowers: [jenis], last, kongRep, robKong }
// Mengembalikan { fan, raw, limit, items } atau null kalau bukan tangan menang.
export function scoreHand(ctx) {
  const melds = ctx.melds || [];
  const c = countsOfKinds(ctx.kinds);
  const allKinds = [...ctx.kinds, ...melds.map((m) => m.kind)];
  const candidates = [];
  const noFlowers = !ctx.flowers || !ctx.flowers.length;

  if (!melds.length && isThirteenOrphans(c)) return finish([item('orphans')]);

  for (const d of decompositions(c, 4 - melds.length)) {
    const sets = [...d.sets.map((s) => s.t), ...melds.map((m) => (m.type === 'chi' ? 'chi' : 'pong'))];
    const pongKinds = [...d.sets.filter((s) => s.t === 'pong').map((s) => s.k), ...melds.filter((m) => m.type !== 'chi').map((m) => m.kind)];
    const items = [...suitItems(allKinds), ...situationItems(ctx)];
    if (sets.every((t) => t === 'chi')) {
      const valuePair = isDragon(d.pair) || d.pair === 27 + ctx.seatWind || d.pair === 27 + ctx.roundWind;
      items.push(item(noFlowers && !valuePair ? 'pingHu' : 'allChi'));
    }
    if (sets.every((t) => t === 'pong')) items.push(item('allPong'));

    const dragons = pongKinds.filter(isDragon).length;
    if (dragons === 3) items.push(item('bigDragons'));
    else if (dragons === 2 && isDragon(d.pair)) items.push(item('smallDragons'));
    else if (dragons) items.push(item('dragon', dragons));

    const winds = pongKinds.filter(isWind).length;
    if (winds === 4) items.push(item('bigWinds'));
    else if (winds === 3 && isWind(d.pair)) items.push(item('smallWinds'));
    else {
      if (pongKinds.includes(27 + ctx.seatWind)) items.push(item('seatWind'));
      if (pongKinds.includes(27 + ctx.roundWind)) items.push(item('roundWind'));
    }
    candidates.push(finish(items));
  }
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (b.raw > a.raw ? b : a));
}

// Pembayaran gaya Singapura:
// - menang dari buangan: pembuang bayar 2x, dua pemain lain masing-masing 1x
// - zimo: ketiga lawan masing-masing bayar 2x
export function payments(winner, from, fan) {
  const base = basePay(fan);
  const p = [0, 0, 0, 0];
  for (let s = 0; s < 4; s++) {
    if (s === winner) continue;
    const pay = from === null || from === undefined ? 2 * base : s === from ? 2 * base : base;
    p[s] = -pay;
    p[winner] += pay;
  }
  return p;
}
