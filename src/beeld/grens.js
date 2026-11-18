// De grens van de speelwereld (tot het echte eiland er is, stap 12): een rood-wit gestreept lint
// op de grond en een zacht gloeiend gordijntje erboven. In zee niets: daar houdt het water je tegen.
// Samen twee tekenopdrachten en een paar duizend driehoeken.
import * as THREE from 'three';

/**
 * @param {(x:number, z:number) => number} hoogte
 * @param {{ minX:number, maxX:number, minZ:number, maxZ:number }} G de speelgrens
 * @param {typeof import('../data/wereld.js').WERELD.grensLint} L
 */
export function maakGrens(hoogte, G, L) {
  // De vier randen, met de richting naar binnen.
  const randen = [
    { van: [G.minX, G.minZ], naar: [G.maxX, G.minZ], binnen: [0, 1] },
    { van: [G.maxX, G.minZ], naar: [G.maxX, G.maxZ], binnen: [-1, 0] },
    { van: [G.maxX, G.maxZ], naar: [G.minX, G.maxZ], binnen: [0, -1] },
    { van: [G.minX, G.maxZ], naar: [G.minX, G.minZ], binnen: [1, 0] },
  ];
  const lint = { pos: [], kleur: [] };
  const gordijn = { pos: [], uv: [] };
  const k1 = new THREE.Color(L.kleur1);
  const k2 = new THREE.Color(L.kleur2);
  const op = (x, z) => hoogte(x, z) + 0.06;

  for (const r of randen) {
    const lengte = Math.hypot(r.naar[0] - r.van[0], r.naar[1] - r.van[1]);
    const n = Math.ceil(lengte / L.stap);
    const [bx, bz] = r.binnen;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      // Het lint ligt net binnen de grens: waar je stopt, sta je erop.
      const x0 = r.van[0] + (r.naar[0] - r.van[0]) * t0 + bx * L.breedte * 0.5;
      const z0 = r.van[1] + (r.naar[1] - r.van[1]) * t0 + bz * L.breedte * 0.5;
      const x1 = r.van[0] + (r.naar[0] - r.van[0]) * t1 + bx * L.breedte * 0.5;
      const z1 = r.van[1] + (r.naar[1] - r.van[1]) * t1 + bz * L.breedte * 0.5;
      const h0 = op(x0, z0);
      const h1 = op(x1, z1);
      if (h0 < 0.1 && h1 < 0.1) continue; // in het water: geen lint
      const ox = bx * L.breedte * 0.5;
      const oz = bz * L.breedte * 0.5;
      // Lint: twee driehoeken, om de beurt rood en wit.
      const a = [x0 - ox, op(x0 - ox, z0 - oz), z0 - oz];
      const b = [x1 - ox, op(x1 - ox, z1 - oz), z1 - oz];
      const c = [x1 + ox, op(x1 + ox, z1 + oz), z1 + oz];
      const d = [x0 + ox, op(x0 + ox, z0 + oz), z0 + oz];
      lint.pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      const k = i % 2 ? k1 : k2;
      for (let j = 0; j < 6; j++) lint.kleur.push(k.r, k.g, k.b);
      // Gordijntje boven de buitenrand van het lint.
      const g0 = [x0 - ox, h0, z0 - oz];
      const g1 = [x1 - ox, h1, z1 - oz];
      const g2 = [x1 - ox, h1 + L.hoogte, z1 - oz];
      const g3 = [x0 - ox, h0 + L.hoogte, z0 - oz];
      gordijn.pos.push(...g0, ...g1, ...g2, ...g0, ...g2, ...g3);
      const u0 = i * L.stap;
      const u1 = (i + 1) * L.stap;
      gordijn.uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    }
  }

  const lintGeo = new THREE.BufferGeometry();
  lintGeo.setAttribute('position', new THREE.Float32BufferAttribute(lint.pos, 3));
  lintGeo.setAttribute('color', new THREE.Float32BufferAttribute(lint.kleur, 3));
  const lintMesh = new THREE.Mesh(
    lintGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
  );

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    { uTijd: { value: 0 }, uKleur: { value: new THREE.Color(L.gloed) }, uSterkte: { value: L.gloedSterkte } },
  ]);
  const gordijnGeo = new THREE.BufferGeometry();
  gordijnGeo.setAttribute('position', new THREE.Float32BufferAttribute(gordijn.pos, 3));
  gordijnGeo.setAttribute('uv', new THREE.Float32BufferAttribute(gordijn.uv, 2));
  const gordijnMesh = new THREE.Mesh(
    gordijnGeo,
    new THREE.ShaderMaterial({
      uniforms,
      fog: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        #include <fog_pars_vertex>
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform float uTijd, uSterkte;
        uniform vec3 uKleur;
        varying vec2 vUv;
        void main() {
          // Onderaan het felst, naar boven toe weg; zachte golfjes die langs de grens schuiven.
          float a = pow(1.0 - vUv.y, 2.0) * (0.75 + 0.25 * sin(vUv.x * 1.3 - uTijd * 2.0));
          a *= uSterkte;
          #ifdef USE_FOG
            a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor = vec4(uKleur * a, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  gordijnMesh.renderOrder = 4;
  return { lint: lintMesh, gordijn: gordijnMesh, werkBij: (t) => (uniforms.uTijd.value = t) };
}
