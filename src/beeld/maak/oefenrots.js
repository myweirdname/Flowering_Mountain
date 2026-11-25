// De oefenrots in beeld (stap 9): een zachte lila rots met een vlakke klimwand, mos en bloemetjes bovenop,
// gekleurde grepen per route (zoals in een klimhal), een bordje met de graad aan de voet, een ankerring en een
// topbloem boven elke route. Alles in wandcoördinaten: x = u (naar rechts), y = v (omhoog), z = uit de wand.
// Dezelfde maker tekent ook de klimwanden van de berg (stap 13): elke wand geeft zijn eigen maten (`rots.maat`)
// en routes mee. Stap 15a: een wand met een profiel (de dakvleugel: plaat, overhang, dak, dakrand, kopwand) krijgt
// een rots die langs dat profiel gevouwen is, met een richel, een knieklem en grepen die met de wand mee kantelen.
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './vorm.js';
import { waardenruis } from '../../sim/wereld/ruis.js';
import { maakHibiscus } from './hibiscus.js';
import { maakBosje } from './klein.js';
import { maakPalm } from './palm.js';
import { maakPlantMateriaal } from '../wind.js';
import { FLORA } from '../../data/flora.js';
import { maakWillekeur } from '../../kern/willekeur.js';

const klem = THREE.MathUtils.clamp;
const glad = (a, b, x) => {
  const t = klem((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Het rotsblok: een afgeronde doos met gedeelde hoekpunten (zachte schaduw, geen naden), bultig aan de zijkanten
 * en bovenaan, bijna vlak aan de klimwand. Vertexkleuren: lila met lichte banden, mos bovenop.
 * @param {typeof import('../../data/klimmen.js').KLIMMEN.rots} R
 */
function maakBlok(R, detail) {
  const B = R.breedte;
  const H = R.hoogte;
  const D = R.diepte;
  const r = 1.0;
  const x0 = -R.rand;
  const x1 = B + R.rand;
  const y0 = -0.8;
  // De bovenkant: de oefenrots heeft een bolle kop boven de wand; op een klimwand van de berg (stap 13) loop je
  // bovenop, dus die is vlak op de hoogte waar je uitstapt (met alleen kuiltjes naar beneden).
  const bovenaan = R.bovenaan ?? 1.1;
  const bult = R.bult ?? [1.5, 0.35];
  const y1 = H + bovenaan;
  const z0 = -D;
  const z1 = 0;
  // Een hoge wand (stap 13) krijgt minder hoekpunten per meter, zodat hij niet zwaar wordt.
  const f = (detail ? 3 : 1.6) * Math.min(1, 10 / Math.max(H, D, B));
  const box = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0, Math.round((x1 - x0) * f), Math.round((y1 - y0) * f), Math.round((z1 - z0) * f));
  box.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // Hoekpunten van aangrenzende zijden samenvoegen, zodat de rots één gladde huid is.
  const bron = box.attributes.position;
  const sleutels = new Map();
  const pos = [];
  const kaart = new Int32Array(bron.count);
  for (let i = 0; i < bron.count; i++) {
    const x = bron.getX(i);
    const y = bron.getY(i);
    const z = bron.getZ(i);
    const key = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
    let n = sleutels.get(key);
    if (n === undefined) {
      n = pos.length / 3;
      sleutels.set(key, n);
      pos.push(x, y, z);
    }
    kaart[i] = n;
  }
  const index = Array.from(box.index.array, (i) => kaart[i]);
  box.dispose();

  const cx = [x0 + r, x1 - r];
  const cy = [y0 + r, y1 - r];
  const cz = [z0 + r, z1 - r];
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  const kleur = [];
  const basis = new THREE.Color(R.kleur);
  const donker = new THREE.Color(R.kleurDonker);
  const laag = new THREE.Color(R.kleurLaag);
  const mos = new THREE.Color(R.mos);
  const c = new THREE.Color();
  for (let i = 0; i < pos.length; i += 3) {
    p.set(pos[i], pos[i + 1], pos[i + 2]);
    // Afgeronde doos: de binnenste doos plus een bol met straal r rond elk punt.
    const ix = klem(p.x, cx[0], cx[1]);
    const iy = klem(p.y, cy[0], cy[1]);
    const iz = klem(p.z, cz[0], cz[1]);
    n.set(p.x - ix, p.y - iy, p.z - iz);
    if (n.lengthSq() < 1e-8) n.set(0, 0, 1);
    n.normalize();
    p.set(ix, iy, iz).addScaledVector(n, r);
    // Bulten: groot aan de zijkanten en bovenaan, bijna niets op de klimwand (de grepen moeten er vlak op zitten).
    const inWand = glad(0.75, 0.97, n.z) * glad(-0.3, 0.3, p.x) * glad(B + 0.3, B - 0.3, p.x) * glad(H + 0.3, H - 0.1, p.y);
    const ruis =
      (waardenruis(p.x * 0.45 + p.z * 0.3, p.y * 0.45 - p.z * 0.2, 31) - 0.5) * 1.0 +
      (waardenruis(p.x * 1.4 - p.z, p.y * 1.4 + p.z * 0.5, 37) - 0.5) * 0.4;
    const reliëf = (waardenruis(p.x * 2.2, p.y * 2.2, 43) - 0.5) * 0.05 + (waardenruis(p.x * 0.7, p.y * 0.9, 47) - 0.5) * 0.04;
    p.addScaledVector(n, ruis * 0.6 * (1 - inWand) + reliëf * inWand);
    // Een grillige bovenrand: bulten en kopjes, zodat de rots niet als een doos tegen de lucht staat.
    const top = glad(0.15, 0.6, n.y);
    p.y += top * (waardenruis(p.x * 0.32 + 7, p.z * 0.4, 53) - bult[1]) * bult[0];
    if (p.y < y0 + 0.2) p.y = y0; // de onderkant zit in de grond
    const wand = inWand;
    pos[i] = p.x;
    pos[i + 1] = p.y;
    pos[i + 2] = p.z;
    // Kleur: lichte banden (lagen in de rots), donkere spikkels en holtes, mos bovenop en wat groen aan de voet.
    const band = Math.sin(p.y * 2.4 + waardenruis(p.x * 0.35, p.y * 0.3, 41) * 4) * 0.5 + 0.5;
    const spikkel = waardenruis(p.x * 6 + p.z * 3, p.y * 6, 59);
    c.copy(basis)
      .lerp(laag, glad(0.55, 0.95, band) * 0.75)
      .lerp(donker, klem(-ruis * 1.4, 0, 1) * 0.7 + glad(0.78, 0.95, spikkel) * 0.35);
    if (wand > 0.5) c.lerp(laag, 0.1);
    const boven = glad(0.35, 0.7, n.y) * glad(y1 - 1.3, y1 - 0.5, p.y);
    c.lerp(mos, Math.max(boven, glad(0.5, -0.3, p.y) * 0.45));
    kleur.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(kleur, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * Een rots langs een profiel (stap 15a): de doorsnede (z naar voor, y omhoog) loopt van de wandvoet langs het
 * profiel omhoog (exact, daar zitten de grepen), dan over een bolle kop naar achter en langs de achterkant weer
 * naar beneden. Die doorsnede wordt over de breedte uitgetrokken, met afgeronde uiteinden. Bultig, behalve op de
 * klimwand zelf. Vertexkleuren zoals maakBlok.
 * @param {any} M maten en kleuren @param {ReturnType<typeof import('../../sim/klimmen/profiel.js').maakProfiel>} P
 */
function maakProfielBlok(M, P, detail) {
  const B = M.breedte;
  const D = M.diepte;
  const L = P.lengte;
  const stap = detail ? 0.18 : 0.3;
  /** @type {{ z: number, y: number, wand: boolean }[]} */
  const rand = [{ z: 0, y: -0.8, wand: false }];
  const n = Math.ceil(L / stap);
  for (let i = 0; i <= n; i++) {
    const v = (i / n) * L;
    rand.push({ z: P.z(v), y: P.y(v), wand: true });
  }
  // De kop: van de bovenrand van de kopwand bol over naar achter, dan de achterkant naar beneden (zacht afgerond).
  const zt = P.z(L);
  const yt = P.y(L);
  let kop = [
    [zt, yt], [zt + 0.02, yt + 0.25], [zt - 0.25, yt + 0.55], [zt - 1.0, yt + M.bovenaan], [(zt - D) / 2, yt + M.bovenaan + 0.15],
    [-D + 0.9, yt + M.bovenaan * 0.8], [-D + 0.1, yt + 0.1], [-D - 0.15, yt * 0.55], [-D, 0.2], [-D, -0.8],
  ];
  for (let r = 0; r < 3; r++) {
    const nw = [kop[0]];
    for (let i = 0; i < kop.length - 1; i++) {
      const [a0, a1] = kop[i];
      const [b0, b1] = kop[i + 1];
      nw.push([a0 * 0.75 + b0 * 0.25, a1 * 0.75 + b1 * 0.25], [a0 * 0.25 + b0 * 0.75, a1 * 0.25 + b1 * 0.75]);
    }
    nw.push(kop[kop.length - 1]);
    kop = nw;
  }
  for (let i = 1; i < kop.length; i++) rand.push({ z: kop[i][0], y: kop[i][1], wand: false });
  // De doorsnede gelijkmatig verdelen (behalve langs de wand: die staat al op maat).
  const omtrek = [];
  for (let i = 0; i < rand.length; i++) {
    const a = rand[i];
    const b = rand[(i + 1) % rand.length];
    omtrek.push(a);
    if (a.wand && b.wand) continue;
    const m = Math.floor(Math.hypot(b.z - a.z, b.y - a.y) / stap);
    for (let j = 1; j < m; j++) omtrek.push({ z: a.z + ((b.z - a.z) * j) / m, y: a.y + ((b.y - a.y) * j) / m, wand: false });
  }
  const np = omtrek.length;
  // Per punt de richting naar binnen (de doorsnede loopt tegen de klok in: z naar rechts, y omhoog).
  const binnen = omtrek.map((p, i) => {
    const a = omtrek[(i - 1 + np) % np];
    const b = omtrek[(i + 1) % np];
    const tz = b.z - a.z;
    const ty = b.y - a.y;
    const l = Math.hypot(tz, ty) || 1;
    return [-ty / l, tz / l];
  });
  const x0 = -M.rand;
  const x1 = B + M.rand;
  const ra = 0.7; // straal van de afgeronde uiteinden
  const nx = Math.max(6, Math.round((x1 - x0) / stap));
  const ringen = [];
  const pos = [];
  const wandW = [];
  for (let ix = 0; ix <= nx; ix++) {
    const x = x0 + ((x1 - x0) * ix) / nx;
    const dEind = Math.min(x - x0, x1 - x);
    const inset = dEind < ra ? ra - Math.sqrt(Math.max(0, ra * ra - (ra - dEind) ** 2)) : 0;
    const ring = [];
    for (let i = 0; i < np; i++) {
      const p = omtrek[i];
      const [iz, iy] = binnen[i];
      let z = p.z + iz * inset;
      let y = p.y + iy * inset;
      const inWand = p.wand ? glad(-0.3, 0.3, x) * glad(B + 0.3, B - 0.3, x) : 0;
      // Bulten (niet op de klimwand), en een fijn reliëf op de klimwand.
      const ruis =
        (waardenruis(x * 0.45 + z * 0.3, y * 0.45 - z * 0.2, 31) - 0.5) * 1.0 +
        (waardenruis(x * 1.4 - z, y * 1.4 + z * 0.5, 37) - 0.5) * 0.4;
      const fijn = (waardenruis(x * 2.2, y * 2.2 + z, 43) - 0.5) * 0.05 + (waardenruis(x * 0.7, y * 0.9 - z, 47) - 0.5) * 0.04;
      const d = ruis * 0.45 * (1 - inWand) + fijn * inWand;
      z -= iz * d;
      y -= iy * d;
      if (y < -0.8) y = -0.8;
      ring.push(pos.length / 3);
      pos.push(x, y, z);
      wandW.push(inWand);
    }
    ringen.push(ring);
  }
  const index = [];
  for (let ix = 0; ix < nx; ix++) {
    for (let i = 0; i < np; i++) {
      const a = ringen[ix][i];
      const b = ringen[ix][(i + 1) % np];
      const c = ringen[ix + 1][i];
      const d = ringen[ix + 1][(i + 1) % np];
      index.push(a, c, b, b, c, d);
    }
  }
  // De uiteinden dichtmaken.
  for (const [ix, links] of [[0, true], [nx, false]]) {
    const ring = ringen[ix];
    const vorm = ring.map((vi) => new THREE.Vector2(pos[vi * 3 + 2], pos[vi * 3 + 1]));
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(vorm, [])) {
      // Welke kant wijst deze driehoek uit? Links moet ze naar -x kijken, rechts naar +x.
      const za = vorm[a].x, ya = vorm[a].y;
      const nxDrie = (vorm[b].y - ya) * (vorm[c].x - za) - (vorm[b].x - za) * (vorm[c].y - ya);
      if (nxDrie < 0 === links) index.push(ring[a], ring[b], ring[c]);
      else index.push(ring[a], ring[c], ring[b]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  // Kleuren: lila met lichte banden, donkere holtes, mos waar de rots naar boven kijkt (de kop, niet het dak).
  const nm = g.attributes.normal;
  const basis = new THREE.Color(M.kleur);
  const donker = new THREE.Color(M.kleurDonker);
  const laag = new THREE.Color(M.kleurLaag);
  const mos = new THREE.Color(M.mos);
  const c = new THREE.Color();
  const kleur = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    const band = Math.sin(y * 2.4 + waardenruis(x * 0.35, y * 0.3 + z * 0.2, 41) * 4) * 0.5 + 0.5;
    const spikkel = waardenruis(x * 6 + z * 3, y * 6, 59);
    const hol = waardenruis(x * 0.45 + z * 0.3, y * 0.45 - z * 0.2, 31) - 0.5;
    c.copy(basis)
      .lerp(laag, glad(0.55, 0.95, band) * 0.75)
      .lerp(donker, klem(-hol * 1.4, 0, 1) * 0.7 + glad(0.78, 0.95, spikkel) * 0.35);
    if (wandW[i] > 0.5) c.lerp(laag, 0.1);
    const boven = glad(0.35, 0.75, nm.getY(i)) * glad(yt - 0.6, yt + 0.2, y);
    c.lerp(mos, Math.max(boven, glad(0.5, -0.3, y) * 0.45));
    kleur.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(kleur, 3));
  return g;
}

/** Eén greepvorm per soort, in greepcoördinaten (de wand is z = 0, de greep steekt uit naar +z). Wit = route-kleur. */
function maakGreepVorm(soort) {
  const b = new Bouwer();
  const wit = 0xffffff;
  const holte = 0x6a5a7a;
  switch (soort) {
    case 'bak': {
      // Een dikke bol met een diepe gleuf bovenop: daar zit je hele hand in.
      b.voegToe(maakBol(1, 2), { matrix: matrix(0, -0.01, 0.035, 0, 0, 0, 0.12, 0.085, 0.075), kleur: wit });
      b.voegToe(maakBol(1, 1), { matrix: matrix(0, 0.035, 0.07, -0.5, 0, 0, 0.085, 0.022, 0.04), kleur: holte });
      break;
    }
    case 'richel': {
      // Een brede, platte richel.
      const cap = new THREE.CapsuleGeometry(0.03, 0.17, 4, 10).rotateZ(Math.PI / 2);
      b.voegToe(cap, { matrix: matrix(0, 0, 0.028, 0, 0, 0, 1, 0.75, 1), kleur: wit });
      break;
    }
    case 'rand': {
      // Een smal randje: net genoeg voor de vingertoppen.
      const cap = new THREE.CapsuleGeometry(0.014, 0.13, 3, 8).rotateZ(Math.PI / 2);
      b.voegToe(cap, { matrix: matrix(0, 0, 0.012, 0, 0, 0, 1, 0.9, 1), kleur: wit });
      break;
    }
    case 'sloper': {
      // Een ronde, gladde koepel zonder rand.
      b.voegToe(maakBol(1, 2), { matrix: matrix(0, 0, 0, 0, 0, 0, 0.12, 0.1, 0.06), kleur: wit });
      break;
    }
    case 'zijgreep': {
      // Een hoog, smal oor met een diepe gleuf aan één kant (die kant wijst naar waar je moet trekken).
      b.voegToe(maakBol(1, 2), { matrix: matrix(0, 0.01, 0.035, 0, 0, 0, 0.065, 0.11, 0.07), kleur: wit });
      b.voegToe(maakBol(1, 1), { matrix: matrix(0, 0.07, 0.06, -0.6, 0, 0, 0.05, 0.02, 0.035), kleur: holte });
      break;
    }
    case 'ondergreep': {
      // Een brede, platte "glimlach" met de gleuf aan de onderkant (de greep is omgedraaid): je pakt hem van onder.
      b.voegToe(maakBol(1, 2), { matrix: matrix(0, -0.005, 0.03, 0, 0, 0, 0.15, 0.06, 0.065), kleur: wit });
      b.voegToe(maakBol(1, 1), { matrix: matrix(0, 0.035, 0.055, -0.5, 0, 0, 0.11, 0.018, 0.035), kleur: holte });
      break;
    }
    case 'knieklem': {
      // Een groot volume in het dak: een bolle rots-"hoorn" om je knie achter te klemmen.
      b.voegToe(maakBol(1, 2), { matrix: matrix(0, 0, 0.06, 0, 0, 0, 0.3, 0.16, 0.13), kleur: wit });
      b.voegToe(maakBol(1, 2), { matrix: matrix(0, 0.06, 0.13, 0.3, 0, 0, 0.2, 0.1, 0.08), kleur: wit });
      break;
    }
    case 'lip':
      // Een plakkertje op de rand van de richel (de rand zelf is de greep).
      b.voegToe(new THREE.CircleGeometry(0.045, 12), { matrix: matrix(0, 0, 0.004), kleur: wit });
      break;
    case 'voet':
      b.voegToe(maakBol(1, 1), { matrix: matrix(0, 0, 0.012, 0, 0, 0, 0.042, 0.032, 0.03), kleur: wit });
      break;
    default: // korrel
      b.voegToe(maakBol(1, 0), { matrix: matrix(0, 0, 0.008, 0, 0, 0, 0.024, 0.02, 0.018), kleur: wit });
  }
  return b.maak();
}

/**
 * Lambert met vertexkleuren én een eigen gloed in diezelfde kleur: de wand kijkt weg van de zon, maar mag
 * nooit grauw worden (kawaii). Bij grepen telt ook de kleur van de route mee.
 */
function gloeiMateriaal(gloed) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: gloed });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      'vec3 totalEmissiveRadiance = emissive;',
      'vec3 totalEmissiveRadiance = emissive * vColor.rgb;'
    );
  };
  return m;
}

/** Een rond bordje met de graad, als textuur. */
function graadTextuur(tekst, kleur) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff6e8';
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#' + new THREE.Color(kleur).getHexString();
  g.beginPath();
  g.arc(64, 64, 52, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = `900 ${tekst.length > 1 ? 52 : 66}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(80, 40, 60, 0.35)';
  g.strokeText(tekst, 64, 68);
  g.fillText(tekst, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * @param {ReturnType<typeof import('../../sim/klimmen/oefenrots.js').maakOefenrots>} rots
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {{ detail: number, schaduw: boolean }} kw kwaliteit
 */
export function maakOefenrotsbeeld(rots, K, kw) {
  const groep = new THREE.Group();
  // Van wandcoördinaten naar de wereld.
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...rots.R),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(...rots.N)
  );
  basis.setPosition(...rots.O);
  groep.matrixAutoUpdate = false;
  groep.matrix.copy(basis);

  const M = rots.maat;
  const routes = rots.routes;
  const P = rots.profiel;
  const gevouwen = !!P && !P.recht;
  const blok = new THREE.Mesh(gevouwen ? maakProfielBlok(M, P, kw.detail) : maakBlok(M, kw.detail), gloeiMateriaal(M.gloed));
  /** Van de wandkaart (u, v, zoveel uit de wand) naar wandcoördinaten (langs het profiel gevouwen). */
  const lok = (u, v, uit = 0, doel = new THREE.Vector3()) => {
    if (!gevouwen) return doel.set(u, v, uit);
    const a = THREE.MathUtils.degToRad(P.hoek(v));
    return doel.set(u, P.y(v) - Math.sin(a) * uit, P.z(v) + Math.cos(a) * uit);
  };
  const kantel = (v) => (gevouwen ? THREE.MathUtils.degToRad(P.hoek(v)) : 0);
  blok.castShadow = kw.schaduw;
  blok.receiveShadow = kw.schaduw;
  groep.add(blok);

  // Bovenop: bosjes en een paar palmen, op de echte bovenkant van de rots (van boven af gezocht).
  const straal = new THREE.Raycaster();
  const bovenOp = (x, z) => {
    straal.set(new THREE.Vector3(x, M.hoogte + 6, z), new THREE.Vector3(0, -1, 0));
    const raak = straal.intersectObject(blok)[0];
    return raak ? raak.point.y : M.hoogte;
  };
  const w = maakWillekeur(4242);
  const plantMat = maakPlantMateriaal({ gloed: 0x0c160c });
  const bosjeGeo = maakBosje(FLORA.bosje, kw.detail ? 1 : 0, w.getal);
  for (const [x, z, sc] of M.bosjes) {
    const b = new THREE.Mesh(bosjeGeo, plantMat);
    b.position.set(x, bovenOp(x, z) - 0.12, z);
    b.scale.setScalar(sc);
    b.rotation.y = w.getal() * 6.28;
    groep.add(b);
  }
  const palmGeo = maakPalm(FLORA.palm, kw.detail ? 1 : 0, w.getal);
  for (const [x, z, sc] of M.palmen) {
    const pm = new THREE.Mesh(palmGeo, plantMat);
    pm.position.set(x, bovenOp(x, z) - 0.2, z);
    pm.scale.setScalar(sc);
    pm.rotation.y = w.getal() * 6.28;
    pm.castShadow = kw.schaduw;
    groep.add(pm);
  }

  // --- Grepen: één InstancedMesh per soort, kleur per route ---
  const vormVan = (g) => (g.lip ? 'lip' : g.soort);
  const soorten = [...new Set(rots.grepen.map(vormVan))];
  const greepMat = gloeiMateriaal(M.greepGloed);
  /** @type {Record<string, THREE.InstancedMesh>} */
  const lagen = {};
  /** per greep: [laag, index] */
  const plekVan = [];
  for (const s of soorten) {
    const lijst = rots.grepen.filter((g) => vormVan(g) === s);
    const m = new THREE.InstancedMesh(maakGreepVorm(s), greepMat, lijst.length);
    m.castShadow = kw.schaduw;
    lijst.forEach((g, i) => (plekVan[g.id] = [s, i]));
    lagen[s] = m;
    groep.add(m);
  }
  const kleurVan = rots.grepen.map((g) => new THREE.Color(routes[g.route].kleur));
  const tmpM = new THREE.Matrix4();
  const tmpC = new THREE.Color();
  const wit = new THREE.Color(0xffffff);
  const rood = new THREE.Color(0xff2a2a);
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const qK = new THREE.Quaternion();
  const qD = new THREE.Quaternion();
  const vG = new THREE.Vector3();
  const vS = new THREE.Vector3();
  /** Zet greep id met schaal s en (opgelichte) kleur. */
  function zetGreep(id, s = 1, licht = 0, flits = 0) {
    const g = rots.grepen[id];
    const [laag, i] = plekVan[id];
    // Een kleine draaiing per greep, zodat de rij er niet als een stempel uitziet; een zijgreep of ondergreep draait
    // mee met haar goede trekrichting (stap 15a), en elke greep kantelt mee met de wand (onder een dak: ondersteboven).
    const draai = g.lip ? 0 : (((id * 7919) % 100) / 100 - 0.5) * (g.soort === 'knieklem' ? 0.2 : 0.5);
    const richting = THREE.MathUtils.degToRad(g.richting ?? 0);
    qK.setFromAxisAngle(X, kantel(g.v));
    qD.setFromAxisAngle(Z, draai + richting);
    if (g.lip) {
      // Het plakkertje zit op de voorkant van de richel, net onder de rand.
      const q = rots.richels.find((r) => Math.abs(r.v - g.v) < 0.1);
      lok(g.u, g.v, q ? q.diep + 0.005 : 0, vG);
      vG.y -= 0.035;
    } else lok(g.u, g.v, 0, vG);
    tmpM.compose(vG, qK.multiply(qD), vS.set(s, s, s));
    lagen[laag].setMatrixAt(i, tmpM);
    tmpC.copy(kleurVan[id]).lerp(wit, licht * 0.55).lerp(rood, flits);
    lagen[laag].setColorAt(i, tmpC);
  }
  for (const g of rots.grepen) zetGreep(g.id);
  for (const m of Object.values(lagen)) {
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  }

  // --- Startplakkers (een wit driehoekje onder elke startgreep), ankerringen, topbloemen en bordjes ---
  const plakker = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 3).rotateZ(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const metaal = new THREE.MeshLambertMaterial({ color: 0xdfe6f2, emissive: 0x6a7490 });
  const topbloemen = [];
  const ankers = [];
  routes.forEach((route, ri) => {
    const r = rots.routes[ri];
    for (const id of r.startGrepen) {
      const g = rots.grepen[id];
      const p = plakker.clone();
      p.material = new THREE.MeshBasicMaterial({ color: route.kleur });
      lok(g.u, g.v - 0.11, 0.035, p.position);
      p.rotation.x = kantel(g.v - 0.11);
      groep.add(p);
    }
    const [au, av] = rots.anker(ri);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16), metaal);
    lok(au, av, 0.06, ring.position);
    groep.add(ring);
    ankers.push(ring);
    const t = rots.grepen[r.topGreep];
    const bloem = maakHibiscus({
      blaadjeKleur: route.kleur, hartKleur: 0xffffff, stijlKleur: 0xfff3c4, stuifmeelKleur: 0xffe14d,
      grootte: 0.17, kom: 0.3, openheid: -0.25, stijl: 0.6,
    });
    const houder = new THREE.Group();
    houder.add(bloem);
    bloem.rotation.x = Math.PI / 2; // het hart kijkt uit de wand
    lok(t.u + 0.3, t.v + 0.12, 0.06, houder.position);
    houder.scale.setScalar(0.55);
    groep.add(houder);
    topbloemen.push({ houder, open: 0, doel: 0, wip: 0 });
  });

  // De bordjes met de graad: een paaltje en een rond bord, aan de voet van elke route.
  const hout = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const bordjes = routes.map((route, ri) => {
    const r = rots.routes[ri];
    const b = new THREE.Group();
    const paal = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.9, 8), hout);
    paal.position.y = 0.45;
    const bord = new THREE.Mesh(new THREE.CircleGeometry(0.24, 28), new THREE.MeshBasicMaterial({ map: graadTextuur(route.graad, route.kleur) }));
    bord.position.set(0, 0.95, 0.045);
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 28).rotateX(Math.PI / 2), hout);
    rug.position.set(0, 0.95, 0.015);
    b.add(paal, rug, bord);
    b.position.set(r.startU - 0.85, 0, 0.75);
    b.rotation.y = 0.25;
    groep.add(b);
    return b;
  });

  // Losse touwen die van elk anker naar beneden hangen (zolang niemand die route klimt).
  const touwMat = new THREE.MeshLambertMaterial({ color: K.touw.kleur, emissive: K.touw.kleur, emissiveIntensity: 0.25 });
  const hangtouwen = routes.map((_, ri) => {
    const [au, av] = rots.anker(ri);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(K.touw.dikte, K.touw.dikte, 1, 6), touwMat);
    // Recht naar beneden vanaf het anker; bij een dak hangt het voor de dakrand langs (stap 15a).
    const a = lok(au, av, 0.09);
    const lengte = a.y - 0.4;
    t.scale.y = lengte;
    t.position.set(au + 0.12, a.y - lengte / 2, a.z + (gevouwen ? 0.05 : 0));
    groep.add(t);
    return t;
  });

  // --- De richels (stap 15a): een vlak stukje rots om op te staan, met een afgeronde voorkant ---
  const richelMat = new THREE.MeshLambertMaterial({ color: M.kleurLaag, emissive: M.kleur, emissiveIntensity: M.gloed * 0.8 });
  const mosMat = new THREE.MeshLambertMaterial({ color: M.mos, emissive: M.mos, emissiveIntensity: 0.25 });
  for (const q of rots.richels ?? []) {
    const breed = q.tot - q.van;
    const plank = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, breed, 4, 14).rotateZ(Math.PI / 2), richelMat);
    const p = lok((q.van + q.tot) / 2, q.v - 0.07, q.diep * 0.5);
    plank.position.copy(p);
    plank.scale.set(1, 1, (q.diep + 0.06) / 0.15);
    plank.receiveShadow = kw.schaduw;
    plank.castShadow = kw.schaduw;
    groep.add(plank);
    // Een randje mos achteraan op de richel.
    const mosje = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, breed * 0.9, 3, 10).rotateZ(Math.PI / 2), mosMat);
    mosje.position.copy(lok((q.van + q.tot) / 2, q.v + 0.01, 0.06));
    mosje.scale.set(1, 0.6, 1.2);
    groep.add(mosje);
  }

  groep.updateMatrixWorld(true);

  return {
    groep,
    touwMat,
    /** Grepen oplichten (bereikbaar), knipperen (te ver) en de topbloemen laten opengaan. */
    werkBij(dt, tijd, licht, flitsen) {
      for (const g of rots.grepen) {
        const l = licht.get(g.id) ?? 0;
        const f = flitsen.get(g.id) ?? 0;
        const s = 1 + l * (0.12 + 0.08 * Math.sin(tijd * 6 + g.id)) + f * 0.25;
        zetGreep(g.id, s, l * (0.5 + 0.5 * Math.sin(tijd * 6 + g.id)), f);
      }
      for (const m of Object.values(lagen)) {
        m.instanceMatrix.needsUpdate = true;
        m.instanceColor.needsUpdate = true;
      }
      for (const b of topbloemen) {
        b.open += (b.doel - b.open) * Math.min(1, dt * 3);
        b.wip = Math.max(0, b.wip - dt);
        const sc = 0.55 + b.open * 0.75 + Math.sin(b.wip * 14) * b.wip * 0.4;
        b.houder.scale.setScalar(sc);
        b.houder.rotation.z = Math.sin(tijd * 1.3) * 0.08 + b.open * tijd * 0.6;
      }
    },
    /** Route ri is uitgeklommen: de topbloem gaat groot open. */
    bloei(ri) {
      topbloemen[ri].doel = 1;
      topbloemen[ri].wip = 0.6;
    },
    /** Zet de topbloem van route ri terug klein (bij een nieuwe poging). */
    sluit(ri) {
      topbloemen[ri].doel = 0;
    },
    /** Het hangtouw van route ri tonen of verbergen (verborgen terwijl iemand die route klimt). */
    hangtouw(ri, zichtbaar) {
      hangtouwen[ri].visible = zichtbaar;
    },
    /** Wereldpositie van het anker van route ri. */
    ankerPlek(ri, uit = new THREE.Vector3()) {
      return uit.copy(ankers[ri].position).applyMatrix4(groep.matrix);
    },
    bordjes,
  };
}
