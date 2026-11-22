// De Bengaalse tijger als reisgezel (GD 8): hij wacht bij het kamp tot je hem ontmoet, geeft je een kopje,
// loopt dan voor je uit naar de slaapbloem (wacht en kijkt om als je achterblijft, wijst met zijn kop),
// begroet de pony, en brult als jij op de brulknop drukt. Daarna loopt hij gewoon met je mee.
// Hij volgt altijd een weg uit de padvinder, zodat hij nooit in een rots, boom of het water loopt.

const hoekVerschil = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const afstand = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/** Draait de tijger naar een hoek, met een beperkte draaisnelheid. */
function draai(t, doel, G, dt) {
  const d = hoekVerschil(doel, t.richting);
  const max = G.draaiSnelheid * dt;
  t.richting += Math.max(-max, Math.min(max, d));
}
const draaiNaar = (t, x, z, G, dt) => draai(t, Math.atan2(x - t.pos[0], z - t.pos[2]), G, dt);

/** Remt af tot stilstand. */
function rem(t, G, dt) {
  t.snelheid = Math.max(0, t.snelheid - G.versnelling * 1.6 * dt);
  if (t.snelheid > 0) beweeg(t, t.snelheid * dt);
}

let wereld;
let pad;
function beweeg(t, stap) {
  // Uitlopen na het remmen: alleen zolang de grond vrij is.
  const nx = t.pos[0] + Math.sin(t.richting) * stap;
  const nz = t.pos[2] + Math.cos(t.richting) * stap;
  if (!pad.vrij(nx, nz, 0.35)) {
    t.snelheid = 0;
    return;
  }
  t.pos[0] = nx;
  t.pos[2] = nz;
}

/**
 * Loopt over een gezochte weg naar (x, z). Geeft de resterende afstand tot het doel terug.
 * @returns {number}
 */
function loopNaar(t, x, z, snelheid, G, dt, meld) {
  t.wegTijd += dt;
  const doelVerschoven = !t.wegDoel || Math.hypot(t.wegDoel[0] - x, t.wegDoel[1] - z) > 1.5;
  if ((doelVerschoven && t.wegTijd > 0.4) || t.wegTijd > 3 || (!t.weg.length && t.wegTijd > 0.5)) {
    t.weg = pad.zoek(t.pos[0], t.pos[2], x, z) ?? [];
    t.wegDoel = [x, z];
    t.wegTijd = 0;
  }
  while (t.weg.length > 1 && Math.hypot(t.weg[0][0] - t.pos[0], t.weg[0][1] - t.pos[2]) < G.stopAfstand) t.weg.shift();
  const rest = Math.hypot(x - t.pos[0], z - t.pos[2]);
  if (rest < 1) t.vastKeren = 0;
  if (!t.weg.length) {
    // Geen weg gevonden: hij blijft staan (en telt dat als vastzitten als hij echt ergens heen wil).
    if (snelheid > 0.3 && rest > 2) t.vastTijd += dt;
    rem(t, G, dt);
    if (t.vastTijd > G.vastNa) {
      t.vastTijd = 0;
      t.vastKeren++;
      meld({ soort: 'tijgerVast', tijger: t.id, keren: t.vastKeren });
    }
    return rest;
  }
  const [wx, wz] = t.weg[0];
  const dx = wx - t.pos[0];
  const dz = wz - t.pos[2];
  const d = Math.hypot(dx, dz);
  if (d < 0.05) {
    t.weg.shift();
    rem(t, G, dt);
    return rest;
  }
  const hoek = Math.atan2(dx, dz);
  draai(t, hoek, G, dt);
  // Grote bocht: eerst (bijna) ter plaatse omdraaien. Vlak voor het doel: rustig uitlopen.
  const fout = Math.abs(hoekVerschil(hoek, t.richting));
  let v = snelheid * Math.max(0.15, Math.cos(Math.min(fout, 1.45)));
  if (t.weg.length === 1) v = Math.min(v, 0.6 + d * 1.2);
  t.snelheid += Math.max(-G.versnelling * 2 * dt, Math.min(G.versnelling * dt, v - t.snelheid));
  // Hij stapt precies over zijn weg (de kop draait mee), zo kan hij nooit van de weg af in een rots of boom.
  const stap = Math.min(d, t.snelheid * dt);
  t.pos[0] += (dx / d) * stap;
  t.pos[2] += (dz / d) * stap;

  // Komt hij niet vooruit (hij wil lopen maar verplaatst zich amper)? Dan een nieuwe weg,
  // en lukt dat ook niet: hij komt elders tevoorschijn.
  t.vastTijd = snelheid > 0.3 && stap < 0.08 * snelheid * dt ? t.vastTijd + dt : Math.max(0, t.vastTijd - dt * 2);
  if (t.vastTijd > G.vastNa) {
    t.vastTijd = 0;
    t.wegTijd = 99;
    t.vastKeren++;
    meld({ soort: 'tijgerVast', tijger: t.id, keren: t.vastKeren });
  }
  return rest;
}

/** Hij komt uit de jungle tevoorschijn, een eindje achter de speler. */
export function verschijnGezel(t, s, G, meld) {
  const achter = s.richting + Math.PI;
  for (const r of [G.verschijnAfstand, G.verschijnAfstand * 0.6, 4, 2.5]) {
    for (const da of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6, Math.PI]) {
      const a = achter + da;
      const x = s.pos[0] + Math.sin(a) * r;
      const z = s.pos[2] + Math.cos(a) * r;
      if (!pad.vrij(x, z, 0.8)) continue;
      meld({ soort: 'tijgerWeg', tijger: t.id, speler: t.eigenaar, pos: [...t.pos] });
      const y = wereld.terreinOp(x, z);
      t.pos = [x, y, z];
      t.vorigePos = [x, y, z];
      t.richting = t.vorigeRichting = Math.atan2(s.pos[0] - x, s.pos[2] - z);
      t.snelheid = 0;
      t.weg = [];
      t.wegTijd = 99;
      t.vastTijd = 0;
      t.vastKeren = 0;
      meld({ soort: 'tijgerVerschijnt', tijger: t.id, speler: t.eigenaar, pos: [x, y, z] });
      return true;
    }
  }
  return false;
}

/** De eerste slaapbloem die nog dicht is, of open met de schat er nog in. */
const bloemTeDoen = (bloemen) => bloemen.find((b) => !b.open) ?? bloemen.find((b) => !b.schat.gepakt);

/** Waar de tijger bij de bloem gaat staan: aan de kant waar je vandaan komt. */
function bloemPlek(t, b, G) {
  if (!b.plek) {
    const dx = t.pos[0] - b.x;
    const dz = t.pos[2] - b.z;
    const d = Math.hypot(dx, dz) || 1;
    for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
      const a = Math.atan2(dx / d, dz / d) + da;
      const x = b.x + Math.sin(a) * G.bloemAfstand;
      const z = b.z + Math.cos(a) * G.bloemAfstand;
      if (pad.vrij(x, z, 0.6)) {
        b.plek = [x, z];
        break;
      }
    }
    b.plek ??= [b.x + dx / d * G.bloemAfstand, b.z + dz / d * G.bloemAfstand];
  }
  return b.plek;
}

/** Na een kopje, begroeting of brul: verder gidsen als er nog een slaapbloem wacht, anders meelopen. */
function verder(t, bloemen) {
  t.modus = t.vriend && bloemTeDoen(bloemen) ? 'gids' : t.vriend ? 'volg' : 'rust';
  t.wacht = false;
  t.weg = [];
  t.wegTijd = 99;
  t.vastTijd = 0;
}

const hoofd = (s) => [s.pos[0], s.pos[1] + (s.modus === 'rijden' ? 2.1 : 1.2), s.pos[2]];

/**
 * Eén stap van de tijger.
 * @param {import('../wezens/tijger.js').Gezel} t
 * @param {any} s de speler met wie hij optrekt
 * @param {any} p de pony van die speler
 * @param {any[]} bloemen de slaapbloemen
 * @param {{ brul: boolean, aai: boolean }} vraag wat de speler deze stap van hem vraagt
 */
export function stapGezel(t, s, p, bloemen, w, padvinder, G, dt, meld) {
  wereld = w;
  pad = padvinder;
  const dS = afstand(t.pos, s.pos);
  t.begroetSinds += dt;
  t.kijk = null;

  // Te ver weg of te vaak vastgelopen: hij komt naast je uit de jungle.
  if (t.vriend && t.modus !== 'brult' && (dS > G.verschijnVanaf || t.vastKeren >= 2)) {
    if (verschijnGezel(t, s, G, meld) && t.modus !== 'gids') t.modus = 'volg';
  }

  // Pony en tijger begroeten elkaar (af en toe, als ze dicht bij elkaar komen).
  if (p && t.vriend && ['gids', 'volg', 'bijBloem'].includes(t.modus) && t.begroetSinds > G.begroetOpnieuw) {
    const dP = afstand(t.pos, p.pos);
    if (dP < G.begroetAfstand) {
      if (p.ruiter) {
        if (dP < 3.5) {
          t.begroetSinds = 0;
          meld({ soort: 'begroeting', tijger: t.id, pony: p.id, speler: t.eigenaar, rijdend: true, pos: [...t.pos] });
        }
      } else if (p.modus === 'staat' && p.opGrond) {
        t.naModus = t.modus;
        t.modus = 'begroet';
        t.begroetFase = 'heen';
        t.timer = 6; // lukt het niet binnen 6 s om bij haar te komen, dan laat hij het
        t.weg = [];
        t.wegTijd = 99;
      }
    }
  }

  switch (t.modus) {
    case 'rust': {
      // Hij wacht bij het kamp en kijkt naar je als je in de buurt bent.
      const [rx, rz, rr] = t.rustPlek;
      if (Math.hypot(rx - t.pos[0], rz - t.pos[2]) > 0.6) loopNaar(t, rx, rz, G.stap, G, dt, meld);
      else {
        rem(t, G, dt);
        draai(t, rr, G, dt * 0.4);
      }
      if (dS < 14) t.kijk = hoofd(s);
      if (dS < G.ontmoetAfstand) {
        t.modus = 'ontmoet';
        t.timer = 8;
        meld({ soort: 'proest', tijger: t.id, speler: t.eigenaar, pos: [...t.pos] });
      }
      break;
    }

    case 'ontmoet': {
      // Hij komt naar je toe en duwt zijn kop tegen je aan.
      t.timer -= dt;
      t.kijk = hoofd(s);
      const op = s.modus === 'rijden' ? 1.4 : G.kopjeAfstand;
      const ux = (t.pos[0] - s.pos[0]) / (dS || 1);
      const uz = (t.pos[2] - s.pos[2]) / (dS || 1);
      // Het midden van de tijger staat een halve lijflengte achter zijn kop.
      const tx = s.pos[0] + ux * (op + 0.75 * G.schaal);
      const tz = s.pos[2] + uz * (op + 0.75 * G.schaal);
      const rest = loopNaar(t, tx, tz, G.stap * 1.4, G, dt, meld);
      if (rest < 0.3 || dS < op + 0.75 * G.schaal + 0.15 || t.timer < 0) {
        t.modus = 'kopje';
        t.timer = G.kopjeDuur;
        t.vriend = true;
        t.snelheid = 0;
        meld({ soort: 'kopje', tijger: t.id, speler: t.eigenaar, pos: [...t.pos], eerste: !t.kopjes });
        t.kopjes = (t.kopjes ?? 0) + 1;
      }
      break;
    }

    case 'kopje': {
      t.timer -= dt;
      t.kijk = hoofd(s);
      rem(t, G, dt);
      draaiNaar(t, s.pos[0], s.pos[2], G, dt);
      if (t.timer <= 0) verder(t, bloemen);
      break;
    }

    case 'gids': {
      const b = bloemTeDoen(bloemen);
      if (!b) {
        verder(t, bloemen);
        break;
      }
      // Je bent heel ver weg (bv. op de pony weggereden): eerst naar je toe.
      if (dS > 30) {
        loopNaar(t, s.pos[0], s.pos[2], G.galop, G, dt, meld);
        break;
      }
      const [bx, bz] = bloemPlek(t, b, G);
      const dDoel = Math.hypot(bx - t.pos[0], bz - t.pos[2]);
      if (dDoel < 0.7) {
        t.modus = 'bijBloem';
        t.timer = 0;
        meld({ soort: 'tijgerBijBloem', tijger: t.id, speler: t.eigenaar, bloem: b.id });
        break;
      }
      if (t.wacht && dS < G.verderAfstand) t.wacht = false;
      else if (!t.wacht && dS > G.wachtAfstand) {
        t.wacht = true;
        t.wachtTijd = 0;
        t.roepTijd = G.roepTussen * 0.5;
        meld({ soort: 'tijgerWacht', tijger: t.id, speler: t.eigenaar });
      }
      if (t.wacht) {
        // Omkijken naar jou, en dan met zijn kop wijzen waar hij heen wil.
        rem(t, G, dt);
        t.wachtTijd += dt;
        t.roepTijd += dt;
        const naarJou = Math.floor(t.wachtTijd / G.wijsTussen) % 2 === 0;
        if (naarJou) {
          draaiNaar(t, s.pos[0], s.pos[2], G, dt * 0.6);
          t.kijk = hoofd(s);
        } else {
          draaiNaar(t, b.x, b.z, G, dt * 0.6);
          t.kijk = [b.x, b.y + 1, b.z];
        }
        if (t.roepTijd > G.roepTussen) {
          t.roepTijd = 0;
          meld({ soort: 'proest', tijger: t.id, speler: t.eigenaar, pos: [...t.pos], roept: true });
        }
        break;
      }
      // Lopen: rustig voor je uit; sneller als je vlak achter hem zit of hem voorbij bent.
      const jijDoel = Math.hypot(bx - s.pos[0], bz - s.pos[2]);
      let v = dS < 3 ? G.stap * 1.5 : dS > G.voorAfstand ? G.stap * 0.7 : G.stap;
      if (jijDoel + 1 < dDoel) v = G.draf;
      if (s.modus === 'rijden' && Math.hypot(s.vel[0], s.vel[2]) > 3) v = G.draf;
      loopNaar(t, bx, bz, v, G, dt, meld);
      break;
    }

    case 'bijBloem': {
      // Hij staat bij de bloem en kijkt beurtelings naar de bloem en naar jou: "hier!"
      const b = bloemTeDoen(bloemen);
      t.timer += dt;
      rem(t, G, dt);
      if (!b || dS > 30) {
        verder(t, bloemen);
        break;
      }
      const naarBloem = Math.floor(t.timer / G.wijsTussen) % 2 === 0 || dS < 3;
      draaiNaar(t, b.x, b.z, G, dt * 0.6);
      t.kijk = naarBloem ? [b.x, b.y + 0.8, b.z] : hoofd(s);
      break;
    }

    case 'volg': {
      // Meelopen: hij komt naast je staan (een eindje voor je uit), en haalt je in als je wegrent of rijdt.
      const zij = G.volgPlek[0];
      const voor = G.volgPlek[1];
      const r = s.richting;
      const tx = s.pos[0] + Math.sin(r) * voor + Math.cos(r) * zij;
      const tz = s.pos[2] + Math.cos(r) * voor - Math.sin(r) * zij;
      const dDoel = Math.hypot(tx - t.pos[0], tz - t.pos[2]);
      if (!t.volgt && (dS > G.volgAfstand || dDoel > G.volgAfstand + 1.5)) t.volgt = true;
      if (t.volgt) {
        const jij = Math.hypot(s.vel[0], s.vel[2]);
        const v = dDoel > 14 || jij > G.draf ? Math.min(G.galop, Math.max(G.draf, jij * 1.15)) : dDoel > 6 ? G.draf : G.stap * 1.4;
        const rest = loopNaar(t, tx, tz, v, G, dt, meld);
        if (rest < 0.8) t.volgt = false;
      } else {
        rem(t, G, dt);
        if (dS < 12) {
          t.kijk = hoofd(s);
          if (dS > 2.5) draaiNaar(t, s.pos[0], s.pos[2], G, dt * 0.3);
        }
      }
      // Wacht er nog een slaapbloem en ben je bij hem? Dan wijst hij je weer de weg.
      if (bloemTeDoen(bloemen) && dS < 6) verder(t, bloemen);
      break;
    }

    case 'begroet': {
      t.timer -= dt;
      if (!p || p.ruiter || t.timer <= 0) {
        t.begroetSinds = 0;
        t.modus = t.naModus;
        break;
      }
      // De kop van de pony: een eindje voor haar midden.
      const kx = p.pos[0] + Math.sin(p.richting) * 0.9;
      const kz = p.pos[2] + Math.cos(p.richting) * 0.9;
      if (t.begroetFase === 'heen') {
        const ux = t.pos[0] - kx;
        const uz = t.pos[2] - kz;
        const d = Math.hypot(ux, uz) || 1;
        const tx = kx + (ux / d) * G.neusAfstand * 0.7;
        const tz = kz + (uz / d) * G.neusAfstand * 0.7;
        t.kijk = [kx, p.pos[1] + 1.3, kz];
        const rest = loopNaar(t, tx, tz, G.stap * 1.2, G, dt, meld);
        if (rest < 0.35 || afstand(t.pos, p.pos) < G.neusAfstand) {
          t.begroetFase = 'neus';
          t.timer = G.begroetDuur;
          t.snelheid = 0;
          meld({ soort: 'begroeting', tijger: t.id, pony: p.id, speler: t.eigenaar, rijdend: false, pos: [(t.pos[0] + kx) / 2, t.pos[1], (t.pos[2] + kz) / 2] });
        }
      } else {
        rem(t, G, dt);
        draaiNaar(t, kx, kz, G, dt);
        t.kijk = [kx, p.pos[1] + 1.2, kz];
        p.begroetDoor = t.id;
        if (t.timer <= 0.05) {
          t.begroetSinds = 0;
          t.modus = t.naModus;
        }
      }
      break;
    }

    case 'brult': {
      t.timer -= dt;
      rem(t, G, dt);
      if (t.brulDoel) draaiNaar(t, t.brulDoel[0], t.brulDoel[1], G, dt);
      if (!t.brulGemeld && G.brulDuur - t.timer > G.brulKlank) {
        t.brulGemeld = true;
        meld({ soort: 'brul', tijger: t.id, speler: t.eigenaar, pos: [...t.pos], richting: t.richting });
        for (const b of bloemen) {
          if (b.open) continue;
          if (Math.hypot(b.x - t.pos[0], b.z - t.pos[2]) > G.brulBereik && Math.hypot(b.x - s.pos[0], b.z - s.pos[2]) > G.brulBereik) continue;
          b.open = true;
          b.openTijd = 0;
          meld({ soort: 'bloemOpen', bloem: b.id, speler: t.eigenaar, pos: [b.x, b.y, b.z] });
        }
      }
      if (t.timer <= 0) {
        t.modus = t.naModus;
        if (t.modus === 'bijBloem' || t.modus === 'gids') verder(t, bloemen);
      }
      break;
    }
  }

  // Niet in de speler of de pony gaan staan.
  const duwWeg = (o, min) => {
    const dx = t.pos[0] - o.pos[0];
    const dz = t.pos[2] - o.pos[2];
    const d = Math.hypot(dx, dz);
    if (d >= min || d < 1e-4) return;
    const nx = o.pos[0] + (dx / d) * min;
    const nz = o.pos[2] + (dz / d) * min;
    if (pad.vrij(nx, nz, 0.3)) {
      t.pos[0] += (nx - t.pos[0]) * 0.2;
      t.pos[2] += (nz - t.pos[2]) * 0.2;
    }
  };
  if (s.modus !== 'rijden') duwWeg(s, t.modus === 'kopje' || t.modus === 'ontmoet' ? 0.75 * G.schaal + 0.6 : 1.2);
  if (p) duwWeg(p, t.modus === 'begroet' ? 1.5 : 1.9);

  t.pos[1] = wereld.terreinOp(t.pos[0], t.pos[2]);
  const v = t.snelheid;
  t.gang = v < 0.12 ? 'stil' : v < 2.3 ? 'stap' : v < 5.8 ? 'draf' : 'galop';
}

/**
 * De speler drukt op de brulknop: is de meter vol, dan brult de tijger. Geeft true als hij brult.
 */
export function vraagBrul(t, s, bloemen, G, meld) {
  if (!t.vriend) {
    // Nog niet ontmoet: hij komt eerst naar je toe.
    if (t.modus === 'rust') {
      t.modus = 'ontmoet';
      t.timer = 8;
      meld({ soort: 'proest', tijger: t.id, speler: t.eigenaar, pos: [...t.pos] });
    }
    return false;
  }
  if (t.modus === 'brult') return false;
  if (s.brulMeter < 1) {
    meld({ soort: 'brulTeVroeg', tijger: t.id, speler: t.eigenaar, meter: s.brulMeter, pos: [...t.pos] });
    return false;
  }
  if (afstand(t.pos, s.pos) > G.brulVerschijn) verschijnGezel(t, s, G, meld);
  s.brulMeter = 0;
  s.meterVolGemeld = false;
  t.naModus = t.modus === 'begroet' || t.modus === 'kopje' || t.modus === 'ontmoet' ? 'volg' : t.modus;
  t.modus = 'brult';
  t.timer = G.brulDuur;
  t.brulGemeld = false;
  t.snelheid = 0;
  // Hij brult naar de dichtste slaapbloem die nog dicht is, anders in de richting waarin jij kijkt.
  const b = bloemen.filter((q) => !q.open).sort((a, c) => Math.hypot(a.x - t.pos[0], a.z - t.pos[2]) - Math.hypot(c.x - t.pos[0], c.z - t.pos[2]))[0];
  t.brulDoel = b && Math.hypot(b.x - t.pos[0], b.z - t.pos[2]) < G.brulBereik * 1.5 ? [b.x, b.z] : [t.pos[0] + Math.sin(s.richting) * 5, t.pos[2] + Math.cos(s.richting) * 5];
  meld({ soort: 'brulStart', tijger: t.id, speler: t.eigenaar, pos: [...t.pos] });
  return true;
}

/** Aaien (tik op de tijger): dichtbij komt hij een kopje geven, anders is hij gewoon blij. */
export function aaiGezel(t, s, G, meld) {
  meld({ soort: 'tijgerAai', tijger: t.id, speler: t.eigenaar, pos: [...t.pos] });
  if (['rust', 'gids', 'volg', 'bijBloem'].includes(t.modus) && s.modus === 'lopen' && afstand(t.pos, s.pos) < 6) {
    if (t.modus !== 'rust') t.naModus = t.modus;
    t.modus = 'ontmoet';
    t.timer = 4;
    t.weg = [];
    t.wegTijd = 99;
  }
}
