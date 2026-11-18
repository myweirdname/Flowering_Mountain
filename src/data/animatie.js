// Afsteltabel voor de animatie van de avonturier. Hoeken in radialen.

export const ANIMATIE = {
  fasePerMeter: 3.2,   // hoe snel de beentjes gaan per afgelegde meter (wandelen)
  faseRenExtra: 0.4,   // iets snellere pasjes bij rennen
  beenLoop: 0.55,      // hoe ver de beentjes zwaaien bij wandelen
  beenRen: 1.0,        // en bij rennen
  armLoop: 0.45,
  armRen: 1.05,
  armRust: 0.45,       // armpjes iets van het lijf af
  renLeun: 0.22,       // voorover leunen bij rennen
  zwemLeun: 0.5,       // voorover liggen in het water
  hupLoop: 0.025,      // op en neer huppelen bij elke pas (meter)
  hupRen: 0.07,
  wieg: 0.06,          // heen en weer wiegen bij het lopen
  stilDrempel: 0.35,   // onder deze snelheid staat ze stil
  soepel: 16,          // hoe snel een houding overgaat in de volgende

  pletten: 0.25,       // hoeveel het lijfje plet bij een landing
  rekken: 0.12,        // hoeveel het uitrekt tijdens het stijgen

  knipperDuur: 0.13,
  knipperTussen: [1.8, 4.5], // seconden tussen twee keer knipperen
};
