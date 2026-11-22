// De toestand van een welpje bij mama tijger (BOUWPLAN 8b): gewone gegevens, net als de speler, de pony en de
// tijger (TP 4). Elk welpje hoort bij een mama (een tijger-id); later kan elke speler zijn eigen gezinnetje hebben.

/** @typedef {ReturnType<typeof maakWelp>} Welp */
export function maakWelp(id, mama, model, soort, x, y, z, richting, zaad) {
  return {
    id,
    mama,               // id van de tijger bij wie hij hoort
    model,              // 'welp' | 'knuffelwelp' | 'knuffel'
    soort,              // 'bengaals' | 'wit' | 'goud'
    // 'snuffel' (staat even stil) | 'dartel' (huppelt naar een plekje) | 'jaagt' / 'vlucht' (achternazitten)
    // | 'sprong' (bespringt een ander) | 'rol' (rolt om) | 'terug' (te ver weg: naar mama) | 'mee' (mama loopt)
    // | 'aai' (op zijn rug voor een buikkriebel)
    // Schatjesmomenten (stap 8c): 'nies' (snuffelt aan een bloem, hatsjie!) | 'hik' | 'struikel' (kopje-onder)
    // | 'huh' (kopje schuin) | 'meebrul' (na mama's brul: schrap zetten, bek open ... "mieuw!")
    modus: 'snuffel',
    pos: [x, y, z],
    vorigePos: [x, y, z],
    richting,
    vorigeRichting: richting,
    snelheid: 0,
    gang: 'stil',
    timer: 0.5 + (zaad % 7) * 0.2,
    duur: 1,            // hoe lang de huidige rol, sprong of aai in totaal duurt
    /** @type {[number, number] | null} */
    doel: null,         // waar hij heen huppelt
    /** @type {string | null} */
    maat: null,         // met wie hij speelt (achternazitten)
    rolKant: 1,         // naar welke kant hij omrolt
    springVan: [x, z],
    springNaar: [x, z],
    hoogte: 0,          // boven de grond (tijdens een sprong)
    /** @type {[number, number][]} */
    weg: [],
    wegTijd: 99,
    vastTijd: 0,
    mamaStil: 0,        // hoe lang mama al stilstaat
    /** @type {[number, number, number] | null} */
    kijk: null,
    fase: 0,            // hoe ver hij is in het huidige schatjesmoment (welk geluid al gemeld is)
    /** @type {[number, number, number] | null} */
    bloem: null,        // de bloem waar hij heen huppelt om aan te snuffelen
    hikVolgende: 0,     // over hoeveel seconden de volgende "hik"
    hikSinds: 9,        // hoe lang geleden de laatste "hik"
    huhTijd: 0,         // > 0: kopje schuin ("huh?"), ook terwijl hij achter mama aan loopt
    huhKant: 1,
    huhRust: 0,
    struikelRust: 4,
    wacht: 0,           // meebrullen: zo lang wacht hij nog voor hij begint
    mamaBrulde: false,
    // Spelen met elkaar (stap 8d): 'staart' (achter zijn staart aan, duizelig) | 'tel' / 'zoek' (de zoeker bij
    // verstoppertje) | 'verstop' (zit in een struik) | 'gevonden' (springt op uit de struik) | 'tak' (trekken aan
    // een tak) | 'achterover' (de tak breekt of schiet los: achterover!)
    /** @type {string | null} */
    spel: null,         // welk spelletje (alle spelers van hetzelfde spelletje hebben dezelfde naam)
    faseTijd: 0,        // hoe lang hij al in deze fase van het spelletje zit
    telN: 0,            // verstoppertje: tot waar de zoeker al geteld heeft
    telVolgende: 0,
    gevonden: 0,        // hoeveel hij er al gevonden heeft
    /** @type {[number, number] | null} */
    omweg: null,        // de zoeker gaat eerst hier snuffelen
    /** @type {[number, number, number] | null} */
    struik: null,       // [x, z, hoogte] van de struik waarin hij zit
    takKant: 0,         // welk eind van de tak hij vasthoudt (0 of 1)
    /** @type {string | null} */
    vraag: null,        // een moment dat de console vraagt (om te testen)
    zaad: zaad >>> 0,   // eigen reeks willekeurige keuzes (hetzelfde op elk toestel)
  };
}

/**
 * Het takje bij mama (stap 8d): gewone gegevens, één per gezinnetje.
 * staat: 'weg' | 'valt' (valt uit de lucht) | 'ligt' | 'vast' (twee welpjes trekken eraan) | 'stuk' (gebroken; de
 * stukken hangen nog in hun bekjes of liggen in het gras) | 'los' (geschoten: één welpje houdt hem nog in zijn bek).
 * @typedef {ReturnType<typeof maakTak>} Tak
 */
export function maakTak() {
  return {
    staat: 'weg',
    pos: [0, 0, 0],     // het midden
    richting: 0,        // de tak ligt langs (sin, cos) van deze hoek
    tijd: 0,            // hoe lang hij al in deze staat is
    /** @type {string[]} */
    vast: [],           // wie hem vasthoudt: [eind 0, eind 1] als ze trekken
    x: 0,               // hoe ver de tak tijdens het trekken naar eind 1 is geschoven
    trekDuur: 3,
    gromVolgende: 0.4,
    gromWie: 0,
    /** @type {([number, number, number, number] | null)[]} */
    helften: [null, null], // de twee stukken in het gras: [x, y, z, richting]
  };
}
