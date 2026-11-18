// Afsteltabel voor de bloesems om te verzamelen. Afstanden in meter.

export const BLOESEMS = {
  aantal: 45,          // zoveel liggen er rond het kamp
  straal: 62,          // tot zo ver van het kamp
  binnen: 4,           // niet vlak naast het startpunt
  tussenafstand: 3.5,
  opRotsen: 6,         // zoveel liggen boven op een grote rots
  inLagune: 5,         // zoveel zweven boven de lagune
  slingerKans: 0.25,   // kans op een slinger van drie op een rij
  zweefHoogte: 0.75,   // zo hoog zweven ze boven de grond
  pakStraal: 0.75,     // zo dicht moet je erbij komen
  pakHoogte: 0.9,      // en zoveel hoogteverschil mag er zijn (springen om een hoge te pakken)
  reeksTijd: 2.5,      // snel na elkaar gepakt: elke klank een toon hoger

  // Hoe ze eruitzien.
  blaadjeKleur: 0xff7fbf,
  randKleur: 0xffd6ec,
  hartKleur: 0xffe14d,
  grootte: 0.3,
  kantel: 1.2,         // bijna rechtop, zodat je het bloemetje van voren ziet als het ronddraait
  gloed: 0xff9fd0,
  draaien: 1.6,        // rondjes per seconde (radialen)
  deinen: 0.12,
  zichtbaar: 70,       // verder weg worden ze niet getekend
};
