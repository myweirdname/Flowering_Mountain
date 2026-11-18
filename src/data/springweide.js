// Afsteltabel voor de springweide bij het kamp (GD 6, 14): een vlakke weide met een zandbaan in de vorm
// van een stadion (twee rechte stukken en twee bochten), vijf hindernissen, een start- en finishboog,
// een vijvertje met een beek die de baan kruist, en wortels langs de baan.
// Afstanden in meter. "s" is de afstand langs het midden van de baan, gemeten vanaf het begin van de
// zuidelijke rechte lijn (de kant van de zee), in de richting weg van het kamp.

export const WEIDE = {
  afstand: 66,          // zo ver ligt het midden van de weide van het kamp (aan de andere kant dan de lagune)
  z: 9,                 // en zo ver naar de jungle toe
  vlak: 21.5,           // tot zo ver van de middenlijn is de weide helemaal vlak
  rand: 9,              // daarna loopt ze zacht over in de jungle
  hoogteBoven: [0.3, 1.6], // de weide ligt zoveel hoger dan het kamp (begrensd, zodat het een weide blijft)

  baan: {
    recht: 22,          // halve lengte van een recht stuk
    straal: 12,         // straal van de bochten (en halve afstand tussen de rechte stukken)
    breedte: 4.6,       // breedte van de zandbaan
  },

  // De start- en finishboog, en de vijf hindernissen. Een ronde = door de boog, alle vijf springen
  // (in eender welke volgorde), en weer door de boog.
  start: 5,
  hindernissen: [
    { soort: 'boomstam', s: 16 },
    { soort: 'haag', s: 32 },
    { soort: 'beek', s: 95.7 },          // hier kruist de beek de baan
    { soort: 'dubbel', s: 110.7, tussen: 6 }, // twee hekjes kort na elkaar
    { soort: 'rots', s: 144.6 },         // in de bocht bij het kamp
  ],
  maten: {
    boomstam: { hoogte: 0.56, diepte: 0.56 },
    haag: { hoogte: 0.72, diepte: 0.72 },
    rots: { hoogte: 0.62, diepte: 1.0 },
    dubbel: { hoogte: 0.5, diepte: 0.3 },
    beek: { hoogte: 0.3, diepte: 2.4 },   // hoogte = hoe hoog de pony er minstens over springt
  },
  uitsteek: 0.4,        // zoveel steekt een hindernis aan elke kant buiten de baan uit

  // Water: een vijvertje binnen de baan, een beek naar buiten, en een poel net buiten de baan.
  // Plekken in (u, v): u langs de lange zijde (weg van het kamp), v dwars (+ = naar de jungle).
  vijver: { u: 8, v: 4.5, straal: 3.2, diepte: 0.7 },
  poel: { u: 8, v: 18, straal: 2.2, diepte: 0.6 },
  beek: { breedte: 2.4, diepte: 0.55, oever: 0.7 },
  waterOnder: 0.2,      // het wateroppervlak ligt zoveel onder het gras

  // Wortels: op de baan, iets naar binnen. Ze komen terug na een tijdje.
  wortels: [10, 24, 40, 55, 63, 72, 88, 102, 120, 135, 154],
  wortelNaarBinnen: -1.2,

  // Een zandpaadje van het kamp naar de weide.
  pad: { breedte: 1.8 },

  kleuren: {
    weideGras: 0x9ae86e,
    baan: 0xf3d49a,
    bast: 0xb9784f,
    bastDonker: 0x8f5a3c,
    hout: 0xf6d6a6,
    houtRing: 0xe2b27c,
    mos: 0x7fd86a,
    haag: 0x4fc56a,
    haagLicht: 0x7ee08a,
    haagBloemen: [0xff6fae, 0xffd84d, 0xffffff, 0xff9f5a],
    rots: 0xc6b4e6,
    rotsLicht: 0xe0d4f6,
    hek: 0xffffff,
    hekStreep: 0xff7fb0,
    paal: 0xffffff,
    paalStreep: 0xff5f99,
    vlaggen: [0xff5f99, 0xffd84d, 0x6fd3ff, 0xa98bff, 0x7fe07a],
    boog: 0xfff4fa,
    boogBloemen: [0xff6fae, 0xffd84d, 0xffffff, 0xb98bff, 0xff9f5a],
    hoefijzer: 0xffd84d,
    paddenstoel: 0xff5f6f,
    water: 0x67d4f0,
    waterDiep: 0x2fa9d8,
    waterLicht: 0xd9f7ff,
    lelieblad: 0x5ccf6a,
    lotus: 0xff9fd0,
    wortel: 0xff8a2a,
    wortelLicht: 0xffb45e,
    wortelLoof: 0x58cc4e,
  },
};
