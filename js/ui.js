// Tampilan: render meja, modal, toast. Tidak memegang logika permainan.
import { kindOf, tileName, sortTiles, WIND_NAMES } from './tiles.js';
import { avatarSVG, chipSVG, buildSprite } from './art.js';

export const PLAYERS = [
  { key: 'you', name: 'Kamu', mono: 'K', c1: '#2c7a5c', c2: '#0c3a2a', motif: 'you' },
  { key: 'roti', name: 'Pak Roti', mono: 'R', c1: '#8c2a25', c2: '#3d0d0b', motif: 'wave', style: 'hati-hati' },
  { key: 'wawan', name: 'Pak Wawan', mono: 'W', c1: '#5a3d86', c2: '#1f1236', motif: 'plum', style: 'seimbang' },
  { key: 'agus', name: 'Pak Agus', mono: 'A', c1: '#1f5a86', c2: '#0b2136', motif: 'crane', style: 'agresif' },
];
const WIND_CH = '東南西北';
const $ = (id) => document.getElementById(id);

// Saldo Kecik: kapsul gelap bergaris emas dengan koin.
export const fmt = (n) => Number(n).toLocaleString('id-ID');
export const purse = (n, cls = '') => `<span class="purse ${cls} ${n < 0 ? 'neg' : ''}" aria-label="${fmt(n)} Kecik"><span class="coin">${chipSVG()}</span><b>${fmt(n)}</b></span>`;

export function initArt() {
  $('sprite').innerHTML = buildSprite();
  document.querySelectorAll('.chip-icon').forEach((e) => (e.innerHTML = chipSVG()));
  $('screen-menu').querySelector('.menu-tiles').innerHTML = [31, 9, 32, 27].map((k) => tileK(k)).join('');
}

export function tileK(k, cls = '', attrs = '') {
  return `<div class="tile ${cls}" ${attrs} title="${tileName(k)}"><svg aria-hidden="true"><use href="#tk${k}"/></svg></div>`;
}
export const tile = (id, cls = '') => tileK(kindOf(id), cls);
export const back = (cls = '') => `<div class="tile back ${cls}"></div>`;

function meldHTML(m, fresh) {
  const cls = fresh ? 'flip' : '';
  if (m.type === 'kong' && m.concealed) return `<div class="meld">${back(cls)}${tileK(m.kind, cls)}${tileK(m.kind, cls)}${back(cls)}</div>`;
  const ks = m.tiles.map(kindOf);
  return `<div class="meld">${ks.map((k) => tileK(k, cls)).join('')}</div>`;
}

function badges(r, s) {
  let b = `<span class="badge" title="Angin kursi ${WIND_NAMES[r.seatWind(s)]}">${WIND_CH[r.seatWind(s)]}</span>`;
  if (s === r.dealer) b += `<span class="badge dealer" title="Bandar">庄</span>`;
  return b;
}

function pinfo(r, match, s) {
  const p = PLAYERS[s];
  const turn = r.phase === 'turn' && r.turn === s;
  return `<div class="pinfo">
    <div class="avatar ${turn ? 'turn' : ''}" data-seat="${s}">${avatarSVG(p)}${badges(r, s)}</div>
    <div class="names"><div class="pname">${p.name}</div>${purse(match.chips[s])}</div>
  </div>`;
}

export function render(r, match, ui) {
  // info atas
  $('round-info').innerHTML = `<b>Putaran ${WIND_NAMES[r.roundWind]}</b><br>Ronde ${match.handNo} · ${levelName(ui.level)}`;
  // lawan
  for (const s of [1, 2, 3]) {
    const melds = r.melds[s].map((m, i) => meldHTML(m, ui.fresh?.meld === `${s}:${i}`)).join('');
    const fl = r.flowers[s].map((t) => tile(t)).join('');
    const side = s !== 2;
    const backs = `<div class="backs" title="${r.hands[s].length} kartu">${r.hands[s].map(() => side ? `<span class="rot">${back()}</span>` : back()).join('')}</div>`;
    $('opp-' + s).innerHTML = pinfo(r, match, s) + backs +
      (fl ? `<div class="flowers">${fl}</div>` : '') +
      `<div class="omelds">${melds}</div>`;
  }
  // sungai buangan
  const lastD = r.discardLog.at(-1);
  for (let s = 0; s < 4; s++) {
    $('river-' + s).innerHTML = r.discards[s].map((t) => {
      let cls = '';
      if (lastD && !lastD.claimed && lastD.tile === t) cls = 'last-discard' + (ui.fresh?.discard === t ? ' fresh' : '');
      const h = tile(t, cls);
      return s === 1 || s === 3 ? `<span class="rot">${h}</span>` : h;
    }).join('');
    $('river-' + s).classList.toggle('active', r.phase === 'turn' && r.turn === s);
  }
  // tengah
  // buangan terakhir ditampilkan besar di tengah agar mudah dibaca
  const big = lastD && !lastD.claimed && r.phase !== 'end'
    ? `<div class="big-discard">${tile(lastD.tile, ui.fresh?.discard === lastD.tile ? 'fresh' : '')}</div>
       <div class="big-cap"><b>${tileName(kindOf(lastD.tile))}</b><br>dari ${PLAYERS[lastD.seat].name}</div>`
    : `<div class="wind-disc"><div><span>Putaran</span><br><b>${WIND_CH[r.roundWind]}</b></div></div>`;
  $('center').innerHTML = big + `<div class="wall-count">${WIND_CH[r.roundWind]} · sisa <b>${r.wall.length}</b></div>`;
  // saya
  const fl0 = r.flowers[0].map((t) => tile(t)).join('');
  $('me-info').innerHTML = `<div class="avatar ${r.phase === 'turn' && r.turn === 0 ? 'turn' : ''}" data-seat="0">${avatarSVG(PLAYERS[0])}</div>
    <span>Angin kursi <b>${WIND_NAMES[r.seatWind(0)]}</b>${r.dealer === 0 ? ' · <b style="color:#f0b0a8">Bandar</b>' : ''}</span>
    <span class="grow"></span>${purse(match.chips[0], 'lg')}`;
  $('me-melds').innerHTML = r.melds[0].map((m, i) => meldHTML(m, ui.fresh?.meld === `0:${i}`)).join('') +
    (fl0 ? `<div class="flowers" style="--w:16px">${fl0}</div>` : '');
  renderHand(r, ui);
}

export function renderHand(r, ui) {
  const hand = r.hands[0];
  const drawn = r.phase === 'turn' && r.turn === 0 && r.drawn !== null && hand.includes(r.drawn) ? r.drawn : null;
  const rest = sortTiles(hand.filter((t) => t !== drawn));
  const list = drawn !== null ? [...rest, drawn] : rest;
  const canPick = ui.req?.type === 'turn';
  $('hand').innerHTML = list.map((t, i) => {
    const cls = ['htile'];
    if (t === ui.selected) cls.push('sel');
    if (t === drawn) cls.push('drawn');
    const tc = [ui.dealing ? 'deal' : '', ui.marks?.[t] || ''].join(' ');
    const style = ui.dealing ? ` style="animation-delay:${i * 35}ms"` : '';
    return `<button class="${cls.join(' ')}" data-tile="${t}" ${canPick ? '' : 'disabled'} aria-label="${tileName(kindOf(t))}">` +
      tile(t, tc).replace('<div class="tile', `<div${style} class="tile`) + '</button>';
  }).join('');
}

export function setActions(html) { $('actions').innerHTML = html; }
export function setHint(text) {
  const el = $('hint-bar');
  el.hidden = !text;
  el.innerHTML = text || '';
}

export function levelName(l) { return { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' }[l] || l; }

export function showModal(html) {
  $('modal-body').innerHTML = html;
  $('modal').hidden = false;
  $('modal').querySelector('.modal-card').scrollTop = 0;
}
export function closeModal() { $('modal').classList.remove('tut'); $('modal').style.alignItems = ''; document.querySelectorAll('.spot').forEach((e) => e.classList.remove('spot')); $('modal').hidden = true; $('modal-body').innerHTML = ''; }
export const modalOpen = () => !$('modal').hidden;

let toastTimer;
export function toast(msg, ms = 1100) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

const name = (s) => PLAYERS[s].name;
export function formatLog(e) {
  switch (e.type) {
    case 'discard': return `<b>${name(e.seat)}</b> membuang ${tileName(kindOf(e.tile))}`;
    case 'flower': return `<b>${name(e.seat)}</b> membuka ${tileName(kindOf(e.tile))}`;
    case 'pong': return `<b>${name(e.seat)}</b> pong ${tileName(e.kind)}`;
    case 'chi': return `<b>${name(e.seat)}</b> chi ${tileName(e.kind)}–${tileName(e.kind + 2).split(' ')[0]}`;
    case 'kong': return `<b>${name(e.seat)}</b> kong ${e.concealed ? 'tertutup ' : e.added ? 'tambahan ' : ''}${tileName(e.kind)}`;
    case 'tsumo': return `<b>${name(e.seat)}</b> menang zimo!`;
    case 'hu': return `<b>${name(e.seat)}</b> menang dari buangan ${name(e.from)}!`;
    case 'robbed': return `Kong <b>${name(e.seat)}</b> dirampok`;
    case 'exhausted': return 'Dinding habis — seri';
    default: return null;
  }
}

export function chipHTML(label) { return chipSVG(label); }
