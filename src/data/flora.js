// Afsteltabel voor alle planten en bloemen (TP 5.5, SC "Tropische flora").
// Elke soort is een reeks "genen": de generator in beeld/maak/ maakt er een vorm van.
// Per bergcode kiest het zaadje een eigen mix en eigen bloemkleuren.

export const FLORA = {
  // Hoe dicht elke laag staat: gemiddelde tussenafstand in meter.
  lagen: {
    boom: { afstand: 9, stam: 0.75 },   // stam = straal waar je tegen botst
    palm: { afstand: 6.5, stam: 0.32 },
    rots: { afstand: 10 },
    struik: { afstand: 3 },
    bloem: { afstand: 2.4 },
    gras: { afstand: 1.25 },
  },

  boom: {
    hoogte: [11, 16],
    stamKleur: 0xd2a07a,
    kruinKleuren: [0x45c463, 0x5ad67a, 0x3db97e, 0x79d65a, 0x52cf9a], // het zaadje kiest er twee
    kruinBollen: 7,
    lianen: 4,
    liaanKleur: 0x63b247,
    liaanBlad: 0x6cdc6a,
  },

  palm: {
    hoogte: [6.5, 9.5],
    leunen: [1.2, 2.6],      // hoe ver de top opzij hangt
    stamKleur: 0xe0b183,
    ringKleur: 0xc9925f,
    bladKleur: 0x55d36c,
    bladNerf: 0xc8f59a,
    nootKleur: 0x9b6a3e,
    bladeren: 8,
    bladLengte: 3.3,
  },

  rots: { kleuren: [0xc6b4e6, 0xe9c6d6, 0xbfc9e8], grootte: [0.4, 1.4] },

  gras: { kleur: 0x6fd65e, punt: 0xc9f590, hoogte: 0.34 },

  // Bladplanten. gewicht = hoe vaak de soort gekozen wordt (het zaadje schudt die nog wat door elkaar).
  bladplanten: {
    monstera: {
      gewicht: 1.0, gaten: 'monstera',
      blad: { vorm: 'hart', lengte: 0.95, breedte: 0.9, lob: 0.14, kleur: 0x33c262, nerf: 0xa9f291, rand: 0x4fd877, kom: 0.12, buiging: 0.22 },
      aantal: 7, steel: 1.15, spreiding: 0.6, steelKleur: 0x2f9f55, grootte: [0.8, 1.3],
    },
    banaan: {
      gewicht: 0.7, gaten: 'banaan',
      blad: { vorm: 'peddel', lengte: 2.1, breedte: 0.62, kleur: 0x7fe46a, nerf: 0xe4ffb6, rand: 0x9ef07a, kom: 0.12, buiging: 0.55 },
      aantal: 6, steel: 0.35, spreiding: 0.25, steelKleur: 0x9fd46a,
      stam: { hoogte: 1.7, dikte: 0.13, kleur: 0xa8d873 }, grootte: [0.8, 1.25],
    },
    olifantsoor: {
      gewicht: 0.8,
      blad: { vorm: 'pijl', lengte: 1.15, breedte: 0.95, lob: 0.3, kleur: 0x2ea85e, nerf: 0xe6ffd6, rand: 0x3fbf6d, kom: -0.06, buiging: 0.32, nerven: 0.8 },
      aantal: 5, steel: 1.35, spreiding: 0.38, steelKleur: 0x4fae6a, grootte: [0.75, 1.3],
    },
    varen: {
      gewicht: 1.4,
      blad: { vorm: 'veer', lengte: 1.25, breedte: 0.42, lobben: 7, kleur: 0x5fd56a, nerf: 0x9eea7a, rand: 0x8be86f, kom: 0.05, buiging: 0.85 },
      aantal: 8, steel: 0, spreiding: 0.95, steelKleur: 0x4caa4a, grootte: [0.7, 1.3],
    },
    calathea: {
      gewicht: 0.7,
      blad: { vorm: 'ovaal', lengte: 0.6, breedte: 0.34, kleur: 0x3a9e62, nerf: 0xffb8e2, rand: 0x7fe3a0, kom: 0.1, buiging: 0.25, nerven: 1 },
      aantal: 9, steel: 0.45, spreiding: 0.5, steelKleur: 0x8a5a7a, grootte: [0.8, 1.2],
    },
  },

  // Bloemfamilies: de vorm. De kleuren komen uit de paletten hieronder.
  bloemFamilies: {
    hibiscus: { blaadjes: 5, lengte: 0.25, breedte: 0.22, kom: 0.35, draai: 0, meeldraad: 0.75, hoogte: [0.55, 0.9], bloemen: 2 },
    frangipani: { blaadjes: 5, lengte: 0.19, breedte: 0.11, kom: 0.18, draai: 0.55, meeldraad: 0, hoogte: [0.45, 0.75], bloemen: 3 },
    heliconia: { schutbladen: 6, lengte: 0.22, hoogte: [0.8, 1.2], bloemen: 1 },
    lelie: { blaadjes: 6, lengte: 0.22, breedte: 0.09, kom: 0.6, draai: 0, meeldraad: 0.5, hoogte: [0.5, 0.8], bloemen: 2 },
  },
  // Kawaii snoepkleuren: [hart, blaadje, rand].
  bloemPaletten: [
    [0xc81d5a, 0xff6fa8, 0xffc2dc], // roze
    [0xffc93c, 0xffffff, 0xfff1d0], // wit met geel hart (frangipani)
    [0xff7a2e, 0xffb347, 0xffe08a], // perzik-oranje
    [0x9a4dff, 0xc79bff, 0xf0e0ff], // lila
    [0xff3d6e, 0xff8a8a, 0xffd0c0], // koraal
    [0xffd23f, 0xfff06a, 0xffffc8], // zonnegeel
    [0xe0207a, 0xff4fa0, 0xff9fd0], // fuchsia
    [0x4d8bff, 0x8fc0ff, 0xe0f0ff], // hemelsblauw
  ],
  bladKleurBloem: 0x3fbf63,
  steelKleurBloem: 0x3c9e52,
  bloemSoortenPerEiland: 5,
};
