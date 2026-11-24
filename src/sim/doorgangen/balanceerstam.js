// De balanceerstam (GD 3, oversteken): een smalle ronde stam. Hij wiebelt je zachtjes opzij,
// en hoe harder je loopt, hoe meer. Rustig lopen lukt altijd; rennen vraagt bijsturen.
import { kies } from './hulp.js';

export function maakBalanceerstam(w, D) {
  const len = kies(w, D.balanceerstam.lengte);
  return { soort: 'balanceerstam', len, fase: w.geheel(628) / 100, tijd: 0, wiebel: 0 };
}

const stamHoogte = (m, t) => m.h0 + (m.h1 - m.h0) * Math.max(0, Math.min(1, t / m.len));

export function oppervlakBalanceerstam(m, D, t, q) {
  const R = D.balanceerstam.straal;
  if (t < -0.15 || t > m.len + 0.15 || Math.abs(q) > R) return -Infinity;
  return stamHoogte(m, t) + R * (Math.sqrt(1 - (q / R) ** 2) - 1);
}

export function stapBalanceerstam(m, D, dt) {
  m.tijd += dt;
}

/** Staat de speler op de stam (lokaal t, q)? */
export function opStam(m, D, s, t, q) {
  return t > 0 && t < m.len && Math.abs(q) <= D.balanceerstam.straal && Math.abs(s.pos[1] - stamHoogte(m, t)) < 0.35;
}

/** Vóór het lopen: op de stam telt je joystick opzij maar voor een stukje. */
export function invoerBalanceerstam(m, D, int, a, b) {
  const [bx, bz] = int.beweeg;
  const langs = bx * a[0] + bz * a[1];
  const opzij = (bx * b[0] + bz * b[1]) * D.balanceerstam.zijwaarts;
  return { ...int, beweeg: [a[0] * langs + b[0] * opzij, a[1] * langs + b[1] * opzij] };
}

/** Na het lopen: de stam wiebelt je opzij (meer als je snel gaat) en trekt je zacht naar het midden. */
export function wiebelBalanceerstam(m, D, s, q, b, dt) {
  const B = D.balanceerstam;
  const v = Math.min(1, Math.hypot(s.vel[0], s.vel[2]) / 6.5);
  const A = B.drift[0] + (B.drift[1] - B.drift[0]) * v * v;
  const w = B.driftHoek;
  const drift = A * (Math.sin(m.tijd * w + m.fase) + 0.5 * Math.sin(m.tijd * w * 1.7 + m.fase * 2));
  const dq = (drift - B.midden * q) * dt;
  s.pos[0] += b[0] * dq;
  s.pos[2] += b[1] * dq;
  // Voor het beeld: hoe hard ze nu moet balanceren (-1..1).
  s.wiebel = Math.max(-1, Math.min(1, q / B.straal + drift * 0.4));
}

export function bloesemsBalanceerstam(m, D) {
  return [[m.len / 2, 0, stamHoogte(m, m.len / 2) + D.zweefHoogte]];
}

export function doelenBalanceerstam(m) {
  return [{ t: m.len + 0.7, q: 0, y: m.h1, r: 0.6 }];
}
