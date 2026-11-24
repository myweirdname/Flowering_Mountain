// De toestand van een speler: gewone gegevens, zodat later meerdere spelers kunnen (TP 4).

/**
 * @typedef {{ beweeg: [number, number], spring: boolean, actie: boolean, fluit?: boolean, aai?: boolean }} Intentie
 * `beweeg` is een richting op de grond in wereldcoördinaten [x, z], lengte 0..1.
 * `fluit` roept de pony; `aai` aait de pony (één stap lang, na een tik op de pony).
 * `brul` laat de tijger brullen; `aaiTijger` aait de tijger (na een tik op hem); `aaiWelp` is het id van het welpje
 * dat je aait (of null).
 */

/** @returns {Intentie} */
export function legeIntentie() {
  return { beweeg: [0, 0], spring: false, actie: false, fluit: false, aai: false, brul: false, aaiTijger: false, aaiWelp: null };
}

/** @typedef {ReturnType<typeof maakSpeler>} Speler */
export function maakSpeler(id, x, y, z) {
  return {
    id,
    modus: 'lopen',       // 'lopen' | 'zwemmen' | 'rijden' | 'klimmen' | 'varen'
    rijdt: null,          // id van de pony waar je op zit
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
    actieVorige: false,
    fluitVorige: false,
    /** @type {any} */
    ronde: null,
    /** @type {any} */
    klim: null,           // op de klimwand: de klimtoestand (sim/modi/klimmen.js)
    /** @type {any} */
    klimVraag: null,      // een zet gevraagd van buitenaf (tests): { greep, lid }
    /** @type {string | null} */
    vlot: null,           // id van het vlot waar je op zit (stap 10)
    // Het speelbos (stap 11)
    /** @type {any} */
    bos: null,            // voortgang op het parcours (sim/doorgangen/speelbos.js)
    /** @type {any} */
    liaan: null,          // aan een liaan: { m (doorgang), i (welke liaan), r (straal) }
    /** @type {any} */
    liaanLos: null,       // net losgelaten: { m, i, tijd } (even niet dezelfde opnieuw grijpen)
    vlucht: 0,            // gelanceerd: zo lang remt de lucht je niet af
    zwaai: 0,             // hoek van de liaan (voor het beeld)
    wiebel: 0,            // op de balanceerstam: hoe hard ze balanceert (-1..1, voor het beeld)
    bloemDruk: 0,         // op de springbloem: nog zo lang tot de lancering
  };
}
