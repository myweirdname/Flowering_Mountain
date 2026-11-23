// Belasting en kracht (KL 5, 6): hoeveel gewicht er op de armen komt, hoe goed elke greep nu houdt,
// en hoe snel elke arm verzuurt of herstelt. Kracht per arm: 0 = fris, 1 = vol (de hand gaat open).
import { wortel } from './houding.js';

const graden = 180 / Math.PI;
const klem = (x, a, b) => (x < a ? a : x > b ? b : x);
const S = [0, 0];

/**
 * Hoe goed een greep nu houdt (KL 4): kwaliteit maal een richtingsfactor. De goede trekrichting is voor alle
 * grepen op de oefenrots "naar beneden": de lijn van de greep naar de schouder moet omlaag wijzen.
 * Een sloper houdt alleen met een (bijna) gestrekte arm.
 */
export function greepNu(G, soort, hand, schouder, armLengte) {
  const g = G[soort];
  if (!g || g.alleenVoet) return 0;
  const dx = schouder[0] - hand[0];
  const dy = schouder[1] - hand[1];
  const d = Math.hypot(dx, dy) || 1e-6;
  const hoek = Math.acos(klem(-dy / d, -1, 1)) * graden; // 0 = schouder recht onder de greep
  let f = 1;
  if (hoek > g.kegel) {
    f = hoek <= 90 ? 1 + (g.dwars - 1) * ((hoek - g.kegel) / (90 - g.kegel)) : g.dwars * (1 - 0.5 * Math.min(1, (hoek - 90) / 90));
  }
  if (g.gestrekt && d / armLengte < g.gestrekt) f *= 0.6;
  return g.kwaliteit * f;
}

/**
 * Rekent de belasting uit voor de huidige houding (KL 5) en zet per hand: last, kwaliteit en verhouding.
 * @param {any} k klimtoestand (sim/modi/klimmen.js)
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {number} steilte
 */
export function rekenBelasting(k, K, steilte, grepen) {
  const L = K.lichaam;
  const KR = K.kracht;
  let steun = 0;
  for (const lid of ['lv', 'rv']) {
    const op = k.op[lid];
    if (!op || k.zet?.lid === lid) continue;
    const kw = op.greep < 0 ? K.grond.voet : K.grepen[grepen[op.greep].soort].voet;
    steun += KR.voetSteun * kw;
  }
  steun = Math.min(0.9, steun);
  const A = Math.max(0, 1 - steun * (1 - 0.7 * steilte));
  k.armBelasting = A;
  const vast = ['lh', 'rh'].filter((lid) => k.op[lid] && k.zet?.lid !== lid && k.schudt !== lid && !k.los[lid]);
  // Eerst per hand: hoe goed houdt haar greep nu, en hoe gebogen is de arm?
  let som = 0;
  for (const lid of ['lh', 'rh']) {
    const h = k.hand[lid];
    const op = k.op[lid];
    if (!vast.includes(lid) || !op) {
      h.last = 0;
      h.kwaliteit = 0;
      h.verhouding = 0;
      h.buig = 0;
      continue;
    }
    wortel(L, k.P, lid, S);
    const d = Math.hypot(op.u - S[0], op.v - S[1]) / L.arm;
    h.buig = klem((KR.gebogenVanaf - d) / (KR.gebogenVanaf - L.minArm / L.arm), 0, 1);
    h.kwaliteit = greepNu(K.grepen, grepen[op.greep].soort, [op.u, op.v], S, L.arm);
    som += Math.sqrt(h.kwaliteit);
  }
  // Dan de last verdelen: het lichaam hangt vanzelf meer aan de betere greep (naar de wortel van de kwaliteit).
  for (const lid of vast) {
    const h = k.hand[lid];
    const deel = som > 0 ? Math.sqrt(h.kwaliteit) / som : 1 / vast.length;
    h.last = A * (1 + KR.gebogen * h.buig) * deel;
    h.verhouding = h.kwaliteit > 0 ? h.last / h.kwaliteit : 99;
  }
}

/**
 * Verzuren en herstellen (KL 6). Geeft de hand terug die nu loslaat (weggleden of vol), of null.
 * @param {any} k @param {typeof import('../../data/klimmen.js').KLIMMEN} K @param {{ krachtFactor: number, krachtMax: number, glijden?: boolean }} B
 */
export function werkKrachtBij(k, K, B, dt) {
  const KR = K.kracht;
  let laatLos = null;
  for (const lid of ['lh', 'rh']) {
    const h = k.hand[lid];
    if (k.schudt === lid) {
      h.pomp -= KR.herstelSchudden * dt;
    } else if (h.last > 0) {
      const r = h.verhouding;
      const verbruik = (r / KR.volTijd) * B.krachtFactor;
      const herstel = r < KR.herstelOnder ? KR.herstelGreep * (1 - r / KR.herstelOnder) : 0;
      h.pomp += (verbruik - herstel) * dt;
      if (B.glijden !== false && (r > KR.glijGrens || h.pomp >= 1)) laatLos = laatLos ?? lid;
    } else {
      h.pomp -= KR.herstelGreep * dt; // een hand onderweg rust heel even
    }
    h.pomp = klem(h.pomp, 0, B.krachtMax);
  }
  return laatLos;
}
