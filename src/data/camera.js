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
};
