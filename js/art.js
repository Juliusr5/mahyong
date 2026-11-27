// Gambar kartu, avatar, dan chip — semua SVG buatan sendiri, gaya kartu tradisional.
const RED = '#d0352b', GREEN = '#2d7a4b', NAVY = '#1f2c6b';
const CJK = `font-family="'Songti SC','STSong','Noto Serif CJK SC','Source Han Serif SC','SimSun',serif" font-weight="700"`;
const NUMS = ['一', '二', '三', '四', '伍', '六', '七', '八', '九'];

// Lingkaran bercincin konsentris
function dot(x, y, r, col) {
  return `<circle cx="${x}" cy="${y}" r="${r * 0.92}" fill="#fff" stroke="${col}" stroke-width="${r * 0.16}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="${col}" stroke-width="${r * 0.13}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.34}" fill="none" stroke="${col}" stroke-width="${r * 0.12}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.12}" fill="${col}"/>`;
}
function bigDot() {
  return `<circle cx="30" cy="40" r="22" fill="#fff" stroke="${NAVY}" stroke-width="2.4" stroke-dasharray="3.2 1.6"/>` +
    `<circle cx="30" cy="40" r="18.5" fill="none" stroke="${GREEN}" stroke-width="2.2"/>` +
    `<circle cx="30" cy="40" r="15" fill="none" stroke="${GREEN}" stroke-width="1.2"/>` +
    `<circle cx="30" cy="40" r="11" fill="none" stroke="${RED}" stroke-width="2.6"/>` +
    `<circle cx="30" cy="40" r="6.5" fill="none" stroke="${RED}" stroke-width="1.4"/>` +
    `<circle cx="30" cy="40" r="2.6" fill="${NAVY}"/>`;
}

const DOTS = {
  2: [[30, 22, 11, GREEN], [30, 58, 11, NAVY]],
  3: [[15, 15, 9, GREEN], [30, 40, 9, RED], [45, 65, 9, NAVY]],
  4: [[18, 22, 10, NAVY], [42, 22, 10, GREEN], [18, 58, 10, GREEN], [42, 58, 10, NAVY]],
  5: [[16, 17, 9, NAVY], [44, 17, 9, GREEN], [30, 40, 9, RED], [16, 63, 9, GREEN], [44, 63, 9, NAVY]],
  6: [[18, 14, 8, GREEN], [42, 14, 8, GREEN], [18, 42, 8.5, RED], [42, 42, 8.5, RED], [18, 64, 8.5, RED], [42, 64, 8.5, RED]],
  7: [[13, 11, 6.5, GREEN], [30, 18, 6.5, GREEN], [47, 25, 6.5, GREEN], [18, 46, 7.5, RED], [42, 46, 7.5, RED], [18, 66, 7.5, RED], [42, 66, 7.5, RED]],
  8: [12, 31, 50, 69].flatMap((y) => [[19, y, 8, NAVY], [41, y, 8, NAVY]]),
  9: [15, 40, 65].flatMap((y, i) => [14, 30, 46].map((x) => [x, y, 7.8, [GREEN, RED, NAVY][i]])),
};

// Batang bambu bergaris dengan buku di tengah
function stick(x, y, h, col, ang = 0) {
  const w = 6.4, hh = h / 2;
  const seg = (yy) => `<rect x="${x - w / 2}" y="${yy}" width="${w}" height="${hh - 0.9}" rx="${w / 2}" fill="#fff" stroke="${col}" stroke-width="1.9"/>`;
  return `<g transform="rotate(${ang} ${x} ${y + h / 2})">${seg(y)}${seg(y + hh + 0.9)}` +
    `<line x1="${x}" y1="${y + 2.5}" x2="${x}" y2="${y + h - 2.5}" stroke="${col}" stroke-width=".9"/></g>`;
}

function bamboo(n) {
  const S = [];
  const col = (x, ys, h, c) => ys.forEach((y) => S.push(stick(x, y, h, c)));
  switch (n) {
    case 1: // burung bergaya (desain sendiri)
      return `<path d="M28 68 C16 60 13 45 20 33 C24 26 33 24 37 30 C42 38 39 50 30 57" fill="#fff" stroke="${GREEN}" stroke-width="2.2"/>` +
        `<path d="M22 44 C26 40 30 40 33 45 M21 52 C25 48 29 48 31 53" stroke="${GREEN}" stroke-width="1.6" fill="none"/>` +
        `<path d="M29 57 C35 64 44 66 51 61 M30 60 C33 70 40 74 46 73" stroke="${RED}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
        `<circle cx="33" cy="21" r="6.5" fill="#fff" stroke="${RED}" stroke-width="2.2"/><path d="M39 20 l7 -1.5 l-6 4.5z" fill="${NAVY}"/>` +
        `<path d="M30 15 l-2 -6 l4 4 l1 -6 l2 6" stroke="${RED}" stroke-width="1.5" fill="none"/>` +
        `<circle cx="34.5" cy="20" r="1.6" fill="${NAVY}"/>` +
        `<path d="M10 64 L22 60 M12 70 L24 64" stroke="${NAVY}" stroke-width="1.6"/>`;
    case 2: col(30, [7, 43], 30, GREEN); break;
    case 3: col(30, [7], 30, GREEN); col(17, [43], 30, GREEN); col(43, [43], 30, GREEN); break;
    case 4: [17, 43].forEach((x) => col(x, [7, 43], 30, GREEN)); break;
    case 5: [13, 47].forEach((x) => col(x, [7, 43], 30, GREEN)); col(30, [25], 30, RED); break;
    case 6: [13, 30, 47].forEach((x) => col(x, [7, 43], 30, GREEN)); break;
    case 7: col(30, [4], 22, RED); [13, 30, 47].forEach((x) => col(x, [30, 55], 22, GREEN)); break;
    case 8: // atas "W", bawah "M"
      [13, 24, 36, 47].forEach((x, i) => S.push(stick(x, 6, 30, GREEN, i % 2 ? -16 : 16)));
      [13, 24, 36, 47].forEach((x, i) => S.push(stick(x, 44, 30, GREEN, i % 2 ? 16 : -16)));
      break;
    case 9: [13, 30, 47].forEach((x, i) => col(x, [4, 29, 54], 22, i === 1 ? RED : GREEN)); break;
  }
  return S.join('');
}

function text(t, x, y, size, col, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${col}" text-anchor="middle" dominant-baseline="central" ${CJK} ${extra}>${t}</text>`;
}

// Bunga/musim: tangkai, daun, kelopak (desain sendiri)
function blossom(f) {
  const petal = [RED, RED, RED, RED, RED, RED, RED, GREEN][f];
  const cx = 30, cy = 46;
  const petals = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="${cx}" cy="${cy - 7}" rx="4.6" ry="6.5" fill="#fff" stroke="${petal}" stroke-width="1.8" transform="rotate(${a + f * 9} ${cx} ${cy})"/>`).join('');
  return `<path d="M14 74 C22 66 26 58 30 ${cy}" stroke="${NAVY}" stroke-width="2.4" fill="none"/>` +
    `<path d="M22 64 C12 60 9 52 12 48 C18 52 22 56 22 64z" fill="${GREEN}"/>` +
    `<path d="M28 58 C38 60 45 54 46 48 C38 49 32 52 28 58z" fill="${GREEN}"/>` +
    `<path d="M30 34 C26 24 30 16 36 12" stroke="${GREEN}" stroke-width="1.8" fill="none"/>` +
    petals + `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${petal}"/>`;
}

const LABEL = (k) => {
  if (k < 27) return String((k % 9) + 1);
  if (k < 31) return 'TSBU'[k - 27];
  return ['M', 'H', 'P'][k - 31];
};

export function faceSVG(k) {
  let body;
  if (k < 9) body = bamboo(k + 1);
  else if (k === 9) body = bigDot();
  else if (k < 18) body = DOTS[k - 8].map(([x, y, r, c]) => dot(x, y, r, c)).join('');
  else if (k < 27) body = text(NUMS[k - 18], 30, 22, 24, NAVY) + text('萬', 30, 56, 30, RED);
  else if (k < 31) body = text('東南西北'[k - 27], 30, 41, 40, NAVY);
  else if (k === 31) body = text('中', 30, 41, 44, RED);
  else if (k === 32) body = text('發', 30, 41, 40, GREEN);
  else if (k === 33) body = `<rect x="10" y="11" width="40" height="58" rx="3" fill="none" stroke="${NAVY}" stroke-width="3"/>` +
    `<rect x="14.5" y="15.5" width="31" height="49" rx="1.5" fill="none" stroke="${NAVY}" stroke-width="1.3"/>`;
  else {
    const f = k - 34;
    const num = f < 4 ? text('一二三四'[f], 48, 11, 13, NAVY) : `<text x="5" y="15" font-size="15" font-weight="700" fill="${NAVY}" font-family="Georgia,serif">${f - 3}</text>`;
    return blossom(f) + num;
  }
  return body + `<text x="4" y="9" font-size="8" font-family="system-ui,sans-serif" font-weight="700" fill="#8a8170" opacity=".75">${LABEL(k)}</text>`;
}

export function buildSprite() {
  let s = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>';
  for (let k = 0; k < 42; k++) s += `<symbol id="tk${k}" viewBox="0 0 60 80">${faceSVG(k)}</symbol>`;
  return s + '</defs></svg>';
}

// Avatar bot: monogram emas di lingkaran bergradasi dengan motif.
export function avatarSVG(p) {
  const id = 'av' + p.key;
  const motif = {
    plum: '<g fill="#f4d9a6" opacity=".35">' + [0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="26" rx="7" ry="10" transform="rotate(${a} 50 50)"/>`).join('') + '</g>',
    crane: '<path d="M18 62 C34 40 58 36 82 44 C64 46 50 54 40 70z" fill="#f4d9a6" opacity=".3"/>',
    wave: '<path d="M10 64 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#f4d9a6" stroke-width="3" fill="none" opacity=".35"/>',
    you: '<circle cx="50" cy="50" r="24" fill="none" stroke="#f4d9a6" stroke-width="2" opacity=".35"/>',
  }[p.motif];
  return `<svg viewBox="0 0 100 100" class="avatar-svg" aria-hidden="true">
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></radialGradient></defs>
    <circle cx="50" cy="50" r="47" fill="url(#${id})" stroke="#d8b878" stroke-width="3"/>
    ${motif}
    <text x="50" y="54" text-anchor="middle" dominant-baseline="central" font-size="44" fill="#f6e3b8" font-family="'Cormorant Garamond',Georgia,serif" font-weight="600">${p.mono}</text>
  </svg>`;
}

export function chipSVG(label = '') {
  const stripes = Array.from({ length: 8 }, (_, i) => `<rect x="47" y="2" width="6" height="14" fill="#f4ecd8" transform="rotate(${i * 45} 50 50)"/>`).join('');
  return `<svg viewBox="0 0 100 100" class="chip-svg" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="#7d1d1d"/>${stripes}
    <circle cx="50" cy="50" r="34" fill="#9b2b25" stroke="#d8b878" stroke-width="3"/>
    <circle cx="50" cy="50" r="27" fill="none" stroke="#d8b878" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-size="26" font-weight="700" fill="#f2d79b" font-family="system-ui,sans-serif">${label}</text>
  </svg>`;
}
