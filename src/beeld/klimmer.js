// De klimster aan de wand in beeld (stap 9): de avonturier krijgt aan de wand langere armen en benen met
// ellebogen en knieën, die naar de grepen reiken (KL 5: "eerst in 2D schikken, dan pas tekenen").
// Kracht per arm zie je op de handjes zelf: een ring die leegloopt (groen, geel, rood), het handje kleurt
// en begint te trillen (KL 6). Een kleurring rond elke vastgehouden greep toont hoe goed die nu houdt (KL 4).
// Verder: het touw (toprope) en de witte tijger die onderaan zekert (KL 8). Leest alleen de simulatie.
import * as THREE from 'three';
import { maakGezelbeeld } from './gezel.js';
import { GEZEL } from '../data/tijger.js';

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

/**
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof import('./maak/testfiguur.js').maakTestfiguur>} avonturier
 * @param {ReturnType<typeof import('../sim/klimmen/oefenrots.js').maakOefenrots>} rots
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
    return { groep, boven, onder, gewricht, eind, mat, mid: new THREE.Vector3(), punt: new THREE.Vector3() };
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

  // --- Het touw: van de tijger naar het anker, en van het anker naar de gordel ---
  const touwMat = new THREE.MeshLambertMaterial({ color: K.touw.kleur, emissive: K.touw.kleur, emissiveIntensity: 0.25 });
  const touwA = maakBot(K.touw.dikte, touwMat);
  const touwB = maakBot(K.touw.dikte, touwMat);
  touwA.visible = touwB.visible = false;
  scene.add(touwA, touwB);
  // Een gordeltje rond het middel.
  const gordel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), new THREE.MeshLambertMaterial({ color: 0x3fb6e6 }));
  gordel.rotation.x = Math.PI / 2;
  gordel.position.y = 0.23;
  gordel.visible = false;
  avonturier.lijf.add(gordel);

  // --- De witte tijger die zekert ---
  const zekeraar = maakGezelbeeld(scene, kw, K.zekeraar.soort);
  const thuis = new THREE.Vector3(...rots.zekeraar);
  const naarWand = Math.atan2(-N.x, -N.z);
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
  const zekerPlek = (ri) => new THREE.Vector3(...rots.naarWereld(rots.routes[ri].startU + K.zekeraar.zekerOpzij, 0, K.zekeraar.zekerVoor));

  // --- Hulpvectoren ---
  const wereld = (u, v, uit, doel = new THREE.Vector3()) => {
    const p = rots.naarWereld(u, v, uit);
    return doel.set(p[0], p[1], p[2]);
  };
  const heup = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const pool = new THREE.Vector3();
  const wortel = new THREE.Vector3();
  const doel = new THREE.Vector3();
  const lokaal = {
    lh: new THREE.Vector3(0.17, 0.53, 0.02), rh: new THREE.Vector3(-0.17, 0.53, 0.02),
    lv: new THREE.Vector3(0.085, 0.22, 0), rv: new THREE.Vector3(-0.085, 0.22, 0),
  };
  const KANT = { lh: -1, rh: 1, lv: -1, rv: 1 };
  const bek = new THREE.Vector3();
  const anker = new THREE.Vector3();
  const kl = new THREE.Color();
  const huidKleur = huid.color.clone();
  const rozig = new THREE.Color(0xff5a6e);
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

  function zetAan(a) {
    if (a === aan) return;
    aan = a;
    for (const l of Object.values(leden)) l.groep.visible = a;
    for (const a2 of avonturier.armen) a2.visible = !a;
    for (const b of avonturier.benen) b.visible = !a;
    if (!a) kop.rotation.set(0, 0, 0);
    gordel.visible = a;
    touwA.visible = touwB.visible = a;
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
    if (hand && (k.schudt === lid || k.los[lid] > 0)) return null;
    if (!o) return null;
    return uit.set(o.u + (hand ? 0 : 0), o.v, 0);
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
        return;
      }
      route = k.route;

      // --- De romp ---
      const zakt = k.toestand === 'zakt';
      const inTouw = k.toestand === 'val' || k.toestand === 'hangt' || k.toestand === 'terug';
      const wand = zakt ? 0.55 : inTouw ? 0.45 : L.wandAfstand;
      wereld(k.P[0], k.P[1], wand, heup);
      const fig = avonturier.figuur;
      const lijf = avonturier.lijf;
      const S = avonturier.basisSchaal;
      // Zijwaarts naar de handen leunen, en altijd een beetje achterover (het grote hoofd blijft van de wand).
      let hu = 0;
      let n = 0;
      for (const lid of ['lh', 'rh']) if (k.op[lid]) {
        hu += k.op[lid].u;
        n++;
      }
      const opzij = n ? klem((hu / n - k.P[0]) * 0.55, -0.28, 0.28) : 0;
      const achter = zakt ? 0.6 : inTouw ? 0.35 : 0.22 + klem((k.hand.lh.pomp + k.hand.rh.pomp) * 0.04, 0, 0.08);
      lijf.scale.setScalar(S);
      lijf.rotation.set(-achter, 0, opzij);
      // Draaien rond de heupen in plaats van rond de voetjes.
      tmp.set(0, 0.21 * S, 0).applyEuler(lijf.rotation);
      lijf.position.set(0, 0.21 * S, 0).sub(tmp);
      fig.rotation.set(0, naarWand, 0);
      fig.position.copy(heup).addScaledVector(Y, -0.21 * S);
      // Op de wand stappen: even van waar je stond naar de startgrepen schuiven.
      if (k.toestand === 'op' && s.klimVan) {
        opBlend = glad(k.t / 0.45);
        tmp.set(s.klimVan[0], s.klimVan[1], s.klimVan[2]);
        fig.position.lerpVectors(tmp, fig.position, opBlend);
      }
      fig.updateMatrixWorld(true);

      // --- Armen en benen ---
      for (const lid of ['lh', 'rh', 'lv', 'rv']) {
        const l = leden[lid];
        const hand = lid[1] === 'h';
        wortel.copy(lokaal[lid]);
        lijf.localToWorld(wortel);
        const kp = plekVan(k, lid, tmp);
        if (kp) {
          wereld(kp.x, kp.y, (hand ? 0.05 : 0.07) + kp.z, doel);
          if (!kp.z && kp.y <= 0.001 && !hand) doel.addScaledVector(N, 0.08); // op de grond: voor de wand
        } else if (hand) {
          if (zakt || inTouw) {
            // Handjes aan het touw, voor de borst.
            doel.copy(heup).addScaledVector(Y, 0.42).addScaledVector(N, 0.22).addScaledVector(R, KANT[lid] * 0.05);
            if (lid === 'rh') doel.addScaledVector(Y, -0.1);
          } else {
            // Uitschudden of weggegleden: het armpje hangt en schudt.
            const schud = k.schudt === lid ? Math.sin(tijd * 32) * 0.05 : Math.sin(tijd * 9) * 0.05;
            doel.copy(wortel).addScaledVector(Y, -0.38).addScaledVector(R, KANT[lid] * 0.12 + schud).addScaledVector(N, 0.12);
          }
        } else {
          // Voeten los: lopen tegen de wand naar beneden (zakken) of bengelen (in het touw).
          if (zakt) {
            stap += dt * K.touw.zakSnelheid * 2.2;
            const fase = stap + (lid === 'lv' ? 0 : Math.PI);
            wereld(k.P[0] + KANT[lid] * 0.13, k.P[1] - 0.42 + Math.sin(fase) * 0.09, 0.07 + Math.max(0, Math.cos(fase)) * 0.12, doel);
          } else {
            const zwaai = Math.sin(tijd * 2.6 + (lid === 'lv' ? 0 : 1)) * 0.06;
            doel.copy(heup).addScaledVector(Y, -0.5).addScaledVector(R, KANT[lid] * 0.1 + zwaai).addScaledVector(N, -0.2);
          }
        }
        // Terug in de grepen na een val: van bengelen naar de oude grepen.
        if (k.toestand === 'terug' && k.stabiel?.op[lid]) {
          const o = k.stabiel.op[lid];
          wereld(o.u, o.v, hand ? 0.05 : 0.07, tmp);
          doel.lerp(tmp, glad(k.t / K.touw.terugDuur));
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
        // Ellebogen naar buiten en naar achter, knieën naar buiten en een beetje van de wand.
        pool.copy(R).multiplyScalar(KANT[lid]).addScaledVector(N, hand ? 0.5 : 1.1).addScaledVector(Y, hand ? -0.6 : 0);
        const a = hand ? armBot : beenBot;
        ik(wortel, doel, a, a, pool, l.mid, l.punt);
        zetTussen(l.boven, wortel, l.mid);
        zetTussen(l.onder, l.mid, l.punt);
        l.gewricht.position.copy(l.mid);
        l.eind.position.copy(l.punt);
        if (!hand) {
          // Het schoentje met de neus naar de wand.
          l.eind.rotation.set(0, naarWand, 0);
        } else {
          // Het handje kleurt met de kracht (rozig als de arm vol zit).
          const pomp = k.hand[lid].pomp;
          l.mat.color.copy(huidKleur).lerp(rozig, Math.pow(pomp, 1.5) * 0.65);
          l.mat.emissive.copy(l.mat.color);
        }
      }

      // --- Het hoofdje: kijkt naar de greep waar een hand naartoe gaat, anders naar de hoogste hand ---
      const z = k.zet;
      if (z && z.lid[1] === 'h') wereld(z.naar.u, z.naar.v, 0.05, kijkDoel);
      else if (k.toestand === 'zakt' || k.toestand === 'val' || k.toestand === 'hangt') kijkDoel.copy(heup).addScaledVector(Y, -2).addScaledVector(N, 1.5);
      else {
        const hoog = (k.op.lh?.v ?? 0) >= (k.op.rh?.v ?? 0) ? 'lh' : 'rh';
        kijkDoel.copy(leden[hoog].punt).addScaledVector(Y, 0.25);
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
        r.groep.visible = !zakt;
        r.groep.position.copy(leden[lid].punt).lerp(camera.position, 0.04);
        r.groep.quaternion.copy(camera.quaternion);
        r.vul.geometry.setDrawRange(0, Math.max(0, Math.round(over * SEG)) * 6);
        kleurVoor(pomp, r.vul.material.color);
        const sc = 1 + (pomp > 0.85 ? Math.sin(tijd * 14) * 0.12 : 0) + Math.min(1, wenk) * 0.45 * Math.abs(Math.sin(tijd * 9));
        r.groep.scale.setScalar(sc);
        // De greepring: hoe goed houdt deze greep nu?
        const g = greepRingen[lid];
        const o = k.op[lid];
        const vast = o && k.toestand === 'klimt' && k.zet?.lid !== lid && k.schudt !== lid && !(k.los[lid] > 0);
        g.visible = !!vast;
        if (vast) {
          wereld(o.u, o.v, 0.02, g.position);
          g.lookAt(tmp.copy(g.position).add(N));
          kleurVoor(klem(k.hand[lid].verhouding / 1.6, 0, 1), g.material.color);
        }
      }

      // --- Het touw: tijger → anker → gordel ---
      const sc = GEZEL.schaal;
      const tr = zekeraar.houder.rotation.y;
      bek.set(zt.pos[0] + Math.sin(tr) * 0.98 * sc, zt.pos[1] + 0.72 * sc, zt.pos[2] + Math.cos(tr) * 0.98 * sc);
      const [au, av] = rots.anker(k.route);
      wereld(au, av, 0.08, anker);
      tmp.set(0, 0.25, 0.12);
      lijf.localToWorld(tmp);
      zetTussen(touwA, bek, anker);
      zetTussen(touwB, anker, tmp);
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
    /** Hoofdhoogte van de witte tijger (voor hartjes en proesten). */
    tijgerKop(uit = new THREE.Vector3()) {
      return uit.set(zt.pos[0], zt.pos[1] + 1.1 * GEZEL.schaal, zt.pos[2]);
    },
  };
}
