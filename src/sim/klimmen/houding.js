// Het lichaam aan de wand (KL 5): vier ledematen op grepen en één romp die zich schikt.
// Alles op de platte wandkaart (u, v). De romp is één punt P = het midden van de heupen; de schouders zitten er
// recht boven. Geen fysica: de romp wordt telkens verschoven tot elk vastgezet ledemaat binnen bereik is
// (afwisselend projecteren). Zo blijft alles voorspelbaar en kan de klimbot later precies hetzelfde narekenen.

export const LEDEN = /** @type {const} */ (['lh', 'rh', 'lv', 'rv']);
export const KANT = { lh: -1, rh: 1, lv: -1, rv: 1 };
export const isHand = (lid) => lid === 'lh' || lid === 'rh';
export const ANDERE = { lh: 'rh', rh: 'lh', lv: 'rv', rv: 'lv' };

/**
 * @typedef {typeof import('../../data/klimmen.js').KLIMMEN.lichaam} Lichaam
 * @typedef {{ lh: number[] | null, rh: number[] | null, lv: number[] | null, rv: number[] | null }} Punten
 */

/** Schouder (hand) of heup (voet) van een ledemaat, bij romp P. */
export function wortel(L, P, lid, uit = [0, 0]) {
  const k = KANT[lid];
  if (isHand(lid)) {
    uit[0] = P[0] + k * L.schouder;
    uit[1] = P[1] + L.romp;
  } else {
    uit[0] = P[0] + k * L.heup;
    uit[1] = P[1];
  }
  return uit;
}

const w = [0, 0];

/** Hoe ver een ledemaat maximaal reikt (met minder bereik als het kruist). */
export function reik(L, lid, kruist = false) {
  return (isHand(lid) ? L.arm : L.been) * (kruist ? 1 - L.kruisen : 1);
}

/**
 * Hoeveel de houding P de regels overtreedt (meter): 0 = alles binnen bereik.
 * @param {Lichaam} L @param {number[]} P @param {Punten} punten @param {Partial<Record<string, number>>} [max] eigen bereik per lid
 */
export function fout(L, P, punten, max) {
  let f = Math.max(0, L.minHeup - P[1]);
  for (const lid of LEDEN) {
    const p = punten[lid];
    if (!p) continue;
    wortel(L, P, lid, w);
    const d = Math.hypot(p[0] - w[0], p[1] - w[1]);
    const hand = isHand(lid);
    f = Math.max(f, d - (max?.[lid] ?? reik(L, lid)), (hand ? L.minArm : L.minBeen) - d);
    if (!hand) f = Math.max(f, p[1] - (P[1] + L.voetBovenHeup));
  }
  return f;
}

/**
 * Schuift P (ter plaatse) tot alle vastgezette ledematen binnen bereik zijn. Geeft de overblijvende fout terug.
 * @param {Lichaam} L @param {number[]} P @param {Punten} punten @param {Partial<Record<string, number>>} [max]
 */
export function schik(L, P, punten, max, keer = 40) {
  for (let it = 0; it < keer; it++) {
    let grootste = 0;
    for (const lid of LEDEN) {
      const p = punten[lid];
      if (!p) continue;
      wortel(L, P, lid, w);
      const dx = p[0] - w[0];
      const dy = p[1] - w[1];
      const d = Math.hypot(dx, dy);
      const hand = isHand(lid);
      const hi = max?.[lid] ?? reik(L, lid);
      const lo = hand ? L.minArm : L.minBeen;
      if (d > hi) {
        const t = (d - hi) / d;
        P[0] += dx * t;
        P[1] += dy * t;
        grootste = Math.max(grootste, d - hi);
      } else if (d < lo && d > 1e-6) {
        const t = (d - lo) / d;
        P[0] += dx * t;
        P[1] += dy * t;
        grootste = Math.max(grootste, lo - d);
      }
      if (!hand && p[1] > P[1] + L.voetBovenHeup) {
        grootste = Math.max(grootste, p[1] - P[1] - L.voetBovenHeup);
        P[1] = p[1] - L.voetBovenHeup;
      }
    }
    if (P[1] < L.minHeup) {
      grootste = Math.max(grootste, L.minHeup - P[1]);
      P[1] = L.minHeup;
    }
    if (grootste < 2e-4) break;
  }
  return fout(L, P, punten, max);
}

/**
 * De zuinigste houding (KL 5): armen gestrekt (je hangt), heupen boven de voeten, met wat leunen erbij.
 * @param {Lichaam} L @param {Punten} punten @param {number[]} [leun] [opzij, omhoog] in meter @param {number[]} [uit]
 */
export function rustHouding(L, punten, leun = [0, 0], uit = [0, 0]) {
  let su = 0;
  let n = 0;
  let sv = 0;
  let nh = 0;
  let fv = 0;
  let nv = 0;
  for (const lid of LEDEN) {
    const p = punten[lid];
    if (!p) continue;
    const k = KANT[lid];
    if (isHand(lid)) {
      su += p[0] - k * L.schouder;
      sv += p[1] - L.romp - L.arm * 0.96;
      nh++;
    } else {
      su += p[0] - k * L.heup;
      fv += p[1];
      nv++;
    }
    n++;
  }
  uit[0] = (n ? su / n : 0) + leun[0];
  uit[1] = (nh ? sv / nh : nv ? fv / nv + L.been * 0.8 : L.minHeup) + leun[1];
  schik(L, uit, punten);
  return uit;
}

/**
 * Kan ledemaat `lid` naar punt T, terwijl de andere drie blijven waar ze zijn? Geeft de houding waarin dat lukt
 * (zo dicht mogelijk bij P), of null. De romp strekt zich zo ver uit als de andere ledematen toelaten (KL 5).
 * @param {Lichaam} L @param {number[]} P huidige romp @param {Punten} punten @param {string} lid @param {number[]} T
 */
export function kanNaar(L, P, punten, lid, T, kruist = false) {
  const proef = { ...punten, [lid]: T };
  const max = { [lid]: reik(L, lid, kruist) };
  const Q = [P[0], P[1]];
  const f = schik(L, Q, proef, max, 80);
  return f < 0.006 ? Q : null;
}

/** Kruist een hand op T voorbij de andere hand? */
export function kruist(punten, lid, T) {
  if (!isHand(lid)) return false;
  const ander = punten[ANDERE[lid]];
  if (!ander) return false;
  return KANT[lid] < 0 ? T[0] > ander[0] + 0.02 : T[0] < ander[0] - 0.02;
}
