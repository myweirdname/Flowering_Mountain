// De ponykleuren die een kind zelf koos (vacht, manen, sokjes, bles). Bewaard op dit toestel, zodat
// de pony in het spel en in de dierenproef dezelfde kleuren heeft. Per profiel bewaren komt in stap 19.
// Geen Three.js hier: alleen getallen, zodat dit ook later (profielen, multiplayer) bruikbaar blijft.

const SLEUTEL = 'bloeiendeBerg.ponyKleur';

/** @typedef {{ vacht?: number, manen?: number, sokjes?: number, bles?: number }} PonyKleur */

/** @returns {PonyKleur} */
export function laadPonyKleur() {
  try {
    const k = JSON.parse(localStorage.getItem(SLEUTEL) ?? '{}');
    return k && typeof k === 'object' ? k : {};
  } catch {
    return {};
  }
}

/** @param {PonyKleur} k */
export function bewaarPonyKleur(k) {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(k));
  } catch {
    // Privévenster of geblokkeerde opslag: de keuze geldt dan alleen tot de pagina sluit.
  }
}

/** Twee kleuren mengen (t = 0: a, t = 1: b). */
function meng(a, b, t) {
  const kanaal = (s) => {
    const x = (a >> s) & 255;
    const y = (b >> s) & 255;
    return Math.round(x + (y - x) * t) << s;
  };
  return kanaal(16) | kanaal(8) | kanaal(0);
}

/**
 * De pony-afsteltabel met de gekozen kleuren erin. Wat niet gekozen is, blijft zoals in de tabel.
 * @template {typeof import('../data/dieren.js').PONY} P
 * @param {P} P
 * @param {PonyKleur} k
 * @returns {P}
 */
export function ponyMetKleur(P, k) {
  const uit = { ...P };
  if (k.vacht !== undefined) {
    uit.vachtKleur = k.vacht;
    uit.buikKleur = meng(k.vacht, 0xfff4e6, 0.28); // iets lichter onder de buik
    uit.snoetKleur = meng(k.vacht, 0xfff4e6, 0.6); // zachte, lichte neus
  }
  if (k.manen !== undefined) {
    uit.maanKleur = k.manen;
    uit.maanSchaduw = meng(k.manen, 0x5a3a2a, 0.18);
  }
  if (k.sokjes !== undefined) uit.sokKleur = k.sokjes;
  if (k.bles !== undefined) uit.blesKleur = k.bles;
  return uit;
}
