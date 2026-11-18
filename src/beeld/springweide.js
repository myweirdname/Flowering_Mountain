// Het beeld van de springweide (GD 6, 14): de hindernissen, paaltjes met vlaggetjes, de bloemenboog van
// start en finish, het water van de vijver, de beek en de poel, en de wortels. Alles door code.
// Alle vaste stukken samen zijn één tekenopdracht; het water en de wortels zijn er nog twee.
import * as THREE from 'three';
import { Bouwer, maakBol, maakBuis, matrix } from './maak/vorm.js';
import { maakRots } from './maak/klein.js';
import { maakPlantMateriaal } from './wind.js';
import { WEIDE } from '../data/springweide.js';
import { waardenruis } from '../sim/wereld/ruis.js';

const KL = WEIDE.kleuren;
const k = new THREE.Color();
const kA = new THREE.Color();
const OP = new THREE.Vector3(0, 1, 0);

/** Een vaste willekeur, zodat de weide er elke keer hetzelfde uitziet. */
function maakToeval(zaad) {
  let r = zaad * 7919 + 13;
  return () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
}

/**
 * Matrix van de eigen assen van een hindernis naar de wereld: x = dwars op de baan, y = omhoog,
 * z = langs de baan. (Rechtshandig, zodat de normalen goed blijven.)
 */
function assen(x, y, z, tx, tz) {
  const X = new THREE.Vector3(tx, 0, tz);
  const Z = new THREE.Vector3().crossVectors(X, OP);
  return new THREE.Matrix4().makeBasis(X, OP, Z).setPosition(x, y, z);
}

/**
 * @param {ReturnType<typeof import('../sim/wereld/springweide.js').maakWeide>} weide
 * @param {number} detail 0 = eenvoudig (laag), 1 = rijk
 */
export function maakWeidebeeld(weide, detail) {
  const b = new Bouwer();
  const fijn = detail > 0;
  const toeval = maakToeval(7);
  const kleur = (hex) => k.set(hex);

  // Elk onderdeel wordt eerst in zijn eigen assen gebouwd (zodat kleuren en wind kloppen),
  // en daarna als één stuk op zijn plek in de wereld gezet.
  /** @type {Bouwer} */
  let huidig = new Bouwer();
  const zet = (M, geo, lokaal, o = {}) => huidig.voegToe(geo, { ...o, matrix: lokaal ?? undefined });
  const klaar = (M) => {
    b.voegToe(huidig.maak(), { matrix: M });
    huidig = new Bouwer();
  };

  // --- Paaltjes met een vlaggetje, aan weerszijden van een hindernis ---
  function paaltje(M, x, vlagKleur, naarBuiten, z) {
    const h = 1.3;
    zet(M, new THREE.CylinderGeometry(0.055, 0.065, h, fijn ? 10 : 6), matrix(x, h / 2, z), {
      kleur: (p) => kleur(Math.floor((p.y + 10) / 0.22) % 2 ? KL.paalStreep : KL.paal),
    });
    zet(M, maakBol(0.085, fijn ? 2 : 1), matrix(x, h + 0.04, z), { kleur: KL.paal });
    // Driehoekig vlaggetje dat wappert in de wind.
    const vlag = new THREE.BufferGeometry();
    const s = naarBuiten;
    vlag.setAttribute('position', new THREE.Float32BufferAttribute([x, h - 0.02, z, x, h - 0.3, z, x + s * 0.36, h - 0.16, z], 3));
    vlag.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    huidig.voegToe(vlag, { kleur: vlagKleur, zwaai: (p) => Math.abs(p.x - x) * 2.2 });
  }

  // --- Boomstam: dikke ronde stam met jaarringen, mos en paddenstoeltjes ---
  function boomstam(M, d) {
    const r = d.hoogte / 2;
    const lang = d.breed * 2 - 0.1;
    const stam = new THREE.CylinderGeometry(r, r * 1.04, lang, fijn ? 18 : 10, fijn ? 6 : 2, true).rotateZ(Math.PI / 2);
    zet(M, stam, matrix(0, r, 0), {
      kleur: (p) => {
        const a = Math.atan2(p.y - r, p.z);
        const vlek = waardenruis(p.x * 2.2, a * 2, 5);
        return kleur(KL.bast).lerp(kA.set(KL.bastDonker), (Math.sin(a * 9 + p.x * 0.8) * 0.5 + 0.5) * 0.35 + vlek * 0.2);
      },
    });
    for (const kant of [-1, 1]) {
      const schijf = new THREE.CircleGeometry(r * 0.98, fijn ? 18 : 10).rotateY((kant * Math.PI) / 2);
      zet(M, schijf, matrix(kant * lang / 2, r, 0), {
        kleur: (p) => {
          const afstand = Math.hypot(p.y - r, p.z) / r;
          return kleur(KL.hout).lerp(kA.set(KL.houtRing), Math.pow(Math.abs(Math.sin(afstand * 11)), 3) * 0.8 + (afstand > 0.9 ? 0.6 : 0));
        },
      });
    }
    // Mosplukjes bovenop.
    for (let i = 0; i < (fijn ? 7 : 4); i++) {
      const x = -lang / 2 + 0.3 + toeval() * (lang - 0.6);
      zet(M, maakBol(1, 1), matrix(x, r * 2 - 0.02, (toeval() - 0.5) * 0.15, 0, 0, 0, 0.16 + toeval() * 0.1, 0.06, 0.13), {
        kleur: (p) => kleur(KL.mos).multiplyScalar(0.9 + 0.2 * toeval()),
      });
    }
    // Paddenstoeltjes: rode hoedjes met witte stipjes.
    const plekken = [[lang / 2 - 0.45, 1], [lang / 2 - 0.7, 1], [-lang / 2 + 0.6, -1]];
    for (const [x, zij] of plekken) {
      const z = zij * r * 0.75;
      const y = r + Math.sqrt(Math.max(0, r * r - z * z)) * 0.9;
      zet(M, new THREE.CylinderGeometry(0.025, 0.03, 0.09, 6), matrix(x, y + 0.04, z), { kleur: 0xfff4e6 });
      zet(M, new THREE.SphereGeometry(0.075, fijn ? 12 : 6, 6, 0, Math.PI * 2, 0, Math.PI / 2), matrix(x, y + 0.08, z, 0, 0, 0, 1, 0.75, 1), {
        kleur: KL.paddenstoel,
      });
      if (fijn) for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2 + 0.4;
        zet(M, maakBol(0.014, 0), matrix(x + Math.cos(a) * 0.045, y + 0.115, z + Math.sin(a) * 0.045), { kleur: 0xffffff });
      }
    }
  }

  // --- Bloemenhaag: een rij ronde groene bollen vol bloemetjes ---
  function haag(M, d) {
    const h = d.hoogte;
    const lang = d.breed * 2;
    const n = Math.ceil(lang / 0.42);
    for (let i = 0; i < n; i++) {
      const x = -lang / 2 + 0.22 + (i / (n - 1)) * (lang - 0.44);
      const sx = 0.32 + toeval() * 0.08;
      const sy = h * (0.52 + toeval() * 0.06);
      zet(M, maakBol(1, fijn ? 2 : 1), matrix(x, sy * 0.95, (toeval() - 0.5) * 0.06, 0, toeval() * 3, 0, sx, sy, d.diep * 1.08), {
        kleur: (p) => kleur(KL.haag).lerp(kA.set(KL.haagLicht), THREE.MathUtils.clamp(p.y / h, 0, 1) * 0.8),
        zwaai: (p) => Math.max(0, p.y - h * 0.6) * 0.5,
      });
    }
    // Bloemetjes op de voorkant, de achterkant en de bovenkant.
    const aantal = Math.round(lang * (fijn ? 6 : 3));
    for (let i = 0; i < aantal; i++) {
      const x = -lang / 2 + 0.12 + toeval() * (lang - 0.24);
      const hoek = (toeval() - 0.5) * Math.PI * 1.1;
      const y = h * 0.5 + Math.sin(Math.abs(hoek) < 0.6 ? Math.PI / 2 : Math.PI / 2 - Math.abs(hoek) + 0.6) * h * 0.47;
      const z = Math.sin(hoek) * (d.diep + 0.02);
      const c = KL.haagBloemen[i % KL.haagBloemen.length];
      zet(M, maakBol(1, fijn ? 1 : 0), matrix(x, y, z, 0, 0, 0, 0.07, 0.045, 0.07), { kleur: c, zwaai: 0.25 });
      if (fijn) zet(M, maakBol(0.025, 0), matrix(x, y + 0.035, z), { kleur: 0xffd84d, zwaai: 0.25 });
    }
  }

  // --- Rotsrug: drie ronde lila rotsen naast elkaar ---
  function rotsrug(M, d) {
    const geo = maakRots(detail);
    const lang = d.breed * 2;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const x = -lang / 2 + (lang / n) * (i + 0.5);
      const g = 0.92 + toeval() * 0.16;
      zet(M, geo, matrix(x, 0, 0, 0, toeval() * 0.6 - 0.3, 0, (lang / n) * 0.62 * g, (d.hoogte / 0.44) * g * 0.98, (d.diep / 0.85) * 1.05), {
        kleur: (p, j, gg) => kleur(KL.rots).lerp(kA.set(KL.rotsLicht), 0.25).multiplyScalar(gg.attributes.color.getX(j)),
      });
    }
    geo.dispose();
  }

  // --- Hekje (voor de dubbelsprong): twee balkjes met roze streepjes en een bloemenslinger ---
  function hekje(M, d) {
    const h = d.hoogte;
    const lang = d.breed * 2;
    for (const x of [-lang / 2 + 0.08, 0, lang / 2 - 0.08]) {
      zet(M, new THREE.CylinderGeometry(0.06, 0.07, h + 0.08, fijn ? 10 : 6), matrix(x, (h + 0.08) / 2, 0), { kleur: KL.hek });
      zet(M, maakBol(0.075, 1), matrix(x, h + 0.1, 0), { kleur: KL.hekStreep });
    }
    for (const y of [h * 0.42, h - 0.04]) {
      zet(M, new THREE.CylinderGeometry(0.045, 0.045, lang, fijn ? 8 : 5, Math.ceil(lang / 0.3)).rotateZ(Math.PI / 2), matrix(0, y, 0), {
        kleur: (p) => kleur(Math.floor((p.x + 10) / 0.3) % 2 ? KL.hekStreep : KL.hek),
      });
    }
    const aantal = Math.round(lang / (fijn ? 0.22 : 0.4));
    for (let i = 0; i < aantal; i++) {
      const x = -lang / 2 + 0.15 + (i / (aantal - 1)) * (lang - 0.3);
      const zak = Math.sin((i / (aantal - 1)) * Math.PI * 4) * 0.05;
      zet(M, maakBol(1, fijn ? 1 : 0), matrix(x, h + 0.02 - Math.abs(zak), 0.03, 0, 0, 0, 0.065, 0.05, 0.065), {
        kleur: i % 3 === 0 ? 0x8fe07a : KL.haagBloemen[i % KL.haagBloemen.length],
        zwaai: 0.15,
      });
    }
  }

  // --- De hindernissen zelf ---
  const groepKleur = (g) => KL.vlaggen[g % KL.vlaggen.length];
  for (const d of weide.delen) {
    const M = assen(d.x, d.y, d.z, d.tx, d.tz);
    if (d.soort === 'boomstam') boomstam(M, d);
    else if (d.soort === 'haag') haag(M, d);
    else if (d.soort === 'rots') rotsrug(M, d);
    else if (d.soort === 'dubbel') hekje(M, d);
    // Paaltjes aan de rand van de baan (bij de beek: aan beide oevers van de baan).
    const p = weide.baanPunt(d.s);
    const [bx, bz] = weide.naarWereld(p.u, p.v);
    const b0 = (bx - d.x) * d.tx + (bz - d.z) * d.tz;
    const rand = weide.B / 2 + WEIDE.uitsteek + 0.15;
    if (d.water) {
      // De beek: paaltjes op beide oevers.
      for (const kant of [-1, 1]) for (const zij of [-1, 1]) paaltje(M, b0 + kant * rand, groepKleur(d.groep), kant, zij * (d.diep + 0.35));
    } else for (const kant of [-1, 1]) paaltje(M, b0 + kant * rand, groepKleur(d.groep), kant, 0);
    klaar(M);
  }

  // --- Bloemenboog over de start en finish ---
  {
    const g = weide.poort;
    const M = assen(g.x, g.y, g.z, g.tx, g.tz);
    const w = g.breed;
    const paal = 1.7;
    for (const kant of [-1, 1]) {
      zet(M, new THREE.CylinderGeometry(0.12, 0.14, paal, fijn ? 14 : 8, 8), matrix(kant * w, paal / 2, 0), {
        kleur: (p) => kleur(Math.floor((p.y + Math.atan2(p.z, p.x - kant * w) * 0.05 + 10) / 0.25) % 2 ? KL.paalStreep : KL.boog),
      });
    }
    const punten = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI - (i / 16) * Math.PI;
      punten.push(new THREE.Vector3(Math.cos(a) * w, paal + Math.sin(a) * 1.35, 0));
    }
    zet(M, maakBuis(punten, () => 0.1, fijn ? 40 : 20, fijn ? 8 : 5), null, { kleur: KL.boog });
    const boog = new THREE.CatmullRomCurve3(punten);
    const n = fijn ? 30 : 16;
    for (let i = 0; i <= n; i++) {
      const q = boog.getPointAt(i / n);
      const c = KL.boogBloemen[i % KL.boogBloemen.length];
      const s = 0.13 + (i % 3) * 0.025;
      zet(M, maakBol(s, fijn ? 2 : 1), matrix(q.x, q.y, (i % 2 ? 1 : -1) * 0.07), { kleur: c, zwaai: 0.1 });
      if (i % 2 === 0) zet(M, maakBol(1, 1), matrix(q.x, q.y - 0.05, 0, 0, i, 0.5, 0.17, 0.05, 0.1), { kleur: 0x6fd35e, zwaai: 0.1 });
    }
    // Een gouden hoefijzer bovenaan.
    zet(M, new THREE.TorusGeometry(0.26, 0.065, 8, 18, Math.PI * 1.45).rotateZ(-Math.PI * 0.225 - Math.PI / 2), matrix(0, paal + 1.6, 0), {
      kleur: KL.hoefijzer,
    });
    // De finishlijn: een rij geblokte vakjes op het zand.
    const vak = 0.38;
    const rijen = 2;
    for (let i = 0; i < Math.round((w * 2) / vak); i++) {
      for (let j = 0; j < rijen; j++) {
        const x = -w + (i + 0.5) * vak;
        const z = (j - (rijen - 1) / 2) * vak;
        zet(M, new THREE.PlaneGeometry(vak, vak).rotateX(-Math.PI / 2), matrix(x, 0.025, z), { kleur: (i + j) % 2 ? KL.paalStreep : 0xffffff });
      }
    }
    klaar(M);
  }

  // --- Rond het water: waterlelies, een paar lotusbloemen en riet ---
  const Vj = WEIDE.vijver;
  const Pl = WEIDE.poel;
  const opWater = weide.waterY + 0.015;
  const lelie = (u, v, s, draai, bloem) => {
    const [x, z] = weide.naarWereld(u, v);
    const blad = new THREE.CircleGeometry(s, fijn ? 16 : 9, 0.3, Math.PI * 2 - 0.6).rotateX(-Math.PI / 2);
    zet(null, blad, null, { kleur: (p) => kleur(KL.lelieblad).lerp(kA.set(0xa4ee8a), (Math.hypot(p.x, p.z) / s) * 0.4) });
    klaar(matrix(x, opWater, z, 0, draai, 0));
    if (bloem) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.voegToe(maakBol(1, 1), {
          matrix: matrix(x + Math.cos(a) * 0.07, opWater + 0.07, z + Math.sin(a) * 0.07, 0.6, -a + Math.PI / 2, 0, 0.05, 0.11, 0.035),
          kleur: KL.lotus,
          zwaai: 0.1,
        });
      }
      b.voegToe(maakBol(0.04, 1), { matrix: matrix(x, opWater + 0.06, z), kleur: 0xffd84d });
    }
  };
  for (let i = 0; i < (fijn ? 7 : 4); i++) {
    const a = toeval() * Math.PI * 2;
    const r = Math.sqrt(toeval()) * (Vj.straal - 1.1);
    lelie(Vj.u + Math.cos(a) * r, Vj.v + Math.sin(a) * r, 0.28 + toeval() * 0.14, toeval() * 6, i < 2);
  }
  lelie(Pl.u + 0.6, Pl.v + 0.3, 0.3, 1, true);
  lelie(Pl.u - 0.5, Pl.v - 0.4, 0.25, 3, false);
  const riet = (u, v) => {
    const [x, z] = weide.naarWereld(u, v);
    const y = weide.hoogte - 0.1;
    for (let i = 0; i < (fijn ? 5 : 3); i++) {
      const dx = (toeval() - 0.5) * 0.5;
      const dz = (toeval() - 0.5) * 0.5;
      const h = 0.7 + toeval() * 0.45;
      zet(null, new THREE.CylinderGeometry(0.012, 0.02, h, 4), matrix(dx, h / 2, dz), { kleur: 0x6cc85a, zwaai: (p) => Math.max(0, p.y) * 0.8 });
      if (i % 2 === 0) zet(null, new THREE.CylinderGeometry(0.035, 0.035, 0.17, 6), matrix(dx, h - 0.12, dz), { kleur: 0xa8673f, zwaai: h * 0.7 });
    }
    klaar(matrix(x, y, z));
  };
  for (const a of [0.3, 1.6, 2.6, 4.2, 5.4]) riet(Pl.u + Math.cos(a) * (Pl.straal + 0.25), Pl.v + Math.sin(a) * (Pl.straal + 0.25));
  for (const a of [3.4, 4.0, 5.9]) riet(Vj.u + Math.cos(a) * (Vj.straal + 0.2), Vj.v + Math.sin(a) * (Vj.straal + 0.2));

  const geo = b.maak();
  const vast = new THREE.Mesh(geo, maakPlantMateriaal({ gloed: 0x14100e }));
  vast.castShadow = true;
  vast.receiveShadow = true;

  // --- Water: één vlak over vijver, beek en poel; het gras eromheen dekt de rest af ---
  const uMin = Math.min(Vj.u - Vj.straal, Pl.u - Pl.straal) - 0.6;
  const uMax = Math.max(Vj.u + Vj.straal, Pl.u + Pl.straal) + 0.6;
  const vMin = Vj.v - Vj.straal - 0.6;
  const vMax = Pl.v + Pl.straal + 0.6;
  const [x0, z0] = weide.naarWereld(uMin, vMin);
  const [x1, z1] = weide.naarWereld(uMax, vMax);
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTijd: { value: 0 },
      uWater: { value: new THREE.Color(KL.water) },
      uDiep: { value: new THREE.Color(KL.waterDiep) },
      uLicht: { value: new THREE.Color(KL.waterLicht) },
      uMidden: { value: new THREE.Vector2(...weide.naarWereld(Vj.u, Vj.v)) },
    },
  ]);
  const waterMat = new THREE.ShaderMaterial({
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
      uniform vec3 uWater, uDiep, uLicht;
      uniform vec2 uMidden;
      varying vec3 vWereld;
      void main() {
        vec2 p = vWereld.xz;
        float t = uTijd;
        // Het water stroomt van het vijvertje naar de poel: golfjes die meeschuiven.
        float stroom = sin(p.y * 3.1 - t * 2.4 + sin(p.x * 2.3 + t * 0.7) * 0.9);
        float rimpel = sin(p.x * 5.3 + p.y * 1.7 - t * 1.6) * sin(p.y * 4.1 - t * 2.0);
        vec3 c = mix(uWater, uDiep, 0.35 + 0.25 * sin(p.x * 0.9 + p.y * 0.7));
        float licht = smoothstep(0.55, 1.0, stroom * 0.6 + rimpel * 0.5);
        c = mix(c, uLicht, licht * 0.65);
        // Twinkelsterretjes.
        vec2 cel = floor(p * 2.5);
        float rnd = fract(sin(dot(cel, vec2(12.9898, 78.233))) * 43758.5453);
        vec2 f = fract(p * 2.5) - 0.5;
        float twinkel = step(0.93, rnd) * pow(max(sin(t * 3.0 + rnd * 50.0), 0.0), 10.0);
        twinkel *= smoothstep(0.16, 0.0, abs(f.x) * abs(f.y) * 9.0 + length(f) * 0.35);
        c += vec3(1.0) * twinkel * 0.8;
        gl_FragColor = vec4(c, 0.86);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)).rotateX(-Math.PI / 2), waterMat);
  water.position.set((x0 + x1) / 2, weide.waterY, (z0 + z1) / 2);
  water.renderOrder = 1;

  // --- Wortels: oranje, met een pluim groen loof; ze wiebelen en groeien terug als ze op zijn ---
  const wb = new Bouwer();
  wb.voegToe(new THREE.ConeGeometry(0.075, 0.34, fijn ? 10 : 6, 4).rotateX(Math.PI), {
    matrix: matrix(0, 0.09, 0),
    kleur: (p) => kleur(KL.wortel).lerp(kA.set(KL.wortelLicht), Math.abs(Math.sin(p.y * 40)) * 0.35),
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    wb.voegToe(new THREE.ConeGeometry(0.03, 0.26, 4), {
      matrix: matrix(Math.cos(a) * 0.03, 0.37, Math.sin(a) * 0.03, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35),
      kleur: KL.wortelLoof,
      zwaai: (p) => Math.max(0, p.y - 0.25) * 2,
    });
  }
  const wortelGeo = wb.maak();
  const wortelMesh = new THREE.InstancedMesh(wortelGeo, maakPlantMateriaal({ gloed: 0x2a1408 }), weide.wortels.length);
  wortelMesh.castShadow = true;
  wortelMesh.frustumCulled = false;
  const wortels = weide.wortels.map((w) => ({ ...w, schaal: 1, doel: 1, fase: w.id * 1.7 }));
  const mat4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  const pv = new THREE.Vector3();

  const groep = new THREE.Group();
  groep.add(vast, water, wortelMesh);

  return {
    groep,
    vast,
    /** Een wortel is opgegeten. */
    pak(id) {
      wortels[id].doel = 0;
    },
    /** Een wortel is teruggegroeid. */
    terug(id) {
      wortels[id].doel = 1;
      wortels[id].schaal = 0;
    },
    werkBij(tijd, dt) {
      uniforms.uTijd.value = tijd;
      for (const w of wortels) {
        // Opeten: snel weg. Teruggroeien: met een klein veertje.
        if (w.doel === 0) w.schaal = Math.max(0, w.schaal - dt * 6);
        else if (w.schaal < 1) w.schaal = Math.min(1, w.schaal + dt * 1.6);
        const veer = w.doel === 1 && w.schaal < 1 ? 1 + Math.sin(w.schaal * Math.PI) * 0.35 : 1;
        const s = w.schaal * veer * 1.15;
        q.setFromAxisAngle(OP, tijd * 0.8 + w.fase);
        pv.set(w.x, w.y + 0.03 + Math.sin(tijd * 2.2 + w.fase) * 0.035, w.z);
        sv.setScalar(Math.max(s, 1e-4));
        wortelMesh.setMatrixAt(w.id, mat4.compose(pv, q, sv));
      }
      wortelMesh.instanceMatrix.needsUpdate = true;
    },
  };
}
