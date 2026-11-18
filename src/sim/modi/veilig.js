// De laatste veilige grond (GD 1): de plek waar je het laatst stevig stond.
// Mislukken is nooit erg: een zachte plof, een wolkje bloemblaadjes, en je staat daar terug.

/** Onthoudt de plek als je er even stevig staat (niet glijden, niet in het water). */
export function onthoudVeilig(s, grond, dt, wachttijd) {
  if (!s.opGrond || s.glijdt || s.klimt || grond < 0.02) { // alleen droge grond
    s.veiligTijd = 0;
    return;
  }
  s.veiligTijd += dt;
  if (s.veiligTijd >= wachttijd) {
    s.veilig[0] = s.pos[0];
    s.veilig[1] = s.pos[1];
    s.veilig[2] = s.pos[2];
    s.veiligTijd = 0;
  }
}

/** Plof: terug naar de laatste veilige grond. */
export function naarVeiligeGrond(s, meld) {
  meld({ soort: 'plof', speler: s.id, pos: [...s.pos] });
  s.pos = [...s.veilig];
  s.vorigePos = [...s.veilig]; // geen streep door het beeld
  s.vel = [0, 0, 0];
  s.modus = 'lopen';
  s.opGrond = true;
  s.glijdt = false;
  s.glijTijd = 0;
  s.klimt = null;
  meld({ soort: 'terug', speler: s.id, pos: [...s.veilig] });
}
