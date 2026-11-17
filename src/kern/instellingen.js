// Leest snelkoppelingen uit de URL, zoals ?debug=1 of ?kwaliteit=laag (zie TP 9).

const p = new URLSearchParams(location.search);

// Zonder keuze in de URL: laag detail op touchtoestellen (gsm en tablet), hoog op pc.
// De automatische keuze met meting komt in stap 28.
const touch = matchMedia('(pointer: coarse)').matches;

export const INSTELLINGEN = {
  debug: p.get('debug') === '1',
  berg: p.get('berg') ?? 'bloei', // bergcode = zaadje van de wereld
  kwaliteit: ['laag', 'midden', 'hoog'].includes(p.get('kwaliteit')) ? p.get('kwaliteit') : touch ? 'laag' : 'hoog',
};
