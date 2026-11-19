// Een echt dierenoog (voor de echte tijger, TP 5.7): amandelvormig, met de binnenhoek omlaag naar
// de snuit, een iris met een donkere ring en fijne vezels, een ronde pupil (tijgers hebben ronde
// pupillen), een zwart ooglidrandje, de schaduw van het bovenste ooglid en een glimlichtje.
// Het bovenste ooglid bedekt een stukje van de iris: dat geeft de strenge, gevaarlijke blik.
// Getekend door een kleine shader: scherp van dichtbij en toch goedkoop op een gsm.
// Knipperen gaat zoals bij maakDierOog: `knipper.scale.y` naar 0.
import * as THREE from 'three';

const OOG = /* glsl */ `
varying vec2 vOog;
uniform vec3 uIris;
uniform vec3 uIrisRand;
uniform vec3 uDonker;
uniform vec3 uVorm;
uniform vec2 uGlim;
// q: plaats in het oog, x van -1 (binnenhoek) tot 1 (buitenhoek), y omhoog, in halve oogbreedtes.
vec3 oogKleur(vec2 q) {
  float x = clamp(q.x, -1.0, 1.0);
  float k = max(1.0 - x * x, 0.0);
  float boven = uVorm.x * pow(k, 0.75) + uVorm.z * x;
  float onder = -uVorm.y * pow(k, 0.7) + uVorm.z * x;
  float vanBoven = boven - q.y;
  float vanOnder = q.y - onder;
  float rand = min(vanBoven, vanOnder);
  // Iris en pupil (rond), iets hoog: het bovenste ooglid snijdt er een stukje af.
  vec2 d = q - vec2(0.02, 0.07);
  float r = length(d);
  float aa = fwidth(r) + 0.004;
  const float irisR = 0.66;
  const float pupilR = 0.2;
  float hoek = atan(d.y, d.x);
  float vezel = sin(hoek * 41.0 + sin(hoek * 9.0) * 1.7) * 0.5 + 0.5;
  vec3 iris = mix(uIris * 1.2 + 0.03, uIris, smoothstep(pupilR, irisR * 0.8, r));
  iris = mix(iris, uIrisRand, smoothstep(irisR * 0.6, irisR, r));
  iris *= 0.84 + 0.3 * vezel * smoothstep(pupilR, pupilR + 0.12, r);
  vec3 wit = vec3(0.42, 0.35, 0.26);
  vec3 kleur = mix(iris, wit, smoothstep(irisR - aa, irisR + aa, r));
  kleur = mix(uDonker, kleur, smoothstep(pupilR - aa, pupilR + aa, r));
  // Schaduw van het bovenste ooglid.
  kleur *= mix(0.38, 1.0, smoothstep(0.0, 0.36, vanBoven));
  // Zwart ooglidrandje rondom, en de donkere traanhoek.
  kleur = mix(uDonker, kleur, smoothstep(0.05, 0.13, rand));
  kleur = mix(uDonker, kleur, smoothstep(-1.02, -0.86, q.x));
  // Glimlichtjes.
  float glim = 1.0 - smoothstep(0.07, 0.115, length(q - uGlim));
  float glim2 = 1.0 - smoothstep(0.025, 0.055, length(q - vec2(0.26, -0.14)));
  kleur = mix(kleur, vec3(1.0), max(glim * 0.9, glim2 * 0.45));
  return kleur;
}
`;

/**
 * @param {{ breedte: number, kant: number, iris: number, irisRand: number, donker: number,
 *           kromming: number, boven?: number, onder?: number, kanteling?: number }} o
 *   breedte: halve breedte van het oog (meter); kant: 1 = linkeroog (+x), -1 = rechteroog;
 *   kromming: straal waarmee het oog meebuigt met het hoofd;
 *   boven/onder: hoe bol het boven- en onderooglid is; kanteling: buitenhoek hoger (streng)
 */
export function maakEchtOog(o) {
  const R = o.breedte;
  const hB = o.boven ?? 0.44;
  const hO = o.onder ?? 0.38;
  const kant = o.kanteling ?? 0.17;
  const boven = (x) => hB * Math.pow(Math.max(0, 1 - x * x), 0.75) + kant * x;
  const onder = (x) => -hO * Math.pow(Math.max(0, 1 - x * x), 0.7) + kant * x;
  // Omtrek: van de binnenhoek (met een puntje omlaag, de traanhoek) over het bovenste ooglid naar
  // de buitenhoek, en terug over het onderste. +x = buitenkant.
  const N = 26;
  const punten = [new THREE.Vector2(-1.13, boven(-1) - 0.17)];
  for (let i = 0; i <= N; i++) {
    const x = -1 + (2 * i) / N;
    punten.push(new THREE.Vector2(x, boven(x)));
  }
  for (let i = N - 1; i >= 1; i--) {
    const x = -1 + (2 * i) / N;
    punten.push(new THREE.Vector2(x, onder(x)));
  }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(punten));
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv[i * 2] = x;
    uv[i * 2 + 1] = y;
    // Spiegelen voor het rechteroog, en licht bol volgens de kromming van het hoofd.
    const px = x * R * o.kant;
    const py = y * R;
    const k = o.kromming;
    pos.setXYZ(i, px, py, -(k - Math.sqrt(Math.max(0, k * k - px * px - py * py))));
  }
  geo.setAttribute('oogUv', new THREE.BufferAttribute(uv, 2));
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');

  const uniforms = {
    uIris: { value: new THREE.Color(o.iris) },
    uIrisRand: { value: new THREE.Color(o.irisRand) },
    uDonker: { value: new THREE.Color(o.donker) },
    uVorm: { value: new THREE.Vector3(hB, hO, kant) },
    // Het glimlichtje staat bij beide ogen aan dezelfde kant (zelfde licht).
    uGlim: { value: new THREE.Vector2(-0.22 * o.kant, 0.24) },
  };
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 oogUv;\nvarying vec2 vOog;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOog = oogUv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${OOG}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = oogKleur(vOog);');
  };
  mat.customProgramCacheKey = () => 'echt-oog';

  const knipper = new THREE.Group();
  knipper.add(new THREE.Mesh(geo, mat));
  const groep = new THREE.Group();
  groep.add(knipper);
  return { groep, knipper };
}
