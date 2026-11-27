import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreHand, payments, basePay, PAY_TABLE } from '../js/scoring.js';
import { kinds } from './helpers.js';

const base = { seatWind: 1, roundWind: 0, flowers: [35] }; // kursi Selatan, bunga 2 (milik sendiri)
const sc = (h, ctx = {}) => scoreHand({ ...base, kinds: kinds(h), melds: [], ...ctx });
const keys = (r) => r.items.map((i) => i.key).sort();

test('semua chi + tertutup + bunga sendiri', () => {
  const r = sc('123b 456b 789p 234m 55m');
  assert.deepEqual(keys(r), ['allChi', 'concealed', 'flower']);
  assert.equal(r.fan, 3);
});
test('zimo tidak mendapat poin tangan tertutup', () => {
  const r = sc('123b 456b 789p 234m 55m', { selfDrawn: true });
  assert.deepEqual(keys(r), ['allChi', 'flower', 'zimo']);
});
test('semua pong + pong naga + angin kursi', () => {
  const r = sc('111b 999p 55m', { flowers: [], melds: [{ type: 'pong', kind: 31 }, { type: 'pong', kind: 28 }] });
  assert.deepEqual(keys(r), ['allPong', 'dragon', 'noFlower', 'seatWind']);
  assert.equal(r.fan, 6);
});
test('campur satu jenis dan satu jenis murni', () => {
  assert.ok(keys(sc('123b 456b 789b 111z 99b')).includes('mixed'));
  const p = sc('123b 456b 789b 111b 99b');
  assert.ok(keys(p).includes('pure'));
  assert.ok(!keys(p).includes('mixed'));
});
test('tiga naga besar, empat angin besar, batas 10 fan', () => {
  const big = sc('555z 666z 777z 123b 99b');
  assert.ok(keys(big).includes('bigDragons'));
  const winds = sc('111z 222z 333z 444z 99b');
  assert.ok(keys(winds).includes('bigWinds'));
  assert.equal(winds.fan, 10);
  assert.ok(winds.raw > 10 && winds.limit);
});
test('tiga naga kecil & empat angin kecil', () => {
  assert.ok(keys(sc('555z 666z 77z 123b 456b')).includes('smallDragons'));
  assert.ok(keys(sc('111z 222z 333z 44z 123b')).includes('smallWinds'));
});
test('tangan khusus', () => {
  assert.equal(sc('19b 19p 19m 12345677z').fan, 10);
  const sp = sc('1199b 2288b 33b 4477b');
  assert.ok(keys(sp).includes('sevenPairs') && keys(sp).includes('pure'));
  assert.equal(sp.fan, 10); // 4 + 7 + bunga = 12 -> batas 10
});
test('situasi khusus: kartu terakhir, pengganti kong, merampok kong', () => {
  const r = sc('123b 456b 789p 234m 55m', { last: true, kongRep: true, robKong: true });
  for (const k of ['lastTile', 'kongRep', 'robKong']) assert.ok(keys(r).includes(k));
});
test('bukan tangan menang -> null', () => {
  assert.equal(sc('123b 456b 789p 234m 56m'), null);
});
test('tabel bayar & pembayaran', () => {
  assert.equal(basePay(3), 8); assert.equal(basePay(10), 128); assert.equal(basePay(13), 128);
  assert.equal(Object.keys(PAY_TABLE).length, 8);
  assert.deepEqual(payments(1, null, 4), [-16, 48, -16, -16]);
  assert.deepEqual(payments(1, 3, 4), [0, 32, 0, -32]);
});
