// Afsteltabel voor de welpjes bij mama tijger (BOUWPLAN 8b, GD 8): drie welpjes (de echte welp, de knuffelwelp
// en de eerste knuffeltijger) die rond mama spelen: dartelen, snuffelen, elkaar achternazitten en bespringen,
// omrollen, en terugrennen als ze te ver weg zijn. Loopt mama, dan dribbelen ze achter haar aan.
// Afstanden in meter, tijden in seconden, snelheden in m/s.

export const WELPJES = {
  schaal: 1.15,           // zelfde schaal als mama (de vorm uit de dierenproef × deze schaal)
  // Wie er meespeelt: [model, soort]. model: 'welp' (echt), 'knuffelwelp' of 'knuffel' (de eerste knuffeltijger).
  wie: [['welp', 'bengaals'], ['knuffelwelp', 'bengaals'], ['knuffel', 'bengaals']],

  // Spelen rond mama (als ze stilstaat)
  speelStraal: [1.4, 4.2], // zo ver van mama kiezen ze een plekje om naartoe te dartelen
  terugAfstand: 6.5,      // verder weg dan dit: terug naar mama
  verschijnVanaf: 26,     // zo ver weg (of vast): ze komen achter mama uit de struiken tevoorschijn
  mamaLoopt: 0.6,         // loopt mama sneller dan dit, dan lopen de welpjes mee in plaats van te spelen
  meePlekken: [[-0.75, -1.9], [0.8, -2.2], [0, -3.1]], // [opzij, vooruit] achter mama als ze loopt
  afstandTotElkaar: 0.55, // zo dicht mogen ze bij elkaar komen (anders duwen ze zachtjes opzij)
  afstandTotMama: 1.05,

  // Lopen (kleine pootjes)
  stap: 0.9,
  dartel: 2.2,            // een vrolijk drafje
  ren: 3.6,               // achternazitten
  galop: 9.5,             // mama bijhouden als ze met je mee galoppeert
  draaiSnelheid: 7,       // radialen per seconde: welpjes draaien vlug
  versnelling: 7,

  // Wat ze doen als ze ergens zijn aangekomen (kans per keuze, samen 1)
  // staart, verstop en tak: de spelletjes van stap 8d (lukt een spelletje niet, dan dartelt hij gewoon).
  keuze: { dartel: 0.32, achterna: 0.2, rol: 0.11, nies: 0.05, hik: 0.04, staart: 0.05, verstop: 0.06, tak: 0.07, snuffel: 0.1 },
  snuffelDuur: [1.2, 3],  // even stilstaan, rondkijken, snuffelen
  rolDuur: 1.4,           // een keer helemaal omrollen
  achternaDuur: [3.5, 6], // zo lang zitten ze elkaar achterna
  vangAfstand: 0.75,      // zo dicht: bespringen!
  springDuur: 0.5,        // de sprong zelf
  springHoogte: 0.28,
  springVer: 1.3,
  vluchtVoorsprong: 0.85, // de vluchter is iets trager dan de jager (anders vangen ze elkaar nooit)

  // Aaien (tik op een welpje)
  aaiAfstand: 5,          // zo dicht moet je erbij zijn
  aaiDuur: 2.2,           // op zijn rug, pootjes in de lucht

  // Schatjesmomenten (stap 8c). Tijden binnen een moment tellen vanaf het begin ervan.
  nies: {
    bloemZoek: 3.5,       // zo ver kijkt hij rond naar een bloem om aan te snuffelen (anders snuffelt hij aan het gras)
    bloemKans: 0.5,       // alleen bloemen die op elk kwaliteitsniveau te zien zijn
    duur: 2.8,
    snuffel: 1.3,         // eerst snuffelen ... dan "ha ... ha ..."
    hatsjie: 1.88,        // ... "TSJIE!" (valt samen met het geluid)
    terug: 0.38,          // zo ver springt hij achteruit van de schrik
    springDuur: 0.3,
    springHoogte: 0.13,
  },
  hik: { duur: [4.5, 7], tussen: [0.6, 1.25], hoogte: 0.13, hupDuur: 0.24 },
  struikel: {
    vanaf: 2.6,           // alleen als hij zo snel (of sneller) rent
    kansPerSeconde: 0.08, // zo vaak struikelt hij over zijn grote voeten tijdens het rennen
    rust: 9,              // daarna een tijdje niet meer
    duur: 1.8,
    rol: [0.14, 0.74],    // van wanneer tot wanneer hij kopje-onder gaat
    glij: 1.1,            // zo ver schuift hij nog door
  },
  huh: { afstand: 16, duur: 1.6, rust: 3.5 }, // jij springt of fluit: drie kopjes schuin ("huh?")
  meeBrul: {
    afstand: 16,          // zo dicht bij mama moeten ze zijn om mee te brullen
    wacht: [0.25, 0.3],   // na mama's brul: het eerste welpje wacht zo lang, elk volgend zoveel langer
    duur: 2.7,
    schrap: 0.55,         // eerst zetten ze zich schrap ...
    open: 1.0,            // ... doen hun bekje wijd open ...
    mieuw: 1.15,          // ... en dan komt er alleen "mieuw!" uit
    dicht: 2.05,
  },

  // Spelen met elkaar (stap 8d).
  staart: {
    draai: 3.4,           // zo lang draait hij rondjes achter zijn staart aan ...
    omega: [3.5, 13],     // ... steeds sneller (radialen per seconde, van begin tot eind)
    straal: 0.17,         // in een klein kringetje
    val: 0.4,             // dan valt hij duizelig om ...
    liggen: 2.4,          // ... blijft even liggen met sterretjes boven zijn kop ...
    op: 0.5,              // ... staat weer op ...
    wankel: 2.4,          // ... en wankelt nog wat rond
    wankelV: 0.75,
  },
  verstop: {
    afstand: [2.5, 11],   // een rond bosje (FLORA.bosje), niet te dicht bij mama en niet te ver
    oorBoven: 0.07,       // zo ver steken de oortjes boven de struik uit
    dieper: 0.25,         // zo ver zit hij voorbij het midden van het bosje (van mama af gezien)
    telAfstand: 0.82,     // de zoeker staat zo dicht bij mama's lijf (kopje tegen haar aan)
    tellen: 5,            // hij telt minstens tot 5 ...
    maxTellen: 9,         // ... en verder als de anderen nog niet verstopt zijn
    telTussen: 0.8,
    maxLopen: 7,          // zo lang mogen ze erover doen om hun plekje te halen
    zoekV: 1.5,           // de zoeker snuffelt rond (traag, neus bij de grond)
    omweg: 0.6,           // kans dat hij eerst ergens anders gaat snuffelen
    zoekAfstand: 0.9,     // zo dicht komt hij bij de struik: gevonden!
    ruiken: 0.7,
    hupDuur: 0.45,        // het blije sprongetje (zoeker) en het opspringen uit de struik (gevonden)
    hupHoogte: 0.24,
    gevondenDuur: 1.8,
    maxZoeken: 40,        // daarna geeft hij het op
  },
  tak: {
    lengte: 0.8,
    mond: 0.47,           // van het midden van een welpje tot zijn bekje
    plek: [2.3, 3.0],     // zo ver van mama valt het takje neer
    valTijd: 0.7,
    ligtTot: 6,           // een takje dat verder van mama ligt, telt niet meer
    opruimen: 30,         // een vergeten takje verdwijnt als mama en jij zo ver weg zijn
    maxLopen: 10,
    trekDuur: [2.6, 4.2], // zo lang trekken ze ...
    slinger: 0.13,        // ... heen en weer (meter)
    gromTussen: [0.45, 0.8],
    breekKans: 0.55,      // ... en dan breekt de tak (anders schiet hij los)
    valDuur: 2.2,         // achterover vallen, even op de rug spartelen, en weer overeind
    terugDuur: 0.36,
    terug: 0.38,          // zo ver vallen ze achteruit
    achterHoek: 2.75,     // zo ver kantelen ze achterover (radialen)
    plof: 0.3,
    loslaat: 0.5,         // dan laten ze hun stuk tak vallen
    opDuur: 0.55,
    wegNa: 10,            // de stukken verdwijnen daarna in het gras
  },
  // Waar het bekje zit, per model (in de maat van het model, vóór de schaal): daar hangt het takje.
  mond: { welp: [0, 0.35, 0.405], knuffelwelp: [0, 0.35, 0.405], knuffel: [0, 0.365, 0.46] },

  zichtbaarTot: 70,       // verder van de camera: niet tekenen
  pad: { herzoek: 1 },    // zo vaak een nieuwe weg zoeken als ze niet rechtdoor kunnen
};
