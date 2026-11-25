// De pony (GD 6, TP 6): stappen, draven en galopperen, springen over hindernissen met een sprongboog die
// uit de aanloop en de timing berekend wordt, weigeren in plaats van vallen, waden en zwemmen,
// het bloeispoor en wortels. Dezelfde regels gelden als je erop zit en als ze vrij rondloopt (na fluiten).
// Gewone wiskunde, geen fysica-engine en geen Three.js.
import { onthoudVeilig } from './veilig.js';

const hoekVerschil = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function naderen(waarde, doel, max) {
  const d = doel - waarde;
  return Math.abs(d) <= max ? doel : waarde + Math.sign(d) * max;
}
/** Een vast willekeurig getal 0..1 uit een geheel getal (de simulatie gebruikt nooit Math.random). */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * @typedef {{ richting: number | null, snelheid: number, spring: boolean, springNu: boolean, gereden: boolean }} Stuur
 * richting: waar ze heen wil (null = rechtdoor), snelheid: gewenste vaart, spring: knop ingedrukt,
 * springNu: net ingedrukt, gereden: er zit iemand op (dan kan ze weigeren).
 */

/**
 * Eén tijdstap voor één pony.
 * @param {import('../wezens/pony.js').Pony} p
 * @param {Stuur} stuur
 * @param {any} wereld
 * @param {typeof import('../../data/rijden.js').RIJDEN} R
 * @param {number} dt
 * @param {(g: object) => void} meld
 */
export function stapPony(p, stuur, wereld, R, dt, meld) {
  p.tikken++;
  p.boost = Math.max(0, p.boost - dt);
  if (p.weigert > 0) stapWeigeren(p, stuur, wereld, R, dt, meld);
  else if (!p.opGrond) stapLucht(p, stuur, wereld, R, dt, meld);
  else stapGrond(p, stuur, wereld, R, dt, meld);

  // Galopkracht: galop kost kracht, de rest van de tijd komt ze langzaam terug.
  p.galoppeert = p.opGrond && p.snelheid > (R.draf + R.galop) / 2;
  p.galop = Math.min(1, Math.max(0, p.galop + (p.galoppeert ? -R.galopVerbruik : R.galopHerstel) * dt));
  const v = Math.abs(p.snelheid);
  p.gang = p.weigert > 0 && p.snelheid < 0 ? 'terug' : v < 0.25 ? 'stil' : v < (R.stap + R.draf) / 2 ? 'stap' : v < (R.draf + R.galop) / 2 ? 'draf' : 'galop';
  if (p.pos[1] < -15) {
    // Ergens doorheen gevallen: rustig terug naar de laatste veilige grond.
    p.pos = [...p.veilig];
    p.vorigePos = [...p.veilig];
    p.vel = [0, 0, 0];
    p.snelheid = 0;
    p.opGrond = true;
    p.sprong = null;
  }
}

const voorX = (p) => Math.sin(p.richting);
const voorZ = (p) => Math.cos(p.richting);

/** Waterpeil en diepte op (x, z): de zee en de lagune op 0, de beek, de vijver en de rivier hoger. */
function water(wereld, x, z, grond) {
  const peil = Math.max(wereld.weide.water(x, z), wereld.waterOp(x, z));
  return { peil, diepte: peil - grond };
}

function stapGrond(p, stuur, wereld, R, dt, meld) {
  const ter = wereld.terreinOp;
  const hier = ter(p.pos[0], p.pos[2]);
  const w = water(wereld, p.pos[0], p.pos[2], hier);
  p.diepte = w.diepte;
  p.zwemt = w.diepte > R.zwemDiepte;

  // --- Draaien en gewenste vaart ---
  let doelV = stuur.snelheid;
  const draai = R.draaiStil + (R.draaiGalop - R.draaiStil) * Math.min(1, Math.abs(p.snelheid) / R.galop);
  if (stuur.richting !== null) {
    const d = hoekVerschil(stuur.richting, p.richting);
    const max = draai * dt;
    p.richting += Math.max(-max, Math.min(max, d));
    if (Math.abs(d) > R.scherpeBocht) doelV *= 0.35; // eerst draaien, dan pas weer vaart
  }
  if (p.diepte > R.waadDiepte) doelV = Math.min(doelV, p.zwemt ? R.zwemSnelheid : Math.max(R.stap, doelV * R.waadFactor));
  // Net geweigerd: een paar tellen rustig stappen, zodat ze niet meteen opnieuw in volle vaart weigert.
  // Stuur je een andere kant op, dan is het meteen voorbij.
  if (p.rustig > 0) {
    p.rustig -= dt;
    if (stuur.richting !== null && Math.abs(hoekVerschil(stuur.richting, p.weigerRichting)) > 0.8) p.rustig = 0;
    else doelV = Math.min(doelV, R.stap);
  }
  if (p.boost > 0 && doelV > R.stap) doelV += R.perfectBoost * Math.min(1, p.boost / 0.4);
  p.snelheid = naderen(p.snelheid, doelV, (doelV > p.snelheid ? R.versnelling : R.remmen) * dt);

  // --- Springen ---
  if (stuur.springNu && !p.zwemt) {
    beginSprong(p, stuur, wereld, R, meld);
    return;
  }

  // --- Hindernissen voor haar neus: weigeren als ze er te snel op afkomt, stoppen als het traag gaat ---
  if (botstOpHindernis(p, stuur, wereld, R, dt, meld)) return;

  verplaats(p, stuur, wereld, R, dt, meld);

  // Wadend door water: spetters.
  if (p.diepte > R.waadDiepte * 0.6 && Math.abs(p.snelheid) > 0.7) {
    p.spetterTijd -= dt;
    if (p.spetterTijd <= 0) {
      p.spetterTijd = R.spetterTussen * (p.zwemt ? 2 : 1);
      meld({ soort: 'ponyPlons', pony: p.id, speler: p.ruiter ?? p.eigenaar, pos: [p.pos[0], w.peil, p.pos[2]], sterkte: Math.min(1.2, Math.abs(p.snelheid) / R.draf + 0.3) });
    }
  }

  // --- Bloeispoor: achter een galopperende pony bloeien bloemen op ---
  if (p.snelheid > (R.draf + R.galop) / 2 && p.diepte < 0.02 && p.opGrond) {
    p.spoor += p.snelheid * dt;
    while (p.spoor >= R.spoorStap) {
      p.spoor -= R.spoorStap;
      const n = p.spoorTeller++;
      const kant = n % 2 ? 1 : -1;
      const zij = kant * R.spoorBreedte * (0.45 + 0.75 * hash(n));
      const terug = 0.6 + hash(n + 7) * 0.5;
      const x = p.pos[0] - voorX(p) * terug + Math.cos(p.richting) * zij;
      const z = p.pos[2] - voorZ(p) * terug - Math.sin(p.richting) * zij;
      const y = ter(x, z);
      if (Math.max(wereld.weide.water(x, z), 0) - y < -0.02 && wereld.weide.hindernisOp(x, z) === -Infinity) {
        meld({ soort: 'spoor', pony: p.id, speler: p.ruiter ?? p.eigenaar, pos: [x, y, z], keuze: hash(n + 13), draai: hash(n + 29) });
      }
    }
  } else p.spoor = Math.min(p.spoor, R.spoorStap * 0.5);

  if (p.diepte < 0.05) onthoudVeilig(p, hier, dt, 0.4);
}

/** Verplaatst de pony over de grond, met de randen van het terrein, stammen, diep water en de speelgrens. */
function verplaats(p, stuur, wereld, R, dt, meld) {
  const ter = wereld.terreinOp;
  const hx = voorX(p);
  const hz = voorZ(p);
  p.vel[0] = hx * p.snelheid;
  p.vel[1] = 0;
  p.vel[2] = hz * p.snelheid;
  const ox = p.pos[0];
  const oz = p.pos[2];
  p.pos[0] += p.vel[0] * dt;
  p.pos[2] += p.vel[2] * dt;
  binnenGrens(p, wereld.grens);
  duwUitStammen(p, wereld, R.straal);

  // Te hoge rand of te diep water vlak voor haar: tegenhouden (langs de rand schuiven mag).
  const richting = Math.sign(p.snelheid) || 1;
  const steil = Math.tan((R.maxHelling * Math.PI) / 180);
  const kan = (x, z) => {
    const vx = x + hx * R.borst * 0.7 * richting;
    const vz = z + hz * R.borst * 0.7 * richting;
    const g = ter(vx, vz);
    const peil = Math.max(wereld.weide.water(vx, vz), 0);
    if (g - p.pos[1] > R.stapHoogte || peil - g > R.maxDiepte) return false;
    // Te steil omhoog (een rotswand): daar kan ze niet op, ook niet stapje voor stapje. Op een brug of steiger
    // telt de helling van het terrein eronder niet (stap 14b: het bruggetje over de rivier).
    if (g > p.pos[1] + 0.01 && g <= wereld.raster.hoogteOp(vx, vz) + 0.05) {
      const [gx, gz] = wereld.raster.hellingOp(vx, vz);
      if (gx * gx + gz * gz > steil * steil) return false;
    }
    return true;
  };
  if (!kan(p.pos[0], p.pos[2])) {
    // Een rots, een hoge rand of diep water: ze blijft er gewoon zacht voor staan (weigeren is alleen
    // voor de hindernissen waar je over kan springen), en langs de rand schuiven mag.
    if (kan(p.pos[0], oz)) p.pos[2] = oz;
    else if (kan(ox, p.pos[2])) p.pos[0] = ox;
    else {
      p.pos[0] = ox;
      p.pos[2] = oz;
    }
    p.snelheid *= 0.6;
  }

  // Grond volgen; in diep water drijft ze.
  const g = ter(p.pos[0], p.pos[2]);
  const peil = Math.max(wereld.weide.water(p.pos[0], p.pos[2]), 0);
  if (peil - g > R.zwemDiepte) {
    const doel = peil - R.drijf;
    p.pos[1] += (doel - p.pos[1]) * Math.min(1, dt * 8);
  } else if (p.pos[1] - g > R.stapHoogte + 0.15) {
    p.opGrond = false; // van een randje af: even vallen
    p.vel[1] = 0;
  } else p.pos[1] = g;
}

/** Komt ze recht op een hindernis af? Geeft true als ze weigert (en de stap dus klaar is). */
function botstOpHindernis(p, stuur, wereld, R, dt, meld) {
  const W = wereld.weide;
  if (!W.dichtbij(p.pos[0], p.pos[2], 4) || p.snelheid <= 0) return false;
  const hx = voorX(p);
  const hz = voorZ(p);
  for (const d of W.delen) {
    const [a, b] = W.inDeel(d, p.pos[0], p.pos[2]);
    if (Math.abs(b) > d.breed + R.lijfBreedte || Math.abs(a) < d.diep) continue;
    const hn = hx * d.nx + hz * d.nz;
    if (a * hn >= 0) continue; // ze loopt er vandaan
    const vlak = Math.abs(a) - Math.abs(hn) * R.borst - d.diep; // van haar borst tot de hindernis
    if (vlak > 0.1 + p.snelheid * dt) continue;
    // Door de beek waden mag, als het rustig gaat.
    if (d.water && (p.snelheid <= R.weigerVanaf || !stuur.gereden)) continue;
    if (stuur.gereden && p.snelheid > R.weigerVanaf) {
      beginWeigeren(p, meld);
      return true;
    }
    // Traag ertegen: gewoon stoppen.
    p.snelheid = 0;
  }
  return false;
}

/**
 * Zoekt de hindernis waar een sprong nu op zou mikken: recht voor haar, niet te schuin, en binnen bereik.
 * @returns {{ i:number, d:any, D:number, kant:number } | null} D = afstand van afzet tot landing
 */
function zoekDoel(p, wereld, R, vNat) {
  const W = wereld.weide;
  if (!W.dichtbij(p.pos[0], p.pos[2], 6)) return null;
  const hx = voorX(p);
  const hz = voorZ(p);
  let best = null;
  W.delen.forEach((d, i) => {
    const [a, b] = W.inDeel(d, p.pos[0], p.pos[2]);
    const hn = hx * d.nx + hz * d.nz;
    if (a * hn >= 0 || Math.abs(hn) < R.maxSchuin || Math.abs(a) < d.diep * 0.4) return;
    const tot = Math.abs(a) / Math.abs(hn); // langs haar looprichting tot het midden van de hindernis
    // Het hoogste punt van de boog ligt boven het midden van de hindernis; springt ze laat, dan landt ze
    // toch nog een eindje voorbij de hindernis.
    const D = Math.max(2 * tot, tot + d.diep / Math.abs(hn) + R.landMarge);
    if (D > vNat * R.maxVersnel * R.maxVlucht) return;
    const bc = b + (hx * d.tx + hz * d.tz) * tot; // waar ze de hindernis kruist
    if (Math.abs(bc) > d.breed + 0.4) return;
    if (!best || D < best.D) best = { i, d, D, kant: Math.sign(a) };
  });
  return best;
}

/** Afzet: op een hindernis mikken (de boog gaat er altijd over), of gewoon een sprongetje. */
function beginSprong(p, stuur, wereld, R, meld) {
  const g = R.zwaartekracht;
  const v = Math.max(0, p.snelheid);
  const vNat = Math.max(v, stuur.gereden ? R.stap : R.draf * 0.8);
  const doel = zoekDoel(p, wereld, R, vNat);
  if (doel && stuur.gereden && v < R.minSpringSnelheid) {
    // Slechte aanloop: te traag om te springen. Ze weigert, maar valt nooit.
    beginWeigeren(p, meld);
    return;
  }
  let vy;
  let vh;
  let perfect = false;
  if (doel) {
    const d = doel.d;
    const vyMin = Math.sqrt(2 * g * (d.hoogte + R.vrijeRuimte));
    // Een brede hindernis (de beek) vraagt een langere sprong: ze zet af vóór de oever.
    let T = Math.max((2 * vyMin) / g, (2 * (d.diep + R.borst + 0.3)) / vNat);
    if (doel.D / T > vNat * R.maxVersnel) T = Math.min(R.maxVlucht, doel.D / (vNat * R.maxVersnel));
    vh = doel.D / T;
    vy = (g * T) / 2;
    // Perfect: de sprong die ze uit zichzelf zou maken, komt precies goed uit.
    perfect = stuur.gereden && Math.abs(vNat * T - doel.D) < R.perfectMarge * vNat * T;
    p.sprong = { deel: doel.i, kant: doel.kant, perfect, gemikt: true, over: false, kort: false, getikt: false };
  } else {
    vy = R.vrijeSprong;
    vh = v;
    p.sprong = { deel: null, kant: 0, perfect: false, gemikt: false, over: false, kort: false, getikt: false };
  }
  p.snelheid = vh;
  p.vel = [voorX(p) * vh, vy, voorZ(p) * vh];
  p.opGrond = false;
  p.graast = false;
  meld({ soort: 'ponySprong', pony: p.id, speler: p.ruiter ?? p.eigenaar, perfect, gemikt: !!doel, hoogte: (vy * vy) / (2 * g) });
}

function stapLucht(p, stuur, wereld, R, dt, meld) {
  const W = wereld.weide;
  const ter = wereld.terreinOp;
  const sp = p.sprong;
  // Een sprongetje zonder hindernis: kort tikken = lager.
  if (sp && !sp.gemikt && !stuur.spring && p.vel[1] > 0 && !sp.kort) {
    p.vel[1] *= R.korteSprong;
    sp.kort = true;
  }
  p.vel[1] -= R.zwaartekracht * dt;
  const ox = p.pos[0];
  const oz = p.pos[2];
  p.pos[0] += p.vel[0] * dt;
  p.pos[1] += p.vel[1] * dt;
  p.pos[2] += p.vel[2] * dt;
  binnenGrens(p, wereld.grens);
  duwUitStammen(p, wereld, R.straal);
  // Tegen een hoge rots of rand: niet erdoor.
  if (ter(p.pos[0], p.pos[2]) - p.pos[1] > R.stapHoogte) {
    p.pos[0] = ox;
    p.pos[2] = oz;
    p.vel[0] = p.vel[2] = 0;
    p.snelheid = 0;
  }

  // Hindernissen in de lucht: net te laag = er toch nog over (met een tikje), veel te laag = terugbotsen.
  if (W.dichtbij(p.pos[0], p.pos[2], 2)) {
    for (const d of W.delen) {
      if (d.water) continue;
      const [a, b] = W.inDeel(d, p.pos[0], p.pos[2]);
      if (Math.abs(b) > d.breed + 0.1 || Math.abs(a) > d.diep + 0.08) continue;
      const top = d.y + d.hoogte;
      if (p.pos[1] >= top) continue;
      if (p.pos[1] > top - 0.45 || sp?.gemikt) {
        p.pos[1] = top;
        if (p.vel[1] < 0.6) p.vel[1] = 0.6;
        if (sp && !sp.getikt) {
          sp.getikt = true;
          sp.perfect = false;
          meld({ soort: 'ponyTik', pony: p.id, speler: p.ruiter ?? p.eigenaar, pos: [p.pos[0], top, p.pos[2]] });
        }
      } else {
        const [a0] = W.inDeel(d, p.vorigePos[0], p.vorigePos[2]);
        const kant = Math.sign(a0) || 1;
        const terug = kant * (d.diep + 0.3 + R.borst) - a;
        p.pos[0] += d.nx * terug;
        p.pos[2] += d.nz * terug;
        p.snelheid = -1.2;
        p.vel[0] = voorX(p) * p.snelheid;
        p.vel[2] = voorZ(p) * p.snelheid;
        p.naBots = true;
      }
    }
  }

  // Midden boven de hindernis: bij een perfecte sprong regent het bloemen.
  if (sp && sp.deel !== null && !sp.over) {
    const d = W.delen[sp.deel];
    const [a] = W.inDeel(d, p.pos[0], p.pos[2]);
    if (Math.sign(a) !== sp.kant) {
      sp.over = true;
      if (sp.perfect) meld({ soort: 'perfect', pony: p.id, speler: p.ruiter ?? p.eigenaar, pos: [d.x, d.y + d.hoogte + 0.9, d.z], deel: sp.deel });
    }
  }

  // Landing.
  const g = ter(p.pos[0], p.pos[2]);
  const peil = Math.max(W.water(p.pos[0], p.pos[2]), 0);
  const vloer = peil - g > R.zwemDiepte ? peil - R.drijf : g;
  if (p.pos[1] <= vloer) {
    p.pos[1] = vloer;
    const nat = peil - g > 0.05;
    meld({ soort: 'ponyLanding', pony: p.id, speler: p.ruiter ?? p.eigenaar, snelheid: -p.vel[1], nat, pos: [p.pos[0], nat ? peil : g, p.pos[2]] });
    p.opGrond = true;
    p.vel[1] = 0;
    if (sp && sp.deel !== null) {
      const d = W.delen[sp.deel];
      const [a] = W.inDeel(d, p.pos[0], p.pos[2]);
      if (Math.sign(a) !== sp.kant && Math.abs(a) > d.diep * 0.5 && !p.naBots) {
        meld({ soort: 'hindernis', pony: p.id, speler: p.ruiter ?? p.eigenaar, deel: sp.deel, groep: d.groep, perfect: sp.perfect });
        if (sp.perfect) p.boost = R.boostTijd;
      }
    }
    p.sprong = null;
    if (p.naBots) {
      p.naBots = false;
      beginWeigeren(p, meld);
    }
  }
}

function beginWeigeren(p, meld) {
  // De volle duur wordt in stapWeigeren gezet (daar kennen we de afsteltabel). Een aparte vlag, want
  // een klein restje tijd aan het einde van het weigeren mag nooit als "nieuwe weigering" tellen.
  p.weigert = 1e-6;
  p.weigerNieuw = true;
  p.snelheid = 0;
  p.vel = [0, 0, 0];
  p.boost = 0;
  p.sprong = null;
  p.opGrond = true;
  p.weigerRichting = p.richting;
  meld({ soort: 'weigeren', pony: p.id, speler: p.ruiter ?? p.eigenaar, pos: [...p.pos] });
}

/**
 * Weigeren: stoppen, hoofd schudden, zelf een stapje terug zetten. Na het hoofdschudden kan je al
 * sturen (ze draait dan ter plaatse), zodat je nooit het gevoel hebt dat de knoppen niet meer werken.
 */
function stapWeigeren(p, stuurIn, wereld, R, dt, meld) {
  if (p.weigerNieuw) {
    p.weigerNieuw = false;
    p.weigert = R.weigerDuur;
  }
  const t = R.weigerDuur - p.weigert;
  p.weigert -= dt;
  if (p.weigert < 1e-4) p.weigert = 0; // afrondingsrestjes wegwerken
  if (t > R.schudTijd && stuurIn.richting !== null) {
    const d = hoekVerschil(stuurIn.richting, p.richting);
    const max = R.draaiStil * dt;
    p.richting += Math.max(-max, Math.min(max, d));
  }
  const stuur = { richting: null, snelheid: 0, spring: false, springNu: false, gereden: false };
  if (t < R.schudTijd) p.snelheid = 0;
  else p.snelheid = -R.terugSnelheid * Math.sin(Math.min(1, (t - R.schudTijd) / (R.weigerDuur - R.schudTijd)) * Math.PI);
  verplaats(p, stuur, wereld, R, dt, meld);
  if (p.weigert <= 0) {
    p.weigert = 0;
    p.snelheid = 0;
    p.rustig = R.rustigNa;
  }
}

function binnenGrens(p, gr) {
  if (p.pos[0] < gr.minX || p.pos[0] > gr.maxX) p.pos[0] = Math.min(Math.max(p.pos[0], gr.minX), gr.maxX);
  if (p.pos[2] < gr.minZ || p.pos[2] > gr.maxZ) p.pos[2] = Math.min(Math.max(p.pos[2], gr.minZ), gr.maxZ);
}

function duwUitStammen(p, wereld, straal) {
  const T = wereld.raster.tegelGrootte;
  const tx = Math.floor(p.pos[0] / T);
  const tz = Math.floor(p.pos[2] / T);
  for (let j = tz - 1; j <= tz + 1; j++) {
    for (let i = tx - 1; i <= tx + 1; i++) {
      for (const st of wereld.stammen(i, j)) {
        const dx = p.pos[0] - st.x;
        const dz = p.pos[2] - st.z;
        const min = st.r + straal;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-8) continue;
        const d = Math.sqrt(d2);
        p.pos[0] = st.x + (dx / d) * min;
        p.pos[2] = st.z + (dz / d) * min;
      }
    }
  }
}

// --- Gereden of vrij ---

/**
 * Rijden: de joystick stuurt, ver duwen is galop (als er galopkracht is), springen springt.
 * De speler zit op de pony en gaat gewoon mee.
 */
export function stapRijden(s, p, int, wereld, R, dt, meld) {
  const [bx, bz] = int.beweeg;
  const kracht = Math.min(1, Math.hypot(bx, bz));
  let richting = null;
  let snelheid = 0;
  if (kracht > 0.1 && !p.stopt) {
    richting = Math.atan2(bx, bz);
    snelheid = kracht < R.stapTot ? R.stap : kracht >= R.galopVanaf && p.galop > 0.02 ? R.galop : R.draf;
  }
  const springNu = int.spring && !p.springVorige;
  p.springVorige = int.spring;
  stapPony(p, { richting, snelheid, spring: int.spring, springNu: springNu && !p.stopt, gereden: true }, wereld, R, dt, meld);

  s.pos[0] = p.pos[0];
  s.pos[1] = p.pos[1];
  s.pos[2] = p.pos[2];
  s.vel[0] = p.vel[0];
  s.vel[1] = p.vel[1];
  s.vel[2] = p.vel[2];
  s.richting = p.richting;
  s.opGrond = p.opGrond;
  s.veilig = [...p.veilig];
}

/** Vrij: staan en af en toe grazen, of na het fluiten naar de speler toe komen. */
export function stapPonyVrij(p, eigenaar, wereld, R, dt, meld) {
  let richting = null;
  let snelheid = 0;
  let springNu = false;
  if (p.modus === 'komt' && eigenaar) {
    // Ze komt naast je staan, aan je linkerkant.
    const lx = Math.cos(eigenaar.richting);
    const lz = -Math.sin(eigenaar.richting);
    const doelX = eigenaar.pos[0] + lx * R.komtStop;
    const doelZ = eigenaar.pos[2] + lz * R.komtStop;
    const dx = doelX - p.pos[0];
    const dz = doelZ - p.pos[2];
    const d = Math.hypot(dx, dz);
    const totJou = Math.hypot(eigenaar.pos[0] - p.pos[0], eigenaar.pos[2] - p.pos[2]);
    if (d < 0.6 || totJou < R.komtStop * 0.8) {
      p.modus = 'staat';
      meld({ soort: 'ponyErBij', pony: p.id, speler: p.eigenaar });
    } else {
      richting = Math.atan2(dx, dz);
      snelheid = d > 7 ? R.draf : d > 2.5 ? R.stap * 1.3 : R.stap * 0.7;
      // Een hindernis in de weg: ze springt er zelf over.
      if (p.opGrond && p.weigert <= 0) {
        const doel = zoekDoel(p, wereld, R, R.draf * 0.8);
        if (doel && !doel.d.water && doel.D - R.landMarge < 2.4) springNu = true;
      }
      // Komt ze niet vooruit (een rots, een boom, diep water)? Dan zoekt ze zelf een andere weg.
      const vooruit = p.vorigeAfstand - d;
      p.vastTijd = vooruit < 0.25 * dt ? p.vastTijd + dt : Math.max(0, p.vastTijd - dt * 2);
      p.vorigeAfstand = d;
      if (p.vastTijd > R.vastNa) {
        verschijn(p, eigenaar, wereld, R, meld);
        return;
      }
    }
  } else {
    // Rustig staan, en af en toe grazen.
    p.graasTijd -= dt;
    if (p.graasTijd <= 0) {
      p.graast = !p.graast;
      p.graasTijd = p.graast ? 3 + hash(p.tikken) * 3 : 4 + hash(p.tikken + 1) * 6;
    }
  }
  stapPony(p, { richting, snelheid, spring: springNu, springNu, gereden: false }, wereld, R, dt, meld);
}

/** Is dit een plek waar een pony kan verschijnen (droog, vlak genoeg, geen rots, geen boom, geen hindernis)? */
function goedePlek(x, z, wereld) {
  const gr = wereld.grens;
  if (x < gr.minX + 1 || x > gr.maxX - 1 || z < gr.minZ + 1 || z > gr.maxZ - 1) return false;
  const g = wereld.raster.hoogteOp(x, z);
  if (g < 0.15 || wereld.weide.water(x, z) > -Infinity) return false;
  if (wereld.rotsOp(x, z) > g - 0.3) return false;
  if (wereld.weide.hindernisOp(x, z) > -Infinity) return false;
  const [gx, gz] = wereld.raster.hellingOp(x, z);
  if (Math.hypot(gx, gz) > 0.5) return false;
  const T = wereld.raster.tegelGrootte;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++)
      for (const st of wereld.stammen(Math.floor(x / T) + i, Math.floor(z / T) + j)) if (Math.hypot(st.x - x, st.z - z) < st.r + 1.2) return false;
  return true;
}

/** Ze zoekt zelf een weg: ze stapt een eindje achter je uit de jungle en draaft naar je toe. */
export function verschijn(p, eigenaar, wereld, R, meld) {
  const achter = eigenaar.richting + Math.PI;
  for (const r of [R.verschijnAfstand, R.verschijnAfstand * 0.6, 4]) {
    for (const da of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6, Math.PI]) {
      const a = achter + da;
      const x = eigenaar.pos[0] + Math.sin(a) * r;
      const z = eigenaar.pos[2] + Math.cos(a) * r;
      if (!goedePlek(x, z, wereld)) continue;
      const y = wereld.terreinOp(x, z);
      meld({ soort: 'ponyWeg', pony: p.id, speler: p.eigenaar, pos: [...p.pos] });
      p.pos = [x, y, z];
      p.vorigePos = [x, y, z];
      p.vel = [0, 0, 0];
      p.snelheid = 0;
      p.opGrond = true;
      p.sprong = null;
      p.weigert = 0;
      p.richting = Math.atan2(eigenaar.pos[0] - x, eigenaar.pos[2] - z);
      p.vorigeRichting = p.richting;
      p.modus = 'komt';
      p.vastTijd = 0;
      p.vorigeAfstand = r;
      meld({ soort: 'ponyVerschijnt', pony: p.id, speler: p.eigenaar, pos: [x, y, z] });
      return;
    }
  }
  p.modus = 'staat';
}

/** Opstappen: de speler springt op de pony. */
export function stapOp(s, p, meld) {
  meld({ soort: 'opstappen', speler: s.id, pony: p.id, van: [...s.pos] });
  s.modus = 'rijden';
  s.rijdt = p.id;
  s.klimt = null;
  p.ruiter = s.id;
  p.modus = 'staat';
  p.stopt = false;
  p.graast = false;
  p.springVorige = true; // de sprongknop van daarnet telt niet als ponysprong
  s.pos = [...p.pos];
  s.vel = [0, 0, 0];
}

/** Afstappen: naast de pony, aan de linkerkant als dat kan. */
export function stapAf(s, p, wereld, meld) {
  const lx = Math.cos(p.richting);
  const lz = -Math.sin(p.richting);
  const plekken = [
    [lx * 1.1, lz * 1.1], [-lx * 1.1, -lz * 1.1],
    [-Math.sin(p.richting) * 1.4, -Math.cos(p.richting) * 1.4],
    [0, 0],
  ];
  let [x, z] = [p.pos[0], p.pos[2]];
  for (const [dx, dz] of plekken) {
    const nx = p.pos[0] + dx;
    const nz = p.pos[2] + dz;
    const g = wereld.grondOp(nx, nz);
    if (Math.abs(g - p.pos[1]) < 0.6 && Math.max(wereld.weide.water(nx, nz), 0) - g < 0.5) {
      x = nx;
      z = nz;
      break;
    }
  }
  const y = wereld.grondOp(x, z);
  meld({ soort: 'afstappen', speler: s.id, pony: p.id, van: [...p.pos] });
  s.modus = 'lopen';
  s.rijdt = null;
  p.ruiter = null;
  p.stopt = false;
  p.modus = 'staat';
  p.graasTijd = 2;
  s.pos = [x, y, z];
  s.vorigePos = [x, y, z];
  s.vel = [0, 0, 0];
  s.opGrond = true;
  s.richting = p.richting;
  s.springVorige = true;
  s.veilig = [x, y, z];
}
