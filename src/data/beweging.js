// Afsteltabel voor bewegen te voet. Snelheden in meter per seconde, tijden in seconden.

export const LOPEN = {
  loopsnelheid: 3.2,
  rensnelheid: 6.5,
  renDrempel: 0.8,          // joystick verder dan dit = rennen
  versnellingGrond: 30,     // hoe snel je op snelheid komt
  remmenGrond: 24,          // hoe snel je stilvalt als je loslaat
  versnellingLucht: 9,      // bijsturen in de lucht
  draaisnelheid: 12,        // hoe snel het figuurtje zich naar de looprichting draait

  springSnelheid: 8.2,      // opwaartse snelheid bij een hoge sprong (ingedrukt houden)
  korteSprongFactor: 0.45,  // kort tikken: de opwaartse snelheid wordt hiermee vermenigvuldigd
  zwaartekracht: 22,
  valZwaartekracht: 34,     // naar beneden vallen gaat iets sneller: voelt strakker aan
  maxValsnelheid: 30,
  coyoteTijd: 0.12,         // nog springen net nadat je van een rand stapt
  sprongBuffer: 0.12,       // te vroeg drukken telt toch, als je kort daarna landt
  grondKleef: 0.35,         // bergaf lopen blijft aan de grond plakken tot dit hoogteverschil

  stapHoogte: 0.3,          // zo hoog stap je zonder moeite op iets
  klimHoogte: 1.2,          // tot zo hoog klim je vanzelf op een rand (hoger houdt je tegen)
  randSteilte: 1.2,         // steiler dan dit (hoogte per meter) is een rand, geen helling
  klimTijd: 0.8,            // hoe lang opklimmen duurt (voor de hoogste rand)
  klimVooruit: 0.55,        // zo ver op de rand kom je terecht

  lijfStraal: 0.32,        // hoe dik het figuurtje is om tegen stammen te botsen

  veiligNa: 0.3,            // zo lang stevig staan en de plek telt als "laatste veilige grond"
  maxGlijTijd: 4,           // langer glijden: plof, terug naar veilige grond
  terugOnder: -15,          // dieper vallen: terug naar veilige grond

  maxHelling: 45,           // graden: steiler is niet beloopbaar, je glijdt eraf
  glijVersnelling: 14,
  glijControle: 0.25,       // hoeveel je nog kan sturen tijdens het glijden
};

// Zwemmen in stil water (GD 5). Dieptes in meter onder het waterpeil.
export const ZWEMMEN = {
  inDiepte: 0.8,            // dieper dan dit: je zwemt
  uitDiepte: 0.6,           // ondieper dan dit: je staat weer (iets minder, zodat het niet heen en weer springt)
  drijfDiepte: 0.5,         // zo diep hangen de voeten onder water
  drijfVeer: 18,
  drijfDemping: 7,
  snelheid: 2.0,            // traag, maar niet saai
  versnelling: 5,
  remmen: 3,
  draaisnelheid: 5,
  sprong: 5.5,              // sprongetje uit het water
  golfDiepte: 2.0,          // in zee, dieper dan dit, duwen de golven je terug
  golfDuw: 6,
  zeeGrens: 3.6,            // nog dieper: plof, terug naar veilige grond
};
