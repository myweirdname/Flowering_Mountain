// De toestand van een pony: gewone gegevens, net als de speler (TP 4). Elke speler heeft zijn eigen pony,
// zodat er later meerdere spelers met elk een pony kunnen rondrijden.

/** @typedef {ReturnType<typeof maakPony>} Pony */
export function maakPony(id, eigenaar, x, y, z, richting, galop) {
  return {
    id,
    eigenaar,             // id van de speler van wie deze pony is
    ruiter: null,         // id van de speler die erop zit, of null
    modus: 'staat',       // 'staat' | 'komt' (na fluiten)
    pos: [x, y, z],
    vorigePos: [x, y, z],
    vel: [0, 0, 0],
    snelheid: 0,          // vaart in de kijkrichting (een pony loopt niet opzij)
    richting,
    vorigeRichting: richting,
    opGrond: true,
    glijdt: false,        // (nodig voor de laatste veilige grond)
    klimt: null,
    veilig: [x, y, z],
    veiligTijd: 0,
    gang: 'stil',         // 'stil' | 'stap' | 'draf' | 'galop', voor beeld en geluid
    galop,                // galopkracht 0..1
    galoppeert: false,
    boost: 0,             // resterende tijd extra vaart na een perfecte sprong
    sprong: null,         // lopende sprong: { deel, perfect, kant, gemeld, gemikt, kort }
    springVorige: false,
    weigert: 0,           // resterende tijd van een weigering
    weigerNieuw: false,   // net begonnen met weigeren (de duur wordt dan gezet)
    naBots: false,        // landde na een bots tegen een hindernis: weigeren
    diepte: 0,            // hoe diep ze in het water staat
    zwemt: false,
    spetterTijd: 0,
    spoor: 0,             // afgelegde galopmeters sinds de laatste bloem
    spoorTeller: 0,
    stopt: false,         // de ruiter wil afstappen: eerst stilstaan
    vastTijd: 0,          // hoe lang ze al geen vooruitgang maakt (bij het komen)
    vorigeAfstand: 0,
    graasTijd: 0,         // af en toe grazen als ze stilstaat
    graast: false,
    tikken: 0,
  };
}
