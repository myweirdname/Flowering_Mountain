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

// Kleurstalen voor de pony: de kinderen kiezen zelf (knop "Kleuren" in de dierenproef; later in de stal).
// Alleen deze vier onderdelen, met weinig maar mooie keuzes (de jongste is 6). Het laatste bolletje in
// het paneel is altijd "zelf mengen" (een kleurenschijf). De eerste kleur van elke rij is de standaard.
// Buik, snoet en de schaduw in de manen worden vanzelf afgeleid van de gekozen kleuren.
export const PONYKLEUREN = {
  vacht: [0xd98a4e, 0xa0522d, 0x7a4e34, 0x3a2a26, 0xe8c27a, 0xdcd6d0, 0xf2a6c8, 0xb9a3e3],
  manen: [0xfff0b8, 0xffffff, 0xd9a050, 0x5a3a2a, 0x2a2224, 0xff8cc6, 0x9b7be0, 0x7ec8f0],
  sokjes: [0xfff4e6, 0xfff0b8, 0x3a2a26, 0xff8cc6, 0x9b7be0, 0x7ec8f0],
  bles: [0xfff4e6, 0xfff0b8, 0xff8cc6, 0x9b7be0, 0x7ec8f0],
};

// --- De echte tijgers (verbeterronde stap 6, wens van de kinderen) ---
// "De wereld is kawaii, maar de tijgers moeten er veel echter uitzien: niet schattig, maar gevaarlijk
// (ook al zijn ze lief)." Echte verhoudingen: een lang, laag, gespierd lijf, zware schouders, grote
// poten, een kleiner hoofd met wangkraag, smalle amberkleurige ogen onder een zware wenkbrauw, en
// hoektanden die je ziet als hij geeuwt of brult. In het spel blijven ze altijd vrienden (GD 8).
export const TIJGERVORM = {
  schofthoogte: 0.95,      // tot de bovenkant van de schouders: zo hoog als de pony
  rompLengte: 0.95,        // nagemeten op foto's: het lijf is ongeveer anderhalve keer zo lang als hoog
  rompDikte: 1.0,          // 1 = echte breedte; hoger = zwaarder, lager = slanker
  pootDikte: 0.85,         // hoe zwaar de poten zijn (nagemeten op foto's: de onderarm ±1/7 van de schouderhoogte)
  pootGrootte: 1.0,        // hoe groot de voeten zijn
  hoofdGrootte: 1.0,       // nagemeten op foto's en het skelet: de kop is ongeveer een derde van de schouderhoogte
  oogGrootte: 0.028,       // halve breedte van een oog (een echte tijger: ±0,02; iets groter leest beter)
  staartLengte: 1.0,
  staartDikte: 0.043,
  wangkraag: 1.0,          // hoe ver de witte bakkebaarden uitsteken
  hoektand: 0.052,         // lengte van de bovenste hoektanden, in hoofdmaat (de schedel is ±0,3 lang)
  neusKleur: 0xd08578,     // roze neus met een donkere rand (zoals op foto's)
  neusRand: 0x2a1a18,
  lipKleur: 0x1c1212,      // zwarte lippen
  mondKleur: 0x6e1e26,     // binnenkant van de bek
  tongKleur: 0xd8707a,
  tandKleur: 0xf6efdc,
  snorKleur: 0xffffff,
  oogDonker: 0x0b0806,
  // Hoe donker de plooien en holtes zijn (oksels, onder de kin, tussen de poten): geeft diepte.
  holteSterkte: 0.45,
  // Vacht: fijne haartjes in het licht en rafelige streepranden.
  vachtRuis: 0.08,
  rafelFijn: 1.0,
  gloed: 0.03,             // de knuffeltijger had 0.15: echte vacht gloeit niet
  rand: 0.2,               // zacht licht langs de randen (haartjes in tegenlicht)
};

// Elke soort is een ander kleurpalet en andere streepwaarden (TP 5.7). Natuurlijke kleuren.
export const TIJGERS = {
  bengaals: {
    naam: 'Bengaalse tijger',
    vachtKleur: 0xdc7a26,   // diep roestoranje
    rugKleur: 0xb85a16,     // donkerder op de rug
    flankKleur: 0xeaa45c,   // lichter goud waar het oranje naar het wit overgaat
    buikKleur: 0xf3ece0,
    oorBinnen: 0xf2ece2,
    oogKleur: 0xe8a81e,     // amber
    oogRand: 0x8a4a10,      // donkere ring rond de iris
    streepKleur: 0x140d0b,
    strepen: { dichtheid: 10.5, dikte: 0.3, rafel: 1.1, sterkte: 1.0, zaad: 3.1 },
  },
  wit: {
    naam: 'Witte tijger',
    vachtKleur: 0xece5d8,
    rugKleur: 0xd8cebe,
    flankKleur: 0xf4efe6,
    buikKleur: 0xfbf9f4,
    oorBinnen: 0xf8f4ee,
    oogKleur: 0x79b4e6,     // ijsblauw
    oogRand: 0x2a5a8a,
    streepKleur: 0x2e2420,  // donker chocoladebruin
    strepen: { dichtheid: 10.0, dikte: 0.27, rafel: 1.2, sterkte: 0.95, zaad: 7.7 },
  },
  goud: {
    naam: 'Gouden tijger',
    vachtKleur: 0xe6b35e,   // bleek goud (een "golden tabby")
    rugKleur: 0xd09640,
    flankKleur: 0xf0cd8a,
    buikKleur: 0xfaf3e2,
    oorBinnen: 0xfaf3e6,
    oogKleur: 0x9db23a,     // groenig amber
    oogRand: 0x4e5a1a,
    streepKleur: 0x9a5426,  // zacht roodbruin
    strepen: { dichtheid: 9.0, dikte: 0.26, rafel: 1.2, sterkte: 0.85, zaad: 12.4 },
  },
};

// --- De echte welpen (verbeterronde stap 6, plan van de gebruiker) ---
// Een welp is van nature al schattig. Nagemeten op foto's van welpen van ±3 à 4 maanden (Wikimedia
// Commons, zie OVERDRACHT_TIJGERS.md): de kop is ±0,43 van de schouderhoogte (volwassen ±0,33), rond, met
// een hoog bol voorhoofd, een korte kleine snuit, grote ogen en grote ronde oren; een mollig, diep lijf (de
// pootjes lijken kort), dikke poten met heel grote voeten en een korte, dikke staart. Dezelfde technieken
// en dezelfde gezichtstekening als de volwassen tijger (maakTijger), met deze verhoudingen.
export const WELPVORM = {
  ...TIJGERVORM,
  schofthoogte: 0.42,      // een welp van een paar maanden: tot aan je knie
  rompLengte: 0.8,         // het lijf is ±1,3 keer zo lang als hoog (volwassen ±1,45)
  rompDikte: 1.12,         // mollig
  rompDiepte: 1.25,        // een diepe buik: de pootjes lijken korter
  pootDikte: 1.45,         // dikke pootjes, tot onderaan
  pootGrootte: 1.45,       // heel grote voeten (daar groeit hij nog in)
  hoofdGrootte: 1.4,       // grote kop (met de pluizige vacht erbij)
  kopOp: 0.07,             // de kop hoog, nieuwsgierig (volwassen 0: iets lager dan de rug)
  nekKort: 0.08,           // een korte nek
  kopBreedte: 1.08,        // een breed, rond gezicht
  snuit: 0.56,             // korte snuit
  snuitHoogte: 0.72,       // en de neus dicht bij de ogen
  bekMaat: 0.8,            // een klein snoetje en een kleine onderkaak
  zacht: 1.7,              // mollig: de spieren lopen zacht in elkaar over
  schedel: 1.1,            // bol voorhoofd
  neus: 0.85,              // een klein roze neusje
  oogGrootte: 0.04,        // grote ogen (volwassen 0.028)
  oogAfstand: 1.1,
  oogVorm: [0.62, 0.55, 0.05], // rond en open (bovenooglid, onderooglid, schuinte), volwassen [0.44, 0.38, 0.17]
  pupil: 0.3,              // grote pupillen (volwassen 0.2)
  frons: 0.35,             // nog niet streng
  oorGrootte: 1.45,        // grote ronde oren
  staartLengte: 0.62,      // kort en dik staartje
  staartDikte: 0.062,
  staartHang: 0.45,        // hangt niet tot op de grond
  wangkraag: 0.85,         // pluizige wangen
  hoektand: 0.024,         // melktandjes
  holteSterkte: 0.35,
  rand: 0.45,              // pluizige vacht: veel zacht licht langs de randen
  keelBreedte: 0.15,       // alleen het midden van keel en borst is wit (de schouders oranje)
  vachtRuis: 0.1,
  rafelFijn: 1.5,          // zachtere, pluizige streepranden
  karakter: 'tijgerWelp',
};

// Kleuren van de welpen: zoals hun ouders, iets zachter. Heel jonge welpen hebben nog blauwgrijze ogen.
export const WELPEN = {
  bengaals: {
    ...TIJGERS.bengaals,
    naam: 'Bengaalse welp',
    vachtKleur: 0xd8823a,
    rugKleur: 0xbc6624,
    flankKleur: 0xebb070,
    oogKleur: 0x6f94ab,     // blauwgrijs
    oogRand: 0x2c4352,
    strepen: { dichtheid: 11.5, dikte: 0.27, rafel: 1.4, sterkte: 0.95, zaad: 5.3 },
  },
  wit: {
    ...TIJGERS.wit,
    naam: 'Witte welp',
    strepen: { dichtheid: 11.0, dikte: 0.25, rafel: 1.5, sterkte: 0.9, zaad: 9.2 },
  },
  goud: {
    ...TIJGERS.goud,
    naam: 'Gouden welp',
    oogKleur: 0x7f9c8a,     // grijsgroen
    oogRand: 0x34483c,
    strepen: { dichtheid: 10.0, dikte: 0.25, rafel: 1.5, sterkte: 0.8, zaad: 14.8 },
  },
};

// --- De knuffeltijgers (eerste versie, kawaii) ---
// Bewaard voor later (welpjes, knuffels, pictogrammen). Gebruikt door maak/tijgerKawaii.js.
// Gedeelde vorm: rond, mollig en vriendelijk, met grote zachte poten.
export const KAWAII_TIJGERVORM = {
  // Op vraag van de gebruiker zo groot als een welp (was 0.82, zo groot als de pony). Alle maten van de
  // knuffel schalen mee: zijn vorm blijft precies dezelfde.
  schofthoogte: 0.4,
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

// Kleurpaletten van de knuffeltijgers: helder en snoepachtig.
export const KAWAII_TIJGERS = {
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

// --- De knuffelwelpen (verbeterronde stap 6, op vraag van de gebruiker) ---
// "Een knuffel met de echte bouw, in welpgrootte": de bouw en de verhoudingen van de echte welp (WELPVORM),
// maar als speelgoed, passend bij de kawaii-wereld: een gladde vacht zonder haartjes, snoepkleuren met een
// zachte gloed, grote glanzende ogen, een roze neusje, een lachend mondje en blosjes. Gemaakt in
// maak/knuffelWelp.js. De eerste knuffeltijger (hierboven) blijft ongewijzigd bewaard.
export const KNUFFELWELPVORM = {
  ...WELPVORM,
  zacht: 2.1,              // nog ronder en zachter: speelgoed heeft geen spieren
  oogGrootte: 0.052,       // grote kawaii-ogen
  oogAfstand: 1.24,
  oogKring: 0,             // geen donkere kring rond de ogen (het kawaii-oog heeft zijn eigen randje)
  frons: 0,                // helemaal niet streng
  hoektand: 0.018,
  holteSterkte: 0.18,      // bijna geen donkere plooien: een knuffel is overal zacht
  vachtRuis: 0,            // een gladde vacht, zonder haartjes
  rafelFijn: 0.25,         // strepen met zachte, gladde randen
  rand: 0.34,              // zacht licht langs de randen, zoals de pony en de eerste knuffeltijger
  gloed: 0.15,             // een beetje eigen gloed (kawaii)
  neusKleur: 0xff8fa8,     // roze neusje
  neusRand: 0xe0708a,
  lipKleur: 0xf2e8de,      // geen zwarte lippen: de mondspleet valt weg in de witte snoet
  lachKleur: 0x5a2a2a,     // het lachende mondje en de snorhaarpuntjes
  oogDonker: 0x231616,
  wangKleur: 0xff9ab0,     // blosjes
};

// Snoepkleuren van de knuffelwelpen (zoals de eerste knuffeltijgers), met weinig maar vette strepen.
export const KNUFFELWELPEN = {
  bengaals: {
    ...KAWAII_TIJGERS.bengaals,
    naam: 'Bengaalse knuffelwelp',
    flankKleur: 0xffc07a,
    oogRand: 0x8a5a10,
    strepen: { dichtheid: 7.5, dikte: 0.34, rafel: 0.8, sterkte: 1.0, zaad: 3.1 },
  },
  wit: {
    ...KAWAII_TIJGERS.wit,
    naam: 'Witte knuffelwelp',
    flankKleur: 0xfbf7f2,
    oogRand: 0x2a5a8a,
    strepen: { dichtheid: 7.8, dikte: 0.3, rafel: 0.9, sterkte: 0.95, zaad: 7.7 },
  },
  goud: {
    ...KAWAII_TIJGERS.goud,
    naam: 'Gouden knuffelwelp',
    flankKleur: 0xffe0a8,
    oogRand: 0x4e6a1a,
    strepen: { dichtheid: 7.0, dikte: 0.32, rafel: 0.9, sterkte: 0.85, zaad: 12.4 },
  },
};

// Gangen: hoe de poten bewegen. fase = wanneer elke poot begint te stappen in de cyclus
// [linksvoor, rechtsvoor, linksachter, rechtsachter]; draagtijd = deel van de cyclus dat een poot op de grond staat.
export const GANGEN = {
  stil: { frequentie: 0, pas: 0, optil: 0, deining: 0, fase: [0, 0.5, 0.75, 0.25], draagtijd: 1, maxFrequentie: 1 },
  // Stap: vier tellen, één poot tegelijk in de lucht.
  stap: { frequentie: 1.05, pas: 0.36, optil: 0.09, deining: 0.012, fase: [0.25, 0.75, 0, 0.5], draagtijd: 0.68, maxFrequentie: 2.2 },
  // Draf: diagonale paren tegelijk, met een klein zweefmomentje.
  draf: { frequentie: 1.9, pas: 0.48, optil: 0.14, deining: 0.035, fase: [0, 0.5, 0.5, 0], draagtijd: 0.42, maxFrequentie: 3.4 },
  // Galop: drie tellen (achter, achter, voor-voor) en een lange zweeffase; het lijf wiegt op en neer.
  galop: { frequentie: 2.3, pas: 0.85, optil: 0.2, deining: 0.03, fase: [0.62, 0.5, 0.12, 0.0], draagtijd: 0.3, maxFrequentie: 3.0, galop: 1 },
};
// In het spel bepaalt de echte snelheid hoe snel de poten gaan (zodat de hoeven niet over de grond glijden);
// `pas` is dan de langste stap en `maxFrequentie` het snelste ritme.

// Levendigheid: knipperen, oren, staart en rondkijken.
export const LEVEN = {
  knipperTussen: [1.8, 4.5],  // seconden tussen twee keer knipperen
  knipperDuur: 0.16,
  oorTussen: [1.2, 3.5],      // af en toe een oor draaien of schudden
  kijkTussen: [1.5, 4],       // af en toe ergens anders heen kijken (soms naar jou)
  kijkNaarJou: 0.45,          // kans dat het dier naar de camera kijkt
  overgang: 3,                // hoe snel een dier van gang wisselt
  // Alleen dieren met een beweegbare kaak (de echte tijgers):
  geeuwTussen: [12, 26],      // af en toe een grote geeuw als hij stilstaat: dan zie je de hoektanden
  geeuwDuur: 2.8,
  brulDuur: 1.8,              // een brul (knop in de dierenproef; later de brulknop in het spel)
};
