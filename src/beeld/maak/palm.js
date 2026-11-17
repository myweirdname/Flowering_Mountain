// Een kokospalm in kawaii-stijl: een sierlijk gebogen stam met zachte ringen,
// een kroon van bolle, hangende bladeren en drie kokosnoten.
import * as THREE from 'three';
import { Bouwer, maakBuis, maakBol, matrix } from './vorm.js';
import { maakBlad } from './blad.js';

const kA = new THREE.Color();
const kB = new THREE.Color();

/**
 * @param {typeof import('../../data/flora.js').FLORA.palm} P
 * @param {number} detail 0 (eenvoudig), 1 (rijk) of -1 (heel ver weg)
 * @param {() => number} toeval
 * De palm leunt naar +x; de plaatsing draait hem in de juiste richting.
 */
export function maakPalm(P, detail, toeval) {
  const bouwer = new Bouwer();
  const H = (P.hoogte[0] + P.hoogte[1]) / 2;
  const leun = (P.leunen[0] + P.leunen[1]) / 2;
  const top = new THREE.Vector3(leun, H, 0);
  const ringen = detail > 0 ? 16 : detail === 0 ? 9 : 4;
  const stam = maakBuis(
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(leun * 0.12, H * 0.35, 0), new THREE.Vector3(leun * 0.5, H * 0.7, 0), top],
    (t) => 0.27 * (1 - 0.35 * t) + 0.12 * (1 - Math.min(1, t * 6)),
    ringen,
    detail > 0 ? 7 : detail === 0 ? 5 : 4
  );
  kA.set(P.stamKleur);
  kB.set(P.ringKleur);
  bouwer.voegToe(stam, {
    // Afwisselend lichte en donkere ringen.
    kleur: (p, i, g) => (Math.round(g.attributes.langs.getX(i) * ringen) % 2 ? kB : kA),
    zwaai: (p) => (p.y / H) ** 2 * 0.7,
  });
  stam.dispose();

  // De bladkroon.
  // Altijd evenveel bladeren in dezelfde houding: alleen de fijnheid verschilt met de afstand.
  const nBlad = P.bladeren;
  const blad = maakBlad(
    {
      vorm: 'veer',
      lengte: P.bladLengte,
      breedte: 1.0,
      lobben: detail > 0 ? 9 : detail === 0 ? 6 : 3,
      kleur: P.bladKleur,
      nerf: P.bladNerf,
      rand: 0x7fe67a,
      kom: 0.2,
      buiging: 0.75,
    },
    detail > 0 ? 1 : 0
  );
  for (let i = 0; i < nBlad; i++) {
    const a = (i / nBlad) * Math.PI * 2 + toeval() * 0.4;
    const op = i % 2 ? 0.15 + toeval() * 0.25 : 0.45 + toeval() * 0.3;
    bouwer.voegToe(blad, {
      matrix: matrix(top.x, top.y, top.z, -op, a, (toeval() - 0.5) * 0.4),
      zwaai: (p, eigen) => 0.7 + eigen * 1.4,
    });
  }
  blad.dispose();

  // Een groen kraagje en drie kokosnoten onder de kroon.
  const kraag = maakBol(0.36, detail > 0 ? 1 : 0);
  bouwer.voegToe(kraag, { matrix: matrix(top.x, top.y - 0.05, top.z, 0, 0, 0, 1, 0.7, 1), kleur: 0x8ccf5a, zwaai: 0.7 });
  kraag.dispose();
  if (detail >= 0) {
    const noot = maakBol(0.22, detail > 0 ? 1 : 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      bouwer.voegToe(noot, { matrix: matrix(top.x + Math.cos(a) * 0.28, top.y - 0.32, top.z + Math.sin(a) * 0.28), kleur: P.nootKleur, zwaai: 0.7 });
    }
    noot.dispose();
  }
  return bouwer.maak();
}
