// Mode uji tanpa tampilan: 4 bot saling bermain.
// node tools/sim.js [ronde=1000] [seed=1] [mcIters=60]
import { Round } from '../js/rules.js';
import { mulberry32 } from '../js/tiles.js';
import { decide, LEVELS } from '../js/bot/brain.js';

// Penyetelan lewat env, mis. TUNE='{"sulit":{"defense":0.5}}'
if (process.env.TUNE) for (const [l, v] of Object.entries(JSON.parse(process.env.TUNE))) Object.assign(LEVELS[l], v);

const N = Number(process.argv[2]) || 1000;
const seed = Number(process.argv[3]) || 1;
const mcIters = Number(process.argv[4]) || 60;
const rng = mulberry32(seed);
const LINEUP = ['sulit', 'sedang', 'mudah', 'sedang'];
const stats = {};
for (const l of new Set(LINEUP)) stats[l] = { seats: 0, wins: 0, zimo: 0, dealIn: 0, chips: 0, fan: 0, ms: 0, decisions: 0 };

let draws = 0;
const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const levels = LINEUP.map((_, i) => LINEUP[(i + g) % 4]); // rotasi kursi
  const r = new Round({ dealer: g % 4, roundWind: Math.floor(g / 4) % 4, rng }).start();
  let guard = 0;
  while (r.phase !== 'end') {
    const pend = r.pending();
    for (const p of pend) {
      const lv = levels[p.seat];
      const t = performance.now();
      const a = decide(r.viewFor(p.seat), p, { level: lv, rng, budgetMs: 1e9, mcIters });
      stats[lv].ms += performance.now() - t;
      stats[lv].decisions++;
      r.act(p.seat, a);
      if (r.phase === 'end') break;
    }
    if (++guard > 3000) throw new Error('macet');
  }
  const res = r.result;
  levels.forEach((lv, s) => { stats[lv].seats++; stats[lv].chips += res.payments[s]; });
  if (res.type === 'draw') draws++;
  else {
    const w = stats[levels[res.winner]];
    w.wins++; w.fan += res.score.fan;
    if (res.from === null) w.zimo++;
    else stats[levels[res.from]].dealIn++;
  }
  if ((g + 1) % 100 === 0) process.stderr.write(`${g + 1}/${N} ronde (${((Date.now() - t0) / 1000).toFixed(0)} dtk)\n`);
}

const pct = (a, b) => ((100 * a) / Math.max(1, b)).toFixed(1) + '%';
console.log(`\n${N} ronde, susunan meja ${LINEUP.join('/')} (kursi dirotasi), seri ${pct(draws, N)}\n`);
console.log('| Level | Tingkat menang | Zimo | Kena tembak | Rata-rata chip/ronde | Rata-rata fan menang | ms/keputusan |');
console.log('|---|---|---|---|---|---|---|');
for (const [l, s] of Object.entries(stats)) {
  console.log(`| ${l} | ${pct(s.wins, s.seats)} | ${pct(s.zimo, s.seats)} | ${pct(s.dealIn, s.seats)} | ${(s.chips / s.seats).toFixed(2)} | ${(s.fan / Math.max(1, s.wins)).toFixed(2)} | ${(s.ms / s.decisions).toFixed(2)} |`);
}
