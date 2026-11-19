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
#ifdef VACHT_FIJN
// Ruis in 3D, op de rustvorm van het lichaam: zo blijven de haartjes op hun plek als het dier beweegt.
float vHash3(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vRuis3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(vHash3(i), vHash3(i + vec3(1.0, 0.0, 0.0)), u.x), mix(vHash3(i + vec3(0.0, 1.0, 0.0)), vHash3(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(vHash3(i + vec3(0.0, 0.0, 1.0)), vHash3(i + vec3(1.0, 0.0, 1.0)), u.x), mix(vHash3(i + vec3(0.0, 1.0, 1.0)), vHash3(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}
#endif
// Eén tijgerstreep-veld: banden langs u, die smaller worden naar de buik (v -> 1) en
// elk op een eigen plek ophouden. Ruis maakt ze golvend, gerafeld en soms gevorkt.
float tijgerStreep(vec3 s) {
  float u = s.x * uStreep.x;
  float v = s.y;
  float w = u + (vFbm(vec2(u * 0.42 + uZaad, v * 2.3)) - 0.5) * uStreep.z * 1.7 + v * v * 0.5;
#ifdef VACHT_FIJN
  // Rafelige randen zoals bij echte haren: grove en fijne ruis op de plek van het lichaam.
  w += ((vRuis3(vRust * 16.0 + uZaad) - 0.5) * 0.3 + (vRuis3(vRust * 75.0) - 0.5) * 0.16) * uFijn.y;
#endif
  float id = floor(w);
  float h = vHash(vec2(id, uZaad));
  float einde = 0.42 + 0.55 * h;
  float taps = 1.0 - smoothstep(einde - 0.32, einde, v);
  float dikte = uStreep.y * (0.55 + 0.9 * vRuis(vec2(id * 3.7, v * 3.1 + uZaad))) * taps;
  float d = abs(fract(w) - 0.5);
  float aa = fwidth(w) * 0.9 + 0.008;
  float streep = 1.0 - smoothstep(dikte * 0.5 - aa, dikte * 0.5 + aa, d);
#ifdef VACHT_FIJN
  // Echte vacht: een streep loopt uit in een punt en vervaagt, in plaats van een haardun lijntje
  // te worden (dat leek op barstjes). Soms een dubbele streep, even dik als de helft.
  streep *= smoothstep(0.0, 0.4, taps);
  float h2 = vHash(vec2(id * 1.3, uZaad + 4.0));
  float d2 = abs(fract(w + 0.27 * sign(h2 - 0.5)) - 0.5);
  float vork = step(0.6, h2) * (1.0 - smoothstep(dikte * 0.28 - aa, dikte * 0.28 + aa, d2)) * (1.0 - smoothstep(0.1, einde - 0.2, v)) * smoothstep(0.0, 0.5, taps);
#else
  // Af en toe een dun zijstreepje (vorkje) naast de hoofdstreep.
  float h2 = vHash(vec2(id * 1.3, uZaad + 4.0));
  float d2 = abs(fract(w + 0.26 * sign(h2 - 0.5)) - 0.5);
  float vork = step(0.62, h2) * (1.0 - smoothstep(dikte * 0.22 - aa, dikte * 0.22 + aa, d2)) * (1.0 - smoothstep(0.15, einde - 0.1, v));
#endif
#ifdef VACHT_FIJN
  // Naden: waar u onnatuurlijk snel verandert over het lijf (twee buurpunten met een ander streeppatroon),
  // zou één driehoekje een bundel dunne lijntjes krijgen. Daar geen strepen. Gewone strepen veranderen
  // hoogstens ±3 per meter (gemeten ±4); zo'n naad 20 of meer. Hangt niet af van hoe ver je kijkt.
  float snel = fwidth(s.x) / max(length(fwidth(vRust)), 1e-6);
  streep *= 1.0 - smoothstep(4.5, 7.0, snel);
  vork *= 1.0 - smoothstep(4.5, 7.0, snel);
  // Echte strepen zijn diepzwart, ook waar ze zwakker gezet zijn (anders worden ze grijs op witte vacht):
  // alleen helemaal aan de rand van een streepgebied vervagen ze.
  return max(streep, vork) * smoothstep(0.0, 0.55, s.z) * uStreep.w;
#else
  return max(streep, vork) * s.z * uStreep.w;
#endif
}
`;

/**
 * @param {{ strepen?: { dichtheid: number, dikte: number, rafel: number, sterkte: number, zaad: number },
 *           streepKleur?: number, rand?: number, randKleur?: number, gloed?: number,
 *           fijn?: { ruis: number, rafel: number } }} o
 *   fijn: echte vacht (de echte tijger): fijne haartjes (ruis) en rafelige streepranden (rafel)
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
    uFijn: { value: new THREE.Vector2(o.fijn?.ruis ?? 0, o.fijn?.rafel ?? 0) },
  };
  if (o.strepen) {
    const s = o.strepen;
    uniforms.uStreep.value.set(s.dichtheid, s.dikte, s.rafel, s.sterkte);
    uniforms.uZaad.value = s.zaad;
  }
  const strepen = !!o.strepen;
  const fijn = !!o.fijn;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute vec3 streep;\nvarying vec3 vStreep;${fijn ? '\nvarying vec3 vRust;\nattribute vec4 teken;\nattribute vec4 tekenAfstand;\nvarying vec4 vTeken;\nvarying vec4 vTekenAfstand;' : ''}`
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvStreep = streep;${fijn ? '\nvRust = position;\nvTeken = teken;\nvTekenAfstand = tekenAfstand;' : ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
${fijn ? '#define VACHT_FIJN\nvarying vec3 vRust;\nvarying vec4 vTeken;\nvarying vec4 vTekenAfstand;' : ''}
varying vec3 vStreep;
uniform vec4 uStreep;
uniform vec3 uStreepKleur;
uniform float uZaad;
uniform float uRand;
uniform vec3 uRandKleur;
uniform float uGloed;
uniform vec2 uFijn;
${strepen || fijn ? RUIS : ''}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
${strepen ? 'diffuseColor.rgb = mix(diffuseColor.rgb, uStreepKleur, tijgerStreep(vStreep));' : ''}
${
  fijn
    ? `{
  // Fijne haartjes: licht en donker door elkaar, iets uitgerekt langs het lijf. Verdwijnt op afstand
  // (anders flikkert het).
  float korrel = length(fwidth(vRust)) * 110.0;
  float haar = vRuis3(vRust * vec3(120.0, 120.0, 38.0)) * 0.65 + vRuis3(vRust * 260.0) * 0.35;
  diffuseColor.rgb *= 1.0 + (haar - 0.5) * 2.0 * uFijn.x * (1.0 - smoothstep(0.5, 1.4, korrel));
  // Vaste tekening (de strepen van het gezicht), in vier kanalen: vTeken = afstand tot het midden van de
  // dichtstbijzijnde streep van elk kanaal met teken, vTekenAfstand = zonder teken, in halve
  // streepbreedtes (binnen < 1). De eerste geeft rechte, scherpe randen; de tweede schakelt de tekening
  // uit waar de eerste verspringt (tussen twee strepen van hetzelfde kanaal). Licht rafelige rand.
  vec4 td = abs(vTeken) + (vRuis3(vRust * 90.0) - 0.5) * 0.3 * uFijn.y;
  vec4 taa = fwidth(vTeken) + 0.03;
  vec4 tk4 = (1.0 - smoothstep(1.0 - taa, 1.0 + taa, td)) * (1.0 - smoothstep(2.4, 3.2, vTekenAfstand));
  float tk = max(max(tk4.x, tk4.y), max(tk4.z, tk4.w));
  diffuseColor.rgb = mix(diffuseColor.rgb, uStreepKleur, tk * uStreep.w);
}`
    : ''
}
totalEmissiveRadiance += diffuseColor.rgb * uGloed;`
      )
      .replace(
        '#include <opaque_fragment>',
        `float randLicht = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
outgoingLight += uRandKleur * pow(randLicht, 2.6) * uRand;
#include <opaque_fragment>`
      );
  };
  mat.customProgramCacheKey = () => (strepen ? 'vacht-strepen' : 'vacht') + (fijn ? '-fijn' : '');
  mat.userData.uniforms = uniforms;
  return mat;
}
