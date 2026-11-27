import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWall, kindOf, mulberry32, TOTAL_TILES } from '../js/tiles.js';

test('dinding berisi 144 kartu unik dengan komposisi benar', () => {
  const w = makeWall(mulberry32(1));
  assert.equal(w.length, TOTAL_TILES);
  assert.equal(new Set(w).size, 144);
  const per = {};
  for (const id of w) per[kindOf(id)] = (per[kindOf(id)] || 0) + 1;
  for (let k = 0; k < 34; k++) assert.equal(per[k], 4);
  for (let k = 34; k < 42; k++) assert.equal(per[k], 1);
});
