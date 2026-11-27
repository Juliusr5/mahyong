// Gambar kartu, avatar, dan chip — semua SVG buatan sendiri.
const RED = '#b3261e', GREEN = '#1f6b3a', BLUE = '#1d3a6e', INK = '#1b2433';
const CJK = `font-family="'Songti SC','STSong','Noto Serif CJK SC','Source Han Serif SC','SimSun',serif" font-weight="700"`;
const NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

function dot(x, y, r, col) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="#fffaf0" stroke-width="${r * 0.18}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.22}" fill="#fffaf0"/>`;
}

const DOTS = {
  1: [[30, 40, 17, RED]],
  2: [[30, 22, 10, GREEN], [30, 58, 10, BLUE]],
  3: [[15, 16, 9, BLUE], [30, 40, 9, RED], [45, 64, 9, GREEN]],
  4: [[18, 22, 9.5, BLUE], [42, 22, 9.5, GREEN], [18, 58, 9.5, GREEN], [42, 58, 9.5, BLUE]],
  5: [[16, 18, 8.5, BLUE], [44, 18, 8.5, GREEN], [30, 40, 8.5, RED], [16, 62, 8.5, GREEN], [44, 62, 8.5, BLUE]],
  6: [[18, 15, 8, GREEN], [42, 15, 8, GREEN], [18, 40, 8, RED], [42, 40, 8, RED], [18, 65, 8, RED], [42, 65, 8, RED]],
  7: [[13, 12, 6.5, GREEN], [30, 19, 6.5, GREEN], [47, 26, 6.5, GREEN], [18, 47, 7, RED], [42, 47, 7, RED], [18, 66, 7, RED], [42, 66, 7, RED]],
  8: [14, 32, 50, 68].flatMap((y) => [[18, y, 7.5, BLUE], [42, y, 7.5, BLUE]]),
  9: [16, 40, 64].flatMap((y, i) => [14, 30, 46].map((x) => [x, y, 7.5, [BLUE, RED, GREEN][i]])),
};

function stick(x, y, h, col, w = 8) {
  const n = y + h / 2;
  return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${col}"/>` +
    `<rect x="${x - w / 2 + 1.6}" y="${y + 2}" width="${w * 0.25}" height="${h - 4}" rx="1" fill="#ffffff" opacity=".35"/>` +
    `<line x1="${x - w / 2}" y1="${n}" x2="${x + w / 2}" y2="${n}" stroke="#fffaf0" stroke-width="1.4"/>`;
}

function bamboo(n) {
  const S = [];
  const col = (x, ys, h, c) => ys.forEach((y) => S.push(stick(x, y, h, c)));
  switch (n) {
    case 1: // burung merak bergaya
      return `<path d="M30 70 C18 60 14 44 22 30 C26 22 34 20 38 26 C44 34 40 48 30 56" fill="${GREEN}"/>` +
        `<path d="M30 56 C36 62 44 64 50 60" stroke="${GREEN}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<circle cx="34" cy="20" r="6" fill="${RED}"/><path d="M39 19 l7 -2 l-6 5z" fill="${BLUE}"/>` +
        `<circle cx="35" cy="19" r="1.4" fill="#fffaf0"/>` +
        `<path d="M22 46 C26 40 30 40 32 46" stroke="#fffaf0" stroke-width="1.6" fill="none"/>` +
        `<path d="M20 56 C25 50 30 50 32 56" stroke="#fffaf0" stroke-width="1.6" fill="none"/>`;
    case 2: col(30, [10, 44], 26, GREEN); break;
    case 3: col(30, [10], 26, GREEN); col(18, [44], 26, GREEN); col(42, [44], 26, GREEN); break;
    case 4: col(18, [10, 44], 26, GREEN); col(42, [10, 44], 26, BLUE); break;
    case 5: col(14, [10, 44], 26, GREEN); col(46, [10, 44], 26, BLUE); col(30, [27], 26, RED); break;
    case 6: [14, 30, 46].forEach((x) => col(x, [10, 44], 26, GREEN)); break;
    case 7: col(30, [6], 20, RED); [14, 30, 46].forEach((x) => col(x, [30, 54], 20, GREEN)); break;
    case 8:
      [10, 23.5, 36.5, 50].forEach((x, i) => col(x, [9, 44], 27, i % 3 === 0 ? GREEN : BLUE));
      break;
    case 9: [14, 30, 46].forEach((x, i) => col(x, [6, 30, 54], 20, i === 1 ? RED : GREEN)); break;
  }
  return S.join('');
}

function text(t, x, y, size, col, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${col}" text-anchor="middle" dominant-baseline="central" ${CJK} ${extra}>${t}</text>`;
}

const LABEL = (k) => {
  if (k < 27) return String((k % 9) + 1);
  if (k < 31) return 'TSBU'[k - 27];
  if (k < 34) return ['M', 'H', 'P'][k - 31];
  return String(((k - 34) % 4) + 1);
};

export function faceSVG(k) {
  let body;
  if (k < 9) body = bamboo(k + 1);
  else if (k < 18) body = DOTS[k - 8].map(([x, y, r, c]) => dot(x, y, r, c)).join('');
  else if (k < 27) body = text(NUMS[k - 18], 30, 24, 26, INK) + text('萬', 30, 58, 28, RED);
  else if (k < 31) body = text('東南西北'[k - 27], 30, 42, 38, INK);
  else if (k === 31) body = text('中', 30, 42, 42, RED);
  else if (k === 32) body = text('發', 30, 42, 40, GREEN);
  else if (k === 33) body = `<rect x="11" y="13" width="38" height="56" rx="4" fill="none" stroke="${BLUE}" stroke-width="4"/>` +
    `<rect x="17" y="19" width="26" height="44" rx="2" fill="none" stroke="${BLUE}" stroke-width="1.5"/>`;
  else {
    const f = k - 34;
    const ch = '梅蘭菊竹春夏秋冬'[f];
    const col = f < 4 ? GREEN : RED;
    body = `<circle cx="30" cy="42" r="20" fill="none" stroke="${col}" stroke-width="1.4" opacity=".5"/>` + text(ch, 30, 42, 30, col);
  }
  const lab = `<text x="5" y="10" font-size="10" font-family="system-ui,sans-serif" font-weight="700" fill="#7a6a4f">${LABEL(k)}</text>`;
  return body + lab;
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
