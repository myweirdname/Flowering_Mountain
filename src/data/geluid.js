// Afsteltabel voor de geluiden (GD 16). Volumes 0..1; het hoofdvolume staat bovenaan.

export const GELUID = {
  volume: 0.8,
  maxKlanken: 12,       // nooit meer klanken tegelijk (TP 12)

  stappen: 0.08,         // zacht: je hoort ze heel vaak
  sprong: 0.12,
  landing: 0.3,
  opklimmen: 0.1,
  bloesem: 0.22,
  plons: 0.4,
  zwemslag: 0.12,
  plof: 0.3,

  // De pony.
  hoef: 0.11,
  fluit: 0.12,
  hinnik: 0.16,
  snuif: 0.22,
  ponySprong: 0.12,
  ponyLanding: 0.3,
  perfect: 0.16,
  weigeren: 0.08,
  knabbel: 0.2,
  aai: 0.16,
  opstappen: 0.12,
  tik: 0.25,
  tel: 0.18,
  ronde: 0.2,

  branding: 0.22,
  golfPeriode: 6.5,     // seconden per golf
  insecten: 0.035,
  vogels: 0.06,
  vogelTussen: [1.2, 4.5], // seconden tussen twee vogeltjes

  // Vijftonige toonladder (C D E G A): klokjes klinken samen altijd mooi, zonder muziek te worden.
  toonladder: [523.25, 587.33, 659.25, 783.99, 880.0],
};
