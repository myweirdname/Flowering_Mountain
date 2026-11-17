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

  maxHelling: 45,           // graden: steiler is niet beloopbaar, je glijdt eraf
  glijVersnelling: 14,
  glijControle: 0.25,       // hoeveel je nog kan sturen tijdens het glijden
};
