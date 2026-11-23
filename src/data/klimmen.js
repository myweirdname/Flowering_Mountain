// Afsteltabel voor het klimmen (KLIMMEN.md, hoofdstuk 14): de oefenrots bij het kamp, het lichaam van de klimster,
// de grepen, de kracht per arm en de drie handgemaakte routes (stap 9). Afstanden in meter, tijden in seconden.
//
// De maten van het lichaam zijn aangepast aan de avonturier (een chibi van 1,3 m met een groot hoofd en een kort lijfje):
// kortere armen en benen dan de 1,5 m uit KLIMMEN.md, dus ook kleinere afstanden tussen de grepen.

export const KLIMMEN = {
  // --- De oefenrots: een rots achter het kamp, met de wand naar het kamp toe ---
  rots: {
    plek: { dx: 0, dz: 21 },   // midden van de wandvoet, ten opzichte van het kamp
    richting: 0,               // 0 = de wand kijkt naar -z (naar het kamp)
    breedte: 11,               // de wandkaart, links-rechts
    hoogte: 8,                 // de wandkaart, van de voet tot de bovenrand
    diepte: 5.5,               // zo ver loopt de rots naar achter (botsen)
    rand: 1.1,                 // zoveel steekt de rots links en rechts voorbij de klimwand uit
    voetBoven: 0.3,            // de open plek voor de wand ligt zoveel hoger dan het kamp
    open: { opzij: 1.6, voor: 7, rand: 5 }, // de open plek rond de wand (geen bomen, vlak gras)
    kleur: 0xd9c4f2,           // lila, zoals de andere rotsen, maar lichter: de grepen springen eruit
    kleurDonker: 0xb39ce0,
    kleurLaag: 0xf3d9ef,       // lichte banden in de rots
    mos: 0x7fd96a,
    gloed: 0.42,               // eigen gloed van de rots (de wand kijkt weg van de zon)
    greepGloed: 0.5,           // en van de grepen: felle snoepkleuren
    // Bovenop de rots (wandcoördinaten: x langs de wand, z naar achter is negatief): [x, z, schaal].
    bosjes: [[0.6, -1.2, 1.3], [3.4, -2.6, 1.6], [6.6, -1.0, 1.2], [9.8, -2.2, 1.5], [10.6, -0.6, 1.0]],
    palmen: [[1.8, -3.4, 0.75], [8.3, -3.9, 0.85]],
  },

  // --- De klimster (2D-maten op de wandkaart; het beeld rekent zelf de diepte erbij) ---
  lichaam: {
    arm: 0.52,          // schouder tot greep, gestrekt
    been: 0.55,         // heup tot voet, gestrekt
    romp: 0.34,         // heup tot schouders
    schouder: 0.15,     // halve schouderbreedte
    heup: 0.08,         // halve heupbreedte
    minArm: 0.08,       // korter kan een arm niet worden (op de kaart; in 3D zit de hand dan voor de schouder)
    minBeen: 0.05,      // een voet mag op heuphoogte naast de heup staan (de knie gaat opzij)
    voetBovenHeup: 0.12, // zo ver mag een voet boven de heup staan (hoge stap)
    minHeup: 0.32,       // de heupen zakken nooit lager dan dit boven de grond
    kruisen: 0.25,       // minder bereik als je met een hand voorbij de andere reikt
    wandAfstand: 0.3,    // de heupen hangen zo ver van de wand (alleen beeld)
    // Het hoofdje aan de wand: een klein "klimspreukje" (glitter) maakt het kleiner, zodat je de armpjes ziet reiken
    // en ze meer op een echte klimster lijkt. 1 = gewoon kawaii-hoofd.
    kopSchaal: 0.75,
  },

  // --- Grepen (KL 4). kegel: tot zo ver (graden) van de goede trekrichting houdt de greep volledig;
  // daarbuiten zakt hij tot `dwars` (bij 90 graden). voet: hoe goed een voet erop staat (0..1).
  // In de klimproef is de richting nog mild; strenger (zijgrepen, ondergrepen, leunen) komt in stap 15a. ---
  grepen: {
    bak: { kwaliteit: 1.0, kegel: 80, dwars: 0.8, voet: 1.0, bijpakken: true },
    richel: { kwaliteit: 0.8, kegel: 60, dwars: 0.65, voet: 1.0, bijpakken: true },
    rand: { kwaliteit: 0.5, kegel: 55, dwars: 0.55, voet: 0.75, bijpakken: false },
    sloper: { kwaliteit: 0.55, kegel: 40, dwars: 0.4, voet: 0.6, bijpakken: false, gestrekt: 0.85 },
    voet: { kwaliteit: 0, kegel: 0, dwars: 0, voet: 0.9, bijpakken: false, alleenVoet: true },
    korrel: { kwaliteit: 0, kegel: 0, dwars: 0, voet: 0.65, bijpakken: false, alleenVoet: true }, // een piepklein voetje
  },
  grond: { voet: 1.0 },  // op de grond staan: een perfecte voetsteun

  // --- Belasting en kracht (KL 5, 6) ---
  kracht: {
    voetSteun: 0.45,      // wat een goede voet draagt (twee goede voeten = 0,9)
    gebogen: 0.8,         // tot zoveel zwaarder met gebogen armen
    gebogenVanaf: 0.82,   // korter dan dit deel van de arm telt als gebogen
    volTijd: 20,          // seconden tot een arm vol is, bij belasting 1 op kwaliteit 1
    glijGrens: 2.5,       // belasting gedeeld door kwaliteit boven dit: de hand glijdt meteen weg
    herstelGreep: 0.03,   // herstel per seconde op een goede greep met weinig belasting
    herstelOnder: 0.25,   // ... zolang belasting/kwaliteit onder dit blijft
    herstelSchudden: 0.12,
    trillenVanaf: 0.7,    // vanaf hier begint de hand te trillen
    naVal: 0.35,          // na een val in het touw is elke arm zoveel hersteld
  },

  // --- Zetten (KL 7) ---
  zet: {
    handMin: 0.4, handMax: 0.9,   // duur van een handzet, naargelang de afstand
    voetMin: 0.3, voetMax: 0.55,
    terugNaGlijden: 0.75,         // een weggegleden hand pakt na zoveel seconden haar greep terug
    voetBeter: 0.2,               // de voeten verzetten zich pas als de nieuwe plek zoveel beter is
    raakStraal: 0.32,             // zo dicht bij een greep telt een tik (op de wand, in meter)
    handRaak: 0.35,               // zo dicht bij een hand begin je te slepen
  },

  // --- Besturing: "tikken" (6 jaar) en "handen" (9 jaar). De kracht volgt de tijgerhulp (KL 12). ---
  besturing: {
    standaard: 'handen',
    tikken: { krachtFactor: 0.5, krachtMax: 0.85 }, // kracht loopt nooit leeg
    handen: { krachtFactor: 1, krachtMax: 1 },
    leunen: { opzij: 0.22, omhoog: 0.3 },           // hoe ver de joystick de heupen verschuift
  },

  // --- Zekeren en vallen (KL 8): toprope met de witte tijger ---
  touw: {
    rek: 0.45,          // zo ver zak je in het touw bij een val
    valDuur: 0.35,
    hangDuur: 1.3,
    terugDuur: 0.9,
    zakSnelheid: 1.1,   // laten zakken
    bovenWacht: 1.6,    // zo lang geniet je boven van het uitzicht voor je zakt
    kleur: 0xff5fa2,
    dikte: 0.022,
  },
  // De witte tijger wacht tussen de routes (opzij, voor), en zekert schuin links van de route die je klimt.
  zekeraar: { soort: 'wit', voor: 3.2, opzij: -1.7, zekerOpzij: -1.5, zekerVoor: 1.9 },

  // --- Camera tijdens het klimmen (KL 11): recht op de wand, ±3 m wand rond de klimster ---
  // kijkHoger: zo ver boven de heupen kijkt ze; camHoger: zo hoog staat ze zelf (iets lager: je ziet de handjes boven
  // het hoofd); minHoogte: nooit lager dan dit boven de wandvoet.
  camera: { afstand: 3.3, opzij: 1.5, kijkHoger: 0.55, camHoger: -0.45, volgen: 4, wissel: 0.9, minHoogte: 1.4 },

  // --- De drie routes (gekleurd, zoals in de klimhal). Elke greep: [u, v, soort] met u = meter vanaf de linkerrand
  // van de wand (zoals je ernaar kijkt) en v = meter boven de voet. `start` = de twee startgrepen (linker- en
  // rechterhand), `top` = de topgreep. Elke handgreep is ook een voetgreep. ---
  routes: [
    {
      naam: 'geel', graad: '3', kleur: 0xffd23f,
      // Grote bakken, dicht op elkaar, en veel voettredes: altijd succes.
      grepen: [
        [1.75, 1.15, 'bak'], [2.32, 1.22, 'bak'],
        [1.7, 1.62, 'bak'], [2.38, 1.98, 'bak'], [1.72, 2.42, 'bak'], [2.4, 2.84, 'bak'],
        [1.8, 3.28, 'bak'], [2.45, 3.7, 'bak'], [1.85, 4.12, 'bak'], [2.42, 4.55, 'bak'],
        [1.8, 4.98, 'bak'], [2.36, 5.4, 'bak'], [1.86, 5.82, 'bak'], [2.4, 6.24, 'bak'],
        [1.92, 6.68, 'bak'], [2.32, 7.1, 'bak'], [2.1, 7.55, 'bak'],
        [1.88, 0.32, 'voet'], [2.22, 0.5, 'voet'], [1.82, 0.78, 'voet'], [2.28, 1.0, 'voet'], [1.9, 1.32, 'voet'],
        [2.2, 1.6, 'voet'], [1.86, 1.95, 'voet'], [2.25, 2.3, 'voet'], [1.95, 2.68, 'voet'], [2.22, 3.05, 'voet'],
        [1.9, 3.48, 'voet'], [2.25, 3.9, 'voet'], [1.95, 4.35, 'voet'], [2.2, 4.75, 'voet'], [1.92, 5.18, 'voet'],
        [2.25, 5.6, 'voet'], [1.95, 6.02, 'voet'], [2.22, 6.45, 'voet'],
      ],
      start: [0, 1],
      top: 16,
    },
    {
      naam: 'turkoois', graad: '5', kleur: 0x22c8c0,
      // Richels en een paar randen, verder uit elkaar: je voeten moeten eerst hoog voor de volgende zet.
      // Halverwege een grote bak om uit te schudden, hoger een sloper.
      grepen: [
        [5.22, 1.15, 'richel'], [5.78, 1.2, 'richel'],
        [5.15, 1.62, 'richel'], [5.9, 2.05, 'rand'], [5.28, 2.5, 'richel'], [5.95, 2.95, 'richel'],
        [5.4, 3.42, 'bak'], [5.85, 3.85, 'richel'], [5.2, 4.3, 'rand'], [5.95, 4.75, 'richel'],
        [5.35, 5.2, 'sloper'], [5.98, 5.55, 'richel'], [5.45, 6.08, 'rand'], [5.95, 6.52, 'richel'],
        [5.5, 6.98, 'richel'], [5.7, 7.45, 'bak'],
        [5.35, 0.35, 'voet'], [5.72, 0.6, 'voet'], [5.3, 0.95, 'voet'], [5.75, 1.35, 'voet'], [5.4, 1.75, 'voet'],
        [5.78, 2.2, 'voet'], [5.45, 2.65, 'voet'], [5.8, 3.1, 'voet'], [5.45, 3.55, 'voet'], [5.75, 4.0, 'voet'],
        [5.5, 4.45, 'voet'], [5.82, 4.9, 'voet'], [5.5, 5.35, 'voet'], [5.8, 5.8, 'voet'], [5.55, 6.25, 'voet'],
        [5.8, 6.65, 'voet'],
      ],
      start: [0, 1],
      top: 15,
    },
    {
      naam: 'koraal', graad: '6a', kleur: 0xff5b4a,
      // Randen en slopers op piepkleine voetjes: veel kleine zetten, en je armen lopen vol. Een rustbak op 3,7 m
      // (bijpakken en uitschudden), daarna de sleutelpassage met een brede zet naar rechts vanaf een sloper.
      grepen: [
        [8.8, 1.25, 'richel'], [9.2, 1.3, 'rand'],
        [8.75, 1.62, 'rand'], [9.3, 1.95, 'rand'], [8.82, 2.3, 'sloper'], [9.35, 2.65, 'rand'],
        [8.9, 3.0, 'rand'], [9.25, 3.38, 'richel'], [9.0, 3.72, 'bak'],
        [8.6, 4.1, 'rand'], [9.1, 4.45, 'rand'], [8.72, 4.85, 'sloper'], [9.45, 5.1, 'rand'],
        [9.0, 5.5, 'rand'], [9.5, 5.88, 'richel'], [8.9, 6.25, 'rand'], [9.3, 6.62, 'rand'],
        [8.95, 7.0, 'richel'], [9.15, 7.4, 'bak'],
        [9.0, 0.4, 'korrel'], [9.22, 0.72, 'korrel'], [8.88, 1.0, 'korrel'], [9.28, 1.4, 'korrel'],
        [8.9, 1.75, 'korrel'], [9.32, 2.15, 'korrel'], [8.92, 2.5, 'korrel'], [9.3, 2.85, 'voet'], [8.85, 3.1, 'voet'],
        [9.3, 3.55, 'korrel'], [8.8, 3.9, 'korrel'], [9.25, 4.25, 'korrel'], [8.92, 4.6, 'korrel'],
        [9.4, 4.95, 'korrel'], [9.05, 5.3, 'korrel'], [9.38, 5.7, 'korrel'], [8.9, 6.0, 'korrel'], [9.25, 6.35, 'korrel'],
      ],
      start: [0, 1],
      top: 18,
    },
  ],
  startAfstand: 1.3,    // zo dicht bij de voet van een route kan je beginnen te klimmen
};
