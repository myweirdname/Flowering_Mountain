// Waar de planten staan (TP 5.5): per tegel een willekeurfunctie met zaadje. Er wordt niets opgeslagen,
// dezelfde tegel geeft altijd dezelfde planten. Hier staan alleen gegevens (geen Three.js):
// de simulatie gebruikt de stammen om tegen te botsen, het beeld maakt er vormen van.
import { maakWillekeur, maakZaadje } from '../../kern/willekeur.js';
import { waardenruis } from './ruis.js';
import { EILAND } from '../../data/eiland.js';

/**
 * @typedef {{ x:number, y:number, z:number, draai:number, schaal:number, tint:number, kans:number, soort:number }} Plant
 */

/**
 * Kiest per bergcode een eigen mix: welke bladplanten veel voorkomen, welke bloemen en kleuren.
 * @param {number} zaadje
 * @param {typeof import('../../data/flora.js').FLORA} F
 */
export function kiesFlora(zaadje, F) {
  const w = maakWillekeur(zaadje ^ 0x0f10a);
  const struikNamen = Object.keys(F.bladplanten);
  const struikGewichten = struikNamen.map((n) => F.bladplanten[n].gewicht * (0.2 + (w.geheel(1000) / 1000) * 1.6));

  const families = Object.keys(F.bloemFamilies);
  const paletten = F.bloemPaletten.map((_, i) => i);
  schud(families, w);
  schud(paletten, w);
  const bloemen = [];
  for (let i = 0; i < F.bloemSoortenPerEiland; i++) {
    bloemen.push({
      familie: families[i % families.length],
      palet: F.bloemPaletten[paletten[i % paletten.length]],
      zaad: w.volgende(),
    });
  }
  const kk = F.boom.kruinKleuren.map((_, i) => i);
  schud(kk, w);
  return {
    struikNamen,
    struikGewichten,
    bloemen,
    kruinKleuren: [F.boom.kruinKleuren[kk[0]], F.boom.kruinKleuren[kk[1]]],
    vormZaad: w.volgende(), // voor de kleine verschillen in de vormen zelf
  };
}

function schud(lijst, w) {
  for (let i = lijst.length - 1; i > 0; i--) {
    const j = w.geheel(i + 1);
    [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
  }
}

function kiesGewogen(gewichten, r) {
  let som = 0;
  for (const g of gewichten) som += g;
  let t = r * som;
  for (let i = 0; i < gewichten.length; i++) {
    t -= gewichten[i];
    if (t <= 0) return i;
  }
  return gewichten.length - 1;
}

/**
 * @param {ReturnType<typeof import('./hoogte.js').maakWereldvorm>} vorm
 * @param {typeof import('../../data/flora.js').FLORA} F
 * @param {number} zaadje
 * @param {number} T tegelgrootte
 */
export function maakBegroeiing(vorm, F, zaadje, T) {
  const flora = kiesFlora(zaadje, F);
  const groot = new Map();
  const klein = new Map();
  const sleutel = (tx, tz) => (tx + 4096) * 8192 + (tz + 4096);
  const b = /** @type {import('./hoogte.js').Bodem} */ ({});
  const L = F.lagen;
  const kamp = vorm.kamp;
  const lag = vorm.lagune;
  // Bloemen niet vlak naast het water en niet midden in een hindernis.
  const weide = vorm.weide;
  const nabijWater = (x, z) => {
    if (!weide.dichtbij(x, z)) return false;
    for (const d of weide.delen) {
      const [a, bb] = weide.inDeel(d, x, z);
      if (Math.abs(a) < d.diep + 1.4 && Math.abs(bb) < d.breed + 0.8) return true;
    }
    return false;
  };

  const steilte = (x, z) => {
    const dx = vorm.hoogte(x + 0.6, z) - vorm.hoogte(x - 0.6, z);
    const dz = vorm.hoogte(x, z + 0.6) - vorm.hoogte(x, z - 0.6);
    return Math.hypot(dx, dz) / 1.2;
  };

  /**
   * Loopt over een geschud raster in de tegel; elke kandidaat krijgt altijd evenveel trekkingen,
   * zodat de ene plant de andere niet verschuift.
   */
  function overRaster(tx, tz, afstand, laag, doe) {
    const n = Math.max(1, Math.round(T / afstand));
    const a = T / n;
    const w = maakWillekeur(maakZaadje(`${tx},${tz},${laag}`) ^ zaadje);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = tx * T + (i + 0.1 + 0.8 * w.getal()) * a;
        const z = tz * T + (j + 0.1 + 0.8 * w.getal()) * a;
        const r1 = w.getal();
        const r2 = w.getal();
        const r3 = w.getal();
        const r4 = w.getal();
        vorm.bodem(x, z, b);
        doe(x, z, r1, r2, r3, r4);
      }
    }
  }

  const plant = (x, z, draai, schaal, tint, kans, soort = 0) => ({ x, y: b.h, z, draai, schaal, tint, kans, soort });

  /** Bomen, palmen en rotsen: ook van ver zichtbaar, en je botst ertegen. */
  function grote(tx, tz) {
    const k = sleutel(tx, tz);
    let g = groot.get(k);
    if (g) return g;
    g = { boom: [], palm: [], rots: [], stammen: [] };
    const kampAfstand = (x, z) => Math.hypot(x - kamp.x, z - kamp.z);

    overRaster(tx, tz, L.boom.afstand, 'boom', (x, z, r1, r2, r3, r4) => {
      if (b.bos < 0.8 || b.h < 0.8 || b.pad > 0.01 || b.weide > 0.01 || b.wand > 0.5 || r1 > 0.85) return;
      if (kampAfstand(x, z) < kamp.straal + 5 || steilte(x, z) > 0.6) return;
      const p = plant(x, z, r2 * Math.PI * 2, 0.8 + r3 * 0.45, r4, r1);
      g.boom.push(p);
      g.stammen.push({ x, z, r: L.boom.stam * p.schaal });
    });

    overRaster(tx, tz, L.palm.afstand, 'palm', (x, z, r1, r2, r3, r4) => {
      if (b.h < 0.3 || b.pad > 0.05 || b.weide > 0.02) return;
      const ring = Math.hypot(x - lag.x, z - lag.z) / lag.straal;
      let draai;
      if (ring > 1.0 && ring < 1.5 && r1 < 0.8) {
        draai = Math.atan2(-(lag.z - z), lag.x - x); // leunt naar het water van de lagune
      } else if (b.d > 4 && b.d < 24 && b.lagune < 0.2 && r1 < 0.5) {
        draai = Math.PI / 2; // leunt naar de zee
      } else if (b.kamp > 0.08 && b.kamp < 0.5 && r1 < 0.3) {
        draai = Math.atan2(-(kamp.z - z), kamp.x - x); // over de open plek
      } else return;
      draai += (r2 - 0.5) * 1.3;
      const p = plant(x, z, draai, 0.85 + r3 * 0.35, r4, r1);
      g.palm.push(p);
      g.stammen.push({ x, z, r: L.palm.stam * p.schaal });
    });

    overRaster(tx, tz, L.rots.afstand, 'rots', (x, z, r1, r2, r3, r4) => {
      // Vlak voor de rotsrand liggen veel grote rotsblokken; op de steile wand zelf geen.
      const voet = b.voet > 0.35;
      if (b.h < -1.2 || r1 > (voet ? EILAND.voetRotsen.kans : b.zand > 0.5 ? 0.28 : 0.4) || b.pad > 0.05 || b.kamp > 0.6 || b.weide > 0.05) return;
      if (b.rivier > 0.01 || b.oever > 0.2) return; // de rivier heeft haar eigen rotsen
      if (b.wand > 0.5 && !voet) return;
      // Af en toe een grote rots: een lage rand om op te klimmen.
      const R = F.rots;
      const [a, bmax] = voet ? EILAND.voetRotsen.grootte : r1 < R.grootKans ? R.grootte : R.klein;
      const p = plant(x, z, r2 * Math.PI * 2, r3, r4, r1);
      p.maat = a + r3 * (bmax - a);
      p.cos = Math.cos(p.draai);
      p.sin = Math.sin(p.draai);
      g.rots.push(p);
    });

    for (const v of F.rots.bijKamp) {
      const x = kamp.x + v.dx;
      const z = kamp.z + v.dz;
      if (Math.floor(x / T) !== tx || Math.floor(z / T) !== tz) continue;
      vorm.bodem(x, z, b);
      const p = plant(x, z, v.draai, 0.5, 0.3, 0);
      p.maat = v.maat;
      p.cos = Math.cos(p.draai);
      p.sin = Math.sin(p.draai);
      g.rots.push(p);
    }

    groot.set(k, g);
    return g;
  }

  /** Struiken, bloemen en gras: alleen dichtbij nodig. */
  function kleine(tx, tz) {
    const k = sleutel(tx, tz);
    let g = klein.get(k);
    if (g) return g;
    g = { struik: [], bloem: [], gras: [], bosje: [] };

    // Rotsen in en rond deze tegel: daar groeit niets op, en struiken blijven er een stukje vandaan.
    const rotsen = [];
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) rotsen.push(...grote(tx + i, tz + j).rots);
    const opRots = (x, z, marge) => rotsen.some((r) => Math.hypot(x - r.x, z - r.z) < r.maat + marge);

    overRaster(tx, tz, L.struik.afstand, 'struik', (x, z, r1, r2, r3, r4) => {
      const kampRand = b.kamp > 0.02 && b.kamp < 0.5;
      if (b.h < 0.4 || b.pad > 0.15 || b.weide > 0.35 || b.wand > 0.5 || !(b.bos > 0.35 || kampRand)) return;
      if (steilte(x, z) > 0.9 || opRots(x, z, 0.9)) return;
      g.struik.push(plant(x, z, r2 * Math.PI * 2, r3, r4, r1, kiesGewogen(flora.struikGewichten, r4)));
    });

    // Ronde bosjes om in te verstoppen (stap 8d): langs de rand van het kamp, het pad en de jungle.
    const B = F.bosje;
    overRaster(tx, tz, B.afstand, 'bosje', (x, z, r1, r2, r3) => {
      const kampRand = b.kamp > 0.02 && b.kamp < 0.5;
      if (r1 > B.kans || b.h < 0.4 || b.pad > 0.15 || b.weide > 0.2 || b.zand > 0.4 || b.wand > 0.5 || !(b.bos > 0.2 || kampRand)) return;
      if (steilte(x, z) > 0.7 || opRots(x, z, 0.9)) return;
      g.bosje.push(plant(x, z, r2 * Math.PI * 2, r3, 0.5, r1));
    });
    for (const v of F.bosjeBijKamp ?? []) {
      const x = kamp.x + v.dx;
      const z = kamp.z + v.dz;
      if (Math.floor(x / T) !== tx || Math.floor(z / T) !== tz) continue;
      vorm.bodem(x, z, b);
      if (b.pad > 0.05 || opRots(x, z, 0.9)) continue;
      g.bosje.push(plant(x, z, v.draai, v.schaal, 0.5, 0));
    }

    overRaster(tx, tz, L.bloem.afstand, 'bloem', (x, z, r1, r2, r3, r4) => {
      if (b.h < 0.35 || b.zand > 0.4 || b.pad > 0.55 || b.wand > 0.5) return;
      // Veel bloemen langs de rand van de open plek en het pad, trosjes in de jungle.
      const rand = (b.kamp > 0.04 && b.kamp < 0.92) || b.pad > 0.05;
      const tros = waardenruis(x / 8, z / 8, zaadje ^ 0x77);
      if (b.weide > 0.03) {
        // De springweide: veel bloemen langs de rand, perkjes in het midden, nooit op de baan of in het water.
        if (b.baan > 0.05 || b.nat > 0.02 || nabijWater(x, z)) return;
        if (b.weide > 0.9 ? tros < 0.6 : tros < 0.3) return;
      } else if (b.kamp >= 0.92) {
        // Bloemenperkjes op de open plek zelf, met grasveld ertussen.
        if (tros < 0.62) return;
      } else if (rand ? tros < 0.25 : b.bos < 0.15 || tros < 0.55 || r1 > 0.7) return;
      // Bloemen in trosjes van dezelfde soort.
      if (opRots(x, z, 0)) return;
      const soort = maakWillekeur(maakZaadje(`${Math.floor(x / 7)},${Math.floor(z / 7)}`) ^ zaadje).geheel(flora.bloemen.length);
      g.bloem.push(plant(x, z, r2 * Math.PI * 2, r3, r4, r1, soort));
    });

    overRaster(tx, tz, L.gras.afstand, 'gras', (x, z, r1, r2, r3, r4) => {
      if (b.h < 0.3 || b.zand > 0.25 || b.pad > 0.5 || b.nat > 0.02 || b.wand > 0.5) return;
      if (!(b.kamp > 0.05 || b.pad > 0.05 || (b.weide > 0.05 && r4 < 0.55) || (b.bos > 0.3 && r4 < 0.35))) return;
      if (opRots(x, z, -0.2)) return;
      g.gras.push(plant(x, z, r2 * Math.PI * 2, r3, r4, r1));
    });

    klein.set(k, g);
    return g;
  }

  return {
    flora,
    grote,
    kleine,
    /** Stammen in tegel (tx, tz), om tegen te botsen. */
    stammen: (tx, tz) => grote(tx, tz).stammen,
    /** Rotsen in tegel (tx, tz), om op te staan en op te klimmen. */
    rotsen: (tx, tz) => grote(tx, tz).rots,
  };
}
