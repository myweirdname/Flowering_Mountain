// Leest snelkoppelingen uit de URL, zoals ?debug=1 of ?kwaliteit=laag (zie TP 9).

const p = new URLSearchParams(location.search);

export const INSTELLINGEN = {
  debug: p.get('debug') === '1',
  berg: p.get('berg') ?? 'bloei', // bergcode = zaadje van de wereld
  kwaliteit: ['laag', 'midden', 'hoog'].includes(p.get('kwaliteit')) ? p.get('kwaliteit') : 'hoog',
};

// Maximale beeldscherpte per detailniveau (TP 7).
export const MAX_PIXELVERHOUDING = { laag: 1, midden: 1.5, hoog: 2 };
