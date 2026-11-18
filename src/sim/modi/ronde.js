// Het spel in de springweide (GD 6, 14): een ronde met rondetijd, en de wortels langs de baan.
// Een ronde: door de bloemenboog, alle hindernissen springen (in eender welke volgorde), en weer door de boog.

/** @typedef {ReturnType<typeof maakRonde>} Ronde */
export function maakRonde() {
  return {
    bezig: false,
    start: 0,          // simulatietijd bij de start
    gedaan: [],        // per hindernisgroep: welke delen al gesprongen zijn
    klaar: [],         // per groep: helemaal gedaan
    perfect: 0,        // aantal perfecte sprongen deze ronde
    weigeringen: 0,
    beste: null,       // beste rondetijd tot nu toe
  };
}

function wis(r, weide) {
  r.gedaan = weide.groepen.map(() => []);
  r.klaar = weide.groepen.map(() => false);
  r.perfect = 0;
  r.weigeringen = 0;
}

/**
 * Na elke stap van een gereden pony: door de boog gereden?
 * @param {Ronde} r
 * @param {import('../wezens/pony.js').Pony} p
 */
export function werkRondeBij(r, p, weide, tijd, spelerId, meld) {
  const g = weide.poort;
  const kant = (pos) => (pos[0] - g.x) * g.nx + (pos[2] - g.z) * g.nz;
  const dwars = (p.pos[0] - g.x) * g.tx + (p.pos[2] - g.z) * g.tz;
  const a0 = kant(p.vorigePos);
  const a1 = kant(p.pos);
  if (Math.abs(dwars) < g.breed && Math.sign(a0) !== Math.sign(a1) && Math.abs(a0 - a1) < 1) {
    if (r.bezig && r.klaar.every(Boolean)) {
      const t = tijd - r.start;
      const record = r.beste === null || t < r.beste;
      if (record) r.beste = t;
      meld({ soort: 'rondeKlaar', speler: spelerId, tijd: t, perfect: r.perfect, weigeringen: r.weigeringen, record, beste: r.beste });
    }
    // Elke keer door de boog: een nieuwe ronde begint.
    r.bezig = true;
    r.start = tijd;
    wis(r, weide);
    meld({ soort: 'rondeStart', speler: spelerId, aantal: weide.groepen.length });
  }
  // Ver weg van de weide: de ronde telt niet meer.
  if (r.bezig && !weide.dichtbij(p.pos[0], p.pos[2], 8)) stopRonde(r, spelerId, meld);
}

export function stopRonde(r, spelerId, meld) {
  if (!r.bezig) return;
  r.bezig = false;
  meld({ soort: 'rondeStop', speler: spelerId });
}

/** Een hindernisdeel is gesprongen. */
export function hindernisGesprongen(r, weide, deel, perfect, spelerId, meld) {
  if (!r.bezig) return;
  const d = weide.delen[deel];
  const groep = weide.groepen[d.groep];
  const lijst = r.gedaan[d.groep];
  if (!lijst.includes(deel)) lijst.push(deel);
  if (perfect) r.perfect++;
  if (!r.klaar[d.groep] && groep.delen.every((i) => lijst.includes(i))) {
    r.klaar[d.groep] = true;
    meld({ soort: 'rondeHindernis', speler: spelerId, groep: d.groep, perfect, gedaan: r.klaar.filter(Boolean).length, aantal: r.klaar.length });
  }
}

/** Wortels: ze liggen op de baan; wie er met de pony langs rijdt, krijgt galopkracht. */
export function maakWortels(weide) {
  return weide.wortels.map((w) => ({ ...w, weg: 0 }));
}

export function stapWortels(wortels, ponies, R, dt, meld) {
  for (const w of wortels) {
    if (w.weg > 0) {
      w.weg -= dt;
      if (w.weg <= 0) {
        w.weg = 0;
        meld({ soort: 'wortelTerug', id: w.id });
      }
      continue;
    }
    for (const p of ponies) {
      if (!p.ruiter || !p.opGrond) continue;
      const dx = p.pos[0] + Math.sin(p.richting) * 0.5 - w.x;
      const dz = p.pos[2] + Math.cos(p.richting) * 0.5 - w.z;
      if (dx * dx + dz * dz > R.wortelStraal * R.wortelStraal) continue;
      w.weg = R.wortelTerug;
      p.galop = Math.min(1, p.galop + R.wortelKracht);
      meld({ soort: 'wortel', id: w.id, pony: p.id, speler: p.ruiter, pos: [w.x, w.y, w.z], galop: p.galop });
      break;
    }
  }
}
