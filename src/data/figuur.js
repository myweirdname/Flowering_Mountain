// Afsteltabel voor de speelfiguur: een kawaii-meisje (chibi) met lang, blond, zacht krullend haar.
// De bewegingen staan in data/animatie.js.

export const TESTFIGUUR = {
  hoogte: 1.3,          // totale hoogte in meter
  breedte: 0.38,        // ongeveer de straal van het lijfje (schaduw, botsen)
  hoofdGrootte: 0.31,   // straal van het hoofd: groot, zoals bij chibi

  huidKleur: 0xffe3d3,
  wangKleur: 0xff8fae,
  haarKleur: 0xffe69a,  // blond
  haarSchaduw: 0xf5c96c, // iets donkerder blond voor de onderste krullen
  jurkKleur: 0xff8cc6,
  kraagKleur: 0xffffff,
  schoenKleur: 0xff6fa8,
  oogKleur: 0x5a8cff,   // de iris
  oogDonker: 0x2b2350,  // rand van het oog en de pupil

  haarLengte: 0.16,     // hoe ver de krullen over de rug vallen (meter); korter = meer jurkje zichtbaar
  krulGrootte: 0.082,
  aantalLokken: 17,
  krulInLok: 7,

  // Hibiscus in het haar.
  haarbloem: {
    blaadjeKleur: 0xff5fa2,
    hartKleur: 0xc0104e,
    stijlKleur: 0xffd0e0,
    stuifmeelKleur: 0xffe14d,
    grootte: 0.17,    // groot genoeg om van ver te zien
    kom: 0.06,        // bijna plat open, zodat je de vorm meteen herkent
    openheid: 0.05,
    stijl: 0.38,      // kort en dik meeldraadje in plaats van een lange naald
  },
};
