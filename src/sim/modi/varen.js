// Varen op het vlot (GD 9, TP 6): een plat schijfje in riviercoördinaten (s langs de stroom, d dwars erop).
// Het vlot drijft mee met de stroming; jij stuurt links en rechts en kan kort versnellen of afremmen.
// Botsen tegen een rots of de oever kost alleen vaart. Over de kleine sprong vlieg je even in slow motion.
// In de lagune peddel je vrij rond in stil water en leg je aan bij de steiger of aan de oever.
// Ook: de bouwstukken verzamelen en het vlot bouwen. Geen Three.js, alleen gegevens.
//
// Sinds stap 14 vaart het vlot over een net van rivieren (`rivieren`): de benedenrivier (0) en de rivier over de
// berg (1), die in de bron van de benedenrivier uitkomt. `v.tak` zegt op welke het vlot ligt. Het vlot ligt klaar
// aan elke steiger: loop je weg, dan ligt het weer klaar aan de steiger het dichtst bij jou. Nieuw op de berg:
// meerdere watervallen (de grote over de rotsrand in diepe slow motion), golftreinen waarop het vlot danst,
// keerwater (daar ligt het stil), een kolk die je ronddraait en een splitsing rond een eilandje.

/** @typedef {ReturnType<typeof maakVlot>} Vlot */
export function maakVlot(id, eigenaar, rivieren, V) {
  const v = {
    id,
    eigenaar,
    gebouwd: false,
    bouwt: 0,           // seconden die het bouwen nog duurt
    stukken: V.stukken.map(() => false),
    plek: 'boven',      // 'boven' (klaar aan een steiger), 'vaart' (op de rivier), 'lagune' (vrij in stil water)
    tak: 0,             // op welke rivier (0 = de benedenrivier, 1 = de rivier over de berg)
    steiger: 'bron',    // aan welke steiger het klaarligt
    sprong: null,       // de waterval waarover het nu vliegt
    golf: 0, kantel: 0, // dansen op de golftrein (hoogte en kanteling, voor het beeld)
    ruiter: null,       // id van de speler die erop zit
    pony: null,         // id van de pony die meevaart
    s: 0, d: 0, vs: 0, vd: 0,
    y: 0, vy: 0, lucht: false, slowmo: 1,
    draai: 0, draaiV: 0, schommel: 0, hop: 0,
    pos: [0, 0, 0], vorigePos: [0, 0, 0], vel: [0, 0, 0],
    richting: 0, vorigeRichting: 0,
    botsWacht: 0,
  };
  zetKlaar(v, rivieren);
  v.vorigePos = [...v.pos];
  v.vorigeRichting = v.richting;
  return v;
}

/** Alle steigers van alle rivieren: { tak, steiger }. */
export function alleSteigers(rivieren) {
  return rivieren.flatMap((r, tak) => r.steigers.map((steiger) => ({ tak, steiger })));
}

/** Het vlot ligt (weer) klaar naast een steiger (standaard die bij de bron van de benedenrivier). */
export function zetKlaar(v, rivieren, tak = 0, naam = rivieren[0].steigers[0].naam) {
  const rivier = rivieren[tak];
  const st = rivier.steigers.find((k) => k.naam === naam) ?? rivier.steigers[0];
  Object.assign(v, { plek: 'boven', tak, steiger: st.naam, s: st.ligplaats.s, d: st.ligplaats.d, vs: 0, vd: 0, vy: 0, lucht: false, sprong: null, draai: 0, draaiV: 0, schommel: 0, slowmo: 1, golf: 0, kantel: 0 });
  v.y = rivier.peil(v.s);
  naarWereld(v, rivier);
  v.vel = [0, 0, 0];
}

/** Kan je dit vlot gebruiken? Op de berg ligt er altijd een klaar; bij de bron bouw je het eerst zelf. */
export const vlotKlaar = (v) => v.gebouwd || v.tak !== 0;

const pt = [0, 0];
const rl = [0, 0];
function naarWereld(v, rivier) {
  rivier.puntOp(v.s, v.d, pt);
  v.pos[0] = pt[0];
  v.pos[1] = v.y;
  v.pos[2] = pt[1];
  v.richting = rivier.richtingOp(v.s) + v.draai + Math.atan2(v.vd, Math.max(1, Math.abs(v.vs))) * 0.5;
}

/** Waar een plek op het vlot (in vlotmaat: x opzij, y omhoog, z vooruit) in de wereld ligt. */
export function opVlot(v, [lx, ly, lz], uit = [0, 0, 0]) {
  const c = Math.cos(v.richting);
  const s = Math.sin(v.richting);
  uit[0] = v.pos[0] + lx * c + lz * s;
  uit[1] = v.pos[1] + ly;
  uit[2] = v.pos[2] - lx * s + lz * c;
  return uit;
}

/** Waar bouwstuk i ligt. */
export function stukPlek(rivier, V, i, grondOp) {
  const k = V.stukken[i];
  const [x, z] = rivier.puntOp(k.s, rivier.padZijde * (rivier.breedte(k.s) + k.e));
  return [x, grondOp(x, z), z];
}

/** Bouwstukken oprapen door erover te lopen. */
export function pakStukken(s, v, plekken, V, meld) {
  if (v.gebouwd) return;
  for (let i = 0; i < plekken.length; i++) {
    if (v.stukken[i]) continue;
    const p = plekken[i];
    if (Math.hypot(p[0] - s.pos[0], p[2] - s.pos[2]) > V.pakStraal || Math.abs(p[1] - s.pos[1]) > 1.5) continue;
    v.stukken[i] = true;
    meld({ soort: 'bouwstuk', speler: s.id, stuk: i, wat: V.stukken[i].soort, pos: [...p], aantal: v.stukken.filter(Boolean).length });
  }
}

/** Bij welke steiger staat de speler? Geeft { tak, steiger } of null. */
export function bijSteiger(s, rivieren, V) {
  for (const st of alleSteigers(rivieren)) {
    const k = st.steiger.dek;
    if (Math.hypot(s.pos[0] - k.x, s.pos[2] - k.z) < V.bouwAfstand && Math.abs(s.pos[1] - k.y) < 1.4) return st;
  }
  return null;
}

export function beginBouwen(s, v, V, meld) {
  v.bouwt = V.bouwTijd;
  meld({ soort: 'vlotBouwen', speler: s.id, vlot: v.id, pos: [...v.pos] });
}

/** Instappen: de avonturier springt op het vlot, de pony (met zwemvest) springt mee. */
export function stapIn(s, v, p, V, meld) {
  v.ruiter = s.id;
  v.plek = 'vaart';
  v.vs = 0;
  v.vd = 0;
  s.modus = 'varen';
  s.vlot = v.id;
  s.vel = [0, 0, 0];
  meld({ soort: 'vlotIn', speler: s.id, van: [...s.pos] });
  if (p && !p.ruiter) {
    const van = [...p.pos];
    const ver = Math.hypot(p.pos[0] - v.pos[0], p.pos[2] - v.pos[2]) > 22;
    p.modus = 'vlot';
    p.vlot = v.id;
    p.snelheid = 0;
    p.vel = [0, 0, 0];
    p.gang = 'stil';
    p.graast = false;
    v.pony = p.id;
    meld({ soort: 'ponyOpVlot', speler: s.id, pony: p.id, van, ver });
  }
  volg(s, v, p, V);
}

/** Speler en pony staan op het vlot: ze bewegen mee. */
function volg(s, v, p, V) {
  opVlot(v, V.zitPlek, s.pos);
  s.richting = v.richting;
  s.vel[0] = v.vel[0];
  s.vel[1] = v.vel[1];
  s.vel[2] = v.vel[2];
  s.opGrond = true;
  if (p && v.pony === p.id) {
    p.vorigePos[0] = p.pos[0];
    p.vorigePos[1] = p.pos[1];
    p.vorigePos[2] = p.pos[2];
    p.vorigeRichting = p.richting;
    opVlot(v, V.ponyPlek, p.pos);
    p.richting = v.richting;
    p.vel = [v.vel[0], v.vel[1], v.vel[2]];
    p.opGrond = !v.lucht;
  }
}

/**
 * Eén tijdstap varen.
 * @param {any} s speler @param {Vlot} v @param {any} p pony (of null) @param {any} int intentie (int.peddel = joystick [x, y])
 * @param {any[]} rivieren alle rivieren (zie bovenaan) @param {any} wereld
 * @param {typeof import('../../data/rivier.js').VLOT} V
 */
export function stapVaren(s, v, p, int, rivieren, wereld, V, dt, meld) {
  const rivier = rivieren[v.tak];
  const [px, py] = int.peddel ?? [0, 0];
  v.botsWacht = Math.max(0, v.botsWacht - dt);
  // Een hupje op het vlot (springknop): alleen voor de pret.
  const drukNu = int.spring && !s.springVorige;
  s.springVorige = int.spring;
  if (drukNu && v.hop <= 0) {
    v.hop = 0.45;
    meld({ soort: 'vlotHop', speler: s.id });
  }
  v.hop = Math.max(0, v.hop - dt);
  if (v.plek === 'lagune') stapLagune(s, v, px, py, rivier, wereld, V, dt, meld);
  else stapRivier(s, v, px, py, rivieren, V, dt, meld);
  volg(s, v, p, V);
}

function stapRivier(s, v, px, py, rivieren, V, dt, meld) {
  let rivier = rivieren[v.tak];
  // --- Sturen en peddelen ---
  const u = rivier.stroom(v.s, v.d);
  v.vd += px * V.stuur * dt;
  v.vd -= v.vd * Math.min(1, V.zijDemping * dt);
  v.vd = Math.max(-V.maxZij, Math.min(V.maxZij, v.vd));
  let doel = u + (py > 0 ? py * V.versnel : py * V.rem);
  // De kolk: het water draait je rond en gooit je er na een rondje weer uit.
  for (const ko of rivier.kolken) {
    const ds = v.s - ko.s;
    const dd = v.d - ko.d;
    const a = Math.hypot(ds, dd);
    if (a >= ko.r || v.lucht) continue;
    const k = 1 - a / ko.r;
    const n = Math.max(a, 0.3);
    doel += (-dd / n) * ko.draai * a * k;
    v.vd += ((ds / n) * ko.draai * a * k * 2.2 + (dd / n) * ko.wegDuw * k * 2) * dt;
    v.draaiV += ko.draai * k * dt * 2.5;
    if (!v.inKolk) meld({ soort: 'vlotKolk', speler: s.id, pos: [...v.pos] });
    v.inKolk = 1.5;
  }
  v.inKolk = Math.max(0, (v.inKolk ?? 0) - dt);
  v.vs += (doel - v.vs) * (1 - Math.exp(-V.volgStroom * dt));

  // --- Bewegen (in de lucht trager: slow motion) ---
  const voor = v.s;
  if (!v.lucht) {
    for (const sp of rivier.sprongen) {
      if (!(voor < sp.s && voor + v.vs * dt >= sp.s)) continue;
      v.lucht = true;
      v.sprong = sp;
      // De grote waterval: altijd recht en met vaart erover, zodat je mooi van de rots wegvliegt.
      if (sp.groot) {
        v.vs = Math.max(v.vs, V.groteVal.minVaart);
        v.vd *= 0.3;
        v.vy = V.groteVal.op;
      } else v.vy = V.sprongOp;
      v.y = sp.top;
      meld({ soort: 'vlotSprong', speler: s.id, pos: [...v.pos], groot: !!sp.groot, hoogte: sp.hoogte, tak: v.tak });
      break;
    }
  }
  if (v.lucht) {
    const sp = v.sprong;
    const doelSlow = sp?.groot ? V.groteVal.slowmo : sp && sp.hoogte > 2 ? V.slowmoKlein : V.slowmo;
    v.slowmo += (doelSlow - v.slowmo) * Math.min(1, dt * 10);
    const k = v.slowmo;
    v.vy -= V.zwaartekracht * dt * k;
    v.y += v.vy * dt * k;
    v.s += v.vs * dt * k;
    v.d += v.vd * dt * k;
    const w = rivier.peil(v.s);
    // Landen kan pas voorbij het vallende water (niet halverwege op het gordijn).
    const voorbij = !sp || v.s >= sp.s + sp.lengte;
    if (v.y <= w && v.vy < 0 && voorbij) {
      meld({ soort: 'vlotLanding', speler: s.id, pos: [v.pos[0], w, v.pos[2]], snelheid: -v.vy, groot: !!sp?.groot, tak: v.tak });
      v.schommel = Math.min(1, v.schommel + (sp?.groot ? 1 : 0.8));
      v.y = w;
      v.vy = 0;
      v.lucht = false;
      v.sprong = null;
      v.vs *= sp?.groot ? 0.55 : 0.8;
    }
  } else {
    v.slowmo += (1 - v.slowmo) * Math.min(1, dt * 3);
    v.s += v.vs * dt;
    v.d += v.vd * dt;
    // De golftrein: het vlot danst op de staande golven.
    const g = rivier.golfOp(v.s, v.d);
    const g2 = rivier.golfOp(v.s + 0.6, v.d);
    v.golf = g;
    v.kantel = Math.atan2(g2 - g, 0.6) * 1.4;
    if (Math.abs(g) > 0.12) v.schommel = Math.max(v.schommel, Math.abs(g) * 0.9);
    v.y = rivier.peil(v.s) + g;
  }

  // --- Van de bergrivier in de benedenrivier ---
  const vg = rivier.volgende;
  if (vg && v.s >= vg.sHier) {
    v.tak = rivieren.indexOf(vg.tak);
    v.s = vg.s + (v.s - vg.sHier);
    rivier = vg.tak;
    meld({ soort: 'vlotTak', speler: s.id, tak: v.tak });
  }

  // --- De oevers ---
  const b = rivier.breedte(v.s);
  const lim = Math.max(0.2, b - V.straal * 0.9);
  if (Math.abs(v.d) > lim) {
    const zij = Math.sign(v.d);
    v.d = zij * lim;
    const naar = v.vd * zij;
    if (naar > 0.35) {
      // Een echte botsing: een bonk en vaart kwijt.
      v.vd = -v.vd * V.stuit;
      bots(s, v, Math.min(1, naar / 1.5 + 0.2), V.oeverRem, zij, meld, false);
    } else if (naar > 0) {
      // Langs de oever schuren: een beetje afremmen, verder glijden.
      v.vd = 0;
      v.vs *= 1 - Math.min(1, 0.25 * dt);
    }
  }
  // Stroomopwaarts kan niet voorbij de bron. (Op de benedenrivier: niet terug de bergrivier op.)
  if (v.s < rivier.sBegin + 1.5) {
    v.s = rivier.sBegin + 1.5;
    v.vs = Math.max(0, v.vs);
  }

  // --- Het eilandje van de splitsing: kies links (rustig) of rechts (wild) ---
  if (rivier.split) {
    const eil = rivier.eilandOp(v.s);
    const sp = rivier.split;
    const zij = v.d !== 0 ? Math.sign(v.d) : sp.wilde;
    if (v.s > sp.van - 3 && v.s < sp.van + 1 && Math.abs(v.d) < 1.4) v.vd += zij * V.kussen * 0.8 * dt;
    const min = eil + V.straal * 0.85;
    if (eil > 0 && Math.abs(v.d) < min) {
      v.d = zij * min;
      if (v.vd * zij < -0.35) {
        v.vd = -v.vd * V.stuit;
        bots(s, v, 0.4, V.oeverRem, -zij, meld, false);
      } else if (v.vd * zij < 0) v.vd = 0;
    }
  }

  // --- Rotsen ---
  let raakt = null;
  for (const r of rivier.rotsen) {
    // Het water stroomt om een rots heen: vlak ervoor duwt het je zacht opzij (het "kussen"),
    // zodat je er nooit recht tegen blijft hangen.
    const voorRots = r.s - v.s;
    const opzij = v.d - r.d;
    const breed = r.r + V.straal + 0.35;
    if (voorRots > -0.3 && voorRots < 3 && Math.abs(opzij) < breed) {
      let kant = opzij !== 0 ? Math.sign(opzij) : r.d >= 0 ? -1 : 1;
      // Is er aan die kant geen plaats tussen de rots en de oever, dan duwt het water je naar de andere kant.
      const bR = rivier.breedte(r.s);
      const ruimte = kant > 0 ? bR - (r.d + r.r) : bR + (r.d - r.r);
      if (ruimte < V.straal * 2 + 0.1) kant = -kant;
      v.vd += kant * V.kussen * (1 - Math.abs(opzij) / breed) * (1 - Math.max(0, voorRots) / 3) * dt;
    }
    const ds = v.s - r.s;
    if (Math.abs(ds) > r.r + V.straal + 0.5) continue;
    const dd = v.d - r.d;
    const afst = Math.hypot(ds, dd);
    const min = r.r + V.straal;
    if (afst >= min || afst < 1e-6) continue;
    raakt = r;
    const ns = ds / afst;
    const nd = dd / afst;
    v.s = r.s + ns * min;
    v.d = r.d + nd * min;
    const vn = v.vs * ns + v.vd * nd;
    if (vn < 0) {
      v.vs -= (1 + V.stuit) * vn * ns;
      v.vd -= (1 + V.stuit) * vn * nd;
      bots(s, v, Math.min(1, -vn / 2 + 0.2), V.rotsRem, nd >= 0 ? 1 : -1, meld, true);
    }
  }

  // Vast tegen een rots (bv. tussen rots en oever)? Na een tijdje duwt het water je naar de kant met de meeste ruimte.
  v.vastTijd = raakt && Math.abs(v.vs) < 0.4 ? (v.vastTijd ?? 0) + dt : 0;
  if (v.vastTijd > V.losNa) {
    const bR = rivier.breedte(raakt.s);
    const links = bR + (raakt.d - raakt.r);
    const rechts = bR - (raakt.d + raakt.r);
    v.vd += (rechts > links ? 1 : -1) * V.stuur * 1.5 * dt;
  }

  // --- Draaien en schommelen: een botsing laat het vlot even ronddraaien, dat dempt weer uit ---
  v.draai += v.draaiV * dt;
  v.draaiV -= v.draaiV * Math.min(1, V.draaiDemping * dt);
  v.draai -= v.draai * Math.min(1, 0.9 * dt);
  v.schommel = Math.max(0, v.schommel - dt * 0.9);

  naarWereld(v, rivier);
  rivier.raaklijn(v.s, rl);
  v.vel[0] = rl[0] * v.vs - rl[1] * v.vd;
  v.vel[1] = v.lucht ? v.vy : 0;
  v.vel[2] = rl[1] * v.vs + rl[0] * v.vd;

  // Voorbij de monding: vrij in de lagune.
  if (rivier.sMond !== Infinity && v.s > rivier.sMond + V.mondVrij) {
    v.plek = 'lagune';
    v.y = 0;
    v.pos[1] = 0;
    meld({ soort: 'inLagune', speler: s.id });
  }
}

/** Botsen kost alleen vaart: een bonk, wat spetters, en het vlot draait en schommelt even. */
function bots(s, v, sterkte, rem, zij, meld, rots) {
  v.vs *= 1 - rem * sterkte;
  v.draaiV += -zij * sterkte * 2.2 * (rots ? 1 : 0.6);
  v.schommel = Math.min(1, v.schommel + sterkte * 0.7);
  if (v.botsWacht <= 0 && sterkte > 0.25) {
    v.botsWacht = 0.35;
    meld({ soort: 'vlotBots', speler: s.id, pos: [...v.pos], sterkte, rots });
  }
}

const sr = [0, 0];
function stapLagune(s, v, px, py, rivier, wereld, V, dt, meld) {
  // Draaien met links en rechts, peddelen met vooruit.
  v.richting -= px * V.laguneDraai * dt;
  const fx = Math.sin(v.richting);
  const fz = Math.cos(v.richting);
  v.vel[0] += fx * py * V.lagunePeddel * dt;
  v.vel[2] += fz * py * V.lagunePeddel * dt;
  // Het water uit de rivier duwt je nog een eindje de lagune in.
  rivier.stroomOp(v.pos[0], v.pos[2], sr);
  v.vel[0] += (sr[0] - v.vel[0]) * Math.min(1, dt * 0.8) * (sr[0] || sr[1] ? 1 : 0);
  v.vel[2] += (sr[1] - v.vel[2]) * Math.min(1, dt * 0.8) * (sr[0] || sr[1] ? 1 : 0);
  const dem = Math.exp(-V.laguneDemping * dt);
  v.vel[0] *= dem;
  v.vel[2] *= dem;
  const hv = Math.hypot(v.vel[0], v.vel[2]);
  if (hv > V.laguneMax) {
    v.vel[0] *= V.laguneMax / hv;
    v.vel[2] *= V.laguneMax / hv;
  }
  // Langzaam bijdraaien in de richting waarin het drijft (een vlot heeft geen kiel, maar toch).
  const ox = v.pos[0];
  const oz = v.pos[2];
  v.pos[0] += v.vel[0] * dt;
  v.pos[2] += v.vel[2] * dt;
  // Ondiep water of de steiger: terug, en wat vaart kwijt.
  const ondiep = (x, z) => wereld.raster.hoogteOp(x, z) > -V.minDiepte || rivier.dekOp(x, z, 0.1) > -Infinity;
  let geraakt = false;
  for (const [x, z] of [[v.pos[0] + fx * V.straal, v.pos[2] + fz * V.straal], [v.pos[0] - fx * V.straal, v.pos[2] - fz * V.straal], [v.pos[0] + fz * V.straal * 0.8, v.pos[2] - fx * V.straal * 0.8], [v.pos[0] - fz * V.straal * 0.8, v.pos[2] + fx * V.straal * 0.8]]) {
    if (ondiep(x, z)) geraakt = true;
  }
  if (geraakt) {
    v.pos[0] = ox;
    v.pos[2] = oz;
    const st = Math.hypot(v.vel[0], v.vel[2]);
    v.vel[0] *= -0.25;
    v.vel[2] *= -0.25;
    if (st > 0.6) bots(s, v, Math.min(1, st / 2), 0, 1, meld, false);
  }
  v.schommel = Math.max(0, v.schommel - dt * 0.9);
  v.pos[1] = 0;
  v.y = 0;
}

/** Waar je kan aanleggen: de steiger in de lagune, een droge oever vlakbij, of aan een steiger langs de rivier. */
export function aanlegPlek(v, rivieren, wereld, V) {
  const rivier = rivieren[v.tak];
  if (v.plek === 'vaart') {
    if (v.lucht || Math.abs(v.vs) >= 2.5) return null;
    for (const st of rivier.steigers) {
      const k = st.dek;
      if (Math.hypot(v.pos[0] - k.x, v.pos[2] - k.z) < V.aanlegAfstand + 0.8) return { steiger: true, pos: dekPunt(k, 0.5), dek: k, naam: st.naam };
    }
    return null;
  }
  if (v.plek !== 'lagune') return null;
  const [lx, lz] = rivier.laguneLigplaats;
  const k = rivier.lagDek;
  if (Math.hypot(v.pos[0] - lx, v.pos[2] - lz) < V.aanlegAfstand) return { steiger: true, pos: dekPunt(k, k.halfL - 0.6), dek: k };
  // Een droge plek op de oever, rondom het vlot.
  let beste = null;
  let bd = Infinity;
  for (let r = 1.6; r <= 3.2; r += 0.8) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = v.pos[0] + Math.sin(a) * r;
      const z = v.pos[2] + Math.cos(a) * r;
      const g = wereld.grondOp(x, z);
      if (g < 0.12 || wereld.waterOp(x, z) > g - 0.05) continue;
      if (r < bd) {
        bd = r;
        beste = { steiger: false, pos: [x, g, z] };
      }
    }
    if (beste) break;
  }
  return beste;
}
const dekPunt = (k, l) => [k.x + k.ax * l, k.y, k.z + k.az * l];

/** Aanleggen: de avonturier springt aan land (of op de steiger), de pony springt ernaast. */
export function legAan(s, v, p, plek, wereld, meld) {
  const [x, y, z] = plek.pos;
  meld({ soort: 'vlotUit', speler: s.id, van: [...s.pos], naar: [x, y, z] });
  s.modus = 'lopen';
  s.vlot = null;
  s.pos = [x, y, z];
  s.vel = [0, 0, 0];
  s.opGrond = true;
  s.veilig = [x, y, z];
  if (plek.dek) s.richting = Math.atan2(plek.dek.ax, plek.dek.az) + (v.plek === 'lagune' ? Math.PI : 0);
  v.ruiter = null;
  v.vs = 0;
  v.vd = 0;
  if (v.plek === 'vaart') {
    v.plek = 'boven';
    if (plek.naam) v.steiger = plek.naam;
  }
  if (p && v.pony === p.id) {
    const van = [...p.pos];
    // Naast de avonturier, op droge grond (of op de steiger, een stapje verder).
    let nx = x;
    let nz = z;
    for (const [ox, oz] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.1, 1.1], [-1.1, -1.1]]) {
      const g = wereld.grondOp(x + ox, z + oz);
      if (g > 0.12 && wereld.waterOp(x + ox, z + oz) < g - 0.05 && Math.abs(g - y) < 0.8) {
        nx = x + ox;
        nz = z + oz;
        break;
      }
    }
    if (plek.dek) {
      // Op een steiger: verder het land op, in het verlengde van het dek.
      const k = plek.dek;
      const terug = v.plek === 'lagune' ? -1 : 0;
      if (terug) {
        nx = k.x - k.ax * (k.halfL + 1.6);
        nz = k.z - k.az * (k.halfL + 1.6);
      }
    }
    const g = wereld.grondOp(nx, nz);
    p.modus = 'staat';
    p.vlot = null;
    p.pos = [nx, g, nz];
    p.vorigePos = [...van];
    p.veilig = [nx, g, nz];
    p.opGrond = true;
    p.vel = [0, 0, 0];
    v.pony = null;
    meld({ soort: 'ponyVanVlot', speler: s.id, pony: p.id, van, naar: [nx, g, nz] });
  }
}

/** Het vlot als niemand erop zit: bouwen, dobberen, en weer klaarleggen aan de steiger het dichtst bij jou. */
export function stapVlotVrij(v, s, rivieren, V, dt, meld) {
  if (v.bouwt > 0) {
    v.bouwt -= dt;
    if (v.bouwt <= 0) {
      v.bouwt = 0;
      v.gebouwd = true;
      meld({ soort: 'vlotKlaar', speler: v.eigenaar, pos: [...v.pos] });
    }
  }
  v.vel[0] = v.vel[2] = 0;
  v.schommel = Math.max(0, v.schommel - dt);
  if (!s || v.bouwt > 0 || Math.hypot(s.pos[0] - v.pos[0], s.pos[2] - v.pos[2]) <= V.terugNa) return;
  // De steiger het dichtst bij de speler (een onaf vlot blijft bij de bron, waar je het bouwt).
  let beste = null;
  let bd = Infinity;
  for (const st of alleSteigers(rivieren)) {
    if (!v.gebouwd && st.tak === 0 && st.steiger.naam !== 'bron') continue;
    const k = st.steiger.dek;
    const d = Math.hypot(s.pos[0] - k.x, s.pos[2] - k.z) + Math.abs(s.pos[1] - k.y) * 2;
    if (d < bd) {
      bd = d;
      beste = st;
    }
  }
  if (!beste || (v.plek === 'boven' && beste.tak === v.tak && beste.steiger.naam === v.steiger)) return;
  zetKlaar(v, rivieren, beste.tak, beste.steiger.naam);
  v.vorigePos = [...v.pos];
  v.vorigeRichting = v.richting;
  meld({ soort: 'vlotTerug', speler: v.eigenaar, tak: v.tak, steiger: v.steiger });
}
