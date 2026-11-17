// De zee en de lagune (TP 5.7): één groot vlak met een eigen shader.
// De shader kent de diepte uit een klein dieptekaartje: turkoois bij het strand, diepblauw verderop,
// schuimrandjes die aan de waterlijn op en neer gaan, zonneglinsters en kleine twinkelsterretjes.
import * as THREE from 'three';

/**
 * @param {(x:number, z:number) => number} hoogte
 * @param {typeof import('../data/scene.js').SCENE} S
 * @param {THREE.Vector3} zonRichting
 */
export function maakZee(hoogte, S, zonRichting) {
  const W = S.water;
  const n = W.kaartResolutie;
  const half = W.kaartGebied;
  const data = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h = hoogte(-half + ((i + 0.5) / n) * 2 * half, -half + ((j + 0.5) / n) * 2 * half);
      data[j * n + i] = Math.round(Math.min(1, Math.max(0, (h + 8) / 12)) * 255);
    }
  }
  const kaart = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
  kaart.minFilter = THREE.LinearFilter;
  kaart.magFilter = THREE.LinearFilter;
  kaart.needsUpdate = true;

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTijd: { value: 0 },
      uKaart: { value: null },
      uGebied: { value: new THREE.Vector3(-half, -half, 2 * half) },
      uOndiep: { value: new THREE.Color(W.ondiep) },
      uMidden: { value: new THREE.Color(W.midden) },
      uDiep: { value: new THREE.Color(W.diep) },
      uSchuim: { value: new THREE.Color(W.schuim) },
      uGlinster: { value: new THREE.Color(W.glinster) },
      uHemel: { value: new THREE.Color(S.hemel.horizon) },
      uZon: { value: zonRichting },
    },
  ]);
  uniforms.uKaart.value = kaart;

  const materiaal = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec3 vWereld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWereld = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float uTijd;
      uniform sampler2D uKaart;
      uniform vec3 uGebied, uOndiep, uMidden, uDiep, uSchuim, uGlinster, uHemel, uZon;
      varying vec3 vWereld;
      void main() {
        vec2 p = vWereld.xz;
        vec2 uv = (p - uGebied.xy) / uGebied.z;
        float h = -8.0;
        if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) h = texture2D(uKaart, uv).r * 12.0 - 8.0;
        float d = max(-h, 0.0);

        vec3 c = mix(uOndiep, uMidden, smoothstep(0.0, 1.6, d));
        c = mix(c, uDiep, smoothstep(1.6, 6.5, d));

        // Golfjes: een licht schommelende normaal voor glinsters.
        float t = uTijd;
        float dx = 0.35 * cos(p.x * 0.35 + t * 1.1) + 0.27 * cos((p.x + p.y) * 0.53 + t * 1.7) + 0.2 * cos(p.x * 1.3 - t * 2.1);
        float dz = 0.29 * cos(p.y * 0.29 - t * 0.9) + 0.27 * cos((p.x + p.y) * 0.53 + t * 1.7) + 0.2 * cos(p.y * 1.1 + t * 1.9);
        vec3 n = normalize(vec3(-dx * 0.12, 1.0, -dz * 0.12));
        vec3 kijk = normalize(cameraPosition - vWereld);
        float fres = pow(1.0 - max(kijk.y, 0.0), 4.0);
        c = mix(c, uHemel, fres * 0.45);
        float glans = pow(max(dot(reflect(-kijk, n), uZon), 0.0), 90.0);
        c += uGlinster * glans * 1.3;

        // Twinkelsterretjes op het water.
        vec2 cel = floor(p * 0.9);
        float rnd = fract(sin(dot(cel, vec2(12.9898, 78.233))) * 43758.5453);
        float twinkel = step(0.975, rnd) * pow(max(sin(t * 2.5 + rnd * 60.0), 0.0), 12.0);
        vec2 f = fract(p * 0.9) - 0.5;
        twinkel *= smoothstep(0.12, 0.0, abs(f.x) * abs(f.y) * 8.0 + length(f) * 0.25);
        c += uGlinster * twinkel * (1.0 - fres) * 1.2;

        // Schuim aan de waterlijn: een rand die zacht op en neer gaat, plus golfjes die aanspoelen.
        float golfje = sin(t * 1.3 + p.x * 0.07 + p.y * 0.05) * 0.07;
        float breuk = 0.7 + 0.3 * sin(p.x * 2.1 + t) * sin(p.y * 1.7 - t * 0.7);
        float schuim = (1.0 - smoothstep(0.04, 0.2, d + golfje)) * breuk;
        float ring = fract(t * 0.2 + sin(p.x * 0.05) * 0.2);
        float lijn = (1.0 - smoothstep(0.0, 0.045, abs(d - (0.12 + (1.0 - ring) * 0.55)))) * ring * breuk;
        c = mix(c, uSchuim, clamp(schuim + lijn * 0.75, 0.0, 1.0));

        float a = mix(0.45, 0.93, smoothstep(0.0, 2.2, d));
        a = max(a, clamp(schuim + lijn, 0.0, 1.0));
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });

  const vlak = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), materiaal);
  vlak.frustumCulled = false;
  vlak.renderOrder = 1;
  return {
    vlak,
    /** Elk beeld: de tijd voor de golfjes; het vlak schuift mee met de camera. */
    werkBij(tijd, camera) {
      uniforms.uTijd.value = tijd;
      vlak.position.set(camera.position.x, 0, camera.position.z);
    },
  };
}
