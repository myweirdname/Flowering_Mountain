// Afsteltabel voor de pony (GD 6): rijden, springen, weigeren, fluiten, wortels en het bloeispoor.
// Snelheden in meter per seconde, tijden in seconden, afstanden in meter.
// Kinderwensen als "de pony moet sneller" of "hoger springen" passen meestal hier.

export const RIJDEN = {
  ponySchaal: 1.15,       // hoe groot de pony in het spel is t.o.v. de dierenproef (met de avonturier erop)
  zadel: [0, 0.72, 0.02], // waar de avonturier zit (in de maten van de pony: hoogte en iets naar voren)

  // --- Gangen ---
  stap: 2.2,
  draf: 6.2,              // ongeveer dubbel zo snel als lopen
  galop: 9.4,
  stapTot: 0.45,          // joystick minder ver dan dit: stap; daarboven draf
  galopVanaf: 0.9,        // vanaf hier (bijna helemaal duwen, of Shift): galop
  versnelling: 7,
  remmen: 10,
  draaiStil: 4.2,         // hoe snel ze draait (radialen per seconde) als ze stilstaat ...
  draaiGalop: 2.3,        // ... en in volle galop
  scherpeBocht: 1.3,      // meer dan zoveel radialen bijsturen: ze vertraagt om te draaien

  // --- Galopkracht ---
  galopStart: 0.6,        // zo vol is de galopmeter bij de start (0..1)
  galopVerbruik: 0.085,   // per seconde galop
  galopHerstel: 0.03,     // per seconde zonder galop
  wortelKracht: 0.35,     // een wortel vult de meter zoveel bij
  wortelStraal: 1.2,
  wortelTerug: 25,        // na zoveel seconden groeit een opgegeten wortel terug

  // --- Springen ---
  zwaartekracht: 22,
  vrijeSprong: 5.8,       // een sprongetje zonder hindernis
  korteSprong: 0.6,       // loslaten tijdens het stijgen: zo laag (alleen zonder hindernis)
  vrijeRuimte: 0.32,      // zo ver gaan de hoeven minstens over een hindernis
  landMarge: 0.7,         // zo ver achter de hindernis komt ze minstens neer
  maxVersnel: 1.4,        // een vroege sprong mag zoveel sneller vliegen dan de aanloop ...
  maxVlucht: 0.9,         // ... en zo lang duren; nog vroeger springen = te vroeg
  maxSchuin: 0.5,         // cosinus van de grootste hoek waaronder ze nog over een hindernis springt
  minSpringSnelheid: 2.4, // trager aanlopen = slechte aanloop: ze weigert
  perfectMarge: 0.25,     // hoe dicht bij de ideale afzet een sprong perfect is (deel van de vlucht)
  perfectBoost: 1.8,      // extra vaart na een perfecte sprong ...
  boostTijd: 1.4,         // ... zo lang

  // --- Weigeren (in plaats van vallen) ---
  weigerVanaf: 2.9,       // sneller dan dit tegen een hindernis: ze weigert; trager: ze stopt gewoon
  weigerDuur: 1.15,       // stoppen, hoofd schudden, een stap terug
  schudTijd: 0.55,        // zo lang schudt ze haar hoofd; daarna kan je al sturen
  terugSnelheid: 1.6,
  rustigNa: 2.0,          // daarna nog zo lang rustig stappen (tenzij je een andere kant op stuurt)
  borst: 0.62,            // van het midden van de pony tot haar borst
  lijfBreedte: 0.35,
  stapHoogte: 0.45,       // zo hoog stapt ze zonder springen ergens op
  maxHelling: 40,         // graden: steiler kan ze niet omhoog (een rotsrand neem je via het ponypad, stap 13)
  straal: 0.55,           // om tegen stammen te botsen

  // --- Water ---
  waadDiepte: 0.25,       // dieper: ze waadt (trager, spetters)
  waadFactor: 0.55,
  zwemDiepte: 1.05,       // dieper: ze zwemt
  zwemSnelheid: 1.9,
  drijf: 0.8,             // zo diep zitten haar hoeven onder water als ze zwemt
  maxDiepte: 2.8,         // nog dieper (de zee) gaat ze niet in
  spetterTussen: 0.28,

  // --- Fluiten en volgen ---
  opstapAfstand: 2.3,     // zo dicht moet je bij haar staan om op te stappen
  afstapSnelheid: 1.2,    // trager dan dit mag je afstappen (anders stopt ze eerst)
  verFluit: 65,           // verder weg: ze zoekt zelf een weg en verschijnt dichtbij
  verschijnAfstand: 12,
  komtStop: 1.6,          // zo dicht komt ze bij je staan
  vastNa: 2.2,            // zo lang geen vooruitgang: ze zoekt een andere weg

  // --- Bloeispoor ---
  spoorStap: 0.55,        // om de zoveel meter galop bloeien er bloemen op
  spoorBreedte: 0.55,     // zo ver links en rechts van haar spoor
  spoorLeven: 30,         // na zoveel seconden verwelkt een bloem weer (zodat niet alles vol bloemen staat)
  spoorVerwelk: 2.5,      // zo lang duurt het wegkrimpen
};
