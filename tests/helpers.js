// "123b 456p 789m 1155z" -> daftar jenis. b=bambu p=lingkaran m=karakter z=kehormatan (1-4 angin T S B U, 5-7 naga M H P)
export function kinds(str) {
  const out = [];
  for (const grp of str.trim().split(/\s+/)) {
    const suit = grp.at(-1);
    const off = { b: 0, p: 9, m: 18, z: 27 }[suit];
    for (const ch of grp.slice(0, -1)) out.push(off + Number(ch) - 1);
  }
  return out;
}
export function counts(str) {
  const c = new Array(34).fill(0);
  for (const k of kinds(str)) c[k]++;
  return c;
}
// Ambil id fisik untuk daftar jenis dari pool (agar tiap id unik).
export function idsFor(kindList, used = new Set()) {
  return kindList.map((k) => {
    for (let id = k * 4; id < k * 4 + 4; id++) if (!used.has(id)) { used.add(id); return id; }
    throw new Error('kehabisan kartu jenis ' + k);
  });
}
