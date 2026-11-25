// Een oversteek over een ravijn (stap 13, GD 3) of over de rivier (stap 14b): twee houten platforms op de randen
// en één doorgang uit het speelbos ertussen (touwbrug, balanceerstam of lianen), op maat van het gat. Over de
// rivier liggen de platforms hoger (het vlot vaart eronderdoor), met een trapje naar elk platform. Het geheel gedraagt zich als
// een klein speelbos (dezelfde functies in speelbos.js: grijpen, wiebelen, vallen en terug naar het platform),
// maar zonder klok en in beide richtingen. Geen Three.js.
import { SOORTEN } from './speelbos.js';
import { naarLokaal, naarWereld } from './hulp.js';
import { touwPunt as touwPuntVan } from './liaan.js';

/**
 * @param {typeof import('../../data/speelbos.js').SPEELBOS} SB de maten van de doorgangen
 * @param {typeof import('../../data/bergplan.js').BERGPLAN.oversteek} BO
 * @param {string} soort 'touwbrug', 'balanceerstam' of 'liaan'
 * @param {[number, number]} A midden van het eerste platform
 * @param {[number, number]} B midden van het tweede platform
 * @param {number} hA hoogte van het eerste platform
 * @param {number} hB hoogte van het tweede (de brug of de stam loopt schuin als ze verschillen)
 * @param {{ geheel: (n: number) => number }} w willekeur met zaadje
 * @param {{ grond?: [number, number], trappen?: ({ lengte:number, h1:number } | null)[], breedte?: number,
 *           peilOp?: (x:number, z:number) => number }} [x]
 *   Voor een oversteek over de rivier (stap 14b): de grond onder elk platform (de platforms liggen hoger dan
 *   gewoon), een trapje van het land naar elk platform, en het water eronder (wie erin valt, plooft terug op
 *   het platform waar hij vandaan kwam).
 */
export function maakOversteek(SB, BO, soort, A, B, hA, hB, w, x = {}) {
  const r = BO.dekStraal;
  const afstand = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const a = [(B[0] - A[0]) / afstand, (B[1] - A[1]) / afstand];
  const gat = afstand - 2 * r;
  const cm = Math.round(gat * 100);

  // De maten op maat van het gat (de rest, zoals de wiebel van de stam, blijft zoals in het speelbos).
  const D = { ...SB, touwbrug: { ...SB.touwbrug, lengte: [cm, cm] }, balanceerstam: { ...SB.balanceerstam, lengte: [cm, cm] } };
  if (soort === 'liaan') {
    const L = BO.liaan;
    const n = Math.max(2, Math.ceil((cm - L.eerste - L.laatste) / L.maxTussen) + 1);
    const tussen = Math.floor((cm - L.eerste - L.laatste) / (n - 1));
    const laatste = cm - L.eerste - tussen * (n - 1);
    D.liaan = { ...SB.liaan, aantal: [n, n], eerste: [L.eerste, L.eerste], tussen: [tussen, tussen], laatste: [laatste, laatste] };
  }
  const m = SOORTEN[soort].maak(w, D);
  m.i = 0;
  m.a = a;
  m.b = [-a[1], a[0]];
  m.o = [A[0] + a[0] * r, A[1] + a[1] * r];
  m.rv = r;
  m.rn = r;
  m.h0 = hA;
  m.h1 = hB;
  m.peil = -Infinity;
  const dekken = [
    { soort: 'rand', x: A[0], z: A[1], h: hA, straal: r, hoogte: BO.dekBoven, boom: false },
    { soort: 'rand', x: m.o[0] + a[0] * (m.len + r), z: m.o[1] + a[1] * (m.len + r), h: hB, straal: r, hoogte: BO.dekBoven, boom: false },
  ];
  const modules = [m];
  dekken.forEach((d, i) => {
    d.grond = x.grond ? x.grond[i] : d.h - BO.dekBoven;
    d.hoogte = d.h - d.grond;
  });
  // De trapjes (alleen over de rivier): een plank met latjes van het platform naar het land, weg van de doorgang.
  const trappen = dekken.map((d, i) => {
    const T = x.trappen?.[i];
    if (!T) return null;
    const uit = T.richting ?? (i === 0 ? [-a[0], -a[1]] : [a[0], a[1]]);
    const o = [d.x + uit[0] * (d.straal - 0.3), d.z + uit[1] * (d.straal - 0.3)];
    return { a: uit, b: [-uit[1], uit[0]], o, len: T.lengte + 0.3, breed: x.breedte ?? 1.3, h0: d.h, h1: T.h1 };
  });
  const plankOp = (p, px, pz) => {
    if (!p) return -Infinity;
    const [t, q] = naarLokaal(p, px, pz);
    if (t < 0 || t > p.len || Math.abs(q) > p.breed / 2) return -Infinity;
    return p.h0 + (p.h1 - p.h0) * (t / p.len);
  };
  /** Waar je de oversteek begint en eindigt, op de grond (onderaan het trapje, of naast het platform). */
  const ingangen = dekken.map((d, i) => {
    const p = trappen[i];
    if (p) return naarWereld(p, p.len + 1, 0);
    const uit = i === 0 ? -1 : 1;
    return [d.x + a[0] * uit * (d.straal + 2), d.z + a[1] * uit * (d.straal + 2)];
  });
  // De lianen hangen aan een dikke tak tussen twee reuzenbomen, één naast elk platform (opzij, zodat je
  // vrij op en af het platform loopt).
  const stammen = [];
  if (soort === 'liaan') {
    for (const d of dekken) {
      d.boom = true;
      d.boomRichting = [m.b[0], m.b[1]];
      d.bx = d.x + m.b[0] * (d.straal + SB.stam * 0.6);
      d.bz = d.z + m.b[1] * (d.straal + SB.stam * 0.6);
      stammen.push({ x: d.bx, z: d.bz, r: SB.stam });
    }
  }

  const marge0 = 3;
  const punten = [...dekken.map((d) => [d.x, d.z]), ...ingangen];
  const minX = Math.min(...punten.map((p) => p[0])) - r - marge0;
  const maxX = Math.max(...punten.map((p) => p[0])) + r + marge0;
  const minZ = Math.min(...punten.map((p) => p[1])) - r - marge0;
  const maxZ = Math.max(...punten.map((p) => p[1])) + r + marge0;
  const tVoor = -2 * r - 1 - (trappen[0]?.len ?? 0);
  const tAchter = m.len + 2 * r + 1 + (trappen[1]?.len ?? 0);
  /** Binnen het vak rond de oversteek (op het platform of het trapje, erboven, of eronder in het ravijn). */
  const binnen = (px, pz, marge = 0) => {
    if (px < minX - marge || px > maxX + marge || pz < minZ - marge || pz > maxZ + marge) return false;
    const [t, q] = naarLokaal(m, px, pz);
    if (t > tVoor - marge && t < tAchter + marge && Math.abs(q) < r + 2 + marge) return true;
    // Een trapje dat langs de oever loopt (in een bocht van de rivier).
    return trappen.some((p) => {
      if (!p) return false;
      const [tt, qq] = naarLokaal(p, px, pz);
      return tt > -1 - marge && tt < p.len + 2 + marge && Math.abs(qq) < p.breed / 2 + 1.5 + marge;
    });
  };

  function blokOp(x, z) {
    if (!binnen(x, z)) return -Infinity;
    let best = Math.max(plankOp(trappen[0], x, z), plankOp(trappen[1], x, z));
    for (const d of dekken) if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.straal * d.straal && d.h > best) best = d.h;
    const [t, q] = naarLokaal(m, x, z);
    if (t >= -2.5 && t <= m.len + 0.5 && Math.abs(q) <= 2.2) best = Math.max(best, SOORTEN[m.soort].oppervlak(m, D, t, q));
    return best;
  }

  /** Waarop staat de speler: platform 0 of 1, de doorgang ('m0'), of null. */
  function waarOp(s) {
    const [x, y, z] = s.pos;
    for (let i = 0; i < dekken.length; i++) {
      const d = dekken[i];
      if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.straal * d.straal + 0.05 && Math.abs(y - d.h) < 0.12) return i;
    }
    // Op een trapje: niet gevallen (anders telt het afdalen als een val).
    for (const p of trappen) if (p && Math.abs(y - plankOp(p, x, z)) < 0.15) return 'trap';
    const [t, q] = naarLokaal(m, x, z);
    if (t >= -2.5 && t <= m.len + 0.5 && Math.abs(q) <= 2.2 && Math.abs(y - SOORTEN[m.soort].oppervlak(m, D, t, q)) < 0.3) return 'm0';
    return null;
  }

  /** Waar je terechtkomt na een val: op platform i, met je neus naar de doorgang. */
  function startPlek(i) {
    const d = dekken[i];
    const naar = i === 0 ? a : [-a[0], -a[1]];
    const rr = d.straal * 0.3;
    return { pos: [d.x + naar[0] * rr, d.h, d.z + naar[1] * rr], richting: Math.atan2(naar[0], naar[1]) };
  }

  const bloesems = SOORTEN[m.soort].bloesems(m, D).map(([t, q, y]) => {
    const [x, z] = naarWereld(m, t, q);
    return { x, y, z };
  });

  // Voor de testbot in een kleine wereld (bots.js, miniWereld): de grond onder de platforms, het ravijn diep.
  const vloer = Math.min(dekken[0].grond, dekken[1].grond);
  function stempel(px, pz, hh, uit) {
    const [t] = naarLokaal(m, px, pz);
    uit.h = t > 0.2 && t < m.len - 0.2 ? vloer - 12 : t <= 0.2 ? dekken[0].grond : dekken[1].grond;
    uit.vlak = 1;
    uit.vijver = 0;
    return uit;
  }

  return {
    soort: 'oversteek',
    wedstrijd: false, // geen klok en geen sterren, en in beide richtingen
    D, vloer, peil: -Infinity, dekken, modules, stammen, bloesems,
    grenzen: { minX, maxX, minZ, maxZ },
    trappen, ingangen,
    // Over de rivier: het water eronder (in het water vallen = terug op het platform, zoals in de vijver).
    stempel, peilOp: x.peilOp ? (px, pz) => (binnen(px, pz) ? x.peilOp(px, pz) : -Infinity) : () => -Infinity, blokOp, waarOp, startPlek, binnen,
    oppervlak: (mm, t, q) => SOORTEN[mm.soort].oppervlak(mm, D, t, q),
    doelen: (mm) => SOORTEN[mm.soort].doelen(mm, D),
    touwPunt: (mm, l, rr, uit) => touwPuntVan(mm, D, l, rr, uit),
    bewaar() {
      return JSON.stringify(modules.map(({ lianen, bladeren, zwaai, zwaaiV, tijd, last, belast, veer, veerV, wiebel }) => ({ lianen, bladeren, zwaai, zwaaiV, tijd, last, belast, veer, veerV, wiebel })));
    },
    herstel(json) {
      JSON.parse(json).forEach((o, i) => {
        for (const [k, v] of Object.entries(o)) if (v !== undefined) modules[i][k] = v;
      });
    },
  };
}

