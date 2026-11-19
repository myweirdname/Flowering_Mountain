// De echte tijger, volledig uit code (TP 5.7). Verbeterronde van de dierenproef (stap 6): de
// kinderen vonden de kawaii-wereld goed, maar wilden tijgers die er echt en gevaarlijk uitzien
// (ook al zijn ze lief). De eerste, schattige versie staat bewaard in tijgerKawaii.js.
//
// Hoe hij gemaakt is: lijf, poten, voeten, hoofd en kaak zijn vormvelden (vormveld.js): spieren
// en botten als zachte vormen die in elkaar overvloeien. Zo krijgt hij schouderbladen die rollen
// bij elke stap, een diepe borst, een smalle buik, zware dijen, een geknikte achterpoot, een
// brede schedel met wangkraag, wenkbrauwen en een snuit met snorkussens. Plooien en holtes worden
// vanzelf donkerder (oksels, onder de kin). De vachtshader tekent rafelige strepen en fijne
// haartjes. De ogen zijn amandelvormig met een amberkleurige iris (echtOog.js). De bek kan open:
// dan zie je de tong en vier grote hoektanden (geeuwen en brullen, dierAnimatie.js).
// Maten: in "schouderhoogte = 1", daarna geschaald naar meter. Het dier kijkt naar +z.
import * as THREE from 'three';
import { maakSkelet, dierInfo, aanBot, kap, vast, POTEN } from './viervoeter.js';
import { Gezicht } from './lichaam.js';
import { ellips, kegel, samen, los, zoekRand, veldNormaal } from './vormveld.js';
import { maakEchtOog } from './echtOog.js';
import { maakVachtMateriaal } from '../shaders/vacht.js';

const klem = THREE.MathUtils.clamp;
const glad = THREE.MathUtils.smoothstep;
const kanten = [1, -1];
const eu = (x, y, z) => new THREE.Euler(x, y, z);

// Vaste donkere lijnen op het voorhoofd, van voren gezien, in hoofdmaat: [x1, y1, x2, y2, dikte]
// (x gemeten vanaf het midden, voor beide kanten gespiegeld).
const VOORHOOFD = [
  [0.018, 0.935, 0.03, 0.99, 0.006], // fronslijn tussen de ogen
  [0.036, 0.966, 0.1, 0.958, 0.007], // boog boven de witte wenkbrauwvlek
  [0.05, 0.99, 0.085, 0.982, 0.006], // korte streep erboven
  [0.0, 1.005, 0.035, 1.012, 0.006], // dwarsstreep bovenaan
];

/** Afstand van punt (px, py) tot het lijnstuk a-b in 2D. */
function afstandLijn(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = klem(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

/**
 * @param {typeof import('../../data/dieren.js').TIJGERVORM} F gedeelde vorm
 * @param {typeof import('../../data/dieren.js').TIJGERS.bengaals} T soort (kleuren en strepen)
 * @param {number} [zaadje] eigen streeppatroon voor deze ene tijger
 */
export function maakTijger(F, T, zaadje = 0) {
  const s = F.schofthoogte;
  const lz = F.rompLengte;
  const bx = F.rompDikte;
  const pd = F.pootDikte;
  const pg = F.pootGrootte;
  const hg = F.hoofdGrootte;
  const wk = F.wangkraag;
  const V = (x, y, z) => new THREE.Vector3(x * s, y * s, z * s);
  const kl = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), klem(t, 0, 1));
  // Plaatsen op het lijf (breedte en lengte volgen de afsteltabel).
  const R = (x, y, z) => V(x * bx, y, z * lz);
  // Plaatsen op het hoofd: het hoofd schuift mee met de voorkant van het lijf en kan groter of kleiner.
  // Het draaipunt (0.9, 0.84) in hoofdmaat ligt in de schedel; het hoofd zit kort op de schouders.
  const hoofdVoor = (lz - 1) * 0.55;
  const KOP_Y = 0.925;
  const KOP_Z = 0.79 + hoofdVoor;
  const H = (x, y, z) => V(x * hg, KOP_Y + (y - 0.9) * hg, KOP_Z + (z - 0.84) * hg);
  // Terug van meter naar hoofdmaat (voor kleuren en strepen op het hoofd).
  const naarKop = (p) => ({ x: p.x / s / hg, y: 0.9 + (p.y / s - KOP_Y) / hg, z: 0.84 + (p.z / s - KOP_Z) / hg });
  // Vormen met maten in schouderhoogte (f: extra schaal, bv. voor het hoofd).
  const E = (c, r, draai, f = 1) => ellips(c, [r[0] * s * f, r[1] * s * f, r[2] * s * f], draai);
  const C = (a, b, ra, rb, f = 1) => kegel(a, b, ra * s * f, rb * s * f);
  const HE = (c, r, draai) => E(c, r, draai, hg);
  const HC = (a, b, ra, rb) => C(a, b, ra, rb, hg);

  // --- Skelet ---
  const voorZ = 0.37 * lz;
  const achterZ = -0.5 * lz;
  const pootX = 0.15 * bx;
  /** Gewrichten per poot: de voorpoot staat recht, de achterpoot knikt met de hiel naar achter. */
  const pootPunten = (poot) => {
    const x = poot.kant * pootX;
    if (poot.voor) return { heup: V(x, 0.72, voorZ), knie: V(x, 0.165, voorZ + 0.038), enkel: V(x, 0.068, voorZ + 0.043), teen: V(x, 0, voorZ + 0.13) };
    return { heup: V(x, 0.72, achterZ), knie: V(x, 0.3, achterZ - 0.15), enkel: V(x, 0.066, achterZ - 0.075), teen: V(x, 0, achterZ + 0.03) };
  };
  const sL = F.staartLengte;
  const st0 = -0.74 * lz;
  const m = {
    rugY: 0.8 * s,
    rompVoor: 0.55 * lz * s,
    rompAchter: st0 * s,
    voorZ: voorZ * s,
    achterZ: achterZ * s,
    pootX: pootX * s,
    poot: pootPunten,
    nek: /** @type {[THREE.Vector3, THREE.Vector3]} */ ([R(0, 0.82, 0.5), H(0, 0.88, 0.74)]),
    hoofd: H(0, 0.9, 0.8),
    hoofdEind: H(0, 0.875, 1.12),
    oor: /** @type {[THREE.Vector3, THREE.Vector3]} */ ([H(0.102, 0.995, 0.79), H(0.122, 1.055, 0.78)]),
    kaak: /** @type {[THREE.Vector3, THREE.Vector3]} */ ([H(0, 0.845, 0.86), H(0, 0.797, 1.07)]),
    // Een lange, zware staart die laag hangt en met het puntje weer wat opkrult.
    staart: [
      V(0, 0.86, st0 + 0.03),
      V(0, 0.84, st0 - 0.1 * sL),
      V(0, 0.72, st0 - 0.23 * sL),
      V(0, 0.54, st0 - 0.32 * sL),
      V(0, 0.36, st0 - 0.38 * sL),
      V(0, 0.22, st0 - 0.47 * sL),
      V(0, 0.16, st0 - 0.6 * sL),
      V(0, 0.18, st0 - 0.74 * sL),
      V(0, 0.26, st0 - 0.85 * sL),
    ],
  };
  const L = maakSkelet(m);
  // De bovenlip met snorkussens en neus: trekt op bij grommen en brullen, zodat de hoektanden bloot komen.
  L.bot('lip', 'hoofd', H(0, 0.86, 1.0), H(0, 0.86, 1.12));

  // --- Vormvelden ---
  // Romp en nek: borstkas, buik, heupen, schouderbladen, schouders, dijen, nek en keel.
  const romp = samen(
    0.075 * s,
    E(R(0, 0.735, 0.17), [0.168 * bx, 0.255, 0.37 * lz]), // borstkas: diep en smal
    E(R(0, 0.765, -0.22), [0.15 * bx, 0.2, 0.3 * lz]), // buik en flanken: hoger opgetrokken
    E(R(0, 0.795, -0.52), [0.162 * bx, 0.185, 0.25 * lz]), // kruis en heupen
    E(R(0, 0.625, 0.47), [0.135 * bx, 0.15, 0.12]), // borst (voorkant)
    ...kanten.map((k) => E(R(k * 0.095, 0.9, 0.36), [0.068 * bx, 0.12, 0.1], eu(-0.35, 0, k * 0.15))), // schouderbladen
    ...kanten.map((k) => E(R(k * 0.15, 0.67, 0.37), [0.088 * bx, 0.19, 0.13])), // schouders en bovenarmen
    ...kanten.map((k) => E(R(k * 0.12, 0.78, -0.5), [0.08 * bx, 0.17, 0.2])), // bovenkant van de dijen
    C(R(0, 0.8, 0.45), H(0, 0.87, 0.74), 0.165 * bx, 0.12 * hg), // nek
    E(R(0, 0.9, 0.58), [0.13 * bx, 0.11, 0.17]), // nekspieren
    E(R(0, 0.71, 0.62), [0.11 * bx, 0.1, 0.13]) // keel
  );
  const rompPad = [R(0, 0.8, -0.73), R(0, 0.79, -0.5), R(0, 0.77, -0.2), R(0, 0.745, 0.15), R(0, 0.765, 0.42), R(0, 0.82, 0.6), H(0, 0.87, 0.74)];

  // Voorpoot: zware bovenarm schuin naar de elleboog, gespierde onderarm, smalle pols.
  const voorpoot = (k) => {
    const x = k * pootX;
    const z = voorZ;
    const D = pd;
    return samen(
      0.045 * s,
      C(V(x * 0.85, 0.7, z + 0.01), V(x * 1.02, 0.52, z - 0.05), 0.095 * D, 0.088 * D), // bovenarm
      E(V(x, 0.5, z - 0.08), [0.064 * D, 0.072, 0.068 * D]), // elleboog
      C(V(x, 0.5, z - 0.02), V(x, 0.19, z + 0.032), 0.09 * D, 0.062 * D), // onderarm
      E(V(x, 0.4, z + 0.015), [0.076 * D, 0.13, 0.078 * D]), // spieren van de onderarm
      C(V(x, 0.19, z + 0.032), V(x, 0.078, z + 0.045), 0.062 * D, 0.064 * D) // pols
    );
  };
  const voorpootPad = (k) => {
    const x = k * pootX;
    return [V(x * 0.88, 0.72, voorZ), V(x, 0.6, voorZ - 0.035), V(x, 0.42, voorZ), V(x, 0.2, voorZ + 0.03), V(x, 0.085, voorZ + 0.044)];
  };
  // Achterpoot: een dikke dij naar de knie vooraan, de scheen schuin naar de hiel achteraan, de kuit.
  const achterpoot = (k) => {
    const x = k * pootX;
    const z = achterZ;
    const D = pd;
    return samen(
      0.05 * s,
      E(V(x * 1.04, 0.6, z + 0.06), [0.1 * D, 0.21, 0.15 * D], eu(-0.45, 0, 0)), // dij
      C(V(x * 1.06, 0.5, z + 0.1), V(x, 0.31, z - 0.15), 0.088 * D, 0.05 * D), // scheen naar de hiel
      E(V(x, 0.42, z - 0.07), [0.058 * D, 0.105, 0.066 * D], eu(0.9, 0, 0)), // kuit
      E(V(x, 0.3, z - 0.165), [0.042 * D, 0.048, 0.044 * D]), // hiel
      C(V(x, 0.31, z - 0.15), V(x, 0.078, z - 0.076), 0.05 * D, 0.056 * D) // middenvoet
    );
  };
  const achterpootPad = (k) => {
    const x = k * pootX;
    return [V(x, 0.74, achterZ), V(x, 0.6, achterZ + 0.03), V(x, 0.45, achterZ - 0.04), V(x, 0.31, achterZ - 0.14), V(x, 0.19, achterZ - 0.11), V(x, 0.085, achterZ - 0.078)];
  };
  // Grote ronde voeten met vier dikke tenen.
  const voet = (poot) => {
    const g = pootPunten(poot);
    const x = g.enkel.x / s;
    const z0 = (g.enkel.z + g.teen.z) / 2 / s + (poot.voor ? 0.01 : 0);
    const P = pg * (poot.voor ? 1.08 : 0.98);
    const delen = [
      E(V(x, 0.052, z0), [0.074 * P, 0.052, 0.09 * P]), // bal van de voet
      C(V(x, 0.085, g.enkel.z / s), V(x, 0.05, z0), 0.062 * pd, 0.066 * P), // aansluiting op de poot
    ];
    for (let i = 0; i < 4; i++) {
      const a = (-0.75 + i * 0.5) * 0.95;
      delen.push(E(V(x + Math.sin(a) * 0.056 * P, 0.035, z0 + 0.048 * P + Math.cos(a) * 0.048 * P), [0.028 * P, 0.035, 0.032 * P]));
    }
    return { veld: samen(0.02 * s, ...delen), midden: V(x, 0.05, z0) };
  };

  // Hoofd: brede schedel, voorhoofd, rechte neusrug, snorkussens, jukbeenderen, wangkraag,
  // wenkbrauwen die de ogen overschaduwen, en oogkassen.
  const kopVorm = samen(
    0.04 * s * hg,
    HE(H(0, 0.935, 0.85), [0.122, 0.105, 0.13]), // schedel
    HE(H(0, 0.948, 0.935), [0.1, 0.072, 0.08]), // voorhoofd
    HC(H(0, 0.925, 0.96), H(0, 0.882, 1.1), 0.062, 0.042), // neusrug
    HE(H(0, 0.877, 1.128), [0.036, 0.022, 0.02]), // neusspiegel
    ...kanten.map((k) => HE(H(k * 0.04, 0.842, 1.066), [0.048, 0.044, 0.052])), // snorkussens
    ...kanten.map((k) => HE(H(k * 0.092, 0.875, 0.915), [0.058, 0.06, 0.078])), // jukbeen en kauwspier
    // Wangkraag: lange witte vacht die opzij en naar achter uitsteekt (de "bakkebaarden").
    ...kanten.map((k) => HE(H(k * 0.125, 0.875, 0.835), [0.062 * wk, 0.062, 0.075], eu(0.3, k * 0.35, k * 0.6))),
    ...kanten.map((k) => HE(H(k * 0.115, 0.81, 0.85), [0.06 * wk, 0.05, 0.07], eu(-0.3, k * 0.3, k * 0.25))),
    ...kanten.map((k) => HC(H(k * 0.04, 0.832, 1.04), H(k * 0.075, 0.83, 0.955), 0.04, 0.034)), // bovenlip opzij
    HE(H(0, 0.845, 0.98), [0.058, 0.03, 0.1]), // gehemelte
    ...kanten.map((k) => HE(H(k * 0.06, 0.945, 0.99), [0.031, 0.012, 0.021], eu(0.2, 0, k * 0.38))) // wenkbrauwen: binnenkant laag, streng
  );
  // De ogen liggen bovenop de huid, onder de wenkbrauwen (een oogkas is fijner dan de huid kan volgen).
  const oogPlek = kanten.map((k) => H(k * 0.058, 0.917, 1.0));
  const kopVeld = kopVorm;
  const kopPad = [H(0, 0.93, 0.76), H(0, 0.925, 0.87), H(0, 0.9, 0.99), H(0, 0.877, 1.1)];
  // Onderkaak met kin en keelvacht.
  const kaakVeld = samen(
    0.025 * s * hg,
    HE(H(0, 0.805, 0.95), [0.07, 0.034, 0.11]),
    HE(H(0, 0.797, 1.045), [0.042, 0.03, 0.04]), // kin
    HE(H(0, 0.782, 0.92), [0.05, 0.03, 0.08]) // keelvacht
  );
  const kaakPad = [H(0, 0.8, 0.86), H(0, 0.8, 0.96), H(0, 0.797, 1.06)];

  const voorpoten = kanten.map(voorpoot);
  const achterpoten = kanten.map(achterpoot);
  const voeten = POTEN.map(voet);
  // Het hele lichaam in één vormveld: om plooien en holtes donkerder te maken.
  const heel = los(romp, ...voorpoten, ...achterpoten, ...voeten.map((v) => v.veld), kopVeld, kaakVeld);
  const holte = { veld: heel, bereik: 0.1 * s, sterkte: F.holteSterkte };

  // --- Kleuren en strepen ---
  const dS = T.strepen.dichtheid;
  /** Vachtkleur rond het lijf: v = 0 op de rug, 1 onder de buik. */
  const vacht = (v) => {
    const c = kl(T.rugKleur, T.vachtKleur, glad(v, 0.06, 0.3));
    c.lerp(new THREE.Color(T.flankKleur), glad(v, 0.56, 0.68));
    return c.lerp(new THREE.Color(T.buikKleur), glad(v, 0.66, 0.78));
  };
  const zijde = (x) => (x >= 0 ? 0 : 0.37 / dS); // links en rechts een ander patroon

  // Hoofd: oranje met een donkere kruin, wit onder de ogen, op de snorkussens, de wangkraag en de kin,
  // witte vlekken boven de ogen, zwarte oogranden, traanstreepjes en lippen, een roze neus.
  const traan = kanten.map((k) => [H(k * 0.04, 0.905, 1.016), H(k * 0.03, 0.872, 1.06)]);
  const _seg = new THREE.Line3();
  const _dichtst = new THREE.Vector3();
  const kopKleur = (p, n) => {
    const q = naarKop(p);
    const ax = Math.abs(q.x);
    const c = kl(T.vachtKleur, T.rugKleur, glad(n.y, 0.3, 0.95) * 0.75);
    const wang = glad(0.912 - q.y, 0, 0.03) * glad(ax, 0.035, 0.07) * glad(q.z, 0.86, 0.93);
    const snoet = glad(0.872 - q.y, 0, 0.02) * glad(q.z, 0.98, 1.03);
    const kraag = glad(ax, 0.1, 0.15) * glad(0.93 - q.y, 0, 0.05);
    // De grote witte vlek boven elk oog (typisch voor een tijger).
    const wenkbrauw = 1 - glad(Math.hypot((ax - 0.068) / 0.036, (q.y - 0.95) / 0.02, (q.z - 0.982) / 0.04), 0.75, 1.15);
    const onder = glad(-n.y, 0.2, 0.6);
    const neusrug = (1 - glad(ax, 0.028, 0.05)) * glad(q.y, 0.87, 0.9);
    c.lerp(new THREE.Color(T.buikKleur), Math.max(wang, snoet, kraag, wenkbrauw, onder) * (1 - neusrug));
    // Een donker randje vlak rond de ogen en dunne traanstreepjes van de binnenhoek naar de snuit.
    for (const o of oogPlek) {
      const d = Math.hypot((p.x - o.x) / (0.031 * s * hg), (p.y - o.y) / (0.017 * s * hg));
      c.lerp(new THREE.Color(F.oogDonker), (1 - glad(d, 0.8, 1.05)) * glad(q.z, 0.96, 0.98) * 0.85);
    }
    for (const [a, b] of traan) {
      _seg.set(a, b).closestPointToPoint(p, true, _dichtst);
      c.lerp(new THREE.Color(F.oogDonker), (1 - glad(p.distanceTo(_dichtst) / (s * hg), 0.002, 0.005)) * 0.9);
    }
    // Donkere lijnen op het voorhoofd (van voren gezien): twee fronslijnen tussen de ogen en een boog
    // boven elke witte wenkbrauwvlek. Die geven de strenge blik.
    if (n.z > -0.3) {
      let lijn = 0;
      for (const [ax0, ay0, bx0, by0, dik] of VOORHOOFD) {
        lijn = Math.max(lijn, 1 - glad(afstandLijn(ax, q.y, ax0, ay0, bx0, by0), dik * 0.6, dik));
      }
      c.lerp(new THREE.Color(T.streepKleur), lijn * glad(n.z, -0.3, 0.1) * 0.95);
    }
    // Zwarte lippen: een dun randje onderaan de bovenlip. Dieper naar binnen (alleen te zien als de
    // bek open is) het gehemelte.
    // De hele onderkant van de bovenlip is zwart, het gehemelte daarbinnen donkerroze.
    const onderlip = glad(-n.y, 0.1, 0.45) * glad(0.835 - q.y, 0, 0.012) * glad(q.z, 0.93, 0.97);
    const binnen = glad(-n.y, 0.5, 0.8) * (1 - glad(ax, 0.04, 0.055)) * glad(q.z, 0.88, 0.92) * glad(0.84 - q.y, 0, 0.012);
    c.lerp(new THREE.Color(F.lipKleur), onderlip * (1 - binnen));
    c.lerp(new THREE.Color(F.mondKleur), binnen);
    // Neus: met een donkere rand.
    const dn = Math.hypot(q.x / 0.036, (q.y - 0.877) / 0.022, (q.z - 1.128) / 0.022);
    c.lerp(new THREE.Color(F.neusRand), (1 - glad(dn, 1.0, 1.2)) * 0.8);
    c.lerp(new THREE.Color(F.neusKleur), 1 - glad(dn, 0.8, 1.0));
    return c;
  };
  const kopStreep = (p, n) => {
    const q = naarKop(p);
    const ax = Math.abs(q.x);
    const kant = zijde(q.x);
    let vrij = 1;
    for (const o of oogPlek) vrij *= glad(p.distanceTo(o) / (s * hg), 0.036, 0.05);
    vrij *= 1 - glad(q.z, 0.97, 1.01) * glad(0.905 - q.y, 0, 0.02); // geen strepen op de snoet
    vrij *= 1 - glad(-n.y, 0.3, 0.6); // ook niet onderaan
    // Voorhoofd: strepen die van de kruin naar de wenkbrauwen lopen en op verschillende plekken stoppen.
    const voorhoofd = glad(n.y, 0.2, 0.45) * glad(q.z, 0.82, 0.9) * glad(n.z, -0.25, 0.15);
    // Wangen: twee of drie strepen die naar achter over de wangkraag lopen.
    const wang = glad(Math.abs(n.x), 0.4, 0.65) * glad(0.925 - q.y, 0, 0.03) * glad(q.y, 0.74, 0.79);
    // Achterhoofd: banden zoals op de nek.
    const achter = glad(-n.z, -0.3, 0.2) * (1 - voorhoofd) * (1 - wang);
    const max = Math.max(voorhoofd, wang, achter);
    if (max === voorhoofd) return [q.x * 2.6 / (1 + glad(q.z, 0.86, 1.0) * 0.6) + 0.04, klem((q.z - 0.84) / 0.13, 0, 1), voorhoofd * vrij];
    if (max === wang) return [q.y * 1.6 + kant + 0.11, klem((q.z - 0.74) / 0.3, 0, 1), wang * vrij];
    return [q.z * 1.2 + kant + 0.3, klem((1 - n.y) / 2, 0, 1), achter * 0.8 * vrij];
  };

  // --- Huid ---
  // Romp en nek.
  L.langs(rompPad, romp, {
    botten: ['achter', 'lijf', 'voor', 'nek', 'hoofd', 'lv_boven', 'rv_boven', 'la_boven', 'ra_boven'],
    rMax: 0.42 * s,
    ringen: 60,
    zijden: 36,
    kap: [8, 6],
    holte,
    kleur: (p, n, i) => vacht(i.v),
    // Strepen rond het lijf (u langs de ruggengraat), links en rechts verschillend, niet op de buik.
    streep: (p, n, i) => [i.boog / s + zijde(i.hoek > Math.PI ? -1 : 1), i.v, 1 - glad(i.v, 0.64, 0.78)],
  });

  // Poten.
  POTEN.forEach((poot, pi) => {
    const k = poot.kant;
    const n = poot.naam;
    const ki = k > 0 ? 0 : 1;
    L.langs(poot.voor ? voorpootPad(k) : achterpootPad(k), poot.voor ? voorpoten[ki] : achterpoten[ki], {
      botten: [poot.voor ? 'voor' : 'achter', n + '_boven', n + '_onder', n + '_voet'],
      scherpte: 5,
      rMax: 0.3 * s,
      ringen: 30,
      zijden: 20,
      kap: [5, 4],
      holte,
      // Oranje aan de buitenkant, wit aan de binnenkant, iets lichter naar onder.
      kleur: (p, nn) => {
        const c = kl(T.vachtKleur, T.flankKleur, glad(0.35 * s - p.y, 0, 0.2 * s) * 0.6);
        return c.lerp(new THREE.Color(T.buikKleur), Math.max(glad(-nn.x * k, 0.1, 0.6) * 0.9, glad(-nn.y, 0.3, 0.8)));
      },
      // Liggende strepen aan de buitenkant en de achterkant; op de dij lopen ze zoals op het lijf.
      streep: (p, nn) => {
        const buiten = nn.x * k * 0.7 - nn.z * 0.5;
        const y = p.y / s;
        const u = poot.voor ? y * 1.15 : THREE.MathUtils.lerp(y * 1.1 + 0.3, -p.z / s + 0.2, glad(y, 0.42, 0.6));
        const sterk = glad(y, 0.1, 0.17) * (poot.voor ? 1 - glad(y, 0.56, 0.7) : 1);
        return [u + zijde(k) + pi * 0.13, klem(0.62 - buiten * 0.62, 0, 1), sterk];
      },
    });
    // Voeten: lichte, ongestreepte vacht met donkere zolen.
    const { veld, midden } = voeten[pi];
    L.rond(midden, veld, {
      botten: [n + '_voet', n + '_onder'],
      scherpte: 6,
      rMax: 0.16 * s,
      breed: 22,
      hoog: 14,
      holte,
      kleur: (p, nn) => (nn.y < -0.75 ? 0x3a2a26 : kl(T.flankKleur, T.buikKleur, glad(-nn.x * k, 0.1, 0.7) * 0.7 + glad(nn.z, 0.5, 0.95) * 0.2)),
    });
  });

  // Staart: ringen en een zwart puntje.
  const staartLengte = new THREE.CatmullRomCurve3(m.staart).getLength();
  L.lob(
    m.staart,
    (t) => {
      const r = F.staartDikte * s * (1.12 - 0.38 * t) * kap(t, 0.03, 0.04);
      return [r, r];
    },
    {
      botten: m.staart.slice(0, -1).map((_, i) => 'staart' + i),
      scherpte: 4,
      ringen: 56,
      zijden: 12,
      holte,
      kleur: (p, n, i) => (i.t > 0.87 ? T.streepKleur : kl(T.rugKleur, T.flankKleur, glad(i.v, 0.3, 0.9))),
      streep: (p, n, i) => [(i.t * staartLengte) / s + 0.05, 0.1, glad(i.t, 0.05, 0.12)],
    }
  );

  // Hoofd (plooien iets minder donker: anders lijkt het witte gezicht vuil).
  L.langs(kopPad, kopVeld, {
    botten: ['hoofd', 'lip'],
    rMax: 0.27 * s * hg,
    ringen: 40,
    zijden: 40,
    kap: [8, 8],
    holte: { ...holte, sterkte: F.holteSterkte * 0.55 },
    kleur: kopKleur,
    streep: kopStreep,
    // De voorkant van de snuit (onder de neusrug, met de hele neus) hangt aan de bovenlip.
    botGewicht: (p) => {
      const q = naarKop(p);
      const w = glad(q.z, 0.985, 1.04) * Math.max(1 - glad(q.y, 0.885, 0.905), glad(q.z, 1.07, 1.1));
      return [
        ['hoofd', 1 - w],
        ['lip', w],
      ];
    },
  });

  // Oren: klein en rond, wijd uit elkaar. Van voren licht met een donkere rand, van achteren zwart
  // met de typische witte vlek.
  for (const k of kanten) {
    const [a] = m.oor;
    L.bol(new THREE.Vector3(a.x * k, a.y, a.z), [0.043 * s * hg, 0.047 * s * hg, 0.015 * s * hg], {
      botten: [k > 0 ? 'oorL' : 'oorR'],
      draai: eu(-0.25, k * 0.6, k * -0.35),
      breed: 18,
      hoog: 12,
      holte,
      kleur: (p, nn, i) => {
        const e = i.lokaal;
        const rand = Math.hypot(e.x, e.y);
        // Voorkant: een donkere rand, oranje vacht en een pluk lichte haren in het midden.
        if (e.z > 0) return rand > 0.8 ? T.streepKleur : kl(T.oorBinnen, T.vachtKleur, glad(rand, 0.25, 0.7) * 0.8 + glad(e.y, 0.2, 0.7) * 0.3);
        return Math.hypot(e.x * 1.15, e.y + 0.12) < 0.38 ? 0xf6f2ea : T.streepKleur;
      },
    });
  }

  // Onderkaak: wit, met zwarte lippen; de tong en de binnenkant zie je alleen als de bek open is.
  L.langs(kaakPad, kaakVeld, {
    botten: ['kaak'],
    rMax: 0.12 * s * hg,
    ringen: 18,
    zijden: 24,
    kap: [6, 6],
    holte,
    kleur: (p, n) => {
      const q = naarKop(p);
      const c = kl(T.buikKleur, T.flankKleur, glad(Math.abs(n.x), 0.6, 1) * 0.2);
      // Een dun zwart lipje bovenaan de buitenkant; binnenin (alleen te zien met open bek) donkerroze.
      const binnen = glad(n.y, 0.55, 0.8) * (1 - glad(Math.abs(q.x), 0.045, 0.06)) * (1 - glad(q.z, 1.02, 1.05));
      c.lerp(new THREE.Color(F.lipKleur), glad(n.y, 0.15, 0.45) * glad(q.y, 0.812, 0.822) * (1 - binnen));
      return c.lerp(new THREE.Color(F.mondKleur), binnen);
    },
  });
  // Binnenkant van de bek: rekt mee als de kaak opengaat (bovenaan vast aan het hoofd, onderaan aan de kaak).
  const mondC = H(0, 0.822, 0.93);
  const mondR = /** @type {[number, number, number]} */ ([0.05 * s * hg, 0.022 * s * hg, 0.07 * s * hg]);
  L.bol(mondC, mondR, {
    botten: ['hoofd', 'kaak'],
    breed: 18,
    hoog: 12,
    kleur: (p) => kl(0x3a0e12, 0x14050a, glad((mondC.z - p.z) / mondR[2], -0.6, 0.6)),
    botGewicht: (p) => {
      const w = glad((p.y - mondC.y) / mondR[1], -0.7, 0.7);
      return [
        ['hoofd', w],
        ['kaak', 1 - w],
      ];
    },
  });
  L.bol(H(0, 0.818, 0.975), [0.036 * s * hg, 0.008 * s * hg, 0.07 * s * hg], { botten: ['kaak'], breed: 14, hoog: 8, kleur: F.tongKleur });
  // Tanden: vier lange hoektanden en kleine snijtandjes.
  const tand = F.hoektand / (s * hg);
  const tandProfiel = (dik) => (t) => {
    const r = dik * s * hg * Math.pow(1 - t, 0.7) * kap(t, 0.12, 0.02);
    return /** @type {[number, number]} */ ([r, r * 0.85]);
  };
  for (const k of kanten) {
    L.lob([H(k * 0.027, 0.835, 1.054), H(k * 0.027, 0.835 - tand * 0.55, 1.058), H(k * 0.025, 0.835 - tand, 1.052)], tandProfiel(0.0105), {
      botten: ['hoofd'],
      ringen: 8,
      zijden: 8,
      kleur: F.tandKleur,
    });
    L.lob([H(k * 0.022, 0.8, 1.048), H(k * 0.022, 0.8 + tand * 0.4, 1.053), H(k * 0.021, 0.8 + tand * 0.72, 1.05)], tandProfiel(0.0085), {
      botten: ['kaak'],
      ringen: 8,
      zijden: 8,
      kleur: F.tandKleur,
    });
  }
  for (const x of [-0.014, -0.005, 0.005, 0.014]) {
    L.bol(H(x, 0.826, 1.072), [0.005 * s * hg, 0.007 * s * hg, 0.004 * s * hg], { botten: ['hoofd'], breed: 8, hoog: 6, kleur: F.tandKleur });
    L.bol(H(x * 0.85, 0.812, 1.064), [0.0045 * s * hg, 0.006 * s * hg, 0.004 * s * hg], { botten: ['kaak'], breed: 8, hoog: 6, kleur: F.tandKleur });
  }

  const gebouwd = L.maak(
    maakVachtMateriaal({
      strepen: { ...T.strepen, zaad: T.strepen.zaad + zaadje * 7.31 },
      streepKleur: T.streepKleur,
      rand: F.rand,
      randKleur: 0xfff0dc,
      gloed: F.gloed,
      fijn: { ruis: F.vachtRuis, rafel: F.rafelFijn },
    })
  );
  const { bot } = gebouwd;
  const info = dierInfo(L, bot, m);

  // --- Gezicht: ogen, neus, snorvlekjes en snorharen, vast aan het hoofd ---
  /**
   * Zet een plat onderdeel op het hoofd: zoek de huid vanuit een punt binnenin, in een richting.
   * +z van het onderdeel wijst naar buiten (of mee naar `kijk`), +y zoveel mogelijk omhoog.
   */
  const opKop = (obj, binnen, richting, uit, kijk) => {
    const d = richting.clone().normalize();
    const r = zoekRand(kopVeld, binnen.x, binnen.y, binnen.z, d.x, d.y, d.z, 0.3 * s);
    const p = binnen.clone().addScaledVector(d, r);
    const n = veldNormaal(kopVeld, p.x, p.y, p.z, new THREE.Vector3());
    const zAs = kijk ? n.clone().lerp(kijk.clone().normalize(), 0.5).normalize() : n;
    obj.position.copy(p).addScaledVector(zAs, uit);
    const xAs = new THREE.Vector3(0, 1, 0).cross(zAs).normalize();
    const yAs = new THREE.Vector3().crossVectors(zAs, xAs);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAs, yAs, zAs));
    obj.updateMatrix();
    return obj;
  };

  const ogen = [];
  for (const k of kanten) {
    const oog = maakEchtOog({
      breedte: F.oogGrootte * s * hg,
      kant: k,
      iris: T.oogKleur,
      irisRand: T.oogRand,
      donker: F.oogDonker,
      kromming: 0.12 * s * hg,
    });
    // Tijgers kijken recht vooruit (roofdierogen): het oog staat maar een beetje schuin naar buiten.
    opKop(oog.groep, H(k * 0.04, 0.918, 0.95), new THREE.Vector3(k * 0.36, 0.04, 0.93), 0.0035 * s, new THREE.Vector3(k * 0.16, 0.04, 1));
    ogen.push(oog.knipper);
    aanBot(bot.hoofd, L.botPos('hoofd'), oog.groep);
  }

  const gz = new Gezicht();
  const plek = new THREE.Object3D();
  // Neus: roze neusspiegel met een donkere rand en twee neusgaten.
  const nb = 0.05 * s * hg;
  const nh = 0.036 * s * hg;
  const neusVorm = (b, h) => {
    const v = new THREE.Shape();
    v.moveTo(0, -h * 0.5);
    v.bezierCurveTo(b * 0.12, -h * 0.42, b * 0.3, -h * 0.1, b * 0.5, h * 0.28);
    v.quadraticCurveTo(b * 0.53, h * 0.5, b * 0.32, h * 0.52);
    v.quadraticCurveTo(0, h * 0.57, -b * 0.32, h * 0.52);
    v.quadraticCurveTo(-b * 0.53, h * 0.5, -b * 0.5, h * 0.28);
    v.bezierCurveTo(-b * 0.3, -h * 0.1, -b * 0.12, -h * 0.42, 0, -h * 0.5);
    return v;
  };
  opKop(plek, H(0, 0.87, 1.08), new THREE.Vector3(0, 0.45, 1), 0.002 * s);
  gz.voegToe(new THREE.ShapeGeometry(neusVorm(nb * 1.08, nh * 1.08), 10), F.neusRand, plek);
  plek.translateZ(0.0008 * s);
  gz.voegToe(new THREE.ShapeGeometry(neusVorm(nb, nh), 10).translate(0, nh * 0.04, 0), F.neusKleur, plek);
  plek.translateZ(0.0008 * s);
  for (const k of kanten) {
    const gat = new THREE.CircleGeometry(1, 12).scale(nb * 0.14, nh * 0.1, 1).rotateZ(k * 0.55).translate(k * nb * 0.24, -nh * 0.1, 0);
    gz.voegToe(gat, F.neusRand, plek);
  }
  // Het gleufje van de neus naar de mond.
  opKop(plek, H(0, 0.85, 1.06), new THREE.Vector3(0, -0.1, 1), 0.0012 * s);
  gz.voegToe(new THREE.PlaneGeometry(0.004 * s * hg, 0.03 * s * hg), F.lipKleur, plek);
  for (const k of kanten) {
    const kussen = H(k * 0.04, 0.842, 1.066);
    // Rijtjes kleine zwarte vlekjes op de snorkussens (waar de snorharen uit groeien), niet te netjes.
    for (let r = 0; r < 4; r++) {
      for (let c = r === 0 ? 1 : 0; c < 4; c++) {
        const w = vast(r * 7.3 + c * 3.1 + (k > 0 ? 0 : 11));
        opKop(plek, kussen, new THREE.Vector3(k * (0.38 + c * 0.17 + w * 0.05), 0.3 - r * 0.17 + (w - 0.5) * 0.06, 0.9 - c * 0.14), 0.0012 * s);
        gz.voegToe(new THREE.CircleGeometry((0.0024 + w * 0.0012) * s * hg, 7), F.lipKleur, plek);
      }
    }
    // Lange witte snorharen, naar buiten en naar achter.
    for (let j = 0; j < 6; j++) {
      opKop(plek, kussen, new THREE.Vector3(k * (0.72 + (j % 2) * 0.1), 0.24 - j * 0.09, 0.6 - j * 0.03), 0.0006 * s);
      plek.rotateY(-k * 0.55);
      const lengte = (0.13 + vast(j * 2.7 + (k > 0 ? 1 : 5)) * 0.06) * s;
      const haar = new THREE.PlaneGeometry(lengte, 0.0022 * s).translate((k * lengte) / 2, 0, 0).rotateZ(k * (0.16 - j * 0.07));
      gz.voegToe(haar, F.snorKleur, plek);
    }
  }
  // Neus, snorvlekjes en snorharen bewegen mee met de bovenlip.
  aanBot(bot.lip, L.botPos('lip'), gz.maak());
  bot.lip.userData.rust = bot.lip.position.clone();

  const groep = new THREE.Group();
  groep.add(gebouwd.mesh);
  return {
    soort: 'tijger',
    karakter: 'tijgerEcht',
    groep,
    mesh: gebouwd.mesh,
    bot,
    ogen,
    ...info,
    breedte: 0.5 * bx * s,
    lengte: (1.35 * lz + 0.45 * hg) * s,
    lipOp: 0.016 * s * hg, // hoe ver de bovenlip optrekt bij een brul (meter)
  };
}
