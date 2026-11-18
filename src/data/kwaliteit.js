// Detailniveaus (TP 7). Afstanden in meter. Dichtheden 0..1 (deel van de planten dat getekend wordt).

export const KWALITEIT = {
  laag: {
    pixelverhouding: 1,
    antialias: false,
    tegelStraal: 50,     // terreintegels rond de speler
    fijnStraal: 26,      // tot hier het terrein op 1 m (zoals de simulatie), verder op 2 m
    dichtbij: 22,        // bomen en palmen in vol detail
    middenStraal: 30,    // bomen in eenvoudige vorm; verder: kruinbollen (allemaal dezelfde vorm, minder fijn)
    dichtbijKlein: 0,    // struiken en bloemen in vol detail (0 = nergens)
    struikStraal: 44,
    bloemStraal: 36,
    grasStraal: 28,
    struiken: 0.45,
    bloemen: 0.5,
    gras: 0.4,
    detail: 0,           // 0 = eenvoudige vormen, 1 = rijke vormen
    schaduw: false,
    lichtstralen: false,
    stuifmeel: 110,
    mist: [26, 115],     // begin en einde van de mist
    bouwBudget: 3,       // ms per beeld voor nieuwe tegels (spreiden = geen haperingen)
    ingroeien: 8,        // planten groeien over zoveel meter uit de grond in plaats van plots te verschijnen
  },
  midden: {
    pixelverhouding: 1.5,
    antialias: true,
    tegelStraal: 80,
    fijnStraal: 36,
    dichtbij: 40,
    middenStraal: 60,
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
    bouwBudget: 4,
    ingroeien: 10,
  },
  hoog: {
    pixelverhouding: 2,
    antialias: true,
    tegelStraal: 110,
    fijnStraal: 45,
    dichtbij: 30,
    middenStraal: 60,
    dichtbijKlein: 22,
    struikStraal: 55,
    bloemStraal: 50,
    grasStraal: 36,
    struiken: 0.9,
    bloemen: 1,
    gras: 1,
    detail: 1,
    schaduw: true,
    lichtstralen: true,
    stuifmeel: 420,
    mist: [40, 175],
    bouwBudget: 6,
    ingroeien: 12,
  },
};
