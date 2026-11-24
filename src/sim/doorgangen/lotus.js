// De lotusvijver (GD 3, oversteken): ronde bladeren op het water die traag zinken als je erop staat.
// Blijven bewegen! Een blad dat te diep zakt, draagt je niet meer: plons.
import { kies, kiesAantal } from './hulp.js';

export function maakLotus(w, D) {
  const L = D.lotus;
  const k = kiesAantal(w, L.aantal);
  const kant = w.geheel(2) ? 1 : -1;
  const bladeren = [];
  let rand = 0;
  for (let i = 0; i < k; i++) {
    const r = kies(w, L.straal);
    const t = rand + kies(w, L.tussen) + r;
    bladeren.push({ t, q: (i % 2 ? -kant : kant) * kies(w, L.zigzag) * (i === 0 ? 0.4 : 1), r, zink: 0, belast: false, dobber: 0, dobberV: 0 });
    rand = t + r;
  }
  return { soort: 'lotus', len: rand + kies(w, L.tussen), bladeren };
}

export const lotusTop = (m, bl) => m.peil + 0.06 - bl.zink - bl.dobber;

export function oppervlakLotus(m, D, t, q) {
  let beste = -Infinity;
  for (const bl of m.bladeren) {
    if (bl.zink >= D.lotus.draagt) continue;
    if ((t - bl.t) ** 2 + (q - bl.q) ** 2 > bl.r * bl.r) continue;
    beste = Math.max(beste, lotusTop(m, bl));
  }
  return beste;
}

/** @param {{ t:number, q:number, op:boolean, y:number }[]} wie */
export function stapLotus(m, D, dt, wie) {
  const L = D.lotus;
  for (const bl of m.bladeren) {
    const nu = wie.some((p) => p.op && (p.t - bl.t) ** 2 + (p.q - bl.q) ** 2 <= bl.r * bl.r * 1.05 && Math.abs(p.y - lotusTop(m, bl)) < 0.3);
    if (nu && !bl.belast) bl.dobberV -= 0.9; // een plofje bij het landen
    bl.belast = nu;
    bl.zink = Math.max(0, Math.min(L.maxZink, bl.zink + (nu ? L.zinkt : -L.stijgt) * dt));
    bl.dobberV += (-bl.dobber * 60 - bl.dobberV * 7) * dt;
    bl.dobber += bl.dobberV * dt;
  }
}

export function bloesemsLotus(m, D) {
  return m.bladeren.filter((_, i) => i % 2 === 0).map((bl) => [bl.t, bl.q, m.peil + D.zweefHoogte]);
}

export function doelenLotus(m, D) {
  return [...m.bladeren.map((bl) => ({ t: bl.t, q: bl.q, y: m.peil + 0.06, r: Math.min(0.5, bl.r * 0.55) })), { t: m.len + 0.9, q: 0, y: m.h1, r: 0.6 }];
}
