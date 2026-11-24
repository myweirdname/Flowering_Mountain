// Mist en waas (TP 5.4, stap 12). Twee lagen:
// - dichtbij de gewone mist, die verbergt waar de fijne planten en tegels ophouden;
// - daarachter een lichte waas tot ver op het eiland, zodat je de berg vanop het strand ziet liggen
//   en de verte zacht blauw kleurt.
// Dat gebeurt in het mist-stukje van alle shaders samen, dus overal precies hetzelfde.
import * as THREE from 'three';

const getal = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/**
 * Zet de mist op de scène. Moet gebeuren vóór de eerste tekening (dan worden de shaders gemaakt).
 * @param {THREE.Scene} scene
 * @param {number} kleur
 * @param {{ mist: [number, number], waas: [number, number] }} K detailniveau
 */
export function zetMist(scene, kleur, K) {
  scene.fog = new THREE.Fog(kleur, K.mist[0], K.mist[1]);
  const [deel, ver] = K.waas;
  THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = ${getal(deel)} * smoothstep( fogNear, fogFar, vFogDepth )
      + ${getal(1 - deel)} * clamp( ( vFogDepth - fogNear ) / ( ${getal(ver)} - fogNear ), 0.0, 1.0 );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;
}
