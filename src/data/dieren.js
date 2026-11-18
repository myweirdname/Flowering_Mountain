// Afsteltabel voor de dieren: de pony en de tijgersoorten (TP 5.7, SC "Personages").
// Kleuren, maten, strepen en bewegingen hier aanpassen, niet in de code.
// Kinderwensen ("roze manen", "een tijger met meer strepen") passen meestal hier.
// Alle maten in meter. Het dier kijkt naar +z, de grond is y = 0.

export const PONY = {
  naam: 'Pony',
  // Haflinger-achtig: warm kastanjebruin met blonde manen, zoals het haar van de avonturier.
  vachtKleur: 0xd98a4e,
  buikKleur: 0xf0b27e,     // iets lichter onder de buik
  snoetKleur: 0xf7d6b8,    // zachte, lichte neus
  blesKleur: 0xfff4e6,     // witte streep over het gezicht
  maanKleur: 0xfff0b8,     // pluizige blonde manen en staart
  maanSchaduw: 0xf2cf7a,
  hoefKleur: 0x5b4236,
  sokKleur: 0xfff4e6,      // witte sokjes
  sokken: [false, false, true, true], // [linksvoor, rechtsvoor, linksachter, rechtsachter]
  oorBinnen: 0xffb8a8,
  oogKleur: 0x7a4a2a,      // warme bruine iris
  oogDonker: 0x2b1a14,
  wangKleur: 0xff9ab0,
  neusgatKleur: 0x8a4a3a,
  mondKleur: 0x8a4a3a,

  // Lichaam: kort, rond en mollig, met een groot hoofd. Dat maakt het een pony en geen paard.
  schofthoogte: 0.95,      // tot de rug
  rompLengte: 0.92,
  rompDikte: 0.29,
  pootDikte: 0.098,
  hoofdGrootte: 0.21,     // straal van de schedel
  snoetLengte: 0.15,       // korte snoet (een paard heeft een lange)
  oogGrootte: 0.075,
  manenLobben: 11,         // aantal pluizen langs de nek
  maanGrootte: 0.085,
  staartLobben: 16,
  staartGrootte: 0.075,
  kuifLobben: 5,           // de pluizige "pony" over het voorhoofd
  pluimen: true,           // pluizige haren boven de hoefjes
};

// Gedeelde vorm van de tijgers: rond, mollig en vriendelijk, met grote zachte poten.
export const TIJGERVORM = {
  schofthoogte: 0.82,
  rompLengte: 1.05,
  rompDikte: 0.27,
  pootDikte: 0.085,
  pootGrootte: 0.105,     // grote ronde voetjes
  hoofdGrootte: 0.245,
  oogGrootte: 0.08,
  staartLengte: 0.95,
  staartDikte: 0.06,
  neusKleur: 0xff8fa8,
  mondKleur: 0x5a2a2a,
  wangKleur: 0xff9ab0,
  oogDonker: 0x231616,
};

// Elke soort is een ander kleurpalet en andere streepwaarden (TP 5.7).
export const TIJGERS = {
  bengaals: {
    naam: 'Bengaalse tijger',
    vachtKleur: 0xff9d3f,
    rugKleur: 0xf5852a,     // iets dieper oranje op de rug
    buikKleur: 0xfff7ec,
    oorBinnen: 0xffe9dc,
    oogKleur: 0xf0b62a,     // warm goudgeel
    streepKleur: 0x2a1c1a,
    strepen: { dichtheid: 6.2, dikte: 0.34, rafel: 0.9, sterkte: 1.0, zaad: 3.1 },
  },
  wit: {
    naam: 'Witte tijger',
    vachtKleur: 0xf6f1ea,
    rugKleur: 0xeee6dc,
    buikKleur: 0xffffff,
    oorBinnen: 0xffe3e3,
    oogKleur: 0x5aa8f0,     // helderblauw
    streepKleur: 0x4a3c3e,  // bruingrijze strepen
    strepen: { dichtheid: 6.6, dikte: 0.28, rafel: 1.0, sterkte: 0.95, zaad: 7.7 },
  },
  goud: {
    naam: 'Gouden tijger',
    vachtKleur: 0xffcf7e,
    rugKleur: 0xffbf62,
    buikKleur: 0xfff6e2,
    oorBinnen: 0xfff0dc,
    oogKleur: 0x8cc84a,     // groen
    streepKleur: 0xc6763e,  // zachte roodbruine strepen
    strepen: { dichtheid: 5.6, dikte: 0.3, rafel: 1.1, sterkte: 0.85, zaad: 12.4 },
  },
};

// Gangen: hoe de poten bewegen. fase = wanneer elke poot begint te stappen in de cyclus
// [linksvoor, rechtsvoor, linksachter, rechtsachter]; draagtijd = deel van de cyclus dat een poot op de grond staat.
export const GANGEN = {
  stil: { frequentie: 0, pas: 0, optil: 0, deining: 0, fase: [0, 0.5, 0.75, 0.25], draagtijd: 1 },
  // Stap: vier tellen, één poot tegelijk in de lucht.
  stap: { frequentie: 1.05, pas: 0.36, optil: 0.09, deining: 0.012, fase: [0.25, 0.75, 0, 0.5], draagtijd: 0.68 },
  // Draf: diagonale paren tegelijk, met een klein zweefmomentje.
  draf: { frequentie: 1.9, pas: 0.48, optil: 0.14, deining: 0.035, fase: [0, 0.5, 0.5, 0], draagtijd: 0.42 },
};

// Levendigheid: knipperen, oren, staart en rondkijken.
export const LEVEN = {
  knipperTussen: [1.8, 4.5],  // seconden tussen twee keer knipperen
  knipperDuur: 0.16,
  oorTussen: [1.2, 3.5],      // af en toe een oor draaien of schudden
  kijkTussen: [1.5, 4],       // af en toe ergens anders heen kijken (soms naar jou)
  kijkNaarJou: 0.45,          // kans dat het dier naar de camera kijkt
  overgang: 3,                // hoe snel een dier van gang wisselt
};
