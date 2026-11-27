// Otak bot. Hanya menerima `view` (data publik + tangan sendiri) — tidak pernah objek Round,
// jadi secara teknis tidak bisa melihat tangan lawan atau urutan dinding.
import { kindOf, countsOf, isDragon } from '../tiles.js';
import { shantenStd, shantenPairs, shantenOrphans, shanten } from '../hand.js';
import { scoreHand, basePay, MIN_FAN } from '../scoring.js';
import { dangerMap } from './danger.js';

export const LEVELS = {
  mudah: { plans: false, mc: false, defense: 0.12, noise: 0.15, naiveClaims: true, claimMargin: 1.08, claimAdd: 0.5, claimDanger: 1 },
  sedang: { plans: true, mc: false, defense: 0.35, noise: 0, naiveClaims: false, claimMargin: 1.08, claimAdd: 0.5, claimDanger: 1 },
  sulit: { plans: true, mc: true, defense: 0.4, noise: 0, naiveClaims: false, claimMargin: 1.08, claimAdd: 0.5, claimDanger: 1 },
};
export const STYLES = {
  agresif: { defense: 0.75, claim: 0.92 },
  seimbang: { defense: 1.0, claim: 1.0 },
  'hati-hati': { defense: 1.3, claim: 1.08 },
};

export function unseenCounts(view) {
  const u = new Array(34).fill(4);
  const see = (k) => { if (k < 34) u[k]--; };
  view.hand.forEach((t) => see(kindOf(t)));
  view.discards.forEach((d) => d.forEach((t) => see(kindOf(t))));
  view.melds.forEach((ms) => ms.forEach((m) => {
    if (m.tiles.length) m.tiles.forEach((t) => see(kindOf(t)));
    else for (let i = 0; i < 4; i++) see(m.kind);
  }));
  return u.map((x) => Math.max(0, x));
}

// ---------- Rencana tangan ----------
// Tiap rencana: fungsi shanten terbatas + fan dasar yang dijamin rencana itu.
function plansFor(melds, c, full) {
  const meldSuits = new Set(melds.map((m) => (m.kind < 27 ? Math.floor(m.kind / 9) : 3)));
  const hasChi = melds.some((m) => m.type === 'chi');
  const nM = melds.length;
  const P = [{ id: 'dasar', base: 0, fn: (x) => shantenStd(x, nM) }];
  if (!full) return P;
  const suitCount = [0, 0, 0, 0];
  for (let k = 0; k < 34; k++) suitCount[k < 27 ? Math.floor(k / 9) : 3] += c[k];
  for (let s = 0; s < 3; s++) {
    const others = [0, 1, 2].filter((x) => x !== s);
    if (others.some((x) => meldSuits.has(x))) continue;
    if (suitCount[s] + suitCount[3] >= 7) {
      const g = [0, 1, 2, 3].map((x) => x === s || x === 3);
      P.push({ id: 'campur' + s, base: 3, fn: (x) => shantenStd(x, nM, { groups: g }) });
    }
    if (!meldSuits.has(3) && suitCount[s] >= 8) {
      const g = [0, 1, 2, 3].map((x) => x === s);
      P.push({ id: 'murni' + s, base: 7, fn: (x) => shantenStd(x, nM, { groups: g }) });
    }
  }
  if (!hasChi) P.push({ id: 'pong', base: 3, fn: (x) => shantenStd(x, nM, { noChi: true }) });
  if (!nM) {
    P.push({ id: 'pasang', base: 4, fn: (x) => shantenPairs(x), pairs: true });
    if (shantenOrphans(c) <= 4) P.push({ id: 'yatim', base: 10, fn: (x) => shantenOrphans(x), orphans: true });
  }
  return P;
}

// Fan yang sudah pasti/kemungkinan dari fitur tangan (di luar fan rencana).
function featureFan(c, melds, view) {
  const pongKinds = melds.filter((m) => m.type !== 'chi').map((m) => m.kind);
  for (let k = 27; k < 34; k++) if (c[k] >= 3) pongKinds.push(k);
  let f = 0;
  const valuable = (k) => isDragon(k) || k === 27 + view.seatWind || k === 27 + view.roundWind;
  for (const k of pongKinds) {
    if (isDragon(k)) f += 1;
    if (k === 27 + view.seatWind) f += 1;
    if (k === 27 + view.roundWind) f += 1;
  }
  for (let k = 27; k < 34; k++) if (c[k] === 2 && valuable(k)) f += 0.45;
  const fl = view.flowers[view.seat].map(kindOf);
  f += fl.length ? fl.filter((x) => x === 34 + view.seatWind || x === 38 + view.seatWind).length : 1;
  f += melds.some((m) => !m.concealed) ? 0.4 : 1; // tertutup: +1 (dari buangan) atau zimo +1
  return f;
}

const payoff = (fan) => 2.4 * basePay(Math.min(10, Math.floor(fan)));

// Peluang menang kasar: butuh (s+1) langkah dalam T giliran.
// ch = jumlah kesempatan per giliran untuk langkah perantara (ambil + peluang klaim).
function winProb(s, qFirst, qMid, qDraw, qRon, T, lambda, ch = 1) {
  let dist = new Array(s + 2).fill(0); // dist[k] = peluang masih butuh k langkah
  dist[s + 1] = 1;
  let win = 0, surv = 1;
  for (let t = 0; t < T; t++) {
    const nd = new Array(s + 2).fill(0);
    for (let k = 1; k <= s + 1; k++) {
      if (!dist[k]) continue;
      let p;
      if (k === 1) p = 1 - (1 - qDraw) * Math.pow(1 - qRon, 3);
      else p = 1 - Math.pow(1 - (k === s + 1 ? qFirst : qMid), ch);
      p = Math.min(0.95, p);
      if (k === 1) win += dist[k] * p * surv;
      else nd[k - 1] += dist[k] * p;
      nd[k] += dist[k] * (1 - p);
    }
    dist = nd;
    surv *= 1 - lambda;
  }
  return win;
}

// Nilai menunggu yang tepat untuk tangan siap (tenpai): fan nyata per kartu tunggu.
function tenpaiWaits(c, melds, view, unseen, fn) {
  const nM = melds.length;
  const fl = view.flowers[view.seat].map(kindOf);
  const out = [];
  for (let k = 0; k < 34; k++) {
    if (!unseen[k] || c[k] >= 4) continue;
    c[k]++;
    if (fn(c, nM) === -1) {
      const kinds = [];
      for (let j = 0; j < 34; j++) for (let n = 0; n < c[j]; n++) kinds.push(j);
      const ctx = { kinds, melds, seatWind: view.seatWind, roundWind: view.roundWind, flowers: fl, last: view.wallCount <= 4 };
      const ron = scoreHand({ ...ctx, selfDrawn: false });
      const tsu = scoreHand({ ...ctx, selfDrawn: true });
      out.push({ k, n: unseen[k], ron: ron && ron.fan >= MIN_FAN ? ron.fan : 0, tsumo: tsu && tsu.fan >= MIN_FAN ? tsu.fan : 0 });
    }
    c[k]--;
  }
  return out;
}

// EV (dalam chip) dari tangan 13-ekuivalen: maksimum atas semua rencana.
export function handEV(c, melds, view, unseen, cfg, env) {
  const U = Math.max(1, unseen.reduce((a, b) => a + b, 0));
  const T = Math.max(1, Math.ceil(view.wallCount / 4));
  const plans = plansFor(melds, c, cfg.plans);
  const feat = featureFan(c, melds, view);
  let best = { ev: 0, plan: 'dasar', shanten: 9, ukeire: 0 };
  for (const p of plans) {
    const s = p.fn(c, melds.length);
    if (s > 5) continue;
    let ev;
    let uke = 0;
    if (s === 0) {
      const waits = tenpaiWaits(c, melds, view, unseen, p.fn === plans[0].fn ? (x, n) => shanten(x, n) : p.fn);
      // tiap jenis tunggu: peluang per giliran via ambil sendiri & buangan
      let qD = 0, qR = 0, vD = 0, vR = 0;
      for (const w of waits) {
        uke += w.n;
        if (w.tsumo) { qD += w.n / U; vD += (w.n / U) * 3 * basePay(w.tsumo); }
        if (w.ron) { qR += (w.n / U) * 0.45; vR += (w.n / U) * 0.45 * 2 * basePay(w.ron); }
      }
      const pw = winProb(0, 0, 0, qD, qR, T, env.lambda);
      const tot = qD + 3 * qR;
      ev = tot > 0 ? pw * (vD + 3 * vR) / tot : 0;
    } else {
      for (let k = 0; k < 34; k++) {
        if (!unseen[k] || c[k] >= 4) continue;
        c[k]++;
        if (p.fn(c, melds.length) < s) uke += unseen[k];
        c[k]--;
      }
      const fan = p.base + feat;
      const closedOnly = p.pairs || p.orphans;
      const qFinal = (closedOnly ? 2.5 : 6) / U;
      const qMid = (closedOnly ? uke * 0.45 : Math.max(uke * 0.75, 6)) / U;
      const pw = winProb(s, uke / U, qMid, qFinal, qFinal * 0.45, T, env.lambda, closedOnly ? 1 : 1.5);
      const feasible = fan >= MIN_FAN ? 1 : Math.pow(cfg.feas ?? 0.3, MIN_FAN - fan);
      ev = pw * payoff(Math.max(fan, MIN_FAN)) * feasible;
    }
    if (ev > best.ev || (best.ev === 0 && s < best.shanten)) best = { ev, plan: p.id, shanten: s, ukeire: uke, fn: p.fn };
  }
  return best;
}

// ---------- Monte Carlo (level Sulit) ----------
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function rollout(c0, melds, view, pool, fn, rng, T, lambda) {
  const c = c0.slice();
  const nM = melds.length;
  // kocok sebagian sesuai kebutuhan
  const need = Math.min(pool.length, T * 4);
  for (let i = 0; i < need; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  const fl = view.flowers[view.seat].map(kindOf);
  const score = (selfDrawn) => {
    const kinds = [];
    for (let j = 0; j < 34; j++) for (let n = 0; n < c[j]; n++) kinds.push(j);
    const r = scoreHand({ kinds, melds, selfDrawn, seatWind: view.seatWind, roundWind: view.roundWind, flowers: fl });
    return r && r.fan >= MIN_FAN ? r.fan : 0;
  };
  let idx = 0, surv = 1;
  for (let t = 0; t < T && idx < need; t++) {
    const d = pool[idx++];
    c[d]++;
    if (shanten(c, nM) === -1) { const f = score(true); if (f) return surv * 3 * basePay(f); }
    // buang yang menjaga shanten rencana paling kecil
    let bestK = d, bestS = 99;
    for (let k = 0; k < 34; k++) {
      if (!c[k]) continue;
      c[k]--;
      const s = fn(c, nM);
      c[k]++;
      if (s < bestS || (s === bestS && k === d)) { bestS = s; bestK = k; }
    }
    c[bestK]--;
    for (let o = 0; o < 3 && idx < need; o++) {
      const k = pool[idx++];
      if (rng() > 0.45 || c[k] >= 4) continue;
      c[k]++;
      if (shanten(c, nM) === -1) { const f = score(false); if (f) return surv * 2 * basePay(f); }
      c[k]--;
    }
    surv *= 1 - lambda;
  }
  return 0;
}

function monteCarlo(cands, c, melds, view, unseen, cfg, env) {
  const pool = [];
  for (let k = 0; k < 34; k++) for (let n = 0; n < unseen[k]; n++) pool.push(k);
  const T = Math.max(1, Math.ceil(view.wallCount / 4));
  const end = now() + (cfg.budgetMs ?? 250);
  const maxIt = cfg.mcIters ?? 2000;
  const sums = cands.map(() => 0), ns = cands.map(() => 0);
  let it = 0;
  while (it < maxIt && (it < cands.length * 8 || now() < end)) {
    const i = it % cands.length;
    const cd = cands[i];
    c[cd.kind]--;
    sums[i] += rollout(c, melds, view, pool, cd.fn || ((x, n) => shanten(x, n)), cfg.rng, T, env.lambda);
    c[cd.kind]++;
    ns[i]++;
    it++;
  }
  cands.forEach((cd, i) => { cd.mc = sums[i] / Math.max(1, ns[i]); cd.mcN = ns[i]; });
  return it;
}

// ---------- Keputusan ----------
function envFor(view, unseen) {
  const dm = dangerMap(view, unseen);
  const lambda = Math.min(0.2, 0.012 + dm.opps.reduce((a, o) => a + o.tenpai * 0.11, 0));
  return { ...dm, lambda };
}

export function rankDiscards(view, cfg, unseen = unseenCounts(view), env = envFor(view, unseen)) {
  const c = countsOf(view.hand);
  const melds = view.melds[view.seat];
  const defense = cfg.defense * (cfg.styleDefense ?? 1);
  const out = [];
  for (let k = 0; k < 34; k++) {
    if (!c[k]) continue;
    c[k]--;
    const h = handEV(c, melds, view, unseen, cfg, env);
    c[k]++;
    out.push({ kind: k, ev: h.ev, shanten: h.shanten, plan: h.plan, ukeire: h.ukeire, fn: h.fn, danger: env.danger[k], score: 0 });
  }
  if (cfg.mc && out.length > 1) {
    out.sort((a, b) => b.ev - a.ev);
    const top = out.filter((x) => x.shanten <= 2 && x.ev >= out[0].ev * 0.6).slice(0, 5);
    if (top.length > 1) {
      monteCarlo(top, c, melds, view, unseen, cfg, env);
      // gabungkan estimasi simulasi dengan estimasi analitik
      const wmc = cfg.mcWeight ?? 0.6;
      for (const x of top) x.ev = wmc * x.mc + (1 - wmc) * x.ev;
    }
  }
  // push/fold: tangan siap tetap menyerang, tangan jauh lebih cepat bertahan
  const PF = cfg.pushFold || [1, 1, 1, 1];
  for (const x of out) x.score = x.ev - defense * PF[Math.min(3, Math.max(0, x.shanten))] * x.danger;
  out.sort((a, b) => b.score - a.score || a.shanten - b.shanten || b.ukeire - a.ukeire);
  return out;
}

function pickTile(view, kind) {
  return view.hand.find((t) => kindOf(t) === kind);
}

function withMeld(view, kinds, meld) {
  // view hipotetis setelah klaim: hapus kartu dari tangan, tambah set
  const hand = view.hand.slice();
  for (const k of kinds) hand.splice(hand.findIndex((t) => kindOf(t) === k), 1);
  const melds = view.melds.map((m) => m.slice());
  melds[view.seat] = [...melds[view.seat], meld];
  return { ...view, hand, melds };
}

function claimDecision(view, req, cfg) {
  const o = req.options;
  if (o.hu) return { type: 'hu' };
  const k = kindOf(view.claimTile);
  const unseen = unseenCounts(view);
  const env = envFor(view, unseen);
  const c = countsOf(view.hand);
  const melds = view.melds[view.seat];
  const nM = melds.length;

  if (cfg.naiveClaims) {
    // Mudah: buka set kalau shanten turun, atau pong kartu bernilai
    const s0 = shanten(c, nM);
    const valuable = isDragon(k) || k === 27 + view.seatWind || k === 27 + view.roundWind;
    if (o.pong) {
      c[k] -= 2;
      const s1 = shantenStd(c, nM + 1);
      c[k] += 2;
      if (valuable || s1 < s0) return { type: o.kong && cfg.rng() < 0.5 ? 'kong' : 'pong' };
    }
    if (o.chi && cfg.rng() < 0.6) {
      const st = o.chi[0];
      for (const x of [st, st + 1, st + 2]) if (x !== k) c[x]--;
      const s1 = shantenStd(c, nM + 1);
      for (const x of [st, st + 1, st + 2]) if (x !== k) c[x]++;
      if (s1 < s0) return { type: 'chi', start: st };
    }
    return { type: 'pass' };
  }

  const base = handEV(c, melds, view, unseen, cfg, env).ev;
  const opts = [];
  const evAfter = (v2) => {
    const r = rankDiscards({ ...v2, wallCount: Math.max(0, v2.wallCount) }, { ...cfg, mc: false }, unseen, env);
    return r.length ? r[0].ev - cfg.claimDanger * cfg.defense * (cfg.styleDefense ?? 1) * r[0].danger : 0;
  };
  if (o.pong) opts.push({ a: { type: 'pong' }, ev: evAfter(withMeld(view, [k, k], { type: 'pong', kind: k, concealed: false, tiles: [] })) });
  if (o.kong) {
    const v2 = withMeld(view, [k, k, k], { type: 'kong', kind: k, concealed: false, tiles: [] });
    const h = handEV(countsOf(v2.hand), v2.melds[view.seat], v2, unseen, cfg, env).ev;
    opts.push({ a: { type: 'kong' }, ev: h * 1.05 });
  }
  for (const st of o.chi || []) {
    const need = [st, st + 1, st + 2].filter((x) => x !== k);
    opts.push({ a: { type: 'chi', start: st }, ev: evAfter(withMeld(view, need, { type: 'chi', kind: st, concealed: false, tiles: [] })) });
  }
  opts.sort((a, b) => b.ev - a.ev);
  const margin = cfg.claimMargin * (cfg.styleClaim ?? 1);
  if (opts.length && opts[0].ev > base * margin + cfg.claimAdd) return opts[0].a;
  return { type: 'pass' };
}

function turnDecision(view, req, cfg) {
  const o = req.options;
  if (o.tsumo) return { type: 'tsumo' };
  const unseen = unseenCounts(view);
  const env = envFor(view, unseen);
  const melds = view.melds[view.seat];
  // kong: lakukan kalau tidak memperburuk shanten
  for (const kg of o.kongs) {
    const c = countsOf(view.hand);
    const now14 = (() => { let b = 9; for (let k = 0; k < 34; k++) if (c[k]) { c[k]--; b = Math.min(b, shanten(c, melds.length)); c[k]++; } return b; })();
    const n = kg.type === 'concealed' ? 4 : 1;
    c[kg.kind] -= n;
    const after = shantenStd(c, melds.length + (kg.type === 'concealed' ? 1 : 0));
    c[kg.kind] += n;
    if (after <= now14 && (kg.type === 'concealed' || env.opps.every((x) => x.tenpai < 0.5))) return { type: 'kong', kind: kg.kind };
  }
  const ranked = rankDiscards(view, cfg, unseen, env);
  let choice = ranked[0];
  if (cfg.noise && cfg.rng() < cfg.noise) choice = ranked[Math.floor(cfg.rng() * Math.min(3, ranked.length))];
  return { type: 'discard', tile: pickTile(view, choice.kind) };
}

// cfg: { level, style, rng, budgetMs, mcIters }
export function decide(view, req, opts = {}) {
  const L = LEVELS[opts.level || 'sedang'];
  const S = STYLES[opts.style || 'seimbang'];
  const cfg = { ...L, styleDefense: S.defense, styleClaim: S.claim, rng: opts.rng || Math.random, budgetMs: opts.budgetMs, mcIters: opts.mcIters };
  if (req.type === 'turn') return turnDecision(view, req, cfg);
  return claimDecision(view, req, cfg);
}

// Untuk fitur petunjuk pemain.
export function adviseDiscard(view) {
  const cfg = { ...LEVELS.sulit, mc: false, rng: Math.random, styleDefense: 1, styleClaim: 1 };
  const unseen = unseenCounts(view);
  const env = envFor(view, unseen);
  return { ranked: rankDiscards(view, cfg, unseen, env), env, unseen };
}

