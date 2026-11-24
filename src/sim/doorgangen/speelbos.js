// Het speelbos (BOUWPLAN 11, GD 3 en 14): een kort parcours van boomhutplatforms achter de oefenrots,
// met de eerste zes doorgangen ertussen. Elke doorgang wordt vanuit de oplossing gebouwd (TP 5.3) en
// heeft een testbot (zie bots.js en test.html). Hier: de ligging, de bosvloer en de vijver in de
// hoogtefunctie, waar je op staat, en de regels die voor het hele parcours gelden (vallen, voortgang).
import { maakWillekeur } from '../../kern/willekeur.js';
import { naarLokaal, naarWereld, glad, totStuk } from './hulp.js';
import { maakLianen, stapLianen, grijpLiaan, stapSlingeren, laatLiaanLos, springNaarLiaan, bloesemsLiaan, touwPunt } from './liaan.js';
import { maakTouwbrug, oppervlakTouwbrug, stapTouwbrug, leuningTouwbrug, bloesemsTouwbrug, doelenTouwbrug } from './touwbrug.js';
import { maakBalanceerstam, oppervlakBalanceerstam, stapBalanceerstam, opStam, invoerBalanceerstam, wiebelBalanceerstam, bloesemsBalanceerstam, doelenBalanceerstam } from './balanceerstam.js';
import { maakSpringbloem, oppervlakSpringbloem, stapSpringbloem, stapSpelerSpringbloem, bloesemsSpringbloem, doelenSpringbloem } from './springbloem.js';
import { maakReuzenblad, oppervlakReuzenblad, stapReuzenblad, bloesemsReuzenblad, doelenReuzenblad } from './reuzenblad.js';
import { maakLotus, oppervlakLotus, stapLotus, bloesemsLotus, doelenLotus } from './lotus.js';

const SOORTEN = {
  liaan: { maak: maakLianen, oppervlak: () => -Infinity, bloesems: bloesemsLiaan, doelen: () => [] },
  touwbrug: { maak: maakTouwbrug, oppervlak: oppervlakTouwbrug, bloesems: bloesemsTouwbrug, doelen: doelenTouwbrug },
  balanceerstam: { maak: maakBalanceerstam, oppervlak: oppervlakBalanceerstam, bloesems: bloesemsBalanceerstam, doelen: doelenBalanceerstam },
  springbloem: { maak: maakSpringbloem, oppervlak: oppervlakSpringbloem, bloesems: bloesemsSpringbloem, doelen: doelenSpringbloem },
  reuzenblad: { maak: maakReuzenblad, oppervlak: oppervlakReuzenblad, bloesems: bloesemsReuzenblad, doelen: doelenReuzenblad },
  lotus: { maak: maakLotus, oppervlak: oppervlakLotus, bloesems: bloesemsLotus, doelen: doelenLotus },
};

/**
 * @param {typeof import('../../data/speelbos.js').SPEELBOS} D
 * @param {{ x:number, z:number }} kamp
 * @param {number} kant aan welke kant van het kamp de lagune ligt (-1 of 1); het speelbos gaat de andere kant op
 * @param {(x:number, z:number) => number} ruw de landvorm zonder stempels (om de bosvloer op te leggen)
 * @param {number} zaadje
 */
export function maakSpeelbos(D, kamp, kant, ruw, zaadje) {
  const w = maakWillekeur(zaadje);
  // Richting in graden naar de wereld: 0 = opzij (weg van de lagune), 90 = de jungle in (+z).
  const richting = (g) => {
    const r = (g * Math.PI) / 180;
    const x = -kant * Math.cos(r);
    const z = Math.sin(r);
    return [Math.abs(x) < 1e-9 ? 0 : x, Math.abs(z) < 1e-9 ? 0 : z];
  };

  // --- De platforms en de doorgangen ertussen, achter elkaar gelegd ---
  const dekken = D.dekken.map((d) => ({ ...d, x: 0, z: 0, h: 0 }));
  dekken[0].x = kamp.x - kant * D.start.opzij;
  dekken[0].z = kamp.z + D.start.verder;
  const modules = D.modules.map(([soort, graden], i) => {
    const m = SOORTEN[soort].maak(w, D);
    const a = richting(graden);
    m.i = i;
    m.a = a;
    m.b = [-a[1], a[0]];
    const van = dekken[i];
    const naar = dekken[i + 1];
    m.o = [van.x + a[0] * van.straal, van.z + a[1] * van.straal];
    naar.x = m.o[0] + a[0] * (m.len + naar.straal);
    naar.z = m.o[1] + a[1] * (m.len + naar.straal);
    m.rv = van.straal;
    m.rn = naar.straal;
    return m;
  });

  // De bosvloer: één vlakke hoogte voor het hele parcours (het gemiddelde van het land eronder).
  const vloer = Math.round((dekken.reduce((s, d) => s + ruw(d.x, d.z), 0) / dekken.length) * 10) / 10;
  for (const d of dekken) d.h = vloer + d.hoogte;
  const peil = vloer - D.vijver.peilOnder;
  for (const m of modules) {
    m.h0 = dekken[m.i].h;
    m.h1 = dekken[m.i + 1].h;
    m.peil = peil;
  }

  // De trap naar het eerste platform en de uitgang van het eilandje.
  const maakPlank = (dek, P, hoogteVan, hoogteTot) => {
    const a = richting(P.richting);
    const o = [dek.x + a[0] * (dek.straal - 0.3), dek.z + a[1] * (dek.straal - 0.3)];
    return { a, b: [-a[1], a[0]], o, len: P.lengte + 0.3, breed: P.breedte, h0: hoogteVan, h1: hoogteTot };
  };
  const trap = maakPlank(dekken[0], D.trap, dekken[0].h, vloer);
  const laatste = dekken[dekken.length - 1];
  const uitgang = maakPlank(laatste, D.uitgang, laatste.h, vloer + 0.05);
  const plankOp = (p, x, z) => {
    const [t, q] = naarLokaal(p, x, z);
    if (t < 0 || t > p.len || Math.abs(q) > p.breed / 2) return -Infinity;
    return p.h0 + (p.h1 - p.h0) * (t / p.len);
  };

  // De vijver: van de hoge boomhut tot rond het eilandje.
  const E = dekken[4];
  const mv = modules[4];
  const vijverVan = [E.x + mv.a[0] * (E.straal + D.vijver.begin), E.z + mv.a[1] * (E.straal + D.vijver.begin)];
  const vijverTot = [laatste.x, laatste.z];
  const V = D.vijver;

  // De lijn van het parcours (voor de vlakke bosvloer).
  const lijn = [naarWereld(trap, trap.len, 0), ...dekken.map((d) => [d.x, d.z]), naarWereld(uitgang, uitgang.len + 1, 0)];
  const minX = Math.min(...lijn.map((p) => p[0])) - D.vloer.plat - D.vloer.rand;
  const maxX = Math.max(...lijn.map((p) => p[0])) + D.vloer.plat + D.vloer.rand;
  const minZ = Math.min(...lijn.map((p) => p[1])) - D.vloer.plat - D.vloer.rand;
  const maxZ = Math.max(...lijn.map((p) => p[1])) + D.vloer.plat + D.vloer.rand;
  const binnen = (x, z, marge = 0) => x > minX - marge && x < maxX + marge && z > minZ - marge && z < maxZ + marge;

  /**
   * De bosvloer en de vijver in de hoogtefunctie (zoals de rivier en de springweide).
   * @param {{ h:number, vlak:number, vijver:number }} uit
   */
  function stempel(x, z, h, uit) {
    uit.h = h;
    uit.vlak = 0;
    uit.vijver = 0;
    if (!binnen(x, z)) return uit;
    let d = Infinity;
    for (let i = 0; i < lijn.length - 1; i++) d = Math.min(d, totStuk(x, z, lijn[i], lijn[i + 1]));
    const vlak = 1 - glad((d - D.vloer.plat) / D.vloer.rand);
    uit.vlak = vlak;
    let y = h + (vloer - h) * vlak;
    const dv = totStuk(x, z, vijverVan, vijverTot);
    if (dv < V.straal + 1) {
      const bodem = vloer - V.diepte + (V.diepte + 0.12) * glad((dv - (V.straal - V.oever)) / (V.oever + 0.3));
      y = Math.min(y, bodem);
      uit.vijver = 1 - glad((dv - V.straal + 0.4) / 0.8);
    }
    uit.h = y;
    return uit;
  }

  /** Het waterpeil van de vijver, of -Infinity. */
  function peilOp(x, z) {
    if (!binnen(x, z)) return -Infinity;
    return totStuk(x, z, vijverVan, vijverTot) < V.straal + 0.6 ? peil : -Infinity;
  }

  /** Wat ligt er op (x, z): de bovenkant van platform, brug, stam, bloem, blad of lotus (of -Infinity). */
  function blokOp(x, z) {
    if (!binnen(x, z, -D.vloer.rand)) return -Infinity;
    let best = Math.max(plankOp(trap, x, z), plankOp(uitgang, x, z));
    for (const d of dekken) {
      if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.straal * d.straal && d.h > best) best = d.h;
    }
    for (const m of modules) {
      const [t, q] = naarLokaal(m, x, z);
      if (t < -2.5 || t > m.len + 0.5 || Math.abs(q) > 2.2) continue;
      const y = SOORTEN[m.soort].oppervlak(m, D, t, q);
      if (y > best) best = y;
    }
    return best;
  }

  /** Waarop staat de speler: een platform (index), een doorgang ('m' + index), of null (de grond). */
  function waarOp(s) {
    const x = s.pos[0];
    const z = s.pos[2];
    const y = s.pos[1];
    for (let i = 0; i < dekken.length; i++) {
      const d = dekken[i];
      if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.straal * d.straal + 0.05 && Math.abs(y - d.h) < 0.12) return i;
    }
    if (Math.abs(y - plankOp(trap, x, z)) < 0.15) return 'trap';
    if (Math.abs(y - plankOp(uitgang, x, z)) < 0.15) return 'uitgang';
    for (const m of modules) {
      const [t, q] = naarLokaal(m, x, z);
      if (t < -2.5 || t > m.len + 0.5 || Math.abs(q) > 2.2) continue;
      if (Math.abs(y - SOORTEN[m.soort].oppervlak(m, D, t, q)) < 0.3) return 'm' + m.i; // bladeren en bloem bewegen
    }
    return null;
  }

  // De reuzenbomen naast de platforms: aan de kant waar geen doorgang of trap vertrekt, zodat het dek vrij
  // blijft en de camera er niet achter hangt. Je botst ertegen (zoals tegen de bomen in de jungle).
  const openingen = dekken.map(() => []);
  modules.forEach((m) => {
    openingen[m.i].push(m.a);
    openingen[m.i + 1].push([-m.a[0], -m.a[1]]);
  });
  openingen[0].push(trap.a);
  openingen[dekken.length - 1].push(uitgang.a);
  dekken.forEach((d, i) => {
    let sx = 0;
    let sz = 0;
    for (const [x, z] of openingen[i]) {
      sx += x;
      sz += z;
    }
    let l = Math.hypot(sx, sz);
    if (l < 0.3) {
      // Recht tegenover elkaar: dan opzij.
      sx = -openingen[i][0][1];
      sz = openingen[i][0][0];
      l = 1;
    }
    d.boomRichting = [-sx / l, -sz / l];
    d.bx = d.x + d.boomRichting[0] * (d.straal + D.stam * 0.6);
    d.bz = d.z + d.boomRichting[1] * (d.straal + D.stam * 0.6);
  });
  const stammen = dekken.filter((d) => d.boom).map((d) => ({ x: d.bx, z: d.bz, r: D.stam }));

  // Bloesems langs het parcours.
  const bloesems = [];
  for (const m of modules) {
    for (const [t, q, y] of SOORTEN[m.soort].bloesems(m, D)) {
      const [x, z] = naarWereld(m, t, q);
      bloesems.push({ x, y, z });
    }
  }

  /** Waar je terechtkomt na een plof in doorgang i: op platform i, met je neus naar de doorgang. */
  function startPlek(i) {
    const d = dekken[i];
    const m = modules[Math.min(i, modules.length - 1)];
    const a = i < modules.length ? m.a : [-m.a[0], -m.a[1]];
    // Een stukje naar de doorgang toe, maar niet op de springbloem zelf (die zou je meteen lanceren).
    const r = i < modules.length && m.soort === 'springbloem' ? -0.3 : d.straal * 0.3;
    return { pos: [d.x + a[0] * r, d.h, d.z + a[1] * r], richting: Math.atan2(a[0], a[1]) };
  }

  return {
    D, vloer, peil, dekken, modules, trap, uitgang, stammen, bloesems, vijver: { van: vijverVan, tot: vijverTot, straal: V.straal },
    grenzen: { minX, maxX, minZ, maxZ },
    stempel, peilOp, blokOp, waarOp, startPlek, binnen,
    /** De oppervlakte van één doorgang (voor het beeld en de bots). */
    oppervlak: (m, t, q) => SOORTEN[m.soort].oppervlak(m, D, t, q),
    doelen: (m) => SOORTEN[m.soort].doelen(m, D),
    touwPunt: (m, l, r, uit) => touwPunt(m, D, l, r, uit),
    /** De bewegende delen (om een stap vooruit te proberen en terug te zetten, voor de testbot). */
    bewaar() {
      return JSON.stringify(modules.map(({ lianen, bladeren, zwaai, zwaaiV, tijd, last, belast, veer, veerV }) => ({ lianen, bladeren, zwaai, zwaaiV, tijd, last, belast, veer, veerV })));
    },
    herstel(json) {
      JSON.parse(json).forEach((o, i) => {
        for (const [k, v] of Object.entries(o)) if (v !== undefined) modules[i][k] = v;
      });
    },
  };
}

/** Een nieuwe voortgang in het speelbos (per speler). */
export const legeBosToestand = () => ({ dek: -1, op: null, valVan: -Infinity, start: 0, bezig: false, geldig: false, fouten: [], record: Infinity, laatsteOp: null });

/** Wat de actieknop in het speelbos kan: 'slingeren' aan de rand bij de eerste liaan, of null. */
export function bosActie(bos, s) {
  if (s.modus !== 'lopen' || !s.opGrond) return null;
  const D = bos.D;
  for (const m of bos.modules) {
    if (m.soort !== 'liaan' || s.bos.op !== m.i || m.lianen[0].door) continue;
    const l = m.lianen[0];
    const x = m.o[0] + m.a[0] * l.t;
    const z = m.o[1] + m.a[1] * l.t;
    if (Math.hypot(x - s.pos[0], z - s.pos[2]) < D.liaan.actieAfstand) return 'slingeren';
  }
  return null;
}

/** De actieknop: een sprongetje naar de eerste liaan. */
export function doeBosActie(bos, s, meld) {
  const m = bos.modules.find((q) => q.soort === 'liaan' && q.i === s.bos.op);
  if (m) springNaarLiaan(m, bos.D, s, meld);
}

/** Vóór het lopen: op de balanceerstam telt je joystick opzij minder. */
export function bosInvoer(bos, s, int) {
  const m = s.bos.laatsteOp;
  if (m == null || typeof m !== 'string' || !m.startsWith('m')) return int;
  const mod = bos.modules[+m.slice(1)];
  if (mod.soort !== 'balanceerstam') return int;
  return invoerBalanceerstam(mod, bos.D, int, mod.a, mod.b);
}

/** Aan de liaan: een stap slingeren. */
export function bosSlinger(bos, s, int, dt, meld) {
  stapSlingeren(bos.modules[s.liaan.m], bos.D, s, int, dt, meld);
}

/**
 * Na het lopen (of zwemmen): grijpen, lanceren, wiebelen, leuningen, en de regels van het parcours:
 * wie eraf valt, plooft terug naar het begin van die doorgang; platform na platform telt de voortgang.
 */
export function bosNaStap(bos, s, dt, tik, meld) {
  const D = bos.D;
  const b = s.bos;
  if (s.liaanLos) {
    s.liaanLos.tijd -= dt;
    if (s.liaanLos.tijd <= 0) s.liaanLos = null;
  }
  s.vlucht = Math.max(0, (s.vlucht ?? 0) - dt);
  s.wiebel = 0;
  if (!bos.binnen(s.pos[0], s.pos[2], 2)) {
    if (b.dek >= 0) Object.assign(b, { dek: -1, bezig: false, op: null, laatsteOp: null });
    return;
  }
  if (s.modus === 'slingeren') {
    b.valVan = s.pos[1];
    b.laatsteOp = 'm' + s.liaan.m;
    return;
  }

  // In de lucht dicht bij een liaan: vastgrijpen.
  if (s.modus === 'lopen' && !s.opGrond && !s.klimt) {
    for (const m of bos.modules) if (m.soort === 'liaan' && grijpLiaan(m, D, s, m.i, meld)) {
      b.valVan = s.pos[1];
      b.laatsteOp = 'm' + m.i;
      return;
    }
  }

  // De doorgang onder je voeten: springbloem, stam en brug doen elk hun ding.
  for (const m of bos.modules) {
    const [t, q] = naarLokaal(m, s.pos[0], s.pos[2]);
    if (t < -2.5 || t > m.len + 0.5 || Math.abs(q) > 2.2) continue;
    if (m.soort === 'springbloem' && s.modus === 'lopen') stapSpelerSpringbloem(m, D, s, t, q, dt, meld);
    else if (m.soort === 'balanceerstam' && s.modus === 'lopen' && opStam(m, D, s, t, q)) wiebelBalanceerstam(m, D, s, q, m.b, dt);
    else if (m.soort === 'touwbrug' && s.modus === 'lopen') leuningTouwbrug(m, D, s, t, q, m.b);
  }

  const op = s.modus === 'lopen' && s.opGrond ? bos.waarOp(s) : null;
  if (op !== null) {
    b.op = typeof op === 'number' ? op : b.op;
    b.laatsteOp = op;
    b.valVan = s.pos[1];
  }
  if (typeof op === 'number') {
    if (op === 0 && (!b.bezig || b.dek > 0)) {
      // Op het eerste platform: het parcours begint (opnieuw).
      Object.assign(b, { bezig: true, geldig: true, start: tik, fouten: D.modules.map(() => 0) });
      meld({ soort: 'bosStart', speler: s.id });
    } else if (b.bezig && op === b.dek + 1) {
      meld({ soort: 'bosDek', speler: s.id, dek: op, schoon: b.fouten[op - 1] === 0, pos: [...s.pos] });
      if (op === bos.dekken.length - 1 && b.geldig) {
        const tijd = (tik - b.start) / 60;
        const sterren = b.fouten.filter((f) => f === 0).length;
        const record = tijd < b.record;
        if (record) b.record = tijd;
        meld({ soort: 'bosKlaar', speler: s.id, tijd, sterren, record, pos: [...s.pos] });
        b.bezig = false;
      }
    } else if (b.bezig && op > b.dek + 1) b.geldig = false; // een platform overgeslagen: telt niet
    b.dek = op;
    return;
  }

  // Van het parcours gevallen (op de bosvloer of in de vijver): plof, terug naar het begin van die doorgang.
  // Op de grond = er ligt niets van het parcours onder je voetjes.
  const opDeGrond = s.modus === 'lopen' && s.opGrond && op === null && bos.blokOp(s.pos[0], s.pos[2]) < s.pos[1] - 0.35;
  const inVijver = s.modus === 'zwemmen' && bos.peilOp(s.pos[0], s.pos[2]) > -Infinity;
  if (b.dek >= 0 && b.dek < bos.dekken.length - 1 && ((opDeGrond && b.valVan - s.pos[1] > D.val) || inVijver)) {
    const i = Math.min(b.dek, bos.modules.length - 1);
    if (b.bezig) b.fouten[i]++;
    const plek = bos.startPlek(i);
    s.veilig = [...plek.pos];
    meld({ soort: 'bosVal', speler: s.id, doorgang: i, pos: [...s.pos] });
    return plek;
  }
  // Rustig van de trap of de uitgang af gelopen: je bent het speelbos uit.
  if (opDeGrond && b.dek >= 0) Object.assign(b, { dek: -1, bezig: false, op: null, laatsteOp: null });
  if (s.modus === 'zwemmen' && b.dek >= 0 && !inVijver) b.dek = -1;
  return null;
}

/** De bewegende delen van het parcours: lianen, brug, bladeren, lotus. */
export function stapSpeelbos(bos, spelers, dt) {
  const D = bos.D;
  for (const m of bos.modules) {
    const wie = [];
    for (const s of spelers) {
      const [t, q] = naarLokaal(m, s.pos[0], s.pos[2]);
      if (t < -2.5 || t > m.len + 2.5 || Math.abs(q) > 3) continue;
      wie.push({ t, q, y: s.pos[1], op: s.opGrond && s.modus === 'lopen', v: Math.hypot(s.vel[0], s.vel[2]) });
    }
    if (m.soort === 'liaan') stapLianen(m, D, dt);
    else if (m.soort === 'touwbrug') stapTouwbrug(m, D, dt, wie.filter((p) => p.op));
    else if (m.soort === 'balanceerstam') stapBalanceerstam(m, D, dt);
    else if (m.soort === 'springbloem') stapSpringbloem(m, D, dt);
    else if (m.soort === 'reuzenblad') stapReuzenblad(m, D, dt, wie);
    else if (m.soort === 'lotus') stapLotus(m, D, dt, wie);
  }
}

/** Bij een plof of terug-knop: de liaan loslaten. */
export function bosLos(bos, s) {
  if (s.liaan) laatLiaanLos(bos.modules[s.liaan.m], s);
  if (s.modus === 'slingeren') s.modus = 'lopen';
}
