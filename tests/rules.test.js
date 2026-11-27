import test from 'node:test';
import assert from 'node:assert/strict';
import { Round, newMatch, applyResult } from '../js/rules.js';
import { mulberry32, kindOf } from '../js/tiles.js';
import { kinds, idsFor } from './helpers.js';

function allTiles(r) {
  const t = [...r.wall];
  for (let s = 0; s < 4; s++) {
    t.push(...r.hands[s], ...r.flowers[s], ...r.discards[s]);
    for (const m of r.melds[s]) t.push(...m.tiles);
  }
  if (r.phase === 'robkong') t.push(r.claim.tile);
  return t;
}

// Agen acak: pilih aksi sah secara acak.
function randomAction(p, rng) {
  const o = p.options;
  if (p.type === 'turn') {
    if (o.tsumo && rng() < 0.5) return { type: 'tsumo' };
    if (o.kongs.length && rng() < 0.5) return { type: 'kong', kind: o.kongs[0].kind };
    return null; // buang acak (diisi pemanggil)
  }
  const ch = ['pass'];
  if (o.hu) ch.push('hu');
  if (o.pong) ch.push('pong');
  if (o.kong) ch.push('kong');
  if (o.chi) ch.push('chi');
  const t = ch[Math.floor(rng() * ch.length)];
  return t === 'chi' ? { type: 'chi', start: o.chi[0] } : { type: t };
}

test('jumlah kartu tetap 144 tanpa ganda/hilang selama 300 ronde acak', () => {
  const rng = mulberry32(7);
  let wins = 0;
  for (let g = 0; g < 300; g++) {
    const r = new Round({ dealer: g % 4, rng }).start();
    let steps = 0;
    while (r.phase !== 'end') {
      const t = allTiles(r);
      assert.equal(t.length, 144);
      assert.equal(new Set(t).size, 144);
      for (const p of r.pending()) {
        if (r.phase === 'end') break;
        let a = randomAction(p, rng);
        if (!a) { const h = r.hands[p.seat]; a = { type: 'discard', tile: h[Math.floor(rng() * h.length)] }; }
        r.act(p.seat, a);
      }
      assert.ok(++steps < 2000);
    }
    if (r.result.type === 'win') wins++;
    for (let s = 0; s < 4; s++) {
      const n = r.hands[s].length + r.melds[s].length * 3;
      assert.ok(n === 13 || n === 14, 'jumlah kartu tangan ' + n);
    }
  }
  assert.ok(wins > 0);
});

// Siapkan meja: pemain 0 akan membuang `discard`.
function setup(handsStr, discardKind) {
  const used = new Set();
  const r = new Round({ dealer: 0 });
  const dTile = idsFor([discardKind], used)[0];
  r.hands = handsStr.map((h) => idsFor(kinds(h), used));
  r.hands[0].push(dTile);
  r.wall = r.wall.filter((t) => !used.has(t) && kindOf(t) < 34);
  r.phase = 'turn'; r.turn = 0; r.flags = { selfDraw: false };
  return { r, dTile };
}

test('prioritas klaim: menang > pong > chi, dan menang terdekat', () => {
  const k5b = kinds('5b')[0];
  const { r, dTile } = setup([
    '111222333p 999m 1z',
    '34b 789p 123m 456m 77z', // chi 345b, juga bisa menang dengan 5b? tidak (34b+5b=345 ok -> menang!)
    '55b 1234567m 11z 2z 3z', // pong
    '5b 678p 678m 22z 333z 4z', // tidak
  ], k5b);
  r.act(0, { type: 'discard', tile: dTile });
  const pend = new Map(r.pending().map((p) => [p.seat, p.options]));
  assert.ok(pend.get(1).hu && pend.get(1).chi);
  assert.ok(pend.get(2).pong);
  r.act(2, { type: 'pong' });
  r.act(1, { type: 'hu' });
  assert.equal(r.result.type, 'win');
  assert.equal(r.result.winner, 1);
});

test('pong mengalahkan chi', () => {
  const k5b = kinds('5b')[0];
  const { r, dTile } = setup([
    '111222333p 999m 1z',
    '34b 789p 123m 456m 67z',
    '55b 1234567m 11z 2z 3z',
    '678p 678m 22z 333z 14z',
  ], k5b);
  r.act(0, { type: 'discard', tile: dTile });
  r.act(1, { type: 'chi', start: k5b - 2 });
  r.act(2, { type: 'pong' });
  assert.equal(r.turn, 2);
  assert.equal(r.melds[2][0].type, 'pong');
  assert.equal(r.melds[1].length, 0);
});

test('dua pemain bisa menang: yang terdekat urutan giliran menang', () => {
  const k5b = kinds('5b')[0];
  const { r, dTile } = setup([
    '111222333p 999m 1z',
    '6789p 123m 456m 666z',
    '34b 789p 123m 456m 77z',
    '34b 789p 456p 789m 22z',
  ], k5b);
  r.act(0, { type: 'discard', tile: dTile });
  r.act(3, { type: 'hu' });
  r.act(2, { type: 'hu' });
  assert.equal(r.result.winner, 2);
});

test('chi hanya dari pemain di kiri', () => {
  const k5b = kinds('5b')[0];
  const { r, dTile } = setup([
    '111222333p 999m 7z',
    '1234567m 11z 2z 3z 4z 5z',
    '34b 1234567m 11z 2z 3z',
    '678p 678m 22z 666z 47z',
  ], k5b);
  r.act(0, { type: 'discard', tile: dTile });
  assert.ok(!r.pending().some((p) => p.seat === 2));
});

test('rotasi bandar dan putaran angin', () => {
  const m = newMatch('east');
  applyResult(m, { type: 'draw', payments: [0, 0, 0, 0] });
  assert.equal(m.dealer, 0);
  applyResult(m, { type: 'win', winner: 0, payments: [0, 0, 0, 0] });
  assert.equal(m.dealer, 0);
  for (let i = 1; i <= 3; i++) { applyResult(m, { type: 'win', winner: (m.dealer + 1) % 4, payments: [0, 0, 0, 0] }); assert.equal(m.dealer, i); }
  assert.ok(!m.over);
  applyResult(m, { type: 'win', winner: 1, payments: [0, 0, 0, 0] });
  assert.ok(m.over);
});

test('menang boleh dari buangan pemain di kanan (bukan hanya kiri)', () => {
  // pemain 1 (kanan dari pemain 0) membuang 5 bambu; pemain 0 menunggu 5 bambu
  const used = new Set();
  const r = new Round({ dealer: 1 });
  const k5b = kinds('5b')[0];
  const d = idsFor([k5b], used)[0];
  r.hands = [
    idsFor(kinds('34b 789p 123m 456m 77z'), used),  // 3 fan: semua chi + tertutup + tanpa bunga
    idsFor(kinds('111222333p 999m 1z'), used),
    idsFor(kinds('678p 678m 22z 666z 47z'), used),
    idsFor(kinds('1234567m 11z 2z 3z 4z 5z'), used),
  ];
  r.hands[1].push(d);
  r.wall = r.wall.filter((t) => !used.has(t) && kindOf(t) < 34);
  r.phase = 'turn'; r.turn = 1; r.flags = { selfDraw: false };
  r.act(1, { type: 'discard', tile: d });
  const mine = r.pending().find((p) => p.seat === 0);
  assert.ok(mine && mine.options.hu, 'pemain 0 harus bisa Hu dari buangan pemain kanan');
  assert.ok(!mine.options.chi, 'chi dari pemain kanan tidak boleh');
  for (const p of r.pending()) r.act(p.seat, p.seat === 0 ? { type: 'hu' } : { type: 'pass' });
  assert.equal(r.result.winner, 0);
  assert.equal(r.result.from, 1);
});

test('tangan lengkap tapi kurang dari 3 fan tidak bisa Hu (aturan Hong Kong)', () => {
  const used = new Set();
  const r = new Round({ dealer: 1 });
  const k5b = kinds('5b')[0];
  const d = idsFor([k5b], used)[0];
  r.hands = [
    idsFor(kinds('34b 789p 123m 456m 88m'), used),
    idsFor(kinds('111222333p 999m 1z'), used),
    idsFor(kinds('678p 678m 22z 666z 47z'), used),
    idsFor(kinds('1234567m 11z 2z 3z 4z 5z'), used),
  ];
  r.hands[1].push(d);
  r.flowers[0] = [136]; // punya bunga bukan miliknya -> kehilangan fan "tanpa bunga"
  used.add(136);
  r.wall = r.wall.filter((t) => !used.has(t) && kindOf(t) < 34);
  r.phase = 'turn'; r.turn = 1; r.flags = { selfDraw: false };
  r.act(1, { type: 'discard', tile: d });
  const mine = r.pending().find((p) => p.seat === 0);
  assert.ok(!mine || !mine.options.hu);
});
