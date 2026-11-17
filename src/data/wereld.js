// Afsteltabel voor de kampplek (stap 4): strand, zee, lagune en een open plek in de jungle.
// De zee ligt aan de -z-kant (daar staat ook de zon), de jungle en later de berg aan de +z-kant.
// Afstanden en hoogtes in meter. Waterpeil = 0.

export const WERELD = {
  tegelGrootte: 32,      // het eiland is verdeeld in vierkante tegels (TP 5.4)
  rasterStap: 1,         // afstand tussen twee hoogtepunten in een tegel
  verGebied: 320,        // tot zo ver (halve zijde) bestaat het grove landschap rond het kamp
  grofStap: 8,           // rasterafstand van het grove landschap in de verte

  // Zo ver mag je lopen (een rechthoek; het echte eiland komt in stap 12).
  speelGrens: { minX: -118, maxX: 118, minZ: -110, maxZ: 115 },
  waterDiepteMax: 0.6,   // te voet niet dieper het water in (zwemmen komt in stap 5)

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
    bergStart: 90,       // vanaf hier (z) begint de berg te stijgen
    bergHoogte: 40,
    bergSchaal: 220,
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
  },

  // De verre berg aan de horizon: een voorproefje van wat je later beklimt.
  verreBerg: {
    afstand: 760, hoogte: 210, straal: 430,
    etages: 3,
    kleurVoet: 0x7fc9a8, kleurTop: 0xd9b8ef, waas: 0xcdeeff,
    hartbloem: 0xff7fbf,
  },
};
