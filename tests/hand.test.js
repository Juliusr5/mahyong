import test from 'node:test';
import assert from 'node:assert/strict';
import { isWinningShape, isSevenPairs, isThirteenOrphans, shanten, shantenStd, decompositions } from '../js/hand.js';
import { counts } from './helpers.js';

test('tangan standar menang', () => {
  assert.ok(isWinningShape(counts('123b 456b 789p 111m 55z'), 0));
  assert.ok(isWinningShape(counts('11122233344455b'), 0));
  assert.ok(isWinningShape(counts('123p 55z'), 3)); // 3 set terbuka
});
test('hampir menang tapi tidak sah', () => {
  assert.ok(!isWinningShape(counts('123b 456b 789p 111m 56z'), 0));
  assert.ok(!isWinningShape(counts('123b 456b 789p 13m 555z'), 0)); // tanpa pasangan
  assert.ok(!isWinningShape(counts('891b 456b 789p 111m 55z'), 0)); // 8-9-1 bukan urutan
  assert.ok(!isWinningShape(counts('123b 456b 789p 111m 5z'), 0)); // 13 kartu
  assert.ok(!isWinningShape(counts('789b 123p 456m 55z'), 2)); // jumlah kartu salah untuk 2 set terbuka
});
test('seven pairs', () => {
  assert.ok(isSevenPairs(counts('1199b 2288p 33m 1177z')));
  assert.ok(!isWinningShape(counts('1199b 2288p 33m 1177z'), 0)); // gaya Singapura: tidak sah
  assert.ok(!isSevenPairs(counts('1111b 2288p 33m 1177z')));
  assert.ok(!isWinningShape(counts('1199b 2288p 33m 1177z'), 1));
});
test('thirteen orphans', () => {
  assert.ok(isThirteenOrphans(counts('19b 19p 19m 12345677z')));
  assert.ok(isWinningShape(counts('19b 19p 19m 12345677z'), 0));
  assert.ok(!isThirteenOrphans(counts('19b 19p 19m 12345668z'.replace('8', '6'))));
  assert.ok(!isThirteenOrphans(counts('19b 19p 29m 12345677z')));
});
test('shanten', () => {
  assert.equal(shanten(counts('123b 456b 789p 111m 55z'), 0), -1);
  assert.equal(shanten(counts('123b 456b 789p 111m 5z'), 0), 0);
  assert.equal(shanten(counts('123b 456b 789p 11m 57z'), 0), 1);
  assert.equal(shanten(counts('19b 19p 19m 1234567z'), 0), 0);

  assert.equal(shantenStd(counts('123p 5z'), 3), 0);
  assert.equal(shantenStd(counts('123b 456b 789p 111m 5z'), 0, { noChi: true }) > 0, true);
});
test('dekomposisi ganda ditemukan', () => {
  assert.ok(decompositions(counts('111222333b 456p 99m'), 4).length >= 2);
});
