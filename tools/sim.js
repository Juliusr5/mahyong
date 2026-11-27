// Mode uji tanpa tampilan: 4 bot saling bermain.
// node tools/sim.js [ronde=1000] [seed=1] [mcIters=60]
// Format duplicate: tiap dinding dimainkan 4 kali dengan susunan kursi diputar, jadi tiap level
// mendapat kartu yang sama di tiap kursi — keberuntungan saling meniadakan.
// PEEK=nama level yang boleh mengintip tangan 2 kursi lain secara acak (seperti mode Sulit di game).
// Env: LINEUP="sulit,sedang,mudah,sedang"  TUNE='{"sulit":{"defense":0.5}}' (level baru disalin dari sulit)
import { Round } from '../js/rules.js';
import { mulberry32, makeWall } from '../js/tiles.js';
import { decide, LEVELS } from '../js/bot/brain.js';

if (process.env.TUNE) for (const [l, v] of Object.entries(JSON.parse(process.env.TUNE))) LEVELS[l] = { ...(LEVELS[l] || LEVELS.sulit), ...v };

const N = Number(process.argv[2]) || 1000;
const seed = Number(process.argv[3]) || 1;
const mcIters = Number(process.argv[4]) || 60;
const wallRng = mulberry32(seed);
const rng = mulberry32(seed * 7919 + 1);
const LINEUP = (process.env.LINEUP || 'sulit,sedang,mudah,sedang').split(',');
const PEEK = process.env.PEEK || '';
// PEEKT=nama level 'pemain' yang tangannya diintip semua bot lain (meniru mode Sulit vs manusia)
const PEEKT = process.env.PEEKT || '';
const stats = {};
for (const l of new Set(LINEUP)) stats[l] = { seats: 0, wins: 0, zimo: 0, dealIn: 0, chips: 0, fan: 0, ms: 0, decisions: 0, perDeal: [] };

let draws = 0, played = 0;
const t0 = Date.now();
for (let d = 0; played < N; d++) {
  const wall = makeWall(wallRng);
  const dealer = d % 4, roundWind = Math.floor(d / 4) % 4;
  const dealSum = {};
  for (let rot = 0; rot < 4 && played < N; rot++, played++) {
    const levels = LINEUP.map((_, i) => LINEUP[(i + rot) % 4]);
    const r = new Round({ dealer, roundWind, wall, rng }).start();
    // LUCK="peluang,kedalaman": kursi yang bukan PEEKT jadi bot beruntung
    if (process.env.LUCK) { const [ch, dp] = process.env.LUCK.split(',').map(Number); r.luck = { seats: levels.map((l, i) => (l !== PEEKT ? i : -1)).filter((i) => i >= 0), chance: ch, depth: dp }; }
    let guard = 0;
    while (r.phase !== 'end') {
      for (const p of r.pending()) {
        const lv = levels[p.seat];
        const t = performance.now();
        let peek = lv === PEEK ? [1, 2, 3].map((d) => (p.seat + d) % 4).sort(() => rng() - 0.5).slice(0, 2) : [];
        if (PEEKT && lv !== PEEKT) peek = levels.map((l, i) => (l === PEEKT ? i : -1)).filter((i) => i >= 0);
        const v = r.viewFor(p.seat, peek, peek.length > 0);
        if (process.env.PEEKUNSEEN === '0') v.peekUnseen = false;
        const a = decide(v, p, { level: lv, rng, budgetMs: 1e9, mcIters });
        stats[lv].ms += performance.now() - t;
        stats[lv].decisions++;
        r.act(p.seat, a);
        if (r.phase === 'end') break;
      }
      if (++guard > 3000) throw new Error('macet');
    }
    const res = r.result;
    levels.forEach((lv, s) => {
      stats[lv].seats++; stats[lv].chips += res.payments[s];
      dealSum[lv] = (dealSum[lv] || 0) + res.payments[s];
    });
    if (res.type === 'draw') draws++;
    else {
      const w = stats[levels[res.winner]];
      w.wins++; w.fan += res.score.fan;
      if (res.from === null) w.zimo++;
      else stats[levels[res.from]].dealIn++;
    }
    if (played % 100 === 99) process.stderr.write(`${played + 1}/${N} ronde (${((Date.now() - t0) / 1000).toFixed(0)} dtk)\n`);
  }
  const per = LINEUP.reduce((m, l) => ((m[l] = (m[l] || 0) + 1), m), {});
  for (const l of Object.keys(dealSum)) stats[l].perDeal.push(dealSum[l] / (4 * per[l]));
}

const pct = (a, b) => ((100 * a) / Math.max(1, b)).toFixed(1) + '%';
const se = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1) / xs.length);
};
console.log(`\n${N} ronde (duplicate), susunan meja ${LINEUP.join('/')}, seri ${pct(draws, N)}\n`);
console.log('| Level | Tingkat menang | Zimo | Kena tembak | Rata-rata Kecik/ronde | Rata-rata fan menang | ms/keputusan |');
console.log('|---|---|---|---|---|---|---|');
for (const [l, s] of Object.entries(stats)) {
  console.log(`| ${l} | ${pct(s.wins, s.seats)} | ${pct(s.zimo, s.seats)} | ${pct(s.dealIn, s.seats)} | ${(s.chips / s.seats).toFixed(2)} ± ${se(s.perDeal).toFixed(2)} | ${(s.fan / Math.max(1, s.wins)).toFixed(2)} | ${(s.ms / s.decisions).toFixed(2)} |`);
}
