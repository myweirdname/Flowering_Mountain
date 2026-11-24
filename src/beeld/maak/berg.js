// De verre berg aan de horizon uit stap 4: een zacht silhouet met drie etages en een roze gloed op de top.
// Sinds stap 12 staat de echte berg op het eiland; dit decor wordt niet meer getekend, maar blijft bewaard.
// maakTopGloed wordt wel nog gebruikt: de roze gloed op de echte top (daar komt later de Hartbloem).
import * as THREE from 'three';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** @param {typeof import('../../data/wereld.js').WERELD.verreBerg} B @param {number} horizon */
export function maakVerreBerg(B, horizon) {
  const ringen = 18;
  const zijden = 56;
  const pos = [];
  const kleur = [];
  const index = [];
  const voet = new THREE.Color(B.kleurVoet);
  const top = new THREE.Color(B.kleurTop);
  const waas = new THREE.Color(horizon);
  const k = new THREE.Color();
  const licht = new THREE.Vector3(0.35, 0.75, -0.55).normalize();
  const hoogteOp = (f, a) => {
    // f = 0 aan de voet, 1 op de top. Treden maken de etages met rotsranden ertussen.
    const t = f * B.etages;
    const trede = Math.floor(t) + glad((t - Math.floor(t) - 0.55) / 0.4);
    const g = Math.min(1, trede / B.etages) * 0.75 + f * 0.25;
    return B.hoogte * Math.pow(g, 1.15) * (1 + 0.06 * Math.sin(a * 3 + f * 4));
  };
  for (let i = 0; i <= ringen; i++) {
    const f = i / ringen;
    for (let j = 0; j <= zijden; j++) {
      const a = (j / zijden) * Math.PI * 2;
      const r = B.straal * (1 - f) * (1 + 0.12 * Math.sin(a * 2 + 1) + 0.06 * Math.sin(a * 5));
      pos.push(Math.cos(a) * r, hoogteOp(f, a), Math.sin(a) * r);
    }
  }
  const rij = zijden + 1;
  for (let i = 0; i < ringen; i++) {
    for (let j = 0; j < zijden; j++) {
      const a = i * rij + j;
      index.push(a, a + rij, a + 1, a + 1, a + rij, a + rij + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  // Licht en waas in de puntkleuren: onderaan lost de berg op in de horizon.
  const nor = geo.attributes.normal;
  const n = new THREE.Vector3();
  for (let i = 0; i < nor.count; i++) {
    n.fromBufferAttribute(nor, i);
    const y = pos[i * 3 + 1] / B.hoogte;
    const vlak = glad((n.y - 0.6) / 0.3); // etages groener, rotsranden lila
    k.copy(top).lerp(voet, vlak * (1 - y * 0.6));
    k.multiplyScalar(0.78 + 0.32 * Math.max(0, n.dot(licht)));
    k.lerp(waas, 0.45 + 0.5 * (1 - glad(y / 0.35)));
    kleur.push(k.r, k.g, k.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kleur, 3));
  const berg = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  berg.position.set(-80, -6, B.afstand);
  berg.renderOrder = -8;

  const gloed = maakTopGloed(B.hartbloem);
  gloed.position.set(berg.position.x, berg.position.y + B.hoogte + 6, berg.position.z);
  gloed.scale.setScalar(70);
  return { berg, gloed };
}

/** Een zacht roze gloeiende bol (een sprite) voor op de top. @param {number} kleur */
export function maakTopGloed(kleur) {
  const k = new THREE.Color(kleur);
  const rgb = `${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)}`;
  const n2 = 64;
  const doek = document.createElement('canvas');
  doek.width = doek.height = n2;
  const g = doek.getContext('2d');
  const v = g.createRadialGradient(n2 / 2, n2 / 2, 0, n2 / 2, n2 / 2, n2 / 2);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(0.25, `rgba(${rgb},0.9)`);
  v.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = v;
  g.fillRect(0, 0, n2, n2);
  const tex = new THREE.CanvasTexture(doek);
  tex.colorSpace = THREE.SRGBColorSpace;
  const gloed = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  gloed.renderOrder = -7;
  return gloed;
}
