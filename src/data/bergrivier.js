// Afsteltabel voor de rivier over de berg (BOUWPLAN 14, GD 9): van een bron op de bergtop, over de etage,
// met een grote waterval over de rotsrand, door het laagland tot in de bron van de benedenrivier (stap 10),
// en zo verder tot in de lagune. Hoe hoger, hoe wilder: klasse IV op de bergtop, III op de etage, II in het
// laagland, I bij het kamp (de benedenrivier).
// "s" is de afstand langs de rivier in meter (0 = de bron op de bergtop), "d" de afstand dwars op de stroom
// (positief = de rechteroever als je stroomafwaarts kijkt). Afstanden in meter, snelheden in m/s.
// De hoogtes komen uit het eiland (niets vast in de code): de rivier volgt het landschap en graaft haar bedding.

export const BERGRIVIER = {
  // --- De loop. Hoeken rond de top, gemeten vanaf de richting van de bron van de benedenrivier, naar de kant
  // van de lagune toe (radialen). Zo blijft de rivier aan de kant van de lagune, weg van de hellingbaan. ---
  route: {
    valHoek: 0.02,       // waar de grote waterval over de rotsrand stort
    voetHoek: 0.13,      // waar de rivier van de bergtop op de etage komt
    bronHoek: 0.18,      // de bron op de bergtop
    bronHoger: 48,       // zo ver boven de voet van de kegel (langs de helling gemeten, in meter van de top af) ligt de bron
    kegelSlinger: [2.5, -3, 2],   // de rivier slingert zacht op de bergtop (meter opzij, op 1/4, 2/4, 3/4)
    etageSlinger: [-6, 7],        // en sterker op de etage
    poel: 9,             // de poel onder de waterval: zoveel voorbij de voet van de rotsrand
    laagSlinger: [4],    // en een bocht in het laagland
  },

  // De rivier graaft zich zoveel onder het landschap in (cut, zodat de oevers nooit opgehoogd moeten worden).
  inzet: { kegel: 0.9, etage: 0.85, laag: 0.8 },
  // Op de bergtop daalt het water trager dan de helling (een sleuf die dieper wordt) en haalt het de achterstand
  // in met een watervalletje zodra het zoveel hoger ligt dan het zou moeten.
  kegelTrap: { volgen: 0.42, valVanaf: 3.0, valLengte: 2.4 },
  // In het laagland komt er een kleine waterval als het water bij de benedenrivier nog te hoog ligt.
  bronval: { voor: 5, minHoogte: 0.35, lengte: 1.6 },

  // --- Per stuk rivier (zone): klasse, halve breedte, snelheid in het midden, diepte ---
  zones: {
    kegel: { klasse: 4, breedte: 2.5, snelheid: 5.3, diepte: 1.2 },
    etage: { klasse: 3, breedte: 3.3, snelheid: 3.7, diepte: 1.3 },
    laag: { klasse: 2, breedte: 2.9, snelheid: 2.7, diepte: 1.2 },
  },
  bronKom: { lengte: 7, breedte: 3.6, snelheid: 0.8 },  // de kom bij de bron, op de bergtop (met de bovenste steiger)
  voetKom: { lengte: 12, breedte: 5.2, snelheid: 1.0 }, // de kom aan de voet van de bergtop (de steiger op de etage)
  poelKom: { lengte: 16, breedte: 6.5, snelheid: 1.1, diepte: 2.6 }, // de poel onder de grote waterval
  eind: { breedte: 2.0, snelheid: 2.0 },  // waar ze in de benedenrivier uitkomt (zoals daar)
  oeverTraag: 0.45,

  // De grote waterval over de rotsrand: het water vliegt eruit zoals het vlot (een boog).
  waterval: { lipSnelheid: 4.6, minVaart: 4.2, zwaartekracht: 16, voorRand: 1.5 },

  // --- Wildwater (GD 9). Plaatsen als deel van een zone (0 = begin, 1 = einde). ---
  // Rotsen: f, d (deel van de halve breedte), straal, hoogte boven het water.
  rotsen: {
    kegel: [[0.16, 0.45, 0.7, 0.6], [0.3, -0.5, 0.75, 0.55], [0.46, 0.35, 0.65, 0.5], [0.6, -0.4, 0.8, 0.6], [0.78, 0.5, 0.7, 0.5], [0.9, -0.3, 0.6, 0.4]],
    etage: [[0.1, -0.55, 0.75, 0.55], [0.79, 0.5, 0.7, 0.5], [0.84, -0.6, 0.6, 0.45]],
    laag: [[0.3, 0.45, 0.6, 0.4], [0.55, -0.5, 0.7, 0.5], [0.75, 0.3, 0.55, 0.35]],
  },
  // Golftreinen: staande golven waar het vlot op danst. van/tot als deel van de zone, hoogte en golflengte.
  treinen: {
    kegel: [{ na: 'val', lengte: 6, hoogte: 0.32, golf: 2.2 }], // na elk watervalletje
    etage: [{ van: 0.16, tot: 0.29, hoogte: 0.26, golf: 2.4 }],
    laag: [{ van: 0.1, tot: 0.22, hoogte: 0.16, golf: 2.6 }],
  },
  // De stroomtong (gladde V): diep en snel, de goede lijn. Voor de grote waterval: recht en met vaart erover.
  tongen: {
    etage: [{ van: 0.86, tot: 1.0, breedte: 1.6, extra: 0.4 }],
    laag: [{ van: 0.4, tot: 0.52, breedte: 1.3, extra: 0.5 }],
  },
  // Keerwater: rustig water achter een rots (de rots met dit nummer), om even stil te liggen.
  keerwater: { lengte: 3.2, breed: 1.1, sterkte: 1.15 },
  // De kolk: draait je rond (op de etage). f, d, straal, draaisnelheid (rad/s).
  kolk: { f: 0.4, d: -0.15, r: 2.6, draai: 1.6, wegDuw: 0.7 },
  // De splitsing: een eilandje met links een rustige en rechts een wilde arm (op de etage).
  splitsing: { van: 0.54, tot: 0.7, breedte: 5.6, eiland: 1.5, rustig: 0.55, wild: 1.45, wildeKant: 1 },

  // --- Steigers: op de oever aan de kant van het kamp. Hier ligt het vlot klaar. ---
  steiger: { lengte: 3.2, breedte: 2.0, overWater: 0.7, hoogte: 0.5, terras: 7, terrasLengte: 11 },
  // --- Het bruggetje in het laagland (stap 14b): een houten boogbrug, ook voor de pony ---
  brug: {
    liefst: 0.5,         // waar langs het laagland het liefst (0 = de poel, 1 = de benedenrivier); anders zo dicht mogelijk
    vanSteiger: 10,      // zo ver van de steiger onder de waterval
    vanEinde: 11,        // en van het einde (de kleine waterval naar de benedenrivier)
    recht: 2.5,          // aan beide uiteinden ligt het dichtste stuk rivier hoogstens zoveel meter verder of terug
    breedte: 3.0,
    opLand: 2.4,         // zo ver loopt de brug voorbij de oever het land op
    vrij: 2.6,           // in het midden zoveel boven het water (het vlot met de pony vaart eronder door)
    minBoog: 0.6,
    maxHelling: 0.62,    // nooit steiler dan dit (de pony kan tot ±40°)
    maxEindHelling: 0.6, // het land aan elk uiteinde (per meter): anders loopt de brug wat verder het land op
    maxVerschil: 2.0,    // de twee oevers mogen zoveel in hoogte verschillen
    leuning: 0.25,       // de leuning staat zoveel binnen de rand
    leuningVanEind: 0.5, // de laatste halve meter aan elk eind heeft geen leuning (daar stap je op en af)
    kleur: 0xd9a36a, kleurDonker: 0xa8703f, leuningKleur: 0xfff4e6, knop: 0xff7fb0,
  },

  // Een vlag per steiger in de kleur van de klasse (van ver te zien), I tot IV.
  vlag: { hoogte: 4.5, kleuren: [0x7fd96a, 0x41b8ff, 0xffa53d, 0xff4f8b], knop: 0xffd84d },

  // De oevers: een smal strookje om op te staan, dan de wand van de sleuf (cut) of een talud (fill).
  oever: { breed: 1.6, hoogte: 0.35, wand: 1.6, vul: 0.9, marge: 15 },

  // Bloesems boven de goede lijn: zone, f, d (deel van de halve breedte).
  bloesems: [['kegel', 0.4, 0], ['etage', 0.3, 0], ['etage', 0.58, 0.45], ['laag', 0.47, 0]],
  bloesemHoogte: 0.95,

  // Kleuren: hoe wilder, hoe meer schuim.
  kleuren: {
    ondiep: 0x8ff3e4,
    midden: 0x33c2d6,
    diep: 0x1b86b5,
    tong: 0x167aa8,
    schuim: 0xffffff,
    rots: 0xb7a5dc,
    hout: 0xd9a36a,
    houtDonker: 0xa8703f,
  },
  schuimPerKlasse: [0, 0.05, 0.16, 0.3, 0.46],  // extra wit water in klasse I .. IV
};
