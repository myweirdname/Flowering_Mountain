// De oefenrots in beeld (stap 9): een zachte lila rots met een vlakke klimwand, mos en bloemetjes bovenop,
// gekleurde grepen per route (zoals in een klimhal), een bordje met de graad aan de voet, een ankerring en een
// topbloem boven elke route. Alles in wandcoördinaten: x = u (naar rechts), y = v (omhoog), z = uit de wand.
// Dezelfde maker tekent ook de klimwanden van de berg (stap 13): elke wand geeft zijn eigen maten (`rots.maat`)
// en routes mee.
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
  const blok = new THREE.Mesh(maakBlok(M, kw.detail), gloeiMateriaal(M.gloed));
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
  const soorten = [...new Set(rots.grepen.map((g) => g.soort))];
  const greepMat = gloeiMateriaal(M.greepGloed);
  /** @type {Record<string, THREE.InstancedMesh>} */
  const lagen = {};
  /** per greep: [laag, index] */
  const plekVan = [];
  for (const s of soorten) {
    const lijst = rots.grepen.filter((g) => g.soort === s);
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
  /** Zet greep id met schaal s en (opgelichte) kleur. */
  function zetGreep(id, s = 1, licht = 0, flits = 0) {
    const g = rots.grepen[id];
    const [laag, i] = plekVan[id];
    // Een kleine draaiing per greep, zodat de rij er niet als een stempel uitziet.
    const draai = (((id * 7919) % 100) / 100 - 0.5) * 0.5;
    tmpM.compose(new THREE.Vector3(g.u, g.v, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), draai), new THREE.Vector3(s, s, s));
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
      p.position.set(g.u, g.v - 0.11, 0.035);
      groep.add(p);
    }
    const [au, av] = rots.anker(ri);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16), metaal);
    ring.position.set(au, av, 0.06);
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
    houder.position.set(t.u + 0.3, t.v + 0.12, 0.06);
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
    const lengte = av - 0.4;
    t.scale.y = lengte;
    t.position.set(au + 0.12, av - lengte / 2, 0.09);
    groep.add(t);
    return t;
  });

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
