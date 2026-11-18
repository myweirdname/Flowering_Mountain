// Afsteltabel voor de geluiden (GD 16). Volumes 0..1; het hoofdvolume staat bovenaan.

export const GELUID = {
  volume: 0.8,
  maxKlanken: 12,       // nooit meer klanken tegelijk (TP 12)

  stappen: 0.22,
  sprong: 0.12,
  landing: 0.3,
  opklimmen: 0.1,
  bloesem: 0.22,
  plons: 0.4,
  zwemslag: 0.12,
  plof: 0.3,

  branding: 0.22,
  golfPeriode: 6.5,     // seconden per golf
  insecten: 0.035,
  vogels: 0.06,
  vogelTussen: [1.2, 4.5], // seconden tussen twee vogeltjes

  // Vijftonige toonladder (C D E G A): klokjes klinken samen altijd mooi, zonder muziek te worden.
  toonladder: [523.25, 587.33, 659.25, 783.99, 880.0],
};
