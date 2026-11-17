// Wind in de vertex-shader (TP 5.5): elke plant zwaait zacht, zonder dat de processor iets moet doen.
// Elk punt van een plant heeft een "zwaai": 0 aan de voet, groter naar de toppen en bladpunten.
// Monstera's krijgen hun gaatjes en bananenbladeren hun scheurtjes ook hier, in de pixel-shader.
import * as THREE from 'three';

/** Gedeeld door alle plantmaterialen: de tijd en de windsterkte. */
export const WIND = {
  uTijd: { value: 0 },
  uWind: { value: 1 },
};

/**
 * @param {{ gaten?: 'monstera' | 'banaan' | null, gloed?: number, gloedSterkte?: number }} o
 */
export function maakPlantMateriaal(o = {}) {
  const m = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: o.gloed ?? 0x000000,
    emissiveIntensity: o.gloedSterkte ?? 1,
  });
  const gaten = o.gaten ?? null;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTijd = WIND.uTijd;
    shader.uniforms.uWind = WIND.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float zwaai;
        attribute vec2 bladpos;
        varying vec2 vBladpos;
        uniform float uTijd;
        uniform float uWind;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 plek = vec3(0.0);
        #ifdef USE_INSTANCING
          plek = instanceMatrix[3].xyz;
        #endif
        float fase = plek.x * 0.21 + plek.z * 0.17;
        float golf = sin(uTijd * 1.1 + fase) * 0.6 + sin(uTijd * 2.3 + fase * 1.7) * 0.3;
        float fladder = sin(uTijd * 6.5 + position.x * 3.0 + position.z * 2.0 + fase * 3.0);
        transformed.x += golf * zwaai * uWind * 0.16;
        transformed.z += golf * zwaai * uWind * 0.09;
        transformed.y += fladder * zwaai * uWind * 0.025;
        vBladpos = bladpos;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vBladpos;`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        ${gaten === 'monstera' ? MONSTERA : gaten === 'banaan' ? BANAAN : ''}`
      );
  };
  m.customProgramCacheKey = () => 'plant-' + (gaten ?? 'gewoon');
  return m;
}

// Bladpositie: x = -1..1 over de breedte, y = 0 (steel) .. 1 (punt). Buiten een blad is y = -9.
const MONSTERA = `
  if (vBladpos.y > -5.0) {
    vec2 p = vec2(abs(vBladpos.x), vBladpos.y);
    float gat = 0.0;
    gat = max(gat, 1.0 - length((p - vec2(0.40, 0.22)) / vec2(0.13, 0.065)));
    gat = max(gat, 1.0 - length((p - vec2(0.47, 0.43)) / vec2(0.14, 0.07)));
    gat = max(gat, 1.0 - length((p - vec2(0.42, 0.63)) / vec2(0.12, 0.06)));
    float spleet = abs(fract(p.y * 4.0 + p.x * 0.9) - 0.5);
    if (p.x > 0.74 && spleet < 0.045 && p.y > 0.05 && p.y < 0.85) gat = 1.0;
    if (gat > 0.0) discard;
  }`;

const BANAAN = `
  if (vBladpos.y > 0.08) {
    float ax = abs(vBladpos.x);
    float s = abs(fract(vBladpos.y * 4.3 + (vBladpos.x > 0.0 ? 0.37 : 0.0)) - 0.5);
    if (ax > 0.45 && s < 0.012 + 0.02 * ax) discard;
  }`;
