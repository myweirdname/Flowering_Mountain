// Het eiland (stap 12, TP 5.2): de kust rondom, een rotsrand met één etage erboven, ravijnen die de etage
// in plekken verdelen, een brede bergtop die je te voet beklimt, en voorlopig een hellingbaan met een
// zandpaadje als weg naar de etage. Werkt in poolcoördinaten rond de top: r = afstand tot de top,
// a = hoek (0 = in de richting van het kamp). Geen Three.js. Een eigen deelzaadje, zodat de kampplek
// er niet door verandert.
import { maakWillekeur } from '../../kern/willekeur.js';
import { lagenruis, waardenruis } from './ruis.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Zoals glad, maar steiler in het midden en vlakker aan de randen (voor rotswanden). */
const gladder = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
const TWEE_PI = Math.PI * 2;

/** Zacht minimum: precies min(a, b) zodra ze meer dan k verschillen, daartussen een zachte overgang. */
export function zachtMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Verschil tussen twee hoeken, tussen -PI en PI. */
function hoekVerschil(a, b) {
  const d = a - b;
  return d - Math.round(d / TWEE_PI) * TWEE_PI;
}

/**
 * @typedef {{ wand:number, voet:number, pad:number, vlak:number, open:number, berg:number, top:number, ravijn:number }} BergUit
 *   wand: steile rotswand (geen kleine planten); voet: vlak voor de rotsrand (losse rotsblokken);
 *   pad: zandpaadje of hellingbaan; vlak: geen fijne ruis; open: grasplek; berg: 1 op de etage en de top;
 *   top: het plateau bovenop; ravijn: in een ravijn
 */

/**
 * @param {number} zaadje deelzaadje van het eiland
 * @param {typeof import('../../data/eiland.js').EILAND} E
 * @param {number} su de kant van de springweide (-1 of 1): daar komt de hellingbaan
 */
export function maakEiland(zaadje, E, su) {
  const w = maakWillekeur(zaadje);
  const zKust = w.volgende();
  const zRand = w.volgende();
  const zVoet = w.volgende();
  const zGolf = w.volgende();
  const zOpen = w.volgende();
  const zGraat = w.volgende();
  const C = E.midden;
  const K = E.kust;
  const et = E.etages[0];
  const T = E.top;
  const RV = E.ravijnen;
  const HB = E.hellingbaan;
  const half = et.wand / 2;

  /** Zachte ruis rond de berg: dezelfde waarde bij a en a + 2PI. */
  const ringRuis = (a, schaal, zaad) => lagenruis(Math.cos(a) * schaal + 11.3, Math.sin(a) * schaal + 5.7, zaad, 2);
  const punt = (a, r) => [C.x + Math.sin(a) * r, C.z - Math.cos(a) * r];

  /** Afstand van de top tot de waterlijn, in richting a. */
  function kustStraal(a) {
    const basis = K.straal * (1 + K.ruis * ringRuis(a, K.ruisSchaal, zKust));
    return basis + K.kampExtra * Math.exp(-((a / K.kampBreedte) ** 2));
  }

  /** Afstand van de top tot het midden van de rotsrand. Rond het kamp blijft hij achter het speelterrein. */
  function randStraal(a) {
    let R = et.rand * (1 + et.randRuis * ringRuis(a, et.randSchaal, zRand));
    const ca = Math.cos(a);
    if (ca > 0.2) R = zachtMin(R, (C.z - E.kampVrij) / ca - half - 1, 8);
    return R;
  }

  /** Afstand van de top tot de voet van de kegel; de etage blijft overal breed genoeg. */
  function voetStraal(a) {
    const R = T.voet * (1 + T.voetRuis * ringRuis(a, 1.1, zVoet));
    return Math.min(R, randStraal(a) - half - et.minBreedte);
  }

  /** Ribbels en geulen op de kegel: 1 op een graat, -1 in een geul. */
  function graat(a, r) {
    const g = Math.sin(T.graten * a + 2.2 * ringRuis(a, 1.3, zGraat) + r * 0.025);
    return 1 - 2 * Math.abs(g);
  }

  /** Hoogte van de etage aan de rotsrand, in richting a. */
  const etageBasis = (a) => et.hoogte + et.hoogteRuis * ringRuis(a, 1.2, zGolf + 77);

  /** Hoogte van de etage zelf (zonder rotsrand), op (x, z) met afstand r. */
  function etageHoogte(x, z, r, a, R1, Rc) {
    const bult = et.golf * lagenruis(x / et.golfSchaal, z / et.golfSchaal, zGolf, 2) * glad((r - Rc) / 12);
    return etageBasis(a) + et.stijging * (R1 - r) + bult;
  }

  /** Hoogte binnen de rotsrand: de etage, en binnen de voet van de kegel de bergtop. */
  function binnenHoogte(x, z, r, a, R1, Rc, uit) {
    if (r > Rc) return etageHoogte(x, z, r, a, R1, Rc);
    const Hf = etageBasis(a) + et.stijging * (R1 - Rc);
    const U = Rc - T.plateau;
    const t = Math.min(1, (Rc - r) / U);
    const P = T.vorm * t + (1 - T.vorm) * t * t;
    if (uit) uit.top = glad((T.plateau + 2 - r) / 3);
    return Hf + (T.hoogte - Hf) * P + T.graatHoogte * Math.sin(Math.PI * t) * graat(a, r);
  }

  // --- Grenzen van het eiland (voor het grove vlak, het water en de speelgrens) ---
  const grenzen = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  let maxRand = 0;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * TWEE_PI - Math.PI;
    // Aan de kampkant houdt de oude kust (de baai) het eiland korter: neem die er niet bij.
    const r = Math.min(kustStraal(a), Math.cos(a) > 0 ? (C.z + 60) / Math.cos(a) : Infinity);
    const [x, z] = punt(a, r);
    grenzen.minX = Math.min(grenzen.minX, x);
    grenzen.maxX = Math.max(grenzen.maxX, x);
    grenzen.minZ = Math.min(grenzen.minZ, z);
    grenzen.maxZ = Math.max(grenzen.maxZ, z);
    maxRand = Math.max(maxRand, randStraal(a));
  }
  grenzen.minX -= E.zeeRand;
  grenzen.maxX += E.zeeRand;
  grenzen.minZ -= E.zeeRand;
  grenzen.maxZ += E.zeeRand;
  // Verder dan dit doet de berg niets meer (rotsrand, ravijngeultjes).
  const maxStraal = maxRand + half + et.grillig + RV.uitloop + 4;

  // --- Ravijnen en de hellingbaan: pas te bouwen als het laagland bekend is ---
  /** @type {{ a:number, voet:number, kop:number, vloer:number, breed:number }[]} */
  const ravijnen = [];
  /** @type {null | { x0:number, z0:number, x1:number, z1:number, ex:number, ez:number, len:number, hA:number, hB:number, a0:number, a1:number }} */
  let helling = null;
  /** @type {null | { x0:number, z0:number, x1:number, z1:number, ex:number, ez:number, len:number }} */
  let pad = null;

  /**
   * @param {(x:number, z:number) => number} laagland de hoogte van het land zonder berg
   * @param {[number, number]} padBegin waar het zandpaadje naar de hellingbaan begint
   */
  function bouw(laagland, padBegin) {
    // De hellingbaan: onderaan net voor de rotsrand, bovenaan net erachter, schuin langs de wand.
    const a0 = su * HB.hoek;
    const r0 = randStraal(a0) + half + HB.breedte + HB.marge;
    const [x0, z0] = punt(a0, r0);
    let a1 = a0;
    let x1 = x0;
    let z1 = z0;
    let r1 = r0;
    for (let i = 1; i <= 400; i++) {
      a1 = a0 + su * i * 0.004;
      r1 = randStraal(a1) - half - HB.breedte - HB.marge;
      [x1, z1] = punt(a1, r1);
      if (Math.hypot(x1 - x0, z1 - z0) >= HB.lengte) break;
    }
    const len = Math.hypot(x1 - x0, z1 - z0);
    const hA = laagland(x0, z0);
    const hB = etageHoogte(x1, z1, r1, a1, randStraal(a1), voetStraal(a1));
    helling = { x0, z0, x1, z1, ex: (x1 - x0) / len, ez: (z1 - z0) / len, len, hA, hB, a0, a1 };

    // Het zandpaadje van de springweide tot net voor de hellingbaan.
    const px = x0 - helling.ex * 3;
    const pz = z0 - helling.ez * 3;
    const pl = Math.hypot(px - padBegin[0], pz - padBegin[1]);
    pad = { x0: padBegin[0], z0: padBegin[1], x1: px, z1: pz, ex: (px - padBegin[0]) / pl, ez: (pz - padBegin[1]) / pl, len: pl };

    // De ravijnen: gelijk verdeeld over het stuk ring buiten het kamp en de hellingbaan, met wat speling.
    const n = RV.aantal[0] + w.geheel(RV.aantal[1] - RV.aantal[0] + 1);
    const lo = Math.min(-RV.vrijKamp, Math.min(a0, a1) - RV.vrijKamp);
    const hi = Math.max(RV.vrijKamp, Math.max(a0, a1) + RV.vrijKamp);
    const vrij = TWEE_PI - (hi - lo);
    const tussen = vrij / n;
    for (let i = 0; i < n; i++) {
      const speling = ((w.geheel(1001) / 1000) * 2 - 1) * RV.spreiding * tussen;
      let a = hi + (i + 0.5) * tussen + speling;
      a = hoekVerschil(a, 0);
      const voet = randStraal(a) + half;
      const kop = voetStraal(a) + 2;
      const [vx, vz] = punt(a, voet);
      const vloer = laagland(vx, vz) - RV.geul;
      const hoogste = binnenHoogte(...punt(a, kop), kop, a, randStraal(a), voetStraal(a));
      ravijnen.push({ a, voet, kop, vloer, breed: RV.bodem + Math.max(6, (hoogste - vloer) / RV.wandSteilte) + 2 });
    }
  }

  const tmp = /** @type {BergUit} */ ({});

  /**
   * De hoogte met de berg erbij, op (x, z), gegeven de hoogte L van het laagland daar.
   * @param {number} x @param {number} z @param {number} L @param {BergUit} uit
   */
  function berg(x, z, L, uit = tmp) {
    uit.wand = 0;
    uit.voet = 0;
    uit.pad = 0;
    uit.vlak = 0;
    uit.open = 0;
    uit.berg = 0;
    uit.top = 0;
    uit.ravijn = 0;
    let h = L;

    // Het zandpaadje naar de hellingbaan.
    if (pad) {
      const ux = x - pad.x0;
      const uz = z - pad.z0;
      const s = Math.min(pad.len, Math.max(0, ux * pad.ex + uz * pad.ez));
      const dd = Math.hypot(ux - pad.ex * s, uz - pad.ez * s);
      if (dd < HB.pad * 2) uit.pad = 1 - glad((dd - HB.pad * 0.6) / HB.pad);
    }

    const dx = x - C.x;
    const dz = z - C.z;
    const r = Math.hypot(dx, dz);
    if (r > maxStraal) return h;
    const a = Math.atan2(dx, -dz);
    const R1 = randStraal(a);
    const Rc = voetStraal(a);

    // De rotsrand met de etage (en de bergtop) erboven. De wand springt grillig voor en achteruit.
    const grillig = et.grillig * lagenruis(x / et.grilligSchaal, z / et.grilligSchaal, zRand + 3, 2);
    if (r < R1 + half + grillig + 0.5) {
      const binnen = binnenHoogte(x, z, r, a, R1, Rc, uit);
      const c = gladder((R1 + half + grillig - r) / et.wand);
      h = L + (binnen - L) * c;
      uit.berg = c;
      if (c > 0.03 && c < 0.97) uit.wand = 1;
      // Open grasplekken op de etage (niet tegen de rotsrand of de kegel aan).
      if (c >= 1 && r > Rc + 6) {
        const o = waardenruis(x / E.open.schaal, z / E.open.schaal, zOpen);
        uit.open = glad((o - E.open.drempel) / E.open.zacht) * glad((r - Rc - 6) / 8) * glad((R1 - half - r - 4) / 6);
      }
      uit.open = Math.max(uit.open, uit.top);
      uit.vlak = uit.top;
    }
    // Vlak voor de rotsrand: daar liggen losse rotsblokken.
    const vr = r - (R1 + half + grillig);
    if (vr > -1 && vr < 9) uit.voet = 1 - glad(Math.abs(vr - 2.5) / 4.5);

    // De ravijnen: een sleuf met steile wanden, van de voet van de kegel tot in het laagland.
    for (const rv of ravijnen) {
      if (r < rv.kop || r > rv.voet + RV.uitloop) continue;
      const da = hoekVerschil(a, rv.a);
      if (Math.abs(da) > 0.6) continue;
      const q = Math.abs(r * Math.sin(da));
      if (q > rv.breed) continue;
      if (r <= rv.voet) {
        const vloer = rv.vloer + RV.vloerStijging * (rv.voet - r);
        const doel = vloer + Math.max(0, q - RV.bodem) * RV.wandSteilte;
        if (doel < h) {
          const k = glad((r - rv.kop) / RV.kopWand);
          const nieuw = h + (doel - h) * k;
          if (h - nieuw > 0.6 && (q > RV.bodem * 0.8 || k < 0.97)) uit.wand = 1;
          uit.ravijn = Math.max(uit.ravijn, (1 - glad((q - RV.bodem) / 2)) * k);
          uit.open = 0;
          h = nieuw;
        }
      } else {
        // In het laagland: een ondiep geultje dat uitdooft.
        const f = 1 - glad((r - rv.voet) / RV.uitloop);
        const prof = 1 - glad((q - RV.bodem) / 5);
        h -= RV.geul * f * prof;
        uit.ravijn = Math.max(uit.ravijn, f * prof);
        uit.voet *= 1 - prof;
      }
    }

    // De hellingbaan: een vlakke strook die schuin langs de rotsrand omhoog loopt.
    if (helling) {
      const ux = x - helling.x0;
      const uz = z - helling.z0;
      const s = ux * helling.ex + uz * helling.ez;
      const q = Math.abs(uz * helling.ex - ux * helling.ez);
      if (s > -6 && s < helling.len + 6 && q < HB.breedte + HB.rand) {
        const t = Math.min(1, Math.max(0, s / helling.len));
        const hr = helling.hA + (helling.hB - helling.hA) * t;
        const k = (1 - glad((q - HB.breedte) / HB.rand)) * (1 - glad(Math.max(-s, s - helling.len) / 6));
        h += (hr - h) * k;
        uit.pad = Math.max(uit.pad, k);
        uit.vlak = Math.max(uit.vlak, k);
        if (k > 0.5) {
          uit.wand = 0;
          uit.voet = 0;
        }
      }
    }
    return h;
  }

  return {
    midden: C,
    grenzen,
    /** Hoe ver (x, z) van de kust ligt, gemeten naar de top toe (negatief = in zee). */
    kustAfstand(x, z) {
      const a = Math.atan2(x - C.x, C.z - z);
      return kustStraal(a) - Math.hypot(x - C.x, z - C.z);
    },
    kustStraal,
    randStraal,
    voetStraal,
    bouw,
    berg,
    /** De top: het midden van het plateau. */
    top: { x: C.x, z: C.z, h: T.hoogte, plateau: T.plateau },
    get ravijnen() {
      return ravijnen;
    },
    get hellingbaan() {
      return helling;
    },
    get pad() {
      return pad;
    },
    /** Punt op afstand r van de top, in richting a. */
    punt,
  };
}
