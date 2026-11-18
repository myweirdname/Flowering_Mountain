// De pony, volledig uit code (TP 5.7): korte pootjes, een rond lijf, een groot hoofd met een korte
// snoet, en dikke pluizige manen, kuif en staart uit zachte lobben. Uitdrukkelijk een pony, geen paard:
// het hoofd is groot tegenover het lijf, de nek kort en dik, de poten kort en stevig.
import * as THREE from 'three';
import { maakSkelet, dierInfo, aanBot, kap, vast, POTEN } from './viervoeter.js';
import { maakDierOog, opEllips, Gezicht } from './lichaam.js';
import { maakVachtMateriaal } from '../shaders/vacht.js';

const klem = THREE.MathUtils.clamp;
const glad = THREE.MathUtils.smoothstep;

/** @param {typeof import('../../data/dieren.js').PONY} P */
export function maakPony(P) {
  const s = P.schofthoogte / 0.95;
  const V = (x, y, z) => new THREE.Vector3(x * s, y * s, z * s);
  const kl = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), klem(t, 0, 1));

  const m = {
    rugY: 0.64 * s,
    rompVoor: 0.48 * s,
    rompAchter: -0.5 * s,
    voorZ: 0.27 * s,
    achterZ: -0.29 * s,
    pootX: 0.13 * s,
    heupY: 0.56 * s,
    knieY: 0.31 * s,
    enkelY: 0.095 * s,
    voetVoor: 0.02 * s,
    nek: [V(0, 0.8, 0.32), V(0, 1.04, 0.48)],
    hoofd: V(0, 1.1, 0.52),
    hoofdEind: V(0, 1.02, 0.84),
    oor: [V(0.095, 1.29, 0.55), V(0.13, 1.44, 0.53)],
    staart: [V(0, 0.8, -0.47), V(0, 0.78, -0.56), V(0, 0.66, -0.64), V(0, 0.5, -0.675), V(0, 0.34, -0.67), V(0, 0.2, -0.655)],
  };
  const L = maakSkelet(m);
  const D = P.rompDikte * s;
  const H = P.hoofdGrootte * s;

  // --- Romp: een dikke, ronde ton ---
  L.lob(
    [V(0, 0.665, -0.52), V(0, 0.64, -0.26), V(0, 0.635, 0.04), V(0, 0.66, 0.3), V(0, 0.7, 0.5)],
    (t) => {
      const f = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.6)), 1 / 2.6);
      const r = D * (0.95 + 0.08 * t) * f;
      return [r, r * 1.02];
    },
    {
      botten: ['achter', 'lijf', 'voor'],
      ringen: 26,
      zijden: 22,
      kleur: (p, n, i) => kl(P.vachtKleur, P.buikKleur, glad(i.v, 0.55, 0.85)),
    }
  );

  // --- Korte, dikke nek ---
  L.lob(
    [V(0, 0.64, 0.2), V(0, 0.84, 0.36), V(0, 1.01, 0.46), V(0, 1.14, 0.54)],
    (t) => {
      const k = kap(t, 0.12, 0.2);
      return [(0.2 - 0.065 * t) * s * k, (0.21 - 0.05 * t) * s * k];
    },
    {
      botten: ['voor', 'nek', 'hoofd'],
      ringen: 14,
      zijden: 18,
      kleur: (p, n, i) => kl(P.vachtKleur, P.buikKleur, glad(i.v, 0.6, 0.9)),
    }
  );

  // Volle borst: vult de plooi tussen nek, schouders en romp.
  L.bol(V(0, 0.63, 0.36), [0.2 * s, 0.22 * s, 0.17 * s], {
    botten: ['voor', 'nek'],
    scherpte: 3,
    breed: 18,
    hoog: 12,
    kleur: (p, n) => kl(P.vachtKleur, P.buikKleur, glad(-n.y, 0.3, 0.9)),
  });

  // --- Groot hoofd met een korte snoet ---
  const schedel = V(0, 1.135, 0.585);
  const schedelR = /** @type {[number, number, number]} */ ([H * 0.98, H * 0.93, H * 0.95]);
  const snoet = V(0, 1.03, 0.6 + P.snoetLengte * 1.0);
  const snoetR = /** @type {[number, number, number]} */ ([0.135 * s, 0.112 * s, P.snoetLengte * 0.95 * s]);
  // De witte bles: een smalle streep van het voorhoofd tot op de snoet.
  const bles = (p, n) => {
    const breed = 0.038 * s + Math.max(0, (1.2 * s - p.y)) * 0.15;
    return n.z > 0.15 && Math.abs(p.x) < breed && p.y < 1.26 * s ? 1 - glad(Math.abs(p.x), breed * 0.7, breed) : 0;
  };
  L.bol(schedel, schedelR, {
    botten: ['hoofd'],
    breed: 26,
    hoog: 18,
    kleur: (p, n) => kl(P.vachtKleur, P.blesKleur, bles(p, n)),
  });
  L.bol(snoet, snoetR, {
    botten: ['hoofd'],
    breed: 22,
    hoog: 14,
    kleur: (p, n) => kl(P.snoetKleur, P.blesKleur, bles(p, n) * glad(p.y, 1.02 * s, 1.1 * s)),
  });

  // --- Oortjes: klein en rond, met roze binnenkant ---
  for (const kant of [1, -1]) {
    const [a, b] = m.oor;
    const basis = V((a.x / s) * kant, a.y / s - 0.03, a.z / s);
    const top = V((b.x / s) * kant, b.y / s, b.z / s);
    const midden = basis.clone().lerp(top, 0.5).add(V(0.012 * kant, 0, 0.012));
    L.lob(
      [basis, midden, top],
      (t) => {
        const k = kap(t, 0.25, 0.55);
        return [0.05 * s * k * (1 - 0.4 * t), 0.024 * s * k];
      },
      {
        botten: [kant > 0 ? 'oorL' : 'oorR'],
        op: new THREE.Vector3(0, 0, 1),
        ringen: 10,
        zijden: 12,
        kleur: (p, n, i) => (i.lokaal.y > 0.35 && Math.abs(i.lokaal.x) < 0.8 && i.t > 0.12 && i.t < 0.85 ? P.oorBinnen : P.vachtKleur),
      }
    );
  }

  // --- Poten: kort en stevig, met hoefjes en pluimpjes ---
  POTEN.forEach((poot, pi) => {
    const x = poot.kant * m.pootX / s;
    const z = (poot.voor ? m.voorZ : m.achterZ) / s;
    const sok = P.sokken[pi];
    const n = poot.naam;
    L.lob(
      [V(x, 0.7, z), V(x, 0.5, z), V(x, 0.31, z + (poot.voor ? 0.005 : -0.01)), V(x, 0.16, z), V(x, 0.08, z)],
      (t) => {
        // Dik bovenaan (dij en schouder), slanker bij de knie, iets dikker boven de hoef.
        const vorm = t < 0.55 ? 1.35 - t * 1.05 : t < 0.85 ? 0.77 - (t - 0.55) * 0.2 : 0.71 + (t - 0.85) * 0.9;
        const r = P.pootDikte * s * vorm * kap(t, 0.22, 0.1);
        return [r, r * (poot.voor ? 1.0 : 1.08)];
      },
      {
        botten: [n + '_boven', n + '_onder', n + '_voet'],
        scherpte: 6,
        ringen: 18,
        zijden: 14,
        kleur: (p) => (sok ? kl(P.vachtKleur, P.sokKleur, glad(0.27 * s - p.y, 0, 0.04 * s)) : P.vachtKleur),
      }
    );
    // Schouder of dij: rond, loopt over in het lijf.
    L.bol(V(x * 1.1, poot.voor ? 0.52 : 0.55, z + (poot.voor ? 0.02 : -0.02)), poot.voor ? [0.1 * s, 0.16 * s, 0.13 * s] : [0.115 * s, 0.18 * s, 0.15 * s], {
      botten: [poot.voor ? 'voor' : 'achter', n + '_boven'],
      scherpte: 2,
      breed: 16,
      hoog: 12,
      kleur: (p, nn) => kl(P.vachtKleur, P.buikKleur, glad(-nn.y, 0.3, 0.9) * 0.6),
    });
    L.bol(V(x, 0.052, z + 0.015), [0.074 * s, 0.054 * s, 0.084 * s], {
      botten: [n + '_voet'],
      breed: 16,
      hoog: 10,
      kleur: (p) => kl(P.hoefKleur, 0x8a6a58, glad(p.y, 0.05 * s, 0.1 * s)),
    });
    if (P.pluimen) {
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.25 + (k / 6) * 1.5); // zijkanten en achterkant
        const c = V(x + Math.sin(a) * 0.055 * poot.kant, 0.115 + vast(pi * 9 + k) * 0.02, z - Math.cos(a) * 0.055 + 0.01);
        L.bol(c, [0.034 * s, 0.04 * s, 0.034 * s], {
          botten: [n + '_onder', n + '_voet'],
          breed: 10,
          hoog: 7,
          kleur: (p, nn) => kl(sok ? P.sokKleur : P.maanKleur, P.maanSchaduw, glad(-nn.y, 0, 1) * 0.6),
        });
      }
    }
  });

  // --- Manen: dikke pluizen langs de nek, met een tweede rij die opzij valt ---
  const kam = new THREE.CatmullRomCurve3([V(0, 1.31, 0.535), V(0, 1.22, 0.47), V(0, 1.07, 0.37), V(0, 0.94, 0.26), V(0, 0.87, 0.15)]);
  const maanKleur = (k) => (p, n) => kl(P.maanKleur, P.maanSchaduw, glad(-n.y, -0.2, 0.9) * 0.8 + vast(k) * 0.15);
  for (let k = 0; k < P.manenLobben; k++) {
    const t = k / (P.manenLobben - 1);
    const c = kam.getPointAt(t);
    const g = P.maanGrootte * s * (1.05 - 0.3 * Math.abs(t - 0.35));
    const zij = (k % 2 ? 1 : -1) * 0.025 * s;
    L.bol(c.clone().add(V(zij / s, 0.01, -0.02)), [g * 0.9, g, g * 1.05], {
      botten: ['hoofd', 'nek', 'voor'],
      scherpte: 3,
      breed: 14,
      hoog: 10,
      kleur: maanKleur(k),
    });
    // Tweede rij: valt naar de rechterkant van de nek.
    if (k > 0 && k < P.manenLobben - 1) {
      L.bol(c.clone().add(V(-0.075, -0.06, -0.03)), [g * 0.75, g * 0.95, g * 0.85], {
        botten: ['hoofd', 'nek', 'voor'],
        scherpte: 3,
        breed: 12,
        hoog: 9,
        kleur: maanKleur(k + 50),
      });
    }
  }
  // Kuif: de pluizige "pony" over het voorhoofd, net boven de ogen.
  for (let k = 0; k < P.kuifLobben; k++) {
    const t = k / Math.max(1, P.kuifLobben - 1);
    const c = V((k % 2 ? 1 : -1) * 0.03 * (1 - t), 1.335 - t * 0.1, 0.6 + t * 0.1);
    const g = P.maanGrootte * s * (0.9 - t * 0.25);
    L.bol(c, [g, g * 0.9, g], { botten: ['hoofd'], breed: 14, hoog: 10, kleur: maanKleur(k + 100) });
  }

  // --- Staart: een dikke pluim van lobben ---
  const staartLijn = new THREE.CatmullRomCurve3(m.staart);
  const staartBotten = m.staart.slice(0, -1).map((_, i) => 'staart' + i);
  for (let k = 0; k < P.staartLobben; k++) {
    const t = k / (P.staartLobben - 1);
    const c = staartLijn.getPointAt(t);
    const g = P.staartGrootte * s * (0.7 + 0.55 * Math.sin(Math.PI * Math.pow(t, 0.75)));
    c.add(V((vast(k + 200) - 0.5) * 0.06, 0, (vast(k + 300) - 0.5) * 0.04 - 0.01));
    L.bol(c, [g, g * 1.15, g], { botten: staartBotten, scherpte: 4, breed: 14, hoog: 10, kleur: maanKleur(k + 150) });
  }

  const mesh = L.maak(maakVachtMateriaal({ rand: 0.32, gloed: 0.14 }));
  const { bot } = mesh;
  const info = dierInfo(L, bot, m);

  // --- Gezicht: grote ogen, neusgaten, een lachje en blosjes ---
  const ogen = [];
  const oogR = P.oogGrootte * s;
  for (const kant of [1, -1]) {
    const oog = maakDierOog({ straal: oogR, kromming: H * 0.95, iris: P.oogKleur, donker: P.oogDonker, kant, wimpers: true });
    opEllips(oog.groep, schedel, schedelR, new THREE.Vector3(kant * 0.6, 0.04, 0.8), 0.004);
    ogen.push(oog.knipper);
    aanBot(bot.hoofd, L.botPos('hoofd'), oog.groep);
  }
  const gz = new Gezicht();
  const plek = new THREE.Object3D();
  const ovaal = (rx, ry) => new THREE.CircleGeometry(1, 16).scale(rx, ry, 1);
  for (const kant of [1, -1]) {
    opEllips(plek, snoet, snoetR, new THREE.Vector3(kant * 0.42, 0.1, 0.9), 0.002, kant * 0.5);
    gz.voegToe(ovaal(0.018 * s, 0.028 * s), P.neusgatKleur, plek);
    opEllips(plek, schedel, schedelR, new THREE.Vector3(kant * 0.8, -0.36, 0.5), 0.003);
    gz.voegToe(ovaal(0.045 * s, 0.026 * s), new THREE.Color(P.vachtKleur).lerp(new THREE.Color(P.wangKleur), 0.6).getHex(), plek);
  }
  opEllips(plek, snoet, snoetR, new THREE.Vector3(0, -0.42, 0.9), 0.002);
  gz.voegToe(new THREE.TorusGeometry(0.035 * s, 0.006 * s, 4, 14, Math.PI).rotateZ(Math.PI), P.mondKleur, plek);
  aanBot(bot.hoofd, L.botPos('hoofd'), gz.maak());

  const groep = new THREE.Group();
  groep.add(mesh.mesh);
  return { soort: 'pony', groep, mesh: mesh.mesh, bot, ogen, ...info, breedte: D * 1.3, lengte: 1.25 * s };
}
