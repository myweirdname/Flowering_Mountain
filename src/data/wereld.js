// Afsteltabel voor de kampplek (stap 4): strand, zee, lagune en een open plek in de jungle.
// De zee ligt aan de -z-kant (daar staat ook de zon), de jungle en de berg aan de +z-kant.
// De rest van het eiland (kust rondom, rotsrand, etage, bergtop) staat in data/eiland.js.
// Afstanden en hoogtes in meter. Waterpeil = 0.

export const WERELD = {
  tegelGrootte: 32,      // het eiland is verdeeld in vierkante tegels (TP 5.4)
  rasterStap: 1,         // afstand tussen twee hoogtepunten in een tegel

  kust: {
    z: -26,              // waar de kustlijn in het midden van de baai ligt
    bocht: 20,           // hoeveel verder de zee aan de zijkanten van de baai komt
    bochtBreedte: 80,    // hoe breed de baai is
    ruis: 6,             // grilligheid van de kustlijn
    ruisSchaal: 38,
  },
  strand: {
    breedte: 15,         // van de waterlijn tot waar de jungle begint
    hoogte: 1.1,         // hoe hoog het strand oploopt
    helling: 0.05,       // hoe snel de zeebodem zakt
    zeeDiepte: 6,        // extra diepte ver in zee
  },
  jungle: {
    stijging: 0.05,      // het land loopt zacht op naar de berg
    heuvels: 4.5,        // hoogte van de junglebulten
    heuvelSchaal: 30,
    heuvelStart: 30,     // zo ver van de waterlijn beginnen de bulten (het kamp blijft laag bij het strand)
    heuvelOvergang: 35,
  },
  fijneRuis: { hoogte: 0.35, schaal: 6 },

  kamp: { x: 0, z: 0, straal: 9, rand: 8 },    // de open plek in de jungle
  pad: { breedte: 2.2, slinger: 3.5 },        // zandpaadje van het kamp naar het strand
  lagune: {
    afstand: [30, 42],   // zo ver van het kamp (links of rechts, het zaadje kiest)
    straal: [11, 15],
    diepte: 1.8,
    geulBreedte: 2.2,    // ondiepe geul naar de zee
    geulDiepte: 0.35,
  },

  // Kleuren van de grond: kawaii, dus fris en snoepachtig, nooit grauw.
  kleuren: {
    zand: 0xffe6ad,
    natZand: 0xf4c995,
    onderwater: 0xf9dca6,
    kampGras: 0x92e66c,
    pad: 0xf6d9a0,
    bos: 0x4cbc5c,
    mos: 0x6fd35e,
    rots: 0xc6b4e6,
    // Rotswanden (de rotsrand, de ravijnen): lagen in lichter en donkerder lila, zoals gelaagd gesteente.
    rotsLicht: 0xe2d4f6,
    rotsDonker: 0xa18cc9,
    rotsLagen: 0.6,      // hoe dicht de lagen op elkaar liggen (per meter hoogte)
  },

  // De verre berg aan de horizon uit stap 4 (alleen decor, niet meer in gebruik sinds het echte eiland er is, stap 12).
  // Bewaard voor als we hem nog eens nodig hebben (beeld/maak/berg.js).
  verreBerg: {
    afstand: 760, hoogte: 210, straal: 430,
    etages: 3,
    kleurVoet: 0x7fc9a8, kleurTop: 0xd9b8ef, waas: 0xcdeeff,
    hartbloem: 0xff7fbf,
  },
};
