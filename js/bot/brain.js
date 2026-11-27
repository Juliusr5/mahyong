// Otak bot. Hanya menerima `view` (data publik + tangan sendiri), tidak pernah objek Round.
import { kindOf, countsOf } from '../tiles.js';
import { shanten, ukeire } from '../hand.js';

export function unseenCounts(view) {
  const u = new Array(34).fill(4);
  const see = (k) => { if (k < 34) u[k]--; };
  view.hand.forEach((t) => see(kindOf(t)));
  view.discards.forEach((d) => d.forEach((t) => see(kindOf(t))));
  view.melds.forEach((ms) => ms.forEach((m) => {
    if (m.tiles.length) m.tiles.forEach((t) => see(kindOf(t)));
    else for (let i = 0; i < 4; i++) see(m.kind); // kong tertutup lawan: jenisnya terlihat
  }));
  return u.map((x) => Math.max(0, x));
}

export function bestDiscards(view, unseen = unseenCounts(view)) {
  const c = countsOf(view.hand);
  const nM = view.melds[view.seat].length;
  const out = [];
  for (let k = 0; k < 34; k++) {
    if (!c[k]) continue;
    c[k]--;
    const u = ukeire(c, nM, unseen);
    c[k]++;
    out.push({ kind: k, shanten: u.shanten, ukeire: u.count, waits: u.kinds });
  }
  return out.sort((a, b) => a.shanten - b.shanten || b.ukeire - a.ukeire);
}

export function decide(view, req) {
  const o = req.options;
  if (req.type === 'turn') {
    if (o.tsumo) return { type: 'tsumo' };
    const best = bestDiscards(view)[0];
    return { type: 'discard', tile: view.hand.find((t) => kindOf(t) === best.kind) };
  }
  if (o.hu) return { type: 'hu' };
  if (o.pong && req.type === 'claim') {
    const k = kindOf(view.claimTile);
    if (k >= 31 || k === 27 + view.seatWind || k === 27 + view.roundWind) return { type: 'pong' };
  }
  return { type: 'pass' };
}

export function shantenOf(view) {
  return shanten(countsOf(view.hand), view.melds[view.seat].length);
}
