// Afsteltabel voor het bergplan (stap 13, TP 5.1 en 5.3, GD 2 en 3): het netwerk van plekken en doorgangen,
// en hoe de doorgangen op het eiland geplaatst worden. Afstanden in meter, hoeken in radialen.
//
// Een nieuwe soort doorgang toevoegen (later, bv. een springtuin of een tokkelbaan):
//   1. zet hem in `soorten` hieronder (richting, moeilijkheid, vereiste, pictogram);
//   2. laat het bergplan hem kiezen (sim/wereld/bergplan.js: `kiesDoorgangen`);
//   3. bouw hem op zijn plaats (zoals sim/klimmen/bergwand.js of sim/doorgangen/oversteek.js);
//   4. test.html controleert dan vanzelf dat elke plek bereikbaar blijft.

export const BERGPLAN = {
  // Elke soort doorgang (GD 3). richting: 'omhoog' (over een rotsrand), 'oversteek' (een ravijn of de rivier),
  // 'omlaag'. terug: kan je dezelfde weg ook terug? vereiste: null (iedereen te voet), 'pony', later ook
  // 'goud' (de gouden tijger) of 'nacht'. moeilijkheid: 1 tot 3 pootjes op de wegwijzer.
  soorten: {
    ponypad: { richting: 'omhoog', terug: true, vereiste: 'pony', moeilijkheid: 1, pictogram: 'pony' },
    klimwand: { richting: 'omhoog', terug: false, vereiste: null, moeilijkheid: 1, pictogram: 'klim' }, // moeilijkheid: de makkelijkste route
    touwbrug: { richting: 'oversteek', terug: true, vereiste: null, moeilijkheid: 1, pictogram: 'brug' },
    balanceerstam: { richting: 'oversteek', terug: true, vereiste: null, moeilijkheid: 1, pictogram: 'stam' },
    liaan: { richting: 'oversteek', terug: false, vereiste: null, moeilijkheid: 2, pictogram: 'liaan' }, // slingeren gaat maar één kant op
  },
  // Geen doorgang maar gewoon lopen: van een plek de bergtop op (de kegel is overal beloopbaar, stap 12).
  helling: { terug: true, vereiste: null, moeilijkheid: 1 },

  // Welke doorgangen elke scheiding krijgt (regel 3: minstens twee van een verschillende soort).
  rotsrand: ['ponypad', 'klimwand'],          // elke plek: een ponypad en een klimwand (regel 4)
  ravijn: { aantal: 2, keuze: ['touwbrug', 'balanceerstam', 'liaan'] }, // twee verschillende oversteken

  // --- Plaatsing langs de rotsrand (afstanden gemeten langs de rotsrand) ---
  plaats: {
    vanRavijn: 18,        // zo ver blijft een doorgang van een ravijn
    tussen: 20,           // zo ver liggen twee doorgangen langs de rotsrand uit elkaar
    stappen: 9,           // zoveel kandidaten per doorgang (het eerste goede plekje telt)
    // Waar het ponypad bij voorkeur komt (0 = bij het ene ravijn, 1 = bij het andere): aan een kant, zodat er
    // naast nog plaats is voor de klimwand.
    ponypad: [0.22, 0.78, 0.5, 0.12, 0.88, 0.36, 0.64],
  },

  // --- Ponypad: een pad dat schuin langs de rotsrand omhoog loopt (zoals de hellingbaan van stap 12) ---
  ponypad: {
    lengte: 56,           // hoe lang (bepaalt hoe steil, ±22°)
    padje: 14,            // een zandpaadje vanuit het laagland naar het begin
  },

  // --- Klimwand: een verticale lila rotspijler voor de rotsrand, met twee gekleurde routes ---
  klimwand: {
    breedte: 7.5,         // de wandkaart, links-rechts
    rand: 1.3,            // zoveel steekt de pijler links en rechts voorbij de wandkaart uit
    voor: 0.6,            // de wand staat zoveel voor de buitenste voet van de rotsrand
    achter: 4,            // de pijler loopt zoveel voorbij de bovenkant van de rotsrand door (op de etage)
    open: { voor: 8, opzij: 3, rand: 5 }, // vlak gras voor de wand (geen bomen, geen rotsblokken)
    // Routes (KL 10, eenvoudig): elke zet binnen bereik. u = midden van de route op de wandkaart.
    // stap = hoogte tussen twee handgrepen, zij = om en om links/rechts van het midden, rust = om de zoveel meter een bak.
    routes: [
      { naam: 'geel', graad: '3', kleur: 0xffd23f, u: 2.0, stap: [40, 46], zij: [26, 34], grepen: ['bak'], rust: 0 },
      { naam: 'turkoois', graad: '4', kleur: 0x22c8c0, u: 5.4, stap: [42, 47], zij: [26, 34], grepen: ['richel', 'bak'], rust: 2.2 },
    ],
    voetStap: 0.42,       // voetgrepen tussen de handgrepen, om de zoveel meter
    topOnder: 0.42,       // de topgreep zit zoveel onder de bovenrand
    uitstap: 1.4,         // na de top stap je zoveel meter achter de rand op de etage
    kleur: 0xd9c4f2, kleurDonker: 0xb39ce0, kleurLaag: 0xf3d9ef, mos: 0x7fd96a,
  },

  // --- Oversteek over een ravijn: twee houten platforms op de randen en een doorgang ertussen ---
  oversteek: {
    afstanden: [0.3, 0.7, 0.5, 0.2, 0.85, 0.4, 0.6, 0.12, 0.92], // waar langs het ravijn (0 = bij de bergtop, 1 = bij de rotsrand)
    tussen: 12,           // twee oversteken over hetzelfde ravijn liggen minstens zo ver uit elkaar
    dekStraal: 1.6,       // de platforms
    dekBoven: 0.25,       // een platform ligt zoveel boven de grond
    maxVerschil: 2.6,     // de platforms mogen zoveel in hoogte verschillen (de brug of de stam loopt dan schuin)
    liaanVerschil: 0.6,   // bij de lianen niet meer dan dit (je moet aan de overkant kunnen landen)
    overRand: 0.6,        // het platform steekt zoveel over de rand van het ravijn
    // De maten van de doorgangen, aangepast aan de breedte van het ravijn (de rest komt uit SPEELBOS).
    liaan: { eerste: 150, laatste: 200, maxTussen: 315 }, // cm; het aantal lianen volgt uit de breedte
  },

  // --- Wegwijzers (GD 2): een paaltje met het pictogram van de doorgang en 1 tot 3 pootjes ---
  wegwijzer: { opzij: 2.6, voor: 2.2, hoogte: 1.5 },
};
