// De bloesems om te verzamelen: kleine roze bloemetjes die zweven, draaien en zacht gloeien.
// Alle bloemetjes samen zijn één tekenopdracht, hun gloed ook één.
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './maak/vorm.js';

/**
 * @param {import('../sim/wereld/bloesems.js').Bloesem[]} lijst
 * @param {typeof import('../data/bloesems.js').BLOESEMS} B
 */
export function maakBloesembeeld(lijst, B) {
  const g = B.grootte;
  const bouwer = new Bouwer();
  const blad = maakBol(1, 1);
  const hart = new THREE.Color(B.blaadjeKleur);
  const rand = new THREE.Color(B.randKleur);
  const k = new THREE.Color();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    bouwer.voegToe(blad, {
      matrix: new THREE.Matrix4()
        .makeRotationY(-a)
        .multiply(matrix(g * 0.55, 0.02, 0, 0, 0, 0.35, g * 0.55, g * 0.16, g * 0.42)),
      kleur: (p) => k.copy(hart).lerp(rand, THREE.MathUtils.clamp(Math.hypot(p.x, p.z) / g - 0.2, 0, 1)),
    });
  }
  bouwer.voegToe(blad, { matrix: matrix(0, 0.06, 0, 0, 0, 0, g * 0.24, g * 0.2, g * 0.24), kleur: B.hartKleur });
  blad.dispose();
  const geo = bouwer.maak();

  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true, emissive: B.gloed, emissiveIntensity: 0.45 }),
    lijst.length
  );
  mesh.frustumCulled = false;

  // Gloed: een zacht lichtvlekje achter elk bloemetje.
  const gloedPos = new Float32Array(lijst.length * 3);
  const gloedGeo = new THREE.BufferGeometry();
  gloedGeo.setAttribute('position', new THREE.BufferAttribute(gloedPos, 3).setUsage(THREE.DynamicDrawUsage));
  const uniforms = { uSchaal: { value: 600 }, uKleur: { value: new THREE.Color(B.gloed) }, uTijd: { value: 0 } };
  const gloed = new THREE.Points(
    gloedGeo,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uSchaal, uTijd;
        varying float vFlikker;
        void main() {
          vec4 mv = viewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          vFlikker = 0.8 + 0.2 * sin(uTijd * 3.0 + position.x * 2.0);
          gl_PointSize = 1.1 * uSchaal / max(-mv.z, 0.5);
        }`,
      fragmentShader: `
        uniform vec3 uKleur;
        varying float vFlikker;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = pow(max(0.0, 1.0 - d), 2.2) * 0.55 * vFlikker;
          gl_FragColor = vec4(uKleur * a, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  gloed.frustumCulled = false;
  gloed.renderOrder = 4;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const as = new THREE.Vector3(0, 1, 0);
  const kantel = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), B.kantel);
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  /** Per bloesem: hoe ver het "pakken" gevorderd is (0 = nog niet, 1 = weg). */
  const weg = new Float32Array(lijst.length);

  return {
    groep: new THREE.Group().add(mesh, gloed),
    /** Bloemetje verdwijnt met een sprongetje omhoog. */
    pak(id) {
      if (weg[id] === 0) weg[id] = 0.001;
    },
    werkBij(tijd, dt, camera, schaal) {
      uniforms.uSchaal.value = schaal;
      uniforms.uTijd.value = tijd;
      let n = 0;
      for (const b of lijst) {
        let f = weg[b.id];
        if (f > 0) {
          f = weg[b.id] = Math.min(1, f + dt * 4);
          if (f >= 1) continue;
        } else if (b.gepakt) continue;
        const dx = b.x - camera.position.x;
        const dz = b.z - camera.position.z;
        if (dx * dx + dz * dz > B.zichtbaar * B.zichtbaar) continue;
        const fase = b.id * 1.7;
        p.set(b.x, b.y + Math.sin(tijd * 2 + fase) * B.deinen + f * 0.8, b.z);
        q.setFromAxisAngle(as, tijd * B.draaien + fase).multiply(kantel);
        sc.setScalar((1 + 0.08 * Math.sin(tijd * 4 + fase)) * (1 + f * 0.6) * (1 - f * f));
        m.compose(p, q, sc);
        mesh.setMatrixAt(n, m);
        gloedPos[n * 3] = p.x;
        gloedPos[n * 3 + 1] = p.y + 0.04;
        gloedPos[n * 3 + 2] = p.z;
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      gloedGeo.setDrawRange(0, n);
      gloedGeo.attributes.position.needsUpdate = true;
    },
  };
}
