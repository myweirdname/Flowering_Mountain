// Varen op het vlot (GD 9, TP 6): een plat schijfje in riviercoördinaten (s langs de stroom, d dwars erop).
// Het vlot drijft mee met de stroming; jij stuurt links en rechts en kan kort versnellen of afremmen.
// Botsen tegen een rots of de oever kost alleen vaart. Over de kleine sprong vlieg je even in slow motion.
// In de lagune peddel je vrij rond in stil water en leg je aan bij de steiger of aan de oever.
// Ook: de bouwstukken verzamelen en het vlot bouwen. Geen Three.js, alleen gegevens.

/** @typedef {ReturnType<typeof maakVlot>} Vlot */
export function maakVlot(id, eigenaar, rivier, V) {
  const v = {
    id,
    eigenaar,
    gebouwd: false,
    bouwt: 0,           // seconden die het bouwen nog duurt
    stukken: V.stukken.map(() => false),
    plek: 'boven',      // 'boven' (klaar aan de bron), 'vaart' (op de rivier), 'lagune' (vrij in stil water)
    ruiter: null,       // id van de speler die erop zit
    pony: null,         // id van de pony die meevaart
    s: 0, d: 0, vs: 0, vd: 0,
    y: 0, vy: 0, lucht: false, slowmo: 1,
    draai: 0, draaiV: 0, schommel: 0, hop: 0,
    pos: [0, 0, 0], vorigePos: [0, 0, 0], vel: [0, 0, 0],
    richting: 0, vorigeRichting: 0,
    botsWacht: 0,
  };
  zetKlaar(v, rivier);
  v.vorigePos = [...v.pos];
  v.vorigeRichting = v.richting;
  return v;
}

/** Het vlot ligt (weer) klaar naast de steiger bij de bron. */
export function zetKlaar(v, rivier) {
  Object.assign(v, { plek: 'boven', s: rivier.ligplaats.s, d: rivier.ligplaats.d, vs: 0, vd: 0, vy: 0, lucht: false, draai: 0, draaiV: 0, schommel: 0, slowmo: 1 });
  v.y = rivier.peil(v.s);
  naarWereld(v, rivier);
  v.vel = [0, 0, 0];
}

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

/** Staat de speler bij de steiger aan de bron? */
export function bijSteiger(s, rivier, V) {
  const k = rivier.bovenDek;
  return Math.hypot(s.pos[0] - k.x, s.pos[2] - k.z) < V.bouwAfstand && Math.abs(s.pos[1] - k.y) < 1.4;
}

export function beginBouwen(s, v, V, meld) {
  v.bouwt = V.bouwTijd;
  meld({ soort: 'vlotBouwen', speler: s.id, vlot: v.id, pos: [...v.pos] });
}

/** Instappen: de avonturier springt op het vlot, de pony (met zwemvest) springt mee. */
export function stapIn(s, v, p, rivier, V, meld) {
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
 * @param {ReturnType<typeof import('../wereld/rivier.js').maakRivier>} rivier @param {any} wereld
 * @param {typeof import('../../data/rivier.js').VLOT} V
 */
export function stapVaren(s, v, p, int, rivier, wereld, V, dt, meld) {
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
  else stapRivier(s, v, px, py, rivier, V, dt, meld);
  volg(s, v, p, V);
}

function stapRivier(s, v, px, py, rivier, V, dt, meld) {
  // --- Sturen en peddelen ---
  const u = rivier.stroom(v.s, v.d);
  v.vd += px * V.stuur * dt;
  v.vd -= v.vd * Math.min(1, V.zijDemping * dt);
  v.vd = Math.max(-V.maxZij, Math.min(V.maxZij, v.vd));
  const doel = u + (py > 0 ? py * V.versnel : py * V.rem);
  v.vs += (doel - v.vs) * (1 - Math.exp(-V.volgStroom * dt));

  // --- Bewegen (in de lucht trager: slow motion) ---
  const SP = rivier.R.sprong;
  const voor = v.s;
  if (!v.lucht && voor < SP.s && voor + v.vs * dt >= SP.s) {
    v.lucht = true;
    v.vy = V.sprongOp;
    v.y = rivier.peil(SP.s - 0.01);
    meld({ soort: 'vlotSprong', speler: s.id, pos: [...v.pos] });
  }
  if (v.lucht) {
    v.slowmo += (V.slowmo - v.slowmo) * Math.min(1, dt * 10);
    const k = v.slowmo;
    v.vy -= V.zwaartekracht * dt * k;
    v.y += v.vy * dt * k;
    v.s += v.vs * dt * k;
    v.d += v.vd * dt * k;
    const w = rivier.peil(v.s);
    if (v.y <= w && v.vy < 0) {
      meld({ soort: 'vlotLanding', speler: s.id, pos: [v.pos[0], w, v.pos[2]], snelheid: -v.vy });
      v.schommel = Math.min(1, v.schommel + 0.8);
      v.y = w;
      v.vy = 0;
      v.lucht = false;
      v.vs *= 0.8;
    }
  } else {
    v.slowmo += (1 - v.slowmo) * Math.min(1, dt * 3);
    v.s += v.vs * dt;
    v.d += v.vd * dt;
    v.y = rivier.peil(v.s);
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
  // Stroomopwaarts kan niet voorbij de bron.
  if (v.s < rivier.sBegin + 1.5) {
    v.s = rivier.sBegin + 1.5;
    v.vs = Math.max(0, v.vs);
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
  if (v.s > rivier.sMond + V.mondVrij) {
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

/** Waar je kan aanleggen: de steiger in de lagune, een droge oever vlakbij, of terug aan de steiger bij de bron. */
export function aanlegPlek(v, rivier, wereld, V) {
  if (v.plek === 'vaart') {
    const k = rivier.bovenDek;
    if (Math.abs(v.vs) < 2.5 && Math.hypot(v.pos[0] - k.x, v.pos[2] - k.z) < V.aanlegAfstand + 0.8) return { steiger: true, pos: dekPunt(k, 0.5), dek: k };
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
  if (v.plek === 'vaart') v.plek = 'boven';
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

/** Het vlot als niemand erop zit: bouwen, dobberen, en weer klaarleggen aan de bron als je ver weg bent. */
export function stapVlotVrij(v, s, rivier, V, dt, meld) {
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
  if (v.plek !== 'boven' && s && Math.hypot(s.pos[0] - v.pos[0], s.pos[2] - v.pos[2]) > V.terugNa) {
    zetKlaar(v, rivier);
    v.vorigePos = [...v.pos];
    v.vorigeRichting = v.richting;
    meld({ soort: 'vlotTerug', speler: v.eigenaar });
  }
}
