// De springbloem (GD 3, planten als spelelement): een grote bloem op het platform. Stap erop:
// ze zakt even in en lanceert je hoog de lucht in, recht naar de hoge boomhut.
import { kies, naarWereld } from './hulp.js';

export function maakSpringbloem(w, D) {
  return { soort: 'springbloem', len: kies(w, D.springbloem.gat), druk: 0, veer: 0, veerV: 0, tijd: 0 };
}

/** Het midden van de bloem (lokaal): op het platform, vlak voor de rand. */
export const bloemT = (D) => -(D.springbloem.straal + 0.16);

export function oppervlakSpringbloem(m, D, t, q) {
  const B = D.springbloem;
  if (Math.hypot(t - bloemT(D), q) > B.straal) return -Infinity;
  return m.h0 + B.hoogte - Math.max(0, m.veer) * 0.6;
}

export function stapSpringbloem(m, D, dt) {
  m.tijd += dt;
  // Na het lanceren veert de bloem na (alleen voor het beeld en het oppervlak).
  m.veerV += (-m.veer * 120 - m.veerV * 9) * dt;
  m.veer += m.veerV * dt;
}

/** Staat de speler op de bloem? Dan zakt ze in; daarna de lancering. */
export function stapSpelerSpringbloem(m, D, s, t, q, dt, meld) {
  const B = D.springbloem;
  const op = s.opGrond && Math.hypot(t - bloemT(D), q) < B.straal * 0.9 && Math.abs(s.pos[1] - (m.h0 + B.hoogte)) < 0.3;
  if (!s.bloemDruk && op) {
    s.bloemDruk = B.indrukken;
    m.veer = 0.25;
    m.veerV = 0;
    meld({ soort: 'springbloemDruk', speler: s.id });
  }
  if (!s.bloemDruk) return;
  s.bloemDruk -= dt;
  s.vel[0] *= 0.6;
  s.vel[2] *= 0.6;
  if (s.bloemDruk > 0) return;
  s.bloemDruk = 0;
  // Lanceren: zo hard opzij dat je precies op de hoge boomhut neerkomt.
  const g = 22;
  const gv = 34;
  const top = s.pos[1] + (B.sprong * B.sprong) / (2 * g);
  const tijd = B.sprong / g + Math.sqrt((2 * Math.max(0.1, top - m.h1)) / gv);
  const [dx, dz] = naarWereld(m, m.len + B.mikIn, 0);
  const vx = (dx - s.pos[0]) / tijd;
  const vz = (dz - s.pos[2]) / tijd;
  s.vel = [vx, B.sprong, vz];
  s.opGrond = false;
  s.coyote = 0;
  s.vlucht = tijd + 0.15;
  m.veer = -0.4;
  m.veerV = 0;
  meld({ soort: 'springbloem', speler: s.id, pos: [...s.pos] });
}

export function bloesemsSpringbloem(m, D) {
  // Hoog in de lucht, op de baan van de lancering.
  return [[(bloemT(D) + m.len + D.springbloem.mikIn) / 2, 0, m.h1 + 1.0]];
}

export function doelenSpringbloem(m, D) {
  return [
    { t: bloemT(D), q: 0, y: m.h0 + D.springbloem.hoogte, r: 0.4, bloem: true },
    { t: m.len + D.springbloem.mikIn, q: 0, y: m.h1, r: 0.7 },
  ];
}
