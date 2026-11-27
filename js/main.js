// Pengendali permainan: menghubungkan Round, bot, UI, dan penyimpanan.
import { Round, newMatch, applyResult } from './rules.js';
import { kindOf, tileName, WIND_NAMES } from './tiles.js';
import * as UI from './ui.js';
import * as store from './storage.js';
import { decide } from './bot/brain.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SPEED = { lambat: 900, normal: 700, cepat: 450 };

let settings = store.loadSettings();
let stats = store.loadStats();
let match = null;
let round = null;
const ui = { req: null, resolve: null, selected: null, fresh: null, dealing: false, level: settings.level, marks: null };
let loopToken = 0;

// ---------- Bot ----------
// Bot berjalan di Web Worker (UI tidak macet); jatuh ke thread utama kalau worker gagal.
let worker = null;
const waiting = new Map();
let reqId = 0;
try {
  worker = new Worker(new URL('./bot/worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => { const w = waiting.get(e.data.id); if (w) { waiting.delete(e.data.id); w(e.data.action); } };
  worker.onerror = () => { worker = null; for (const w of waiting.values()) w(null); waiting.clear(); };
} catch { worker = null; }

async function botDecide(seat, req) {
  const view = round.viewFor(seat);
  const opts = { level: ui.level, style: UI.PLAYERS[seat].style, budgetMs: 300 };
  let a = null;
  if (worker) {
    const id = ++reqId;
    a = await new Promise((res) => { waiting.set(id, res); worker.postMessage({ id, view, req: { type: req.type, options: req.options }, opts }); });
  }
  return a || decide(view, req, opts);
}

// ---------- Pemain manusia ----------
function humanDecide(req) {
  ui.req = req;
  ui.selected = null;
  renderActions();
  UI.renderHand(round, ui);
  return new Promise((resolve) => { ui.resolve = resolve; });
}

function answer(action) {
  if (!ui.resolve) return;
  const r = ui.resolve;
  ui.resolve = null;
  ui.req = null;
  ui.selected = null;
  UI.setActions('');
  r(action);
}

function renderActions() {
  const req = ui.req;
  if (!req) { UI.setActions(''); return; }
  const o = req.options;
  const b = [];
  if (req.type === 'turn') {
    if (o.tsumo) b.push(`<button class="btn gold" data-a="tsumo">Hu</button>`);
    for (const k of o.kongs) b.push(`<button class="btn" data-a="kong" data-k="${k.kind}">Kong ${o.kongs.length > 1 ? UI.tileK(k.kind).replace('class="tile', 'style="--w:16px;display:inline-block;vertical-align:middle" class="tile') : ''}</button>`);
    b.push(`<button class="btn ${o.tsumo ? '' : 'gold'}" data-a="discard" ${ui.selected === null ? 'disabled' : ''}>Buang</button>`);
  } else {
    if (o.hu) b.push(`<button class="btn gold" data-a="hu">Hu</button>`);
    if (o.kong) b.push(`<button class="btn" data-a="kong">Kong</button>`);
    if (o.pong) b.push(`<button class="btn" data-a="pong">Pong</button>`);
    if (o.chi) {
      if (o.chi.length === 1) b.push(`<button class="btn" data-a="chi" data-s="${o.chi[0]}">Chi</button>`);
      else for (const s of o.chi) b.push(`<button class="btn chi-opt" data-a="chi" data-s="${s}" aria-label="Chi ${tileName(s)}">${[s, s + 1, s + 2].map((k) => UI.tileK(k)).join('')}</button>`);
    }
    b.push(`<button class="btn" data-a="pass">Lewati</button>`);
  }
  UI.setActions(b.join(''));
}

$('actions').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-a]');
  if (!btn || !ui.req) return;
  const a = btn.dataset.a;
  if (a === 'discard') { if (ui.selected !== null) answer({ type: 'discard', tile: ui.selected }); return; }
  if (a === 'kong' && ui.req.type === 'turn') return answer({ type: 'kong', kind: Number(btn.dataset.k) });
  if (a === 'chi') return answer({ type: 'chi', start: Number(btn.dataset.s) });
  answer({ type: a });
});

$('hand').addEventListener('click', (e) => {
  const btn = e.target.closest('.htile');
  if (!btn || ui.req?.type !== 'turn') return;
  const t = Number(btn.dataset.tile);
  if (ui.selected === t) return answer({ type: 'discard', tile: t });
  ui.selected = t;
  UI.renderHand(round, ui);
  renderActions();
  onSelect(t);
});

function onSelect() { /* diisi fitur petunjuk (Fase 6) */ }

// ---------- Alur ronde ----------
function persist() {
  if (!round || !match) return;
  store.save('game', { match, round: round.toJSON() });
}

function draw(extra) {
  ui.fresh = extra || null;
  UI.render(round, match, ui);
}

function freshFromLog(prevLen) {
  const ev = round.log.slice(prevLen);
  const f = {};
  for (const e of ev) {
    if (e.type === 'discard') f.discard = e.tile;
    if (e.type === 'pong' || e.type === 'chi' || e.type === 'kong') f.meld = `${e.seat}:${e.added ? round.melds[e.seat].findIndex((m) => m.kind === e.kind && m.type === 'kong') : round.melds[e.seat].length - 1}`;
  }
  return { f, ev };
}

function announce(ev) {
  for (const e of ev) {
    const who = UI.PLAYERS[e.seat]?.name;
    if (e.type === 'pong') UI.toast(`${who}: Pong!`);
    if (e.type === 'chi') UI.toast(`${who}: Chi!`);
    if (e.type === 'kong') UI.toast(`${who}: Kong!`);
    if (e.type === 'flower' && round.phase !== 'deal') UI.toast(`${who}: Bunga`, 700);
  }
}

async function runLoop() {
  const token = ++loopToken;
  const delay = () => SPEED[settings.speed] || 700;
  while (round.phase !== 'end') {
    if (token !== loopToken) return;
    const pend = round.pending();
    const prevLen = round.log.length;
    if (round.phase === 'turn') {
      const p = pend[0];
      let a;
      if (p.seat === 0) a = await humanDecide(p);
      else {
        const [act] = await Promise.all([botDecide(p.seat, p), sleep(delay())]);
        a = act;
      }
      if (token !== loopToken) return;
      round.act(p.seat, a);
    } else {
      // klaim: bot menjawab dulu, manusia memilih; hasil diterapkan setelah semua menjawab
      const acts = [];
      for (const p of pend) if (p.seat !== 0) acts.push([p.seat, await botDecide(p.seat, p)]);
      const mine = pend.find((p) => p.seat === 0);
      if (mine) acts.push([0, await humanDecide(mine)]);
      if (token !== loopToken) return;
      if (acts.some(([, a]) => a.type !== 'pass') && !mine) await sleep(delay() * 0.6);
      for (const [s, a] of acts) round.act(s, a);
    }
    const { f, ev } = freshFromLog(prevLen);
    announce(ev);
    draw(f);
    persist();
    if (round.phase === 'claim' || round.phase === 'robkong') continue;
    if (ev.some((e) => e.type === 'discard') && round.phase === 'turn' && round.turn !== 0) await sleep(delay() * 0.35);
  }
  if (token === loopToken) finishRound();
}

function finishRound() {
  const res = round.result;
  applyResult(match, res);
  // statistik
  stats.rounds++;
  if (res.type === 'win') {
    if (res.winner === 0) {
      stats.wins++;
      if (res.from === null) stats.zimo++;
      if (!stats.best || res.score.fan > stats.best.fan) stats.best = { fan: res.score.fan, items: res.score.items.map((i) => i.name), hand: res.hand.map(kindOf) };
    }
    if (res.from === 0) stats.dealtIn++;
  }
  stats.maxChips = Math.max(stats.maxChips, match.chips[0]);
  store.save('stats', stats);
  store.save('chips', match.chips[0]);
  showResult(res);
  store.save('game', { match, round: null });
}

function showResult(res) {
  const names = UI.PLAYERS.map((p) => p.name);
  let html = '';
  if (res.type === 'draw') {
    html += `<h2 class="res-title">Seri</h2><p class="res-sub">Dinding habis. Tidak ada yang membayar.</p>`;
  } else {
    const w = res.winner;
    html += `<h2 class="res-title glow">${w === 0 ? 'Kamu menang!' : names[w] + ' menang'}</h2>`;
    html += `<p class="res-sub">${res.from === null ? 'Zimo — ambil sendiri' : 'Dari buangan ' + names[res.from]}</p>`;
    const melds = round.melds[w].map((m) => `<div class="meld">${(m.concealed ? [m.kind, m.kind, m.kind, m.kind] : m.tiles.map(kindOf)).map((k) => UI.tileK(k)).join('')}</div>`).join('');
    const hand = res.hand.filter((t) => t !== res.winTile).sort((a, b) => kindOf(a) - kindOf(b)).map((t) => UI.tile(t)).join('');
    html += `<div class="res-hand">${melds}<div class="meld">${hand}</div><div class="meld">${UI.tile(res.winTile, 'wait')}</div></div>`;
    html += `<ul class="fan-list">${res.score.items.map((i) => `<li><span>${i.name}</span><b>+${i.fan}</b></li>`).join('')}</ul>`;
    html += `<div class="fan-total"><span>Total${res.score.limit ? ' (batas maksimal)' : ''}</span><span>${res.score.fan} fan</span></div>`;
  }
  html += `<div class="rule"></div><div class="pay-grid">` + res.payments.map((p, s) =>
    `<span>${names[s]}</span><span class="${p > 0 ? 'plus' : p < 0 ? 'minus' : 'zero'}">${p > 0 ? '+' : ''}${p}</span><span class="bal">${match.chips[s]}</span>`).join('') + `</div>`;
  if (match.over) {
    const rank = [0, 1, 2, 3].sort((a, b) => match.chips[b] - match.chips[a]);
    html += `<div class="rule"></div><h3 style="text-align:center">Putaran selesai</h3><ol>${rank.map((s) => `<li>${names[s]} — ${match.chips[s]} chip</li>`).join('')}</ol>`;
  }
  html += `<div class="modal-actions">
    <button class="btn" data-m="menu">Menu</button>
    <button class="btn gold" data-m="${match.over ? 'newmatch' : 'next'}">${match.over ? 'Main lagi' : 'Ronde berikutnya'}</button></div>`;
  UI.showModal(html);
}

function startRound() {
  // bot yang bangkrut diisi ulang diam-diam; manusia memakai tombol isi ulang
  for (let s = 1; s < 4; s++) if (match.chips[s] <= 0) match.chips[s] = 1000;
  round = new Round({ dealer: match.dealer, roundWind: match.roundWind }).start();
  ui.dealing = true;
  draw();
  ui.dealing = false;
  persist();
  setTimeout(runLoop, 600);
}

function startMatch() {
  const chips = store.load('chips', 1000);
  if (chips <= 0) { refillPrompt(); return; }
  match = newMatch(settings.length);
  match.chips[0] = chips;
  ui.level = settings.level;
  match.level = settings.level;
  UI.showScreen('screen-game');
  startRound();
}

function resume() {
  const g = store.load('game', null);
  if (!g || !g.round) return startMatch();
  match = g.match;
  round = Round.fromJSON(g.round);
  ui.level = match.level || settings.level;
  UI.showScreen('screen-game');
  draw();
  runLoop();
}

function toMenu() {
  loopToken++;
  if (ui.resolve) { ui.resolve = null; ui.req = null; }
  UI.closeModal();
  UI.showScreen('screen-menu');
  refreshMenu();
}

function refreshMenu() {
  const g = store.load('game', null);
  $('btn-continue').hidden = !(g && g.round);
  const chips = store.load('chips', 1000);
  $('menu-chip-count').textContent = chips;
  $('btn-refill').hidden = chips > 0;
}

function refillPrompt() {
  UI.showModal(`<h2>Chip habis</h2><p style="text-align:center">Isi ulang ke 1000 chip mainan? (Gratis — tanpa uang sungguhan.)</p>
    <div class="modal-actions"><button class="btn" data-m="close">Batal</button><button class="btn gold" data-m="refill">Isi ulang chip</button></div>`);
}

// ---------- Modal & menu ----------
$('modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  const m = b.dataset.m;
  if (m === 'close') return UI.closeModal();
  if (m === 'menu') return toMenu();
  if (m === 'next') { UI.closeModal(); return startRound(); }
  if (m === 'newmatch') { UI.closeModal(); return startMatch(); }
  if (m === 'refill') { store.save('chips', 1000); UI.closeModal(); refreshMenu(); UI.toast('Chip diisi ulang'); }
  if (m === 'quit') { store.save('game', { match, round: round?.phase === 'end' ? null : round?.toJSON() }); toMenu(); }
});

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'play') {
    const g = store.load('game', null);
    if (g && g.round) {
      UI.showModal(`<h2>Mulai baru?</h2><p style="text-align:center">Ronde yang belum selesai akan hilang.</p>
        <div class="modal-actions"><button class="btn" data-m="close">Batal</button><button class="btn gold" data-m="newmatch">Mulai baru</button></div>`);
    } else startMatch();
  }
  if (a === 'continue') resume();
  if (a === 'refill') refillPrompt();
  if (a === 'menu') {
    UI.showModal(`<h2>Jeda</h2><div class="modal-actions" style="flex-direction:column">
      <button class="btn gold" data-m="close">Kembali ke meja</button>
      <button class="btn" data-m="quit">Simpan & ke menu</button></div>`);
  }
  if (a === 'log') {
    const items = round ? round.log.map(UI.formatLog).filter(Boolean).reverse() : [];
    UI.showModal(`<h2>Riwayat ronde</h2><ul class="log-list">${items.map((i) => `<li>${i}</li>`).join('') || '<li>Belum ada aksi.</li>'}</ul>
      <div class="modal-actions"><button class="btn" data-m="close">Tutup</button></div>`);
  }
  if (a === 'settings') showSettings();
  if (a === 'stats') showStats();
  if (a === 'help') UI.showModal(`<h2>Bantuan</h2><p>Segera hadir.</p><div class="modal-actions"><button class="btn" data-m="close">Tutup</button></div>`);
});

function seg(key, opts) {
  return `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

function showSettings() {
  UI.showModal(`<h2>Pengaturan</h2>
    <div class="field"><span>Kesulitan</span>${seg('level', [['mudah', 'Mudah'], ['sedang', 'Sedang'], ['sulit', 'Sulit']])}</div>
    <div class="field"><span>Panjang</span>${seg('length', [['east', '1 putaran'], ['endless', 'Terus']])}</div>
    <div class="field"><span>Kecepatan bot</span>${seg('speed', [['lambat', 'Lambat'], ['normal', 'Normal'], ['cepat', 'Cepat']])}</div>
    <div class="field"><span>Suara</span>${seg('sound', [[true, 'Nyala'], [false, 'Mati']])}</div>
    <div class="field"><span>Getar</span>${seg('haptics', [[true, 'Nyala'], [false, 'Mati']])}</div>
    <div class="field"><span>Petunjuk</span>${seg('hints', [[true, 'Nyala'], [false, 'Mati']])}</div>
    <p style="font-size:12px;color:var(--muted)">Kesulitan dan panjang berlaku untuk permainan baru.</p>
    <div class="modal-actions"><button class="btn gold" data-m="close">Selesai</button></div>`);
}

$('modal').addEventListener('click', (e) => {
  const b = e.target.closest('.seg button');
  if (!b) return;
  const key = b.parentElement.dataset.key;
  let v = b.dataset.v;
  if (v === 'true' || v === 'false') v = v === 'true';
  settings[key] = v;
  store.save('settings', settings);
  b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
});

function showStats() {
  const rate = stats.rounds ? Math.round((stats.wins / stats.rounds) * 100) : 0;
  const best = stats.best ? `<div class="res-hand">${stats.best.hand.map((k) => UI.tileK(k)).join('')}</div><p style="text-align:center">${stats.best.fan} fan — ${stats.best.items.join(', ')}</p>` : '<p style="text-align:center;color:var(--muted)">Belum ada.</p>';
  UI.showModal(`<h2>Statistik</h2>
    <div class="stats-grid">
      <div class="stat"><b>${stats.rounds}</b><span>Ronde dimainkan</span></div>
      <div class="stat"><b>${rate}%</b><span>Tingkat menang</span></div>
      <div class="stat"><b>${stats.zimo}</b><span>Menang zimo</span></div>
      <div class="stat"><b>${stats.maxChips}</b><span>Chip tertinggi</span></div>
    </div>
    <h3>Tangan terbaik</h3>${best}
    <div class="modal-actions"><button class="btn gold" data-m="close">Tutup</button></div>`);
}

// ---------- Mulai ----------
UI.initArt();
refreshMenu();
window.__mj = { get round() { return round; }, get match() { return match; }, WIND_NAMES };
