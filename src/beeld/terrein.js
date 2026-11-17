// Tekent het terrein (TP 5.2, 5.4): fijne tegels rond de speler, uit precies hetzelfde hoogteraster
// als de simulatie, en één grof vlak voor de verte. Onder geladen tegels laat het grove vlak zijn
// cellen weg; een "rokje" langs elke tegelrand verbergt de kiertjes tussen fijn en grof.
import * as THREE from 'three';
import { waardenruis } from '../sim/wereld/ruis.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Maakt de functie die de grondkleur op (x, z) geeft.
 * @param {ReturnType<typeof import('../sim/wereld/hoogte.js').maakWereldvorm>} vorm
 * @param {typeof import('../data/wereld.js').WERELD.kleuren} K
 */
export function maakGrondkleur(vorm, K) {
  const c = Object.fromEntries(Object.entries(K).map(([n, v]) => [n, new THREE.Color(v)]));
  const b = /** @type {any} */ ({});
  const zand = new THREE.Color();
  return function kleurOp(x, z, steil, uit) {
    vorm.bodem(x, z, b);
    const vlek = glad((waardenruis(x / 5, z / 5, 31) - 0.4) / 0.35);
    uit.copy(c.bos).lerp(c.mos, vlek * 0.8);
    uit.lerp(c.kampGras, b.kamp);
    uit.lerp(c.pad, Math.min(1, b.pad * 1.1));
    // Zand: droog bovenaan, nat bij de waterlijn, zacht geel onder water.
    zand.copy(c.zand).lerp(c.natZand, 1 - glad((b.h - 0.05) / 0.45));
    if (b.h < -0.1) zand.lerp(c.onderwater, glad((-b.h - 0.1) / 0.8));
    uit.lerp(zand, b.zand);
    uit.lerp(c.rots, glad((steil - 0.75) / 0.4));
    uit.multiplyScalar(0.95 + 0.1 * waardenruis(x * 0.6, z * 0.6, 7));
    return uit;
  };
}

/**
 * Eén fijne tegel uit het hoogteraster van de simulatie.
 * Met sprong 1 is elk punt van het raster een hoekpunt: precies wat de voeten van de speler voelen.
 * Met sprong 2 (verder weg) wordt elk tweede punt gebruikt: vier keer minder driehoeken, op afstand niet te zien.
 * @param {ReturnType<typeof import('../sim/wereld/raster.js').maakRaster>} r
 * @param {(x:number, z:number) => number} hoogte voor de buren net buiten de tegel (normalen)
 * @param {ReturnType<typeof maakGrondkleur>} kleurOp
 * @param {THREE.Material} materiaal
 * @param {number} sprong 1 of 2
 */
export function maakTegelTerrein(r, hoogte, kleurOp, materiaal, sprong = 1) {
  const P = r.punten;
  const H = r.hoogtes;
  const n = r.n / sprong; // cellen per zijde in deze tegel
  const p = n + 1;
  const st = r.stap * sprong;
  const totaal = p * p + 4 * p;
  const pos = new Float32Array(totaal * 3);
  const nor = new Float32Array(totaal * 3);
  const kl = new Float32Array(totaal * 3);
  const k = new THREE.Color();

  // Hoogte op rasterpunt (i, j) van deze tegel; net erbuiten rechtstreeks uit de hoogtefunctie.
  const hOp = (i, j) =>
    i >= 0 && i < p && j >= 0 && j < p ? H[j * sprong * P + i * sprong] : hoogte(r.beginX + i * st, r.beginZ + j * st);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < p; i++) {
      const q = (j * p + i) * 3;
      const x = r.beginX + i * st;
      const z = r.beginZ + j * st;
      const hl = hOp(i - 1, j);
      const hr = hOp(i + 1, j);
      const hd = hOp(i, j - 1);
      const hu = hOp(i, j + 1);
      const nx = hl - hr;
      const ny = 2 * st;
      const nz = hd - hu;
      const l = Math.hypot(nx, ny, nz);
      pos[q] = x;
      pos[q + 1] = H[j * sprong * P + i * sprong];
      pos[q + 2] = z;
      nor[q] = nx / l;
      nor[q + 1] = ny / l;
      nor[q + 2] = nz / l;
      kleurOp(x, z, Math.hypot(nx, nz) / (2 * st), k);
      kl[q] = k.r;
      kl[q + 1] = k.g;
      kl[q + 2] = k.b;
    }
  }

  const index = new Uint16Array(n * n * 6 + 4 * n * 6);
  let w = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * p + i;
      const b = a + 1;
      const c = a + p;
      const d = c + 1;
      // Zelfde schuine lijn als de simulatie.
      index[w++] = a; index[w++] = d; index[w++] = b;
      index[w++] = a; index[w++] = c; index[w++] = d;
    }
  }

  // Rokjes: langs elke rand een strook die 1,5 m naar beneden hangt (verbergt kiertjes met de buren),
  // met de driehoeken naar buiten gekeerd (daar kijk je naar het kiertje).
  let q = p * p;
  const randen = [
    [(t) => t, true],               // voorrand  (j = 0)
    [(t) => n * p + t, false],      // achterrand (j = n)
    [(t) => t * p, false],          // linkerrand (i = 0)
    [(t) => t * p + n, true],       // rechterrand (i = n)
  ];
  for (const [rand, rechts] of randen) {
    for (let t = 0; t <= n; t++) {
      const boven = rand(t);
      pos[q * 3] = pos[boven * 3];
      pos[q * 3 + 1] = pos[boven * 3 + 1] - 1.5;
      pos[q * 3 + 2] = pos[boven * 3 + 2];
      nor.copyWithin(q * 3, boven * 3, boven * 3 + 3);
      kl.copyWithin(q * 3, boven * 3, boven * 3 + 3);
      if (t > 0) {
        const a = rand(t - 1);
        const c = q - 1;
        if (rechts) { index[w++] = a; index[w++] = boven; index[w++] = c; index[w++] = boven; index[w++] = q; index[w++] = c; }
        else { index[w++] = a; index[w++] = c; index[w++] = boven; index[w++] = boven; index[w++] = c; index[w++] = q; }
      }
      q++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, materiaal);
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/**
 * Het grove landschap voor de verte: één mesh. `verberg` laat de cellen onder geladen tegels weg.
 * @param {ReturnType<typeof import('../sim/wereld/hoogte.js').maakWereldvorm>} vorm
 * @param {typeof import('../data/wereld.js').WERELD} W
 */
export function maakGrofTerrein(vorm, W, kleurOp, materiaal) {
  const S = W.grofStap;
  const half = W.verGebied;
  const n = Math.round((2 * half) / S);
  const p = n + 1;
  const H = new Float32Array(p * p);
  for (let j = 0; j < p; j++) for (let i = 0; i < p; i++) H[j * p + i] = vorm.hoogte(-half + i * S, -half + j * S);
  const pos = new Float32Array(p * p * 3);
  const nor = new Float32Array(p * p * 3);
  const kl = new Float32Array(p * p * 3);
  const k = new THREE.Color();
  const v = new THREE.Vector3();
  const h = (i, j) => H[Math.min(n, Math.max(0, j)) * p + Math.min(n, Math.max(0, i))];
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < p; i++) {
      const q = j * p + i;
      const x = -half + i * S;
      const z = -half + j * S;
      pos.set([x, H[q], z], q * 3);
      v.set(h(i - 1, j) - h(i + 1, j), 2 * S, h(i, j - 1) - h(i, j + 1)).normalize();
      nor.set([v.x, v.y, v.z], q * 3);
      kleurOp(x, z, Math.hypot(h(i + 1, j) - h(i - 1, j), h(i, j + 1) - h(i, j - 1)) / (2 * S), k);
      kl.set([k.r, k.g, k.b], q * 3);
    }
  }
  const index = new Uint32Array(n * n * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  const indexAttr = new THREE.BufferAttribute(index, 1);
  geo.setIndex(indexAttr);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, materiaal);
  mesh.matrixAutoUpdate = false;
  const T = W.tegelGrootte;

  /**
   * @param {(tx:number, tz:number) => boolean} geladen
   * @param {number} x @param {number} z waar de speler is
   * @param {number} max cellen verder dan dit liggen volledig in de mist en worden niet getekend
   */
  function verberg(geladen, x = 0, z = 0, max = Infinity) {
    let q = 0;
    const m2 = max * max;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const cx = -half + (i + 0.5) * S;
        const cz = -half + (j + 0.5) * S;
        if ((cx - x) ** 2 + (cz - z) ** 2 > m2) continue;
        if (geladen(Math.floor(cx / T), Math.floor(cz / T))) continue;
        const a = j * p + i;
        index[q++] = a;
        index[q++] = a + p + 1;
        index[q++] = a + 1;
        index[q++] = a;
        index[q++] = a + p;
        index[q++] = a + p + 1;
      }
    }
    geo.setDrawRange(0, q);
    indexAttr.needsUpdate = true;
  }
  verberg(() => false);
  return { mesh, verberg };
}
