// Reuzenbladeren (GD 3, planten als spelelement): grote bladeren als trapjes naar beneden, van de
// hoge boomhut naar het steigertje in de vijver. Ze buigen door als je erop landt en veren terug.
import { kies, kiesAantal } from './hulp.js';

export function maakReuzenblad(w, D) {
  const R = D.reuzenblad;
  const k = kiesAantal(w, R.aantal);
  const kant = w.geheel(2) ? 1 : -1;
  const bladeren = [];
  let t = kies(w, R.eerste) + R.lang;
  for (let i = 0; i < k; i++) {
    bladeren.push({ t, q: (i % 2 ? -kant : kant) * kies(w, R.zigzag), zak: 0, zakV: 0, belast: false, f: (i + 1) / (k + 1) });
    t += 2 * R.lang + (i < k - 1 ? kies(w, R.tussen) : 0);
  }
  const len = t - R.lang + kies(w, R.laatste);
  return { soort: 'reuzenblad', len, bladeren };
}

/** De hoogte van blad i (zonder doorbuigen): gelijke trapjes van de boomhut naar het steigertje. */
export const bladTop = (m, bl) => m.h0 + (m.h1 - m.h0) * bl.f;

export function oppervlakReuzenblad(m, D, t, q) {
  const R = D.reuzenblad;
  let beste = -Infinity;
  for (const bl of m.bladeren) {
    const u = (t - bl.t) / R.lang;
    const v = (q - bl.q) / R.breed;
    const d = u * u + v * v;
    if (d > 1) continue;
    // Een blad is in het midden iets lager dan aan de rand (een schoteltje).
    const y = bladTop(m, bl) - bl.zak - 0.05 * (1 - d);
    if (y > beste) beste = y;
  }
  return beste;
}

/** @param {{ t:number, q:number, op:boolean, y:number }[]} wie */
export function stapReuzenblad(m, D, dt, wie) {
  const R = D.reuzenblad;
  for (const bl of m.bladeren) {
    bl.belast = wie.some((p) => p.op && ((p.t - bl.t) / R.lang) ** 2 + ((p.q - bl.q) / R.breed) ** 2 <= 1.05 && Math.abs(p.y - (bladTop(m, bl) - bl.zak)) < 0.3);
    const doel = bl.belast ? R.doorbuigen : 0;
    bl.zakV += (R.veer * (doel - bl.zak) - R.demping * bl.zakV) * dt;
    bl.zak += bl.zakV * dt;
  }
}

export function bloesemsReuzenblad(m, D) {
  return m.bladeren.filter((_, i) => i % 2 === 1).map((bl) => [bl.t, bl.q, bladTop(m, bl) + D.zweefHoogte]);
}

export function doelenReuzenblad(m, D) {
  return [...m.bladeren.map((bl) => ({ t: bl.t, q: bl.q, y: bladTop(m, bl), r: 0.45 })), { t: m.len + 0.9, q: 0, y: m.h1, r: 0.5 }];
}
