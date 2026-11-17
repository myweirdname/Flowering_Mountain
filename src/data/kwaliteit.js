// Detailniveaus (TP 7). Afstanden in meter. Dichtheden 0..1 (deel van de planten dat getekend wordt).

export const KWALITEIT = {
  laag: {
    pixelverhouding: 1,
    antialias: false,
    tegelStraal: 50,     // fijn terrein rond de speler
    dichtbij: 26,        // bomen en palmen in vol detail
    dichtbijKlein: 0,    // struiken en bloemen in vol detail (0 = nergens)
    struikStraal: 34,
    bloemStraal: 34,
    grasStraal: 22,
    struiken: 0.5,
    bloemen: 0.5,
    gras: 0.4,
    detail: 0,           // 0 = eenvoudige vormen, 1 = rijke vormen
    schaduw: false,
    lichtstralen: false,
    stuifmeel: 110,
    mist: [26, 115],     // begin en einde van de mist
    tegelsPerBeeld: 1,   // zoveel nieuwe tegels per beeld maken (spreiden = geen haperingen)
  },
  midden: {
    pixelverhouding: 1.5,
    antialias: true,
    tegelStraal: 80,
    dichtbij: 40,
    dichtbijKlein: 20,
    struikStraal: 60,
    bloemStraal: 50,
    grasStraal: 30,
    struiken: 0.8,
    bloemen: 0.8,
    gras: 0.7,
    detail: 1,
    schaduw: false,
    lichtstralen: true,
    stuifmeel: 250,
    mist: [34, 145],
    tegelsPerBeeld: 1,
  },
  hoog: {
    pixelverhouding: 2,
    antialias: true,
    tegelStraal: 110,
    dichtbij: 36,
    dichtbijKlein: 22,
    struikStraal: 64,
    bloemStraal: 56,
    grasStraal: 36,
    struiken: 0.9,
    bloemen: 1,
    gras: 1,
    detail: 1,
    schaduw: true,
    lichtstralen: true,
    stuifmeel: 420,
    mist: [40, 175],
    tegelsPerBeeld: 2,
  },
};
