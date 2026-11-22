// De toestand van de tijger als reisgezel: gewone gegevens, net als de speler en de pony (TP 4).
// Elke speler krijgt later zijn eigen gezel (multiplayer); nu is er één.

/** @typedef {ReturnType<typeof maakGezel>} Gezel */
export function maakGezel(id, eigenaar, x, y, z, richting) {
  return {
    id,
    eigenaar,           // id van de speler met wie hij optrekt
    soort: 'bengaals',
    // 'rust' (wacht bij het kamp tot je hem ontmoet) | 'ontmoet' (komt naar je toe) | 'kopje' | 'gids' (loopt voor
    // naar de slaapbloem) | 'bijBloem' | 'volg' | 'begroet' (de pony) | 'brult'
    modus: 'rust',
    vriend: false,      // al ontmoet (en dus kan hij brullen)
    pos: [x, y, z],
    vorigePos: [x, y, z],
    richting,
    vorigeRichting: richting,
    snelheid: 0,
    gang: 'stil',       // 'stil' | 'stap' | 'draf' | 'galop', voor beeld en geluid
    rustPlek: [x, z, richting],
    /** @type {[number, number][]} */
    weg: [],            // de tussenpunten van de weg die hij volgt
    /** @type {[number, number] | null} */
    wegDoel: null,
    wegTijd: 99,        // sinds wanneer deze weg (opnieuw zoeken na een tijdje)
    vastTijd: 0,
    vorigeRest: 0,
    vastKeren: 0,
    timer: 0,           // duur van kopje, begroeting, brul
    wacht: false,       // tijdens het gidsen: blijft staan tot je er weer bij bent
    wachtTijd: 0,
    roepTijd: 0,
    volgt: false,       // tijdens het volgen: is hij aan het bijlopen?
    naModus: 'gids',    // waar hij heen gaat na een begroeting of brul
    begroetSinds: 999,
    begroetFase: 'heen', // 'heen' (naar de pony toe) | 'neus'
    brulGemeld: false,
    /** @type {[number, number, number] | null} */
    kijk: null,         // waar hij naar kijkt (voor het beeld), of null = zelf rondkijken
  };
}
