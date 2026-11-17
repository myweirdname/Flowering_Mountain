// De bladgenerator (TP 5.5): één functie maakt elk soort tropisch blad uit "genen":
// vorm (hart, pijl, peddel, ovaal, veer), lengte, breedte, lobben, kom, buiging, nerven en kleuren.
// Dezelfde generator maakt ook bloemblaadjes en schutbladen (met een kleurverloop).
import * as THREE from 'three';
import { Bouwer, maakBuis, matrix } from './vorm.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const kA = new THREE.Color();
const kB = new THREE.Color();

/** Halve breedte (0..1) van het blad op plek v langs de lengte, plus de inkeping bij de lobben. */
function omtrek(g, v) {
  if (v < 0) {
    // Lobben achter de steel (hart en pijl): twee ronde oortjes met een inkeping ertussen.
    const t = Math.min(1, -v / g.lob);
    const s = Math.sqrt(Math.max(0, 1 - t * t));
    return [0.5 + 0.5 * s, 0.5 - 0.5 * s];
  }
  switch (g.vorm) {
    case 'hart':
      return [Math.pow(Math.max(0, 1 - Math.pow(v, 2.2)), 0.6), 0];
    case 'pijl':
      return [Math.pow(1 - v, 0.8) * (1 + 0.9 * v) * 0.88, 0];
    case 'peddel': {
      const t = 2 * v - 1;
      return [Math.sqrt(Math.max(0, 1 - t ** 6)), 0];
    }
    case 'veer': {
      const e = Math.pow(Math.max(0, 1 - v), 0.55) * glad(v * 5);
      return [e * (0.3 + 0.7 * Math.pow(Math.abs(Math.sin(v * g.lobben * Math.PI)), 0.6)), 0];
    }
    default: // ovaal
      return [Math.pow(Math.sin(Math.PI * Math.min(1, v)), 0.65), 0];
  }
}

/**
 * @param {{ vorm:string, lengte:number, breedte:number, lob?:number, lobben?:number, kleur:number, nerf?:number, rand?:number,
 *           kom?:number, buiging?:number, nerven?:number, golf?:number, verloop?:number[], nL?:number, nW?:number }} g
 *   verloop: [voet, midden, punt] voor bloemblaadjes in plaats van nerven
 * @param {number} detail 0 of 1
 * @returns {THREE.BufferGeometry} blad in het xz-vlak: de steel op de oorsprong, de punt naar +z, bovenkant +y
 */
export function maakBlad(g, detail) {
  const lob = g.vorm === 'hart' || g.vorm === 'pijl' ? g.lob ?? 0.15 : 0;
  const L = g.lengte;
  const B = g.breedte / 2;
  let nL;
  let nW;
  if (g.vorm === 'veer') { nL = (g.lobben ?? 7) * (detail ? 3 : 2); nW = 1; }
  else if (g.vorm === 'hart' || g.vorm === 'pijl') { nL = detail ? 8 : 4; nW = detail ? 3 : 1; }
  else if (g.vorm === 'peddel') { nL = detail ? 8 : 4; nW = detail ? 2 : 1; }
  else { nL = detail ? 5 : 3; nW = detail ? 2 : 1; }
  nL = g.nL ?? nL;
  nW = g.nW ?? nW;

  const kom = g.kom ?? 0;
  const buiging = g.buiging ?? 0;
  const basis = new THREE.Color(g.kleur);
  const nerf = new THREE.Color(g.nerf ?? g.kleur);
  const rand = new THREE.Color(g.rand ?? g.kleur);
  const verloop = g.verloop?.map((c) => new THREE.Color(c));

  const pos = [];
  const kleur = [];
  const zwaai = [];
  const bladpos = [];
  const index = [];
  const k = new THREE.Color();
  const kolommen = nW + 1;

  for (const kant of [1, -1]) {
    const start = pos.length / 3;
    for (let i = 0; i <= nL; i++) {
      const v = -lob + ((1 + lob) * i) / nL;
      const [w, inkeping] = omtrek(g, v);
      for (let j = 0; j <= nW; j++) {
        const s = j / nW;
        const xn = inkeping + s * (w - inkeping); // 0 = middennerf, 1 = rand
        const x = kant * xn * B;
        const vz = Math.max(v, 0);
        let y = kom * xn * xn * B + xn * 0.04 * B - buiging * vz * vz * L - 0.15 * buiging * Math.min(v, 0) ** 2 * L;
        if (g.golf) y += g.golf * Math.sin(v * 13) * s * s * B * 0.15;
        pos.push(x, y, v * L);

        if (verloop) {
          // Bloemblaadje: van het hart naar de rand.
          if (vz < 0.35) k.copy(verloop[0]).lerp(verloop[1], glad(vz / 0.35));
          else k.copy(verloop[1]).lerp(verloop[2], glad((vz - 0.35) / 0.65) * 0.8);
        } else {
          k.copy(basis);
          if (j === 0 && v >= 0) k.lerp(nerf, 0.85);
          if (g.nerven) {
            const streep = glad((Math.abs(Math.sin((v * 6.5 + s * 0.9) * Math.PI)) - 0.55) / 0.45);
            k.lerp(nerf, streep * g.nerven * 0.75 * (1 - s * 0.6));
          }
          if (j === nW) k.lerp(rand, 0.6);
          if (v < 0.1) k.multiplyScalar(0.9);
        }
        kleur.push(k.r, k.g, k.b);
        zwaai.push((v + lob) / (1 + lob));
        bladpos.push(kant * xn, v);
      }
    }
    for (let i = 0; i < nL; i++) {
      for (let j = 0; j < nW; j++) {
        const a = start + i * kolommen + j;
        const b = a + 1;
        const c = a + kolommen;
        const d = c + 1;
        if (kant > 0) index.push(a, c, b, b, c, d);
        else index.push(a, b, c, b, d, c);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kleur, 3));
  geo.setAttribute('zwaai', new THREE.Float32BufferAttribute(zwaai, 1));
  geo.setAttribute('bladpos', new THREE.Float32BufferAttribute(bladpos, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Een bladplant: bladeren op stelen rond één voet, eventueel op een schijnstam (banaan).
 * @param {typeof import('../../data/flora.js').FLORA.bladplanten.monstera & { stam?: any }} P
 * @param {number} detail
 * @param {() => number} toeval
 */
export function maakBladplant(P, detail, toeval) {
  const bouwer = new Bouwer();
  const blad = maakBlad(P.blad, detail);
  const n = detail ? P.aantal : Math.max(3, Math.round(P.aantal * 0.65));
  let voetY = 0;
  if (P.stam) {
    const S = P.stam;
    const stam = maakBuis(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, S.hoogte * 0.5, 0), new THREE.Vector3(0, S.hoogte, 0.03)],
      (t) => S.dikte * (1.15 - 0.4 * t),
      detail ? 4 : 2,
      detail ? 7 : 5
    );
    bouwer.voegToe(stam, { kleur: S.kleur, zwaai: (p) => (p.y / S.hoogte) ** 2 * 0.25 });
    voetY = S.hoogte * 0.92;
  }

  const top = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const draai = i * 2.39996 + toeval() * 0.35; // de gulden hoek: bladeren verdelen zich mooi
    const kanteling = P.spreiding * (0.55 + 0.7 * toeval()); // 0 = recht omhoog
    const lengte = P.steel * (0.7 + 0.5 * toeval());
    const uit = new THREE.Vector3(Math.sin(draai), 0, Math.cos(draai));
    top.set(uit.x * Math.sin(kanteling) * lengte, voetY + Math.cos(kanteling) * lengte, uit.z * Math.sin(kanteling) * lengte);
    if (lengte > 0.05) {
      const steel = maakBuis(
        [new THREE.Vector3(0, voetY, 0), new THREE.Vector3(top.x * 0.4, voetY + (top.y - voetY) * 0.6, top.z * 0.4), top.clone()],
        (t) => 0.035 * (1 - 0.45 * t) * Math.max(0.6, P.blad.lengte),
        detail ? 3 : 2,
        detail ? 4 : 3
      );
      bouwer.voegToe(steel, { kleur: P.steelKleur, zwaai: (p) => Math.max(0, p.y - voetY) * 0.25 });
    }
    // Het blad: omhoog gekanteld (de ingebouwde buiging laat de punt weer hangen).
    const opwaarts = P.steel > 0 ? 0.25 + toeval() * 0.4 : 0.75 + toeval() * 0.45;
    const voetZwaai = Math.max(0, top.y - voetY) * 0.25 + (P.stam ? 0.25 : 0);
    bouwer.voegToe(blad, {
      matrix: matrix(top.x, top.y, top.z, -opwaarts, draai, (toeval() - 0.5) * 0.35),
      zwaai: (p, eigen) => voetZwaai + eigen * 0.9,
    });
  }
  blad.dispose();
  return bouwer.maak();
}
