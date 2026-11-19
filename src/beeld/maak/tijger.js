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

// De vaste tekening van het gezicht, naar foto's van echte tijgers: vette zwarte strepen die de witte
// vlekken omlijnen. Elke streep is een lijn over de huid (punten in hoofdmaat, x vanaf het midden en
// voor beide kanten gespiegeld) met een dikte; hij loopt spits uit aan beide uiteinden.
const KOPSTREPEN = [
  // twee fronslijnen tussen de ogen, naar de kruin
  { p: [[0.013, 0.935, 1.0], [0.017, 0.965, 0.99], [0.023, 0.997, 0.952]], d: 0.0055 },
  // boog boven de witte vlek boven elk oog
  { p: [[0.036, 0.952, 0.998], [0.062, 0.97, 0.986], [0.095, 0.968, 0.952], [0.12, 0.955, 0.91]], d: 0.0065 },
  // dwarse balkjes op het voorhoofd
  { p: [[0.03, 0.99, 0.965], [0.055, 0.996, 0.947], [0.08, 0.99, 0.92]], d: 0.006 },
  { p: [[0.018, 1.012, 0.935], [0.045, 1.018, 0.912], [0.072, 1.012, 0.885]], d: 0.006 },
  { p: [[0.004, 1.026, 0.895], [0.032, 1.029, 0.872], [0.058, 1.024, 0.846]], d: 0.006 },
  // korte balkjes hoger op het voorhoofd en tussen de oren (het dichte patroon op foto's)
  { p: [[0.04, 0.975, 0.975], [0.05, 0.985, 0.962]], d: 0.005 },
  { p: [[0.008, 1.0, 0.958], [0.012, 1.018, 0.93]], d: 0.0045 },
  { p: [[0.075, 1.0, 0.905], [0.095, 0.995, 0.88]], d: 0.005 },
  { p: [[0.02, 1.034, 0.85], [0.05, 1.03, 0.825]], d: 0.0055 },
  // wangstrepen: van de buitenooghoek schuin naar achter en onder, over de witte wang en de wangkraag
  { p: [[0.088, 0.918, 0.985], [0.118, 0.912, 0.945], [0.145, 0.9, 0.89], [0.16, 0.88, 0.83]], d: 0.009 },
  { p: [[0.078, 0.889, 0.985], [0.11, 0.876, 0.95], [0.137, 0.86, 0.895], [0.152, 0.84, 0.84]], d: 0.008 },
  { p: [[0.08, 0.858, 0.972], [0.105, 0.842, 0.93], [0.125, 0.825, 0.88], [0.135, 0.81, 0.835]], d: 0.007 },
  { p: [[0.09, 0.825, 0.935], [0.108, 0.805, 0.895], [0.115, 0.79, 0.85]], d: 0.006 },
  // traanstreep: van de binnenooghoek langs de neusrug omlaag
  { p: [[0.04, 0.906, 1.014], [0.036, 0.882, 1.04], [0.033, 0.862, 1.06]], d: 0.004 },
  // zwarte lijn langs de bovenlip, van onder de neus naar de mondhoek
  { p: [[0.006, 0.838, 1.118], [0.03, 0.802, 1.108], [0.055, 0.796, 1.072], [0.076, 0.806, 1.0]], d: 0.0032 },
];

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
  // Zoals op het skelet en op foto's: een duidelijke, dikke nek, de kop iets lager dan de rug.
  const KOP_Y = 0.9;
  const KOP_Z = 0.86 + hoofdVoor;
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
    oor: /** @type {[THREE.Vector3, THREE.Vector3]} */ ([H(0.11, 0.99, 0.8), H(0.13, 1.05, 0.79)]),
    kaak: /** @type {[THREE.Vector3, THREE.Vector3]} */ ([H(0, 0.82, 0.86), H(0, 0.77, 1.07)]),
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
  L.bot('lip', 'hoofd', H(0, 0.835, 1.0), H(0, 0.835, 1.12));

  // --- Vormvelden ---
  // Romp en nek: borstkas, buik, heupen, schouderbladen, schouders, dijen, nek en keel.
  const romp = samen(
    0.075 * s,
    E(R(0, 0.735, 0.17), [0.168 * bx, 0.255, 0.37 * lz]), // borstkas: diep en smal
    E(R(0, 0.75, -0.22), [0.15 * bx, 0.21, 0.3 * lz]), // buik en flanken: een vrij rechte buiklijn
    E(R(0, 0.795, -0.52), [0.162 * bx, 0.185, 0.25 * lz]), // kruis en heupen
    E(R(0, 0.625, 0.47), [0.135 * bx, 0.15, 0.12]), // borst (voorkant)
    ...kanten.map((k) => E(R(k * 0.095, 0.9, 0.36), [0.068 * bx, 0.12, 0.1], eu(-0.35, 0, k * 0.15))), // schouderbladen
    ...kanten.map((k) => E(R(k * 0.15, 0.67, 0.37), [0.088 * bx, 0.19, 0.13])), // schouders en bovenarmen
    ...kanten.map((k) => E(R(k * 0.12, 0.78, -0.5), [0.08 * bx, 0.17, 0.2])), // bovenkant van de dijen
    // Flankplooi: de huid loopt van de buik naar de knie, zodat de dij in de flank overgaat.
    ...kanten.map((k) => E(R(k * 0.11, 0.62, -0.37), [0.075 * bx, 0.11, 0.13], eu(-0.3, 0, 0))),
    C(R(0, 0.8, 0.45), H(0, 0.87, 0.74), 0.165 * bx, 0.115), // nek: dik, en eindigt net binnen de kop (anders flikkeren twee huiden)
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
      C(V(x * 0.82, 0.7, z + 0.01), V(x * 0.95, 0.52, z - 0.05), 0.09 * D, 0.08 * D), // bovenarm: de elleboog ligt tegen de borst
      E(V(x * 0.97, 0.5, z - 0.08), [0.06 * D, 0.07, 0.064 * D]), // elleboog
      C(V(x, 0.5, z - 0.02), V(x, 0.19, z + 0.032), 0.086 * D, 0.06 * D), // onderarm
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
      E(V(x * 0.98, 0.61, z + 0.04), [0.088 * D, 0.21, 0.15 * D], eu(-0.4, 0, 0)), // dij
      C(V(x * 1.0, 0.5, z + 0.075), V(x, 0.31, z - 0.15), 0.08 * D, 0.05 * D), // scheen naar de hiel
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
      E(V(x, 0.052, z0 - 0.01), [0.072 * P, 0.052, 0.076 * P]), // bal van de voet: groot en rond
      C(V(x, 0.085, g.enkel.z / s), V(x, 0.05, z0), 0.062 * pd, 0.066 * P), // aansluiting op de poot
    ];
    for (let i = 0; i < 4; i++) {
      const a = (-0.75 + i * 0.5) * 0.95;
      delen.push(E(V(x + Math.sin(a) * 0.054 * P, 0.035, z0 + 0.03 * P + Math.cos(a) * 0.042 * P), [0.027 * P, 0.035, 0.029 * P]));
    }
    return { veld: samen(0.02 * s, ...delen), midden: V(x, 0.05, z0) };
  };

  // Hoofd, nagemeten op foto's en het skelet: hoog en wigvormig. Het voorhoofd welft hoog boven de
  // ogen, de brede neusrug loopt schuin omlaag naar een neus die duidelijk lager zit dan de ogen, de
  // snuit is stomp en diep (de bovenlip bijna even ver vooruit als de neus), de kin stevig, met
  // jukbeenderen, een wangkraag die naar achter en onder uitsteekt, en wenkbrauwen boven de ogen.
  const kopVorm = samen(
    0.04 * s * hg,
    HE(H(0, 0.935, 0.85), [0.126, 0.095, 0.135]), // schedel: breed
    HE(H(0, 0.95, 0.94), [0.104, 0.065, 0.08]), // voorhoofd: breed en vrij vlak
    HC(H(0, 0.925, 0.97), H(0, 0.865, 1.1), 0.058, 0.04), // neusrug
    HE(H(0, 0.86, 1.125), [0.034, 0.022, 0.02]), // neusspiegel
    ...kanten.map((k) => HE(H(k * 0.034, 0.815, 1.085), [0.042, 0.045, 0.042])), // snorkussens
    ...kanten.map((k) => HE(H(k * 0.088, 0.87, 0.92), [0.055, 0.065, 0.075])), // jukbeen
    ...kanten.map((k) => HE(H(k * 0.075, 0.81, 0.93), [0.05, 0.05, 0.06])), // kauwspier
    // Wangkraag: lange witte vacht die opzij en naar achter uitsteekt (de "bakkebaarden").
    ...kanten.map((k) => HE(H(k * 0.11, 0.875, 0.84), [0.046 * wk, 0.06, 0.07], eu(0.3, k * 0.35, k * 0.6))),
    ...kanten.map((k) => HE(H(k * 0.092, 0.785, 0.86), [0.04 * wk, 0.046, 0.065], eu(-0.4, k * 0.3, k * 0.25))),
    ...kanten.map((k) => HC(H(k * 0.034, 0.805, 1.06), H(k * 0.07, 0.81, 0.955), 0.036, 0.032)), // bovenlip opzij
    HE(H(0, 0.82, 0.99), [0.052, 0.03, 0.1]), // gehemelte
    ...kanten.map((k) => HE(H(k * 0.06, 0.945, 0.99), [0.031, 0.012, 0.021], eu(0.2, 0, k * 0.38))) // wenkbrauwen: binnenkant laag, streng
  );
  // De ogen liggen bovenop de huid, onder de wenkbrauwen (een oogkas is fijner dan de huid kan volgen).
  const oogPlek = kanten.map((k) => H(k * 0.058, 0.917, 1.0));
  const kopVeld = kopVorm;
  const _seg = new THREE.Line3();
  const kopPad = [H(0, 0.93, 0.76), H(0, 0.925, 0.87), H(0, 0.89, 0.99), H(0, 0.86, 1.1)];
  // De gezichtsstrepen op de huid leggen: elk punt schuift langs een straal vanuit het hoofd naar de huid.
  // Een klein beetje verschil tussen links en rechts, zoals bij een echt dier.
  const kern = H(0, 0.89, 0.88);
  const opHuid = (x, y, z) => {
    const d = H(x, y, z).sub(kern).normalize();
    return kern.clone().addScaledVector(d, zoekRand(kopVeld, kern.x, kern.y, kern.z, d.x, d.y, d.z, 0.35 * s));
  };
  const kopStrepen = [];
  KOPSTREPEN.forEach((st, i) => {
    for (const k of kanten) {
      const w = (vast(i * 5.3 + (k > 0 ? 2 : 9) + zaadje * 3.7) - 0.5) * 0.008;
      const punten = st.p.map(([x, y, z]) => opHuid(k * (x + Math.abs(w) * 0.5), y + w, z));
      const lengtes = [0];
      for (let j = 1; j < punten.length; j++) lengtes.push(lengtes[j - 1] + punten[j].distanceTo(punten[j - 1]));
      kopStrepen.push({ punten, lengtes, d: st.d * s * hg * (0.85 + vast(i * 2.1 + k) * 0.3) });
    }
  });
  const _sa = new THREE.Vector3();
  /**
   * De tekening voor de shader: [afstand tot de dichtstbijzijnde streep, in halve streepbreedtes, sterkte].
   * Binnen een streep is de afstand < 1. Het kleinste van alle afstanden loopt overal vloeiend, ook waar
   * twee strepen elkaar naderen (anders ontstaan er blokjes tussen de hoekpunten van de huid).
   */
  const tekenKop = (p) => {
    let beste = 9;
    for (const st of kopStrepen) {
      const totaal = st.lengtes[st.lengtes.length - 1];
      for (let j = 1; j < st.punten.length; j++) {
        _seg.set(st.punten[j - 1], st.punten[j]);
        const tt = _seg.closestPointToPointParameter(p, true);
        _seg.at(tt, _sa);
        const afstand = p.distanceTo(_sa);
        if (afstand > st.d * 9) continue;
        const u = (st.lengtes[j - 1] + tt * (st.lengtes[j] - st.lengtes[j - 1])) / totaal;
        const breed = Math.max(st.d * Math.pow(Math.sin(Math.PI * klem(u, 0, 1)), 0.55), st.d * 0.02);
        beste = Math.min(beste, afstand / breed);
      }
    }
    return [beste, 1];
  };
  // Onderkaak met kin en keelvacht.
  const kaakVeld = samen(
    0.025 * s * hg,
    HE(H(0, 0.778, 0.96), [0.062, 0.035, 0.105]),
    HE(H(0, 0.762, 1.058), [0.038, 0.036, 0.035]), // kin: stevig en diep, net achter de bovenlip
    HE(H(0, 0.755, 0.9), [0.045, 0.03, 0.07]) // keelvacht
  );
  const kaakPad = [H(0, 0.775, 0.86), H(0, 0.775, 0.96), H(0, 0.768, 1.07)];

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
  const kopKleur = (p, n) => {
    const q = naarKop(p);
    const ax = Math.abs(q.x);
    const c = kl(T.vachtKleur, T.rugKleur, glad(n.y, 0.3, 0.95) * 0.75);
    const wang = glad(0.912 - q.y, 0, 0.03) * glad(ax, 0.035, 0.07) * glad(q.z, 0.86, 0.93);
    const snoet = glad(0.86 - q.y, 0, 0.025) * glad(q.z, 0.98, 1.03);
    const kraag = glad(ax, 0.1, 0.15) * glad(0.93 - q.y, 0, 0.05);
    // De grote witte vlek boven elk oog (typisch voor een tijger).
    const wenkbrauw = 1 - glad(Math.hypot((ax - 0.066) / 0.04, (q.y - 0.947) / 0.022, (q.z - 0.982) / 0.045), 0.75, 1.15);
    const onder = glad(-n.y, 0.2, 0.6);
    const neusrug = (1 - glad(ax, 0.028, 0.05)) * glad(q.y, 0.85, 0.88);
    // Helder wit in het gezicht (op foto's is het bijna zuiver wit).
    c.lerp(new THREE.Color(T.buikKleur).lerp(new THREE.Color(0xffffff), 0.55), Math.max(wang, snoet, kraag, wenkbrauw, onder) * (1 - neusrug));
    // Een donker randje vlak rond de ogen (de traanstreepjes zitten bij de vaste gezichtsstrepen).
    for (const o of oogPlek) {
      const d = Math.hypot((p.x - o.x) / (0.031 * s * hg), (p.y - o.y) / (0.017 * s * hg));
      c.lerp(new THREE.Color(F.oogDonker), (1 - glad(d, 0.8, 1.05)) * glad(q.z, 0.96, 0.98) * 0.85);
    }
    // Zwarte lippen: een dun randje onderaan de bovenlip. Dieper naar binnen (alleen te zien als de
    // bek open is) het gehemelte.
    // De hele onderkant van de bovenlip is zwart, het gehemelte daarbinnen donkerroze.
    const onderlip = glad(-n.y, 0.35, 0.7) * glad(0.795 - q.y, 0, 0.008) * glad(q.z, 0.93, 0.97);
    const binnen = glad(-n.y, 0.5, 0.8) * (1 - glad(ax, 0.04, 0.055)) * glad(q.z, 0.88, 0.92) * glad(0.815 - q.y, 0, 0.012);
    c.lerp(new THREE.Color(F.lipKleur), onderlip * (1 - binnen));
    c.lerp(new THREE.Color(F.mondKleur), binnen);
    // Neus: met een donkere rand.
    const dn = Math.hypot(q.x / 0.034, (q.y - 0.86) / 0.022, (q.z - 1.125) / 0.022);
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
    vrij *= 1 - glad(q.z, 0.97, 1.01) * glad(0.9 - q.y, 0, 0.02); // geen strepen op de snoet
    vrij *= 1 - glad(-n.y, 0.3, 0.6); // ook niet onderaan
    vrij *= 1 - glad(q.z, 0.9, 0.95) * glad(0.12 - ax, 0, 0.02); // het gezicht heeft zijn vaste strepen
    // Voorhoofd: strepen die van de kruin naar de wenkbrauwen lopen en op verschillende plekken stoppen.
    const voorhoofd = glad(n.y, 0.2, 0.45) * glad(q.z, 0.82, 0.9) * glad(n.z, -0.25, 0.15);
    // Wangen: twee of drie strepen die naar achter over de wangkraag lopen.
    const wang = glad(Math.abs(n.x), 0.4, 0.65) * glad(0.925 - q.y, 0, 0.03) * glad(q.y, 0.72, 0.77);
    // Achterhoofd: banden zoals op de nek.
    const achter = glad(-n.z, -0.3, 0.2) * (1 - voorhoofd) * (1 - wang);
    const max = Math.max(voorhoofd, wang, achter);
    if (max === voorhoofd) return [q.x * 2.6 / (1 + glad(q.z, 0.86, 1.0) * 0.6) + 0.04, klem((q.z - 0.84) / 0.13, 0, 1), voorhoofd * vrij * 0.6];
    if (max === wang) return [q.y * 1.6 + kant + 0.11, klem((q.z - 0.74) / 0.22, 0, 1), wang * vrij * 0.7];
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
      // Oranjebruin zoals de poten (foto's), wit aan de binnenkant, donkere zolen.
      kleur: (p, nn) => (nn.y < -0.75 ? 0x3a2a26 : kl(T.vachtKleur, T.flankKleur, 0.55).lerp(new THREE.Color(T.buikKleur), glad(-nn.x * k, 0.15, 0.7) * 0.75)),
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
    // Fijner dan de rest van het lijf: de gezichtsstrepen hebben punten om de centimeter nodig.
    ringen: 56,
    zijden: 72,
    kap: [10, 10],
    holte: { ...holte, sterkte: F.holteSterkte * 0.35 },
    kleur: kopKleur,
    streep: kopStreep,
    teken: tekenKop,
    // De voorkant van de snuit (onder de neusrug, met de hele neus) hangt aan de bovenlip.
    botGewicht: (p) => {
      const q = naarKop(p);
      const w = glad(q.z, 0.985, 1.04) * Math.max(1 - glad(q.y, 0.86, 0.88), glad(q.z, 1.07, 1.1));
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
      c.lerp(new THREE.Color(F.lipKleur), glad(n.y, 0.15, 0.45) * glad(q.y, 0.785, 0.795) * (1 - binnen));
      return c.lerp(new THREE.Color(F.mondKleur), binnen);
    },
  });
  // Binnenkant van de bek: rekt mee als de kaak opengaat (bovenaan vast aan het hoofd, onderaan aan de kaak).
  const mondC = H(0, 0.795, 0.94);
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
  L.bol(H(0, 0.792, 0.985), [0.036 * s * hg, 0.008 * s * hg, 0.07 * s * hg], { botten: ['kaak'], breed: 14, hoog: 8, kleur: F.tongKleur });
  // Tanden: vier lange hoektanden en kleine snijtandjes.
  const tand = F.hoektand; // in hoofdmaat
  const tandProfiel = (dik) => (t) => {
    const r = dik * s * hg * Math.pow(1 - t, 0.7) * kap(t, 0.12, 0.02);
    return /** @type {[number, number]} */ ([r, r * 0.85]);
  };
  for (const k of kanten) {
    L.lob([H(k * 0.026, 0.81, 1.062), H(k * 0.026, 0.81 - tand * 0.55, 1.066), H(k * 0.024, 0.81 - tand, 1.06)], tandProfiel(0.0105), {
      botten: ['hoofd'],
      ringen: 8,
      zijden: 8,
      kleur: F.tandKleur,
    });
    L.lob([H(k * 0.021, 0.775, 1.058), H(k * 0.021, 0.775 + tand * 0.4, 1.063), H(k * 0.02, 0.775 + tand * 0.72, 1.06)], tandProfiel(0.0085), {
      botten: ['kaak'],
      ringen: 8,
      zijden: 8,
      kleur: F.tandKleur,
    });
  }
  for (const x of [-0.014, -0.005, 0.005, 0.014]) {
    L.bol(H(x, 0.8, 1.088), [0.005 * s * hg, 0.007 * s * hg, 0.004 * s * hg], { botten: ['hoofd'], breed: 8, hoog: 6, kleur: F.tandKleur });
    L.bol(H(x * 0.85, 0.786, 1.078), [0.0045 * s * hg, 0.006 * s * hg, 0.004 * s * hg], { botten: ['kaak'], breed: 8, hoog: 6, kleur: F.tandKleur });
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
  // Neus: een brede roze neusspiegel met een donkere rand en zwarte neusvleugels (naar foto's).
  const nb = 0.058 * s * hg;
  const nh = 0.04 * s * hg;
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
  opKop(plek, H(0, 0.85, 1.08), new THREE.Vector3(0, 0.45, 1), 0.002 * s);
  gz.voegToe(new THREE.ShapeGeometry(neusVorm(nb * 1.08, nh * 1.08), 10), F.neusRand, plek);
  plek.translateZ(0.0008 * s);
  gz.voegToe(new THREE.ShapeGeometry(neusVorm(nb, nh), 10).translate(0, nh * 0.04, 0), F.neusKleur, plek);
  plek.translateZ(0.0008 * s);
  for (const k of kanten) {
    // Neusvleugel: een zwarte boog langs de onderkant, met het neusgat erin.
    const vleugel = new THREE.CircleGeometry(1, 16).scale(nb * 0.2, nh * 0.13, 1).rotateZ(k * 0.45).translate(k * nb * 0.25, -nh * 0.12, 0);
    gz.voegToe(vleugel, F.neusRand, plek);
  }
  // Het gleufje van de neus naar de mond.
  opKop(plek, H(0, 0.822, 1.07), new THREE.Vector3(0, -0.1, 1), 0.0012 * s);
  gz.voegToe(new THREE.PlaneGeometry(0.004 * s * hg, 0.03 * s * hg), F.lipKleur, plek);
  for (const k of kanten) {
    const kussen = H(k * 0.034, 0.815, 1.085);
    // Rijtjes kleine zwarte vlekjes op de snorkussens (waar de snorharen uit groeien), niet te netjes.
    for (let r = 0; r < 4; r++) {
      for (let c = r === 0 ? 1 : 0; c < 4; c++) {
        const w = vast(r * 7.3 + c * 3.1 + (k > 0 ? 0 : 11));
        opKop(plek, kussen, new THREE.Vector3(k * (0.38 + c * 0.17 + w * 0.05), 0.3 - r * 0.17 + (w - 0.5) * 0.06, 0.9 - c * 0.14), 0.0012 * s);
        gz.voegToe(new THREE.CircleGeometry((0.0017 + w * 0.0009) * s * hg, 7), F.lipKleur, plek);
      }
    }
    // Veel lange witte snorharen, in een waaier naar buiten en naar achter (op foto's 10 tot 12 per kant).
    for (let j = 0; j < 10; j++) {
      const w = vast(j * 2.7 + (k > 0 ? 1 : 5));
      opKop(plek, kussen, new THREE.Vector3(k * (0.66 + (j % 3) * 0.08), 0.28 - j * 0.06, 0.62 - j * 0.02), 0.0006 * s);
      plek.rotateY(-k * (0.45 + w * 0.2));
      const lengte = (0.14 + w * 0.09) * s;
      const haar = new THREE.PlaneGeometry(lengte, 0.0018 * s).translate((k * lengte) / 2, 0, 0).rotateZ(k * (0.2 - j * 0.055));
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
