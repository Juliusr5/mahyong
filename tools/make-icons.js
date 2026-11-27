// Membuat ikon PNG tanpa dependensi (rasterisasi sendiri + zlib bawaan Node).
// node tools/make-icons.js
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
function rrect(x, y, cx, cy, w, h, r) {
  const dx = Math.max(Math.abs(x - cx) - w / 2 + r, 0), dy = Math.max(Math.abs(y - cy) - h / 2 + r, 0);
  return Math.hypot(dx, dy) <= r;
}

// Koordinat normal 0..1. Ubin gading dengan satu lingkaran merah (gaya "1 lingkaran") di atas felt zamrud.
function color(u, v, pad) {
  const s = 1 - 2 * pad;
  const x = (u - pad) / s, y = (v - pad) / s;
  const d = Math.hypot(u - 0.5, v - 0.45);
  let c = mix(hex('#1a5a43'), hex('#06231a'), Math.min(1, d * 1.5));
  const tw = 0.58, th = 0.74, cx = 0.5, cy = 0.49;
  if (rrect(x, y, cx, cy + 0.045, tw, th, 0.09)) c = hex('#1f7a58');
  if (rrect(x, y, cx, cy + 0.02, tw, th, 0.09)) c = hex('#e2d3ae');
  if (rrect(x, y, cx, cy, tw, th, 0.09)) {
    c = mix(hex('#fffcf3'), hex('#efe3c6'), (y - (cy - th / 2)) / th);
    const r = Math.hypot(x - cx, y - cy);
    if (r < 0.2) c = hex('#b3261e');
    if (r < 0.15 && r > 0.12) c = hex('#fff7e6');
    if (r < 0.085) c = hex('#1d3a6e');
    if (r < 0.04) c = hex('#fff7e6');
    if (r > 0.225 && r < 0.24) c = hex('#c9a45f');
  }
  return c;
}

function render(size, pad = 0) {
  const px = Buffer.alloc(size * size * 4);
  const S = 3;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let acc = [0, 0, 0];
    for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
      const c = color((i + (a + 0.5) / S) / size, (j + (b + 0.5) / S) / size, pad);
      acc = acc.map((x, k) => x + c[k]);
    }
    const o = (j * size + i) * 4;
    px[o] = acc[0] / (S * S); px[o + 1] = acc[1] / (S * S); px[o + 2] = acc[2] / (S * S); px[o + 3] = 255;
  }
  return png(size, px);
}

const dir = new URL('../icons/', import.meta.url);
writeFileSync(new URL('apple-touch-icon.png', dir), render(180));
writeFileSync(new URL('icon-192.png', dir), render(192));
writeFileSync(new URL('icon-512.png', dir), render(512));
writeFileSync(new URL('icon-maskable-512.png', dir), render(512, 0.1));
writeFileSync(new URL('icon.svg', dir), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1a5a43"/><stop offset="1" stop-color="#06231a"/></radialGradient>
<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffcf3"/><stop offset="1" stop-color="#efe3c6"/></linearGradient></defs>
<rect width="100" height="100" rx="22" fill="url(#g)"/>
<rect x="21" y="16.5" width="58" height="74" rx="9" fill="#1f7a58"/>
<rect x="21" y="14" width="58" height="74" rx="9" fill="url(#t)"/>
<circle cx="50" cy="49" r="23.5" fill="none" stroke="#c9a45f" stroke-width="1.5"/>
<circle cx="50" cy="49" r="20" fill="#b3261e"/><circle cx="50" cy="49" r="13.5" fill="none" stroke="#fff7e6" stroke-width="3"/>
<circle cx="50" cy="49" r="8.5" fill="#1d3a6e"/><circle cx="50" cy="49" r="4" fill="#fff7e6"/>
</svg>`);
console.log('Ikon dibuat di icons/');
