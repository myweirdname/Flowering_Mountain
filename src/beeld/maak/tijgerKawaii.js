// De KNUFFELTIJGER (kawaii), de eerste versie uit de dierenproef (stap 6). Bewaard op vraag van de
// gebruiker: de kinderen wilden echtere tijgers, maar dit model kan nog dienen (welpjes, knuffels in
// het kamp, pictogrammen). Het echte tijgermodel staat in tijger.js.
// Mollig en vriendelijk, met een groot rond hoofd, grote glanzende ogen, witte snoetwangetjes,
// ronde oortjes met een witte vlek achteraan, grote zachte poten en een lange gestreepte staart.
// De strepen komen uit de vachtshader; elke soort heeft een eigen palet (data/dieren.js, KAWAII_TIJGERS).
import * as THREE from 'three';
import { maakSkelet, dierInfo, aanBot, kap, POTEN } from './viervoeter.js';
import { maakDierOog, opEllips, Gezicht } from './lichaam.js';
import { maakVachtMateriaal } from '../shaders/vacht.js';

const klem = THREE.MathUtils.clamp;
const glad = THREE.MathUtils.smoothstep;

/**
 * @param {typeof import('../../data/dieren.js').KAWAII_TIJGERVORM} F gedeelde vorm
 * @param {typeof import('../../data/dieren.js').KAWAII_TIJGERS.bengaals} T soort (kleuren en strepen)
 * @param {number} [zaadje] eigen patroon voor deze ene tijger
 */
export function maakKawaiiTijger(F, T, zaadje) {
  const s = F.schofthoogte / 0.82;
  const V = (x, y, z) => new THREE.Vector3(x * s, y * s, z * s);
  const kl = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), klem(t, 0, 1));
  const lengte = F.rompLengte / 1.05;
  const Z = (z) => z * lengte; // romp langer of korter maken

  const m = {
    rugY: 0.55 * s,
    rompVoor: Z(0.5) * s,
    rompAchter: Z(-0.58) * s,
    voorZ: Z(0.32) * s,
    achterZ: Z(-0.36) * s,
    pootX: 0.13 * s,
    heupY: 0.5 * s,
    knieY: 0.28 * s,
    enkelY: 0.085 * s,
    voetVoor: 0.04 * s,
    nek: [V(0, 0.63, Z(0.4)), V(0, 0.78, Z(0.5) + 0.08)],
    hoofd: V(0, 0.83, Z(0.5) + 0.12),
    hoofdEind: V(0, 0.8, Z(0.5) + 0.42),
    oor: [V(0.15, 1.04, Z(0.5) + 0.16), V(0.19, 1.12, Z(0.5) + 0.15)],
    staart: [],
  };
  // Een lange staart die achteraan omlaag hangt en aan het eind vrolijk omhoog krult.
  const sL = F.staartLengte / 0.95;
  const st0 = Z(-0.56);
  m.staart = [
    V(0, 0.64, st0),
    V(0, 0.6, st0 - 0.15 * sL),
    V(0, 0.46, st0 - 0.3 * sL),
    V(0, 0.32, st0 - 0.45 * sL),
    V(0, 0.3, st0 - 0.62 * sL),
    V(0, 0.4, st0 - 0.78 * sL),
    V(0, 0.55, st0 - 0.86 * sL),
  ];
  const L = maakSkelet(m);
  const D = F.rompDikte * s;
  const H = F.hoofdGrootte * s;

  // Kleur van de vacht volgens de plek rond het lijf: diep op de rug, wit op de buik.
  const vacht = (v) => kl(kl(T.rugKleur, T.vachtKleur, glad(v, 0.05, 0.45)), T.buikKleur, glad(v, 0.56, 0.76));

  // --- Romp ---
  L.lob(
    [V(0, 0.575, Z(-0.6)), V(0, 0.55, Z(-0.3)), V(0, 0.54, Z(0.02)), V(0, 0.56, Z(0.3)), V(0, 0.6, Z(0.52))],
    (t) => {
      const f = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.8)), 1 / 2.8);
      const r = D * (0.94 + 0.12 * t) * f;
      return [r, r * 1.03];
    },
    {
      botten: ['achter', 'lijf', 'voor'],
      ringen: 30,
      zijden: 22,
      kleur: (p, n, i) => vacht(i.v),
      // Strepen rond het lijf (u langs de rug), die naar de buik toe ophouden.
      streep: (p, n, i) => [p.z / s + 0.4, i.v, 1 - glad(i.v, 0.5, 0.66)],
    }
  );

  // --- Nek ---
  L.lob(
    [V(0, 0.58, Z(0.32)), V(0, 0.68, Z(0.44)), V(0, 0.8, Z(0.5) + 0.1), V(0, 0.86, Z(0.5) + 0.16)],
    (t) => {
      const k = kap(t, 0.12, 0.2);
      return [0.175 * s * k, 0.19 * s * k];
    },
    {
      botten: ['voor', 'nek', 'hoofd'],
      ringen: 12,
      zijden: 18,
      kleur: (p, n, i) => vacht(i.v),
      streep: (p, n, i) => [p.z / s + 0.4 + (p.y / s - 0.6) * 0.6, i.v, 1 - glad(i.v, 0.45, 0.6)],
    }
  );

  // --- Het grote ronde hoofd ---
  const kop = V(0, 0.86, Z(0.5) + 0.2);
  const kopR = /** @type {[number, number, number]} */ ([H * 1.1, H * 0.95, H * 0.95]);
  const oogRicht = (kant) => new THREE.Vector3(kant * 0.43, 0.13, 0.89);
  // Plaats van elk oog op het hoofd (voor de witte vlekjes eromheen).
  const oogPlek = [1, -1].map((kant) => {
    const d = oogRicht(kant).normalize();
    const k = 1 / Math.sqrt((d.x / kopR[0]) ** 2 + (d.y / kopR[1]) ** 2 + (d.z / kopR[2]) ** 2);
    return kop.clone().addScaledVector(d, k);
  });
  const oogR = F.oogGrootte * s;
  L.bol(kop, kopR, {
    botten: ['hoofd'],
    breed: 30,
    hoog: 20,
    kleur: (p, n) => {
      let c = kl(T.rugKleur, T.vachtKleur, glad(-n.y, -0.9, 0.2));
      // Witte wangen en kin onderaan het gezicht.
      const wang = glad(-n.y, -0.05, 0.3) * glad(n.z, -0.3, 0.2);
      c = kl(c.getHex(), T.buikKleur, wang);
      // Witte vlekjes rond en boven de ogen: maakt de blik zacht en vriendelijk.
      for (const o of oogPlek) {
        const d = p.distanceTo(o);
        const wenk = p.clone().sub(o);
        const boven = p.distanceTo(o.clone().add(V(o.x > 0 ? 0.03 : -0.03, 0.085, -0.02)));
        c = kl(c.getHex(), T.buikKleur, Math.max(1 - glad(d, oogR * 1.15, oogR * 1.45), (1 - glad(boven, 0.03 * s, 0.05 * s)) * (wenk.y > 0 ? 1 : 0)));
      }
      return c;
    },
    streep: (p, n) => {
      const ax = Math.abs(n.x);
      // Voorhoofd: korte streepjes van boven naar beneden.
      const voorhoofd = glad(n.y, 0.42, 0.58) * glad(n.z, -0.6, -0.2);
      // Wangen opzij: streepjes die naar achter lopen.
      const wang = glad(ax, 0.62, 0.8) * (1 - glad(n.y, 0.12, 0.28)) * glad(-n.y, -0.1, 0.0 - 0.0001 + 0.1) * glad(n.z, -0.5, -0.1);
      // Weg van de ogen.
      let ogenVrij = 1;
      for (const o of oogPlek) ogenVrij *= glad(p.distanceTo(o), oogR * 1.5, oogR * 2.0);
      if (voorhoofd >= wang) return [p.x / s * 1.25 + 0.04, klem((0.95 - n.y) * 1.6, 0, 1), voorhoofd * ogenVrij];
      return [p.y / s * 1.1 + (n.x > 0 ? 0.0 : 0.17), klem(0.15 + (n.z + 0.1) * 0.9, 0, 1), wang * ogenVrij * 0.95];
    },
  });

  // Snoetwangetjes: twee bolle witte kussentjes met een kinnetje eronder.
  const kussen = [];
  for (const kant of [1, -1]) {
    const c = V(kant * 0.072, 0.775, Z(0.5) + 0.405);
    const r = /** @type {[number, number, number]} */ ([0.088 * s, 0.07 * s, 0.07 * s]);
    kussen.push({ c, r, kant });
    L.bol(c, r, { botten: ['hoofd'], breed: 16, hoog: 12, kleur: T.buikKleur });
  }
  L.bol(V(0, 0.715, Z(0.5) + 0.37), [0.065 * s, 0.045 * s, 0.055 * s], { botten: ['hoofd'], breed: 14, hoog: 10, kleur: T.buikKleur });

  // Wangpluimen: zachte, bolle bakkebaarden opzij en onder de wangen.
  for (const kant of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const c = V(kant * (0.2 + k * 0.035), 0.77 - k * 0.04, Z(0.5) + 0.2 - k * 0.04);
      const g = 0.075 * s * (1 - k * 0.18);
      L.bol(c, [g, g * 0.85, g * 0.9], {
        botten: ['hoofd'],
        draai: new THREE.Euler(0, 0, kant * 0.5),
        breed: 14,
        hoog: 10,
        kleur: (p, n) => kl(T.vachtKleur, T.buikKleur, glad(-n.y, -0.5, 0.3) * 0.7 + glad(n.x * kant, 0.6, 1) * 0.3),
      });
    }
  }

  // --- Ronde oortjes: licht van voren, donker met een witte vlek van achteren ---
  for (const kant of [1, -1]) {
    const [a] = m.oor;
    const c = V((a.x / s) * kant, a.y / s, a.z / s);
    L.bol(c, [0.085 * s, 0.08 * s, 0.035 * s], {
      botten: [kant > 0 ? 'oorL' : 'oorR'],
      draai: new THREE.Euler(-0.15, kant * 0.35, kant * -0.35),
      breed: 16,
      hoog: 12,
      kleur: (p, n, i) => {
        const e = i.lokaal;
        const rand = Math.hypot(e.x, e.y);
        if (e.z > 0) return rand < 0.72 && e.y < 0.6 ? T.oorBinnen : T.vachtKleur;
        // Achterkant: zwart, met de typische witte vlek van een tijger.
        return Math.hypot(e.x * 1.1, e.y + 0.1) < 0.42 ? 0xffffff : T.streepKleur;
      },
    });
  }

  // --- Poten: dik en zacht, met grote ronde voetjes ---
  POTEN.forEach((poot) => {
    const x = (poot.kant * m.pootX) / s;
    const z = (poot.voor ? m.voorZ : m.achterZ) / s;
    const n = poot.naam;
    L.lob(
      [V(x, 0.62, z), V(x, 0.45, z), V(x, 0.28, z + (poot.voor ? 0.005 : -0.015)), V(x, 0.15, z), V(x, 0.07, z + 0.01)],
      (t) => {
        const vorm = (poot.voor ? 1.45 : 1.6) - t * (poot.voor ? 0.65 : 0.85);
        const r = F.pootDikte * s * vorm * kap(t, 0.22, 0.1);
        return [r, r * 1.06];
      },
      {
        botten: [n + '_boven', n + '_onder', n + '_voet'],
        scherpte: 6,
        ringen: 18,
        zijden: 14,
        kleur: (p, nn) => kl(T.vachtKleur, T.buikKleur, Math.max(glad(-nn.x * poot.kant, 0.2, 0.8) * 0.7, glad(0.16 * s - p.y, 0, 0.06 * s))),
        streep: (p, nn) => [p.y / s * 1.15 + (poot.voor ? 0 : 0.3), klem(0.1 + (1 - nn.x * poot.kant) * 0.35, 0, 1), glad(p.y, 0.15 * s, 0.22 * s) * (1 - glad(p.y, 0.48 * s, 0.56 * s))],
      }
    );
    // Schouder of dij: een ronde bol die in het lijf overloopt en half met de poot meebeweegt.
    L.bol(V(x * 1.12, poot.voor ? 0.47 : 0.5, z + (poot.voor ? 0.02 : -0.02)), poot.voor ? [0.1 * s, 0.17 * s, 0.13 * s] : [0.115 * s, 0.19 * s, 0.16 * s], {
      botten: [poot.voor ? 'voor' : 'achter', n + '_boven'],
      scherpte: 2,
      breed: 16,
      hoog: 12,
      kleur: (p, nn) => vacht(klem((1 - nn.y) / 2 + glad(-nn.x * poot.kant, 0.3, 0.9) * 0.4, 0, 1)),
      streep: (p, nn) => [p.z / s + 0.4, klem((1 - nn.y) / 2, 0, 1), 1 - glad((1 - nn.y) / 2, 0.5, 0.66)],
    });
    // Groot rond voetje met drie teentjes vooraan.
    const P = F.pootGrootte * s;
    L.bol(V(x, 0.058, z + 0.035), [P * 0.92, 0.062 * s, P * 1.1], {
      botten: [n + '_voet'],
      breed: 18,
      hoog: 10,
      kleur: (p, nn) => kl(T.vachtKleur, T.buikKleur, 0.55 + glad(-nn.y, 0, 0.5) * 0.45),
    });
    for (let k = -1; k <= 1; k++) {
      L.bol(V(x + k * 0.042, 0.042, z + 0.035 + P / s * 0.92 - Math.abs(k) * 0.015), [0.032 * s, 0.035 * s, 0.032 * s], {
        botten: [n + '_voet'],
        breed: 10,
        hoog: 7,
        kleur: T.buikKleur,
      });
    }
  });

  // --- Lange staart met ringen en een donker puntje ---
  const staartBotten = m.staart.slice(0, -1).map((_, i) => 'staart' + i);
  L.lob(
    m.staart,
    (t) => {
      const r = F.staartDikte * s * (1.15 - 0.3 * t) * kap(t, 0.04, 0.06);
      return [r, r];
    },
    {
      botten: staartBotten,
      scherpte: 4,
      ringen: 40,
      zijden: 12,
      kleur: (p, n, i) => (i.t > 0.88 ? T.streepKleur : kl(T.vachtKleur, T.buikKleur, glad(i.v, 0.6, 0.95) * 0.6)),
      // Ringen rond de staart: v vast, zodat ze helemaal rond lopen.
      streep: (p, n, i) => [i.t * F.staartLengte * 1.25 + 0.1, 0.12, glad(i.t, 0.08, 0.16)],
    }
  );

  const streepWaarden = { ...T.strepen, zaad: T.strepen.zaad + (zaadje ?? 0) * 7.31 };
  const gebouwd = L.maak(maakVachtMateriaal({ strepen: streepWaarden, streepKleur: T.streepKleur, rand: 0.34, gloed: 0.15 }));
  const { bot } = gebouwd;
  const info = dierInfo(L, bot, m);

  // --- Gezicht: grote ronde ogen (geen spleetjes: vriendelijk), roze neusje, lachend mondje ---
  const ogen = [];
  for (const kant of [1, -1]) {
    const oog = maakDierOog({ straal: oogR, kromming: H, iris: T.oogKleur, donker: F.oogDonker, kant, hoogte: 1.05 });
    opEllips(oog.groep, kop, kopR, oogRicht(kant), 0.004, kant * -0.12);
    ogen.push(oog.knipper);
    aanBot(bot.hoofd, L.botPos('hoofd'), oog.groep);
  }
  const gz = new Gezicht();
  const plek = new THREE.Object3D();
  // Neusje: een afgeronde driehoek, punt naar beneden, bovenop de kussentjes.
  const neus = new THREE.Shape();
  const nb = 0.045 * s;
  neus.moveTo(0, -nb * 0.55);
  neus.quadraticCurveTo(nb * 0.35, -nb * 0.3, nb * 0.75, nb * 0.25);
  neus.quadraticCurveTo(nb * 0.8, nb * 0.55, 0, nb * 0.5);
  neus.quadraticCurveTo(-nb * 0.8, nb * 0.55, -nb * 0.75, nb * 0.25);
  neus.quadraticCurveTo(-nb * 0.35, -nb * 0.3, 0, -nb * 0.55);
  plek.position.copy(V(0, 0.835, Z(0.5) + 0.468));
  plek.rotation.set(-0.5, 0, 0);
  gz.voegToe(new THREE.ShapeGeometry(neus, 8), F.neusKleur, plek);
  // Mondje: een streepje omlaag en twee boogjes (een "w"), die naar boven lachen.
  plek.position.copy(V(0, 0.79, Z(0.5) + 0.477));
  plek.rotation.set(0.15, 0, 0);
  gz.voegToe(new THREE.PlaneGeometry(0.008 * s, 0.035 * s), F.mondKleur, plek);
  for (const kant of [1, -1]) {
    const kk = kussen.find((q) => q.kant === kant);
    opEllips(plek, kk.c, kk.r, new THREE.Vector3(kant * -0.15, -0.35, 0.92), 0.002);
    gz.voegToe(new THREE.TorusGeometry(0.026 * s, 0.0045 * s, 4, 12, Math.PI).rotateZ(Math.PI), F.mondKleur, plek);
    // Snorhaarpuntjes.
    for (let k = 0; k < 3; k++) {
      opEllips(plek, kk.c, kk.r, new THREE.Vector3(kant * (0.5 + k * 0.15), 0.25 - k * 0.15 + (k === 1 ? 0.05 : 0), 0.8), 0.002);
      gz.voegToe(new THREE.CircleGeometry(0.006 * s, 8), F.mondKleur, plek);
    }
    // Lange witte snorharen.
    for (let k = 0; k < 3; k++) {
      opEllips(plek, kk.c, kk.r, new THREE.Vector3(kant * 0.95, 0.15 - k * 0.2, 0.2), 0.0);
      plek.rotateY(kant * 0.3);
      const haar = new THREE.PlaneGeometry(0.2 * s, 0.0045 * s).translate(kant * 0.1 * s, 0, 0).rotateZ(kant * (0.12 - k * 0.12));
      gz.voegToe(haar, 0xffffff, plek);
    }
    // Blosjes onder de ogen.
    opEllips(plek, kop, kopR, new THREE.Vector3(kant * 0.66, -0.2, 0.7), 0.003);
    gz.voegToe(new THREE.CircleGeometry(1, 16).scale(0.042 * s, 0.025 * s, 1), new THREE.Color(T.buikKleur).lerp(new THREE.Color(F.wangKleur), 0.55).getHex(), plek);
  }
  aanBot(bot.hoofd, L.botPos('hoofd'), gz.maak());

  const groep = new THREE.Group();
  groep.add(gebouwd.mesh);
  return { soort: 'tijger', groep, mesh: gebouwd.mesh, bot, ogen, ...info, breedte: D * 1.3, lengte: (Z(1.1) + 0.5) * s };
}
