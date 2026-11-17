// Sfeer (TP 5.7): lichtstralen door openingen in het bladerdak en zwevend stuifmeel rond de speler.
// Beide draaien helemaal op de grafische kaart: de processor doet er niets voor.
import * as THREE from 'three';

/**
 * Doorschijnende stralen rond de open plek, schuin in de richting van de zon.
 * @param {ReturnType<typeof import('../sim/wereld/hoogte.js').maakWereldvorm>} vorm
 * @param {typeof import('../data/scene.js').SCENE.lichtstralen} L
 * @param {THREE.Vector3} licht richting naar de zon (genormaliseerd)
 */
export function maakLichtstralen(vorm, L, licht) {
  // Twee gekruiste vlakjes, van onder (v = 0) naar boven (v = 1).
  const een = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const twee = een.clone().rotateY(Math.PI / 2);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array([...een.attributes.position.array, ...twee.attributes.position.array]);
  const uv = new Float32Array([...een.attributes.uv.array, ...twee.attributes.uv.array]);
  const idx = [...een.index.array, ...twee.index.array.map((i) => i + 4)];
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    { uTijd: { value: 0 }, uKleur: { value: new THREE.Color(L.kleur) }, uSterkte: { value: L.sterkte } },
  ]);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      varying float vFase;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vFase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.3;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform float uTijd, uSterkte;
      uniform vec3 uKleur;
      varying vec2 vUv;
      varying float vFase;
      void main() {
        float a = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.6, vUv.y) * smoothstep(0.0, 0.4, vUv.x) * smoothstep(1.0, 0.6, vUv.x);
        a *= uSterkte * (0.7 + 0.3 * sin(uTijd * 0.6 + vFase));
        #ifdef USE_FOG
          a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          a *= smoothstep(3.0, 14.0, vFogDepth); // vlak voor je neus geen wit scherm
        #endif
        gl_FragColor = vec4(uKleur * a, 1.0);
        #include <colorspace_fragment>
      }`,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, L.aantal);
  const q = new THREE.Quaternion();
  const draai = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  const k = vorm.kamp;
  const b = /** @type {any} */ ({});
  let i = 0;
  for (let poging = 0; poging < 80 && i < L.aantal; poging++) {
    // Vaste plaatsen rond de open plek, alleen waar jungle staat (geen stralen tegen de lucht boven het strand).
    const a = poging * 2.39996;
    const r = k.straal + 8 + ((poging * 37) % 14);
    const x = k.x + Math.cos(a) * r;
    const z = k.z + Math.sin(a) * r;
    if (vorm.bodem(x, z, b).bos < 0.8) continue;
    const br = L.breedte[0] + ((i * 53) % 10) / 10 * (L.breedte[1] - L.breedte[0]);
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), licht);
    draai.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
    q.multiply(draai);
    m.compose(new THREE.Vector3(x, vorm.hoogte(x, z) - 0.5, z), q, new THREE.Vector3(br, L.lengte, br));
    mesh.setMatrixAt(i, m);
    i++;
  }
  mesh.count = i;
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return { mesh, werkBij: (t) => (uniforms.uTijd.value = t) };
}

/**
 * Stuifmeel: zwevende lichtpuntjes in een doos die met de camera meeschuift.
 * @param {number} aantal
 * @param {typeof import('../data/scene.js').SCENE.stuifmeel} P
 */
export function maakStuifmeel(aantal, P) {
  const pos = new Float32Array(aantal * 3);
  const fase = new Float32Array(aantal);
  const [dx, dy, dz] = P.doos;
  for (let i = 0; i < aantal; i++) {
    pos[i * 3] = (Math.random() - 0.5) * dx;
    pos[i * 3 + 1] = (Math.random() - 0.5) * dy;
    pos[i * 3 + 2] = (Math.random() - 0.5) * dz;
    fase[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
  const uniforms = {
    uTijd: { value: 0 },
    uMidden: { value: new THREE.Vector3() },
    uDoos: { value: new THREE.Vector3(dx, dy, dz) },
    uGrootte: { value: P.grootte },
    uPixel: { value: 1 },
    uKleur: { value: new THREE.Color(P.kleur) },
    uKleur2: { value: new THREE.Color(P.kleur2) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float fase;
      uniform float uTijd, uGrootte, uPixel;
      uniform vec3 uMidden, uDoos;
      varying float vAlpha;
      varying float vFase;
      void main() {
        vec3 p = position + vec3(
          sin(uTijd * 0.3 + fase * 6.0) * 0.8 + uTijd * 0.25,
          sin(uTijd * 0.45 + fase * 9.0) * 0.6 + uTijd * 0.08,
          cos(uTijd * 0.27 + fase * 5.0) * 0.8);
        vec3 l = mod(p - uMidden + uDoos * 0.5, uDoos) - uDoos * 0.5;
        vec3 rel = abs(l / uDoos) * 2.0;
        vAlpha = 1.0 - smoothstep(0.7, 1.0, max(max(rel.x, rel.z), rel.y));
        vFase = fase;
        vec4 mv = viewMatrix * vec4(l + uMidden, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uGrootte * uPixel * (12.0 / max(-mv.z, 0.5)) * (0.6 + 0.4 * sin(fase * 40.0));
      }`,
    fragmentShader: `
      uniform float uTijd;
      uniform vec3 uKleur, uKleur2;
      varying float vAlpha;
      varying float vFase;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha * (0.55 + 0.45 * sin(uTijd * 2.0 + vFase * 30.0));
        vec3 c = vFase > 0.8 ? uKleur2 : uKleur;
        gl_FragColor = vec4(c * a, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const punten = new THREE.Points(geo, mat);
  punten.frustumCulled = false;
  punten.renderOrder = 6;
  return {
    punten,
    werkBij(t, camera, pixel) {
      uniforms.uTijd.value = t;
      uniforms.uPixel.value = pixel;
      uniforms.uMidden.value.copy(camera.position);
      uniforms.uMidden.value.y -= 2;
    },
  };
}
