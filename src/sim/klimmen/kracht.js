// Belasting en kracht (KL 5, 6): hoeveel gewicht er op de armen komt, hoe goed elke greep nu houdt,
// en hoe snel elke arm verzuurt of herstelt. Kracht per arm: 0 = fris, 1 = vol (de hand gaat open).
// Stap 15a: steilte en voetsteun (haken in het dak, een hakhaak), de trekrichting in 3D (zijgrepen, ondergrepen,
// onder een dak trek je van de wand af), balans (openzwaaien), rusten op een richel of in een knieklem, magnesium.
import { wortel } from './houding.js';

const graden = 180 / Math.PI;
const klem = (x, a, b) => (x < a ? a : x > b ? b : x);
const S = [0, 0];

/**
 * Hoe ver de schouder van de wand af hangt (op de kaart staat ze op afstand d van de hand). Op een verticale wand
 * weinig (de heupen blijven bij de wand), onder een dak bijna een hele armlengte: daar hang je van de wand af.
 * @param {typeof import('../../data/klimmen.js').KLIMMEN.lichaam} L
 */
export function hangAfstand(L, d, steilte) {
  const s = klem(steilte, 0, 1);
  const arm3 = Math.hypot(L.arm, L.wandAfstand);
  return Math.max(0.04, (1 - s) * L.wandAfstand * Math.min(1, d / L.arm) + s * Math.sqrt(Math.max(0, (arm3 * 0.97) ** 2 - d * d)));
}

/**
 * Hoe goed greep g nu houdt (KL 4): kwaliteit maal een richtingsfactor. De trekrichting loopt van de hand naar de
 * schouder: op de wandkaart, plus hoe ver de schouder van de wand af hangt. De goede richting van de greep is
 * `richting` (0 = de schouder eronder, 180 = erboven, ±70 = opzij) met wat ruimte om ook van de wand af te trekken
 * (`uit`). Een sloper houdt alleen met een (bijna) gestrekte arm. Magnesium (krijt) maakt de greep beter.
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {{ soort: string, richting?: number }} g @param {number[]} hand @param {number[]} schouder
 * @param {number} steilte steilte bij de schouder @param {number} [krijt] zetten met magnesium voor deze hand
 */
export function greepNu(K, g, hand, schouder, steilte, krijt = 0) {
  const G = K.grepen[g.soort];
  if (!G || G.alleenVoet || G.alleenKnie) return 0;
  const L = K.lichaam;
  const du = schouder[0] - hand[0];
  const dv = schouder[1] - hand[1];
  const d = Math.hypot(du, dv);
  const dn = hangAfstand(L, d, steilte);
  const pl = Math.hypot(du, dv, dn) || 1e-6;
  const a = (g.richting ?? 0) / graden;
  const gu = Math.sin(a);
  const gv = -Math.cos(a);
  const gl = Math.hypot(1, G.uit ?? 0.3);
  const cos = (du * gu + dv * gv + dn * (G.uit ?? 0.3)) / (pl * gl);
  const hoek = Math.acos(klem(cos, -1, 1)) * graden;
  let f = 1;
  if (hoek > G.kegel) {
    f = hoek <= 90 ? 1 + (G.dwars - 1) * ((hoek - G.kegel) / (90 - G.kegel)) : G.dwars * (1 - 0.5 * Math.min(1, (hoek - 90) / 90));
  }
  if (G.gestrekt && pl / Math.hypot(L.arm, L.wandAfstand) < G.gestrekt) f *= 0.6;
  let q = G.kwaliteit * f;
  if (krijt > 0) q = Math.min(1, q + (g.soort === 'sloper' ? K.magnesium.plusSloper : K.magnesium.plus));
  return q;
}

/** Houdt deze hand nu echt vast (niet onderweg, niet aan het uitschudden, niet weggegleden, niet in het pofzakje)? */
export function houdtVast(k, lid) {
  return !!k.op[lid] && k.zet?.lid !== lid && k.schudt !== lid && !(k.los?.[lid] > 0) && k.krijtHand !== lid &&
    !(k.vleermuis && k.vleermuis.handenLos) && !(k.dyno && k.dyno.fase === 'vlucht');
}

/**
 * Rekent de belasting uit voor de huidige houding (KL 5) en zet per hand: last, kwaliteit en verhouding.
 * Armbelasting A = 1 − voetsteun × (1 − 0,7 × steilte). Een hakhaak (een voet boven de heup in het dak of op de
 * dakrand) neemt gewicht over, ook ondersteboven. Twee voeten op een richel: je staat, de armen dragen niets.
 * Hangt je gewicht naast al je steunpunten, dan zwaait je lichaam open (+30%).
 * @param {any} k klimtoestand (sim/modi/klimmen.js)
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {any} rots de wand (grepen, steilte)
 */
export function rekenBelasting(k, K, rots) {
  const L = K.lichaam;
  const KR = K.kracht;
  const grepen = rots.grepen;
  const s = rots.steilte(k.P[1] + L.romp * 0.5);
  k.steilte = s;
  let gewoon = 0;
  let hak = 0;
  let voeten = 0;
  let opRichel = 0;
  /** @type {number[]} */
  const steun = [];
  for (const lid of ['lv', 'rv']) {
    const op = k.op[lid];
    if (!op || k.zet?.lid === lid || k.vleermuis) continue;
    const kw = op.greep < 0 ? K.grond.voet : K.grepen[grepen[op.greep].soort].voet;
    voeten++;
    if (op.greep <= -2 || (op.greep >= 0 && grepen[op.greep].lip)) opRichel++; // de rand van een richel is ook de richel
    if (op.hak && op.v > k.P[1] + 0.05) hak += KR.voetSteun * kw * K.dak.hak;
    else gewoon += KR.voetSteun * kw;
    steun.push(op.u);
  }
  k.staat = opRichel === 2;
  let A = k.staat || k.vleermuis ? 0 : Math.max(0, 1 - Math.min(0.9, gewoon) * (1 - 0.7 * s) - hak);
  const vast = ['lh', 'rh'].filter((lid) => houdtVast(k, lid));
  for (const lid of vast) steun.push(k.op[lid].u);
  // Balans: de deur die openzwaait (alleen met minstens één voet op de wand; zonder voeten zwaai je als een slinger).
  let open = 0;
  let kant = 0;
  if (voeten > 0 && vast.length && !k.staat) {
    const lo = Math.min(...steun);
    const hi = Math.max(...steun);
    const B = K.balans;
    const buiten = Math.max(lo - B.marge - k.P[0], k.P[0] - hi - B.marge, 0);
    open = klem(buiten / B.vol, 0, 1);
    kant = k.P[0] < lo ? -1 : 1;
  }
  k.zwaaiOpen = open;
  k.zwaaiKant = kant;
  A *= 1 + K.balans.toeslag * open;
  k.armBelasting = A;
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
    h.kwaliteit = greepNu(K, grepen[op.greep], [op.u, op.v], S, rots.steilte(S[1]), k.krijt?.[lid] ?? 0);
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
 * Staan op een richel of hangen in een knieklem: beide armen herstellen snel.
 * @param {any} k @param {typeof import('../../data/klimmen.js').KLIMMEN} K @param {{ krachtFactor: number, krachtMax: number, glijden?: boolean }} B
 */
export function werkKrachtBij(k, K, B, dt) {
  const KR = K.kracht;
  const rust = k.staat || (k.vleermuis && k.vleermuis.handenLos);
  let laatLos = null;
  for (const lid of ['lh', 'rh']) {
    const h = k.hand[lid];
    if (k.schudt === lid) {
      h.pomp -= KR.herstelSchudden * dt;
    } else if (rust) {
      h.pomp -= KR.herstelRust * dt;
    } else if (h.last > 0) {
      const r = h.verhouding;
      const verbruik = (r / KR.volTijd) * B.krachtFactor;
      const herstel = r < KR.herstelOnder ? KR.herstelGreep * (1 - r / KR.herstelOnder) : 0;
      h.pomp += (verbruik - herstel) * dt;
      if (B.glijden !== false && (r > KR.glijGrens || h.pomp >= 1)) laatLos = laatLos ?? lid;
    } else {
      h.pomp -= KR.herstelGreep * dt; // een hand onderweg (of in het pofzakje) rust heel even
    }
    h.pomp = klem(h.pomp, 0, B.krachtMax);
  }
  return laatLos;
}
