// Kleine effecten (TP 5.7): wolkjes bloemblaadjes, spetters, glinsters en kringen in het water.
// Alle deeltjes samen zijn één tekenopdracht (punten op de grafische kaart); de kringen een paar ringen.
import * as THREE from 'three';
import { EFFECTEN as E } from '../data/effecten.js';

export function maakDeeltjes() {
  const N = E.maxDeeltjes;
  const pos = new Float32Array(N * 3);
  const kleur = new Float32Array(N * 3);
  const grootte = new Float32Array(N);
  const vorm = new Float32Array(N); // 0 = rond (spetter, glinster), 1 = blaadje, 2 = hartje, 3 = sterretje
  const vel = new Float32Array(N * 3);
  const leven = new Float32Array(N);
  const duur = new Float32Array(N).fill(1);
  const basis = new Float32Array(N);
  const zwaar = new Float32Array(N);
  let volgende = 0;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('kleur', new THREE.BufferAttribute(kleur, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('grootte', new THREE.BufferAttribute(grootte, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('vorm', new THREE.BufferAttribute(vorm, 1).setUsage(THREE.DynamicDrawUsage));
  const uniforms = { uPixel: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute vec3 kleur;
      attribute float grootte, vorm;
      uniform float uPixel;
      varying vec3 vKleur;
      varying float vVorm;
      void main() {
        vKleur = kleur;
        vVorm = vorm;
        vec4 mv = viewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = grootte * uPixel / max(-mv.z, 0.3);
      }`,
    fragmentShader: `
      varying vec3 vKleur;
      varying float vVorm;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float a;
        if (vVorm > 2.5) {
          // Een sterretje met vijf punten, geel met een wit hartje.
          float r = length(p);
          float hoek = atan(p.y, p.x) + 1.5708;
          float rand = 0.2 + 0.28 * pow(0.5 + 0.5 * cos(5.0 * hoek), 2.5);
          a = smoothstep(rand + 0.02, rand - 0.02, r);
          if (a < 0.02) discard;
          vec3 c = mix(vec3(1.0, 1.0, 0.92), vKleur, smoothstep(0.05, 0.2, r));
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
          return;
        } else if (vVorm > 1.5) {
          // Een hartje: twee bolletjes en een puntje, met een wit randje.
          vec2 q = vec2(p.x, -p.y) * 2.7;
          q.y += 0.12;
          float r = dot(q, q) - 1.0;
          float f = r * r * r - q.x * q.x * q.y * q.y * q.y;
          a = smoothstep(0.015, -0.015, f);
          if (a < 0.02) discard;
          vec3 c = mix(vec3(1.0), vKleur, smoothstep(-0.03, -0.12, f));
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
          return;
        } else if (vVorm > 0.5) {
          // Een bloemblaadje: een schuin ovaaltje.
          vec2 q = mat2(0.8, 0.6, -0.6, 0.8) * p;
          a = smoothstep(0.5, 0.42, length(q * vec2(1.0, 1.9)));
        } else {
          a = smoothstep(0.5, 0.2, length(p));
        }
        if (a < 0.02) discard;
        gl_FragColor = vec4(vKleur, a);
        #include <colorspace_fragment>
      }`,
  });
  const punten = new THREE.Points(geo, mat);
  punten.frustumCulled = false;
  punten.renderOrder = 7;

  // Kringen in het water.
  const ringen = [];
  const ringGeo = new THREE.RingGeometry(0.82, 1, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const groep = new THREE.Group();
  for (let i = 0; i < E.maxKringen; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    m.renderOrder = 5;
    groep.add(m);
    ringen.push({ m, t: 0, duur: 1, max: 1 });
  }
  let volgendeRing = 0;

  const kl = new THREE.Color();
  function voegToe(x, y, z, vx, vy, vz, kleurHex, maat, levensduur, blaadje, zwaarte) {
    const i = volgende;
    volgende = (volgende + 1) % N;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    kl.set(kleurHex);
    kleur[i * 3] = kl.r; kleur[i * 3 + 1] = kl.g; kleur[i * 3 + 2] = kl.b;
    basis[i] = maat;
    grootte[i] = maat;
    vorm[i] = typeof blaadje === 'number' ? blaadje : blaadje ? 1 : 0;
    leven[i] = levensduur;
    duur[i] = levensduur;
    zwaar[i] = zwaarte;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  return {
    groep,
    punten,

    /** Een wolkje bloemblaadjes (plof, verzamelen). */
    blaadjes(x, y, z, aantal = E.plof.aantal, kleuren = E.plof.kleuren, kracht = 1) {
      for (let n = 0; n < aantal; n++) {
        const a = Math.random() * Math.PI * 2;
        const v = rnd(0.8, 2.6) * kracht;
        voegToe(x + rnd(-0.2, 0.2), y + rnd(0.1, 0.9), z + rnd(-0.2, 0.2), Math.cos(a) * v, rnd(1, 3.5) * kracht, Math.sin(a) * v,
          kleuren[n % kleuren.length], rnd(0.18, 0.28), rnd(1.1, 1.8), true, 0.25);
      }
    },
    /** Glinsters die opspatten (een bloesem gepakt). */
    glinsters(x, y, z, kleur, aantal = 14) {
      for (let n = 0; n < aantal; n++) {
        const a = Math.random() * Math.PI * 2;
        const v = rnd(0.6, 2.2);
        voegToe(x, y, z, Math.cos(a) * v, rnd(0.8, 3), Math.sin(a) * v, n % 3 ? kleur : 0xfff6b0, rnd(0.08, 0.14), rnd(0.5, 0.9), false, 0.4);
      }
    },
    /** Hartjes die zacht opstijgen (aaien, een perfecte sprong). */
    hartjes(x, y, z, aantal = 5, kleuren = E.hartjes.kleuren) {
      for (let n = 0; n < aantal; n++) {
        const a = Math.random() * Math.PI * 2;
        const v = rnd(0.2, 0.7);
        voegToe(x + rnd(-0.25, 0.25), y + rnd(0, 0.3), z + rnd(-0.25, 0.25), Math.cos(a) * v, rnd(1.0, 1.8), Math.sin(a) * v,
          kleuren[n % kleuren.length], rnd(0.26, 0.4), rnd(1.3, 1.9), 2, -0.02);
      }
    },
    /** Sterretjes die rond een kopje dansen (een welpje dat kopje-onder gaat, stap 8c). */
    sterretjes(x, y, z, aantal = 6, kleuren = E.sterretjes.kleuren) {
      for (let n = 0; n < aantal; n++) {
        const a = (n / aantal) * Math.PI * 2 + Math.random() * 0.5;
        const v = rnd(0.5, 1.1);
        voegToe(x + Math.cos(a) * 0.12, y + rnd(0, 0.15), z + Math.sin(a) * 0.12, Math.cos(a) * v, rnd(0.7, 1.5), Math.sin(a) * v,
          kleuren[n % kleuren.length], rnd(0.2, 0.3), rnd(0.9, 1.3), 3, 0.03);
      }
    },
    /** Een regen van bloemblaadjes die van boven neerdwarrelt (een perfecte sprong). */
    bloemenregen(x, y, z, aantal = E.bloemenregen.aantal, kleuren = E.bloemenregen.kleuren) {
      for (let n = 0; n < aantal; n++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * E.bloemenregen.straal;
        voegToe(x + Math.cos(a) * r, y + rnd(0.6, 2.2), z + Math.sin(a) * r, Math.cos(a) * 0.8, rnd(0.5, 2.2), Math.sin(a) * 0.8,
          kleuren[n % kleuren.length], rnd(0.2, 0.32), rnd(1.6, 2.4), true, 0.12);
      }
    },
    /** Waterspetters en een kring (plons, zwemslag). y = hoogte van het wateroppervlak. */
    spetters(x, z, sterkte = 1, y = 0) {
      const aantal = Math.round(E.plons.aantal * Math.min(1.5, sterkte));
      for (let n = 0; n < aantal; n++) {
        const a = Math.random() * Math.PI * 2;
        const v = rnd(0.4, 1.8) * sterkte;
        voegToe(x + Math.cos(a) * 0.2, y + 0.05, z + Math.sin(a) * 0.2, Math.cos(a) * v, rnd(1.5, 3.8) * Math.min(1.4, sterkte), Math.sin(a) * v,
          n % 3 ? E.plons.kleur : 0xffffff, rnd(0.08, 0.15), rnd(0.5, 0.9), false, 1);
      }
      this.kring(x, z, 1.4 * sterkte, 1.2, y);
    },
    /** Een kring die uitdijt op het water. */
    kring(x, z, max = 1, d = 1.2, y = 0) {
      const r = ringen[volgendeRing];
      volgendeRing = (volgendeRing + 1) % ringen.length;
      r.t = 0;
      r.duur = d;
      r.max = max;
      r.m.position.set(x, y + 0.04, z);
      r.m.visible = true;
    },
    /** Stofje bij een landing op zand. */
    stof(x, y, z, kleurHex) {
      for (let n = 0; n < 8; n++) {
        const a = (n / 8) * Math.PI * 2;
        voegToe(x, y + 0.05, z, Math.cos(a) * 1.2, rnd(0.2, 0.7), Math.sin(a) * 1.2, kleurHex, rnd(0.1, 0.15), 0.45, false, 0.1);
      }
    },

    /** @param {number} schaal beeldpunten per meter op 1 m afstand (hoogte van het beeld / 2·tan(halve beeldhoek)) */
    werkBij(dt, schaal) {
      uniforms.uPixel.value = schaal;
      for (let i = 0; i < N; i++) {
        if (leven[i] <= 0) continue;
        leven[i] -= dt;
        if (leven[i] <= 0) {
          grootte[i] = 0;
          continue;
        }
        const j = i * 3;
        // Blaadjes dwarrelen: veel luchtweerstand en een zacht heen en weer.
        const rem = Math.exp(-(vorm[i] ? 2.2 : 0.6) * dt);
        vel[j] *= rem;
        vel[j + 2] *= rem;
        vel[j + 1] = vel[j + 1] * rem - 9.8 * zwaar[i] * dt;
        if (vorm[i]) vel[j] += Math.sin(leven[i] * 7 + i) * 0.6 * dt;
        pos[j] += vel[j] * dt;
        pos[j + 1] += vel[j + 1] * dt;
        pos[j + 2] += vel[j + 2] * dt;
        const f = leven[i] / duur[i];
        grootte[i] = basis[i] * Math.min(1, f * 3);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.kleur.needsUpdate = true;
      geo.attributes.grootte.needsUpdate = true;
      geo.attributes.vorm.needsUpdate = true;

      for (const r of ringen) {
        if (!r.m.visible) continue;
        r.t += dt;
        const f = r.t / r.duur;
        if (f >= 1) {
          r.m.visible = false;
          continue;
        }
        r.m.scale.setScalar(0.2 + f * r.max);
        r.m.material.opacity = (1 - f) * 0.55;
      }
    },
  };
}
