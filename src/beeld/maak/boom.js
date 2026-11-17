// Een junglereus in kawaii-stijl: een stevige stam met plankwortels, een kruin van bolle wolkjes
// en lianen die naar beneden hangen. Van ver wordt hij een eenvoudige "kruinbol" (TP 5.4).
import * as THREE from 'three';
import { Bouwer, maakBuis, maakBol, matrix } from './vorm.js';
import { maakBlad } from './blad.js';

const kTop = new THREE.Color();
const kOnder = new THREE.Color();
const kUit = new THREE.Color();
const wit = new THREE.Color(0xffffff);

/** Kleur voor een kruinbol: lichter bovenaan (zon), zachter donker onderaan. */
function kruinKleur(basis, ny) {
  kTop.set(basis).lerp(wit, 0.22);
  kOnder.set(basis).multiplyScalar(0.68);
  return kUit.copy(kOnder).lerp(kTop, ny * 0.5 + 0.5);
}

/**
 * @param {typeof import('../../data/flora.js').FLORA.boom} B
 * @param {number[]} kruinKleuren
 * @param {number} detail 1 (rijk), 0 (eenvoudig) of -1 (ver weg)
 * @param {() => number} toeval
 */
export function maakBoom(B, kruinKleuren, detail, toeval) {
  const bouwer = new Bouwer();
  const H = (B.hoogte[0] + B.hoogte[1]) / 2;

  const stam = maakBuis(
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, H * 0.35, 0.1), new THREE.Vector3(-0.2, H * 0.62, -0.1), new THREE.Vector3(0, H * 0.84, 0)],
    (t) => 0.55 * (1 - 0.45 * t) + 0.35 * (1 - Math.min(1, t * 5)),
    detail > 0 ? 8 : 4,
    detail > 0 ? 8 : 5
  );
  bouwer.voegToe(stam, { kleur: B.stamKleur, zwaai: (p) => (p.y / H) ** 2 * 0.3 });
  stam.dispose();

  // Plankwortels.
  if (detail >= 0) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + toeval() * 0.6;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const wortel = maakBuis(
        [new THREE.Vector3(0, 1.7, 0), new THREE.Vector3(c * 0.6, 0.6, s * 0.6), new THREE.Vector3(c * 1.7, -0.15, s * 1.7)],
        (t) => 0.26 * (1 - 0.6 * t),
        detail > 0 ? 4 : 2,
        4
      );
      bouwer.voegToe(wortel, { kleur: B.stamKleur, zwaai: 0 });
      wortel.dispose();
    }
  }

  // De kruin: één grote bol in het midden en een ring van kleinere eromheen.
  const n = detail > 0 ? B.kruinBollen : detail === 0 ? B.kruinBollen - 2 : 3;
  const bollen = [{ x: 0, y: H, z: 0, r: 3.4 }];
  for (let i = 1; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 2 + toeval() * 0.5;
    const afst = 2.5 + toeval() * 0.8;
    bollen.push({ x: Math.cos(a) * afst, y: H - 0.7 + toeval() * 1.1, z: Math.sin(a) * afst, r: 2.2 + toeval() * 0.7 });
  }
  const bolVorm = maakBol(1, detail > 0 ? 2 : 1);
  bollen.forEach((b, i) => {
    const basis = kruinKleuren[i % 2];
    bouwer.voegToe(bolVorm, {
      matrix: matrix(b.x, b.y, b.z, 0, toeval() * 6, 0, b.r, b.r * 0.82, b.r),
      kleur: (p) => kruinKleur(basis, (p.y - b.y) / (b.r * 0.82)),
      zwaai: (p) => 0.3 + Math.max(0, p.y - H * 0.7) * 0.05,
    });
    // Takken van de stam naar de bollen.
    if (detail > 0 && i > 0) {
      const tak = maakBuis(
        [new THREE.Vector3(0, H * 0.74, 0), new THREE.Vector3(b.x * 0.5, H * 0.82, b.z * 0.5), new THREE.Vector3(b.x * 0.8, b.y - b.r * 0.4, b.z * 0.8)],
        (t) => 0.22 * (1 - 0.5 * t),
        3,
        4
      );
      bouwer.voegToe(tak, { kleur: B.stamKleur, zwaai: 0.2 });
      tak.dispose();
    }
  });
  bolVorm.dispose();

  // Lianen die uit de kruin hangen, met blaadjes.
  if (detail >= 0) {
    const blaadje = maakBlad({ vorm: 'ovaal', lengte: 0.26, breedte: 0.15, kleur: B.liaanBlad, kom: 0.2, buiging: 0.2 }, 0);
    const nLiaan = detail > 0 ? B.lianen : 2;
    for (let i = 0; i < nLiaan; i++) {
      const b = bollen[1 + (i % (bollen.length - 1))];
      const start = new THREE.Vector3(b.x * 1.05, b.y - b.r * 0.6, b.z * 1.05);
      let punten;
      if (i === 0 && bollen.length > 2) {
        // Eén liaan hangt als een lus tussen twee bollen.
        const b2 = bollen[2];
        const eind = new THREE.Vector3(b2.x * 1.05, b2.y - b2.r * 0.6, b2.z * 1.05);
        const laag = new THREE.Vector3((start.x + eind.x) * 0.6, H - 6.5, (start.z + eind.z) * 0.6);
        punten = [start, start.clone().lerp(laag, 0.6).setY(H - 5), laag, eind.clone().lerp(laag, 0.6).setY(H - 5), eind];
      } else {
        const onder = 1.8 + toeval() * 3;
        const uit = 1 + toeval() * 0.3;
        punten = [
          start,
          new THREE.Vector3(start.x * uit, (start.y + onder) * 0.55, start.z * uit),
          new THREE.Vector3(start.x * (uit + 0.1), onder, start.z * (uit + 0.1)),
        ];
      }
      const liaan = maakBuis(punten, () => 0.055, detail > 0 ? 8 : 4, 3);
      const hoog = start.y;
      bouwer.voegToe(liaan, { kleur: B.liaanKleur, zwaai: (p) => 0.3 + (hoog - p.y) * 0.12 });
      liaan.dispose();
      // Blaadjes langs de liaan.
      const lijn = new THREE.CatmullRomCurve3(punten);
      const p = new THREE.Vector3();
      const nBlaadjes = detail > 0 ? 5 : 2;
      for (let k = 1; k <= nBlaadjes; k++) {
        lijn.getPointAt(k / (nBlaadjes + 1), p);
        bouwer.voegToe(blaadje, {
          matrix: matrix(p.x, p.y, p.z, 0.3, (k % 2 ? 1 : -1) * 1.6 + toeval(), 0),
          zwaai: 0.3 + (hoog - p.y) * 0.12,
        });
      }
    }
    blaadje.dispose();
  }
  return bouwer.maak();
}

/** Een kruinbol voor bomen ver weg: één zachte bol op de hoogte van de kruin. */
export function maakKruinbol(B, kruinKleuren, detail) {
  const H = (B.hoogte[0] + B.hoogte[1]) / 2;
  const bouwer = new Bouwer();
  const bol = maakBol(1, 1);
  bouwer.voegToe(bol, {
    matrix: matrix(0, H - 0.2, 0, 0, 0, 0, 4.4, 3.4, 4.4),
    kleur: (p) => kruinKleur(kruinKleuren[0], (p.y - (H - 0.2)) / 3.4),
    zwaai: 0.25,
  });
  bol.dispose();
  // Een eenvoudige stam, zodat de kruin niet zweeft en de echte boom straks op dezelfde plek verschijnt.
  const stam = maakBuis([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, H * 0.5, 0), new THREE.Vector3(0, H - 2, 0)], (t) => 0.6 * (1 - 0.4 * t), 1, 4);
  bouwer.voegToe(stam, { kleur: B.stamKleur, zwaai: 0 });
  stam.dispose();
  return bouwer.maak();
}
