// De klimster aan de wand in beeld (stap 9): de avonturier krijgt aan de wand langere armen en benen met
// ellebogen en knieën, die naar de grepen reiken (KL 5: "eerst in 2D schikken, dan pas tekenen").
// Kracht per arm zie je op de handjes zelf: een ring die leegloopt (groen, geel, rood), het handje kleurt
// en begint te trillen (KL 6). Een kleurring rond elke vastgehouden greep toont hoe goed die nu houdt (KL 4).
// Verder: het touw (toprope) en de witte tijger die onderaan zekert (KL 8). Leest alleen de simulatie.
// Stap 15a: het lichaam volgt de wand (KL 5, 11): de heupen en schouders hangen verder van de wand naargelang de
// steilte, onder een dak hang je met je buik naar het dak en zakken de heupen door. Voeten haken in het dak of
// haken met de hak over de dakrand; een vrije voet vlagt opzij; met de voeten los zwaai je uit als een slinger.
// Vleermuisrust in de knieklem (ondersteboven, het haar valt naar beneden), vrij hangen in het touw onder het dak
// (het touw loopt over de dakrand), de dyno (een boogje toont waar je uitkomt), het pofzakje met magnesium.
import * as THREE from 'three';
import { maakGezelbeeld } from './gezel.js';
import { GEZEL } from '../data/tijger.js';
import { hangAfstand } from '../sim/klimmen/kracht.js';
import { dynoVoorspel } from '../sim/modi/klimmen.js';

const klem = THREE.MathUtils.clamp;
const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const Y = new THREE.Vector3(0, 1, 0);

/** Een bot: een cilinder van 0 tot 1 langs y, die we tussen twee punten zetten. */
function maakBot(straal, mat) {
  const g = new THREE.CylinderGeometry(straal, straal * 0.92, 1, 10, 1);
  g.translate(0, 0.5, 0);
  return new THREE.Mesh(g, mat);
}
const _d = new THREE.Vector3();
function zetTussen(m, a, b) {
  _d.subVectors(b, a);
  const l = _d.length();
  m.position.copy(a);
  m.scale.set(1, Math.max(l, 1e-4), 1);
  if (l > 1e-6) m.quaternion.setFromUnitVectors(Y, _d.multiplyScalar(1 / l));
}

/**
 * Twee botten van `wortel` naar `doel` (lengtes a en b), met het gewricht naar de kant van `pool`.
 * Zet `mid` (elleboog of knie) en `eind` (waar de hand of voet echt uitkomt).
 */
const _r = new THREE.Vector3();
const _p = new THREE.Vector3();
function ik(wortel, doel, a, b, pool, mid, eind) {
  _r.subVectors(doel, wortel);
  let L = _r.length();
  if (L < 1e-5) _r.set(0, -1, 0), (L = 1e-5);
  _r.multiplyScalar(1 / L);
  L = klem(L, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const x = (a * a - b * b + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  _p.copy(pool).addScaledVector(_r, -pool.dot(_r));
  if (_p.lengthSq() < 1e-8) _p.set(0, 0, 1);
  _p.normalize();
  mid.copy(wortel).addScaledVector(_r, x).addScaledVector(_p, h);
  eind.copy(wortel).addScaledVector(_r, L);
}

/** Een assenstelsel (x, y, z) als draaiing; x wordt uit y en z berekend (rechtshandig). */
const _bx = new THREE.Vector3();
const _bz = new THREE.Vector3();
const _bm = new THREE.Matrix4();
function basisNaar(q, omhoog, vooruit) {
  _bx.crossVectors(omhoog, vooruit);
  if (_bx.lengthSq() < 1e-8) _bx.set(1, 0, 0);
  _bx.normalize();
  _bz.crossVectors(_bx, omhoog).normalize();
  _bm.makeBasis(_bx, omhoog, _bz);
  return q.setFromRotationMatrix(_bm);
}

/**
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof import('./maak/testfiguur.js').maakTestfiguur>} avonturier
 * @param {any} rots de wand
 * @param {typeof import('../data/klimmen.js').KLIMMEN} K
 * @param {{ detail: number, schaduw: boolean }} kw
 */
export function maakKlimmerbeeld(scene, avonturier, rots, K, kw) {
  const L = K.lichaam;
  const N = new THREE.Vector3(...rots.N);
  const R = new THREE.Vector3(...rots.R);
  const huid = avonturier.armen[0].children[0].material;
  const schoenMat = avonturier.benen[0].children[1].material;

  // --- Klimarmen en -benen (alleen zichtbaar aan de wand) ---
  const ledemaat = (hand) => {
    const mat = hand ? huid.clone() : huid;
    const boven = maakBot(hand ? 0.048 : 0.062, huid);
    const onder = maakBot(hand ? 0.043 : 0.054, huid);
    const gewricht = new THREE.Mesh(new THREE.SphereGeometry(hand ? 0.047 : 0.06, 10, 8), huid);
    const eind = hand
      ? new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 10), mat)
      : new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 8), schoenMat);
    if (!hand) eind.scale.set(0.95, 0.7, 1.3);
    const groep = new THREE.Group();
    groep.add(boven, onder, gewricht, eind);
    groep.visible = false;
    if (kw.schaduw) groep.traverse((o) => (o.castShadow = true));
    scene.add(groep);
    return {
      groep, boven, onder, gewricht, eind, mat, mid: new THREE.Vector3(), punt: new THREE.Vector3(),
      doel: new THREE.Vector3(), pool: new THREE.Vector3(), voetOp: new THREE.Vector3(), voetVoor: new THREE.Vector3(),
    };
  };
  const leden = { lh: ledemaat(true), rh: ledemaat(true), lv: ledemaat(false), rv: ledemaat(false) };
  // 3D-lengtes: de 2D-reik plus de afstand tot de wand, met wat speling.
  const armBot = Math.hypot(L.arm, 0.3) * 0.53;
  const beenBot = Math.hypot(L.been, 0.28) * 0.53;

  // --- Krachtring rond elk handje (groen → geel → rood, loopt leeg) en de greepring op de wand ---
  const SEG = 36;
  const kleurVol = [new THREE.Color(0x5be37a), new THREE.Color(0xffd84d), new THREE.Color(0xff4d5e)];
  const ringen = {};
  const greepRingen = {};
  for (const lid of ['lh', 'rh']) {
    const bodem = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.1, SEG, 1),
      new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.25, depthTest: false })
    );
    const vul = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.1, SEG, 1, Math.PI / 2, Math.PI * 2),
      new THREE.MeshBasicMaterial({ color: 0x5be37a, depthTest: false, transparent: true })
    );
    const groep = new THREE.Group();
    groep.add(bodem, vul);
    groep.renderOrder = bodem.renderOrder = vul.renderOrder = 20;
    groep.visible = false;
    scene.add(groep);
    ringen[lid] = { groep, vul };
    const gr = new THREE.Mesh(
      new THREE.RingGeometry(0.13, 0.16, 28),
      new THREE.MeshBasicMaterial({ color: 0x5be37a, transparent: true, opacity: 0.85, depthWrite: false })
    );
    gr.visible = false;
    scene.add(gr);
    greepRingen[lid] = gr;
  }
  const kleurVoor = (x, uit) => {
    // x: 0 = goed (groen), 1 = slecht (rood)
    if (x < 0.5) return uit.copy(kleurVol[0]).lerp(kleurVol[1], x * 2);
    return uit.copy(kleurVol[1]).lerp(kleurVol[2], (x - 0.5) * 2);
  };

  // --- Het touw: van de tijger naar het anker, van het anker naar de gordel (onder een dak over de dakrand) ---
  const touwMat = new THREE.MeshLambertMaterial({ color: K.touw.kleur, emissive: K.touw.kleur, emissiveIntensity: 0.25 });
  const touwA = maakBot(K.touw.dikte, touwMat);
  const touwB = maakBot(K.touw.dikte, touwMat);
  const touwC = maakBot(K.touw.dikte, touwMat);
  touwA.visible = touwB.visible = touwC.visible = false;
  scene.add(touwA, touwB, touwC);
  // Een gordeltje rond het middel, met achteraan een pofzakje voor het magnesium (stap 15a).
  const gordel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), new THREE.MeshLambertMaterial({ color: 0x3fb6e6 }));
  gordel.rotation.x = Math.PI / 2;
  gordel.position.y = 0.23;
  gordel.visible = false;
  avonturier.lijf.add(gordel);
  const pofzakje = new THREE.Group();
  const zak = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.13, 12), new THREE.MeshLambertMaterial({ color: 0xff8fc4, emissive: 0xff8fc4, emissiveIntensity: 0.25 }));
  const randje = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.014, 6, 14), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 }));
  randje.rotation.x = Math.PI / 2;
  randje.position.y = 0.065;
  const poeder = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffaf4 }));
  poeder.position.y = 0.058;
  pofzakje.add(zak, randje, poeder);
  pofzakje.position.set(0, 0.2, -0.2);
  pofzakje.visible = false;
  avonturier.lijf.add(pofzakje);

  // --- Het boogje van de dyno: stipjes van de handen naar waar je uitkomt, en een ring daar ---
  const STIPPEN = 12;
  const stipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false });
  const stippen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), stipMat, STIPPEN);
  stippen.renderOrder = 21;
  stippen.visible = false;
  stippen.frustumCulled = false;
  scene.add(stippen);
  const dynoRing = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.17, 28),
    new THREE.MeshBasicMaterial({ color: 0x5be37a, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })
  );
  dynoRing.renderOrder = 21;
  dynoRing.visible = false;
  scene.add(dynoRing);

  // --- Het haar: ondersteboven (vleermuisrust) vallen de lange krullen naar beneden in plaats van naar boven ---
  const krullen = avonturier.krullen;
  const lokken = krullen ? Math.max(0, krullen.count - 9) : 0;
  const krulPos = [];
  const krulDraai = [];
  const krulMaat = [];
  let krulTop = -Infinity;
  {
    const m = new THREE.Matrix4();
    for (let i = 0; i < lokken; i++) {
      krullen.getMatrixAt(i, m);
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      m.decompose(p, q, sc);
      krulPos.push(p);
      krulDraai.push(q);
      krulMaat.push(sc);
      krulTop = Math.max(krulTop, p.y);
    }
  }
  let haarNu = 0;
  const krulM = new THREE.Matrix4();
  const krulP = new THREE.Vector3();
  function haar(h) {
    if (!lokken || Math.abs(h - haarNu) < 0.01) return;
    haarNu = h;
    const midden = krulTop - 0.03;
    for (let i = 0; i < lokken; i++) {
      const p = krulPos[i];
      krulP.set(p.x, p.y + (2 * midden - 2 * p.y) * h, p.z);
      krulM.compose(krulP, krulDraai[i], krulMaat[i]);
      krullen.setMatrixAt(i, krulM);
    }
    krullen.instanceMatrix.needsUpdate = true;
  }

  // --- De witte tijger die zekert ---
  const zekeraar = maakGezelbeeld(scene, kw, K.zekeraar.soort);
  const thuis = new THREE.Vector3(...rots.zekeraar);
  let naarWand = Math.atan2(-N.x, -N.z);
  const zt = {
    pos: [thuis.x, thuis.y, thuis.z],
    vorigePos: [thuis.x, thuis.y, thuis.z],
    richting: naarWand,
    vorigeRichting: naarWand,
    kijk: null,
    gang: 'stil',
    snelheid: 0,
  };
  // Zekeren doet hij schuin links van de route (de camera staat rechts), zodat hij nooit voor de klimster staat.
  const zekerPlek = (ri) => new THREE.Vector3(...rots.naarWereld(rots.routes[ri].startU + K.zekeraar.zekerOpzij, 0, rots.zekerVoor ?? K.zekeraar.zekerVoor));

  // --- Hulpvectoren ---
  const wereld = (u, v, uit, doel = new THREE.Vector3()) => {
    const p = rots.naarWereld(u, v, uit);
    return doel.set(p[0], p[1], p[2]);
  };
  const nArr = [0, 0, 0];
  const nOp = (v, doel) => {
    rots.normaal(v, nArr);
    return doel.set(nArr[0], nArr[1], nArr[2]);
  };
  const tOp = (v, doel) => {
    rots.raak(v, nArr);
    return doel.set(nArr[0], nArr[1], nArr[2]);
  };
  const heup = new THREE.Vector3();
  const schouder = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const nL = new THREE.Vector3();
  const tL = new THREE.Vector3();
  const omhoog = new THREE.Vector3();
  const vooruit = new THREE.Vector3();
  const wortel = new THREE.Vector3();
  const qNu = new THREE.Quaternion();
  const qVm = new THREE.Quaternion();
  const heupVm = new THREE.Vector3();
  const knie = new THREE.Vector3();
  const lokaal = {
    lh: new THREE.Vector3(0.17, 0.53, 0.02), rh: new THREE.Vector3(-0.17, 0.53, 0.02),
    lv: new THREE.Vector3(0.085, 0.22, 0), rv: new THREE.Vector3(-0.085, 0.22, 0),
  };
  const KANT = { lh: -1, rh: 1, lv: -1, rv: 1 };
  const bek = new THREE.Vector3();
  const anker = new THREE.Vector3();
  const rand = new THREE.Vector3();
  const gordelPunt = new THREE.Vector3();
  const huidKleur = huid.color.clone();
  const rozig = new THREE.Color(0xff5a6e);
  const krijtWit = new THREE.Color(0xffffff);
  const qVoet = new THREE.Quaternion();
  const qVoetVm = new THREE.Quaternion();
  const kpV = new THREE.Vector3();
  const stipM = new THREE.Matrix4();
  // Het hoofdje kijkt naar de greep waar ze naartoe reikt (of naar haar hoogste hand).
  const kop = avonturier.kop;
  const kijkDoel = new THREE.Vector3();
  const kijkLokaal = new THREE.Vector3();
  let kopYaw = 0;
  let kopPitch = 0;
  let kopNu = 1;
  let tijd = 0;
  let aan = false;
  let opBlend = 0;
  let stap = 0;
  let route = -1;
  // Voeten los: een slinger (hoek en hoeksnelheid, rond de as langs de wand) die uitdempt.
  const slinger = { a: 0, w: 0, los: false };
  let vmBlend = 0;

  function zetAan(a) {
    if (a === aan) return;
    aan = a;
    for (const l of Object.values(leden)) l.groep.visible = a;
    for (const a2 of avonturier.armen) a2.visible = !a;
    for (const b of avonturier.benen) b.visible = !a;
    if (!a) {
      kop.rotation.set(0, 0, 0);
      haar(0);
      stippen.visible = dynoRing.visible = false;
    }
    gordel.visible = a;
    pofzakje.visible = a;
    touwA.visible = touwB.visible = a;
    touwC.visible = false;
    for (const lid of ['lh', 'rh']) {
      ringen[lid].groep.visible = a;
      if (!a) greepRingen[lid].visible = false;
    }
  }

  /** Waar elk ledemaat nu op de wand zit (wandkaart), ook als het los is of onderweg. */
  function plekVan(k, lid, uit) {
    const hand = lid[1] === 'h';
    const o = k.op[lid];
    const z = k.zet;
    if (k.toestand === 'zakt' || k.toestand === 'val' || k.toestand === 'hangt' || (k.toestand === 'terug' && !o)) {
      return null; // handen aan het touw, voeten los (apart berekend)
    }
    if (z && z.lid === lid) {
      const f = glad(Math.min(1, z.t / z.duur));
      const u = z.van[0] + (z.naar.u - z.van[0]) * f;
      const v = z.van[1] + (z.naar.v - z.van[1]) * f;
      return uit.set(u, v, Math.sin(f * Math.PI) * (hand ? 0.22 : 0.14));
    }
    if (hand && (k.schudt === lid || k.los[lid] > 0 || k.krijtHand === lid)) return null;
    if (hand && k.dyno?.fase === 'vlucht') return null;
    if (!o) return null;
    return uit.set(o.u, o.v, 0);
  }

  /** Houdt deze hand nu vast? (voor de hangafstand van de schouders) */
  const houdt = (k, lid) => !!k.op[lid] && k.zet?.lid !== lid && k.schudt !== lid && !(k.los[lid] > 0) && k.krijtHand !== lid &&
    !(k.dyno?.fase === 'vlucht') && !(k.vleermuis?.handenLos);

  /**
   * De gewone houding aan de wand (stap 15a): heupen en schouders op hun plek langs het profiel, zo ver van de wand
   * als de steilte vraagt (en als de benen en armen nog reiken). Zet `heup`, `omhoog` en `vooruit`.
   */
  function houdingAanWand(k, achter, S) {
    const romp3 = 0.32 * S;
    const vS = k.P[1] + L.romp;
    const sS = klem(rots.steilte(vS), 0, 1);
    const sH = klem(rots.steilte(k.P[1]), 0, 1);
    // Op een verticale wand zoals in de klimproef: de heupen 0,3 m van de wand en een beetje achterover.
    const recht = L.wandAfstand + romp3 * Math.sin(achter);
    let som = 0;
    let n = 0;
    for (const lid of ['lh', 'rh']) {
      if (!houdt(k, lid)) continue;
      const o = k.op[lid];
      const d = Math.hypot(o.u - (k.P[0] + KANT[lid] * L.schouder), o.v - vS);
      som += hangAfstand(L, d, sS);
      n++;
    }
    const hang = n ? klem(som / n, 0.25, 0.58) : recht;
    const dS = recht + (hang - recht) * sS;
    // De heupen zakken door onder een dak (meer als de armen meer dragen), maar de voeten moeten erbij kunnen.
    let dH = L.wandAfstand + (dS + 0.06 + 0.16 * klem(k.armBelasting, 0, 1) - L.wandAfstand) * sH;
    const voeten = ['lv', 'rv'].filter((l) => k.op[l] && k.zet?.lid !== l);
    for (let it = 0; it < 12 && dH > 0.16; it++) {
      wereld(k.P[0], k.P[1], dH, heup);
      let te = false;
      for (const l of voeten) {
        voetDoel(k, l, k.op[l].u, k.op[l].v, 0, tmp);
        if (tmp.distanceTo(heup) > beenBot * 1.94) te = true;
      }
      if (!te) break;
      dH -= 0.03;
    }
    wereld(k.P[0], k.P[1], dH, heup);
    wereld(k.P[0], vS, dS, schouder);
    // Voeten los (in een overhang of dak): de heupen hangen onder de schouders, en zwaaien uit.
    if (!voeten.length && n && sS > 0.2) {
      tmp.set(0, -1, 0).applyAxisAngle(R, slinger.a);
      heup.copy(schouder).addScaledVector(tmp, romp3 + 0.04);
    }
    omhoog.subVectors(schouder, heup).normalize();
    // Vooruit = naar de wand toe; een tikje naar de wandvoet, zodat het ook klopt als je recht onder een dak hangt.
    nOp(k.P[1] + L.romp * 0.5, vooruit).negate().addScaledVector(N, -0.5).normalize();
  }

  /** Waar een voet op de wand (of de grond, of een richel) getekend wordt. */
  function voetDoel(k, lid, u, v, lift, doel) {
    const o = k.op[lid];
    const zetNaar = k.zet?.lid === lid ? k.zet.naar : null;
    const g = zetNaar ?? o;
    // Op een richel (of op haar rand, die ook een greep is): bovenop de richel staan.
    const lip = g && g.greep >= 0 && rots.grepen[g.greep]?.lip ? rots.richels?.find((r) => Math.abs(r.v - g.v) < 0.1) : null;
    if (lip || (g && g.greep <= -2 && Math.abs(v - (rots.richels?.[-2 - g.greep]?.v ?? -9)) < 0.05)) {
      const q = lip ?? rots.richels[-2 - g.greep];
      if (lip && Math.abs(v - g.v) > 0.05) return wereld(u, v, 0.07 + lift, doel); // nog onderweg
      wereld(u, q.v, q.diep * 0.55 + lift, doel);
      doel.y += 0.03;
      return doel;
    }
    wereld(u, v, 0.07 + lift, doel);
    if (!lift && v <= 0.001) doel.addScaledVector(N, 0.08); // op de grond: voor de wand
    return doel;
  }

  return {
    zekeraar,
    /** Is de klimster nu aan de wand in beeld? */
    get aan() {
      return aan;
    },

    /**
     * @param {any} s speler
     * @param {number} dt
     * @param {THREE.Camera} camera
     * @param {(x: number, z: number) => number} grondOp
     * @param {number} [wenk] de handjes wenken (sleep mij), 0..1
     */
    werkBij(s, dt, camera, grondOp, wenk = 0) {
      tijd += dt;
      const k = s.klim;
      zetAan(!!k);

      // --- De witte tijger: naar de voet van de route die geklommen wordt, en kijkt naar de klimster ---
      zt.vorigePos = [...zt.pos];
      zt.vorigeRichting = zt.richting;
      const plek = k ? zekerPlek(k.route) : thuis;
      const dx = plek.x - zt.pos[0];
      const dz = plek.z - zt.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 0.12) {
        const v = Math.min(1.7, d * 2);
        zt.pos[0] += (dx / d) * v * dt;
        zt.pos[2] += (dz / d) * v * dt;
        zt.snelheid = v;
        zt.gang = 'stap';
        const doelR = Math.atan2(dx, dz);
        const dr = Math.atan2(Math.sin(doelR - zt.richting), Math.cos(doelR - zt.richting));
        zt.richting += dr * Math.min(1, dt * 6);
      } else {
        zt.snelheid = 0;
        zt.gang = 'stil';
        const dr = Math.atan2(Math.sin(naarWand - zt.richting), Math.cos(naarWand - zt.richting));
        zt.richting += dr * Math.min(1, dt * 3);
      }
      zt.pos[1] = grondOp(zt.pos[0], zt.pos[2]);
      zt.kijk = k ? [s.pos[0], s.pos[1] + 0.3, s.pos[2]] : null;
      zekeraar.werkBij(zt, 1, dt, camera, grondOp);

      // Het hoofdje krimpt zacht aan de wand (het klimspreukje) en groeit beneden weer terug.
      kopNu += ((k ? L.kopSchaal ?? 1 : 1) - kopNu) * Math.min(1, dt * 5);
      kop.scale.setScalar(kopNu);
      if (route >= 0 && (!k || k.route !== route)) route = -1;
      if (!k) {
        opBlend = 0;
        vmBlend = 0;
        slinger.a = slinger.w = 0;
        return;
      }
      route = k.route;

      // --- De romp ---
      const zakt = k.toestand === 'zakt';
      const inTouw = k.toestand === 'val' || k.toestand === 'hangt' || k.toestand === 'terug';
      const vrij = !!k.vrij;
      const fig = avonturier.figuur;
      const lijf = avonturier.lijf;
      const S = avonturier.basisSchaal;
      // Zijwaarts naar de handen leunen.
      let hu = 0;
      let nh = 0;
      for (const lid of ['lh', 'rh']) if (k.op[lid]) {
        hu += k.op[lid].u;
        nh++;
      }
      let opzij = nh ? klem((hu / nh - k.P[0]) * 0.55, -0.28, 0.28) : 0;
      const achter = zakt ? 0.6 : inTouw ? 0.35 : 0.22 + klem((k.hand.lh.pomp + k.hand.rh.pomp) * 0.04, 0, 0.08);

      // Voeten los: de slinger (KL 5). Als de voeten loskomen, zwaait het lijf uit en dempt dan uit.
      const losNu = !k.op.lv && !k.op.rv && k.toestand === 'klimt' && !k.vleermuis && k.zet?.lid !== 'lv' && k.zet?.lid !== 'rv';
      if (losNu && !slinger.los) slinger.w = 2.2;
      slinger.los = losNu;
      if (losNu) {
        slinger.w += (-11 * Math.sin(slinger.a) - 1.6 * slinger.w) * dt;
        slinger.a += slinger.w * dt;
      } else {
        slinger.a *= Math.max(0, 1 - dt * 6);
        slinger.w = 0;
      }

      if (vrij) {
        // Vrij in het touw (onder een dak): hangend in de gordel, het touw schuin omhoog naar de dakrand.
        heup.set(k.vrij.pos[0], k.vrij.pos[1], k.vrij.pos[2]);
        tmp.set(k.vrij.spil[0], k.vrij.spil[1], k.vrij.spil[2]).sub(heup).normalize();
        omhoog.copy(Y).lerp(tmp, 0.5).normalize();
        vooruit.set(-N.x, 0, -N.z);
        opzij = Math.sin(tijd * 1.7) * 0.06;
      } else if (zakt || inTouw) {
        // Laten zakken of in het touw op een gewone wand: achterover in de gordel, voetjes tegen de wand.
        wereld(k.P[0], k.P[1], zakt ? 0.55 : 0.45, heup);
        omhoog.copy(Y).multiplyScalar(Math.cos(achter)).addScaledVector(N, Math.sin(achter));
        vooruit.copy(N).negate();
      } else {
        houdingAanWand(k, achter, S);
      }
      basisNaar(qNu, omhoog, vooruit);

      // --- Vleermuisrust (KL 5): ondersteboven aan de knieklem, armen hangen, het haar valt naar beneden ---
      const vm = k.vleermuis;
      let vmDoel = 0;
      if (vm) vmDoel = vm.fase === 'in' ? glad(vm.t / K.knieklem.inDuur) : vm.fase === 'uit' ? 1 - glad(vm.t / K.knieklem.uitDuur) : 1;
      vmBlend = vm ? vmDoel : Math.max(0, vmBlend - dt * 3);
      const kk = vm ? rots.grepen[vm.greep] : null;
      if (kk) {
        wereld(kk.u, kk.v, 0.1, knie);
        heupVm.copy(knie).addScaledVector(Y, -0.36).addScaledVector(N, 0.04);
        heupVm.x += Math.sin(tijd * 1.3) * 0.03;
        basisNaar(qVm, tmp.set(0, -1, 0), tmp2.set(N.x, 0, N.z).normalize());
        heup.lerp(heupVm, vmBlend);
        qNu.slerp(qVm, vmBlend);
        opzij *= 1 - vmBlend;
      }
      haar(vmBlend);

      // Barndoor: hangt het gewicht naast alle steunpunten, dan draait het lijf open en wiebelt het (KL 5).
      const open = k.toestand === 'klimt' ? k.zwaaiOpen ?? 0 : 0;
      const deur = open * (k.zwaaiKant || 1) * (0.3 + Math.sin(tijd * 9) * 0.06);
      lijf.scale.setScalar(S);
      lijf.rotation.set(0, deur, opzij);
      // Draaien rond de heupen in plaats van rond de voetjes.
      tmp.set(0, 0.21 * S, 0).applyEuler(lijf.rotation);
      lijf.position.set(0, 0.21 * S, 0).sub(tmp);
      fig.quaternion.copy(qNu);
      tmp.set(0, 0.21 * S, 0).applyQuaternion(qNu);
      fig.position.copy(heup).sub(tmp);
      // Op de wand stappen: even van waar je stond naar de startgrepen schuiven.
      if (k.toestand === 'op' && s.klimVan) {
        opBlend = glad(k.t / 0.45);
        tmp.set(s.klimVan[0], s.klimVan[1], s.klimVan[2]);
        fig.position.lerpVectors(tmp, fig.position, opBlend);
      }
      fig.updateMatrixWorld(true);
      // De echte richting van het lijf (voor de vrije armen en benen).
      omhoog.set(0, 1, 0).applyQuaternion(qNu);

      // --- Armen en benen ---
      const dyno = k.dyno;
      const dynoT = dyno?.fase === 'vlucht' ? dyno.doel : null;
      for (const lid of ['lh', 'rh', 'lv', 'rv']) {
        const l = leden[lid];
        const hand = lid[1] === 'h';
        wortel.copy(lokaal[lid]);
        lijf.localToWorld(wortel);
        const kp = plekVan(k, lid, kpV);
        const doel = l.doel;
        let hak = false;
        let opWand = false;
        if (kp) {
          opWand = true;
          if (hand) wereld(kp.x, kp.y, 0.05 + kp.z, doel);
          else {
            voetDoel(k, lid, kp.x, kp.y, kp.z, doel);
            const o = k.zet?.lid === lid ? k.zet.naar : k.op[lid];
            hak = !!o?.hak && kp.y > k.P[1] + 0.05;
          }
        } else if (hand) {
          if (k.krijtHand === lid) {
            // Een hand in het pofzakje.
            pofzakje.getWorldPosition(doel);
            doel.addScaledVector(omhoog, 0.05);
          } else if (dynoT) {
            // In de lucht: de handen strekken zich naar waar ze gaan grijpen.
            wereld(dynoT[0] + KANT[lid] * 0.1, dynoT[1], 0.12, doel);
          } else if (zakt || inTouw || vrij) {
            // Handjes aan het touw, voor de borst.
            doel.copy(heup).addScaledVector(omhoog, 0.42).addScaledVector(vrij ? tmp2.set(N.x, 0, N.z).normalize() : N, 0.2).addScaledVector(R, KANT[lid] * 0.05);
            if (lid === 'rh') doel.addScaledVector(omhoog, -0.1);
          } else {
            // Uitschudden, weggegleden of vrij: het armpje hangt (naar beneden) en schudt.
            const schud = k.schudt === lid ? Math.sin(tijd * 32) * 0.05 : Math.sin(tijd * 9) * 0.05;
            doel.copy(wortel).addScaledVector(Y, -0.38).addScaledVector(R, KANT[lid] * 0.12 + schud);
            nOp(k.P[1] + L.romp, tmp2);
            doel.addScaledVector(tmp2, 0.12);
          }
        } else {
          // Een voet die niet op de wand staat.
          if (zakt && !vrij) {
            // Laten zakken: de voetjes lopen tegen de wand naar beneden.
            stap += dt * K.touw.zakSnelheid * 2.2;
            const fase = stap + (lid === 'lv' ? 0 : Math.PI);
            wereld(k.P[0] + KANT[lid] * 0.13, k.P[1] - 0.42 + Math.sin(fase) * 0.09, 0.07 + Math.max(0, Math.cos(fase)) * 0.12, doel);
          } else if (k.vlag === lid && k.op[lid === 'lv' ? 'rv' : 'lv'] && k.toestand === 'klimt') {
            // Vlaggen: het vrije been strekt opzij en duwt tegen de wand (KL 5).
            nOp(k.P[1], tmp2);
            doel.copy(heup).addScaledVector(R, KANT[lid] * 0.45).addScaledVector(omhoog, -0.28).addScaledVector(tmp2, -0.12);
          } else {
            // Bengelen (in het touw, met de voeten los, na een dyno).
            const zwaai = Math.sin(tijd * 2.6 + (lid === 'lv' ? 0 : 1)) * 0.06;
            doel.copy(heup).addScaledVector(Y, -0.5).addScaledVector(R, KANT[lid] * 0.1 + zwaai);
            if (!vrij && !inTouw) {
              nOp(k.P[1], tmp2);
              doel.addScaledVector(tmp2, -0.12);
            } else doel.addScaledVector(tmp2.set(-N.x, 0, -N.z), 0.2);
          }
        }
        // Terug in de grepen na een val: van bengelen naar de oude grepen.
        if (k.toestand === 'terug' && k.stabiel?.op[lid]) {
          const o = k.stabiel.op[lid];
          if (hand) wereld(o.u, o.v, 0.05, tmp);
          else voetDoel(k, lid, o.u, o.v, 0, tmp);
          doel.lerp(tmp, glad(k.t / (K.touw.terugDuur * (vrij ? 1.6 : 1))));
        }
        // Ellebogen naar buiten en naar achter, knieën naar buiten en een beetje van de wand (langs het profiel).
        const vHier = kp ? kp.y : k.P[1] + (hand ? L.romp : 0);
        nOp(vHier, nL);
        tOp(vHier, tL);
        if (hand) l.pool.copy(R).multiplyScalar(KANT[lid]).addScaledVector(nL, 0.5).addScaledVector(tL, -0.6);
        else if (hak) l.pool.copy(R).multiplyScalar(KANT[lid] * 1.2).addScaledVector(nL, 0.5).addScaledVector(tL, -0.3);
        else l.pool.copy(R).multiplyScalar(KANT[lid]).addScaledVector(nL, 1.1);

        // Vleermuisrust: de knieën over de knieklem, de voetjes erachter, de armen hangen naar beneden.
        if (kk && vmBlend > 0) {
          if (hand) {
            tmp.copy(wortel).addScaledVector(Y, -0.6).addScaledVector(R, KANT[lid] * 0.1);
            tmp.x += Math.sin(tijd * 2.2 + KANT[lid]) * 0.03;
            tmp2.copy(R).multiplyScalar(KANT[lid]).addScaledVector(N, 0.4);
          } else {
            tmp.copy(knie).addScaledVector(tmp2.set(N.x, 0, N.z).normalize(), -0.24).addScaledVector(Y, 0.04).addScaledVector(R, KANT[lid] * 0.09);
            tmp2.set(0, 1, 0).addScaledVector(N, 0.4).addScaledVector(R, KANT[lid] * 0.2);
          }
          doel.lerp(tmp, vmBlend);
          l.pool.lerp(tmp2, vmBlend);
        }
        // Trillen bij een volle arm.
        if (hand) {
          const pomp = k.hand[lid].pomp;
          if (pomp > K.kracht.trillenVanaf) {
            const a = ((pomp - K.kracht.trillenVanaf) / (1 - K.kracht.trillenVanaf)) * 0.012;
            doel.x += (Math.random() - 0.5) * a;
            doel.y += (Math.random() - 0.5) * a;
          }
        }
        const a = hand ? armBot : beenBot;
        ik(wortel, doel, a, a, l.pool, l.mid, l.punt);
        zetTussen(l.boven, wortel, l.mid);
        zetTussen(l.onder, l.mid, l.punt);
        l.gewricht.position.copy(l.mid);
        l.eind.position.copy(l.punt);
        if (!hand) {
          // Het schoentje met de neus naar de wand (in het dak: de teen gehaakt in de greep; op de dakrand: de hak).
          if (opWand && kp.y > 0.001) {
            if (hak) basisNaar(qVoet, nL, tL);
            else basisNaar(qVoet, tL, tmp.copy(nL).negate());
          } else basisNaar(qVoet, Y, tmp.copy(N).negate());
          if (kk && vmBlend > 0) {
            basisNaar(qVoetVm, Y, tmp2.set(N.x, 0, N.z).normalize());
            qVoet.slerp(qVoetVm, vmBlend);
          }
          l.eind.quaternion.copy(qVoet);
        } else {
          // Het handje kleurt met de kracht (rozig als de arm vol zit), en wit met magnesium.
          const pomp = k.hand[lid].pomp;
          l.mat.color.copy(huidKleur).lerp(rozig, Math.pow(pomp, 1.5) * 0.65).lerp(krijtWit, klem((k.krijt?.[lid] ?? 0) / K.magnesium.zetten, 0, 1) * 0.5);
          l.mat.emissive.copy(l.mat.color);
        }
      }

      // --- Het hoofdje: kijkt naar de greep waar een hand naartoe gaat, anders naar de hoogste hand ---
      const z = k.zet;
      if (z && z.lid[1] === 'h') wereld(z.naar.u, z.naar.v, 0.05, kijkDoel);
      else if (dyno && k.op.lh && k.op.rh) {
        const vs = dynoVoorspel(k, rots, K);
        if (vs) wereld(vs.doel[0], vs.doel[1], 0.05, kijkDoel);
      } else if (dynoT) wereld(dynoT[0], dynoT[1], 0.05, kijkDoel);
      else if (kk && vmBlend > 0.5) kijkDoel.copy(camera.position);
      else if (k.toestand === 'zakt' || k.toestand === 'val' || k.toestand === 'hangt' || vrij) kijkDoel.copy(heup).addScaledVector(Y, -2).addScaledVector(tmp.set(N.x, 0, N.z).normalize(), 1.5);
      else {
        const hoog = (k.op.lh?.v ?? 0) >= (k.op.rh?.v ?? 0) ? 'lh' : 'rh';
        kijkDoel.copy(leden[hoog].punt).addScaledVector(tOp(k.P[1] + L.romp, tmp), 0.25);
      }
      kijkLokaal.copy(kijkDoel);
      lijf.worldToLocal(kijkLokaal);
      kijkLokaal.y -= kop.position.y;
      const yawDoel = klem(Math.atan2(kijkLokaal.x, kijkLokaal.z), -0.9, 0.9);
      const pitchDoel = klem(-Math.atan2(kijkLokaal.y, Math.hypot(kijkLokaal.x, kijkLokaal.z)), -0.7, 0.5);
      const kt = Math.min(1, dt * 6);
      kopYaw += (yawDoel - kopYaw) * kt;
      kopPitch += (pitchDoel - kopPitch) * kt;
      kop.rotation.set(kopPitch, kopYaw, 0, 'YXZ');

      // --- Krachtringen rond de handjes, naar de camera gekeerd ---
      for (const lid of ['lh', 'rh']) {
        const r = ringen[lid];
        const pomp = k.hand[lid].pomp;
        const over = 1 - pomp;
        r.groep.visible = !zakt && !vrij;
        r.groep.position.copy(leden[lid].punt).lerp(camera.position, 0.04);
        r.groep.quaternion.copy(camera.quaternion);
        r.vul.geometry.setDrawRange(0, Math.max(0, Math.round(over * SEG)) * 6);
        kleurVoor(pomp, r.vul.material.color);
        const sc = 1 + (pomp > 0.85 ? Math.sin(tijd * 14) * 0.12 : 0) + Math.min(1, wenk) * 0.45 * Math.abs(Math.sin(tijd * 9));
        r.groep.scale.setScalar(sc);
        // De greepring: hoe goed houdt deze greep nu?
        const g = greepRingen[lid];
        const o = k.op[lid];
        const vast = o && k.toestand === 'klimt' && houdt(k, lid);
        g.visible = !!vast;
        if (vast) {
          wereld(o.u, o.v, 0.02, g.position);
          g.lookAt(tmp.copy(g.position).add(nOp(o.v, tmp2)));
          kleurVoor(klem(k.hand[lid].verhouding / 1.6, 0, 1), g.material.color);
        }
      }

      // --- Het boogje van de dyno: zolang je oplaadt, zie je waar je uitkomt (groen: daar zit een greep) ---
      const vs = dyno?.fase === 'laad' && k.op.lh && k.op.rh ? dynoVoorspel(k, rots, K) : null;
      stippen.visible = dynoRing.visible = !!vs;
      if (vs) {
        const H = [(k.op.lh.u + k.op.rh.u) / 2, (k.op.lh.v + k.op.rh.v) / 2];
        const m = stipM;
        for (let i = 0; i < STIPPEN; i++) {
          const f = (i + 1) / (STIPPEN + 1);
          const u = H[0] + (vs.doel[0] - H[0]) * f;
          const v = H[1] + (vs.doel[1] - H[1]) * f;
          wereld(u, v, 0.15 + Math.sin(f * Math.PI) * 0.35, tmp);
          const sc = 0.6 + 0.4 * Math.sin(tijd * 10 - i * 0.7) ** 2;
          m.makeScale(sc, sc, sc).setPosition(tmp);
          stippen.setMatrixAt(i, m);
        }
        stippen.instanceMatrix.needsUpdate = true;
        wereld(vs.doel[0], vs.doel[1], 0.08, dynoRing.position);
        dynoRing.lookAt(tmp.copy(dynoRing.position).add(nOp(vs.doel[1], tmp2)));
        const vangt = vs.lh >= 0 || vs.rh >= 0;
        dynoRing.material.color.set(vangt ? 0x5be37a : 0xff6a7a);
        stipMat.color.set(vangt ? 0xffffff : 0xffc4cc);
        dynoRing.scale.setScalar(1 + Math.sin(tijd * 8) * 0.1);
      }

      // --- Het touw: tijger → anker → (over de dakrand) → gordel ---
      const sc = GEZEL.schaal;
      const tr = zekeraar.houder.rotation.y;
      bek.set(zt.pos[0] + Math.sin(tr) * 0.98 * sc, zt.pos[1] + 0.72 * sc, zt.pos[2] + Math.cos(tr) * 0.98 * sc);
      const [au, av] = rots.anker(k.route);
      wereld(au, av, 0.08, anker);
      gordelPunt.set(0, 0.25, 0.12);
      lijf.localToWorld(gordelPunt);
      zetTussen(touwA, bek, anker);
      const overRand = rots.randV != null && (vrij || k.P[1] < rots.randV + 0.3);
      touwC.visible = overRand;
      if (overRand) {
        wereld(au, rots.randV, 0.1, rand);
        zetTussen(touwB, anker, rand);
        zetTussen(touwC, rand, gordelPunt);
      } else zetTussen(touwB, anker, gordelPunt);
    },

    /**
     * Naar een andere klimwand (stap 13): de klimster en de witte tijger horen voortaan bij die wand.
     * De tijger springt meteen naar zijn plekje aan de voet.
     */
    zetWand(nieuw) {
      if (nieuw === rots) return;
      rots = nieuw;
      N.set(...rots.N);
      R.set(...rots.R);
      thuis.set(...rots.zekeraar);
      naarWand = Math.atan2(-N.x, -N.z);
      zt.pos = [thuis.x, thuis.y, thuis.z];
      zt.vorigePos = [thuis.x, thuis.y, thuis.z];
      zt.richting = zt.vorigeRichting = naarWand;
    },

    /** Een vrolijk sprongetje van de witte tijger (bij de top) of schrikken (bij een val). */
    tijgerBlij() {
      zekeraar.anim.blij();
    },
    tijgerSchrik() {
      zekeraar.anim.schud();
    },
    /** Waar het handje (lid) nu getekend wordt, in de wereld. */
    handPlek(lid) {
      return leden[lid].punt;
    },
    /** Waar het pofzakje hangt (voor het wolkje magnesium). */
    zakPlek(uit = new THREE.Vector3()) {
      return pofzakje.getWorldPosition(uit);
    },
    /** Hoofdhoogte van de witte tijger (voor hartjes en proesten). */
    tijgerKop(uit = new THREE.Vector3()) {
      return uit.set(zt.pos[0], zt.pos[1] + 1.1 * GEZEL.schaal, zt.pos[2]);
    },
  };
}
