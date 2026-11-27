// Alur satu ronde (state machine tanpa UI) + pengelola pertandingan.
// Dipakai sama oleh UI dan simulasi Node.
import { kindOf, isFlower, makeWall, countsOf } from './tiles.js';
import { scoreHand, payments, MIN_FAN } from './scoring.js';
import { shanten } from './hand.js';

export const next = (s) => (s + 1) % 4;

export class Round {
  constructor({ dealer = 0, roundWind = 0, rng = Math.random, wall = null } = {}) {
    this.rng = rng;
    this.luck = null; // { seats: [...], chance, depth } — mode Sulit: bot kadang dapat kartu terbaik
    this.dealer = dealer;
    this.roundWind = roundWind;
    this.wall = wall ? wall.slice() : makeWall(rng);
    this.hands = [[], [], [], []];
    this.melds = [[], [], [], []];
    this.flowers = [[], [], [], []];
    this.discards = [[], [], [], []]; // sungai buangan yang terlihat
    this.discardLog = []; // {seat, tile, n, claimed}
    this.log = [];
    this.phase = 'deal';
    this.turn = dealer;
    this.drawn = null;
    this.flags = {};
    this.claim = null;
    this.result = null;
    this.turnNo = 0;
    this._opts = null;
  }

  seatWind(s) { return (s - this.dealer + 4) % 4; }

  start() {
    for (let r = 0; r < 13; r++) for (let i = 0; i < 4; i++) this.hands[(this.dealer + i) % 4].push(this.wall.shift());
    this.hands[this.dealer].push(this.wall.shift());
    for (let i = 0; i < 4; i++) if (!this._replaceFlowers((this.dealer + i) % 4)) return this;
    this.turn = this.dealer;
    this.drawn = this.hands[this.dealer][13];
    this.flags = { selfDraw: true, kongRep: false, last: false };
    this.phase = 'turn';
    this._opts = null;
    return this;
  }

  _replaceFlowers(s) {
    for (;;) {
      const i = this.hands[s].findIndex((t) => isFlower(kindOf(t)));
      if (i < 0) return true;
      const f = this.hands[s].splice(i, 1)[0];
      this.flowers[s].push(f);
      this.log.push({ seat: s, type: 'flower', tile: f });
      if (!this.wall.length) { this._endDraw(); return false; }
      this.hands[s].push(this.wall.pop());
    }
  }

  _draw(s, fromBack) {
    if (!this.wall.length) { this._endDraw(); return false; }
    if (!fromBack) this._luckySwap(s);
    let t = fromBack ? this.wall.pop() : this.wall.shift();
    while (isFlower(kindOf(t))) {
      this.flowers[s].push(t);
      this.log.push({ seat: s, type: 'flower', tile: t });
      if (!this.wall.length) { this._endDraw(); return false; }
      t = this.wall.pop();
      fromBack = true;
    }
    this.hands[s].push(t);
    this.drawn = t;
    this.turn = s;
    this.flags = { selfDraw: true, kongRep: fromBack && this.flags.afterKong === true, last: this.wall.length === 0 };
    this.phase = 'turn';
    this._opts = null;
    this.log.push({ seat: s, type: 'draw' });
    return true;
  }

  // "Bot beruntung": tukar kartu teratas dinding dengan kartu terbaik bagi bot dari beberapa kartu berikutnya.
  _luckySwap(s) {
    const L = this.luck;
    if (!L || !L.seats.includes(s) || (this.rng || Math.random)() >= L.chance) return;
    const nM = this.melds[s].length;
    const c = countsOf(this.hands[s]);
    let best = -1, bestKey = Infinity;
    const n = Math.min(L.depth, this.wall.length);
    for (let i = 0; i < n; i++) {
      const k = kindOf(this.wall[i]);
      if (k >= 34) continue;
      c[k]++;
      let sh = shanten(c, nM);
      if (sh === -1) {
        const sc = this.scoreWin(s, this.wall[i], false, {}); // kartu belum di tangan
        if (!sc) sh = 0;
      }
      c[k]--;
      const key = sh * 100 + i; // shanten terkecil, lalu yang paling atas
      if (key < bestKey) { bestKey = key; best = i; }
    }
    if (best > 0) [this.wall[0], this.wall[best]] = [this.wall[best], this.wall[0]];
  }

  // Skor tangan menang (fan >= MIN_FAN); null jika tidak sah atau fan kurang.
  scoreWin(s, tile, selfDrawn, extra = {}) {
    const kinds = this.hands[s].map(kindOf);
    if (!selfDrawn) kinds.push(kindOf(tile));
    const sc = scoreHand({
      kinds, melds: this.melds[s], selfDrawn, seatWind: this.seatWind(s), roundWind: this.roundWind,
      flowers: this.flowers[s].map(kindOf), last: !!extra.last, kongRep: !!extra.kongRep, robKong: !!extra.robKong,
    });
    return sc && sc.fan >= MIN_FAN ? sc : null;
  }

  turnOptions() {
    if (this._opts) return this._opts;
    const s = this.turn;
    const o = { discard: true, tsumo: null, kongs: [] };
    if (this.flags.selfDraw) {
      o.tsumo = this.scoreWin(s, this.drawn, true, this.flags);
      if (this.wall.length) {
        const c = countsOf(this.hands[s]);
        for (let k = 0; k < 34; k++) if (c[k] === 4) o.kongs.push({ type: 'concealed', kind: k });
        for (const m of this.melds[s]) if (m.type === 'pong' && c[m.kind]) o.kongs.push({ type: 'added', kind: m.kind });
      }
    }
    return (this._opts = o);
  }

  _claimOptions(o, tile, from) {
    const k = kindOf(tile);
    const opts = {};
    const hu = this.scoreWin(o, tile, false, { last: this.wall.length === 0 });
    if (hu) opts.hu = hu;
    if (this.wall.length) {
      const n = this.hands[o].filter((t) => kindOf(t) === k).length;
      if (n >= 2) opts.pong = true;
      if (n >= 3) opts.kong = true;
      if (o === next(from) && k < 27) {
        const c = countsOf(this.hands[o]);
        const chi = [];
        for (let st = k - 2; st <= k; st++) {
          if (st < 0 || Math.floor(st / 9) !== Math.floor(k / 9) || st % 9 > 6) continue;
          if ([st, st + 1, st + 2].every((x) => x === k || c[x] > 0)) chi.push(st);
        }
        if (chi.length) opts.chi = chi;
      }
    }
    return Object.keys(opts).length ? opts : null;
  }

  // Keputusan yang sedang ditunggu: [{seat, type, options}]
  pending() {
    if (this.phase === 'turn') return [{ seat: this.turn, type: 'turn', options: this.turnOptions() }];
    if (this.phase === 'claim' || this.phase === 'robkong') {
      const out = [];
      for (const [seat, options] of this.claim.opts) {
        if (!this.claim.responses.has(seat)) out.push({ seat, type: this.phase, options });
      }
      return out;
    }
    return [];
  }

  act(seat, a) {
    if (this.phase === 'turn') {
      if (seat !== this.turn) throw new Error('Bukan giliran pemain ' + seat);
      return this._actTurn(seat, a);
    }
    if (this.phase === 'claim' || this.phase === 'robkong') {
      const opts = this.claim.opts.get(seat);
      if (!opts || this.claim.responses.has(seat)) throw new Error('Tidak ada klaim untuk ' + seat);
      if (a.type !== 'pass') {
        if (!opts[a.type]) throw new Error('Aksi tidak sah: ' + a.type);
        if (a.type === 'chi' && !opts.chi.includes(a.start)) throw new Error('Chi tidak sah');
      }
      this.claim.responses.set(seat, a);
      if (this.claim.responses.size === this.claim.opts.size) this._resolveClaims();
      return;
    }
    throw new Error('Tidak ada aksi pada fase ' + this.phase);
  }

  _actTurn(s, a) {
    const o = this.turnOptions();
    const hand = this.hands[s];
    if (a.type === 'tsumo') {
      if (!o.tsumo) throw new Error('Belum menang');
      return this._finishWin(s, null, o.tsumo, this.drawn);
    }
    if (a.type === 'kong') {
      const kg = o.kongs.find((x) => x.kind === a.kind);
      if (!kg) throw new Error('Kong tidak sah');
      if (kg.type === 'concealed') {
        const tiles = hand.filter((t) => kindOf(t) === a.kind);
        this.hands[s] = hand.filter((t) => kindOf(t) !== a.kind);
        this.melds[s].push({ type: 'kong', kind: a.kind, tiles, concealed: true, from: null });
        this.log.push({ seat: s, type: 'kong', kind: a.kind, concealed: true });
        this.flags.afterKong = true;
        return this._draw(s, true);
      }
      const tile = hand.find((t) => kindOf(t) === a.kind);
      this.hands[s] = hand.filter((t) => t !== tile);
      this._startClaim('robkong', s, tile, (p) => {
        const hu = this.scoreWin(p, tile, false, { robKong: true });
        return hu ? { hu } : null;
      });
      return;
    }
    if (a.type !== 'discard') throw new Error('Aksi tidak dikenal: ' + a.type);
    const i = hand.indexOf(a.tile);
    if (i < 0) throw new Error('Kartu tidak ada di tangan');
    hand.splice(i, 1);
    this.discards[s].push(a.tile);
    this.discardLog.push({ seat: s, tile: a.tile, n: this.turnNo++, claimed: false });
    this.log.push({ seat: s, type: 'discard', tile: a.tile });
    this.drawn = null;
    this._startClaim('claim', s, a.tile, (p) => this._claimOptions(p, a.tile, s));
  }

  _startClaim(phase, from, tile, optFn) {
    const opts = new Map();
    for (let d = 1; d < 4; d++) {
      const p = (from + d) % 4;
      const x = optFn(p);
      if (x) opts.set(p, x);
    }
    this.claim = { phase, from, tile, opts, responses: new Map() };
    this.phase = phase;
    this._opts = null;
    if (!opts.size) this._resolveClaims();
  }

  _resolveClaims() {
    const { phase, from, tile, responses } = this.claim;
    const order = [1, 2, 3].map((d) => (from + d) % 4);
    const by = (type) => order.find((p) => responses.get(p)?.type === type);
    const huSeat = by('hu');
    if (huSeat !== undefined) {
      const score = this.claim.opts.get(huSeat).hu;
      if (phase === 'claim') this._takeFromRiver(from);
      else this.log.push({ seat: from, type: 'robbed', tile });
      return this._finishWin(huSeat, from, score, tile);
    }
    const k = kindOf(tile);
    if (phase === 'robkong') {
      const m = this.melds[from].find((x) => x.type === 'pong' && x.kind === k);
      m.type = 'kong';
      m.tiles.push(tile);
      this.log.push({ seat: from, type: 'kong', kind: k, added: true });
      this.flags.afterKong = true;
      return this._draw(from, true);
    }
    const kongSeat = by('kong');
    const pongSeat = by('pong');
    const chiSeat = by('chi');
    if (kongSeat !== undefined || pongSeat !== undefined) {
      const p = kongSeat ?? pongSeat;
      const n = kongSeat !== undefined ? 3 : 2;
      const taken = this._takeTiles(p, Array(n).fill(k));
      this._takeFromRiver(from);
      this.melds[p].push({ type: n === 3 ? 'kong' : 'pong', kind: k, tiles: [...taken, tile], concealed: false, from });
      this.log.push({ seat: p, type: n === 3 ? 'kong' : 'pong', kind: k, from });
      if (n === 3) { this.flags.afterKong = true; return this._draw(p, true); }
      return this._claimedTurn(p);
    }
    if (chiSeat !== undefined) {
      const st = responses.get(chiSeat).start;
      const need = [st, st + 1, st + 2].filter((x) => x !== k);
      const taken = this._takeTiles(chiSeat, need);
      this._takeFromRiver(from);
      const tiles = [...taken, tile].sort((a, b) => kindOf(a) - kindOf(b));
      this.melds[chiSeat].push({ type: 'chi', kind: st, tiles, concealed: false, from });
      this.log.push({ seat: chiSeat, type: 'chi', kind: st, from });
      return this._claimedTurn(chiSeat);
    }
    this.claim = null;
    this.flags.afterKong = false;
    this._draw(next(from), false);
  }

  _takeTiles(p, kinds) {
    const taken = [];
    for (const k of kinds) {
      const i = this.hands[p].findIndex((t) => kindOf(t) === k);
      taken.push(this.hands[p].splice(i, 1)[0]);
    }
    return taken;
  }

  _takeFromRiver(from) {
    this.discards[from].pop();
    this.discardLog[this.discardLog.length - 1].claimed = true;
  }

  _claimedTurn(p) {
    this.claim = null;
    this.turn = p;
    this.drawn = null;
    this.flags = { selfDraw: false };
    this.phase = 'turn';
    this._opts = null;
  }

  _finishWin(seat, from, score, tile) {
    const hand = this.hands[seat].slice();
    if (from !== null) hand.push(tile);
    this.result = { type: 'win', winner: seat, from, score, hand, winTile: tile, payments: payments(seat, from, score.fan) };
    this.phase = 'end';
    this.claim = null;
    this.log.push({ seat, type: from === null ? 'tsumo' : 'hu', from, tile });
  }

  _endDraw() {
    this.result = { type: 'draw', payments: [0, 0, 0, 0] };
    this.phase = 'end';
    this.claim = null;
    this.log.push({ type: 'exhausted' });
  }

  // Simpan/muat untuk "Lanjutkan permainan".
  toJSON() {
    const o = { ...this, _opts: null };
    if (this.claim) o.claim = { ...this.claim, opts: [...this.claim.opts], responses: [...this.claim.responses] };
    return o;
  }

  static fromJSON(o) {
    const r = Object.assign(new Round({ wall: [] }), o);
    if (o.claim) r.claim = { ...o.claim, opts: new Map(o.claim.opts), responses: new Map(o.claim.responses) };
    return r;
  }

  // Data yang boleh dilihat pemain `seat` (tanpa tangan lawan dan urutan dinding).
  // peek: kursi yang tangannya boleh diintip (hanya untuk mode Sulit atas permintaan pemain).
  // nextDraws: kartu yang akan diambil `seat` berikutnya (urutan normal tanpa klaim) — hanya untuk bot pengintip.
  viewFor(seat, peek = [], wallPeek = false) {
    const at = (i) => (this.wall[i] !== undefined && kindOf(this.wall[i]) < 34 ? kindOf(this.wall[i]) : null);
    return {
      seat,
      nextDraws: wallPeek ? [at(3), at(7)] : null,
      peek: Object.fromEntries(peek.filter((p) => p !== seat).map((p) => [p, this.hands[p].slice()])),
      hand: this.hands[seat].slice(),
      drawn: this.turn === seat ? this.drawn : null,
      melds: this.melds.map((ms) => ms.map((m) => ({
        type: m.type, kind: m.kind, concealed: m.concealed, from: m.from,
        tiles: m.concealed && seat !== this.melds.indexOf(ms) ? [] : m.tiles.slice(),
      }))),
      flowers: this.flowers.map((f) => f.slice()),
      discards: this.discards.map((d) => d.slice()),
      discardLog: this.discardLog.map((d) => ({ ...d })),
      handCounts: this.hands.map((h) => h.length),
      wallCount: this.wall.length,
      dealer: this.dealer,
      roundWind: this.roundWind,
      seatWind: this.seatWind(seat),
      turn: this.turn,
      phase: this.phase,
      claimTile: this.claim ? this.claim.tile : null,
      claimFrom: this.claim ? this.claim.from : null,
    };
  }
}

// ---------- Pertandingan ----------
export function newMatch(length = 'east', startChips = 1000) {
  return { length, roundWind: 0, dealer: 0, handNo: 1, chips: [startChips, startChips, startChips, startChips], over: false };
}

export function applyResult(match, result) {
  for (let i = 0; i < 4; i++) match.chips[i] += result.payments[i];
  match.handNo++;
  if (result.type === 'win' && result.winner !== match.dealer) {
    match.dealer = next(match.dealer);
    if (match.dealer === 0) {
      match.roundWind++;
      if (match.length === 'east') match.over = true;
      match.roundWind %= 4;
    }
  }
  return match;
}
