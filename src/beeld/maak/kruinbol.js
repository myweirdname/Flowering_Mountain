// Verre bomen en palmen (TP 5.4): van ver is een boom alleen nog zijn kruin, één bolle vorm die bovenaan
// licht is (zon) en onderaan zachter donker. Zo kan het bladerdak van het hele eiland in beeld zijn.
// Twintig driehoeken per boom; de plaatsing en de kleurtint komen van de echte bomen (zelfde plek, zelfde boom).
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './vorm.js';

const wit = new THREE.Color(0xffffff);
const kTop = new THREE.Color();
const kOnder = new THREE.Color();
const kUit = new THREE.Color();

/** Kleurverloop over een bol: lichter bovenaan, donkerder onderaan. */
function verloop(basis, cy, ry) {
  kTop.copy(basis).lerp(wit, 0.2);
  kOnder.copy(basis).multiplyScalar(0.66);
  return (p) => kUit.copy(kOnder).lerp(kTop, Math.min(1, Math.max(0, (p.y - cy) / ry * 0.5 + 0.5)));
}

/**
 * De kruin van een junglereus, van ver: ongeveer even groot als de bolle wolkjes van de echte boom samen.
 * @param {typeof import('../../data/flora.js').FLORA.boom} B
 * @param {number[]} kruinKleuren de twee kruinkleuren van dit eiland
 */
export function maakVerreKruin(B, kruinKleuren) {
  const H = (B.hoogte[0] + B.hoogte[1]) / 2;
  const basis = new THREE.Color(kruinKleuren[0]).lerp(new THREE.Color(kruinKleuren[1]), 0.5);
  const bol = maakBol(1, 0);
  const cy = H - 0.1;
  const bouwer = new Bouwer().voegToe(bol, { matrix: matrix(0, cy, 0, 0, 0.3, 0, 5.3, 3.4, 5.3), kleur: verloop(basis, cy, 3.4), zwaai: 0 });
  bol.dispose();
  return bouwer.maak();
}

/**
 * De bladkroon van een palm, van ver: een platte bol bovenop de leunende stam (de palm leunt naar +x).
 * @param {typeof import('../../data/flora.js').FLORA.palm} P
 */
export function maakVerrePalm(P) {
  const H = (P.hoogte[0] + P.hoogte[1]) / 2;
  const leun = (P.leunen[0] + P.leunen[1]) / 2;
  const bol = maakBol(1, 0);
  const bouwer = new Bouwer().voegToe(bol, {
    matrix: matrix(leun, H - 0.3, 0, 0, 0.5, 0, 2.7, 0.85, 2.7),
    kleur: verloop(new THREE.Color(P.bladKleur), H - 0.3, 0.85),
    zwaai: 0,
  });
  bol.dispose();
  return bouwer.maak();
}
