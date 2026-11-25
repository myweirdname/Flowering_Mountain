// Het beeld van de rivier over de berg (stap 14, TP 5.7): een lint langs dezelfde curve als de simulatie, met
// een eigen shader. Het schuim, de stroomtong, het keerwater en de watervallen staan in een schuimkaart (een
// kleine textuur in riviercoördinaten), zodat het water er precies uitziet zoals de simulatie het kent:
// schuimkussens en -staarten bij de rotsen, wit water dat toeneemt met de klasse, golftreinen die echt opbollen,
// een kolk die ronddraait, vallende gordijnen bij elke waterval en een schuimwolk eronder.
// Bij de grote waterval: nevel die opstijgt en een regenboog. Daarbij: rotsen, de bronrots, steigers en vlaggen
// in de kleur van de klasse (van ver te zien).
import * as THREE from 'three';
import { maakRots } from './maak/klein.js';
import { FLORA } from '../data/flora.js';
import { bouwSteiger, maakVlag } from './rivier.js';

const KAART_DS = 0.25; // schuimkaart: zoveel meter per rij
const KAART_B = 32;    // en zoveel kolommen dwars

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @param {ReturnType<typeof import('../sim/wereld/bergrivier.js').maakBergrivier>} rivier
 * @param {{ detail: number, schaduw: boolean }} K
 * @param {THREE.Vector3} zonRichting
 * @param {number} hemelKleur
 */
export function maakBergrivierbeeld(rivier, K, zonRichting, hemelKleur) {
  const B = rivier.R;
  const KL = B.kleuren;
  const groep = new THREE.Group();
  const sBegin = rivier.sBegin - 0.2;
  const sEind = rivier.sEinde + 0.3;
  const rand = (s) => Math.max(0.15, rivier.breedte(s)) + 0.45;

  // --- De schuimkaart: R schuim, G glad (stroomtong en keerwater), B gordijn (deel van de val), A wit water ---
  const rijenK = Math.ceil((sEind - sBegin) / KAART_DS) + 1;
  const kaart = new Uint8Array(rijenK * KAART_B * 4);
  const klasseWit = B.schuimPerKlasse;
  for (let i = 0; i < rijenK; i++) {
    const s = sBegin + i * KAART_DS;
    const b = rand(s);
    const sp = rivier.inSprong(s);
    const wit0 = klasseWit[rivier.klasseOp(s)];
    for (let j = 0; j < KAART_B; j++) {
      const d = ((j + 0.5) / KAART_B * 2 - 1) * b;
      let schuim = 0;
      for (const r of rivier.rotsen) {
        const ds = s - r.s;
        if (ds < -2 || ds > 8) continue;
        const a = Math.hypot(ds, d - r.d);
        schuim = Math.max(schuim, 1 - glad((a - r.r + 0.05) / 0.4));
        if (ds > 0) {
          const breed = r.r * 0.8 + ds * 0.18;
          schuim = Math.max(schuim, Math.exp(-ds / 2.4) * Math.exp(-(((d - r.d) / breed) ** 2)) * 0.8);
        }
      }
      // Onder elke waterval een wolk schuim (onder de grote een stuk groter).
      for (const q of rivier.sprongen) {
        const na = s - (q.s + q.lengte);
        const lang = q.groot ? 7 : 1.4 + q.hoogte * 0.25;
        if (na > -0.6 && na < lang * 3) schuim = Math.max(schuim, glad((na + 0.6) / 0.6) * Math.exp(-Math.max(0, na) / lang));
        const voor = q.s - s;
        if (voor > 0 && voor < 0.8) schuim = Math.max(schuim, (1 - voor / 0.8) * 0.55);
      }
      // De toppen van de golftrein.
      for (const t of rivier.treinen) {
        if (s < t.van || s > t.tot) continue;
        const f = (s - t.van) / (t.tot - t.van);
        const top = Math.sin(((s - t.van) / t.golf) * Math.PI * 2);
        schuim = Math.max(schuim, Math.sin(Math.PI * f) * glad((top - 0.55) / 0.4) * 0.75 * (1 - glad((Math.abs(d) / b - 0.6) / 0.3)));
      }
      // Rond het eilandje van de splitsing.
      const eil = rivier.eilandOp(s);
      if (eil > 0) schuim = Math.max(schuim, 1 - glad((Math.abs(d) - eil - 0.3) / 0.5));
      const keer = rivier.keerOp(s, d);
      const glad0 = Math.max(rivier.tongOp(s, d), keer * 0.7);
      const gordijn = sp ? 0.05 + 0.95 * ((s - sp.s) / sp.lengte) : 0;
      const wit = wit0 * (1 - keer) * (sp ? 0 : 1);
      const k = (i * KAART_B + j) * 4;
      kaart[k] = Math.round(Math.min(1, schuim) * 255);
      kaart[k + 1] = Math.round(Math.min(1, glad0) * 255);
      kaart[k + 2] = Math.round(gordijn * 255);
      kaart[k + 3] = Math.round(Math.min(1, wit * 2) * 255);
    }
  }
  const kaartTex = new THREE.DataTexture(kaart, KAART_B, rijenK, THREE.RGBAFormat);
  kaartTex.magFilter = THREE.LinearFilter;
  kaartTex.minFilter = THREE.LinearFilter;
  kaartTex.wrapS = kaartTex.wrapT = THREE.ClampToEdgeWrapping;
  kaartTex.needsUpdate = true;

  // --- Het lint: rijen langs de rivier (fijner bij de watervallen), kolommen dwars ---
  const rijen = [];
  for (let s = sBegin; s < sEind; ) {
    rijen.push(s);
    const sp = rivier.sprongen.find((q) => s > q.s - 0.6 && s < q.s + q.lengte + 0.6);
    s += sp ? (sp.groot ? 0.2 : 0.1) : K.detail ? 0.35 : 0.55;
  }
  rijen.push(sEind);
  const kolommen = K.detail ? 16 : 10;
  const n = rijen.length * (kolommen + 1);
  const pos = new Float32Array(n * 3);
  const riv = new Float32Array(n * 4); // s, d, reistijd, halve breedte
  const golf = new Float32Array(n);
  let tau = 0;
  let vorigeS = rijen[0];
  const pt = [0, 0];
  let k = 0;
  for (const s of rijen) {
    tau += (s - vorigeS) / Math.max(0.3, Math.abs(rivier.stroom((s + vorigeS) / 2, 0)));
    vorigeS = s;
    const b = rand(s);
    const y = rivier.peil(s) + 0.012;
    for (let j = 0; j <= kolommen; j++) {
      const d = (j / kolommen * 2 - 1) * b;
      rivier.puntOp(s, d, pt);
      pos[k * 3] = pt[0];
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = pt[1];
      riv[k * 4] = s;
      riv[k * 4 + 1] = d;
      riv[k * 4 + 2] = tau;
      riv[k * 4 + 3] = b - 0.45;
      golf[k] = rivier.golfOp(s, d);
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
  geo.setAttribute('aGolf', new THREE.BufferAttribute(golf, 1));
  geo.setIndex(index);
  geo.computeBoundingSphere();

  const ko = rivier.kolken[0] ?? { s: -999, d: 0, r: 1, draai: 0 };
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
      uKaart: { value: kaartTex },
      uBereik: { value: new THREE.Vector2(sBegin, (rijenK - 1) * KAART_DS) },
      uKolk: { value: new THREE.Vector4(ko.s, ko.d, ko.r, ko.draai) },
      uEinde: { value: new THREE.Vector2(rivier.sEinde - 1.6, rivier.sEinde) },
    },
  ]);
  uniforms.uZon.value = zonRichting;
  uniforms.uKaart.value = kaartTex;
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
        attribute float aGolf;
        uniform float uTijd;
        varying vec3 vWereld;
        varying vec4 vRiv;
        void main() {
          vRiv = aRiv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          // De staande golven van de golftrein bollen echt op (en ademen een beetje), plus kleine rimpeltjes.
          w.y += aGolf * (1.0 + 0.18 * sin(uTijd * 2.3 + aRiv.x)) + sin(uTijd * 1.9 + aRiv.x * 1.1 + aRiv.y * 1.4) * 0.015;
          vWereld = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTijd;
        uniform vec3 uOndiep, uMidden, uDiep, uTongKleur, uSchuim, uHemel, uZon;
        uniform sampler2D uKaart;
        uniform vec2 uBereik, uEinde;
        uniform vec4 uKolk;
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
          float b = max(vRiv.w, 0.15);
          float q = clamp(abs(d) / b, 0.0, 1.3);
          float t = uTijd;
          float f = vRiv.z - t;
          vec4 kaart = texture2D(uKaart, vec2(clamp((d / (b + 0.45)) * 0.5 + 0.5, 0.0, 1.0), (s - uBereik.x) / uBereik.y));
          float gl = kaart.g;
          float gordijn = kaart.b;
          float wit = kaart.a;

          vec3 c = mix(uDiep, uMidden, smoothstep(0.0, 0.75, q));
          c = mix(c, uOndiep, smoothstep(0.62, 1.0, q));
          c = mix(c, uTongKleur, gl * 0.85);

          // Stroomlijnen die op de echte snelheid meedrijven (niet op glad water).
          float n1 = ruis(vec2(f * 1.1, d * 1.6));
          float n2 = ruis(vec2(f * 2.6 + 7.3, d * 3.7 + 2.0));
          float streep = smoothstep(0.58, 0.9, n1 * 0.62 + n2 * 0.38) * (1.0 - gl * 0.85);
          c = mix(c, mix(uOndiep, vec3(1.0), 0.5), streep * 0.45);

          // Schuim uit de kaart, levendig gemaakt met ruis die meestroomt.
          float ruw = ruis(vec2(f * 4.0, d * 5.0));
          float schuim = kaart.r * (0.55 + 0.45 * smoothstep(0.25, 0.7, ruw));
          // Wit water: hoe wilder de klasse, hoe meer schuimkopjes.
          float kop = smoothstep(1.0 - wit * 0.75, 1.0 - wit * 0.35, ruis(vec2(f * 2.2 + 3.1, d * 2.4)) * 0.6 + ruw * 0.4);
          schuim = max(schuim, kop * 0.9);
          // Langs de oevers een randje schuim.
          schuim = max(schuim, smoothstep(0.84, 1.0, q) * smoothstep(0.3, 0.7, ruw) * 0.85);

          // De kolk: spiraalarmen die ronddraaien, en een donker hart.
          vec2 kv = vec2(s - uKolk.x, d - uKolk.y);
          float ka = length(kv);
          if (ka < uKolk.z * 1.2) {
            float hoek = atan(kv.y, kv.x);
            float arm = sin(hoek * 3.0 + ka * 2.2 - t * uKolk.w * 1.6);
            float binnen = 1.0 - smoothstep(0.0, uKolk.z, ka);
            c = mix(c, uDiep * 0.8, (1.0 - smoothstep(0.0, 0.9, ka)) * 0.6);
            schuim = max(schuim, smoothstep(0.55, 0.95, arm) * binnen * 0.85);
          }

          // Een vallend gordijn: witte stralen die naar beneden schieten.
          if (gordijn > 0.01) {
            float g = (gordijn - 0.05) / 0.95;
            float stralen = ruis(vec2(d * 6.0, g * 9.0 - t * 5.0)) * 0.6 + ruis(vec2(d * 13.0, g * 17.0 - t * 8.0)) * 0.4;
            c = mix(c, vec3(0.93, 0.99, 1.0), 0.45 + 0.4 * stralen);
            schuim = max(schuim, smoothstep(0.55, 0.85, stralen) * (0.5 + 0.5 * g));
          }

          // Glans: kleine golfjes, de hemel in het water en zonneschittering.
          vec2 p = vWereld.xz;
          float gx = 0.3 * cos(f * 6.0 + d * 2.0) + 0.2 * cos(p.x * 1.7 + t * 2.3);
          float gz = 0.3 * cos(d * 3.1 - t * 1.4) + 0.2 * cos(p.y * 1.5 - t * 1.9);
          vec3 nrm = normalize(vec3(-gx * 0.15 * (1.0 - gl * 0.8), 1.0, -gz * 0.15 * (1.0 - gl * 0.8)));
          vec3 kijk = normalize(cameraPosition - vWereld);
          float fres = pow(1.0 - max(kijk.y, 0.0), 4.0);
          c = mix(c, uHemel, fres * 0.35 * (1.0 - gordijn));
          float glans = pow(max(dot(reflect(-kijk, nrm), uZon), 0.0), 70.0);
          c += vec3(1.0, 0.98, 0.9) * glans * 1.1;
          #ifndef EENVOUDIG
          vec2 cel = floor(vec2(f * 3.0, d * 2.5));
          float rnd = hash(cel);
          float twinkel = step(0.965, rnd) * pow(max(sin(t * 3.0 + rnd * 50.0), 0.0), 10.0);
          c += vec3(1.0) * twinkel * 0.6 * (1.0 - schuim);
          #endif

          c = mix(c, uSchuim, clamp(schuim, 0.0, 1.0));
          float alfa = mix(0.88, 0.62, smoothstep(0.75, 1.1, q));
          alfa = max(alfa, clamp(schuim, 0.0, 1.0) * 0.95);
          alfa = max(alfa, step(0.01, gordijn) * 0.9);
          alfa *= smoothstep(1.2, 1.0, q);
          // Aan het einde gaat het lint op in dat van de benedenrivier.
          alfa *= 1.0 - smoothstep(uEinde.x, uEinde.y, s);
          gl_FragColor = vec4(c, alfa);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    })
  );
  water.renderOrder = 2;
  water.frustumCulled = false;
  groep.add(water);

  // --- Rotsen, en de bronrots op de bergtop waar het water onderuit komt ---
  const rotsGeo = maakRots(K.detail);
  const kleuren = FLORA.rots.kleuren;
  const rotsMat = kleuren.map((kl) => new THREE.MeshLambertMaterial({ vertexColors: true, color: new THREE.Color(kl).lerp(new THREE.Color(KL.rots), 0.4) }));
  const zetRots = (x, y, z, r, h, i) => {
    const m = new THREE.Mesh(rotsGeo, rotsMat[i % rotsMat.length]);
    const sy = (h + 0.25) / 0.44;
    m.scale.set(r * 1.05, sy, r * 1.05);
    m.position.set(x, y + h - 0.44 * sy, z);
    m.rotation.y = i * 1.7;
    m.castShadow = K.schaduw;
    m.receiveShadow = K.schaduw;
    groep.add(m);
  };
  rivier.rotsen.forEach((r, i) => zetRots(r.x, r.y, r.z, r.r, r.h, i));
  {
    const [x, z] = rivier.puntOp(rivier.sBegin - 0.8, 0);
    zetRots(x, rivier.peil(0), z, 2.0, 1.6, 3);
    for (const zij of [-1, 1]) {
      const [x2, z2] = rivier.puntOp(rivier.sBegin + 0.4, zij * (rivier.breedte(1) + 0.4));
      zetRots(x2, rivier.peil(0), z2, 1.0, 0.7, 5 + zij);
    }
  }

  // --- Steigers, elk met een vlag in de kleur van de klasse (en zoveel witte strepen) ---
  const vlaggen = [];
  for (const st of rivier.steigers) {
    groep.add(bouwSteiger(st.dek, KL, K));
    const dek = st.dek;
    const land = st.zijde * (dek.halfB - 0.12);
    const vlag = maakVlag(B.vlag.hoogte, B.vlag.kleuren[st.klasse - 1], B.vlag.knop, st.klasse);
    vlag.groep.position.set(dek.x - dek.ax * (dek.halfL - 0.15) - dek.az * land, dek.y, dek.z - dek.az * (dek.halfL - 0.15) + dek.ax * land);
    groep.add(vlag.groep);
    vlaggen.push(vlag);
  }

  // --- De grote waterval: nevel die opstijgt, en een regenboog ---
  const val = rivier.groteVal;
  const valOnder = new THREE.Vector3();
  const nevel = [];
  let regenboog = null;
  if (val) {
    const sOnder = val.s + val.lengte + 0.5;
    const [ox, oz] = rivier.puntOp(sOnder, 0);
    valOnder.set(ox, rivier.peil(sOnder), oz);
    const doek = document.createElement('canvas');
    doek.width = doek.height = 64;
    const ctx = doek.getContext('2d');
    const gr = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.5, 'rgba(240,250,255,0.35)');
    gr.addColorStop(1, 'rgba(240,250,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(doek);
    const aantal = K.detail ? 14 : 8;
    for (let i = 0; i < aantal; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5, fog: true }));
      m.renderOrder = 3;
      groep.add(m);
      nevel.push({ m, fase: i / aantal, opzij: (i * 0.618) % 1 });
    }
    // De regenboog: een halve ring in de nevel, dwars op de rivier, zichtbaar als je naar de waterval kijkt.
    const R0 = Math.max(5, rivier.breedte(sOnder + 3) * 1.25);
    const boogGeo = new THREE.TorusGeometry(R0, 0.55, 8, 40, Math.PI);
    const boogMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uSterkte: { value: 0.55 } },
      vertexShader: /* glsl */ `
        varying float vR;
        varying float vA;
        uniform float uSterkte;
        void main() {
          vR = length(position.xy);
          vA = atan(position.y, position.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vR;
        varying float vA;
        uniform float uSterkte;
        void main() {
          float t = clamp((vR - ${(R0 - 0.55).toFixed(2)}) / 1.1, 0.0, 1.0);
          vec3 c = clamp(abs(mod(t * 5.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          float rand = smoothstep(0.0, 0.25, t) * smoothstep(1.0, 0.75, t);
          float voet = smoothstep(0.0, 0.45, vA) * smoothstep(3.14159, 2.7, vA);
          gl_FragColor = vec4(c * rand * voet * uSterkte, 1.0);
        }`,
    });
    regenboog = new THREE.Mesh(boogGeo, boogMat);
    const [bx2, bz2] = rivier.puntOp(sOnder + 4, 0);
    regenboog.position.set(bx2, valOnder.y + 0.2, bz2);
    regenboog.rotation.y = rivier.richtingOp(sOnder + 4);
    regenboog.renderOrder = 4;
    groep.add(regenboog);
  }

  const tmp = new THREE.Vector3();
  return {
    groep,
    water,
    /** Waar de grote waterval in de poel stort. */
    valOnder,
    werkBij(tijd, dt, camera) {
      uniforms.uTijd.value = tijd;
      for (const [i, vl] of vlaggen.entries()) {
        tmp.set(rivier.steigers[i].dek.x, rivier.steigers[i].dek.y, rivier.steigers[i].dek.z);
        if (camera.position.distanceToSquared(tmp) < 120 * 120) vl.wapper(tijd);
      }
      if (val && camera.position.distanceToSquared(valOnder) < 220 * 220) {
        const H = val.hoogte;
        for (const nv of nevel) {
          const f = (tijd * 0.12 + nv.fase) % 1;
          const zij = (nv.opzij * 2 - 1) * rivier.breedte(val.s + val.lengte + 2);
          const [x, z] = rivier.puntOp(val.s + val.lengte + 0.6 + f * 3.5, zij * (0.6 + f * 0.6));
          nv.m.position.set(x, valOnder.y + 0.6 + f * H * 0.55, z);
          const g = 2.6 + f * 6.5;
          nv.m.scale.set(g, g, 1);
          nv.m.material.opacity = 0.42 * Math.sin(Math.PI * f) ** 0.8;
        }
        if (regenboog) regenboog.material.uniforms.uSterkte.value = 0.42 + 0.12 * Math.sin(tijd * 0.6);
      }
    },
  };
}
