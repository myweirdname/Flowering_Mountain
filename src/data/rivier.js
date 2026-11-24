// Afsteltabel voor de benedenrivier, het vlot en de Sumatraanse tijger (BOUWPLAN 10, GD 9 en 14).
// Een korte, rustige rivier (klasse I en II) die uit een bronnetje in de jungle komt en in de lagune uitkomt.
// "s" is de afstand langs de rivier in meter, gemeten vanaf de bron (stroomafwaarts positief).
// "d" is de afstand dwars op de stroom: positief = de rechteroever als je stroomafwaarts kijkt.
// Afstanden in meter, snelheden in m/s, tijden in seconden.

export const RIVIER = {
  // De loop van de rivier: punten van de bron tot in de lagune. [opzij, verder]: "opzij" van het midden
  // van de lagune weg van het kamp (negatief = naar het kamp toe), "verder" van de landkant van de lagune
  // het binnenland in. Het laatste punt ligt al in de lagune.
  punten: [[-10, 50], [-6, 41], [2, 33], [9, 24], [10, 14], [4, 5], [1, -7]],

  // Hoogte van het water bij de bron: zoveel onder het land, maar niet hoger of lager dan deze grenzen.
  bronOnderLand: 0.8,
  bronPeil: [2.2, 5.0],

  // Halve breedte van het water. [s, halve breedte]; "mond" telt vanaf waar de rivier in de lagune komt.
  breedte: [[-3.4, 0.5], [-2.2, 1.8], [0, 2.7], [8, 3.0], [19, 3.0], [23, 2.35], [29, 2.8], [37, 3.0], [41, 2.75], [44, 3.3], [52, 3.1]],
  mondBreedte: [[-8, 3.3], [0, 4.6], [8, 7]],
  diepte: 1.15,          // in het midden (aan de oever 0)

  // Hoe snel het water stroomt (in het midden; aan de oevers trager).
  snelheid: [[-3, 0.3], [0, 1.6], [6, 2.1], [19, 2.3], [23, 3.1], [30, 2.7], [38, 2.5], [41.5, 3.0], [44.5, 1.7], [50, 2.2]],
  mondSnelheid: [[-8, 2.0], [0, 1.4], [8, 0.6]],
  oeverTraag: 0.4,       // aan de oever stroomt het zoveel trager (0 = even snel, 1 = stil)

  // De stroomtong: een gladde V tussen twee rotsen, diep en snel. De goede lijn.
  tong: { van: 22.5, tot: 30, breedte: 1.5, extra: 0.75 },
  // De kleine sprong: het water valt over een rotsdrempel.
  sprong: { s: 41.6, hoogte: 0.9, lengte: 1.1 },

  // Rotsen in het water: s, d, straal, hoogte boven het water.
  rotsen: [
    { s: -4.4, d: 0, r: 1.5, h: 1.1 },      // de bron: een rots waar het water onderuit komt
    { s: -3.2, d: 1.9, r: 0.9, h: 0.6 },
    { s: -3.0, d: -2.0, r: 0.8, h: 0.5 },
    { s: 11.5, d: 1.0, r: 0.6, h: 0.35 },
    { s: 16, d: -1.3, r: 0.7, h: 0.45 },
    { s: 22.6, d: 1.95, r: 0.75, h: 0.55 },  // de poort van de stroomtong
    { s: 22.4, d: -1.95, r: 0.75, h: 0.5 },
    { s: 34, d: -1.6, r: 0.55, h: 0.3 },
    { s: 41.2, d: 2.4, r: 0.85, h: 0.7 },    // de rotsdrempel van de sprong, links en rechts van de goede lijn
    { s: 41.3, d: -2.5, r: 0.8, h: 0.65 },
    { s: 48, d: 1.2, r: 0.6, h: 0.35 },
    { s: 53, d: -1.0, r: 0.65, h: 0.4 },
  ],

  // De oevers: aan de kant van het kamp een brede oever met een zandpaadje, aan de overkant een smalle.
  oever: { pad: 4.2, ander: 1.6, hoogte: 0.35, wand: 0.7 },
  pad: { van: 1.3, tot: 3.5 },            // het zandpaadje, gemeten vanaf de waterlijn
  bronPlek: { tot: 6, breedte: 6 },       // bij de bron een ruime open plek aan de padkant

  // De steiger bij de bron, aan de padkant: hier ligt het vlot klaar.
  steiger: { s: 2.2, lengte: 3.2, breedte: 2.0, overWater: 0.7, hoogte: 0.5 },
  vlag: { hoogte: 5.5, kleur: 0xff5fa2, kleur2: 0xffd84d }, // van ver zichtbaar boven de jungle
  // De steiger in de lagune, naast de monding.
  lagunesteiger: { hoek: 0.85, lengte: 7, breedte: 1.6, hoogte: 0.45 },

  // Bloesems boven de goede lijn: [s, d], zweefhoogte boven het water.
  bloesems: [[13.5, -0.3], [25, 0], [27.5, 0], [32, 0.4], [46, 0.2], [50, -0.6]],
  bloesemHoogte: 0.95,

  // Kleuren: kawaii, fris turkoois met wit schuim.
  kleuren: {
    ondiep: 0x7ff0e0,
    midden: 0x2fc4cf,
    diep: 0x1a8fb8,
    tong: 0x167aa8,
    schuim: 0xffffff,
    rots: 0xb7a5dc,
    hout: 0xd9a36a,
    houtDonker: 0xa8703f,
  },
};

// Het vlot (GD 9): drijft mee met de stroming, jij stuurt links en rechts en kan kort versnellen of afremmen.
export const VLOT = {
  // Bouwen: drie bundels bamboe en een liaan, rond de bron. [s, afstand vanaf de waterlijn aan de padkant].
  stukken: [
    { soort: 'bamboe', s: -5.5, e: 4.5 },
    { soort: 'bamboe', s: 7.5, e: 5.2 },
    { soort: 'bamboe', s: 13, e: 2.6 },
    { soort: 'liaan', s: 1, e: 6.2 },
  ],
  pakStraal: 1.3,
  bouwAfstand: 3.4,      // zo dicht bij de steiger kan je bouwen of instappen
  bouwTijd: 1.8,

  lengte: 3.0, breedte: 2.1,
  straal: 1.05,          // als schijfje, om te botsen
  stuur: 4.2,            // zijwaarts versnellen met de joystick
  zijDemping: 2.2,
  maxZij: 2.2,
  versnel: 1.3,          // vooruit peddelen: zoveel sneller dan de stroming
  rem: 1.2,              // achteruit: zoveel trager
  volgStroom: 1.6,       // hoe snel het vlot weer met de stroom meegaat
  // Botsen kost alleen vaart (BOUWPLAN 10).
  oeverRem: 0.35,
  rotsRem: 0.45,
  stuit: 0.3,
  kussen: 4,             // vlak voor een rots duwt het water je zoveel opzij
  losNa: 1.5,            // zo lang vast tegen een rots, en het water duwt je er vanzelf omheen
  botsDraai: 2.2,        // een botsing draait het vlot een beetje
  draaiDemping: 1.8,

  // De sprong: even in slow motion.
  sprongOp: 1.2,
  zwaartekracht: 16,
  slowmo: 0.5,

  // In de lagune: vrij peddelen in stil water.
  mondVrij: 3,           // zo ver na de monding wordt het vrij peddelen
  lagunePeddel: 2.2,
  laguneMax: 2.0,
  laguneDraai: 1.8,
  laguneDemping: 0.6,
  minDiepte: 0.35,
  aanlegAfstand: 3.2,
  terugNa: 22,           // zo ver weg gelopen, en het vlot ligt weer klaar aan de bron

  // Waar wie zit (in vlotmaat, vooruit = +z). De avonturier achteraan (daar stuur je, en de camera ziet haar),
  // de pony vooraan als passagier.
  zitPlek: [0, 0.2, -0.85],
  ponyPlek: [0, 0.2, 0.42],
};

// De Sumatraanse tijger (SC "Personages": de zwemmer). Hij wacht bij de bron en zwemt mee naast het vlot.
export const ZWEMTIJGER = {
  soort: 'sumatraans',
  schaal: 1.1,
  wachtPlek: { s: -1.2, d: 1 },  // d in de richting weg van de padkant
  naast: 1.9,            // zo ver opzij van het vlot
  voor: 1.0,             // en zoveel ervoor
  snelheid: 3.6,         // hoe snel hij kan zwemmen
  draai: 3,
  diepte: 0.78,          // zo diep ligt zijn rug onder het water (deel van de rughoogte)
  verschijnVanaf: 30,    // ben je zo dicht bij de bron en is hij er niet, dan duikt hij daar op
};
