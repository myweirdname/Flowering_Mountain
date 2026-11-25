// Klimmen (stap 9, KL 5 tot 8): vier ledematen op grepen, de romp die zich schikt, zetten die tijd kosten,
// automatische voeten, kracht per arm, uitschudden, en toprope met de witte tijger.
// Stap 15a (KL 3 tot 7): steil en ondersteboven. Greeprichting en leunen (de zuinigste houding volgt de goede
// trekrichting van elke greep), balans (openzwaaien, een voet die vlagt), haken en een hakhaak, voeten los (in een
// overhang of dak zwaai je dan uit), staan op een richel, de knieklem met vleermuisrust, de dyno en magnesium.
// Onder een dak val en zak je vrij in het touw (3D), want daar hang je niet meer tegen de wand.
// De speler doet een zet via de intentie: `klimGreep` (id van een greep) en eventueel `klimLid` ('lh' of 'rh'
// als je zelf een hand sleept; leeg = "tikken": het spel kiest de hand). Geen Three.js.
import { LEDEN, KANT, ANDERE, isHand, rustHouding, kanNaar, kruist, schik, fout, reik, wortel } from '../klimmen/houding.js';
import { rekenBelasting, werkKrachtBij, houdtVast, greepNu } from '../klimmen/kracht.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const klem = (x, a, b) => (x < a ? a : x > b ? b : x);
const graden = Math.PI / 180;

/** @typedef {{ greep: number, u: number, v: number, hak?: boolean }} Plek greep -1 = de grond, -2 en lager = een richel */

/** De klimtoestand van een speler die op de wand staat. */
function maakKlim(route, besturing, K) {
  return {
    route,
    toestand: 'op',      // 'op' (op de wand stappen) | 'klimt' | 'val' | 'hangt' | 'terug' | 'boven' | 'zakt' | 'uitstap'
    wand: 0,             // op welke wand (0 = de oefenrots, daarna de klimwanden van de berg, en de dakvleugel)
    t: 0,
    P: [0, 0],           // de romp: het midden van de heupen, op de wandkaart
    /** @type {Record<string, Plek | null>} */
    op: { lh: null, rh: null, lv: null, rv: null },
    /** @type {null | { lid: string, van: number[], naar: Plek, t: number, duur: number, Pvan: number[], Pnaar: number[] }} */
    zet: null,
    /** @type {{ lid: string, naar: Plek | null }[]} */
    rij: [],             // geplande zetten (bv. eerst de voeten hoger, dan de hand). naar = null: die voet laat los
    /** @type {null | { greep: number, lid: string | null }} */
    wacht: null,         // een tik tijdens een zet: die komt erna
    hand: {
      lh: { pomp: 0, last: 0, kwaliteit: 0, verhouding: 0, buig: 0 },
      rh: { pomp: 0, last: 0, kwaliteit: 0, verhouding: 0, buig: 0 },
    },
    los: { lh: 0, rh: 0 }, // weggegleden hand: seconden tot ze haar greep terugpakt
    schudt: null,          // de hand die uitschudt
    besturing,
    leun: [0, 0],
    armBelasting: 0,
    steilte: 0,
    /** @type {null | { P: number[], op: Record<string, Plek | null> }} */
    stabiel: null,         // de laatste houding met vier ledematen vast: daar pak je na een val terug
    hoogste: 0,
    valVan: [0, 0],
    zakU: 0,
    actieVorige: false,
    zakVorige: false,
    // --- Stap 15a ---
    krijt: { lh: 0, rh: 0 },        // magnesium: zoveel handzetten heeft die hand nog betere grip
    krijtBeurten: K.magnesium.beurten,
    /** @type {string | null} */
    krijtHand: null,                // de hand die nu in het pofzakje zit
    krijtT: 0,
    krijtVorige: false,
    /** @type {null | { fase: string, t: number, greep: number, vast: boolean, handenLos: boolean, voor: { P: number[], op: any } }} */
    vleermuis: null,                // in de knieklem: ondersteboven rusten met beide handen los
    /** @type {any} */
    dyno: null,                     // { fase: 'laad' | 'vlucht', t, laad, richting, auto, doelLaad, greep, lid, P0, P1, doel }
    springVorige: false,
    springKlaar: false,             // de springknop is losgelaten sinds de vorige dyno (of sinds je aan de wand stapte)
    voetZoek: 0,                    // voeten los: aftellen tot ze weer steun zoeken
    zwaaiOpen: 0,                   // de deur die openzwaait (0..1) en naar welke kant
    zwaaiKant: 0,
    staat: false,                   // twee voeten op een richel: staan zonder handen
    /** @type {string | null} */
    vlag: null,                     // de voet die opzij vlagt (los), terwijl de andere staat
    /** @type {any} */
    vrij: null,                     // vrij in het touw onder een dak: { pos, ... } (3D)
  };
}

/**
 * @param {any} s speler
 * @param {any} rots de wand (oefenrots, bergwand of dakvleugel)
 * @param {number} ri route
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 */
export function beginKlimmen(s, rots, ri, K, meld, besturing = K.besturing.standaard) {
  const L = K.lichaam;
  const r = rots.routes[ri];
  const k = maakKlim(ri, besturing, K);
  const [gl, gr] = r.startGrepen.map((id) => rots.grepen[id]);
  k.op.lh = { greep: gl.id, u: gl.u, v: gl.v };
  k.op.rh = { greep: gr.id, u: gr.u, v: gr.v };
  k.op.lv = { greep: -1, u: r.startU - L.heup - 0.04, v: 0 };
  k.op.rv = { greep: -1, u: r.startU + L.heup + 0.04, v: 0 };
  rustHouding(L, punten(k), [0, 0], k.P, ideaalVan(k.op, rots, K));
  k.stabiel = { P: [...k.P], op: kopie(k.op) };
  s.modus = 'klimmen';
  s.klim = k;
  s.vel = [0, 0, 0];
  s.klimVan = [...s.pos];
  zetPos(s, rots, K);
  s.vorigePos = [...s.pos];
  meld({ soort: 'klimStart', speler: s.id, route: ri });
  return k;
}

/** Stopt het klimmen meteen (bv. bij "terug naar veilige grond", of beneden na het laten zakken). */
export function stopKlimmen(s, rots, K) {
  const k = s.klim;
  if (!k) return;
  if (k.vrij) {
    // Vrij in het touw gezakt (onder een dak): je landt waar je hangt.
    s.pos = [k.vrij.pos[0], rots.voetHoogte, k.vrij.pos[2]];
  } else {
    const p = rots.naarWereld(k.P[0], 0, 0.7);
    s.pos = [p[0], rots.voetHoogte, p[2]];
  }
  s.vorigePos = [...s.pos];
  s.vel = [0, 0, 0];
  s.richting = s.vorigeRichting = Math.atan2(rots.N[0], rots.N[2]);
  s.modus = 'lopen';
  s.klim = null;
  s.opGrond = true;
}

const UITSTAP_DUUR = 0.9;

/** Bovenaan een klimwand van de berg: uitstappen op de pijler, met je neus naar de berg (stap 13). */
function uitstappen(s, rots, meld) {
  const k = s.klim;
  const p = rots.uitstap(k.route);
  s.pos = [p[0], p[1], p[2]];
  s.vorigePos = [...s.pos];
  s.vel = [0, 0, 0];
  s.richting = s.vorigeRichting = Math.atan2(-rots.N[0], -rots.N[2]);
  s.modus = 'lopen';
  s.klim = null;
  s.opGrond = true;
  s.veilig = [...s.pos];
  meld({ soort: 'uitgestapt', speler: s.id, route: k.route, wand: k.wand, pos: [...s.pos] });
}

const kopie = (op) => Object.fromEntries(LEDEN.map((l) => [l, op[l] ? { ...op[l] } : null]));

/** De punten die nu vastzitten (een hand onderweg, die uitschudt, weggleed of in het pofzakje zit, telt niet mee). */
function punten(k, zonder = null, K = null) {
  const p = { lh: null, rh: null, lv: null, rv: null };
  for (const lid of LEDEN) {
    const o = k.op[lid];
    if (!o || lid === zonder || k.zet?.lid === lid || k.schudt === lid || k.krijtHand === lid || (isHand(lid) && k.los[lid] > 0)) continue;
    p[lid] = !isHand(lid) && o.hak && K ? [o.u, o.v, K.dak.hakBovenHeup] : [o.u, o.v];
  }
  return p;
}
/** Zelfde als punten(), maar met de hakhaken erbij (hun voet mag hoger staan). */
const pts = (k, K, zonder = null) => punten(k, zonder, K);

/**
 * Per hand waar de schouder het best zit (KL 4, 5): in de goede trekrichting van haar greep, met de arm zo gestrekt
 * als die greep vraagt. Een gewone greep: eronder, maar onder een dak bijna recht eronder in 3D (op de kaart dus
 * vlak bij de greep). Een zijgreep: opzij. Een ondergreep: erboven.
 */
function ideaalVan(op, rots, K) {
  const L = K.lichaam;
  /** @type {Record<string, number[]>} */
  const uit = {};
  for (const lid of ['lh', 'rh']) {
    const o = op[lid];
    if (!o || o.greep < 0) continue;
    const g = rots.grepen[o.greep];
    const G = K.grepen[g.soort];
    const a = (g.richting ?? 0) * graden;
    const gewoon = Math.abs(g.richting ?? 0) < 30;
    const lang = (G.hang ?? 0.96) * L.arm * (gewoon ? Math.max(0.2, Math.cos(rots.wandHoek(g.v) * graden)) : 1);
    // Het gewicht: hoe kieskeuriger de greep (een ondergreep, een rand), hoe meer de houding naar haar luistert.
    uit[lid] = [Math.sin(a) * lang, -Math.cos(a) * lang, 1.05 - (G.dwars ?? 0.5)];
  }
  return uit;
}

/** De wereldpositie van de speler is het midden van de heupen (voor de camera, de tijger en de bloesems). */
function zetPos(s, rots, K) {
  const k = s.klim;
  if (k.vrij) {
    s.pos[0] = k.vrij.pos[0];
    s.pos[1] = k.vrij.pos[1];
    s.pos[2] = k.vrij.pos[2];
    return;
  }
  if (k.vleermuis) {
    // In de knieklem hangen de heupen onder de knieën.
    const g = rots.grepen[k.vleermuis.greep];
    const f = glad(k.vleermuis.fase === 'in' ? k.vleermuis.t / K.knieklem.inDuur : k.vleermuis.fase === 'uit' ? 1 - k.vleermuis.t / K.knieklem.uitDuur : 1);
    const a = rots.naarWereld(k.P[0], k.P[1], K.lichaam.wandAfstand);
    const b = rots.naarWereld(g.u, g.v, 0.5);
    for (let i = 0; i < 3; i++) s.pos[i] = a[i] + (b[i] - a[i]) * f;
    return;
  }
  rots.naarWereld(k.P[0], k.P[1], K.lichaam.wandAfstand + 0.25 * Math.max(0, k.steilte), s.pos);
}

/** Heeft deze wand een dak of een overhang waaronder je vrij in het touw komt te hangen? */
const vrijeWand = (rots) => rots.randV != null;

/**
 * Eén tijdstap op de wand.
 * @param {any} s @param {any} int intentie @param {any} rots
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 */
export function stapKlimmen(s, int, rots, K, dt, meld) {
  const k = s.klim;
  const L = K.lichaam;
  k.t += dt;
  if (int.besturing && int.besturing !== k.besturing) {
    k.besturing = int.besturing;
    meld({ soort: 'besturing', speler: s.id, besturing: k.besturing });
  }
  const B = K.besturing[k.besturing] ?? K.besturing.handen;
  const lb = int.leun ?? [0, 0];
  k.leun[0] = klem(lb[0], -1, 1) * K.besturing.leunen.opzij;
  k.leun[1] = klem(lb[1], -1, 1) * K.besturing.leunen.omhoog;

  const zakNu = !!int.zakken && !k.zakVorige;
  k.zakVorige = !!int.zakken;

  switch (k.toestand) {
    case 'op':
      // Even op de wand stappen (het beeld schuift de klimster van de grond naar haar startgrepen).
      if (k.t > 0.45) naar(k, 'klimt');
      break;
    case 'klimt':
      if (zakNu) {
        naarZakken(s, k, rots, K, meld);
        break;
      }
      klimStap(s, k, int, rots, K, B, dt, meld);
      break;
    case 'val': {
      if (k.vrij) {
        // Onder een dak: je valt van de wand weg en zwaait in het touw naar onder het scharnierpunt (de dakrand of
        // het anker), een eind van de wand, vrij door de lucht.
        const v = k.vrij;
        const f = glad(k.t / v.duur);
        const r = v.lengte0 + (v.lengte + K.touw.rek - v.lengte0) * f;
        const a = v.hoekVan + (v.hoekNaar - v.hoekVan) * f;
        zetVrij(v, r, a);
        if (k.t >= v.duur) {
          naar(k, 'hangt');
          for (const lid of ['lh', 'rh']) k.hand[lid].pomp = Math.max(0, k.hand[lid].pomp - K.kracht.naVal);
          meld({ soort: 'touwRuk', speler: s.id, pos: [...s.pos] });
          v.lengte = r;
        }
        break;
      }
      // Een fractie vertraagd, dan het touw: je zakt een stukje en zwaait naar onder het anker.
      const f = glad(k.t / K.touw.valDuur);
      const a = rots.anker(k.route);
      k.P[1] = k.valVan[1] - K.touw.rek * f * f;
      k.P[0] = k.valVan[0] + (a[0] - k.valVan[0]) * 0.25 * f;
      if (k.t >= K.touw.valDuur) {
        naar(k, 'hangt');
        for (const lid of ['lh', 'rh']) k.hand[lid].pomp = Math.max(0, k.hand[lid].pomp - K.kracht.naVal);
        meld({ soort: 'touwRuk', speler: s.id, pos: [...s.pos] });
      }
      break;
    }
    case 'hangt':
      // Even hangen in het touw en uitblazen (onder een dak: nazwaaien).
      if (k.vrij) {
        const v = k.vrij;
        zetVrij(v, v.lengte, v.hoekNaar + Math.sin(k.t * 2.6) * 0.18 * Math.exp(-k.t * 1.3));
      } else k.P[0] += Math.sin(k.t * 3.1) * 0.06 * dt * (1 - k.t / K.touw.hangDuur);
      if (zakNu || k.t >= K.touw.hangDuur * (k.vrij ? 1.4 : 1)) {
        if (zakNu) {
          naarZakken(s, k, rots, K, meld);
          break;
        }
        naar(k, 'terug');
        k.valVan = [...k.P];
        if (k.vrij) k.vrij.terugVan = [...k.vrij.pos];
      }
      break;
    case 'terug': {
      // De tijger trekt het touw in; je pakt dezelfde grepen opnieuw.
      const duur = K.touw.terugDuur * (k.vrij ? 1.6 : 1);
      const f = glad(k.t / duur);
      const doel = k.stabiel.P;
      if (k.vrij) {
        const naarP = rots.naarWereld(doel[0], doel[1], L.wandAfstand);
        const van = k.vrij.terugVan;
        for (let i = 0; i < 3; i++) k.vrij.pos[i] = van[i] + (naarP[i] - van[i]) * f;
        k.vrij.pos[1] += Math.sin(f * Math.PI) * 0.25; // een boogje: de tijger hijst je eerst wat op
      } else {
        k.P[0] = k.valVan[0] + (doel[0] - k.valVan[0]) * f;
        k.P[1] = k.valVan[1] + (doel[1] - k.valVan[1]) * f;
      }
      if (k.t >= duur) {
        k.op = kopie(k.stabiel.op);
        k.P = [...doel];
        k.vrij = null;
        k.vlag = null;
        naar(k, 'klimt');
        meld({ soort: 'opnieuw', speler: s.id });
      }
      break;
    }
    case 'boven':
      // Boven! Op een klimwand van de berg stap je uit op de etage (stap 13); op de oefenrots laat de tijger
      // je na een tijdje zakken.
      if (rots.uitstap && !zakNu) {
        if (k.t >= K.touw.bovenWacht * 0.45) {
          k.valVan = [...k.P];
          naar(k, 'uitstap');
        }
        break;
      }
      if (zakNu || k.t >= K.touw.bovenWacht) naarZakken(s, k, rots, K, meld);
      break;
    case 'uitstap': {
      // Over de rand klauteren: de heupen gaan omhoog tot boven de rand, dan sta je op de pijler.
      const f = glad(k.t / UITSTAP_DUUR);
      k.P[1] = k.valVan[1] + (rots.hoogte + 0.2 - k.valVan[1]) * f;
      if (k.t >= UITSTAP_DUUR) {
        uitstappen(s, rots, meld);
        return;
      }
      break;
    }
    case 'zakt': {
      const snel = Math.max(K.touw.zakSnelheid, rots.hoogte / 7) * glad(k.t / 0.5);
      if (k.vrij) {
        // Vrij in het touw: eerst naar de lijn onder het scharnierpunt, dan recht omlaag tot op de grond.
        const v = k.vrij;
        v.pos[0] += (v.lijn[0] - v.pos[0]) * Math.min(1, dt * 1.6);
        v.pos[2] += (v.lijn[2] - v.pos[2]) * Math.min(1, dt * 1.6);
        v.pos[1] -= snel * dt;
        if (v.pos[1] <= rots.voetHoogte + L.minHeup + 0.3) {
          meld({ soort: 'beneden', speler: s.id, route: k.route });
          stopKlimmen(s, rots, K);
          return;
        }
        break;
      }
      // Laten zakken: handen aan het touw, voeten lopen tegen de wand naar beneden (op een hoge wand wat sneller).
      k.P[1] -= snel * dt;
      k.P[0] += (k.zakU - k.P[0]) * Math.min(1, dt * 0.8);
      // Onder de kopwand begint het dak: vanaf daar hang je vrij (stap 15a).
      if (vrijeWand(rots) && k.P[1] < rots.randV + 0.45) {
        k.vrij = maakVrij(s, k, rots, K);
        break;
      }
      if (k.P[1] <= L.minHeup + 0.12) {
        meld({ soort: 'beneden', speler: s.id, route: k.route });
        stopKlimmen(s, rots, K);
        return;
      }
      break;
    }
  }
  zetPos(s, rots, K);
}

/**
 * Vrij in het touw onder een dak (stap 15a, KL 8): het touw loopt van het anker over de dakrand naar je gordel.
 * Het scharnierpunt is de dakrand (als je eronder hangt) of het anker. Rekent in een verticaal vlak door het
 * scharnierpunt: een hoek (0 = recht eronder) en een lengte.
 */
function maakVrij(s, k, rots, K) {
  const a = rots.anker(k.route);
  const onder = rots.randV != null && k.P[1] < rots.randV + 0.5;
  const spil = onder ? rots.naarWereld(a[0], rots.randV, 0.1) : rots.naarWereld(a[0], a[1], 0.1);
  const pos = [...s.pos];
  const dx = pos[0] - spil[0];
  const dz = pos[2] - spil[2];
  const dy = pos[1] - spil[1];
  const h = Math.hypot(dx, dz);
  const lengte = Math.max(0.6, Math.hypot(h, dy));
  // De richting in het horizontale vlak (van het scharnier naar de klimster): daarin zwaait ze.
  const rx = h > 1e-3 ? dx / h : -rots.N[0];
  const rz = h > 1e-3 ? dz / h : -rots.N[2];
  const hoekVan = Math.atan2(h, -dy);
  // Toprope: een kleine zak in het touw (KL 8). De tijger neemt het touw in terwijl je uitzwaait, zodat je hooguit
  // ±1 m onder je valplek hangt (en nooit lager dan 1,1 m boven de grond).
  const maxL = Math.max(0.5, Math.min(spil[1] - rots.voetHoogte - 1.1, spil[1] - pos[1] + 0.6 - K.touw.rek));
  const v = {
    pos, spil, rx, rz, lengte0: lengte, lengte: Math.min(lengte, maxL), hoekVan, hoekNaar: 0, duur: K.touw.valDuur * 2.4,
    lijn: [spil[0] + rots.N[0] * 0.35, 0, spil[2] + rots.N[2] * 0.35], terugVan: null,
  };
  return v;
}
function zetVrij(v, r, a) {
  const h = Math.sin(a) * r;
  v.pos[0] = v.spil[0] + v.rx * h;
  v.pos[1] = v.spil[1] - Math.cos(a) * r;
  v.pos[2] = v.spil[2] + v.rz * h;
}

/** De verhouding belasting/kwaliteit als deze hand alles alleen moet dragen. */
function alleen(k, lid, K) {
  const h = k.hand[lid];
  return h.kwaliteit > 0 ? (k.armBelasting * (1 + K.kracht.gebogen * (h.buig ?? 0))) / h.kwaliteit : 99;
}

function naar(k, toestand) {
  k.toestand = toestand;
  k.t = 0;
}

function naarZakken(s, k, rots, K, meld) {
  const vrijNu = vrijeWand(rots) && (k.vrij || k.P[1] < rots.randV + 0.45);
  if (vrijNu && !k.vrij) k.vrij = maakVrij(s, k, rots, K);
  naar(k, 'zakt');
  k.zet = null;
  k.rij = [];
  k.wacht = null;
  k.schudt = null;
  k.krijtHand = null;
  k.vleermuis = null;
  k.dyno = null;
  k.op = { lh: null, rh: null, lv: null, rv: null };
  k.zakU = rots.routes[k.route].startU;
  meld({ soort: 'zakken', speler: s.id });
}

function vallen(s, k, rots, K, meld) {
  naar(k, 'val');
  k.valVan = [...k.P];
  k.zet = null;
  k.rij = [];
  k.wacht = null;
  k.schudt = null;
  k.krijtHand = null;
  k.vleermuis = null;
  k.dyno = null;
  k.los = { lh: 0, rh: 0 };
  // Onder een dak (of in de overhang eronder) val je van de wand weg, vrij in het touw.
  if (vrijeWand(rots) && k.P[1] < rots.randV + 0.3 && rots.steilte(k.P[1] + 0.2) > 0.2) k.vrij = maakVrij(s, k, rots, K);
  meld({ soort: 'val', speler: s.id, pos: [...s.pos] });
}

/** Een knieklem van deze route binnen bereik van de heupen (in een overhang of dak), of null. */
function knieklemBij(k, rots, K) {
  let beste = null;
  let d0 = K.knieklem.bereik;
  for (const id of rots.routes[k.route].ids) {
    const g = rots.grepen[id];
    if (g.soort !== 'knieklem' || rots.steilte(g.v) < K.knieklem.steil) continue;
    const d = Math.hypot(g.u - k.P[0], g.v - k.P[1]);
    if (d < d0) {
      d0 = d;
      beste = g;
    }
  }
  return beste;
}

/** In de knieklem: beide handen los en ondersteboven rusten (KL 5). vast = blijft tot je op een greep tikt. */
function naarVleermuis(s, k, g, vast, meld) {
  k.vleermuis = { fase: 'in', t: 0, greep: g.id, vast, handenLos: false, voor: { P: [...k.P], op: kopie(k.op) } };
  k.zet = null;
  k.rij = [];
  k.schudt = null;
  meld({ soort: 'vleermuis', speler: s.id, pos: [...s.pos] });
}

/** Het eigenlijke klimmen: zetten, rusten, kracht. */
function klimStap(s, k, int, rots, K, B, dt, meld) {
  const L = K.lichaam;
  const G = rots.grepen;
  const actie = !!int.actie;
  const springNu = !!int.spring;
  const krijtNu = !!int.magnesium && !k.krijtVorige;
  k.krijtVorige = !!int.magnesium;

  // --- In de knieklem: ondersteboven rusten ---
  if (k.vleermuis) {
    const vm = k.vleermuis;
    vm.t += dt;
    if (int.klimGreep != null && int.klimGreep >= 0 && G[int.klimGreep]?.soort !== 'knieklem') k.wacht = { greep: int.klimGreep, lid: int.klimLid ?? null };
    if (vm.fase === 'in') {
      if (vm.t >= K.knieklem.inDuur * 0.45) vm.handenLos = true;
      if (vm.t >= K.knieklem.inDuur) {
        vm.fase = 'hangt';
        vm.t = 0;
      }
    } else if (vm.fase === 'hangt') {
      const weg = vm.vast ? !!k.wacht || (actie && !k.actieVorige) : !actie;
      if (weg) {
        vm.fase = 'uit';
        vm.t = 0;
      }
    } else if (vm.t >= K.knieklem.uitDuur * 0.55 && vm.handenLos) {
      vm.handenLos = false;
    }
    if (vm.fase === 'uit' && vm.t >= K.knieklem.uitDuur) {
      k.op = kopie(vm.voor.op);
      k.P = [...vm.voor.P];
      k.vleermuis = null;
      meld({ soort: 'vleermuisUit', speler: s.id });
      if (k.wacht) {
        const w = k.wacht;
        k.wacht = null;
        vraagZet(s, k, w.greep, w.lid, rots, K, meld);
      }
    }
    k.actieVorige = actie;
    rekenBelasting(k, K, rots);
    werkKrachtBij(k, K, B, dt);
    return;
  }

  // --- De dyno: opladen (inzakken en richten), springen, grijpen (KL 7) ---
  if (k.dyno) {
    stapDyno(s, k, int, rots, K, B, dt, meld, springNu);
    k.springVorige = springNu;
    k.actieVorige = actie;
    return;
  }
  // Een nieuwe druk op de springknop mag starten zodra de klimster klaar is (ook als ze nog even bezig was).
  if (!springNu) k.springKlaar = true;
  if (springNu && k.springKlaar && !k.zet && !k.rij.length && !k.schudt && !k.krijtHand && k.los.lh <= 0 && k.los.rh <= 0 && k.op.lh && k.op.rh) {
    k.springKlaar = false;
    k.dyno = { fase: 'laad', t: 0, laad: 0, richting: [0, 1], auto: false };
    meld({ soort: 'dynoLaad', speler: s.id });
  }
  k.springVorige = springNu;

  // --- Een nieuwe zet gevraagd? ---
  if (int.klimGreep != null && int.klimGreep >= 0) {
    if (k.zet || k.rij.length || k.krijtHand) k.wacht = { greep: int.klimGreep, lid: int.klimLid ?? null };
    else vraagZet(s, k, int.klimGreep, int.klimLid ?? null, rots, K, meld);
    if (k.vleermuis || k.dyno) {
      k.actieVorige = actie;
      return;
    }
  }

  // --- Magnesium: een hand in het pofzakje (KL 6) ---
  if (krijtNu && !k.zet && !k.rij.length && !k.schudt && !k.krijtHand && k.los.lh <= 0 && k.los.rh <= 0) {
    if (k.krijtBeurten <= 0) meld({ soort: 'geenKrijt', speler: s.id });
    else {
      const kies = ['lh', 'rh']
        .filter((l) => k.op[l] && k.op[ANDERE[l]] && alleen(k, ANDERE[l], K) < K.kracht.glijGrens * 0.85)
        .sort((a, b) => k.krijt[a] - k.krijt[b] || k.hand[b].pomp - k.hand[a].pomp);
      if (kies.length) {
        k.krijtHand = kies[0];
        k.krijtT = 0;
        meld({ soort: 'krijt', speler: s.id, lid: kies[0] });
      } else meld({ soort: 'nietSchudden', speler: s.id });
    }
  }
  if (k.krijtHand) {
    k.krijtT += dt;
    if (k.krijtT >= K.magnesium.duur) {
      const lid = k.krijtHand;
      k.krijtHand = null;
      k.krijt[lid] = K.magnesium.zetten;
      k.krijtBeurten--;
      meld({ soort: 'krijtKlaar', speler: s.id, lid, beurten: k.krijtBeurten });
      begin(k, { lid, naar: k.op[lid] }, rots, K, true);
    }
  }

  // --- Uitschudden: actieknop ingedrukt houden (KL 6); in de buurt van een knieklem: vleermuisrust ---
  if (actie && !k.schudt && !k.zet && !k.rij.length && !k.krijtHand && k.los.lh <= 0 && k.los.rh <= 0) {
    const kk = !k.actieVorige && k.op.lh && k.op.rh ? knieklemBij(k, rots, K) : null;
    if (kk) {
      naarVleermuis(s, k, kk, false, meld);
      k.actieVorige = actie;
      return;
    }
    const lid = k.hand.lh.pomp >= k.hand.rh.pomp ? 'lh' : 'rh';
    // Kan de andere hand het even alleen? (ze draagt dan alles)
    if (k.op[lid] && k.op[ANDERE[lid]] && alleen(k, ANDERE[lid], K) < K.kracht.glijGrens * 0.85) {
      k.schudt = lid;
      meld({ soort: 'schudden', speler: s.id, lid });
    } else if (!k.actieVorige) meld({ soort: 'nietSchudden', speler: s.id });
  } else if (!actie && k.schudt) {
    // Loslaten: de hand pakt haar greep terug.
    const lid = k.schudt;
    k.schudt = null;
    begin(k, { lid, naar: k.op[lid] }, rots, K, true);
  }
  k.actieVorige = actie;

  // --- De zet die bezig is ---
  if (k.zet) {
    const z = k.zet;
    z.t += dt;
    const f = glad(Math.min(1, z.t / z.duur));
    k.P[0] = z.Pvan[0] + (z.Pnaar[0] - z.Pvan[0]) * f;
    k.P[1] = z.Pvan[1] + (z.Pnaar[1] - z.Pvan[1]) * f;
    if (z.t >= z.duur) {
      k.op[z.lid] = z.naar;
      k.zet = null;
      if (!isHand(z.lid) && k.vlag === z.lid) k.vlag = null;
      const g = G[z.naar.greep];
      const pos = rots.naarWereld(z.naar.u, z.naar.v, 0.05);
      if (isHand(z.lid)) {
        if (!z.terug) k.krijt[z.lid] = Math.max(0, k.krijt[z.lid] - 1);
        meld({ soort: 'klimGreep', speler: s.id, lid: z.lid, greep: z.naar.greep, greepSoort: g?.soort, pos });
      } else meld({ soort: 'klimVoet', speler: s.id, lid: z.lid, grond: z.naar.greep < 0, hak: !!z.naar.hak && z.naar.v > k.P[1] + 0.05, pos });
      // Een hand op de topgreep: de andere komt erbij, en dan ben je boven.
      if (isHand(z.lid) && g?.top) {
        const ander = ANDERE[z.lid];
        if (k.op[ander]?.greep === g.id) {
          naar(k, 'boven');
          k.rij = [];
          meld({ soort: 'top', speler: s.id, route: k.route, pos });
          return;
        }
        const plan = planHand(k, g, ander, rots, K);
        k.rij = plan ? plan : [];
        if (!plan) {
          naar(k, 'boven');
          meld({ soort: 'top', speler: s.id, route: k.route, pos });
          return;
        }
      } else if (isHand(z.lid) && !k.rij.length) {
        // Na elke handzet stappen de voeten naar de beste plek (KL 7, automatische voeten).
        const v = zoekVoeten(k, rots, K, null);
        if (v) k.rij.push(...v);
      }
      if (k.rij.length) volgende(s, k, rots, K, meld);
      else if (k.wacht) {
        const w = k.wacht;
        k.wacht = null;
        vraagZet(s, k, w.greep, w.lid, rots, K, meld);
      }
    }
  } else if (k.rij.length) {
    volgende(s, k, rots, K, meld);
  } else {
    // Rusten: de romp zakt rustig naar de zuinigste houding (of waar je naartoe leunt).
    const pt = pts(k, K);
    const doel = rustHouding(L, pt, k.leun, [0, 0], ideaalVan(k.op, rots, K));
    const t = Math.min(1, dt * 4);
    k.P[0] += (doel[0] - k.P[0]) * t;
    k.P[1] += (doel[1] - k.P[1]) * t;
    schik(L, k.P, pt, undefined, 6);
    // Voeten los (of één voet die vlagt): ze zoeken af en toe weer steun.
    if ((!k.op.lv || !k.op.rv) && !k.schudt && !k.krijtHand && k.los.lh <= 0 && k.los.rh <= 0) {
      k.voetZoek -= dt;
      if (k.voetZoek <= 0) {
        k.voetZoek = K.dak.voetZoek;
        const v = zoekVoeten(k, rots, K, null);
        if (v && v.length) {
          k.rij.push(...v);
          volgende(s, k, rots, K, meld);
        }
      }
    }
    // Een vrije hand (na een dyno met één hand gevangen): pakt de beste greep binnen bereik.
    if (!k.zet && !k.rij.length && (!k.op.lh || !k.op.rh) && (k.op.lh || k.op.rh) && !k.schudt && !k.krijtHand) {
      const vrij = k.op.lh ? 'rh' : 'lh';
      const plan = besteVrijeGreep(k, vrij, rots, K);
      if (plan) {
        k.rij = plan;
        volgende(s, k, rots, K, meld);
      }
    }
  }

  // --- Weggegleden hand: na een ogenblik pakt ze haar greep terug ---
  for (const lid of ['lh', 'rh']) {
    if (k.los[lid] <= 0) continue;
    k.los[lid] -= dt;
    if (k.los[lid] <= 0) {
      k.los[lid] = 0;
      if (!k.zet) begin(k, { lid, naar: k.op[lid] }, rots, K, true);
      else k.rij.unshift({ lid, naar: k.op[lid] });
    }
  }

  // --- Kracht ---
  rekenBelasting(k, K, rots);
  const los = werkKrachtBij(k, K, B, dt);
  if (los) {
    const ander = ANDERE[los];
    const h = k.hand[ander];
    // Houdt de andere hand het alleen? Dan bengel je even aan één hand.
    const kanAlleen = k.op[ander] && k.zet?.lid !== ander && k.schudt !== ander && k.krijtHand !== ander && k.los[ander] <= 0 &&
      alleen(k, ander, K) < K.kracht.glijGrens && h.pomp < 0.97;
    if (kanAlleen) {
      k.los[los] = K.zet.terugNaGlijden;
      if (k.zet?.lid === los) k.zet = null;
      k.rij = [];
      k.wacht = null;
      meld({ soort: 'handGlijdt', speler: s.id, lid: los, pos: [...s.pos] });
    } else {
      // Vallen: het touw vangt je op (toprope).
      vallen(s, k, rots, K, meld);
      return;
    }
  }

  // De laatste houding met vier ledematen vast onthouden (na een val pak je die opnieuw).
  if (!k.zet && !k.rij.length && !k.schudt && !k.krijtHand && k.los.lh <= 0 && k.los.rh <= 0 && LEDEN.every((l) => k.op[l])) {
    k.stabiel = { P: [...k.P], op: kopie(k.op) };
  }
  k.hoogste = Math.max(k.hoogste, k.P[1]);
}

/** De volgende stap uit de rij: een voet die loslaat (vlaggen, voeten los) gebeurt meteen, een zet duurt even. */
function volgende(s, k, rots, K, meld) {
  while (k.rij.length) {
    const st = k.rij.shift();
    if (st.lid === 'voeten') {
      k.op.lv = k.op.rv = null;
      k.vlag = null;
      meld({ soort: 'voetenLos', speler: s.id, pos: [...s.pos] });
      continue;
    }
    if (!st.naar) {
      k.op[st.lid] = null;
      k.vlag = st.lid;
      continue;
    }
    begin(k, st, rots, K);
    return;
  }
}

/** Start een zet. `terug` = een hand die naar haar eigen greep terugkeert (na uitschudden of wegglijden). */
function begin(k, stap, rots, K, terug = false) {
  const L = K.lichaam;
  const { lid, naar } = stap;
  if (!naar) return;
  const van = k.op[lid] && !terug ? [k.op[lid].u, k.op[lid].v] : hangPlek(k, lid, L);
  const pt = pts(k, K, lid);
  const T = [naar.u, naar.v];
  const kr = kruist(pt, lid, T);
  const op2 = { ...k.op, [lid]: naar };
  const Pnaar = eindHouding(L, k.P, pt, lid, T, kr, ideaalVan(op2, rots, K), 0, naar.hak ? K.dak.hakBovenHeup : undefined);
  const d = Math.hypot(T[0] - van[0], T[1] - van[1]);
  const Z = K.zet;
  const duur = terug
    ? 0.35
    : isHand(lid)
      ? Z.handMin + (Z.handMax - Z.handMin) * klem(d / 0.9, 0, 1)
      : Z.voetMin + (Z.voetMax - Z.voetMin) * klem(d / 0.7, 0, 1);
  k.zet = { lid, van, naar, t: 0, duur, Pvan: [...k.P], Pnaar, terug };
}

/** Hangen beide voeten los (geen van beide op de wand, en niet net onderweg)? */
function voetenLos(k, zonder = null) {
  return ['lv', 'rv'].every((l) => !k.op[l] || l === zonder);
}

/**
 * Waar de romp naartoe schuift tijdens een zet. Een hand: naar de zuinigste houding met de nieuwe greep (of, als
 * die niet kan, de houding waarin de hand er net bij kan). Een voet: het lichaam blijft zo veel mogelijk staan;
 * rechtkomen gebeurt pas daarna (of tijdens de volgende handzet).
 */
function eindHouding(L, P, pt, lid, T, kr, ideaal, minder = 0, boven = undefined) {
  const Tp = boven != null ? [T[0], T[1], boven] : T;
  const met = { ...pt, [lid]: Tp };
  const max = { [lid]: reik(L, lid, kr) * (isHand(lid) ? 1 - minder : 1) };
  if (!isHand(lid)) {
    // Een hoge stap: eerst de voet zetten, pas daarna rechtkomen. Kan het been er vanaf hier bij, dan blijft
    // het lichaam staan, ook als de voet even boven de heup staat.
    const w = wortel(L, P, lid);
    if (Math.hypot(T[0] - w[0], T[1] - w[1]) <= L.been) return [P[0], P[1]];
    const Q = [P[0], P[1]];
    schik(L, Q, met, max, 60);
    return Q;
  }
  const Q = kanNaar(L, P, pt, lid, T, kr, minder) ?? [...P];
  const rust = rustHouding(L, met, [0, 0], [0, 0], ideaal);
  return fout(L, rust, met, max) < 0.006 ? rust : Q;
}

/** Waar een losse hand hangt (naast het lijf). */
function hangPlek(k, lid, L) {
  return [k.P[0] + KANT[lid] * (L.schouder + 0.08), k.P[1] + L.romp - 0.3];
}

/**
 * Vraag om een zet naar greep `id`: met hand `lid`, of (tikken) met de hand die het best uitkomt.
 * Kan het niet, ook niet met de voeten eerst hoger, dan probeert het spel een dyno; anders "te ver".
 * Een tik op de knieklem (in bereik): vleermuisrust tot je weer op een greep tikt.
 */
function vraagZet(s, k, id, lid, rots, K, meld) {
  const g = rots.grepen[id];
  if (!g) return;
  if (g.route !== k.route) {
    meld({ soort: 'andereRoute', speler: s.id, greep: id });
    return;
  }
  if (K.grepen[g.soort].alleenKnie) {
    const kk = knieklemBij(k, rots, K);
    if (kk && kk.id === id && k.op.lh && k.op.rh && !k.schudt && !k.krijtHand) naarVleermuis(s, k, kk, true, meld);
    else meld({ soort: 'teVer', speler: s.id, greep: id });
    return;
  }
  if (K.grepen[g.soort].alleenVoet) {
    meld({ soort: 'teVer', speler: s.id, greep: id, voet: true });
    return;
  }
  if (k.los.lh > 0 || k.los.rh > 0 || k.schudt || k.krijtHand) return;
  let beste = null;
  const kandidaten = lid ? [lid] : kiesHanden(k, g);
  const veilig = K.kracht.glijGrens * 0.8;
  for (const h of kandidaten) {
    const plan = planHand(k, g, h, rots, K);
    // Bij tikken kiest het spel nooit een zet waarbij de andere hand wegglijdt; sleep je zelf, dan mag het.
    if (!plan || (!lid && plan.risico > veilig)) continue;
    beste = plan;
    break; // de eerste goede keuze telt (ze staan op voorkeur)
  }
  if (!beste) {
    // Te ver om gewoon te pakken: misschien met een dyno (KL 7)?
    const d = K.dyno.automatisch?.[k.besturing] !== false ? dynoNaar(k, g, lid, rots, K) : null;
    if (d) {
      k.dyno = d;
      meld({ soort: 'dynoLaad', speler: s.id });
      return;
    }
    meld({ soort: 'teVer', speler: s.id, greep: id });
    return;
  }
  k.rij = beste;
  volgende(s, k, rots, K, meld);
}

/** Bij tikken: welke hand eerst proberen? Niet kruisen, en liefst de laagste hand (die hangt al het langst). */
function kiesHanden(k, g) {
  const score = (lid) => {
    const o = k.op[lid];
    const ander = k.op[ANDERE[lid]];
    if (!o) return 10;
    if (o.greep === g.id) return -99; // die hand zit er al
    let sc = 0;
    if (ander && (KANT[lid] < 0 ? g.u > ander.u + 0.02 : g.u < ander.u - 0.02)) sc -= 3; // zou kruisen
    if (ander && o.v < ander.v - 0.02) sc += 1; // de laagste hand gaat
    if (ander?.greep === g.id) sc += 0.5; // bijpakken
    if (KANT[lid] * (g.u - k.P[0]) > -0.05) sc += 0.8; // de greep ligt aan de kant van deze hand
    sc -= Math.abs(g.u - o.u) * 0.5;
    return sc;
  };
  return ['lh', 'rh'].filter((l) => score(l) > -99).sort((a, b) => score(b) - score(a));
}

/** Een plan om hand `lid` op greep g te krijgen: [voetzetten..., handzet], of null. */
function planHand(k, g, lid, rots, K) {
  const L = K.lichaam;
  const ander = k.op[ANDERE[lid]];
  if (k.op[lid]?.greep === g.id) return null;
  if (K.grepen[g.soort].alleenVoet || K.grepen[g.soort].alleenKnie) return null;
  const bij = ander?.greep === g.id;
  if (bij && !K.grepen[g.soort].bijpakken) return null;
  // Twee handen op één greep: elk aan een kant.
  const naarPlek = { greep: g.id, u: g.u + (bij ? KANT[lid] * 0.06 : 0), v: g.v };
  const T = [naarPlek.u, naarPlek.v];
  const pt = pts(k, K, lid);
  if (!pt.lh && !pt.rh && !pt[ANDERE[lid]]) return null; // nooit zonder handen
  const kr = kruist(pt, lid, T);
  // Veel te ver (hoger dan je ooit reikt vanaf de huidige voeten of handen)? Meteen nee.
  const hoogsteVoet = Math.max(k.op.lv?.v ?? 0, k.op.rv?.v ?? 0, ...['lh', 'rh'].map((l) => (pt[l] ? pt[l][1] - 0.3 : 0)));
  if (T[1] > hoogsteVoet + L.been + L.romp + L.arm + 0.9 || Math.abs(T[0] - k.P[0]) > 1.3) return null;
  const zet = { lid, naar: naarPlek };
  // Met de voeten los reik je 20% minder ver (KL 5).
  const minder = voetenLos(k) ? K.dak.losBereik : 0;
  let direct = null;
  if (kanNaar(L, k.P, pt, lid, T, kr, minder)) {
    direct = metRisico([zet], k, rots, K);
    // Is het zwaar voor de andere hand (bv. aan een ondergreep met de voeten te laag)? Dan eerst de voeten beter.
    if (direct.risico < K.kracht.glijGrens * 0.6) return direct;
  }
  // Voeten eerst (KL 5: om hoog te reiken moeten je voeten eerst hoog).
  const voeten = zoekVoeten(k, rots, K, { lid, T, kr });
  if (voeten && voeten.length) {
    const met = metRisico([...voeten, zet], k, rots, K);
    if (!direct || met.risico < direct.risico) return met;
  }
  if (direct) return direct;
  // In een overhang of dak mag je de voeten loslaten en aan je armen uitzwaaien (KL 5): dan hang je volledig aan
  // de andere hand, maar die hand komt verder.
  if (!minder && rots.steilte(k.P[1] + L.romp * 0.5) >= K.dak.losVanaf) {
    const zonder = { ...pt, lv: null, rv: null };
    if (kanNaar(L, k.P, zonder, lid, T, kr, 0)) return metRisico([{ lid: 'voeten', naar: null }, zet], k, rots, K);
  }
  return null;
}

/**
 * Hoe zwaar wordt het voor de andere hand terwijl deze hand onderweg is? Rekent het plan na en zet `plan.risico`
 * op de grootste verhouding belasting/kwaliteit van de hand die alleen vasthoudt (boven 2,5 glijdt ze weg).
 */
function metRisico(plan, k, rots, K) {
  const L = K.lichaam;
  const z = plan[plan.length - 1];
  const ander = ANDERE[z.lid];
  const op = kopie(k.op);
  const proef = { op, P: k.P, zet: null, schudt: null, krijtHand: null, los: { lh: 0, rh: 0 }, krijt: k.krijt, hand: { lh: {}, rh: {} } };
  const ptsNu = (zonder) => {
    const p = {};
    for (const l of LEDEN) p[l] = op[l] && l !== zonder ? (!isHand(l) && op[l].hak ? [op[l].u, op[l].v, K.dak.hakBovenHeup] : [op[l].u, op[l].v]) : null;
    return p;
  };
  let risico = 0;
  /** Loopt de romp van A naar B (zoals begin() dat doet) en meet onderweg de zwaarste verhouding. */
  const langs = (A, Bp, lid, handen) => {
    proef.zet = { lid };
    for (let i = 0; i <= 5; i++) {
      const f = i / 5;
      proef.P = [A[0] + (Bp[0] - A[0]) * f, A[1] + (Bp[1] - A[1]) * f];
      rekenBelasting(proef, K, rots);
      for (const h of handen) risico = Math.max(risico, proef.hand[h].verhouding || 0);
    }
  };
  /** Waar de romp naartoe gaat bij een zet (zelfde keuze als begin()). */
  const eind = (P, lid, naarP) => {
    const p = ptsNu(lid);
    const T = [naarP.u, naarP.v];
    return eindHouding(L, P, p, lid, T, kruist(p, lid, T), ideaalVan({ ...op, [lid]: naarP }, rots, K), 0, naarP.hak ? K.dak.hakBovenHeup : undefined);
  };
  let P = [...k.P];
  for (const v of plan) {
    if (v.lid === 'voeten') {
      op.lv = op.rv = null;
      continue;
    }
    if (!v.naar) {
      op[v.lid] = null;
      continue;
    }
    const Bp = eind(P, v.lid, v.naar);
    langs(P, Bp, v.lid, isHand(v.lid) ? [ander] : ['lh', 'rh']);
    op[v.lid] = v.naar;
    P = Bp;
  }
  /** @type {any} */ (plan).risico = risico;
  return plan;
}

/**
 * Automatische voeten (KL 7): zoekt de twee voetplekken met de meeste steun die het lichaam in balans houden.
 * Met `doel`: alleen plekken van waaruit die hand erbij kan. Geeft de voetzetten terug (0, 1 of 2), of null.
 * Stap 15a: ook op een richel, een hakhaak boven de heup (in het dak en op de dakrand), en als er voor één voet
 * niets is, vlagt die opzij (los) terwijl de andere staat.
 */
function zoekVoeten(k, rots, K, doel) {
  const L = K.lichaam;
  const G = rots.grepen;
  const pt = pts(k, K, doel?.lid);
  const handen = ['lh', 'rh'].map((l) => pt[l]).filter(Boolean);
  if (!handen.length) return null;
  const hu = handen.reduce((a, p) => a + p[0], 0) / handen.length;
  const laag = Math.min(...handen.map((p) => p[1]));
  const hoog = Math.max(...handen.map((p) => p[1]), doel ? doel.T[1] : -9);
  // De ideale voethoogte: op een gewone verticale wand onder de laagste hand met een gestrekte arm (zoals in de
  // klimproef); houdt een hand een ondergreep, een zijgreep of een greep in de overhang vast, dan onder de zuinigste
  // houding voor die grepen (een ondergreep wil hogere voeten).
  let gewoon = true;
  for (const l of ['lh', 'rh']) {
    if (!pt[l] || !k.op[l] || k.op[l].greep < 0) continue;
    if (Math.abs(G[k.op[l].greep].richting ?? 0) >= 30 || rots.wandHoek(k.op[l].v) >= 20) gewoon = false;
  }
  let ideaal = laag - L.arm - L.romp - L.been * 0.55;
  const idealen = ideaalVan(k.op, rots, K);
  if (!gewoon) {
    const alleenHanden = { lh: pt.lh, rh: pt.rh, lv: null, rv: null };
    const Pid = rustHouding(L, alleenHanden, [0, 0], [0, 0], idealen);
    ideaal = Pid[1] - L.been * 0.55;
  }
  // Met kieskeurige grepen (ondergreep, zijgreep, in de overhang): hoe goed houden de handen in de zuinigste houding
  // die deze voeten toelaten? Slecht = een straf (de voeten moeten zo staan dat het lichaam goed hangt).
  const Pr = [0, 0];
  const Sw = [0, 0];
  const grip = (proef) => {
    if (gewoon) return 0;
    rustHouding(L, proef, [0, 0], Pr, idealen);
    let straf = 0;
    for (const l of ['lh', 'rh']) {
      if (!proef[l] || !k.op[l] || k.op[l].greep < 0) continue;
      const g = G[k.op[l].greep];
      wortel(L, Pr, l, Sw);
      const q = greepNu(K, g, proef[l], Sw, rots.steilte(Sw[1]), k.krijt?.[l] ?? 0);
      straf += Math.min(0, q / K.grepen[g.soort].kwaliteit - 0.9);
    }
    return straf * 1.5;
  };

  // Kandidaten: grepen van de route (elke handgreep is ook een voetgreep), de grond en de richels.
  /** @type {{ greep: number, u: number, v: number, kw: number, hak?: boolean, vlag?: boolean }[]} */
  const kand = [];
  for (const id of rots.routes[k.route].ids) {
    const g = G[id];
    if (g.v > hoog - 0.25 + (g.hak ? K.dak.hakBovenHeup : 0) || g.v < laag - 1.9 || Math.abs(g.u - hu) > 0.9) continue;
    if (g.top || K.grepen[g.soort].alleenKnie) continue;
    // Een greep waar een hand op zit, is geen voetplek (de voeten verzetten zich vóór de hand vertrekt).
    if (['lh', 'rh'].some((l) => k.op[l]?.greep === id)) continue;
    kand.push({ greep: id, u: g.u, v: g.v, kw: K.grepen[g.soort].voet, hak: !!g.hak });
  }
  if (laag < 1.9) {
    for (const du of [-0.3, -0.15, 0, 0.15, 0.3]) kand.push({ greep: -1, u: k.P[0] + du, v: 0, kw: K.grond.voet });
  }
  (rots.richels ?? []).forEach((q, qi) => {
    if (q.v > hoog - 0.25 || q.v < laag - 1.9) return;
    for (const du of [-0.3, -0.15, 0, 0.15, 0.3]) {
      const u = klem(k.P[0] + du, q.van + 0.06, q.tot - 0.06);
      if (!kand.some((c) => c.greep === -2 - qi && Math.abs(c.u - u) < 0.05)) kand.push({ greep: -2 - qi, u, v: q.v, kw: K.grond.voet });
    }
  });
  const nu = { lv: k.op.lv, rv: k.op.rv };
  const zelfde = (a, b) => a && b && !a.vlag && !b.vlag && a.greep === b.greep && (a.greep >= 0 || Math.abs(a.u - b.u) < 0.08);
  // Ook de huidige plekken zijn kandidaten (blijven staan mag).
  for (const lid of ['lv', 'rv']) if (nu[lid] && !kand.some((c) => zelfde(c, nu[lid]))) {
    const g = G[nu[lid].greep];
    kand.push({ ...nu[lid], kw: nu[lid].greep < 0 ? K.grond.voet : K.grepen[g.soort].voet });
  }
  // Vlaggen: één voet los opzij (alleen als het met twee voeten niet lukt, zie de straf in de score).
  const VLAG = { greep: -99, u: 0, v: 0, kw: 0, vlag: true };
  const punt = (c) => (c.vlag ? null : c.hak ? [c.u, c.v, K.dak.hakBovenHeup] : [c.u, c.v]);

  let beste = null;
  let besteScore = -Infinity;
  let nuScore = -Infinity;
  const P = [0, 0];
  // Vanaf de laagste voet reik je hooguit been + romp + arm hoog: lagere paren hoeven we niet na te rekenen.
  const minVoet = doel ? doel.T[1] - (L.been + L.romp + reik(L, doel.lid, doel.kr)) - 0.01 : -Infinity;
  const nuPunt = (lid) => (nu[lid] ? (nu[lid].hak ? [nu[lid].u, nu[lid].v, K.dak.hakBovenHeup] : [nu[lid].u, nu[lid].v]) : null);
  const probeer = (a, b) => {
    if (a.vlag && b.vlag) return;
    if (!a.vlag && a.v < minVoet && (b.vlag || b.v < minVoet)) return;
    if (!a.vlag && !b.vlag) {
      if (a.u > b.u + 0.08 || b.u - a.u > 0.75) return;
      if (a.greep >= 0 && a.greep === b.greep) return;
      if (a.greep < 0 && b.greep < 0 && a.greep === b.greep && b.u - a.u < 0.12) return;
    }
    const proef = { ...pt, lv: punt(a), rv: punt(b) };
    P[0] = k.P[0];
    P[1] = k.P[1];
    if (schik(L, P, proef, undefined, 30) > 0.006) return;
    // Kan elke voet daar komen, één voor één? (eerst de ene, dan de andere)
    const ma = a.vlag ? !!nu.lv : !zelfde(a, nu.lv);
    const mb = b.vlag ? !!nu.rv : !zelfde(b, nu.rv);
    let volgorde = null;
    for (const eerst of ['lv', 'rv']) {
      const tussen = { ...pt, lv: nuPunt('lv'), rv: nuPunt('rv') };
      tussen[eerst] = eerst === 'lv' ? punt(a) : punt(b);
      const Q = [k.P[0], k.P[1]];
      if (schik(L, Q, tussen, undefined, 30) <= 0.006) {
        volgorde = eerst;
        break;
      }
    }
    if (!volgorde) return;
    if (doel) {
      const proef2 = { ...proef, [doel.lid]: null };
      if (!kanNaar(L, P, proef2, doel.lid, doel.T, doel.kr)) return;
    }
    // Score: steun, hoogte (liefst rond de ideale hoogte, of zo laag mogelijk als het moet), balans, weinig verzetten.
    const echt = [a, b].filter((c) => !c.vlag);
    let sc = a.kw + b.kw;
    const hoogste = Math.max(...echt.map((c) => c.v));
    sc -= doel ? 0.6 * (hoogste - ideaal) : echt.reduce((s2, c) => s2 + Math.abs(c.v - ideaal), 0) * (2 / echt.length);
    const mu = echt.reduce((s2, c) => s2 + c.u, 0) / echt.length;
    sc -= Math.abs(mu - hu) * 1.2;
    if (echt.length === 2) sc -= Math.abs(b.u - a.u - 0.3) * 0.4;
    else sc -= K.dak.vlagStraf;
    sc += grip(proef);
    sc -= (ma ? 0.25 : 0) + (mb ? 0.25 : 0);
    if (!ma && !mb) nuScore = sc;
    if (sc > besteScore) {
      besteScore = sc;
      beste = { a, b, ma, mb, volgorde };
    }
  };
  for (const a of kand) {
    for (const b of kand) probeer(a, b);
    probeer(a, VLAG);
  }
  for (const b of kand) probeer(VLAG, b);
  // Lukt het niet in één keer (de voeten staan te laag voor een hoge greep, en één voet kan niet zo ver omhoog
  // terwijl de andere beneden blijft), dan in een paar kleine stapjes: voet voor voet omhoog, telkens in balans.
  if (!beste && doel) return voetenInStappen(k, kand, pt, L, K, doel, nu, zelfde, minVoet);
  if (!beste) return [];
  if (!beste.ma && !beste.mb) return [];
  // Zonder doel verzetten de voeten zich alleen als het echt beter is (anders schuifelen ze de hele tijd).
  if (!doel && besteScore < nuScore + K.zet.voetBeter) return [];
  const zet = (lid, c) => ({ lid, naar: c.vlag ? null : { greep: c.greep, u: c.u, v: c.v, hak: !!c.hak } });
  const stappen = [];
  const eerste = beste.volgorde;
  for (const lid of eerste === 'lv' ? ['lv', 'rv'] : ['rv', 'lv']) {
    if (lid === 'lv' && beste.ma) stappen.push(zet('lv', beste.a));
    if (lid === 'rv' && beste.mb) stappen.push(zet('rv', beste.b));
  }
  // Een voet die gaat vlaggen, laat pas los na de andere.
  stappen.sort((x, y) => (x.naar ? 0 : 1) - (y.naar ? 0 : 1));
  return stappen;
}

/**
 * De voeten in stapjes hoger (zoekVoeten, als het in één keer niet lukt): zoekt de kortste reeks voetzetten
 * (hoogstens 4), voet voor voet, waarbij het lichaam na elke zet in balans blijft, tot de hand `doel` erbij kan.
 * Geeft de voetzetten terug, of null.
 */
function voetenInStappen(k, kand, pt, L, K, doel, nu, zelfde, minVoet) {
  if (!nu.lv || !nu.rv) return null;
  // Alleen voetplekken die hoger liggen dan de laagste voet nu (omlaag stappen helpt niet om hoger te reiken).
  const laagste = Math.min(nu.lv.v, nu.rv.v);
  const kies = kand.filter((c) => c.v > laagste - 0.05);
  const sleutel = (s) => `${s.lv.greep}:${s.lv.u.toFixed(2)}|${s.rv.greep}:${s.rv.u.toFixed(2)}`;
  const punt = (c) => (c.hak ? [c.u, c.v, K.dak.hakBovenHeup] : [c.u, c.v]);
  let rij = [{ lv: nu.lv, rv: nu.rv, stappen: [] }];
  const gezien = new Set([sleutel(rij[0])]);
  const Q = [0, 0];
  for (let diepte = 0; diepte < 4 && rij.length; diepte++) {
    const volgende = [];
    for (const st of rij) {
      for (const lid of ['lv', 'rv']) {
        for (const c of kies) {
          if (zelfde(c, st[lid])) continue;
          const n = { ...st, [lid]: c };
          if (n.lv.u > n.rv.u + 0.08 || (n.lv.greep >= 0 && n.lv.greep === n.rv.greep)) continue;
          if (n.lv.greep < 0 && n.rv.greep < 0 && n.lv.greep === n.rv.greep && n.rv.u - n.lv.u < 0.12) continue;
          const s = sleutel(n);
          if (gezien.has(s)) continue;
          gezien.add(s);
          const proef = { ...pt, lv: punt(n.lv), rv: punt(n.rv) };
          Q[0] = k.P[0];
          Q[1] = k.P[1];
          if (schik(L, Q, proef, undefined, 30) > 0.006) continue;
          const stappen = [...st.stappen, { lid, naar: { greep: c.greep, u: c.u, v: c.v, hak: !!c.hak } }];
          if (Math.max(n.lv.v, n.rv.v) >= minVoet && kanNaar(L, Q, { ...proef, [doel.lid]: null }, doel.lid, doel.T, doel.kr)) return stappen;
          volgende.push({ lv: n.lv, rv: n.rv, stappen });
        }
      }
    }
    rij = volgende;
  }
  return null;
}

/** Een vrije hand (na een dyno): de beste greep die ze nu kan pakken, als plan. */
function besteVrijeGreep(k, lid, rots, K) {
  let beste = null;
  let sc0 = -Infinity;
  for (const id of rots.routes[k.route].ids) {
    const g = rots.grepen[id];
    const Gs = K.grepen[g.soort];
    if (Gs.alleenVoet || Gs.alleenKnie) continue;
    const plan = planHand(k, g, lid, rots, K);
    if (!plan || plan.length > 3) continue;
    const sc = Gs.kwaliteit - Math.abs(g.v - (k.P[1] + K.lichaam.romp + 0.3)) * 0.6 - plan.risico * 0.1;
    if (sc > sc0) {
      sc0 = sc;
      beste = plan;
    }
  }
  return beste;
}

// --- De dyno (KL 7) ---

/** Midden tussen de twee handen (op de kaart). */
function handMidden(k) {
  const a = k.op.lh;
  const b = k.op.rh;
  return [(a.u + b.u) / 2, (a.v + b.v) / 2];
}

/**
 * Een automatische dyno naar greep g (tikken, of een hand slepen naar een greep die te ver is): kan het, dan geeft
 * dit de dynotoestand terug (opladen tot de juiste kracht, dan springen), anders null.
 */
function dynoNaar(k, g, lid, rots, K) {
  if (!k.op.lh || !k.op.rh || k.zet || k.rij.length) return null;
  const Gs = K.grepen[g.soort];
  if (Gs.alleenVoet || Gs.alleenKnie || Gs.kwaliteit < 0.5) return null;
  const H = handMidden(k);
  const hand = lid ?? (g.u >= H[0] ? 'rh' : 'lh');
  const T = [g.u - KANT[hand] * 0.1, g.v];
  const dx = T[0] - H[0];
  const dy = T[1] - H[1];
  const d = Math.hypot(dx, dy);
  const D = K.dyno;
  if (d > D.bereik[1] || d < 0.15 || dy < -0.05) return null;
  // Na de landing hangt die hand alles alleen, met de voeten los: een automatische dyno gaat daarom alleen naar een
  // grote greep (die houdt dat zeker). Een riskante dyno naar een kleine greep doe je zelf, met de springknop.
  if (Gs.kwaliteit < K.dyno.autoMin) return null;
  const laad = klem((d - D.bereik[0]) / (D.bereik[1] - D.bereik[0]), 0, 1);
  return { fase: 'laad', t: 0, laad: 0, doelLaad: laad, richting: [dx / d, dy / d], auto: true, greep: g.id, lid: hand };
}

/** Waar de handen uitkomen bij een dyno met deze lading en richting (midden tussen de handen). */
export function dynoDoel(k, K) {
  const D = K.dyno;
  const H = handMidden(k);
  const r = D.bereik[0] + (D.bereik[1] - D.bereik[0]) * k.dyno.laad;
  return [H[0] + k.dyno.richting[0] * r, H[1] + k.dyno.richting[1] * r];
}

/** De greep die hand `lid` zou vangen als ze op `A` uitkomt (of -1). */
function vangGreep(k, rots, K, A, voorkeur) {
  let beste = -1;
  let d0 = K.dyno.grijp;
  for (const id of rots.routes[k.route].ids) {
    const g = rots.grepen[id];
    const Gs = K.grepen[g.soort];
    if (Gs.alleenVoet || Gs.alleenKnie) continue;
    const d = Math.hypot(g.u - A[0], g.v - A[1]) - (id === voorkeur ? 0.08 : 0);
    if (d < d0) {
      d0 = d;
      beste = id;
    }
  }
  return beste;
}

/** Voorspelling voor het beeld: waar komt de dyno uit, en welke grepen vangen de handen? */
export function dynoVoorspel(k, rots, K) {
  if (!k.dyno || !k.op.lh || !k.op.rh) return null;
  const T = dynoDoel(k, K);
  const lh = vangGreep(k, rots, K, [T[0] - 0.1, T[1]], k.dyno.lid === 'lh' ? k.dyno.greep : -1);
  const rh = vangGreep(k, rots, K, [T[0] + 0.1, T[1]], k.dyno.lid === 'rh' ? k.dyno.greep : -1);
  return { doel: T, lh, rh };
}

function stapDyno(s, k, int, rots, K, B, dt, meld, springNu) {
  const L = K.lichaam;
  const D = K.dyno;
  const dy = k.dyno;
  dy.t += dt;
  if (dy.fase === 'laad') {
    // Inzakken: de heupen zakken, de armen strekken (de voeten blijven staan).
    dy.laad = Math.min(dy.auto ? dy.doelLaad : 1, dy.t / D.laadDuur);
    if (!dy.auto) {
      const l = int.leun ?? [0, 0];
      const m = Math.hypot(l[0], l[1]);
      if (m > 0.25) {
        let rx = l[0] / m;
        let ry = l[1] / m;
        if (ry < -0.2) {
          ry = -0.2;
          const n = Math.hypot(rx, ry);
          rx /= n;
          ry /= n;
        }
        dy.richting = [rx, ry];
      } else dy.richting = [0, 1];
    }
    const pt = pts(k, K);
    const rust = rustHouding(L, pt, [0, 0], [0, 0], ideaalVan(k.op, rots, K));
    const doel = [rust[0] - dy.richting[0] * 0.05 * dy.laad, rust[1] - D.inzakken * dy.laad];
    const t = Math.min(1, dt * 8);
    k.P[0] += (doel[0] - k.P[0]) * t;
    k.P[1] += (doel[1] - k.P[1]) * t;
    schik(L, k.P, pt, undefined, 6);
    rekenBelasting(k, K, rots);
    const los = werkKrachtBij(k, K, B, dt);
    if (los) {
      vallen(s, k, rots, K, meld);
      return;
    }
    const springen = dy.auto ? dy.laad >= dy.doelLaad && dy.t >= 0.25 : !springNu;
    if (springen) {
      if (!dy.auto && dy.laad < D.minLaad * 0.4) {
        // Even getikt in plaats van opgeladen: geen dyno.
        k.dyno = null;
        return;
      }
      const T = dynoDoel(k, K);
      const H = handMidden(k);
      dy.fase = 'vlucht';
      dy.t = 0;
      dy.P0 = [...k.P];
      dy.P1 = [k.P[0] + (T[0] - H[0]), k.P[1] + (T[1] - H[1])];
      dy.doel = T;
      dy.van = { lh: [k.op.lh.u, k.op.lh.v], rh: [k.op.rh.u, k.op.rh.v] };
      dy.voeten = { lv: k.op.lv ? [k.op.lv.u, k.op.lv.v] : null, rv: k.op.rv ? [k.op.rv.u, k.op.rv.v] : null };
      k.op.lv = k.op.rv = null;
      k.vlag = null;
      meld({ soort: 'dynoSprong', speler: s.id, pos: [...s.pos] });
    }
    return;
  }
  // In de lucht: het lichaam vliegt langs het boogje; bij het hoogste punt grijpen de handen.
  const f = Math.min(1, dy.t / D.vlucht);
  const e = 1 - (1 - f) * (1 - f);
  k.P[0] = dy.P0[0] + (dy.P1[0] - dy.P0[0]) * e;
  k.P[1] = dy.P0[1] + (dy.P1[1] - dy.P0[1]) * e;
  for (const lid of ['lh', 'rh']) k.hand[lid].pomp = Math.max(0, k.hand[lid].pomp - K.kracht.herstelGreep * dt);
  if (f < 1) return;
  const T = dy.doel;
  const vang = {
    lh: vangGreep(k, rots, K, [T[0] - 0.1, T[1]], dy.lid === 'lh' ? dy.greep : -1),
    rh: vangGreep(k, rots, K, [T[0] + 0.1, T[1]], dy.lid === 'rh' ? dy.greep : -1),
  };
  // Eén greep voor twee handen kan alleen als je er kan bijpakken; anders neemt de beste hand hem.
  if (vang.lh >= 0 && vang.lh === vang.rh && !K.grepen[rots.grepen[vang.lh].soort].bijpakken) {
    if (dy.lid === 'lh') vang.rh = -1;
    else vang.lh = -1;
  }
  k.dyno = null;
  if (vang.lh < 0 && vang.rh < 0) {
    k.op.lh = k.op.rh = null;
    meld({ soort: 'dynoMis', speler: s.id });
    vallen(s, k, rots, K, meld);
    // Na de val pak je de grepen van voor de sprong.
    return;
  }
  for (const lid of ['lh', 'rh']) {
    const id = vang[lid];
    if (id < 0) {
      k.op[lid] = null;
      continue;
    }
    const g = rots.grepen[id];
    const bij = vang.lh === vang.rh;
    k.op[lid] = { greep: id, u: g.u + (bij ? KANT[lid] * 0.06 : 0), v: g.v };
    // De landing kost een flinke hap kracht, naargelang de greep (KL 7).
    k.hand[lid].pomp = Math.min(B.krachtMax, k.hand[lid].pomp + D.hap / Math.max(0.3, K.grepen[g.soort].kwaliteit));
    if (k.krijt[lid] > 0) k.krijt[lid]--;
  }
  k.voetZoek = 0.25;
  const id = vang[dy.lid ?? 'rh'] >= 0 ? vang[dy.lid ?? 'rh'] : vang.lh >= 0 ? vang.lh : vang.rh;
  const g = rots.grepen[id];
  meld({ soort: 'dynoVang', speler: s.id, greep: id, greepSoort: g.soort, pos: rots.naarWereld(g.u, g.v, 0.05), handen: (vang.lh >= 0 ? 1 : 0) + (vang.rh >= 0 ? 1 : 0) });
  meld({ soort: 'voetenLos', speler: s.id, pos: [...s.pos], dyno: true });
  if (g.top && vang.lh >= 0 && vang.rh >= 0) {
    naar(k, 'boven');
    meld({ soort: 'top', speler: s.id, route: k.route, pos: rots.naarWereld(g.u, g.v, 0.05) });
  }
}

/** Welke grepen kan de klimster nu bereiken (eventueel met de voeten eerst hoger, of met een dyno)? Voor het oplichten. */
export function bereikbaar(s, rots, K, lid = null) {
  const k = s.klim;
  if (!k || k.toestand !== 'klimt' || k.zet || k.rij.length || k.vleermuis || k.dyno) return [];
  const uit = [];
  const kk = knieklemBij(k, rots, K);
  for (const id of rots.routes[k.route].ids) {
    const g = rots.grepen[id];
    if (K.grepen[g.soort].alleenVoet) continue;
    if (K.grepen[g.soort].alleenKnie) {
      if (kk && kk.id === id && !lid) uit.push(id);
      continue;
    }
    const handen = lid ? [lid] : kiesHanden(k, g);
    const veilig = K.kracht.glijGrens * 0.8;
    if (handen.some((h) => {
      const p = planHand(k, g, h, rots, K);
      return p && (lid || p.risico <= veilig);
    })) uit.push(id);
    else if (K.dyno.automatisch?.[k.besturing] !== false && dynoNaar(k, g, lid, rots, K)) uit.push(id);
  }
  return uit;
}

/** Voor tests en de klimbot: welk plan zou er komen voor hand `lid` naar greep `id`? { zetten, risico } of null. */
export function planVoor(s, rots, K, id, lid) {
  const k = s.klim;
  const g = rots.grepen[id];
  if (!k || !g) return null;
  const p = planHand(k, g, lid, rots, K);
  return p ? { zetten: p.map((z) => z.lid), risico: /** @type {any} */ (p).risico } : null;
}

/** Voor de klimbot: is er nu een knieklem in bereik (id), of -1? */
export function knieklemVoor(s, rots, K) {
  const k = s.klim;
  if (!k) return -1;
  return knieklemBij(k, rots, K)?.id ?? -1;
}
