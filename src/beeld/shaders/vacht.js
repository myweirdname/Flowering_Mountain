// Vachtmateriaal voor de dieren: zachte belichting met een lichte rand (pluizig, kawaii) en,
// voor tijgers, strepen in een shader (TP 5.7): vervormde banden met ruis, in de assen van het
// lichaam. Het attribuut `streep` (u, v, sterkte) zegt per punt hoe de strepen lopen; zo blijven
// ze mee bewegen met het lijf. Elke tijger krijgt een eigen zaadje voor zijn patroon.
import * as THREE from 'three';

const RUIS = /* glsl */ `
float vHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vRuis(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(vHash(i), vHash(i + vec2(1.0, 0.0)), u.x),
             mix(vHash(i + vec2(0.0, 1.0)), vHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float vFbm(vec2 p) {
  return vRuis(p) * 0.6 + vRuis(p * 2.13 + 5.3) * 0.3 + vRuis(p * 4.37 + 1.7) * 0.1;
}
// Eén tijgerstreep-veld: banden langs u, die smaller worden naar de buik (v -> 1) en
// elk op een eigen plek ophouden. Ruis maakt ze golvend, gerafeld en soms gevorkt.
float tijgerStreep(vec3 s) {
  float u = s.x * uStreep.x;
  float v = s.y;
  float w = u + (vFbm(vec2(u * 0.42 + uZaad, v * 2.3)) - 0.5) * uStreep.z * 1.7 + v * v * 0.5;
  float id = floor(w);
  float h = vHash(vec2(id, uZaad));
  float einde = 0.42 + 0.55 * h;
  float taps = 1.0 - smoothstep(einde - 0.32, einde, v);
  float dikte = uStreep.y * (0.55 + 0.9 * vRuis(vec2(id * 3.7, v * 3.1 + uZaad))) * taps;
  float d = abs(fract(w) - 0.5);
  float aa = fwidth(w) * 0.9 + 0.008;
  float streep = 1.0 - smoothstep(dikte * 0.5 - aa, dikte * 0.5 + aa, d);
  // Af en toe een dun zijstreepje (vorkje) naast de hoofdstreep.
  float h2 = vHash(vec2(id * 1.3, uZaad + 4.0));
  float d2 = abs(fract(w + 0.26 * sign(h2 - 0.5)) - 0.5);
  float vork = step(0.62, h2) * (1.0 - smoothstep(dikte * 0.22 - aa, dikte * 0.22 + aa, d2)) * (1.0 - smoothstep(0.15, einde - 0.1, v));
  return max(streep, vork) * s.z * uStreep.w;
}
`;

/**
 * @param {{ strepen?: { dichtheid: number, dikte: number, rafel: number, sterkte: number, zaad: number },
 *           streepKleur?: number, rand?: number, randKleur?: number, gloed?: number }} o
 */
export function maakVachtMateriaal(o = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const uniforms = {
    uStreep: { value: new THREE.Vector4() },
    uStreepKleur: { value: new THREE.Color(o.streepKleur ?? 0x222222) },
    uZaad: { value: 0 },
    uRand: { value: o.rand ?? 0.35 },
    uRandKleur: { value: new THREE.Color(o.randKleur ?? 0xfff6e8) },
    uGloed: { value: o.gloed ?? 0.16 },
  };
  if (o.strepen) {
    const s = o.strepen;
    uniforms.uStreep.value.set(s.dichtheid, s.dikte, s.rafel, s.sterkte);
    uniforms.uZaad.value = s.zaad;
  }
  const strepen = !!o.strepen;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 streep;\nvarying vec3 vStreep;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStreep = streep;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vStreep;
uniform vec4 uStreep;
uniform vec3 uStreepKleur;
uniform float uZaad;
uniform float uRand;
uniform vec3 uRandKleur;
uniform float uGloed;
${strepen ? RUIS : ''}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
${strepen ? 'diffuseColor.rgb = mix(diffuseColor.rgb, uStreepKleur, tijgerStreep(vStreep));' : ''}
totalEmissiveRadiance += diffuseColor.rgb * uGloed;`
      )
      .replace(
        '#include <opaque_fragment>',
        `float randLicht = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
outgoingLight += uRandKleur * pow(randLicht, 2.6) * uRand;
#include <opaque_fragment>`
      );
  };
  mat.customProgramCacheKey = () => (strepen ? 'vacht-strepen' : 'vacht');
  mat.userData.uniforms = uniforms;
  return mat;
}
