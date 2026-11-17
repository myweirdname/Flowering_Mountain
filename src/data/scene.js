// Afsteltabel voor de scène. Kleuren en snelheden hier aanpassen, niet in de code.

export const SCENE = {
  hemelkleur: 0x8fd3ff,
  zonkleur: 0xfff1d6,
  zonsterkte: 2.2,
  hemelLicht: 0xbfe6ff,
  grondLicht: 0xcfe8b8, // licht dat van de grond terugkaatst: licht, zodat niets grauw wordt
  hemelLichtSterkte: 1.6,
  lichtRichting: [-0.35, 0.85, 0.6], // het zonlicht valt schuin van achter de camera: alles helder en vrolijk
  mistBegin: 45,   // meter: tot hier is alles helder
  mistEinde: 120,  // meter: vanaf hier verdwijnt alles in de hemelkleur

  // De zichtbare zon aan de hemel.
  zon: {
    kleur: '#fff6b0',
    gloedKleur: 'rgba(255, 230, 120, 0.55)',
    grootte: 32,                  // breedte van zon + gloed (meter, op zonAfstand)
    richting: [0.45, 0.35, -0.82], // waar de zon staat, gezien vanaf de speler
    afstand: 150,
  },

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

  // Monstera-struiken rond het startpunt.
  monstera: {
    bladKleur: 0x3fcf6a,
    nerfKleur: 0xb6f5a0,
    steelKleur: 0x2f9f55,
    bladGrootte: 1.1,
    aantal: 7,
    hoogte: 1.4,
    plekken: [[-2.5, -5], [6.5, -4], [-5, 2], [5, 4.5]],
  },
};
