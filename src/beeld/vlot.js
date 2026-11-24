// Het beeld van het vlot (stap 10): negen bamboestammen op drie dwarslatten, vastgebonden met lianen.
// Bij het bouwen vallen de stammen er één voor één in. Daarbij: de dubbele peddel van de avonturier,
// het zwemvestje van de pony, en de Sumatraanse tijger die zwemt (rug net onder water, kop erboven).
import * as THREE from 'three';
import { TIJGERVORM, TIJGERS } from '../data/dieren.js';
import { maakTijger } from './maak/tijger.js';
import { maakDierAnimatie } from './dierAnimatie.js';
import { aanBot } from './maak/viervoeter.js';

const klem = THREE.MathUtils.clamp;

/**
 * @param {typeof import('../data/rivier.js').VLOT} V
 * @param {{ schaduw: boolean, detail: number }} K
 */
export function maakVlotbeeld(V, K) {
  const groep = new THREE.Group();   // op het water, draait mee met het vlot
  const kantel = new THREE.Group();  // schommelen en dobberen
  groep.add(kantel);
  const bamboe = [new THREE.MeshLambertMaterial({ color: 0xcfe07a }), new THREE.MeshLambertMaterial({ color: 0xb8d465 })];
  const knoopMat = new THREE.MeshLambertMaterial({ color: 0x93b54c });
  const latMat = new THREE.MeshLambertMaterial({ color: 0xa8703f });
  const liaan = new THREE.MeshLambertMaterial({ color: 0x47a33f });
  const r = 0.115;
  const stamGeo = new THREE.CylinderGeometry(r, r, V.lengte, K.detail ? 12 : 8);
  stamGeo.rotateX(Math.PI / 2);
  const knoopGeo = new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.05, K.detail ? 12 : 8);
  knoopGeo.rotateX(Math.PI / 2);
  const dopGeo = new THREE.CircleGeometry(r * 0.85, 10);
  const dopMat = new THREE.MeshLambertMaterial({ color: 0xf6e6b0 });
  /** @type {{ obj: THREE.Object3D, y: number, wacht: number }[]} */
  const delen = [];
  const voeg = (obj, y, wacht) => {
    kantel.add(obj);
    obj.position.y = y;
    delen.push({ obj, y, wacht });
  };
  // Drie dwarslatten eronder.
  for (const z of [-V.lengte * 0.36, 0, V.lengte * 0.36]) {
    const lat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, V.breedte + 0.15, 8).rotateZ(Math.PI / 2), latMat);
    lat.position.z = z;
    voeg(lat, -0.02, delen.length * 0.08);
  }
  // Negen stammen, net niet allemaal even lang (zo zie je dat het met de hand gemaakt is).
  const aantal = 9;
  for (let i = 0; i < aantal; i++) {
    const x = (i / (aantal - 1) - 0.5) * (V.breedte - 2 * r);
    const g = new THREE.Group();
    const verschil = ((i * 7) % 5) * 0.04 - 0.08;
    const st = new THREE.Mesh(stamGeo, bamboe[i % 2]);
    g.add(st);
    for (const kz of [-1.05, -0.35, 0.35, 1.05]) {
      const kn = new THREE.Mesh(knoopGeo, knoopMat);
      kn.position.z = kz + verschil * 0.5;
      g.add(kn);
    }
    for (const kant of [-1, 1]) {
      const dop = new THREE.Mesh(dopGeo, dopMat);
      dop.position.z = kant * V.lengte * 0.5;
      dop.rotation.y = kant > 0 ? 0 : Math.PI;
      g.add(dop);
    }
    g.position.x = x;
    g.position.z = verschil;
    g.traverse((o) => (o.castShadow = K.schaduw));
    voeg(g, 0.09, 0.25 + i * 0.12);
  }
  // Lianen rond de stammen, boven op de latten.
  for (const z of [-V.lengte * 0.36, V.lengte * 0.36]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(V.breedte + 0.04, 0.035, 0.08), liaan);
    band.position.z = z;
    voeg(band, 0.2, 1.4);
    // Een blaadje op de knoop.
    const blad = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10).scale(1, 1.7, 1), new THREE.MeshLambertMaterial({ color: 0x6fd35e, side: THREE.DoubleSide }));
    blad.rotation.set(-1.2, 0.5, 0);
    blad.position.set(V.breedte * 0.5 - 0.05, 0, z);
    voeg(blad, 0.24, 1.45);
  }
  groep.visible = false;

  // --- De dubbele peddel: een steel met twee blaadjes als peddelblad ---
  const peddel = new THREE.Group();
  const steel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.45, 8).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf2d7a8 }));
  peddel.add(steel);
  const bladMat = new THREE.MeshLambertMaterial({ color: 0x5fd0b8, side: THREE.DoubleSide });
  const bladGeo = new THREE.CircleGeometry(0.13, 14);
  bladGeo.scale(1.7, 1, 1);
  for (const kant of [-1, 1]) {
    const b = new THREE.Mesh(bladGeo, bladMat);
    b.position.x = kant * 0.82;
    b.rotation.y = Math.PI / 2;
    b.rotation.x = 0;
    peddel.add(b);
    const nerf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), new THREE.MeshLambertMaterial({ color: 0x2f9c88 }));
    nerf.position.x = kant * 0.82;
    peddel.add(nerf);
  }
  // Roze handvatjes.
  for (const kant of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xff8cc6 }));
    h.position.x = kant * 0.2;
    peddel.add(h);
  }
  peddel.visible = false;

  let bouwT = -1;
  let fase = 0;
  let vorigeKant = 0;
  const blad = new THREE.Vector3();

  return {
    groep,
    kantel,
    peddel,
    /** Het vlot wordt gebouwd: de stammen vallen er één voor één in. */
    bouw() {
      bouwT = 0;
      groep.visible = true;
      for (const d of delen) d.obj.visible = false;
    },
    /**
     * @param {any} v het vlot uit de simulatie
     * @param {number} overgang
     * @param {number} dt
     * @param {number} tijd
     * @param {(t:number) => void} [opBouwstuk] elke keer dat er een stuk op zijn plaats valt
     */
    werkBij(v, overgang, dt, tijd, opBouwstuk) {
      if (!v.gebouwd && bouwT < 0) {
        groep.visible = false;
        return;
      }
      groep.visible = true;
      groep.position.set(
        v.vorigePos[0] + (v.pos[0] - v.vorigePos[0]) * overgang,
        v.vorigePos[1] + (v.pos[1] - v.vorigePos[1]) * overgang,
        v.vorigePos[2] + (v.pos[2] - v.vorigePos[2]) * overgang
      );
      let dr = v.richting - v.vorigeRichting;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      groep.rotation.y = v.vorigeRichting + dr * overgang;
      // Dobberen op de golfjes, en schommelen na een botsing of de sprong.
      const sch = v.schommel;
      kantel.position.y = Math.sin(tijd * 2.1) * 0.025 + Math.sin(tijd * 3.3 + 1) * 0.012 * (v.plek === 'boven' ? 0.5 : 1);
      kantel.rotation.z = Math.sin(tijd * 1.7) * 0.025 + Math.sin(tijd * 9) * 0.12 * sch;
      kantel.rotation.x = Math.sin(tijd * 1.3 + 0.5) * 0.02 + Math.sin(tijd * 7 + 1) * 0.08 * sch + (v.lucht ? klem(-v.vy * 0.06, -0.25, 0.25) : 0);
      if (bouwT >= 0) {
        bouwT += dt;
        for (const d of delen) {
          const f = (bouwT - d.wacht) / 0.32;
          d.obj.visible = f > 0;
          if (f <= 0) continue;
          // Vallen en even nawippen.
          const g = f < 1 ? 1 - f * f : Math.max(0, Math.sin((f - 1) * 7) * 0.12 * Math.exp(-(f - 1) * 4));
          d.obj.position.y = d.y + g * 2.2;
          if (f >= 1 && !d.geland) {
            d.geland = true;
            opBouwstuk?.(d.wacht);
          }
        }
        if (bouwT > 2.4) {
          bouwT = -1;
          for (const d of delen) {
            d.obj.position.y = d.y;
            d.obj.visible = true;
          }
        }
      }
    },
    /** Hoe hoog het vlot nu dobbert (om de passagiers mee te laten dobberen). */
    get dobber() {
      return kantel.position.y;
    },
    /**
     * De peddel in de handen van de avonturier: een slag links, een slag rechts.
     * @param {THREE.Object3D} figuur @param {boolean} vaart zit ze op het vlot
     * @param {number} kracht 0 = drijven (rustig af en toe een slagje), 1 = hard peddelen
     * @param {number} stuur -1..1: aan welke kant er vaker gepeddeld wordt
     * @param {(x:number, y:number, z:number) => void} opSlag het blad gaat het water in
     * @returns {number} de slagfase (voor de armen)
     */
    peddelBij(figuur, vaart, dt, kracht, stuur, opSlag) {
      if (peddel.parent !== figuur) figuur.add(peddel);
      peddel.visible = vaart;
      if (!vaart) return 0;
      fase += dt * (1.6 + kracht * 3.2);
      // Stuur je naar rechts, dan peddel je vooral links (zoals in een echte kajak).
      const golf = Math.sin(fase) - stuur * 0.6;
      const k = klem(golf, -1, 1);
      peddel.position.set(0, 0.4 + Math.abs(k) * 0.02, 0.36);
      peddel.rotation.set(0, Math.sin(fase) * 0.35, k * 0.5);
      const kant = k > 0.75 ? 1 : k < -0.75 ? -1 : 0;
      if (kant && kant !== vorigeKant) {
        // Het blad aan de lage kant raakt het water.
        blad.set(-kant * 0.82, 0, 0);
        peddel.localToWorld(blad);
        opSlag(blad.x, blad.y, blad.z);
      }
      if (kant) vorigeKant = kant;
      return k;
    },
  };
}

/**
 * Een zwemvestje voor de pony: een oranje band rond haar borst met witte reflecterende strepen,
 * een kraagje rond de hals en een roze gespje bovenop. Hangt aan het lijf van de pony.
 */
export function maakZwemvest(ponyVorm) {
  const vest = new THREE.Group();
  const s = ponyVorm.rugY / 0.64;
  const D = 0.29 * s;
  const oranje = new THREE.MeshLambertMaterial({ color: 0xff8a3d, emissive: 0x401800 });
  const wit = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x303030 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(D * 1.13, D * 1.1, 0.4 * s, 22, 1, true).rotateX(Math.PI / 2), oranje);
  band.material.side = THREE.DoubleSide;
  band.position.set(0, 0.652 * s, 0.17 * s);
  vest.add(band);
  for (const z of [0.07, 0.27]) {
    const streep = new THREE.Mesh(new THREE.TorusGeometry(D * 1.13, 0.018 * s, 6, 26), wit);
    streep.position.set(0, 0.652 * s, z * s);
    vest.add(streep);
  }
  const kraag = new THREE.Mesh(new THREE.TorusGeometry(0.2 * s, 0.06 * s, 8, 20), oranje);
  kraag.position.set(0, 0.86 * s, 0.37 * s);
  kraag.rotation.x = Math.PI / 2 - 0.75;
  vest.add(kraag);
  const gesp = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.04 * s, 0.09 * s), new THREE.MeshLambertMaterial({ color: 0xff5fa2 }));
  gesp.position.set(0, 0.652 * s + D * 1.12, 0.17 * s);
  vest.add(gesp);
  aanBot(ponyVorm.bot.lijf, new THREE.Vector3(0, ponyVorm.rugY, 0), vest);
  vest.visible = false;
  return vest;
}

/**
 * De Sumatraanse tijger in het water: de echte tijger met een eigen vacht, laag in het water.
 * @param {THREE.Scene} scene
 * @param {typeof import('../data/rivier.js').ZWEMTIJGER} Z
 */
export function maakZwemtijgerbeeld(scene, Z, K, laag) {
  const dier = maakTijger({ ...TIJGERVORM, wangkraag: 1.5 }, TIJGERS[Z.soort], 3, K.detail ? {} : laag);
  const houder = new THREE.Group();
  houder.scale.setScalar(Z.schaal);
  houder.add(dier.groep);
  scene.add(houder);
  const anim = maakDierAnimatie(dier, 11);
  const pos = new THREE.Vector3();
  const kijk = new THREE.Vector3();
  let duik = 0; // na een sprong: even helemaal onder
  let sprong = 0;
  return {
    houder,
    anim,
    /** Hij springt over de sprong (in de lucht: poten ingetrokken). */
    duik() {
      duik = 1;
    },
    werkBij(t, overgang, dt, camera) {
      pos.set(
        t.vorigePos[0] + (t.pos[0] - t.vorigePos[0]) * overgang,
        t.vorigePos[1] + (t.pos[1] - t.vorigePos[1]) * overgang,
        t.vorigePos[2] + (t.pos[2] - t.vorigePos[2]) * overgang
      );
      let dr = t.richting - t.vorigeRichting;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      houder.rotation.y = t.vorigeRichting + dr * overgang;
      sprong += ((t.lucht ? 1 : 0) - sprong) * (1 - Math.exp(-10 * dt));
      duik = Math.max(0, duik - dt * 1.4);
      // Zwemmen: de rug net onder water, een beetje deinen op de slag.
      const zak = dier.rugY * Z.schaal * Z.diepte * (1 - sprong) + Math.sin(duik * Math.PI) * 0.35;
      houder.position.set(pos.x, pos.y - zak + Math.sin(performance.now() / 1000 * 3.4) * 0.03 * (1 - sprong), pos.z);
      if (t.kijk) kijk.set(t.kijk[0], t.kijk[1], t.kijk[2]);
      anim.werkBij(dt, t.lucht ? 'stil' : 'draf', camera, {
        snelheid: t.lucht ? 0 : klem(t.snelheid, 0.6, 3.5) / Z.schaal,
        lucht: t.lucht,
        vy: t.vy,
        kijkNaar: t.kijk ? kijk : null,
        // De kop hoog boven het water, oortjes naar achter, en heel af en toe een geeuw.
        gezicht: { kopOp: 0.55 * (1 - sprong), oorPlat: 0.25 },
      });
    },
  };
}
