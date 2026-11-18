// De toestand van een speler: gewone gegevens, zodat later meerdere spelers kunnen (TP 4).

/**
 * @typedef {{ beweeg: [number, number], spring: boolean, actie: boolean }} Intentie
 * `beweeg` is een richting op de grond in wereldcoördinaten [x, z], lengte 0..1.
 */

/** @returns {Intentie} */
export function legeIntentie() {
  return { beweeg: [0, 0], spring: false, actie: false };
}

/** @typedef {ReturnType<typeof maakSpeler>} Speler */
export function maakSpeler(id, x, y, z) {
  return {
    id,
    modus: 'lopen',
    pos: [x, y, z],
    vorigePos: [x, y, z], // stand bij de vorige stap, voor vloeiend tekenen
    vel: [0, 0, 0],
    richting: 0,          // kijkhoek rond de verticale as (radialen)
    vorigeRichting: 0,
    opGrond: true,
    glijdt: false,
    klimt: null,          // bezig met opklimmen over een rand: { t, duur, van, naar, richting }
    coyote: 0,
    sprongBuffer: 0,
    springVorige: false,
    springtVast: false,
    veilig: [x, y, z],    // laatste veilige grond
    veiligTijd: 0,
    glijTijd: 0,
    bloesems: 0,          // verzamelde bloesems
    bloesemReeks: 0,      // hoeveel kort na elkaar (voor de stijgende klank)
    sindsBloesem: 99,
  };
}
