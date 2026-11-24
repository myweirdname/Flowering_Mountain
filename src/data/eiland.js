// Afsteltabel voor het eiland (stap 12, TP 5.2): de kust rondom, de rotsrand met de etage erboven,
// de ravijnen, de bergtop en de voorlopige hellingbaan. Afstanden en hoogtes in meter.
// Het kamp ligt op (0, 0) aan de zuidkust (de zee aan de -z-kant); de top staat midden op het eiland.
// Hoeken rond de top: 0 = in de richting van het kamp, positief = naar de kant van de springweide.

export const EILAND = {
  midden: { x: 0, z: 300 },   // waar de top staat

  kust: {
    straal: 285,         // gemiddelde afstand van de top tot de waterlijn
    ruis: 0.09,          // grilligheid van de kust (deel van de straal)
    ruisSchaal: 1.5,     // hoe snel de kust golft rond het eiland (hoger = meer baaien en kapen)
    // Aan de kant van het kamp is het eiland groter, zodat het kampstrand met de baai blijft zoals het was.
    kampExtra: 125,      // zoveel verder komt de kust in de richting van het kamp
    kampBreedte: 0.55,   // hoe breed die uitstulping is (radialen; zacht aflopend)
    zacht: 26,           // zo zacht loopt de kampkust over in de eilandkust
  },

  // Rond het kamp blijft alles zoals het was: de rotsrand begint pas voorbij deze z (het speelbos eindigt rond z 78).
  kampVrij: 97,

  // De etages, van onder naar boven. Een klein eiland heeft er één (GD 12).
  etages: [
    {
      rand: 200,         // afstand van de top tot het midden van de rotsrand
      randRuis: 0.07,    // de rotsrand slingert rond de berg (deel van de straal)
      randSchaal: 1.4,
      wand: 6,           // zo breed is de rotsrand van voet tot bovenkant: smal = steil (niet te beklimmen)
      grillig: 2.6,      // de rotsrand springt voor en achteruit (meter): uitsteeksels en inhammen
      grilligSchaal: 13,
      hoogte: 32,        // hoogte van de etage bovenaan de rotsrand
      hoogteRuis: 3.5,   // rond de berg is de etage wat hoger of lager (en de rotsrand dus ook)
      stijging: 0.06,    // de etage loopt zacht op naar de berg (meter per meter)
      golf: 1.6,         // zachte bulten op de etage
      golfSchaal: 34,
      minBreedte: 45,    // de etage is overal minstens zo breed
    },
  ],

  // De bergtop: een brede kegel die je te voet beklimt (zacht onderaan, steiler naar boven, nooit steiler dan 45°).
  top: {
    voet: 140,           // afstand van de top tot de voet van de kegel
    voetRuis: 0.08,
    hoogte: 116,         // hoogte van de top
    plateau: 9,          // straal van het vlakke stukje bovenop (voor de Hartbloem, stap 18)
    vorm: 0.6,           // helling onderaan t.o.v. het gemiddelde (1 = overal even steil; lager = zachter begin, steiler einde)
    graten: 5,           // ribbels en geulen rond de top
    graatHoogte: 3.2,
    gloed: 0xff7fbf,     // roze gloed op de top: daar komt later de Hartbloem
  },

  // Ravijnen: insnijdingen van de bergtop naar buiten, door de etage en de rotsrand (TP 5.2).
  ravijnen: {
    aantal: [2, 4],      // het zaadje kiest; ze verdelen de etage in zoveel plekken
    bodem: 2.5,          // halve breedte van de bodem
    wandSteilte: 4,      // de wanden: hoogte per meter opzij (4 = bijna loodrecht)
    geul: 2.5,           // zo diep ligt de bodem onder het laagland waar het ravijn uitkomt
    vloerStijging: 0.12, // de bodem loopt zacht op naar de berg
    kopWand: 5,          // de achterwand, aan de voet van de kegel
    uitloop: 40,         // zo ver loopt het ravijn als een geultje door het laagland
    vrijKamp: 0.8,       // niet in de buurt van het kamp of de hellingbaan (radialen)
    spreiding: 0.35,     // hoeveel een ravijn van zijn regelmatige plaats mag afwijken (deel van de tussenruimte)
  },

  // Voorlopige weg naar de etage (BOUWPLAN 12): een hellingbaan schuin langs de rotsrand,
  // met een zandpaadje vanaf de achterkant van de springweide. Later komen de echte doorgangen (stap 13).
  hellingbaan: {
    hoek: 0.3,           // waar ze onderaan begint (radialen vanaf het kamp, naar de kant van de springweide)
    lengte: 52,          // hoe lang (bepaalt hoe steil: ±22°)
    breedte: 3.2,        // halve breedte
    rand: 1.2,           // zachte rand
    marge: 2,            // zo ver van de rotsrand begint en eindigt ze
    pad: 1.6,            // halve breedte van het zandpaadje ernaartoe
  },

  // Open grasplekken op de etage, waar je de top en de zee ziet.
  open: { schaal: 46, drempel: 0.62, zacht: 0.1 },

  // Losse rotsblokken aan de voet van de rotsrand (verbergen het uitgerekte terrein, TP 5.2).
  voetRotsen: { kans: 0.75, grootte: [2.2, 3.4] },

  // Het grove eilandvlak: zo ver rond het eiland ligt er nog zeebodem.
  zeeRand: 60,
};
