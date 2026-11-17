// Afsteltabel voor het eerste testterrein (stap 2): glooiende heuveltjes.

export const TERREIN = {
  grootte: 160,          // zijde van het speelveld in meter
  rasterStap: 1,         // afstand tussen twee hoogtepunten in meter
  rand: 3,               // zo dicht mag je bij de rand van het veld komen

  heuvelHoogte: 3.2,     // hoe hoog de gewone heuveltjes zijn
  heuvelBreedte: 22,     // hoe ver twee heuveltoppen ongeveer uit elkaar liggen
  bulten: 4,             // aantal ruislagen (meer = grilliger)
  bergjes: 7,            // een paar steile bergjes om afglijden te testen
  bergjeHoogte: 7,
  bergjeBreedte: 5,
  vlakkeStart: 8,        // straal van het vlakke stuk waar je begint

  // Kleuren: kawaii, dus fris snoepgroen en zachtlila rotsen
  grasLaag: 0x4fc46a,
  grasHoog: 0xa8eb7a,
  rots: 0xb7a3cf,
};
