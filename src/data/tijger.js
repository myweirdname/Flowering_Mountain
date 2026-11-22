// Afsteltabel voor de tijger als reisgezel (BOUWPLAN 8a, GD 8): de Bengaalse tijger die voorloopt,
// wacht en omkijkt, de brul met zijn meter, en de slaapbloem met de verstopte schat.
// Afstanden in meter, tijden in seconden, snelheden in m/s.

export const GEZEL = {
  schaal: 1.15,           // even groot als de pony in het spel (de vorm uit de dierenproef × deze schaal)
  soort: 'bengaals',      // welke tijger uit TIJGERS je reisgezel is
  // Op laag niveau (tablet, gsm) een minder fijne huid: de helft van de driehoeken (TP 7).
  laag: { fijnheid: 0.55, kopFijnheid: 0.72 },

  // Waar hij wacht tot je hem ontmoet: naast het kamp, aan de kant van de lagune (de pony staat aan de andere kant).
  rustPlek: { opzij: 4.2, voor: -1.5 },
  ontmoetAfstand: 6.5,    // zo dichtbij moet je komen, dan komt hij naar je toe
  kopjeAfstand: 0.95,     // zo dicht komt hij tegen je aan staan voor zijn kopje
  kopjeDuur: 2.4,

  // Lopen
  stap: 1.3,              // rustig voorlopen
  draf: 3.6,              // bijhalen
  galop: 8.5,             // je achterna als je met de pony galoppeert
  draaiSnelheid: 4.5,     // radialen per seconde
  versnelling: 5,
  stopAfstand: 0.5,       // zo dicht bij een tussenpunt telt als "aangekomen"

  // Gidsen: voorlopen naar de slaapbloem
  voorAfstand: 6,         // zo ver loopt hij hoogstens voor je uit voor hij vertraagt
  wachtAfstand: 9.5,      // ben je verder weg, dan stopt hij, draait zich om en wacht
  verderAfstand: 5.5,     // ben je weer zo dichtbij, dan loopt hij verder
  wijsTussen: 2.6,        // tijdens het wachten: om de zoveel tijd kijkt hij om naar jou, dan naar waar hij heen wil
  roepTussen: 7,          // en zo vaak proest hij "kom!"
  bloemAfstand: 2.6,      // zo dicht bij de slaapbloem gaat hij staan

  // Volgen (als er niets te gidsen valt)
  volgAfstand: 5,         // verder weg dan dit: hij komt bij je
  volgPlek: [1.8, 2.6],   // waar hij naast je staat: [opzij, vooruit] in jouw kijkrichting
  verschijnVanaf: 38,     // zo ver weg (of vast): hij komt uit de jungle naast je tevoorschijn
  vastNa: 2.5,            // zo lang geen vooruitgang: opnieuw een weg zoeken
  verschijnAfstand: 9,

  // Pony en tijger begroeten elkaar
  begroetAfstand: 5,      // zo dicht bij de pony: hij gaat haar begroeten
  neusAfstand: 1.9,       // tot zo dicht (midden tot midden) lopen ze naar elkaar toe
  begroetDuur: 2.6,
  begroetOpnieuw: 45,     // pas na zo lang begroeten ze elkaar opnieuw

  // De brul
  meterStart: 0.55,       // zo vol is de meter bij de start
  meterPerSeconde: 0.012, // de meter vult zich met de tijd (±40 s van leeg tot vol) ...
  meterPerBloesem: 0.06,  // ... en met elke bloesem
  brulBereik: 16,         // slaapbloemen tot zo ver van de tijger gaan open
  brulDuur: 1.8,          // even lang als de brul in de dierenproef (LEVEN.brulDuur)
  brulKlank: 0.32,        // na zo lang komt de brul echt (de bek gaat open)
  brulVerschijn: 24,      // is de tijger verder weg bij een brul, dan springt hij eerst naar je toe

  // De slaapbloem
  slaapbloem: {
    afstand: [22, 32],    // zo ver van het kamp, verstopt in de jungle
    vrij: 2.2,            // zo veel vrije ruimte eromheen
    grootte: 1.25,        // straal van de open bloem
    hoogte: 0.5,          // waar de bloem op zijn korte stengel staat
    openDuur: 1.8,
    knopKleur: 0x7b5cc9,  // dicht en slapend: paars, met lichtere nerven
    nerfKleur: 0xb7a3f0,
    binnenKleur: 0xff8fc8, // open: roze en lichtgevend
    hartKleur: 0xffe15a,
    bladKleur: 0x3e9c58,
    schatBloesems: 12,    // zoveel bloesems zitten er in de schat
    pakAfstand: 1.5,
  },

  pad: { cel: 1, maxStappen: 24000 }, // de padzoeker: een raster van 1 m over de speelplek
};
