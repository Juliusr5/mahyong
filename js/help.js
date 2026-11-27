// Halaman Bantuan & tutorial singkat.
import { FAN, PAY_TABLE, MIN_FAN, MAX_FAN } from './scoring.js';

// Contoh tangan per pola (notasi: b bambu, p lingkaran, m karakter, z kehormatan 1-7 = T S B U Merah Hijau Putih)
const EX = {
  chicken: '123b 456p 789m 444m 55p',
  pingHu: '123b 456p 789m 234m 55p',
  allChi: '123b 456b 789p 234m 55m',
  allPong: '111b 999p 333m 555z 77p',
  mixed: '123b 456b 789b 111z 99b',
  pure: '123b 456b 789b 111b 99b',
  dragon: '555z 123b 456p 789m 11m',
  seatWind: '222z 123b 456p 789m 11m',
  roundWind: '111z 123b 456p 789m 11m',
  smallDragons: '555z 666z 77z 123b 456p',
  bigDragons: '555z 666z 777z 123b 99p',
  smallWinds: '111z 222z 333z 44z 123b',
  bigWinds: '111z 222z 333z 444z 99b',
  allHonors: '111z 222z 555z 666z 77z',
  orphans: '19b 19p 19m 12345677z',
};
const NOTE = {
  chicken: 'Tangan lengkap campuran chi & pong tanpa pola bernilai. Boleh menang, bayaran paling kecil.',
  pingHu: 'Keempat set chi, tanpa bunga/musim sama sekali, pasangan bukan naga atau angin bernilai.',
  allChi: 'Keempat set berupa urutan (chi), tapi ada bunga atau pasangan bernilai.',
  allPong: 'Keempat set berupa pong/kong.',
  mixed: 'Satu jenis angka saja ditambah kartu kehormatan.',
  pure: 'Seluruh tangan satu jenis angka, tanpa kehormatan.',
  dragon: 'Tiap pong/kong naga (Merah, Hijau, Putih).',
  seatWind: 'Pong/kong angin yang sama dengan angin kursimu.',
  roundWind: 'Pong/kong angin yang sama dengan angin putaran.',
  smallDragons: 'Dua pong naga + sepasang naga ketiga.',
  bigDragons: 'Pong ketiga naga.',
  smallWinds: 'Tiga pong angin + sepasang angin keempat.',
  bigWinds: 'Pong keempat angin (tangan batas).',
  allHonors: 'Seluruh tangan kartu kehormatan (tangan batas).',
  orphans: 'Satu dari tiap 1, 9, angin, naga + satu kembaran (tangan batas).',
  flower: 'Tiap bunga/musim bernomor sama dengan kursimu (Timur 1, Selatan 2, Barat 3, Utara 4).',
  lastTile: 'Menang dengan kartu terakhir dinding (atau buangan terakhir).',
  kongRep: 'Menang dengan kartu pengganti setelah kong.',
  robKong: 'Menang dengan kartu yang dipakai lawan untuk kong tambahan.',
};

function kindsOf(str) {
  const out = [];
  for (const grp of str.split(' ')) {
    const off = { b: 0, p: 9, m: 18, z: 27 }[grp.at(-1)];
    for (const ch of grp.slice(0, -1)) out.push(off + Number(ch) - 1);
  }
  return out;
}

export function helpHTML(tileK) {
  const ex = (s) => `<div class="help-ex">${kindsOf(s).map((k) => tileK(k)).join('')}</div>`;
  const pay = Object.entries(PAY_TABLE).map(([f, v]) => `<li><span>${f === '0' ? 'Chicken Hand' : f + ' tai'}</span><b>${v} Kecik</b></li>`).join('');
  const fans = Object.entries(FAN).map(([key, [name, fan]]) =>
    `<div class="help-fan"><span>${name}</span><b>${fan >= MAX_FAN ? 'batas (' + MAX_FAN + ')' : fan === 0 ? '0' : '+' + fan}</b></div>
     <p style="margin:2px 0;color:var(--muted)">${NOTE[key] || ''}</p>${EX[key] ? ex(EX[key]) : ''}`).join('');
  return `<h2>Bantuan</h2>
  <h3>Kartu</h3>
  <p>144 kartu: Bambu, Lingkaran, dan Karakter (angka 1–9, masing-masing 4 kartu), Angin Timur/Selatan/Barat/Utara, Naga Merah/Hijau/Putih, serta 8 bunga & musim. Huruf kecil di pojok kartu membantu membaca: angka, T/S/B/U untuk angin, M/H/P untuk naga.</p>
  ${ex('123456789b')}${ex('123456789p')}${ex('123456789m')}${ex('1234567z')}
  <h3>Giliran</h3>
  <p>Tiap pemain memegang 13 kartu (bandar 14). Pada giliranmu: ambil 1 kartu, lalu buang 1. Ketuk kartu sekali untuk memilih, ketuk lagi atau tekan <b>Buang</b> untuk membuang. Bunga/musim langsung dibuka dan diganti otomatis.</p>
  <h3>Mengambil buangan</h3>
  <p><b>Pong</b> (3 kembar) dan <b>Kong</b> (4 kembar) dari pemain mana saja. <b>Chi</b> (urutan 3 kartu sejenis) hanya dari pemain di kirimu. <b>Hu</b> dari siapa saja. Prioritas: Hu &gt; Pong/Kong &gt; Chi. Tombol hanya muncul kalau aksinya sah.</p>
  <h3>Cara menang</h3>
  <p>4 set + 1 pasang (atau Thirteen Orphans). Menang boleh dari buangan pemain mana saja. Tangan lengkap tanpa tai sama sekali tetap boleh Hu sebagai <b>Chicken Hand</b>, dibayar paling kecil (dasar ${PAY_TABLE[0]} Kecik). Makin banyak tai, makin besar bayarannya — contoh tai termudah: semua chi, pong naga, pong angin kursi/putaran, atau bunga sesuai kursi. Seven Pairs tidak berlaku di gaya Singapura.</p>
  ${ex('123b 456p 789m 555z 11m')}
  <h3>Cara bayar</h3>
  <p>Nilai dasar menurut tai (maksimal ${MAX_FAN} tai):</p>
  <ul class="fan-list">${pay}</ul>
  <p>Menang dari buangan: pembuang membayar <b>2×</b> nilai dasar, dua pemain lain masing-masing <b>1×</b>. Zimo: ketiga lawan masing-masing membayar <b>2×</b>. Seri (dinding habis): tidak ada yang membayar. Bandar tetap bandar kalau menang atau seri.</p>
  <p style="color:var(--muted)">Kecik hanya mainan — tanpa uang sungguhan.</p>
  <h3>Suara bahasa Indonesia di iPhone</h3>
  <p>Kalau suara pengumuman terdengar kaku atau berlogat Inggris, pasang suara Indonesia: buka <b>Pengaturan iPhone → Aksesibilitas → Konten Lisan → Suara → Bahasa Indonesia</b>, lalu unduh <b>Damayanti (Ditingkatkan)</b>. Tutup lalu buka lagi game ini. Pastikan tombol senyap di samping iPhone tidak aktif.</p>
  <h3>Daftar tai</h3>
  ${fans}
  <div class="modal-actions"><button class="btn" data-m="tutorial">Ulangi tutorial</button><button class="btn gold" data-m="close">Tutup</button></div>`;
}

export const TUTORIAL = [
  { pos: 'top', sel: '#hand', title: 'Kartumu', text: 'Ini 13–14 kartu di tanganmu, otomatis terurut. Ketuk sekali untuk memilih (kartu terangkat dan namanya muncul), ketuk lagi untuk membuang. Kartu di meja juga bisa diketuk untuk melihat namanya.' },
  { pos: 'bottom', sel: '.board', title: 'Meja', text: 'Buangan tiap pemain ada di depan sisinya. Kartu bertanda emas adalah buangan terakhir. Di tengah: angin putaran dan sisa dinding.' },
  { pos: 'top', sel: '#actions', title: 'Aksi', text: 'Tombol Chi, Pong, Kong, Hu, atau Lewati muncul di sini hanya saat aksi itu sah.' },
  { pos: 'bottom', sel: '#opp-2', title: 'Lawan', text: 'Tiga bot dengan gaya berbeda: Pak Agus agresif, Pak Wawan seimbang, Pak Roti hati-hati. Kapsul emas menunjukkan saldo Kecik.' },
  { pos: 'bottom', sel: '#round-info', title: 'Tujuan', text: 'Bentuk 4 set + 1 pasang — Chicken Hand (tanpa tai) pun boleh. Nyalakan Petunjuk di Pengaturan kalau butuh saran buangan. Selamat bermain!' },
];
