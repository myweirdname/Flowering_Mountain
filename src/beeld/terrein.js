// Tekent het terrein uit hetzelfde hoogteraster dat de simulatie gebruikt (TP 5.2).
import * as THREE from 'three';

/**
 * @param {ReturnType<typeof import('../sim/wereld/raster.js').maakRaster>} r
 * @param {typeof import('../data/terrein.js').TERREIN} t
 */
export function maakTerrein(r, t) {
  const p = r.punten;
  const posities = new Float32Array(p * p * 3);
  const kleuren = new Float32Array(p * p * 3);
  const laag = new THREE.Color(t.grasLaag);
  const hoog = new THREE.Color(t.grasHoog);
  const rots = new THREE.Color(t.rots);
  const k = new THREE.Color();

  for (let j = 0; j < p; j++) {
    for (let i = 0; i < p; i++) {
      const n = j * p + i;
      const x = r.begin + i * r.stap;
      const z = r.begin + j * r.stap;
      const h = r.hoogtes[n];
      posities.set([x, h, z], n * 3);

      // Kleur: lager is dieper groen, hoger lichter; steil wordt rots.
      const [gx, gz] = r.hellingOp(x + 0.01, z + 0.02);
      const steil = THREE.MathUtils.smoothstep(Math.hypot(gx, gz), 0.75, 1.1);
      const hoogte = THREE.MathUtils.clamp((h + t.heuvelHoogte) / (t.heuvelHoogte * 2 + 2), 0, 1);
      // Kleine vlekjes zodat het gras niet egaal is.
      const vlek = (Math.sin(x * 0.9 + z * 0.3) * Math.sin(z * 0.7 - x * 0.2)) * 0.06;
      k.copy(laag).lerp(hoog, THREE.MathUtils.clamp(hoogte + vlek, 0, 1)).lerp(rots, steil);
      kleuren.set([k.r, k.g, k.b], n * 3);
    }
  }

  // Zelfde schuine lijn als in de simulatie: van (i,j) naar (i+1,j+1).
  const cellen = r.n;
  const index = new Uint32Array(cellen * cellen * 6);
  let q = 0;
  for (let j = 0; j < cellen; j++) {
    for (let i = 0; i < cellen; i++) {
      const a = j * p + i;      // (i, j)
      const b = a + 1;          // (i+1, j)
      const c = a + p;          // (i, j+1)
      const d = a + p + 1;      // (i+1, j+1)
      index.set([a, d, b, a, c, d], q);
      q += 6;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posities, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();

  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
