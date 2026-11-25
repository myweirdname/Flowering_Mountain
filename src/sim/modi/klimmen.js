// Klimmen op de oefenrots (stap 9, KL 5 tot 8): vier ledematen op grepen, de romp die zich schikt, zetten die
// tijd kosten, automatische voeten, kracht per arm, uitschudden, en toprope met de witte tijger.
// De speler doet een zet via de intentie: `klimGreep` (id van een greep) en eventueel `klimLid` ('lh' of 'rh'
// als je zelf een hand sleept; leeg = "tikken": het spel kiest de hand). Geen Three.js.
import { LEDEN, KANT, ANDERE, isHand, rustHouding, kanNaar, kruist, schik, fout, reik, wortel } from '../klimmen/houding.js';
import { rekenBelasting, werkKrachtBij } from '../klimmen/kracht.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const klem = (x, a, b) => (x < a ? a : x > b ? b : x);

/** @typedef {{ greep: number, u: number, v: number }} Plek greep -1 = de grond */

/** De klimtoestand van een speler die op de wand staat. */
function maakKlim(route, besturing) {
  return {
    route,
    toestand: 'op',      // 'op' (op de wand stappen) | 'klimt' | 'val' | 'hangt' | 'terug' | 'boven' | 'zakt' | 'uitstap'
    wand: 0,             // op welke wand (0 = de oefenrots, daarna de klimwanden van de berg)
    t: 0,
    P: [0, 0],           // de romp: het midden van de heupen, op de wandkaart
    /** @type {Record<string, Plek | null>} */
    op: { lh: null, rh: null, lv: null, rv: null },
    /** @type {null | { lid: string, van: number[], naar: Plek, t: number, duur: number, Pvan: number[], Pnaar: number[] }} */
    zet: null,
    /** @type {{ lid: string, naar: Plek }[]} */
    rij: [],             // geplande zetten (bv. eerst de voeten hoger, dan de hand)
    /** @type {null | { greep: number, lid: string | null }} */
    wacht: null,         // een tik tijdens een zet: die komt erna
    hand: {
      lh: { pomp: 0, last: 0, kwaliteit: 0, verhouding: 0 },
      rh: { pomp: 0, last: 0, kwaliteit: 0, verhouding: 0 },
    },
    los: { lh: 0, rh: 0 }, // weggegleden hand: seconden tot ze haar greep terugpakt
    schudt: null,          // de hand die uitschudt
    besturing,
    leun: [0, 0],
    armBelasting: 0,
    /** @type {null | { P: number[], op: Record<string, Plek | null> }} */
    stabiel: null,         // de laatste houding met vier ledematen vast: daar pak je na een val terug
    hoogste: 0,
    valVan: [0, 0],
    zakU: 0,
    actieVorige: false,
    zakVorige: false,
  };
}

/**
 * @param {any} s speler
 * @param {ReturnType<typeof import('../klimmen/oefenrots.js').maakOefenrots>} rots
 * @param {number} ri route
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 */
export function beginKlimmen(s, rots, ri, K, meld, besturing = K.besturing.standaard) {
  const L = K.lichaam;
  const r = rots.routes[ri];
  const k = maakKlim(ri, besturing);
  const [gl, gr] = r.startGrepen.map((id) => rots.grepen[id]);
  k.op.lh = { greep: gl.id, u: gl.u, v: gl.v };
  k.op.rh = { greep: gr.id, u: gr.u, v: gr.v };
  k.op.lv = { greep: -1, u: r.startU - L.heup - 0.04, v: 0 };
  k.op.rv = { greep: -1, u: r.startU + L.heup + 0.04, v: 0 };
  rustHouding(L, punten(k), [0, 0], k.P);
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

/** Stopt het klimmen meteen (bv. bij "terug naar veilige grond"). */
export function stopKlimmen(s, rots, K) {
  const k = s.klim;
  if (!k) return;
  const p = rots.naarWereld(k.P[0], 0, 0.7);
  s.pos = [p[0], rots.voetHoogte, p[2]];
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

/** De punten die nu vastzitten (een hand onderweg, die uitschudt of weggleed, telt niet mee). */
function punten(k, zonder = null) {
  const p = { lh: null, rh: null, lv: null, rv: null };
  for (const lid of LEDEN) {
    const o = k.op[lid];
    if (!o || lid === zonder || k.zet?.lid === lid || k.schudt === lid || (isHand(lid) && k.los[lid] > 0)) continue;
    p[lid] = [o.u, o.v];
  }
  return p;
}

/** De wereldpositie van de speler is het midden van de heupen (voor de camera, de tijger en de bloesems). */
function zetPos(s, rots, K) {
  const k = s.klim;
  rots.naarWereld(k.P[0], k.P[1], K.lichaam.wandAfstand, s.pos);
}

/**
 * Eén tijdstap op de wand.
 * @param {any} s @param {any} int intentie @param {ReturnType<typeof import('../klimmen/oefenrots.js').maakOefenrots>} rots
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
        naarZakken(s, k, rots, meld);
        break;
      }
      klimStap(s, k, int, rots, K, B, dt, meld);
      break;
    case 'val': {
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
      // Even hangen in het touw en uitblazen.
      k.P[0] += Math.sin(k.t * 3.1) * 0.06 * dt * (1 - k.t / K.touw.hangDuur);
      if (zakNu || k.t >= K.touw.hangDuur) {
        if (zakNu) {
          naarZakken(s, k, rots, meld);
          break;
        }
        naar(k, 'terug');
        k.valVan = [...k.P];
      }
      break;
    case 'terug': {
      // De tijger trekt het touw in; je pakt dezelfde grepen opnieuw.
      const f = glad(k.t / K.touw.terugDuur);
      const doel = k.stabiel.P;
      k.P[0] = k.valVan[0] + (doel[0] - k.valVan[0]) * f;
      k.P[1] = k.valVan[1] + (doel[1] - k.valVan[1]) * f;
      if (k.t >= K.touw.terugDuur) {
        k.op = kopie(k.stabiel.op);
        k.P = [...doel];
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
      if (zakNu || k.t >= K.touw.bovenWacht) naarZakken(s, k, rots, meld);
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
      // Laten zakken: handen aan het touw, voeten lopen tegen de wand naar beneden (op een hoge wand wat sneller).
      k.P[1] -= Math.max(K.touw.zakSnelheid, rots.hoogte / 7) * dt * glad(k.t / 0.5);
      k.P[0] += (k.zakU - k.P[0]) * Math.min(1, dt * 0.8);
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

/** De verhouding belasting/kwaliteit als deze hand alles alleen moet dragen. */
function alleen(k, lid, K) {
  const h = k.hand[lid];
  return h.kwaliteit > 0 ? (k.armBelasting * (1 + K.kracht.gebogen * (h.buig ?? 0))) / h.kwaliteit : 99;
}

function naar(k, toestand) {
  k.toestand = toestand;
  k.t = 0;
}

function naarZakken(s, k, rots, meld) {
  naar(k, 'zakt');
  k.zet = null;
  k.rij = [];
  k.wacht = null;
  k.schudt = null;
  k.op = { lh: null, rh: null, lv: null, rv: null };
  k.zakU = rots.routes[k.route].startU;
  meld({ soort: 'zakken', speler: s.id });
}

/** Het eigenlijke klimmen: zetten, rusten, kracht. */
function klimStap(s, k, int, rots, K, B, dt, meld) {
  const L = K.lichaam;
  const G = rots.grepen;

  // --- Een nieuwe zet gevraagd? ---
  if (int.klimGreep != null && int.klimGreep >= 0) {
    if (k.zet || k.rij.length) k.wacht = { greep: int.klimGreep, lid: int.klimLid ?? null };
    else vraagZet(s, k, int.klimGreep, int.klimLid ?? null, rots, K, meld);
  }

  // --- Uitschudden: actieknop ingedrukt houden (KL 6) ---
  const actie = !!int.actie;
  if (actie && !k.schudt && !k.zet && !k.rij.length && k.los.lh <= 0 && k.los.rh <= 0) {
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
      const g = G[z.naar.greep];
      const pos = rots.naarWereld(z.naar.u, z.naar.v, 0.05);
      if (isHand(z.lid)) meld({ soort: 'klimGreep', speler: s.id, lid: z.lid, greep: z.naar.greep, greepSoort: g?.soort, pos });
      else meld({ soort: 'klimVoet', speler: s.id, lid: z.lid, grond: z.naar.greep < 0, pos });
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
      if (k.rij.length) begin(k, k.rij.shift(), rots, K);
      else if (k.wacht) {
        const w = k.wacht;
        k.wacht = null;
        vraagZet(s, k, w.greep, w.lid, rots, K, meld);
      }
    }
  } else if (k.rij.length) {
    begin(k, k.rij.shift(), rots, K);
  } else {
    // Rusten: de romp zakt rustig naar de zuinigste houding (of waar je naartoe leunt).
    const pt = punten(k);
    const doel = rustHouding(L, pt, k.leun);
    const t = Math.min(1, dt * 4);
    k.P[0] += (doel[0] - k.P[0]) * t;
    k.P[1] += (doel[1] - k.P[1]) * t;
    schik(L, k.P, pt, undefined, 6);
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
  rekenBelasting(k, K, rots.steilte(k.P[1]), G);
  const los = werkKrachtBij(k, K, B, dt);
  if (los) {
    const ander = ANDERE[los];
    const h = k.hand[ander];
    // Houdt de andere hand het alleen? Dan bengel je even aan één hand.
    const kanAlleen = k.op[ander] && k.zet?.lid !== ander && k.schudt !== ander && k.los[ander] <= 0 &&
      alleen(k, ander, K) < K.kracht.glijGrens && h.pomp < 0.97;
    if (kanAlleen) {
      k.los[los] = K.zet.terugNaGlijden;
      if (k.zet?.lid === los) k.zet = null;
      k.rij = [];
      k.wacht = null;
      meld({ soort: 'handGlijdt', speler: s.id, lid: los, pos: [...s.pos] });
    } else {
      // Vallen: het touw vangt je op (toprope).
      naar(k, 'val');
      k.valVan = [...k.P];
      k.zet = null;
      k.rij = [];
      k.wacht = null;
      k.schudt = null;
      k.los = { lh: 0, rh: 0 };
      meld({ soort: 'val', speler: s.id, pos: [...s.pos] });
      return;
    }
  }

  // De laatste houding met vier ledematen vast onthouden (na een val pak je die opnieuw).
  if (!k.zet && !k.rij.length && !k.schudt && k.los.lh <= 0 && k.los.rh <= 0 && LEDEN.every((l) => k.op[l])) {
    k.stabiel = { P: [...k.P], op: kopie(k.op) };
  }
  k.hoogste = Math.max(k.hoogste, k.P[1]);
}

/** Start een zet. `terug` = een hand die naar haar eigen greep terugkeert (na uitschudden of wegglijden). */
function begin(k, stap, rots, K, terug = false) {
  const L = K.lichaam;
  const { lid, naar } = stap;
  const van = k.op[lid] && !terug ? [k.op[lid].u, k.op[lid].v] : hangPlek(k, lid, L);
  const pt = punten(k, lid);
  const T = [naar.u, naar.v];
  const kr = kruist(pt, lid, T);
  const Pnaar = eindHouding(L, k.P, pt, lid, T, kr);
  const d = Math.hypot(T[0] - van[0], T[1] - van[1]);
  const Z = K.zet;
  const duur = terug
    ? 0.35
    : isHand(lid)
      ? Z.handMin + (Z.handMax - Z.handMin) * klem(d / 0.9, 0, 1)
      : Z.voetMin + (Z.voetMax - Z.voetMin) * klem(d / 0.7, 0, 1);
  k.zet = { lid, van, naar, t: 0, duur, Pvan: [...k.P], Pnaar };
}

/**
 * Waar de romp naartoe schuift tijdens een zet. Een hand: naar de zuinigste houding met de nieuwe greep (of, als
 * die niet kan, de houding waarin de hand er net bij kan). Een voet: het lichaam blijft zo veel mogelijk staan;
 * rechtkomen gebeurt pas daarna (of tijdens de volgende handzet).
 */
function eindHouding(L, P, pt, lid, T, kr) {
  const met = { ...pt, [lid]: T };
  const max = { [lid]: reik(L, lid, kr) };
  if (!isHand(lid)) {
    // Een hoge stap: eerst de voet zetten, pas daarna rechtkomen. Kan het been er vanaf hier bij, dan blijft
    // het lichaam staan, ook als de voet even boven de heup staat.
    const w = wortel(L, P, lid);
    if (Math.hypot(T[0] - w[0], T[1] - w[1]) <= L.been) return [P[0], P[1]];
    const Q = [P[0], P[1]];
    schik(L, Q, met, max, 60);
    return Q;
  }
  const Q = kanNaar(L, P, pt, lid, T, kr) ?? [...P];
  const rust = rustHouding(L, met, [0, 0]);
  return fout(L, rust, met, max) < 0.006 ? rust : Q;
}

/** Waar een losse hand hangt (naast het lijf). */
function hangPlek(k, lid, L) {
  return [k.P[0] + KANT[lid] * (L.schouder + 0.08), k.P[1] + L.romp - 0.3];
}

/**
 * Vraag om een zet naar greep `id`: met hand `lid`, of (tikken) met de hand die het best uitkomt.
 * Kan het niet, ook niet met de voeten eerst hoger, dan meldt het spel "te ver".
 */
function vraagZet(s, k, id, lid, rots, K, meld) {
  const g = rots.grepen[id];
  if (!g) return;
  if (g.route !== k.route) {
    meld({ soort: 'andereRoute', speler: s.id, greep: id });
    return;
  }
  if (K.grepen[g.soort].alleenVoet) {
    meld({ soort: 'teVer', speler: s.id, greep: id, voet: true });
    return;
  }
  if (k.los.lh > 0 || k.los.rh > 0 || k.schudt) return;
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
    meld({ soort: 'teVer', speler: s.id, greep: id });
    return;
  }
  k.rij = beste;
  begin(k, k.rij.shift(), rots, K);
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
  const bij = ander?.greep === g.id;
  if (bij && !K.grepen[g.soort].bijpakken) return null;
  // Twee handen op één greep: elk aan een kant.
  const naarPlek = { greep: g.id, u: g.u + (bij ? KANT[lid] * 0.06 : 0), v: g.v };
  const T = [naarPlek.u, naarPlek.v];
  const pt = punten(k, lid);
  if (!pt.lh && !pt.rh && !pt[ANDERE[lid]]) return null; // nooit zonder handen
  const kr = kruist(pt, lid, T);
  // Veel te ver (hoger dan je ooit reikt vanaf de huidige voeten of handen)? Meteen nee.
  const hoogsteVoet = Math.max(k.op.lv?.v ?? 0, k.op.rv?.v ?? 0, ...['lh', 'rh'].map((l) => (pt[l] ? pt[l][1] - 0.3 : 0)));
  if (T[1] > hoogsteVoet + L.been + L.romp + L.arm + 0.9 || Math.abs(T[0] - k.P[0]) > 1.3) return null;
  const zet = { lid, naar: naarPlek };
  if (kanNaar(L, k.P, pt, lid, T, kr)) return metRisico([zet], k, rots, K);
  // Voeten eerst (KL 5: om hoog te reiken moeten je voeten eerst hoog).
  const voeten = zoekVoeten(k, rots, K, { lid, T, kr });
  return voeten ? metRisico([...voeten, zet], k, rots, K) : null;
}

/**
 * Hoe zwaar wordt het voor de andere hand terwijl deze hand onderweg is? Rekent het plan na en zet `plan.risico`
 * op de grootste verhouding belasting/kwaliteit van de hand die alleen vasthoudt (boven 2,5 glijdt ze weg).
 */
function metRisico(plan, k, rots, K) {
  const L = K.lichaam;
  const G = rots.grepen;
  const z = plan[plan.length - 1];
  const ander = ANDERE[z.lid];
  const op = kopie(k.op);
  const proef = { op, P: k.P, zet: null, schudt: null, los: { lh: 0, rh: 0 }, hand: { lh: {}, rh: {} } };
  const pts = (zonder) => {
    const p = {};
    for (const l of LEDEN) p[l] = op[l] && l !== zonder ? [op[l].u, op[l].v] : null;
    return p;
  };
  let risico = 0;
  /** Loopt de romp van A naar B (zoals begin() dat doet) en meet onderweg de zwaarste verhouding. */
  const langs = (A, B, lid, handen) => {
    proef.zet = { lid };
    for (let i = 0; i <= 5; i++) {
      const f = i / 5;
      proef.P = [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
      rekenBelasting(proef, K, rots.steilte(proef.P[1]), G);
      for (const h of handen) risico = Math.max(risico, proef.hand[h].verhouding || 0);
    }
  };
  /** Waar de romp naartoe gaat bij een zet (zelfde keuze als begin()). */
  const eind = (P, lid, T) => {
    const pt = pts(lid);
    return eindHouding(L, P, pt, lid, T, kruist(pt, lid, T));
  };
  let P = [...k.P];
  for (const v of plan) {
    const T = [v.naar.u, v.naar.v];
    const B = eind(P, v.lid, T);
    langs(P, B, v.lid, isHand(v.lid) ? [ander] : ['lh', 'rh']);
    op[v.lid] = v.naar;
    P = B;
  }
  /** @type {any} */ (plan).risico = risico;
  return plan;
}

/**
 * Automatische voeten (KL 7): zoekt de twee voetplekken met de meeste steun die het lichaam in balans houden.
 * Met `doel`: alleen plekken van waaruit die hand erbij kan. Geeft de voetzetten terug (0, 1 of 2), of null.
 */
function zoekVoeten(k, rots, K, doel) {
  const L = K.lichaam;
  const G = rots.grepen;
  const pt = punten(k, doel?.lid);
  const handen = ['lh', 'rh'].map((l) => pt[l]).filter(Boolean);
  if (!handen.length) return null;
  const hu = handen.reduce((a, p) => a + p[0], 0) / handen.length;
  const laag = Math.min(...handen.map((p) => p[1]));
  const hoog = Math.max(...handen.map((p) => p[1]), doel ? doel.T[1] : -9);
  const ideaal = laag - L.arm - L.romp - L.been * 0.55;

  // Kandidaten: grepen van de route (elke handgreep is ook een voetgreep) en de grond.
  /** @type {{ greep: number, u: number, v: number, kw: number }[]} */
  const kand = [];
  for (const id of rots.routes[k.route].ids) {
    const g = G[id];
    if (g.v > hoog - 0.25 || g.v < laag - 1.9 || Math.abs(g.u - hu) > 0.9) continue;
    if (g.top) continue;
    // Een greep waar een hand op zit, is geen voetplek (de voeten verzetten zich vóór de hand vertrekt).
    if (['lh', 'rh'].some((l) => k.op[l]?.greep === id)) continue;
    kand.push({ greep: id, u: g.u, v: g.v, kw: K.grepen[g.soort].voet });
  }
  if (laag < 1.9) {
    for (const du of [-0.3, -0.15, 0, 0.15, 0.3]) kand.push({ greep: -1, u: k.P[0] + du, v: 0, kw: K.grond.voet });
  }
  const nu = { lv: k.op.lv, rv: k.op.rv };
  const zelfde = (a, b) => a && b && a.greep === b.greep && (a.greep >= 0 || Math.abs(a.u - b.u) < 0.08);
  // Ook de huidige plekken zijn kandidaten (blijven staan mag).
  for (const lid of ['lv', 'rv']) if (nu[lid] && !kand.some((c) => zelfde(c, nu[lid]))) {
    const g = G[nu[lid].greep];
    kand.push({ ...nu[lid], kw: nu[lid].greep < 0 ? K.grond.voet : K.grepen[g.soort].voet });
  }

  let beste = null;
  let besteScore = -Infinity;
  let nuScore = -Infinity;
  const P = [0, 0];
  // Vanaf de laagste voet reik je hooguit been + romp + arm hoog: lagere paren hoeven we niet na te rekenen.
  const minVoet = doel ? doel.T[1] - (L.been + L.romp + reik(L, doel.lid, doel.kr)) - 0.01 : -Infinity;
  for (const a of kand) {
    if (a.v < minVoet) continue;
    for (const b of kand) {
      if (b.v < minVoet) continue;
      if (a.u > b.u + 0.08 || b.u - a.u > 0.75) continue;
      if (a.greep >= 0 && a.greep === b.greep) continue;
      if (a.greep < 0 && b.greep < 0 && b.u - a.u < 0.12) continue;
      const proef = { ...pt, lv: [a.u, a.v], rv: [b.u, b.v] };
      P[0] = k.P[0];
      P[1] = k.P[1];
      if (schik(L, P, proef, undefined, 30) > 0.006) continue;
      // Kan elke voet daar komen, één voor één? (eerst de ene, dan de andere)
      const ma = !zelfde(a, nu.lv);
      const mb = !zelfde(b, nu.rv);
      let volgorde = null;
      for (const eerst of ['lv', 'rv']) {
        const tussen = { ...pt, lv: nu.lv ? [nu.lv.u, nu.lv.v] : null, rv: nu.rv ? [nu.rv.u, nu.rv.v] : null };
        tussen[eerst] = eerst === 'lv' ? [a.u, a.v] : [b.u, b.v];
        const Q = [k.P[0], k.P[1]];
        if (schik(L, Q, tussen, undefined, 30) <= 0.006) {
          volgorde = eerst;
          break;
        }
      }
      if (!volgorde) continue;
      if (doel) {
        const proef2 = { ...proef, [doel.lid]: null };
        if (!kanNaar(L, P, proef2, doel.lid, doel.T, doel.kr)) continue;
      }
      // Score: steun, hoogte (liefst rond de ideale hoogte, of zo laag mogelijk als het moet), balans, weinig verzetten.
      let sc = a.kw + b.kw;
      sc -= doel ? 0.6 * (Math.max(a.v, b.v) - ideaal) : Math.abs(a.v - ideaal) + Math.abs(b.v - ideaal);
      sc -= Math.abs((a.u + b.u) / 2 - hu) * 1.2;
      sc -= Math.abs(b.u - a.u - 0.3) * 0.4;
      sc -= (ma ? 0.25 : 0) + (mb ? 0.25 : 0);
      if (!ma && !mb) nuScore = sc;
      if (sc > besteScore) {
        besteScore = sc;
        beste = { a, b, ma, mb, volgorde };
      }
    }
  }
  // Lukt het niet in één keer (de voeten staan te laag voor een hoge greep, en één voet kan niet zo ver omhoog
  // terwijl de andere beneden blijft), dan in een paar kleine stapjes: voet voor voet omhoog, telkens in balans.
  if (!beste && doel) return voetenInStappen(k, kand, pt, L, doel, nu, zelfde, minVoet);
  if (!beste) return [];
  if (!beste.ma && !beste.mb) return [];
  // Zonder doel verzetten de voeten zich alleen als het echt beter is (anders schuifelen ze de hele tijd).
  if (!doel && besteScore < nuScore + K.zet.voetBeter) return [];
  const zet = (lid, c) => ({ lid, naar: { greep: c.greep, u: c.u, v: c.v } });
  const stappen = [];
  const eerste = beste.volgorde;
  for (const lid of eerste === 'lv' ? ['lv', 'rv'] : ['rv', 'lv']) {
    if (lid === 'lv' && beste.ma) stappen.push(zet('lv', beste.a));
    if (lid === 'rv' && beste.mb) stappen.push(zet('rv', beste.b));
  }
  return stappen;
}

/**
 * De voeten in stapjes hoger (zoekVoeten, als het in één keer niet lukt): zoekt de kortste reeks voetzetten
 * (hoogstens 4), voet voor voet, waarbij het lichaam na elke zet in balans blijft, tot de hand `doel` erbij kan.
 * Geeft de voetzetten terug, of null.
 */
function voetenInStappen(k, kand, pt, L, doel, nu, zelfde, minVoet) {
  if (!nu.lv || !nu.rv) return null;
  // Alleen voetplekken die hoger liggen dan de laagste voet nu (omlaag stappen helpt niet om hoger te reiken).
  const laagste = Math.min(nu.lv.v, nu.rv.v);
  const kies = kand.filter((c) => c.v > laagste - 0.05);
  const sleutel = (s) => `${s.lv.greep}:${s.lv.u.toFixed(2)}|${s.rv.greep}:${s.rv.u.toFixed(2)}`;
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
          if (n.lv.greep < 0 && n.rv.greep < 0 && n.rv.u - n.lv.u < 0.12) continue;
          const s = sleutel(n);
          if (gezien.has(s)) continue;
          gezien.add(s);
          const proef = { ...pt, lv: [n.lv.u, n.lv.v], rv: [n.rv.u, n.rv.v] };
          Q[0] = k.P[0];
          Q[1] = k.P[1];
          if (schik(L, Q, proef, undefined, 30) > 0.006) continue;
          const stappen = [...st.stappen, { lid, naar: { greep: c.greep, u: c.u, v: c.v } }];
          if (Math.max(n.lv.v, n.rv.v) >= minVoet && kanNaar(L, Q, { ...proef, [doel.lid]: null }, doel.lid, doel.T, doel.kr)) return stappen;
          volgende.push({ lv: n.lv, rv: n.rv, stappen });
        }
      }
    }
    rij = volgende;
  }
  return null;
}

/** Welke grepen kan de klimster nu bereiken (eventueel met de voeten eerst hoger)? Voor het oplichten in het beeld. */
export function bereikbaar(s, rots, K, lid = null) {
  const k = s.klim;
  if (!k || k.toestand !== 'klimt' || k.zet || k.rij.length) return [];
  const uit = [];
  for (const id of rots.routes[k.route].ids) {
    const g = rots.grepen[id];
    if (K.grepen[g.soort].alleenVoet) continue;
    const handen = lid ? [lid] : kiesHanden(k, g);
    const veilig = K.kracht.glijGrens * 0.8;
    if (handen.some((h) => {
      const p = planHand(k, g, h, rots, K);
      return p && (lid || p.risico <= veilig);
    })) uit.push(id);
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
