// De eerste hoogtefunctie hoogte(x, z) (TP 5.2): glooiende heuveltjes met een paar steile bergjes.
// Later groeit dit uit tot het hele eiland; de vorm van de functie blijft dezelfde.
import { maakWillekeur } from '../../kern/willekeur.js';
import { lagenruis } from './ruis.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @param {number} zaadje
 * @param {typeof import('../../data/terrein.js').TERREIN} t
 * @returns {(x:number, z:number) => number}
 */
export function maakHoogtefunctie(zaadje, t) {
  const w = maakWillekeur(zaadje);
  const ruisZaad = w.volgende();

  // Plaats de steile bergjes met gehele keuzes, buiten het vlakke startstuk.
  const half = Math.floor(t.grootte / 2) - 12;
  const bergjes = [];
  while (bergjes.length < t.bergjes) {
    const x = w.geheel(half * 2) - half;
    const z = w.geheel(half * 2) - half;
    if (Math.hypot(x, z) < t.vlakkeStart + 10) continue;
    bergjes.push({ x, z, h: t.bergjeHoogte * (0.7 + w.geheel(7) / 10) });
  }

  return function hoogte(x, z) {
    let h = lagenruis(x / t.heuvelBreedte, z / t.heuvelBreedte, ruisZaad, t.bulten) * t.heuvelHoogte;
    for (const b of bergjes) {
      const d = Math.hypot(x - b.x, z - b.z);
      h += b.h * (1 - glad(d / t.bergjeBreedte));
    }
    // Rond het startpunt wordt het terrein zachtjes vlak.
    const s = glad(Math.hypot(x, z) / t.vlakkeStart);
    return h * s;
  };
}
