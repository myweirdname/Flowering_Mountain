// Het beeld van de benedenrivier (TP 5.7): een lint langs dezelfde curve als de simulatie, met een eigen shader.
// Stroomlijnen die meedrijven op de echte snelheid van het water, een gladde donkere stroomtong met golfjes op
// haar randen, schuimkussens voor elke rots en een schuimstaart erachter, een gordijn van water over de sprong
// met een wolk schuim eronder, en een bronnetje dat borrelt. Daarbij: de rotsen, twee steigers, een vlag die
// je van ver ziet, en de bouwstukken voor het vlot.
import * as THREE from 'three';
import { maakRots } from './maak/klein.js';
import { FLORA } from '../data/flora.js';

const MAX_ROTSEN = 16;

/**
 * @param {ReturnType<typeof import('../sim/wereld/rivier.js').maakRivier>} rivier
 * @param {typeof import('../data/rivier.js').VLOT} V
 * @param {number[][]} stukPlekken waar de bouwstukken liggen
 * @param {{ detail: number, schaduw: boolean }} K
 * @param {THREE.Vector3} zonRichting
 * @param {number} hemelKleur
 */
export function maakRivierbeeld(rivier, V, stukPlekken, K, zonRichting, hemelKleur) {
  const R = rivier.R;
  const KL = R.kleuren;
  const groep = new THREE.Group();

  // --- Het water: een lint van de bron tot in de lagune ---
  const SP = R.sprong;
  const sBegin = rivier.sBegin - 0.25;
  const sEind = Math.min(rivier.sEinde - 0.5, rivier.sMond + 9);
  const rijen = [];
  for (let s = sBegin; s < sEind; ) {
    rijen.push(s);
    const bijSprong = s > SP.s - 0.6 && s < SP.s + SP.lengte + 0.6;
    s += bijSprong ? 0.08 : K.detail ? 0.35 : 0.6;
  }
  rijen.push(sEind);
  const kolommen = K.detail ? 18 : 12;
  const n = rijen.length * (kolommen + 1);
  const pos = new Float32Array(n * 3);
  const riv = new Float32Array(n * 4); // s, d, reistijd, halve breedte
  // Reistijd langs het midden: zo drijven de stroomlijnen precies op de snelheid van het water mee.
  let tau = 0;
  let vorigeS = rijen[0];
  const pt = [0, 0];
  let k = 0;
  for (const s of rijen) {
    tau += (s - vorigeS) / Math.max(0.25, rivier.stroom((s + vorigeS) / 2, 0));
    vorigeS = s;
    const b = Math.max(0.15, rivier.breedte(s));
    const y = s >= rivier.sMond ? 0.012 : rivier.peil(s) + 0.012;
    for (let j = 0; j <= kolommen; j++) {
      const f = j / kolommen;
      const d = (f * 2 - 1) * (b + 0.45);
      rivier.puntOp(s, d, pt);
      pos[k * 3] = pt[0];
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = pt[1];
      riv[k * 4] = s;
      riv[k * 4 + 1] = d;
      riv[k * 4 + 2] = tau;
      riv[k * 4 + 3] = b;
      k++;
    }
  }
  const index = [];
  const w = kolommen + 1;
  for (let i = 0; i < rijen.length - 1; i++) {
    for (let j = 0; j < kolommen; j++) {
      const a = i * w + j;
      index.push(a, a + 1, a + w, a + 1, a + w + 1, a + w);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRiv', new THREE.BufferAttribute(riv, 4));
  geo.setIndex(index);
  geo.computeBoundingSphere();

  const rotsData = rivier.rotsen.slice(0, MAX_ROTSEN).map((r) => new THREE.Vector3(r.s, r.d, r.r));
  while (rotsData.length < MAX_ROTSEN) rotsData.push(new THREE.Vector3(-999, 0, 0));
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTijd: { value: 0 },
      uOndiep: { value: new THREE.Color(KL.ondiep) },
      uMidden: { value: new THREE.Color(KL.midden) },
      uDiep: { value: new THREE.Color(KL.diep) },
      uTongKleur: { value: new THREE.Color(KL.tong) },
      uSchuim: { value: new THREE.Color(KL.schuim) },
      uHemel: { value: new THREE.Color(hemelKleur) },
      uZon: { value: zonRichting },
      uRots: { value: rotsData },
      uTong: { value: new THREE.Vector3(R.tong.van, R.tong.tot, R.tong.breedte) },
      uSprong: { value: new THREE.Vector3(SP.s, SP.lengte, SP.hoogte) },
      uMond: { value: new THREE.Vector2(rivier.sMond, sEind) },
    },
  ]);
  uniforms.uRots.value = rotsData;
  uniforms.uZon.value = zonRichting;
  const water = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      fog: true,
      transparent: true,
      depthWrite: false,
      defines: K.detail ? {} : { EENVOUDIG: '' },
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        attribute vec4 aRiv;
        uniform float uTijd;
        uniform vec3 uTong;
        varying vec3 vWereld;
        varying vec4 vRiv;
        void main() {
          vRiv = aRiv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          // Staande golfjes aan het einde van de stroomtong (een kleine golftrein).
          float na = aRiv.x - uTong.y;
          float trein = step(0.0, na) * exp(-na * 0.45) * (1.0 - smoothstep(0.5, 1.0, abs(aRiv.y) / aRiv.w));
          w.y += sin(na * 2.6 + 1.2) * 0.07 * trein + sin(uTijd * 1.7 + aRiv.x * 0.9 + aRiv.y * 1.3) * 0.012;
          vWereld = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTijd;
        uniform vec3 uOndiep, uMidden, uDiep, uTongKleur, uSchuim, uHemel, uZon;
        uniform vec3 uRots[${MAX_ROTSEN}];
        uniform vec3 uTong, uSprong;
        uniform vec2 uMond;
        varying vec3 vWereld;
        varying vec4 vRiv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float ruis(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        void main() {
          float s = vRiv.x;
          float d = vRiv.y;
          float b = vRiv.w;
          float q = clamp(abs(d) / b, 0.0, 1.2);
          float t = uTijd;
          // Meedrijvend patroon: de reistijd min de klok, dus het schuift precies zo snel als het water.
          float f = vRiv.z - t;

          // Kleur: diep turkoois in het midden, licht en helder aan de oever.
          vec3 c = mix(uDiep, uMidden, smoothstep(0.0, 0.75, q));
          c = mix(c, uOndiep, smoothstep(0.62, 1.0, q));

          // Stroomlijnen: lange lichte streepjes in de stroomrichting.
          float n1 = ruis(vec2(f * 1.1, d * 1.6));
          float n2 = ruis(vec2(f * 2.6 + 7.3, d * 3.7 + 2.0));
          float streep = smoothstep(0.58, 0.9, n1 * 0.62 + n2 * 0.38);

          // De stroomtong: een gladde, donkere V, met kleine golfjes op haar randen.
          float tf = (s - uTong.x) / (uTong.y - uTong.x);
          float tw = max(0.05, uTong.z * (1.0 - max(tf, 0.0)));
          float inTong = (1.0 - smoothstep(tw * 0.55, tw * 1.15, abs(d))) * smoothstep(uTong.x - 1.0, uTong.x + 0.5, s) * (1.0 - smoothstep(uTong.y - 1.2, uTong.y, s));
          c = mix(c, uTongKleur, inTong * 0.88);
          streep *= 1.0 - inTong * 0.85;
          float rand = exp(-pow((abs(d) - tw * 0.95) / 0.22, 2.0)) * smoothstep(uTong.x - 0.5, uTong.x + 0.8, s) * (1.0 - smoothstep(uTong.y - 0.5, uTong.y + 1.0, s));
          float schuim = rand * (0.35 + 0.65 * smoothstep(0.3, 0.7, ruis(vec2(f * 3.0, d * 6.0))));
          c = mix(c, mix(uOndiep, vec3(1.0), 0.5), streep * 0.45);

          // Schuim rond de rotsen: een kussen ervoor, een staart erachter, rustig water vlak erachter.
          float ruw = ruis(vec2(f * 4.0, d * 5.0));
          for (int i = 0; i < ${MAX_ROTSEN}; i++) {
            vec3 r = uRots[i];
            vec2 v = vec2(s - r.x, d - r.y);
            float a = length(v);
            float ring = 1.0 - smoothstep(r.z - 0.05, r.z + 0.25 + 0.2 * ruw, a);
            float staart = 0.0;
            if (v.x > 0.0) {
              float breed = r.z * 0.8 + v.x * 0.18;
              staart = exp(-v.x / 2.4) * exp(-pow(v.y / breed, 2.0)) * smoothstep(0.35, 0.8, ruw) * 0.8;
              c = mix(c, uDiep, exp(-v.x / 1.2) * exp(-pow(v.y / (r.z * 0.7), 2.0)) * 0.25);
            }
            schuim = max(schuim, max(ring * 0.95, staart));
          }

          // Langs de oevers: een smal randje schuim.
          schuim = max(schuim, smoothstep(0.84, 1.0, q) * smoothstep(0.3, 0.7, ruw) * 0.85);

          // De sprong: een wit-glanzend gordijn, en eronder een wolk schuim die langzaam uitwaaiert.
          float ds = s - uSprong.x;
          float gordijn = step(0.0, ds) * (1.0 - step(uSprong.y + 0.05, ds)) * (1.0 - smoothstep(0.85, 1.0, q));
          float stralen = ruis(vec2(d * 7.0, ds * 2.0 - t * 4.0));
          c = mix(c, vec3(0.92, 0.99, 1.0), gordijn * (0.35 + 0.5 * stralen));
          float onder = smoothstep(uSprong.y - 0.4, uSprong.y + 0.1, ds) * exp(-max(ds - uSprong.y, 0.0) / 1.6);
          schuim = max(schuim, onder * (0.55 + 0.45 * ruis(vec2(f * 5.0, d * 4.0))));
          schuim = max(schuim, (1.0 - smoothstep(-0.6, 0.0, ds)) * smoothstep(-0.6, -0.1, ds) * 0.5 * stralen);

          // Het bronnetje: borrelend water onder de bronrots.
          float bron = 1.0 - smoothstep(-3.6, -1.6, s);
          schuim = max(schuim, bron * smoothstep(0.4, 0.8, ruis(vec2(s * 3.0 + t * 1.5, d * 3.0 - t))) );

          // Glans: kleine golfjes, de hemel in het water en zonneschittering.
          vec2 p = vWereld.xz;
          float gx = 0.3 * cos(f * 6.0 + d * 2.0) + 0.2 * cos(p.x * 1.7 + t * 2.3);
          float gz = 0.3 * cos(d * 3.1 - t * 1.4) + 0.2 * cos(p.y * 1.5 - t * 1.9);
          vec3 nrm = normalize(vec3(-gx * 0.15 * (1.0 - inTong * 0.8), 1.0, -gz * 0.15 * (1.0 - inTong * 0.8)));
          vec3 kijk = normalize(cameraPosition - vWereld);
          float fres = pow(1.0 - max(kijk.y, 0.0), 4.0);
          c = mix(c, uHemel, fres * 0.4);
          float glans = pow(max(dot(reflect(-kijk, nrm), uZon), 0.0), 70.0);
          c += vec3(1.0, 0.98, 0.9) * glans * 1.1;
          #ifndef EENVOUDIG
          // Twinkeltjes op het gladde water.
          vec2 cel = floor(vec2(f * 3.0, d * 2.5));
          float rnd = hash(cel);
          float twinkel = step(0.965, rnd) * pow(max(sin(t * 3.0 + rnd * 50.0), 0.0), 10.0);
          c += vec3(1.0) * twinkel * 0.6 * (1.0 - schuim);
          #endif

          c = mix(c, uSchuim, clamp(schuim, 0.0, 1.0));
          float alfa = mix(0.88, 0.62, smoothstep(0.75, 1.1, q));
          alfa = max(alfa, clamp(schuim, 0.0, 1.0) * 0.95);
          alfa = max(alfa, gordijn * 0.9);
          // In de lagune gaat het lint op in het water van de lagune.
          alfa *= 1.0 - smoothstep(uMond.x + 0.5, uMond.y, s);
          alfa *= smoothstep(1.2, 1.0, q);
          gl_FragColor = vec4(c, alfa);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    })
  );
  water.renderOrder = 2;
  water.frustumCulled = false;
  groep.add(water);

  // --- Rotsen ---
  const rotsGeo = maakRots(K.detail);
  const rotsMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const kleuren = FLORA.rots.kleuren;
  rivier.rotsen.forEach((r, i) => {
    const m = new THREE.Mesh(rotsGeo, rotsMat.clone());
    m.material.color.set(kleuren[i % kleuren.length]).lerp(new THREE.Color(KL.rots), 0.4);
    // De vorm is een afgeplatte bol (−0,18 tot 0,44 × maat); hier zo groot dat de top r.h boven het water steekt.
    const sy = (r.h + 0.25) / 0.44;
    m.scale.set(r.r * 1.05, sy, r.r * 1.05);
    m.position.set(r.x, r.y + r.h - 0.44 * sy, r.z);
    m.rotation.y = i * 1.7;
    m.castShadow = K.schaduw;
    m.receiveShadow = K.schaduw;
    groep.add(m);
  });

  // --- Steigers: planken op paaltjes ---
  const hout = new THREE.MeshLambertMaterial({ color: KL.hout });
  const houtDonker = new THREE.MeshLambertMaterial({ color: KL.houtDonker });
  const plankGeo = new THREE.BoxGeometry(1, 1, 1);
  const paalGeo = new THREE.CylinderGeometry(0.09, 0.1, 1, 8);
  for (const dek of rivier.dekken) {
    const sg = new THREE.Group();
    sg.position.set(dek.x, dek.y, dek.z);
    sg.rotation.y = Math.atan2(dek.ax, dek.az);
    const planken = Math.round((dek.halfL * 2) / 0.32);
    for (let i = 0; i < planken; i++) {
      const p = new THREE.Mesh(plankGeo, i % 2 ? hout : houtDonker);
      p.scale.set(dek.halfB * 2, 0.08, 0.28);
      p.position.set(0, -0.04, -dek.halfL + (i + 0.5) * ((dek.halfL * 2) / planken));
      p.rotation.y = (i % 3 - 1) * 0.015;
      p.castShadow = K.schaduw;
      p.receiveShadow = K.schaduw;
      sg.add(p);
    }
    for (const lz of [-dek.halfL + 0.15, 0, dek.halfL - 0.15]) {
      for (const lx of [-dek.halfB + 0.12, dek.halfB - 0.12]) {
        const p = new THREE.Mesh(paalGeo, houtDonker);
        p.scale.set(1, 1.6, 1);
        p.position.set(lx, -0.75, lz);
        sg.add(p);
      }
    }
    // Twee paaltjes die boven het dek uitsteken, om het vlot aan vast te maken.
    for (const lx of [-dek.halfB + 0.12, dek.halfB - 0.12]) {
      const p = new THREE.Mesh(paalGeo, houtDonker);
      p.scale.set(1, 0.55, 1);
      p.position.set(lx, 0.2, dek.halfL - 0.15);
      sg.add(p);
    }
    groep.add(sg);
  }

  // --- De vlag aan de bron: van ver te zien boven de jungle ---
  const VL = R.vlag;
  const bd = rivier.bovenDek;
  const vlag = new THREE.Group();
  // Op de hoek van het dek aan de landkant (de dwarsas van het dek wijst naar de rechteroever).
  const land = rivier.padZijde * (bd.halfB - 0.12);
  vlag.position.set(bd.x - bd.ax * (bd.halfL - 0.15) - bd.az * land, bd.y, bd.z - bd.az * (bd.halfL - 0.15) + bd.ax * land);
  const stok = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, VL.hoogte, 8), new THREE.MeshLambertMaterial({ color: 0xfff4e6 }));
  stok.position.y = VL.hoogte / 2;
  vlag.add(stok);
  const knop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshLambertMaterial({ color: VL.kleur2, emissive: VL.kleur2, emissiveIntensity: 0.3 }));
  knop.position.y = VL.hoogte + 0.08;
  vlag.add(knop);
  // Een wapperende driehoek: zijn punten bewegen in werkBij.
  const doekGeo = new THREE.PlaneGeometry(1.4, 0.8, 8, 3);
  doekGeo.translate(0.7, 0, 0);
  const doekRust = Float32Array.from(doekGeo.attributes.position.array);
  const doekKleur = new Float32Array(doekGeo.attributes.position.count * 3);
  const c1 = new THREE.Color(VL.kleur);
  const c2 = new THREE.Color(VL.kleur2);
  for (let i = 0; i < doekGeo.attributes.position.count; i++) {
    const y = doekRust[i * 3 + 1];
    const c = Math.abs(y) < 0.12 ? c2 : c1;
    doekKleur.set([c.r, c.g, c.b], i * 3);
  }
  doekGeo.setAttribute('color', new THREE.BufferAttribute(doekKleur, 3));
  const doek = new THREE.Mesh(doekGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x401020 }));
  doek.position.y = VL.hoogte - 0.45;
  vlag.add(doek);
  groep.add(vlag);

  // --- De bouwstukken: bundels bamboe en een opgerolde liaan, met een lichtkringetje eronder ---
  const stukken = stukPlekken.map((p, i) => {
    const g = new THREE.Group();
    g.position.set(p[0], p[1], p[2]);
    g.rotation.y = i * 2.1 + 0.4;
    if (V.stukken[i].soort === 'bamboe') g.add(maakBamboeBundel());
    else g.add(maakLiaanRol());
    const kring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.15, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.5, depthWrite: false })
    );
    kring.position.y = 0.04;
    g.add(kring);
    groep.add(g);
    return { g, kring, weg: 0, gepakt: false };
  });

  const tmpV = new THREE.Vector3();
  return {
    groep,
    water,
    /** Een bouwstuk is opgeraapt: het wipt omhoog en verdwijnt. */
    pak(i) {
      stukken[i].gepakt = true;
    },
    /** Elk beeld. */
    werkBij(tijd, dt, camera) {
      uniforms.uTijd.value = tijd;
      // De vlag wappert.
      const a = doekGeo.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = doekRust[i * 3];
        const y = doekRust[i * 3 + 1];
        a.setXYZ(i, x, y * (1 - x * 0.35), Math.sin(tijd * 6 - x * 3.2) * 0.14 * x);
      }
      a.needsUpdate = true;
      doek.rotation.y = 0.6 + Math.sin(tijd * 0.7) * 0.3;
      for (const k of stukken) {
        if (!k.g.visible) continue;
        if (k.gepakt) {
          k.weg += dt;
          const f = Math.min(1, k.weg / 0.45);
          k.g.children[0].position.y = Math.sin(f * Math.PI) * 0.9;
          k.g.scale.setScalar(1 - f * f);
          if (f >= 1) k.g.visible = false;
          continue;
        }
        tmpV.copy(k.g.position);
        if (camera.position.distanceToSquared(tmpV) > 70 * 70) continue;
        k.g.children[0].position.y = 0.08 + Math.sin(tijd * 2.2 + k.g.rotation.y) * 0.06;
        k.kring.material.opacity = 0.3 + 0.25 * Math.sin(tijd * 3 + k.g.rotation.y);
        k.kring.scale.setScalar(1 + 0.08 * Math.sin(tijd * 3 + k.g.rotation.y));
      }
    },
    /** De plekken van de bouwstukken (om te laten glinsteren). */
    stukken,
  };
}

/** Een bundel van drie bamboestammen met knopen, vastgebonden met een liaan. */
export function maakBamboeBundel(lengte = 2.2) {
  const g = new THREE.Group();
  const groen = new THREE.MeshLambertMaterial({ color: 0xb9d86a });
  const knoop = new THREE.MeshLambertMaterial({ color: 0x8fb24a });
  const band = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
  const stam = new THREE.CylinderGeometry(0.085, 0.085, lengte, 10);
  const ring = new THREE.CylinderGeometry(0.095, 0.095, 0.05, 10);
  for (const [x, y] of [[-0.095, 0.085], [0.095, 0.085], [0, 0.245]]) {
    const st = new THREE.Mesh(stam, groen);
    st.rotation.x = Math.PI / 2;
    st.position.set(x, y, 0);
    g.add(st);
    for (let k = -2; k <= 2; k++) {
      const r = new THREE.Mesh(ring, knoop);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, y, k * (lengte / 5.5));
      g.add(r);
    }
  }
  for (const z of [-lengte * 0.3, lengte * 0.3]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), band);
    t.position.set(0, 0.15, z);
    t.scale.set(1.05, 0.95, 1);
    g.add(t);
  }
  return g;
}

/** Een opgerolde liaan met een paar blaadjes. */
function maakLiaanRol() {
  const g = new THREE.Group();
  const punten = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2 * 3.2;
    const r = 0.42 - i * 0.002;
    punten.push(new THREE.Vector3(Math.cos(a) * r, 0.05 + i * 0.006, Math.sin(a) * r));
  }
  punten.push(new THREE.Vector3(0.6, 0.06, 0.5), new THREE.Vector3(0.9, 0.04, 0.8));
  const buis = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punten), 120, 0.045, 6);
  g.add(new THREE.Mesh(buis, new THREE.MeshLambertMaterial({ color: 0x4f9e3a })));
  const blad = new THREE.MeshLambertMaterial({ color: 0x6fd35e, side: THREE.DoubleSide });
  const bladGeo = new THREE.CircleGeometry(0.11, 10);
  bladGeo.scale(1, 1.7, 1);
  for (let i = 0; i < 7; i++) {
    const p = punten[i * 8 + 4];
    const m = new THREE.Mesh(bladGeo, blad);
    m.position.copy(p).add(new THREE.Vector3(0, 0.05, 0));
    m.rotation.set(-1.1, i * 1.3, 0.3);
    g.add(m);
  }
  return g;
}
