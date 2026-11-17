// Bouwstenen voor procedurele vormen: stukken samenvoegen tot één geometrie (één tekenopdracht),
// buizen met een dikteprofiel (stammen, stelen, lianen; later ook poten en staarten) en bollen.
// Elk punt krijgt een kleur, een "zwaai" (hoeveel het in de wind beweegt) en een bladpositie
// (voor gaatjes in monstera's en scheurtjes in bananenbladeren).
import * as THREE from 'three';

const tmp = new THREE.Vector3();
const kl = new THREE.Color();

export class Bouwer {
  constructor() {
    /** @type {{ g: THREE.BufferGeometry, kleur: Float32Array, zwaai: Float32Array, bladpos: Float32Array }[]} */
    this.delen = [];
  }

  /**
   * @param {THREE.BufferGeometry} geo
   * @param {{ matrix?: THREE.Matrix4, kleur?: number | THREE.Color | ((p: THREE.Vector3, i: number, g: THREE.BufferGeometry) => THREE.Color),
   *           zwaai?: number | ((p: THREE.Vector3, eigen: number, i: number, g: THREE.BufferGeometry) => number) }} o
   * Kleur en zwaai worden berekend na de matrix, dus in plantcoördinaten (y = hoogte boven de voet).
   * Zonder `kleur` wordt de eigen kleur van de geometrie gebruikt.
   */
  voegToe(geo, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (o.matrix) g.applyMatrix4(o.matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position;
    const n = pos.count;
    const kleur = new Float32Array(n * 3);
    const zwaai = new Float32Array(n);
    const bladpos = new Float32Array(n * 2).fill(-9);
    const eigenKleur = g.attributes.color;
    const eigenZwaai = g.attributes.zwaai;
    const eigenBlad = g.attributes.bladpos;
    for (let i = 0; i < n; i++) {
      tmp.fromBufferAttribute(pos, i);
      if (typeof o.kleur === 'function') kl.copy(o.kleur(tmp, i, g));
      else if (o.kleur !== undefined) kl.set(o.kleur);
      else if (eigenKleur) kl.fromBufferAttribute(eigenKleur, i);
      else kl.set(0xffffff);
      kleur[i * 3] = kl.r;
      kleur[i * 3 + 1] = kl.g;
      kleur[i * 3 + 2] = kl.b;
      const eigen = eigenZwaai ? eigenZwaai.getX(i) : 0;
      zwaai[i] = typeof o.zwaai === 'function' ? o.zwaai(tmp, eigen, i, g) : o.zwaai ?? eigen;
      if (eigenBlad) {
        bladpos[i * 2] = eigenBlad.getX(i);
        bladpos[i * 2 + 1] = eigenBlad.getY(i);
      }
    }
    this.delen.push({ g, kleur, zwaai, bladpos });
    return this;
  }

  /** Alles samen als één geometrie. */
  maak() {
    let n = 0;
    for (const d of this.delen) n += d.g.attributes.position.count;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const kleur = new Float32Array(n * 3);
    const zwaai = new Float32Array(n);
    const bladpos = new Float32Array(n * 2);
    let o = 0;
    for (const d of this.delen) {
      const c = d.g.attributes.position.count;
      pos.set(d.g.attributes.position.array, o * 3);
      nor.set(d.g.attributes.normal.array, o * 3);
      kleur.set(d.kleur, o * 3);
      zwaai.set(d.zwaai, o);
      bladpos.set(d.bladpos, o * 2);
      o += c;
      d.g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(kleur, 3));
    geo.setAttribute('zwaai', new THREE.BufferAttribute(zwaai, 1));
    geo.setAttribute('bladpos', new THREE.BufferAttribute(bladpos, 2));
    geo.computeBoundingSphere();
    this.delen = [];
    return geo;
  }
}

/**
 * Een buis langs een vloeiende lijn door `punten`, met een straal die verloopt langs de lengte.
 * Het attribuut `langs` (0 aan het begin, 1 aan het einde) helpt bij kleuren en zwaaien.
 * @param {THREE.Vector3[]} punten
 * @param {(t: number) => number} straal
 * @param {number} ringen
 * @param {number} zijden
 */
export function maakBuis(punten, straal, ringen, zijden) {
  const lijn = new THREE.CatmullRomCurve3(punten);
  const kaders = lijn.computeFrenetFrames(ringen, false);
  const pos = [];
  const nor = [];
  const langs = [];
  const index = [];
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let i = 0; i <= ringen; i++) {
    const t = i / ringen;
    lijn.getPointAt(t, p);
    const r = straal(t);
    const N = kaders.normals[i];
    const B = kaders.binormals[i];
    for (let j = 0; j <= zijden; j++) {
      const a = (j / zijden) * Math.PI * 2;
      nrm.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      pos.push(p.x + nrm.x * r, p.y + nrm.y * r, p.z + nrm.z * r);
      nor.push(nrm.x, nrm.y, nrm.z);
      langs.push(t);
    }
  }
  const rij = zijden + 1;
  for (let i = 0; i < ringen; i++) {
    for (let j = 0; j < zijden; j++) {
      const a = i * rij + j;
      const b = a + rij;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('langs', new THREE.Float32BufferAttribute(langs, 1));
  geo.setIndex(index);
  return geo;
}

/** Een gladde bol: detail 0 en 1 zijn icosaëders (20 en 80 driehoeken), 2 is een fijnere bol (~180). */
export function maakBol(straal, detail) {
  const g = detail >= 2 ? new THREE.SphereGeometry(straal, 12, 8) : new THREE.IcosahedronGeometry(straal, detail);
  // Gladde normalen voor een zachte, ronde kawaii-look.
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i).normalize();
    nor.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  return g;
}

/** Hulp: een matrix uit positie, draaiing (Euler, YXZ) en schaal. */
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
export function matrix(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz));
}
