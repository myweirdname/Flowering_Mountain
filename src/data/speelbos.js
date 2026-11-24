// Afsteltabel voor het speelbos (BOUWPLAN 11, GD 3 en 14): een kort parcours van houten boomhutplatforms
// achter de oefenrots, met de eerste zes doorgangen: lianen, touwbrug, balanceerstam, springbloem,
// reuzenbladeren en lotusbladeren. Afstanden in meter, tijden in seconden, snelheden in m/s.
// Waarden met "[van, tot]" in centimeter kiest het zaadje (gehele getallen, TP 4); de testbot bewijst
// in test.html dat elke keuze haalbaar is.

export const SPEELBOS = {
  // Waar het eerste platform staat, ten opzichte van het kamp: "opzij" = weg van de lagune (naar de
  // springweide toe), "verder" = de jungle in. Het parcours slingert vandaar verder.
  start: { opzij: -8, verder: 46 },

  // De platforms, in volgorde. hoogte = boven de bosvloer; straal = hoe groot; boom = met een reuzenboom erdoor.
  dekken: [
    { soort: 'dek', hoogte: 3.0, straal: 2.0, boom: true },    // A: begin (de trap komt hier uit)
    { soort: 'dek', hoogte: 3.0, straal: 2.0, boom: true },    // B
    { soort: 'dek', hoogte: 3.0, straal: 2.0, boom: true },    // C
    { soort: 'dek', hoogte: 3.0, straal: 2.0, boom: true },    // D: met de springbloem
    { soort: 'hoog', hoogte: 6.2, straal: 2.0, boom: true },   // E: de hoge boomhut
    { soort: 'steiger', hoogte: 0.45, straal: 1.3, boom: false }, // F: een steigertje in de vijver
    { soort: 'eiland', hoogte: 0.45, straal: 2.2, boom: false },  // G: het finish-eilandje
  ],
  stam: 0.55,           // dikte (straal) van de reuzenboom door een platform
  boomHoogte: 12.5,     // tot waar de stam reikt (boven de bosvloer); daarboven de kruin

  // De doorgangen tussen de platforms: soort en richting in graden (0 = opzij, 90 = verder, 180 = terug opzij).
  modules: [
    ['liaan', 0],
    ['touwbrug', 90],
    ['balanceerstam', 180],
    ['springbloem', 90],
    ['reuzenblad', 0],
    ['lotus', 0],
  ],

  // De trap naar het eerste platform (een plank met latjes) en de uitgang van het eilandje naar de oever.
  trap: { richting: 270, lengte: 7.5, breedte: 1.3 },
  uitgang: { richting: 270, lengte: 3.2, breedte: 1.1 },

  // De bosvloer: zo ver rond het parcours helemaal vlak, daarna zacht terug naar de jungle.
  vloer: { plat: 6, rand: 6 },
  // De vijver onder de reuzenbladeren en de lotus.
  vijver: { begin: 1.2, straal: 3.6, diepte: 1.6, peilOnder: 0.35, oever: 1.6 },

  val: 1.0,             // wie van het parcours zoveel naar beneden valt, plooft terug naar het begin van die doorgang

  liaan: {
    aantal: [2, 3],          // hoeveel lianen
    eerste: [140, 180],      // van de rand van het platform tot de eerste liaan (cm)
    tussen: [250, 320],      // tussen twee lianen (cm)
    laatste: [170, 230],     // van de laatste liaan tot het volgende platform (cm)
    ankerBoven: 6.8,         // de tak waar ze aan hangen, boven het platform
    onderBoven: 1.45,        // het uiteinde van de liaan, boven het platform
    handHoogte: 1.35,        // van de voetjes tot de handjes als ze hangt
    zwaartekracht: 14,       // trager dan vallen: rustig slingeren
    pomp: 2.4,               // joystick vooruit: zo hard zwaai je hoger
    rem: 2.0,                // joystick achteruit: zo hard rem je af
    vanzelf: 0.6,            // ook zonder joystick zwaai je een beetje bij (voor de kleinsten)
    maxZwaai: 1.0,           // hoogste zwaai (radialen)
    demping: 0.05,
    grijp: 0.8,              // zo dicht bij de liaan grijp je hem vanzelf vast
    opvangen: 0.6,           // bij het vastgrijpen houd je zoveel van je vaart over
    loslaatHup: 2.4,         // loslaten (springknop) geeft een hupje omhoog
    loslaatDuw: 1.0,         // en een duwtje vooruit
    vrijeVlucht: 1.3,        // zo lang na het loslaten remt de lucht je niet af
    opnieuw: 0.45,           // zo lang kan je dezelfde liaan niet opnieuw grijpen
    sprongNaarLiaan: { omhoog: 3.6, tijd: 0.55 }, // de actieknop aan de rand: een sprongetje naar de eerste liaan
    actieAfstand: 2.4,       // zo dicht bij de eerste liaan wordt de actieknop "slingeren"
  },

  touwbrug: {
    lengte: [900, 1150],
    breedte: 1.0,
    leuning: 0.38,           // verder opzij houden de touwen je tegen
    doorzak: 0.05,           // zakt in het midden zoveel per meter lengte
    deuk: 0.1,               // en een kuiltje waar je staat
    gaten: [1, 2],           // ontbrekende plankjes: daar moet je over springen
    gat: [85, 120],          // hoe lang een gat is (cm)
    schommel: 0.12,          // hoe ver de brug opzij zwaait als je erover rent (beeld)
  },

  balanceerstam: {
    lengte: [600, 820],
    straal: 0.3,
    drift: [0.15, 0.95],     // zijwaartse wiebel bij stilstaan en bij volle rensnelheid (m/s)
    driftHoek: 2.4,          // hoe snel de wiebel heen en weer gaat (rad/s)
    zijwaarts: 0.35,         // je joystick opzij telt op de stam maar voor zoveel
    midden: 1.2,             // en de stam trekt je zachtjes naar het midden
  },

  springbloem: {
    gat: [200, 270],         // van het platform tot de hoge boomhut (cm)
    straal: 0.7,
    hoogte: 0.22,            // de bloem steekt zoveel boven het platform uit
    indrukken: 0.16,         // zo lang zakt ze in voor ze je lanceert
    sprong: 12.2,            // lanceersnelheid omhoog
    mikIn: 0.35,             // ze mikt op dit deel van de straal van de hoge boomhut
  },

  reuzenblad: {
    aantal: [3, 4],
    lang: 0.95,              // half blad, in de looprichting
    breed: 0.78,             // half blad, opzij
    eerste: [60, 100],       // van de hoge boomhut tot het eerste blad (cm)
    tussen: [80, 140],       // tussen twee bladeren (cm)
    laatste: [80, 130],      // van het laatste blad tot het steigertje (cm)
    zigzag: [30, 70],        // om en om opzij (cm)
    doorbuigen: 0.3,         // zoveel zakt een blad als je erop staat
    veer: 55,
    demping: 5,
  },

  lotus: {
    aantal: [3, 5],
    straal: [80, 95],        // cm
    tussen: [50, 110],       // cm
    zigzag: [0, 90],         // cm
    zinkt: 0.15,             // zo snel zinkt een blad onder je voetjes
    stijgt: 0.3,             // en zo snel komt het weer boven
    draagt: 0.32,            // dieper gezonken: het draagt je niet meer (plons!)
    maxZink: 0.5,
  },

  // Bloesems langs het parcours: boven de lianen, op de brug, boven de bladeren.
  zweefHoogte: 1.1,

  // Kleuren: kawaii en snoepachtig.
  kleuren: {
    hout: 0xd9a36a, houtDonker: 0xa8703f, houtLicht: 0xf0c48f,
    touw: 0xf2deb0, stam: 0x9b6b43, stamDonker: 0x7a5233, schors: 0xb98557,
    kruin: 0x58c46a, kruinLicht: 0x8fe07a, liaan: 0x4f9e3a, liaanBlad: 0x7ed957,
    springbloem: 0xff6fae, springHart: 0xffe066, springBlad: 0x5fcf62,
    reuzenblad: 0x5fd06a, reuzenNerf: 0xb8f59a, lotus: 0x63c96a, lotusRand: 0x8fe08a, lotusBloem: 0xffa3d1,
    vijver: 0x5fd3d9, vijverDiep: 0x2fa7b8, mos: 0x5cc46a, vlag: 0xff7fb0, finish: 0xffd84d,
  },
};
