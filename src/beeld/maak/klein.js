// Klein spul: grasplukjes en ronde kawaii-rotsen.
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './vorm.js';
import { waardenruis } from '../../sim/wereld/ruis.js';

const k = new THREE.Color();
const kA = new THREE.Color();
const kB = new THREE.Color();

/**
 * Een plukje gras: een paar zachte sprietjes die naar buiten buigen.
 * @param {typeof import('../../data/flora.js').FLORA.gras} G
 */
export function maakGras(G, detail) {
  const n = detail ? 6 : 4;
  const pos = [];
  const kleur = [];
  const zwaai = [];
  kA.set(G.kleur);
  kB.set(G.punt);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i * 0.7;
    const h = G.hoogte * (0.7 + ((i * 37) % 10) / 20);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const b = 0.035;
    const ux = c * 0.06;
    const uz = s * 0.06;
    // Spriet: twee driehoeken, onderaan breed, bovenaan een punt die naar buiten buigt.
    const v0 = [ux - s * b, 0, uz + c * b];
    const v1 = [ux + s * b, 0, uz - c * b];
    const m = [ux * 2.2 + 0, h * 0.55, uz * 2.2];
    const ml = [m[0] - s * b * 0.8, m[1], m[2] + c * b * 0.8];
    const mr = [m[0] + s * b * 0.8, m[1], m[2] - c * b * 0.8];
    const t = [ux * 5, h, uz * 5];
    for (const [p, kl, zw] of [
      [v0, kA, 0], [v1, kA, 0], [ml, kA, 0.5],
      [v1, kA, 0], [mr, kA, 0.5], [ml, kA, 0.5],
      [ml, kA, 0.5], [mr, kA, 0.5], [t, kB, 1],
    ]) {
      pos.push(...p);
      k.copy(kl);
      if (kl === kA && p[1] > 0) k.lerp(kB, 0.4);
      kleur.push(k.r, k.g, k.b);
      zwaai.push(zw * 1.4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kleur, 3));
  geo.setAttribute('zwaai', new THREE.Float32BufferAttribute(zwaai, 1));
  // Normalen naar boven: gras is dan even licht als de grond eronder (geen donkere sprietjes).
  const nor = new Float32Array(pos.length);
  for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return new Bouwer().voegToe(geo).maak();
}

/** Een ronde, zachte rots. De kleur komt per rots uit de instance-kleur. */
export function maakRots(detail) {
  const g = maakBol(1, detail ? 2 : 1);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const bult = 1 + (waardenruis(p.x * 1.6 + 3, p.z * 1.6 + p.y, 99) - 0.5) * 0.35;
    pos.setXYZ(i, p.x * bult, p.y * bult * 0.62 - 0.18, p.z * bult * 0.85);
    // Gladde normaal van een afgeplatte bol: zacht en rond, geen facetten.
    p.set(p.x, p.y / 0.62, p.z / 0.85).normalize();
    nor.setXYZ(i, p.x, p.y, p.z);
  }
  return new Bouwer()
    .voegToe(g, {
      kleur: (q) => k.setScalar(0.78 + 0.22 * THREE.MathUtils.clamp(q.y * 1.2 + 0.4, 0, 1)),
      zwaai: 0,
    })
    .maak();
}

/**
 * Een rond, dicht bosje (stap 8d): een donkere kern vol blaadjes, met hier en daar een bloemetje.
 * Net zo hoog als een welpje zonder zijn oortjes, zodat een verstopt welpje echt weg is ... op zijn oortjes na.
 * @param {typeof import('../../data/flora.js').FLORA.bosje} B
 * @param {number} detail 1 = dichtbij (meer blaadjes)
 * @param {() => number} toeval
 */
export function maakBosje(B, detail, toeval) {
  const b = new Bouwer();
  const [rx, ry] = B.kern;
  // De kern: een afgeplatte koepel, donker vanbinnen (je kijkt er nooit doorheen).
  const kern = maakBol(1, detail ? 2 : 1);
  const kp = kern.attributes.position;
  for (let i = 0; i < kp.count; i++) {
    const y = kp.getY(i);
    kp.setXYZ(i, kp.getX(i) * rx, Math.max(-0.1, y) * ry, kp.getZ(i) * rx);
  }
  kA.set(B.binnen);
  kB.set(B.blad);
  b.voegToe(kern, { kleur: (q) => k.copy(kA).lerp(kB, THREE.MathUtils.clamp(q.y / ry, 0, 1) * 0.55), zwaai: (q) => q.y * 0.15 });
  // Blaadjes over de koepel, naar buiten en een beetje omhoog gericht.
  const blad = new THREE.BufferGeometry();
  const L = B.bladLengte;
  const W = L * 0.42;
  blad.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, W, 0.02, L * 0.45, 0, 0.05, L, 0, 0, 0, 0, 0.05, L, -W, 0.02, L * 0.45], 3));
  blad.computeVertexNormals();
  const n = detail ? B.blaadjes : Math.round(B.blaadjes * 0.6);
  const licht = new THREE.Color(B.bladLicht);
  for (let i = 0; i < n; i++) {
    // Gelijkmatig over de koepel (gulden hoek), van de rand tot de top.
    const t = (i + 0.5) / n;
    const hoogte = Math.sqrt(t) * 0.95;
    const a = i * 2.39996 + toeval() * 0.4;
    const r = Math.sqrt(1 - hoogte * hoogte);
    const x = Math.cos(a) * r * rx * 0.97;
    const z = Math.sin(a) * r * rx * 0.97;
    const y = hoogte * ry * 0.97;
    const ry_ = Math.atan2(x, z);
    const op = -0.25 - hoogte * 0.9 + (toeval() - 0.5) * 0.4;
    const tint = toeval();
    b.voegToe(blad, {
      matrix: matrix(x, y, z, op, ry_ + (toeval() - 0.5) * 0.6, 0, 0.8 + toeval() * 0.45),
      kleur: () => k.copy(kB).lerp(licht, tint * 0.7),
      zwaai: (q) => 0.25 + q.y * 0.6,
    });
  }
  // Een paar bloemetjes bovenop.
  const bol = maakBol(0.035, 0);
  for (let i = 0; i < B.bloemen; i++) {
    const a = toeval() * Math.PI * 2;
    const h = 0.45 + toeval() * 0.5;
    const r = Math.sqrt(1 - h * h);
    const kleur = B.bloemKleuren[i % B.bloemKleuren.length];
    b.voegToe(bol, { matrix: matrix(Math.cos(a) * r * rx * 1.02, h * ry * 1.04, Math.sin(a) * r * rx * 1.02), kleur, zwaai: 0.3 });
  }
  return b.maak();
}
