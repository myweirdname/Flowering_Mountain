// Afsteltabel voor de scène: hemel, licht, zee, wolken, lichtstralen en stuifmeel.
// Kleuren en snelheden hier aanpassen, niet in de code.

export const SCENE = {
  // De hemel: diep snoepblauw bovenaan, zacht en licht aan de horizon. De mist neemt de horizonkleur.
  hemel: {
    zenit: 0x4fb2ff,
    horizon: 0xc4ecff,
    zonGloed: 0xffe3c4,
  },
  zonkleur: 0xfff1d6,
  zonsterkte: 2.2,
  hemelLicht: 0xbfe6ff,
  grondLicht: 0xcfe8b8, // licht dat van de grond terugkaatst: licht, zodat niets grauw wordt
  hemelLichtSterkte: 1.6,
  lichtRichting: [-0.35, 0.85, 0.6],
  schaduwSterkte: 0.5, // 0 = geen schaduw, 1 = volle schaduw (alleen op hoog detailniveau) // het zonlicht valt schuin van achter de camera: alles helder en vrolijk

  // De zichtbare zon aan de hemel, met een vrolijk gezichtje.
  zon: {
    kleur: '#fff6b0',
    gloedKleur: 'rgba(255, 230, 120, 0.55)',
    wangKleur: 'rgba(255, 140, 170, 0.75)',
    gezichtKleur: '#c9772e',
    grootte: 130,                  // breedte van zon + gloed (meter, op zonAfstand)
    richting: [0.45, 0.3, -0.84],  // waar de zon staat, gezien vanaf de speler: boven de zee
    afstand: 600,
  },

  // Zee en lagune.
  water: {
    ondiep: 0x8ff7e8,   // turkoois-mint bij het strand
    midden: 0x3fd3ea,
    diep: 0x2b8ef0,
    schuim: 0xffffff,
    glinster: 0xfffbe6,
    kaartGebied: 192,   // halve zijde waarbinnen de zee de diepte kent (voor kleur en schuim)
    kaartResolutie: 192,
  },

  // Kawaii wolkjes aan de horizon, rond het eiland; een paar hebben een gezichtje.
  wolken: {
    aantal: 9,
    metGezicht: 2,
    afstand: [560, 720],  // gemeten vanaf de top: zo blijven ze boven zee, rond het eiland
    hoogte: [95, 175],
    kleur: 0xffffff,
    onderKleur: 0xeadcff,
    wangKleur: 0xffa8c8,
    draaisnelheid: 0.004, // radialen per seconde
  },

  // Lichtstralen door de openingen van het bladerdak (niet op laag detailniveau).
  lichtstralen: { aantal: 12, kleur: 0xfff0b8, sterkte: 0.1, lengte: 13, breedte: [2, 3.6] },

  // Zwevend stuifmeel rond de speler.
  stuifmeel: { kleur: 0xfff3a0, kleur2: 0xffc4e4, grootte: 1.1, doos: [34, 10, 34] },

  wind: { sterkte: 1 },

  // De grote hibiscus: draait als herkenningspunt naast het startpunt, met het rode hartje bovenop.
  hibiscus: {
    blaadjeKleur: 0xff6fa8,
    hartKleur: 0xc81d5a,
    stijlKleur: 0xffc4dc,
    stuifmeelKleur: 0xffe14d,
    grootte: 1.1,          // straal van de open bloem (meter)
    hartje: { kleur: 0xff2a5c, grootte: 0.45 },
    steelKleur: 0x3fae5a,
    steelHoogte: 2.4,
    draaisnelheid: 0.5,    // radialen per seconde
    deinen: 0.12,          // hoe ver de bloem op en neer zweeft (meter)
    plek: [3, -6],         // x, z
  },
};
