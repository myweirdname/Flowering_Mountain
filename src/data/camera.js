// Afsteltabel voor de volgcamera (GD 4).

export const CAMERA = {
  afstand: 7.5,          // meter achter het figuurtje
  hoogteDoel: 1.1,       // naar welk punt boven de voeten de camera kijkt
  kanteling: 0.38,       // radialen naar beneden kijken
  minKanteling: 0.05,
  maxKanteling: 1.1,
  meedraaien: 1.6,       // hoe snel de camera achter je looprichting draait
  volgen: 10,            // hoe snel de camera het figuurtje bijhoudt
  verticaalVolgen: 5,    // trager in de hoogte, zodat een sprong niet schokt
  muisGevoeligheid: 0.006,
  rustNaSlepen: 1.2,     // seconden na rondkijken voor de camera weer zelf meedraait
  bovenGrond: 0.6,       // de camera zakt nooit lager dan dit boven het terrein
  beeldhoek: 55,
  minAfstand: 1.6,       // zo dicht komt de camera als er een boom tussen zit
  terugNaBoom: 3,        // hoe snel ze daarna terug naar achter schuift
  // Op de pony: wat verder weg en hoger, en de camera draait sneller mee (een pony loopt niet opzij).
  rijden: { afstand: 9.5, hoogteDoel: 1.7, meedraaien: 2.6 },

  // Vogelvlucht (toets V of ?vogel=1): een vrije camera boven het eiland. Snelheden in m/s.
  vogelvlucht: { snelheid: 18, snelFactor: 3, klimSnelheid: 16, bovenGrond: 2, maxHoogte: 450 },
  // Prestatievlucht (?vlucht=1): de vaste ronde. laag = hoogte boven de grond zoals tijdens het spelen,
  // boomHoog = boven de bomen; traag en snel in m/s; het rondje hoog rond het eiland (deel van een cirkel).
  vlucht: { wacht: 2.5, laag: 3.5, boomHoog: 22, traag: 10, snel: 38, rondStraal: 330, rondHoogte: 150, rondje: 0.5 },
};
