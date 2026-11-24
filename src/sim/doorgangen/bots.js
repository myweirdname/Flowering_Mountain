// De testbots van het speelbos (TP 5.3, 9): ze spelen elke doorgang uit in de echte simulatie, met
// dezelfde regels als de speler, en tellen hoe vaak het lukt. test.html laat ze los op honderden zaadjes.
// Een bot ziet niets wat een kind niet ziet: hij loopt naar het volgende blad, springt aan de rand,
// en stuurt in de lucht bij. Aan de liaan probeert hij in gedachten los te laten (een stap vooruit
// rekenen en weer terugzetten) en laat los zodra dat zou lukken.
import { stapLopen } from '../modi/lopen.js';
import { stapZwemmen } from '../modi/zwemmen.js';
import { naarVeiligeGrond } from '../modi/veilig.js';
import { LOPEN, ZWEMMEN } from '../../data/beweging.js';
import { maakSpeler } from '../wezens/speler.js';
import { naarWereld } from './hulp.js';
import { bosInvoer, bosNaStap, bosSlinger, stapSpeelbos, legeBosToestand, bosActie, doeBosActie, bosLos } from './speelbos.js';

const DT = 1 / 60;

/** Een kleine wereld met alleen het speelbos (vlakke bosvloer en de vijver), om snel te testen. */
export function miniWereld(bos) {
  const tmp = { h: 0, vlak: 0, vijver: 0 };
  const hoogteOp = (x, z) => bos.stempel(x, z, bos.vloer, tmp).h;
  const e = 0.5;
  return {
    raster: {
      hoogteOp,
      hellingOp: (x, z) => [(hoogteOp(x + e, z) - hoogteOp(x - e, z)) / (2 * e), (hoogteOp(x, z + e) - hoogteOp(x, z - e)) / (2 * e)],
      tegelGrootte: 32,
    },
    grens: { minX: -1e4, maxX: 1e4, minZ: -1e4, maxZ: 1e4 },
    vorm: { bodem: (x, z, b) => Object.assign(b, { lagune: 0 }) },
    stammen: () => bos.stammen,
    grondOp: (x, z) => Math.max(hoogteOp(x, z), bos.blokOp(x, z)),
    waterOp: (x, z) => Math.max(-100, bos.peilOp(x, z)),
    rivier: { stroomOp: (x, z, u) => { u[0] = 0; u[1] = 0; return u; } },
  };
}

/** Eén stap van een speler in het speelbos: zoals in de echte simulatie (sim/spel.js). */
export function stapSpelerInBos(s, int, bos, wereld, tik, meld) {
  s.vorigePos = [...s.pos];
  s.vorigeRichting = s.richting;
  if (s.modus === 'slingeren') bosSlinger(bos, s, int, DT, meld);
  else if (s.modus === 'lopen') stapLopen(s, bosInvoer(bos, s, int), wereld, LOPEN, DT, meld, ZWEMMEN);
  else if (s.modus === 'zwemmen') stapZwemmen(s, int, wereld, ZWEMMEN, DT, meld);
  const plek = bosNaStap(bos, s, DT, tik, meld);
  if (plek) {
    bosLos(bos, s);
    naarVeiligeGrond(s, meld);
    s.richting = s.vorigeRichting = plek.richting;
  }
}

// De joystick: hoeveel duwen voor een gewenste snelheid (omgekeerd van sim/modi/lopen.js).
function krachtVoor(v) {
  const L = LOPEN;
  if (v <= L.loopsnelheid) return (v / L.loopsnelheid) * L.renDrempel;
  return Math.min(1, L.renDrempel + ((v - L.loopsnelheid) / (L.rensnelheid - L.loopsnelheid)) * (1 - L.renDrempel));
}

/** Hoe lang tot je (vallend) op hoogte y bent, met de zwaartekracht van het lopen. */
function tijdTot(s, y) {
  const L = LOPEN;
  let vy = s.vel[1];
  let h = s.pos[1];
  let t = 0;
  if (vy > 0) {
    t = vy / L.zwaartekracht;
    h += (vy * vy) / (2 * L.zwaartekracht);
    vy = 0;
  }
  if (h <= y) return Math.max(0.05, t);
  // Daarna vallen: h - y = vy*t + g/2 t²
  const g = L.valZwaartekracht;
  return t + (-(-vy) + Math.sqrt(vy * vy + 2 * g * (h - y))) / g;
}

/** In de lucht bijsturen naar punt p (wereld x, y, z). */
function stuurInLucht(s, p) {
  const t = tijdTot(s, p[1]);
  const vx = (p[0] - s.pos[0]) / t;
  const vz = (p[2] - s.pos[2]) / t;
  const v = Math.hypot(vx, vz);
  // Sneller dan nu? Dan duwen. Te snel? Dan zacht tegensturen (de lucht remt je dan af).
  if (v < 1e-3) return [0, 0];
  const k = krachtVoor(v);
  return [(vx / v) * k, (vz / v) * k];
}

/**
 * Een bot voor één doorgang: geeft elke stap een intentie.
 * @returns {(s:any, tik:number) => any}
 */
export function maakBot(bos, i, wereld) {
  const m = bos.modules[i];
  const D = bos.D;
  const naar = bos.dekken[i + 1];
  // De doelen in wereldcoördinaten (de laatste ligt op het volgende platform).
  // Eerst naar het begin van de doorgang (aan de rand van het platform), dan de doelen van de doorgang zelf.
  const begin = m.soort === 'springbloem' ? [] : [{ t: -0.5, q: 0, y: m.h0, r: 0.35 }];
  const doelen = [...begin, ...bos.doelen(m)].map((d) => {
    const [x, z] = naarWereld(m, d.t, d.q);
    return { ...d, x, z };
  });
  let k = 0;
  let houdSprong = 0;
  let wachtActie = 0;
  const kracht = m.soort === 'balanceerstam' ? 0.7 : 0.8;

  function huppel(s) {
    const int = { beweeg: [0, 0], spring: false, actie: false };
    if (s.bloemDruk > 0) return int;
    // De springbloem heeft je gelanceerd: op naar het volgende doel.
    if (doelen[k].bloem && (s.vlucht > 0 || !s.opGrond)) k++;
    let d = doelen[k];
    if (s.opGrond && s.modus === 'lopen') {
      // Bij het doel? Dan het volgende.
      while (k < doelen.length - 1 && Math.hypot(d.x - s.pos[0], d.z - s.pos[2]) < d.r && Math.abs(s.pos[1] - d.y) < 0.45) d = doelen[++k];
      const dx = d.x - s.pos[0];
      const dz = d.z - s.pos[2];
      const afstand = Math.hypot(dx, dz) || 1;
      let ux = dx / afstand;
      let uz = dz / afstand;
      // Op de stam: terug naar het midden sturen.
      if (m.soort === 'balanceerstam') {
        const q = (s.pos[0] - m.o[0]) * m.b[0] + (s.pos[2] - m.o[1]) * m.b[1];
        ux = m.a[0] - m.b[0] * q * 4;
        uz = m.a[1] - m.b[1] * q * 4;
        const l = Math.hypot(ux, uz);
        ux /= l;
        uz /= l;
      }
      int.beweeg = [ux * kracht, uz * kracht];
      // Aan de rand (de grond vóór je zakt weg) of vlak voor iets hogers: springen.
      const voor = wereld.grondOp(s.pos[0] + ux * 0.45, s.pos[2] + uz * 0.45);
      if (!d.bloem && afstand > 0.7 && (voor < s.pos[1] - 0.35 || (d.y > s.pos[1] + 0.3 && afstand < 1.5))) houdSprong = 12;
    } else if (s.modus === 'lopen') {
      int.beweeg = stuurInLucht(s, [d.x, d.y, d.z]);
    }
    if (houdSprong > 0) {
      houdSprong--;
      int.spring = true;
    }
    return int;
  }

  if (m.soort !== 'liaan') return huppel;

  // --- De liaanbot ---
  const R = D.liaan;
  const doelNa = (j) => {
    if (j < m.lianen.length) {
      const l = m.lianen[j];
      const [x, z] = naarWereld(m, l.t, 0);
      return [x, m.h0 + R.onderBoven - R.handHoogte + 1.2, z];
    }
    const [x, z] = naarWereld(m, m.len + 0.9, 0);
    return [x, naar.h, z];
  };
  /** In de lucht na het loslaten (ook in gedachten): bijsturen naar de volgende liaan of het platform. */
  function lucht(s, volgende) {
    return { beweeg: stuurInLucht(s, doelNa(volgende)), spring: false, actie: false };
  }
  let volgende = 0;
  let wachtTot = 0;

  /** Zou loslaten nu lukken? Een paar seconden vooruit rekenen, daarna alles terugzetten. */
  function probeerLos(s, tik) {
    const bewaard = bos.bewaar();
    const kopie = JSON.parse(JSON.stringify(s));
    let gelukt = false;
    const huidige = s.liaan.i;
    const meld = () => {};
    // In gedachten grijpt de bot alleen als het ruim lukt (een kleinere grijpafstand): zo is hij zeker.
    const grijp = R.grijp;
    R.grijp = grijp * 0.75;
    stapSpelerInBos(kopie, { beweeg: [0, 0], spring: true, actie: false }, bos, wereld, tik, meld);
    stapSpeelbos(bos, [kopie], DT);
    for (let n = 0; n < 150 && !gelukt; n++) {
      if (kopie.modus === 'slingeren') {
        gelukt = kopie.liaan.i > huidige;
        break;
      }
      if (kopie.opGrond && bos.waarOp(kopie) === i + 1) gelukt = true;
      if (kopie.opGrond || kopie.modus === 'zwemmen') break;
      stapSpelerInBos(kopie, lucht(kopie, huidige + 1), bos, wereld, tik + n, meld);
      stapSpeelbos(bos, [kopie], DT);
    }
    R.grijp = grijp;
    bos.herstel(bewaard);
    return gelukt;
  }

  return function liaanbot(s, tik) {
    if (s.modus === 'slingeren') {
      volgende = s.liaan.i + 1;
      const l = m.lianen[s.liaan.i];
      // Eerst een tijdje pompen, dan elke paar stappen proberen of loslaten lukt (alleen vooruit zwaaiend).
      if (tik >= wachtTot && l.hoekV > 0.3 && tik % 2 === 0 && probeerLos(s, tik)) {
        wachtTot = tik + 20;
        return { beweeg: [0, 0], spring: true, actie: false };
      }
      return { beweeg: [m.a[0], m.a[1]], spring: false, actie: false };
    }
    if (s.modus === 'lopen' && !s.opGrond) return lucht(s, volgende);
    // Op het platform: naar de rand bij de eerste liaan, dan de actieknop.
    volgende = 0;
    if (wachtActie > 0) {
      wachtActie--;
      return { beweeg: [0, 0], spring: false, actie: false };
    }
    if (bosActie(bos, s) === 'slingeren') {
      wachtActie = 10;
      return { beweeg: [0, 0], spring: false, actie: true };
    }
    const [x, z] = naarWereld(m, -0.3, 0);
    const dx = x - s.pos[0];
    const dz = z - s.pos[2];
    const l = Math.hypot(dx, dz) || 1;
    return { beweeg: [(dx / l) * 0.6, (dz / l) * 0.6], spring: false, actie: false };
  };
}

/**
 * Speelt doorgang i van het speelbos uit, van het begin (platform i) tot op platform i + 1.
 * @returns {{ gehaald:boolean, tijd:number, reden:string }}
 */
export function speelDoorgang(bos, i, maxTijd = 40) {
  const wereld = miniWereld(bos);
  const start = bos.startPlek(i);
  const s = maakSpeler('bot', ...start.pos);
  s.richting = s.vorigeRichting = start.richting;
  s.bos = legeBosToestand();
  s.bos.dek = i;
  s.bos.op = i;
  const bot = maakBot(bos, i, wereld);
  let gevallen = false;
  const meld = (g) => {
    if (g.soort === 'bosVal') gevallen = true;
  };
  for (let tik = 0; tik < maxTijd * 60; tik++) {
    const int = bot(s, tik);
    const actie = int.actie && !s.actieVorige;
    s.actieVorige = int.actie;
    if (actie && bosActie(bos, s) === 'slingeren') doeBosActie(bos, s, meld);
    stapSpelerInBos(s, int, bos, wereld, tik, meld);
    stapSpeelbos(bos, [s], DT);
    if (gevallen) return { gehaald: false, tijd: tik / 60, reden: 'gevallen' };
    if (s.opGrond && bos.waarOp(s) === i + 1) return { gehaald: true, tijd: tik / 60, reden: '' };
  }
  return { gehaald: false, tijd: maxTijd, reden: 'te traag' };
}
