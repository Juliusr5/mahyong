import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreHand, payments, basePay, PAY_TABLE, MIN_FAN, MAX_FAN } from '../js/scoring.js';
import { kinds } from './helpers.js';

const base = { seatWind: 1, roundWind: 0, flowers: [35] }; // kursi Selatan, bunga 2 (milik sendiri)
const sc = (h, ctx = {}) => scoreHand({ ...base, kinds: kinds(h), melds: [], ...ctx });
const keys = (r) => r.items.map((i) => i.key).sort();

test('aturan dasar Singapura: minimal 1 tai, batas 5 tai', () => {
  assert.equal(MIN_FAN, 1);
  assert.equal(MAX_FAN, 5);
});
test('semua chi + bunga sendiri', () => {
  const r = sc('123b 456b 789p 234m 55m');
  assert.deepEqual(keys(r), ['allChi', 'flower']);
  assert.equal(r.fan, 2);
});
test('ping hu: semua chi tanpa bunga dan pasangan biasa = 4 tai', () => {
  const r = sc('123b 456b 789p 234m 55m', { flowers: [] });
  assert.deepEqual(keys(r), ['pingHu']);
  assert.equal(r.fan, 4);
  assert.ok(!keys(sc('123b 456b 789p 234m 55z', { flowers: [] })).includes('pingHu')); // pasangan naga
});
test('zimo tidak menambah tai', () => {
  assert.deepEqual(keys(sc('123b 456b 789p 234m 55m', { selfDrawn: true })), ['allChi', 'flower']);
});
test('semua pong + pong naga + angin kursi', () => {
  const r = sc('111b 999p 55m', { flowers: [], melds: [{ type: 'pong', kind: 31 }, { type: 'pong', kind: 28 }] });
  assert.deepEqual(keys(r), ['allPong', 'dragon', 'seatWind']);
  assert.equal(r.fan, 4);
});
test('campur satu jenis 2 tai, satu jenis murni 4 tai', () => {
  const m = sc('123b 456b 789b 111z 99b');
  assert.ok(keys(m).includes('mixed'));
  const p = sc('123b 456b 789b 111b 99b');
  assert.ok(keys(p).includes('pure') && !keys(p).includes('mixed'));
});
test('tangan batas & tiga naga kecil', () => {
  assert.ok(keys(sc('555z 666z 77z 123b 456b')).includes('smallDragons'));
  const big = sc('555z 666z 777z 123b 99b');
  assert.equal(big.fan, 5);
  assert.ok(big.limit);
  assert.equal(sc('19b 19p 19m 12345677z').fan, 5);
  assert.equal(sc('111z 222z 333z 444z 99b').fan, 5);
});
test('situasi khusus: kartu terakhir, pengganti kong, merampok kong', () => {
  const r = sc('123b 456b 789p 234m 55m', { last: true, kongRep: true, robKong: true });
  for (const k of ['lastTile', 'kongRep', 'robKong']) assert.ok(keys(r).includes(k));
});
test('Seven Pairs dan tangan tidak lengkap -> null', () => {
  assert.equal(sc('1199b 2288p 33m 1177z'), null);
  assert.equal(sc('123b 456b 789p 234m 56m'), null);
});
test('tangan lengkap tanpa pola bernilai 0 tai', () => {
  assert.equal(sc('123b 456b 789p 444m 55m', { flowers: [34] }).fan, 0);
});
test('tabel bayar & pembayaran gaya Singapura', () => {
  assert.equal(basePay(1), 4); assert.equal(basePay(5), 64); assert.equal(basePay(8), 64);
  assert.equal(Object.keys(PAY_TABLE).length, 5);
  // zimo: tiap lawan bayar 2x
  assert.deepEqual(payments(1, null, 2), [-16, 48, -16, -16]);
  // dari buangan: pembuang 2x, lainnya 1x
  assert.deepEqual(payments(1, 3, 2), [-8, 32, -8, -16]);
});
