// Penghitungan fan (gaya Hong Kong) dan pembayaran chip.
import { countsOfKinds, suitOf, isDragon, isWind } from './tiles.js';
import { decompositions, isSevenPairs, isThirteenOrphans } from './hand.js';

export const MIN_FAN = 3;
export const MAX_FAN = 10;
// Satu-satunya tempat tabel bayar. Nilai dasar per jumlah fan.
export const PAY_TABLE = { 3: 8, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96, 10: 128 };
export const basePay = (fan) => PAY_TABLE[Math.min(fan, MAX_FAN)] || 0;

// Nilai fan tiap pola, juga dipakai halaman Bantuan.
export const FAN = {
  zimo: ['Zimo (ambil sendiri)', 1],
  concealed: ['Tangan tertutup, menang dari buangan', 1],
  allChi: ['Semua chi', 1],
  allPong: ['Semua pong', 3],
  mixed: ['Campur satu jenis', 3],
  pure: ['Satu jenis murni', 7],
  dragon: ['Pong naga', 1],
  seatWind: ['Pong angin kursi', 1],
  roundWind: ['Pong angin putaran', 1],
  smallDragons: ['Tiga naga kecil', 5],
  bigDragons: ['Tiga naga besar', 8],
  smallWinds: ['Empat angin kecil', 6],
  bigWinds: ['Empat angin besar', 10],
  allHonors: ['Semua kartu kehormatan', 10],
  orphans: ['Thirteen Orphans', 10],
  sevenPairs: ['Seven Pairs', 4],
  flower: ['Bunga/musim sesuai kursi', 1],
  noFlower: ['Tanpa bunga', 1],
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
  if (ctx.selfDrawn) out.push(item('zimo'));
  const own = (ctx.flowers || []).filter((f) => f === 34 + ctx.seatWind || f === 38 + ctx.seatWind).length;
  if (own) out.push(item('flower', own));
  if (!ctx.flowers || !ctx.flowers.length) out.push(item('noFlower'));
  if (ctx.last) out.push(item('lastTile'));
  if (ctx.kongRep) out.push(item('kongRep'));
  if (ctx.robKong) out.push(item('robKong'));
  return out;
}

function finish(items) {
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
  const open = melds.some((m) => !m.concealed);
  const candidates = [];

  if (!melds.length && isThirteenOrphans(c)) return finish([item('orphans')]);
  if (!melds.length && isSevenPairs(c)) {
    candidates.push(finish([item('sevenPairs'), ...suitItems(allKinds), ...situationItems(ctx)]));
  }

  for (const d of decompositions(c, 4 - melds.length)) {
    const sets = [...d.sets.map((s) => s.t), ...melds.map((m) => (m.type === 'chi' ? 'chi' : 'pong'))];
    const pongKinds = [...d.sets.filter((s) => s.t === 'pong').map((s) => s.k), ...melds.filter((m) => m.type !== 'chi').map((m) => m.kind)];
    const items = [...suitItems(allKinds), ...situationItems(ctx)];
    if (!open && !ctx.selfDrawn) items.push(item('concealed'));
    if (sets.every((t) => t === 'chi')) items.push(item('allChi'));
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

// Pembayaran: menang dari buangan -> pembuang bayar 2x; zimo -> tiap lawan bayar 1x.
export function payments(winner, from, fan) {
  const base = basePay(fan);
  const p = [0, 0, 0, 0];
  if (from === null || from === undefined) {
    for (let s = 0; s < 4; s++) if (s !== winner) { p[s] = -base; p[winner] += base; }
  } else {
    p[from] = -2 * base;
    p[winner] = 2 * base;
  }
  return p;
}
