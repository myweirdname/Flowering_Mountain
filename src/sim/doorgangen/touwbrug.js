// De touwbrug (GD 3, oversteken): planken tussen twee touwen die doorzakken en zwaaien.
// Een of twee plankjes ontbreken: daar spring je over. De touwen opzij houden je op de brug.
import { kies, kiesAantal } from './hulp.js';

/** Bouwt de brug vanuit de oplossing: de gaten zijn altijd kort genoeg om over te springen (TP 5.3). */
export function maakTouwbrug(w, D) {
  const T = D.touwbrug;
  const len = kies(w, T.lengte);
  const n = kiesAantal(w, T.gaten);
  const gaten = [];
  for (let i = 0; i < n; i++) {
    const g = kies(w, T.gat);
    const mid = len * (n === 1 ? 0.5 : 0.32 + (0.4 * i) / (n - 1)) + (w.geheel(61) - 30) / 100;
    gaten.push([mid - g / 2, mid + g / 2]);
  }
  return { soort: 'touwbrug', len, gaten, zwaai: 0, zwaaiV: 0, tijd: 0, last: -99, belast: false };
}

/** De hoogte van de planken op afstand t, zonder het kuiltje. */
export function brugHoogte(m, D, t) {
  const f = Math.max(0, Math.min(1, t / m.len));
  return m.h0 + (m.h1 - m.h0) * f - D.touwbrug.doorzak * m.len * Math.sin(Math.PI * f);
}

/** Hoe ver de brug opzij zwaait op afstand t. */
export const brugOpzij = (m, t) => m.zwaai * Math.sin(Math.PI * Math.max(0, Math.min(1, t / m.len)));

export const inGat = (m, t) => m.gaten.some(([a, b]) => t > a && t < b);

export function oppervlakTouwbrug(m, D, t, q) {
  if (t < -0.2 || t > m.len + 0.2) return -Infinity;
  if (Math.abs(q - brugOpzij(m, t)) > D.touwbrug.breedte / 2 || inGat(m, t)) return -Infinity;
  const kuil = m.belast ? D.touwbrug.deuk * Math.exp(-(((t - m.last) / 0.7) ** 2)) : 0;
  return brugHoogte(m, D, t) - kuil * Math.sin(Math.PI * Math.max(0, Math.min(1, t / m.len)));
}

/** @param {{ t:number, q:number, op:boolean, v:number }[]} wie wie er op de brug staat (lokaal) */
export function stapTouwbrug(m, D, dt, wie) {
  m.tijd += dt;
  const T = D.touwbrug;
  let duw = 0;
  m.belast = false;
  for (const p of wie) {
    if (p.t < 0 || p.t > m.len || Math.abs(p.q) > 1) continue;
    m.belast = true;
    m.last = p.t;
    duw += Math.min(1, p.v / 6.5) * Math.sin(m.tijd * 4.4) * Math.sin(Math.PI * p.t / m.len);
  }
  // Een veer: rennen doet hem zwaaien, daarna dempt hij uit.
  m.zwaaiV += (duw * T.schommel * 30 - m.zwaai * 18 - m.zwaaiV * 2.2) * dt;
  m.zwaai += m.zwaaiV * dt;
}

/** Na het lopen: de touwen opzij houden je op de brug (als je op plankhoogte bent). */
export function leuningTouwbrug(m, D, s, t, q, b) {
  if (t < 0.15 || t > m.len - 0.15) return;
  if (Math.abs(s.pos[1] - brugHoogte(m, D, t)) > 0.7) return;
  const q0 = brugOpzij(m, t);
  const L = D.touwbrug.leuning;
  const d = q - q0;
  if (Math.abs(d) <= L) return;
  const terug = d - Math.sign(d) * L;
  s.pos[0] -= b[0] * terug;
  s.pos[2] -= b[1] * terug;
  const v = s.vel[0] * b[0] + s.vel[2] * b[1];
  if (v * d > 0) {
    s.vel[0] -= b[0] * v;
    s.vel[2] -= b[1] * v;
  }
}

export function bloesemsTouwbrug(m, D) {
  // Boven elk gat een bloesem: wie springt, pakt hem.
  return m.gaten.map(([a, b]) => [(a + b) / 2, 0, brugHoogte(m, D, (a + b) / 2) + D.zweefHoogte]);
}

/** Waar de testbot naartoe loopt. */
export function doelenTouwbrug(m, D) {
  return [{ t: m.len + 0.7, q: 0, y: m.h1, r: 0.6 }];
}
