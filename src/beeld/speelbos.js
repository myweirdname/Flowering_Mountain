// Het beeld van het speelbos (stap 11): reuzenbomen met houten boomhutplatforms, een trap, lianen aan een
// dikke tak, een touwbrug met ontbrekende plankjes, een balanceerstam, de springbloem, reuzenbladeren
// en lotusbladeren in een vijvertje, en het finish-eilandje met een bloemenboog. Alles door code.
// Het beeld leest alleen de toestand uit de simulatie (de lianen, de brug, de bladeren); het beslist niets.
// Tekenopdrachten: één voor alles wat vastligt, en een handvol voor wat beweegt.
import * as THREE from 'three';
import { Bouwer, maakBol, maakBuis, matrix } from './maak/vorm.js';
import { maakPlantMateriaal } from './wind.js';
import { SPEELBOS } from '../data/speelbos.js';
import { naarWereld } from '../sim/doorgangen/hulp.js';
import { brugHoogte, brugOpzij, inGat } from '../sim/doorgangen/touwbrug.js';
import { bladTop } from '../sim/doorgangen/reuzenblad.js';
import { lotusTop } from '../sim/doorgangen/lotus.js';
import { bloemT } from '../sim/doorgangen/springbloem.js';
import { anker, touwLengte } from '../sim/doorgangen/liaan.js';
import { waardenruis } from '../sim/wereld/ruis.js';

const KL = SPEELBOS.kleuren;
const k = new THREE.Color();
const kA = new THREE.Color();
const OP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();

/** Matrix die (0, 0, 0)–(0, 1, 0) van een eenheidscilinder over het stuk p–q legt, met dikte r. */
function stukMatrix(p, q, r, uit) {
  tmpV.subVectors(q, p);
  const l = tmpV.length() || 1e-4;
  tmpQ.setFromUnitVectors(OP, tmpV.divideScalar(l));
  tmpS.set(r, l, r);
  return uit.compose(p, tmpQ, tmpS);
}

/**
 * @param {ReturnType<typeof import('../sim/doorgangen/speelbos.js').maakSpeelbos>} bos
 * @param {any} K kwaliteit (K.detail: 0 = eenvoudig, 1 = rijk; K.schaduw)
 */
export function maakSpeelbosbeeld(bos, K) {
  const D = bos.D;
  const fijn = K.detail > 0;
  const groep = new THREE.Group();
  const b = new Bouwer();
  const kleur = (hex) => k.set(hex);
  const zijden = fijn ? 14 : 8;
  let toeval = 12345;
  const rnd = () => {
    toeval = (toeval * 16807) % 2147483647;
    return toeval / 2147483647;
  };

  const houtKleur = (p, donker = 0) => {
    const nerf = waardenruis(p.x * 3.1 + p.z * 0.4, p.y * 9 + p.z * 3.1, 3);
    return kleur(KL.hout).lerp(kA.set(KL.houtDonker), 0.15 + nerf * 0.35 + donker);
  };
  const stamKleur = (p) => {
    const a = Math.atan2(p.z, p.x);
    return kleur(KL.stam).lerp(kA.set(KL.stamDonker), (Math.sin(a * 7 + p.y * 1.3) * 0.5 + 0.5) * 0.35 + waardenruis(p.y * 2, a * 3, 9) * 0.2);
  };

  // --- Paaltje en touwleuning ---
  function paal(x, y0, z, h, r = 0.06) {
    b.voegToe(new THREE.CylinderGeometry(r, r * 1.15, h, fijn ? 8 : 5), { matrix: matrix(x, y0 + h / 2, z), kleur: KL.houtDonker });
    b.voegToe(maakBol(r * 1.35, fijn ? 1 : 0), { matrix: matrix(x, y0 + h, z), kleur: KL.houtLicht });
  }
  function touw(p, q, doorzak = 0.08, r = 0.03) {
    const m = new THREE.Vector3().lerpVectors(p, q, 0.5);
    m.y -= doorzak;
    b.voegToe(maakBuis([p, m, q], () => r, fijn ? 8 : 4, fijn ? 6 : 4), { kleur: KL.touw });
  }

  // --- Een platform: een rond plankendek, met een rand, leuningen en eronder steunen ---
  const openingen = bos.dekken.map(() => []);
  bos.modules.forEach((m) => {
    openingen[m.i].push(Math.atan2(m.a[1], m.a[0]));
    openingen[m.i + 1].push(Math.atan2(-m.a[1], -m.a[0]));
  });
  openingen[0].push(Math.atan2(bos.trap.a[1], bos.trap.a[0]));
  openingen[openingen.length - 1].push(Math.atan2(bos.uitgang.a[1], bos.uitgang.a[0]));
  // Waar de boom tegen het platform staat: geen leuning.
  bos.dekken.forEach((d, i) => d.boom && openingen[i].push(Math.atan2(d.boomRichting[1], d.boomRichting[0])));

  bos.dekken.forEach((d, di) => {
    const dik = 0.2;
    if (d.soort === 'eiland') {
      // Het finish-eilandje: een grasheuvel met een zandrandje.
      const geo = new THREE.CylinderGeometry(d.straal, d.straal + 0.5, d.h - bos.vloer + 1.7, fijn ? 28 : 14, 3);
      b.voegToe(geo, {
        matrix: matrix(d.x, (d.h + bos.vloer - 1.7) / 2, d.z),
        kleur: (p) => (p.y > d.h - 0.12 ? kleur(0x8fe06a).lerp(kA.set(0x6fd35e), waardenruis(p.x * 1.3, p.z * 1.3, 4) * 0.5) : kleur(0xf6d9a0)),
      });
      return;
    }
    // Plankjes: om de 0,32 m een iets andere kleur, een donker randje rond.
    const dek = new THREE.CylinderGeometry(d.straal, d.straal, dik, fijn ? 32 : 16, 1);
    b.voegToe(dek, {
      matrix: matrix(d.x, d.h - dik / 2, d.z),
      kleur: (p) => {
        const rand = Math.hypot(p.x - d.x, p.z - d.z) > d.straal - 0.12 || p.y < d.h - 0.02;
        const plank = Math.floor((p.x - d.x + 10) / 0.32);
        return houtKleur(p, rand ? 0.35 : (plank % 2) * 0.12);
      },
    });
    // Leuning: paaltjes rond, behalve waar een doorgang of trap begint.
    const vrij = (hoek) => openingen[di].every((o) => Math.abs(Math.atan2(Math.sin(hoek - o), Math.cos(hoek - o))) > 0.55);
    const n = d.soort === 'steiger' ? 8 : 12;
    let vorige = null;
    for (let i = 0; i <= n; i++) {
      const h = (i / n) * Math.PI * 2;
      if (!vrij(h)) {
        vorige = null;
        continue;
      }
      const x = d.x + Math.cos(h) * (d.straal - 0.08);
      const z = d.z + Math.sin(h) * (d.straal - 0.08);
      if (i < n) paal(x, d.h, z, 0.75);
      const top = new THREE.Vector3(x, d.h + 0.72, z);
      if (vorige) touw(vorige, top, 0.06);
      vorige = top;
    }
    // Eronder: palen tot op de bosvloer (of de bodem van de vijver), en een schuine steun tegen de boom.
    const voet = d.soort === 'steiger' ? bos.vloer - D.vijver.diepte : bos.vloer;
    for (let i = 0; i < 4; i++) {
      const h = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = d.x + Math.cos(h) * (d.straal - 0.35);
      const z = d.z + Math.sin(h) * (d.straal - 0.35);
      b.voegToe(new THREE.CylinderGeometry(0.1, 0.12, d.h - voet, 6), { matrix: matrix(x, (d.h + voet) / 2, z), kleur: KL.houtDonker });
    }
    if (d.boom) {
      for (const zij of [-0.5, 0.5]) {
        const [rx, rz] = d.boomRichting;
        const hx = Math.cos(Math.atan2(rz, rx) + zij);
        const hz = Math.sin(Math.atan2(rz, rx) + zij);
        b.voegToe(new THREE.CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0), {
          matrix: stukMatrix(new THREE.Vector3(d.x + hx * (d.straal - 0.3), d.h - dik, d.z + hz * (d.straal - 0.3)), new THREE.Vector3(d.bx, d.h - 1.7, d.bz), 1, new THREE.Matrix4()),
          kleur: KL.houtDonker,
        });
      }
    }
  });

  // --- De reuzenbomen: dikke stam met plankwortels, mos, en een bolle kruin ---
  const kruinKleuren = [KL.kruin, KL.kruinLicht, 0x45c463, 0x3db97e];
  for (const dek of bos.dekken.filter((q) => q.boom)) {
    const d = { x: dek.bx, z: dek.bz };
    const H = bos.vloer + D.boomHoogte;
    const stam = maakBuis(
      [new THREE.Vector3(d.x, bos.vloer - 0.3, d.z), new THREE.Vector3(d.x + 0.05, (bos.vloer + H) / 2, d.z - 0.04), new THREE.Vector3(d.x - 0.08, H, d.z + 0.05)],
      (t) => D.stam * (1.5 - 0.6 * Math.min(1, t * 4) + (t > 0.85 ? (t - 0.85) * 2 : 0)),
      fijn ? 12 : 6, zijden
    );
    b.voegToe(stam, { kleur: (p) => stamKleur(tmpV.set(p.x - d.x, p.y, p.z - d.z)) });
    // Plankwortels.
    for (let i = 0; i < 4; i++) {
      const h = (i / 4) * Math.PI * 2 + rnd();
      const w = maakBuis(
        [new THREE.Vector3(Math.cos(h) * 0.4, 1.4, Math.sin(h) * 0.4), new THREE.Vector3(Math.cos(h) * 0.9, 0.5, Math.sin(h) * 0.9), new THREE.Vector3(Math.cos(h) * 1.6, -0.1, Math.sin(h) * 1.6)],
        (t) => 0.22 * (1 - t * 0.6), fijn ? 6 : 3, fijn ? 7 : 4
      );
      b.voegToe(w, { matrix: matrix(d.x, bos.vloer, d.z), kleur: KL.stamDonker });
    }
    // De kruin: een paar dikke wolkjes.
    const bollen = [[0, 0.6, 0, 3.0], [2.2, -0.2, 0.6, 2.1], [-1.9, 0, 1.2, 2.0], [0.4, -0.3, -2.2, 2.1], [-0.8, 1.4, -0.6, 1.8]];
    bollen.forEach(([x, y, z, r], i) => {
      const c = kruinKleuren[(((i + Math.floor(d.x)) % kruinKleuren.length) + kruinKleuren.length) % kruinKleuren.length];
      b.voegToe(maakBol(r, fijn ? 2 : 1), {
        matrix: matrix(d.x + x, H + 1.2 + y, d.z + z, 0, rnd() * 6, 0, 1, 0.82, 1),
        kleur: (p) => {
          const ny = (p.y - (H + 1.2 + y)) / r;
          return kleur(c).multiplyScalar(0.7 + 0.3 * (ny * 0.5 + 0.5)).lerp(kA.set(0xffffff), Math.max(0, ny) * 0.15);
        },
        zwaai: (p) => Math.max(0, (p.y - H) * 0.05),
      });
    }
    );
  }

  // --- De trap naar het eerste platform en de uitgang van het eilandje ---
  function plank(p, latjes, leuning) {
    const n = Math.ceil(p.len / 0.3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * (p.len / n);
      const [x, z] = naarWereld(p, t, 0);
      const y = p.h0 + (p.h1 - p.h0) * (t / p.len);
      const helling = Math.atan2(p.h0 - p.h1, p.len);
      b.voegToe(new THREE.BoxGeometry(p.breed, 0.08, p.len / n - 0.03), {
        matrix: matrix(x, y - 0.05, z, helling, Math.atan2(p.a[0], p.a[1])),
        kleur: (q) => houtKleur(q, (i % 2) * 0.1),
      });
      if (latjes && i % 2 === 0) b.voegToe(new THREE.BoxGeometry(p.breed * 0.9, 0.05, 0.06), { matrix: matrix(x, y + 0.01, z, helling, Math.atan2(p.a[0], p.a[1])), kleur: KL.houtDonker });
    }
    if (!leuning) return;
    for (const kant of [-1, 1]) {
      let vorige = null;
      const m = Math.max(2, Math.round(p.len / 1.6));
      for (let i = 0; i <= m; i++) {
        const t = (i / m) * p.len;
        const [x, z] = naarWereld(p, t, kant * (p.breed / 2 + 0.05));
        const y = p.h0 + (p.h1 - p.h0) * (t / p.len);
        paal(x, y, z, 0.8);
        const top = new THREE.Vector3(x, y + 0.78, z);
        if (vorige) touw(vorige, top, 0.05);
        vorige = top;
      }
    }
    // Steunen eronder.
    for (let i = 1; i < 3; i++) {
      const t = (i / 3) * p.len;
      const y = p.h0 + (p.h1 - p.h0) * (t / p.len);
      for (const kant of [-1, 1]) {
        const [x, z] = naarWereld(p, t, kant * (p.breed / 2 - 0.1));
        b.voegToe(new THREE.CylinderGeometry(0.07, 0.08, y - bos.vloer + 0.3, 6), { matrix: matrix(x, (y + bos.vloer - 0.3) / 2, z), kleur: KL.houtDonker });
      }
    }
  }
  plank(bos.trap, true, true);
  plank(bos.uitgang, false, true);

  // --- De doorgangen: wat vastligt ---
  for (const m of bos.modules) {
    if (m.soort === 'liaan') {
      // De dikke tak tussen de twee bomen, waar de lianen aan hangen.
      const ay = m.h0 + D.liaan.ankerBoven;
      const A = bos.dekken[m.i];
      const B = bos.dekken[m.i + 1];
      const punten = [new THREE.Vector3(A.bx, ay + 0.6, A.bz)];
      const [xa, za] = naarWereld(m, -0.6, 0);
      punten.push(new THREE.Vector3(xa, ay + 0.35, za));
      for (const l of m.lianen) {
        const [x, z] = naarWereld(m, l.t, 0);
        punten.push(new THREE.Vector3(x, ay + 0.3, z));
      }
      const [xb, zb] = naarWereld(m, m.len + 0.6, 0);
      punten.push(new THREE.Vector3(xb, ay + 0.35, zb), new THREE.Vector3(B.bx, ay + 0.5, B.bz));
      const tak = maakBuis(punten, (t) => 0.3 - 0.08 * Math.sin(t * Math.PI), fijn ? 20 : 8, fijn ? 9 : 5);
      b.voegToe(tak, { kleur: (p) => stamKleur(tmpV.set(p.x, p.y * 3, p.z)) });
      // Blaadjes op de tak.
      for (let i = 0; i < (fijn ? 14 : 6); i++) {
        const t = m.len * rnd();
        const [x, z] = naarWereld(m, t, (rnd() - 0.5) * 0.5);
        b.voegToe(maakBol(0.32 + rnd() * 0.2, 0), { matrix: matrix(x, ay + 0.45 + rnd() * 0.2, z, 0, rnd() * 6, 0, 1, 0.5, 1), kleur: KL.liaanBlad, zwaai: 0.3 });
      }
    } else if (m.soort === 'balanceerstam') {
      const R = D.balanceerstam.straal;
      const lang = m.len + 0.6;
      const [x, z] = naarWereld(m, m.len / 2, 0);
      const stam = new THREE.CylinderGeometry(R, R * 1.06, lang, fijn ? 16 : 9, fijn ? 4 : 1).rotateX(Math.PI / 2);
      b.voegToe(stam, {
        matrix: matrix(x, (m.h0 + m.h1) / 2 - R, z, 0, Math.atan2(m.a[0], m.a[1])),
        kleur: (p) => kleur(KL.schors).lerp(kA.set(KL.stamDonker), (Math.sin(Math.atan2(p.y, p.x) * 11) * 0.5 + 0.5) * 0.3 + waardenruis(p.x * 3, p.z * 3, 2) * 0.25),
      });
      // Mos en paddenstoeltjes op de stam.
      for (let i = 0; i < 4; i++) {
        const t = 0.6 + rnd() * (m.len - 1.2);
        const kant = rnd() > 0.5 ? 1 : -1;
        const [px, pz] = naarWereld(m, t, kant * R * 0.85);
        b.voegToe(maakBol(0.09, 1), { matrix: matrix(px, m.h0 - R * 0.55, pz, 0, 0, 0, 1, 0.55, 1), kleur: 0xff6f6f });
        b.voegToe(new THREE.CylinderGeometry(0.025, 0.03, 0.1, 5), { matrix: matrix(px, m.h0 - R * 0.55 - 0.06, pz), kleur: 0xfff3e0 });
      }
      // Steunbokjes onder de uiteinden.
      for (const t of [0.15, m.len - 0.15]) {
        const [px, pz] = naarWereld(m, t, 0);
        b.voegToe(new THREE.BoxGeometry(0.9, 0.12, 0.25), { matrix: matrix(px, m.h0 - 2 * R - 0.05, pz, 0, Math.atan2(m.a[0], m.a[1]) + Math.PI / 2), kleur: KL.houtDonker });
      }
    } else if (m.soort === 'reuzenblad') {
      // Stelen uit de vijver naar elk blad.
      for (const bl of m.bladeren) {
        const [x, z] = naarWereld(m, bl.t, bl.q);
        const top = bladTop(m, bl);
        const steel = maakBuis([new THREE.Vector3(x + 0.6, bos.vloer - D.vijver.diepte, z - 0.3), new THREE.Vector3(x + 0.35, (top + bos.vloer) / 2, z - 0.1), new THREE.Vector3(x, top - 0.25, z)], (t) => 0.12 - t * 0.04, fijn ? 8 : 4, fijn ? 7 : 4);
        b.voegToe(steel, { kleur: 0x4fb54f, zwaai: (p) => Math.max(0, p.y - bos.vloer) * 0.04 });
      }
    } else if (m.soort === 'lotus') {
      // Rietjes langs de vijver.
      for (let i = 0; i < (fijn ? 10 : 5); i++) {
        const t = rnd() * m.len;
        const q = (rnd() > 0.5 ? 1 : -1) * (D.vijver.straal - 0.4 - rnd() * 0.4);
        const [x, z] = naarWereld(m, t, q);
        const h = 0.9 + rnd() * 0.7;
        b.voegToe(new THREE.CylinderGeometry(0.02, 0.03, h, 4), { matrix: matrix(x, bos.peil + h / 2 - 0.3, z, (rnd() - 0.5) * 0.2, 0, (rnd() - 0.5) * 0.2), kleur: 0x6cc24a, zwaai: (p) => Math.max(0, p.y - bos.peil) * 0.25 });
        b.voegToe(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6), { matrix: matrix(x, bos.peil + h - 0.35, z), kleur: 0xa8703f, zwaai: 0.2 });
      }
    }
  }

  // --- Het finish-eilandje: een bloemenboog met een gouden klokje ---
  const G = bos.dekken[bos.dekken.length - 1];
  const mL = bos.modules[bos.modules.length - 1];
  const dwars = new THREE.Vector3(mL.b[0], 0, mL.b[1]);
  const bel = new THREE.Vector3(G.x + mL.a[0] * 0.5, G.h + 2.25, G.z + mL.a[1] * 0.5);
  {
    const punten = [];
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      const a = f * Math.PI;
      punten.push(new THREE.Vector3(G.x + mL.a[0] * 0.5, G.h + Math.sin(a) * 2.2, G.z + mL.a[1] * 0.5).addScaledVector(dwars, Math.cos(a) * 1.4));
    }
    b.voegToe(maakBuis(punten, () => 0.08, fijn ? 24 : 12, 6), { kleur: 0x6fcf5e });
    const bloemKleuren = [0xff7fb0, 0xffd84d, 0xffffff, 0xb48cff, 0xff9f5a];
    punten.forEach((p, i) => {
      if (i % 1 === 0) b.voegToe(maakBol(0.17, fijn ? 1 : 0), { matrix: matrix(p.x, p.y, p.z), kleur: bloemKleuren[i % bloemKleuren.length] });
    });
    b.voegToe(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), { matrix: matrix(bel.x, bel.y - 0.1, bel.z), kleur: KL.touw });
  }

  // --- Een vlag boven de eerste boom: zo zie je van ver waar het speelbos is ---
  {
    const d = { x: bos.dekken[0].bx, z: bos.dekken[0].bz };
    const top = bos.vloer + D.boomHoogte + 3.6;
    b.voegToe(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 6), { matrix: matrix(d.x, top - 2.25, d.z), kleur: 0xffffff });
    const vlag = new THREE.BufferGeometry();
    vlag.setAttribute('position', new THREE.Float32BufferAttribute([d.x, top, d.z, d.x, top - 1.0, d.z, d.x + 1.6, top - 0.5, d.z], 3));
    vlag.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    b.voegToe(vlag, { kleur: 0x4fd6c8, zwaai: (p) => Math.abs(p.x - d.x) * 1.6 });
  }

  const vastMat = maakPlantMateriaal({ gloed: 0x2a2010, gloedSterkte: 0.25 });
  const vast = new THREE.Mesh(b.maak(), vastMat);
  vast.castShadow = K.schaduw;
  vast.receiveShadow = K.schaduw;
  groep.add(vast);

  const effen = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x201810, emissiveIntensity: 0.3 });

  // --- De vijver: water met golfjes en twinkels ---
  const V = bos.vijver;
  const vx0 = Math.min(V.van[0], V.tot[0]) - V.straal - 1;
  const vx1 = Math.max(V.van[0], V.tot[0]) + V.straal + 1;
  const vz0 = Math.min(V.van[1], V.tot[1]) - V.straal - 1;
  const vz1 = Math.max(V.van[1], V.tot[1]) + V.straal + 1;
  const uTijd = { value: 0 };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uWater: { value: new THREE.Color(KL.vijver) },
        uDiep: { value: new THREE.Color(KL.vijverDiep) },
        uVan: { value: new THREE.Vector2(...V.van) },
        uTot: { value: new THREE.Vector2(...V.tot) },
        uStraal: { value: V.straal + 0.7 },
      },
    ]),
    fog: true,
    transparent: true,
    depthWrite: false,
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
      uniform float uTijd, uStraal;
      uniform vec3 uWater, uDiep;
      uniform vec2 uVan, uTot;
      varying vec3 vWereld;
      void main() {
        vec2 p = vWereld.xz;
        vec2 d = uTot - uVan;
        float f = clamp(dot(p - uVan, d) / dot(d, d), 0.0, 1.0);
        float r = length(p - uVan - d * f);
        if (r > uStraal) discard;
        float t = uTijd;
        float golf = sin(p.x * 1.7 + p.y * 0.6 + t * 1.1 + sin(p.y * 1.3 - t * 0.7) * 1.4);
        float golf2 = sin(p.y * 2.3 - p.x * 0.8 - t * 0.9 + sin(p.x * 1.1 + t * 0.5) * 1.2);
        float rimpel = golf * 0.6 + golf2 * 0.5;
        float diep = 1.0 - smoothstep(uStraal - 2.8, uStraal - 0.4, r);
        vec3 c = mix(uWater, uDiep, diep * 0.7);
        c = mix(c, vec3(0.85, 1.0, 1.0), smoothstep(0.75, 1.05, rimpel) * 0.4);
        vec2 cel = floor(p * 2.5);
        float rnd = fract(sin(dot(cel, vec2(12.9898, 78.233))) * 43758.5453);
        vec2 g = fract(p * 2.5) - 0.5;
        float twinkel = step(0.94, rnd) * pow(max(sin(t * 3.0 + rnd * 50.0), 0.0), 10.0);
        twinkel *= smoothstep(0.16, 0.0, abs(g.x) * abs(g.y) * 9.0 + length(g) * 0.35);
        c += vec3(1.0) * twinkel * 0.8;
        gl_FragColor = vec4(c, 0.85);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  waterMat.uniforms.uTijd = uTijd;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(vx1 - vx0, vz1 - vz0).rotateX(-Math.PI / 2), waterMat);
  water.position.set((vx0 + vx1) / 2, bos.peil, (vz0 + vz1) / 2);
  water.renderOrder = 1;
  groep.add(water);

  // --- De touwbrug: plankjes en touwen die zwaaien (bij elk beeld op hun plek gezet) ---
  const brug = bos.modules.find((m) => m.soort === 'touwbrug');
  const T = D.touwbrug;
  const plankLang = 0.26;
  const plankT = [];
  for (let t = 0.12; t < brug.len - 0.05; t += plankLang + 0.05) if (!inGat(brug, t) && !inGat(brug, t - 0.1) && !inGat(brug, t + 0.1)) plankT.push(t);
  const plankGeo = new THREE.BoxGeometry(T.breedte, 0.07, plankLang);
  {
    const kl = new Float32Array(plankGeo.attributes.position.count * 3);
    for (let i = 0; i < plankGeo.attributes.position.count; i++) {
      tmpV.fromBufferAttribute(plankGeo.attributes.position, i);
      houtKleur(tmpV, tmpV.y < 0 ? 0.3 : 0).toArray(kl, i * 3);
    }
    plankGeo.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  }
  const planken = new THREE.InstancedMesh(plankGeo, effen, plankT.length);
  planken.castShadow = K.schaduw;
  groep.add(planken);
  const N_TOUW = 18;
  const touwGeo = new THREE.CylinderGeometry(1, 1, 1, 5).translate(0, 0.5, 0);
  touwGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(touwGeo.attributes.position.count * 3).fill(1), 3));
  const touwMat = new THREE.MeshLambertMaterial({ color: KL.touw, emissive: 0x302010, emissiveIntensity: 0.3 });
  const hangers = Math.ceil(brug.len / 1.0) + 1;
  const touwen = new THREE.InstancedMesh(touwGeo, touwMat, N_TOUW * 4 + hangers * 2);
  groep.add(touwen);
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const as = Math.atan2(brug.a[0], brug.a[1]);
  const brugPunt = (t, q, y, uit) => {
    const [x, z] = naarWereld(brug, t, q + brugOpzij(brug, t));
    return uit.set(x, y, z);
  };
  // De palen aan de uiteinden van de brug (vast).
  {
    const pb = new Bouwer();
    for (const t of [-0.05, brug.len + 0.05]) for (const kant of [-1, 1]) {
      const [x, z] = naarWereld(brug, t, kant * (T.breedte / 2 + 0.08));
      const y = t < 1 ? brug.h0 : brug.h1;
      pb.voegToe(new THREE.CylinderGeometry(0.08, 0.09, 1.1, 6), { matrix: matrix(x, y + 0.5, z), kleur: KL.houtDonker });
    }
    const palen = new THREE.Mesh(pb.maak(), effen);
    groep.add(palen);
  }
  function werkBrugBij() {
    const zwaaiHoek = brug.zwaai * 0.6;
    plankT.forEach((t, i) => {
      const y = bos.oppervlak(brug, t, brugOpzij(brug, t));
      const yy = y > -1e9 ? y : brugHoogte(brug, D, t);
      brugPunt(t, 0, yy - 0.035, p0);
      const helling = Math.atan2(brugHoogte(brug, D, t + 0.1) - brugHoogte(brug, D, t - 0.1), 0.2);
      tmpE.set(-helling, as, zwaaiHoek * Math.sin((Math.PI * t) / brug.len), 'YXZ');
      tmpQ.setFromEuler(tmpE);
      planken.setMatrixAt(i, tmpM.compose(p0, tmpQ, tmpS.set(1, 1, 1)));
    });
    planken.instanceMatrix.needsUpdate = true;
    // Twee leuningtouwen en twee onder de plankjes, en hangertjes ertussen.
    let n = 0;
    const L = brug.len + 0.1;
    for (const [q, hoog] of [[-1, 0.95], [1, 0.95], [-1, -0.03], [1, -0.03]]) {
      for (let i = 0; i < N_TOUW; i++) {
        const ta = -0.05 + (i / N_TOUW) * L;
        const tb = -0.05 + ((i + 1) / N_TOUW) * L;
        const ya = brugHoogte(brug, D, ta) + hoog + (hoog > 0 ? 0.25 * Math.sin((Math.PI * Math.max(0, ta)) / brug.len) : 0);
        const yb = brugHoogte(brug, D, tb) + hoog + (hoog > 0 ? 0.25 * Math.sin((Math.PI * Math.max(0, tb)) / brug.len) : 0);
        brugPunt(ta, q * (T.breedte / 2 + 0.06), ya, p0);
        brugPunt(tb, q * (T.breedte / 2 + 0.06), yb, p1);
        touwen.setMatrixAt(n++, stukMatrix(p0, p1, 0.032, tmpM));
      }
    }
    for (let i = 0; i < hangers; i++) {
      const t = Math.min(brug.len, (i / (hangers - 1)) * brug.len);
      for (const q of [-1, 1]) {
        const y = brugHoogte(brug, D, t);
        brugPunt(t, q * (T.breedte / 2 + 0.06), y - 0.03, p0);
        brugPunt(t, q * (T.breedte / 2 + 0.06), y + 0.95 + 0.25 * Math.sin((Math.PI * t) / brug.len), p1);
        touwen.setMatrixAt(n++, stukMatrix(p0, p1, 0.02, tmpM));
      }
    }
    touwen.count = n;
    touwen.instanceMatrix.needsUpdate = true;
  }

  // --- De lianen: een groen touw met blaadjes, opgehangen aan de tak; ze draaien rond hun anker ---
  const lianen = bos.modules.find((m) => m.soort === 'liaan');
  const L = touwLengte(D);
  const lb = new Bouwer();
  {
    const punten = [];
    for (let i = 0; i <= 8; i++) punten.push(new THREE.Vector3(Math.sin(i * 1.3) * 0.04, -(i / 8) * L, Math.cos(i * 1.1) * 0.04));
    lb.voegToe(maakBuis(punten, (t) => 0.055 - t * 0.015, fijn ? 16 : 8, fijn ? 6 : 4), { kleur: KL.liaan });
    for (let i = 0; i < (fijn ? 12 : 6); i++) {
      const y = -(0.3 + (i / (fijn ? 12 : 6)) * (L - 0.6));
      const h = i * 2.4;
      const blad = new THREE.CircleGeometry(0.13, 6).scale(1, 1.6, 1).translate(0, 0.18, 0);
      lb.voegToe(blad, { matrix: matrix(Math.cos(h) * 0.06, y, Math.sin(h) * 0.06, 0.5, h, 0.9), kleur: KL.liaanBlad });
    }
    // Een knoop met een bloemetje onderaan, om je aan vast te houden.
    lb.voegToe(maakBol(0.1, 1), { matrix: matrix(0, -L, 0), kleur: KL.liaan });
    lb.voegToe(maakBol(0.08, 1), { matrix: matrix(0.08, -L + 0.12, 0.04), kleur: 0xff7fb0 });
  }
  const liaanMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x102010, emissiveIntensity: 0.3 });
  const liaanMesh = new THREE.InstancedMesh(lb.maak(), liaanMat, lianen.lianen.length);
  groep.add(liaanMesh);
  const la = Math.atan2(lianen.a[0], lianen.a[1]);
  function werkLianenBij() {
    lianen.lianen.forEach((l, i) => {
      const [x, y, z] = anker(lianen, D, l);
      tmpE.set(-l.hoek, la, 0, 'YXZ');
      tmpQ.setFromEuler(tmpE);
      liaanMesh.setMatrixAt(i, tmpM.compose(p0.set(x, y, z), tmpQ, tmpS.set(1, 1, 1)));
    });
    liaanMesh.instanceMatrix.needsUpdate = true;
  }

  // --- De springbloem: een grote roze bloem met een geel hartje ---
  const sbm = bos.modules.find((m) => m.soort === 'springbloem');
  const sb = new Bouwer();
  {
    const R = D.springbloem.straal;
    const bladen = fijn ? 9 : 6;
    for (let i = 0; i < bladen; i++) {
      const h = (i / bladen) * Math.PI * 2;
      const blad = maakBol(0.5, fijn ? 2 : 1);
      sb.voegToe(blad, { matrix: matrix(Math.cos(h) * R * 0.75, 0.08, Math.sin(h) * R * 0.75, 0, -h, 0.35, 0.6, 0.14, 0.38), kleur: (p) => kleur(KL.springbloem).lerp(kA.set(0xffffff), Math.max(0, Math.hypot(p.x, p.z) - R * 0.6) * 0.8) });
    }
    sb.voegToe(maakBol(R * 0.55, fijn ? 2 : 1), { matrix: matrix(0, 0.1, 0, 0, 0, 0, 1, 0.35, 1), kleur: (p) => kleur(KL.springHart).lerp(kA.set(0xffa83d), waardenruis(p.x * 9, p.z * 9, 1) * 0.6) });
    for (let i = 0; i < 4; i++) {
      const h = (i / 4) * Math.PI * 2 + 0.4;
      sb.voegToe(new THREE.CircleGeometry(0.4, 7).scale(1, 0.55, 1).rotateX(-Math.PI / 2), { matrix: matrix(Math.cos(h) * R * 1.05, -0.12, Math.sin(h) * R * 1.05, 0, -h, 0), kleur: KL.springBlad });
    }
  }
  const bloem = new THREE.Mesh(sb.maak(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x301020, emissiveIntensity: 0.25 }));
  const [bx, bz] = naarWereld(sbm, bloemT(D), 0);
  bloem.position.set(bx, sbm.h0 + D.springbloem.hoogte - 0.08, bz);
  groep.add(bloem);

  // --- Reuzenbladeren: een groot blad met nerven, licht schotelvormig ---
  const rbm = bos.modules.find((m) => m.soort === 'reuzenblad');
  const RB = D.reuzenblad;
  const bladGeo = (() => {
    const g = new THREE.CircleGeometry(1, fijn ? 28 : 14, 0, Math.PI * 2);
    const pos = g.attributes.position;
    const kl = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      // Een puntje vooraan, en de randen iets omhoog.
      const punt = y > 0 ? 1 + 0.25 * Math.max(0, 1 - Math.abs(x) * 3) * y : 1;
      pos.setXYZ(i, x * RB.breed * 1.05, y * RB.lang * 1.05 * punt, 0.12 * r * r);
      const nerf = Math.abs(x) < 0.04 || Math.abs(Math.sin(Math.atan2(y, Math.abs(x)) * 4)) < 0.08;
      (nerf && r > 0.1 ? kA.set(KL.reuzenNerf) : kA.set(KL.reuzenblad).multiplyScalar(0.85 + 0.15 * r)).toArray(kl, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(kl, 3));
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  })();
  const bladMesh = new THREE.InstancedMesh(bladGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x103010, emissiveIntensity: 0.3 }), rbm.bladeren.length);
  bladMesh.castShadow = K.schaduw;
  groep.add(bladMesh);
  const rbHoek = Math.atan2(rbm.a[0], rbm.a[1]);
  function werkBladerenBij() {
    rbm.bladeren.forEach((bl, i) => {
      const [x, z] = naarWereld(rbm, bl.t, bl.q);
      tmpE.set(bl.zak * 0.25, rbHoek + (bl.q > 0 ? 0.1 : -0.1), bl.zakV * 0.02, 'YXZ');
      tmpQ.setFromEuler(tmpE);
      bladMesh.setMatrixAt(i, tmpM.compose(p0.set(x, bladTop(rbm, bl) - bl.zak - 0.1, z), tmpQ, tmpS.set(1, 1, 1)));
    });
    bladMesh.instanceMatrix.needsUpdate = true;
  }

  // --- Lotusbladeren: ronde bladeren met een hapje eruit, en hier en daar een roze lotusbloem ---
  const lm = bos.modules.find((m) => m.soort === 'lotus');
  const lotusGeo = (() => {
    const g = new THREE.CircleGeometry(1, fijn ? 24 : 12, 0.25, Math.PI * 2 - 0.5);
    const pos = g.attributes.position;
    const kl = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      (r > 0.9 ? kA.set(KL.lotusRand) : kA.set(KL.lotus).multiplyScalar(0.88 + 0.12 * Math.sin(Math.atan2(pos.getY(i), pos.getX(i)) * 9))).toArray(kl, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(kl, 3));
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  const lotusMesh = new THREE.InstancedMesh(lotusGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x103010, emissiveIntensity: 0.3 }), lm.bladeren.length);
  groep.add(lotusMesh);
  const lbm = new Bouwer();
  for (let i = 0; i < 8; i++) {
    const h = (i / 8) * Math.PI * 2;
    lbm.voegToe(maakBol(0.1, 1), { matrix: matrix(Math.cos(h) * 0.08, 0.1, Math.sin(h) * 0.08, 0, -h, -0.6, 0.6, 1.6, 0.6), kleur: (p) => kleur(KL.lotusBloem).lerp(kA.set(0xffffff), Math.max(0, p.y - 0.1) * 3) });
  }
  lbm.voegToe(maakBol(0.06, 1), { matrix: matrix(0, 0.12, 0), kleur: 0xffe066 });
  const lotusBloemen = lm.bladeren.map((_, i) => i).filter((i) => i % 2 === 1);
  const bloemMesh = new THREE.InstancedMesh(lbm.maak(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x301020, emissiveIntensity: 0.3 }), Math.max(1, lotusBloemen.length));
  bloemMesh.count = lotusBloemen.length;
  groep.add(bloemMesh);
  function werkLotusBij(tijd) {
    lm.bladeren.forEach((bl, i) => {
      const [x, z] = naarWereld(lm, bl.t, bl.q);
      const y = Math.max(bos.peil - 0.45, lotusTop(lm, bl)) - 0.04;
      tmpE.set(Math.sin(tijd * 0.7 + i) * 0.02 + bl.dobberV * 0.04, i * 1.9, Math.cos(tijd * 0.6 + i) * 0.02, 'YXZ');
      tmpQ.setFromEuler(tmpE);
      lotusMesh.setMatrixAt(i, tmpM.compose(p0.set(x, y, z), tmpQ, tmpS.set(bl.r, 1, bl.r)));
    });
    lotusBloemen.forEach((i, j) => {
      const bl = lm.bladeren[i];
      const [x, z] = naarWereld(lm, bl.t + bl.r * 0.45, bl.q + bl.r * 0.3);
      bloemMesh.setMatrixAt(j, tmpM.compose(p0.set(x, Math.max(bos.peil - 0.45, lotusTop(lm, bl)) - 0.04, z), tmpQ.identity(), tmpS.set(1.2, 1.2, 1.2)));
    });
    lotusMesh.instanceMatrix.needsUpdate = true;
    bloemMesh.instanceMatrix.needsUpdate = true;
  }

  // --- Het gouden klokje op de finishboog (slingert als je aankomt) ---
  const klok = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.2, 0.26, fijn ? 14 : 8, 1, true).translate(0, -0.13, 0),
    new THREE.MeshLambertMaterial({ color: KL.finish, emissive: 0x806010, emissiveIntensity: 0.5, side: THREE.DoubleSide })
  );
  klok.position.copy(bel).add(tmpV.set(0, -0.22, 0));
  groep.add(klok);
  let klokZwaai = 0;

  const midden = new THREE.Vector3((bos.grenzen.minX + bos.grenzen.maxX) / 2, bos.vloer, (bos.grenzen.minZ + bos.grenzen.maxZ) / 2);
  const dichtbij = Math.max(bos.grenzen.maxX - bos.grenzen.minX, bos.grenzen.maxZ - bos.grenzen.minZ) / 2 + 70;
  let tijd = 0;

  return {
    groep,
    /** Laat het klokje bimbammen (finish). */
    luid() {
      klokZwaai = 1;
    },
    werkBij(dt, camera) {
      tijd += dt;
      uTijd.value = tijd;
      const zicht = camera.position.distanceTo(midden) < dichtbij;
      groep.visible = zicht;
      if (!zicht) return;
      werkBrugBij();
      werkLianenBij();
      werkBladerenBij();
      werkLotusBij(tijd);
      const v = Math.max(-0.5, Math.min(0.6, sbm.veer));
      bloem.scale.set(1 + v * 0.5, 1 - v * 1.6, 1 + v * 0.5);
      bloem.rotation.y = Math.sin(tijd * 0.5) * 0.15;
      klokZwaai *= Math.exp(-dt * 0.8);
      klok.rotation.set(Math.sin(tijd * 9) * 0.6 * klokZwaai, 0, Math.cos(tijd * 9) * 0.3 * klokZwaai);
    },
  };
}
