// De hoogtefunctie hoogte(x, z) van het eiland (TP 5.2): zee, strand, de baai met het kamp, lagune met geul,
// een open plek in de jungle, een zandpaadje en junglebulten, en daarachter de berg (stap 12, sim/wereld/eiland.js):
// een rotsrand met een etage, ravijnen en de bergtop.
// Daarnaast geeft bodem() per plek ook wat er ligt (zand, gras, pad, bos, rotswand), voor kleur en planten.
import { maakWillekeur } from '../../kern/willekeur.js';
import { lagenruis, waardenruis } from './ruis.js';
import { maakWeide } from './springweide.js';
import { WEIDE } from '../../data/springweide.js';
import { KLIMMEN } from '../../data/klimmen.js';
import { RIVIER } from '../../data/rivier.js';
import { maakRivier } from './rivier.js';
import { SPEELBOS } from '../../data/speelbos.js';
import { maakSpeelbos } from '../doorgangen/speelbos.js';
import { EILAND } from '../../data/eiland.js';
import { maakEiland, zachtMin } from './eiland.js';
import { BERGPLAN } from '../../data/bergplan.js';
import { maakBergplan } from './bergplan.js';
import { plaatsBergplan } from './plaatsing.js';
import { BERGRIVIER } from '../../data/bergrivier.js';
import { maakBergrivier } from './bergrivier.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @typedef {{ h:number, zand:number, kamp:number, pad:number, bos:number, lagune:number, d:number,
 *             weide:number, baan:number, nat:number, rivier:number, oever:number, speelbos:number, vijver:number,
 *             wand:number, voet:number, berg:number, top:number, ravijn:number, bergrivier:number }} Bodem
 *   bergrivier: hoe dicht bij de rivier over de berg (stap 14; 1 = erin of vlak ernaast)
 */

/**
 * @param {number} zaadje
 * @param {typeof import('../../data/wereld.js').WERELD} W
 */
export function maakWereldvorm(zaadje, W, waarom) {
  const w = maakWillekeur(zaadje);
  const zKust = w.volgende();
  const zHeuvel = w.volgende();
  const zFijn = w.volgende();
  const zLagune = w.volgende();
  // Structurele keuzes: alleen gehele getallen (TP 4).
  const kant = w.geheel(2) === 0 ? -1 : 1;
  const L = W.lagune;
  const lagX = W.kamp.x + kant * (L.afstand[0] + w.geheel(L.afstand[1] - L.afstand[0] + 1));
  const lagR = L.straal[0] + w.geheel(L.straal[1] - L.straal[0] + 1);
  const padFase = w.geheel(628) / 100;
  const geulFase = w.geheel(628) / 100;

  const K = W.kust;
  const S = W.strand;
  const J = W.jungle;

  /** z van de waterlijn bij x. */
  function kustZ(x) {
    const baai = 1 - glad(Math.abs(x) / K.bochtBreedte);
    return K.z - K.bocht * (1 - baai) + K.ruis * lagenruis(x / K.ruisSchaal, 0.5, zKust, 2);
  }
  const lagZ = kustZ(lagX) + lagR + 3;

  // Het eiland rond de kampplek (stap 12): een eigen deelzaadje, zodat het kamp er niet door verandert.
  // De hellingbaan naar de etage komt aan de kant van de springweide (die ligt tegenover de lagune).
  const eiland = maakEiland((zaadje ^ 0x1e1a4d) >>> 0, EILAND, -kant);

  /**
   * Hoe ver (x, z) van de waterlijn ligt, het land in. Rond het kamp is dat de oude kust met de baai;
   * verderop de kust van het eiland. Waar ze meer dan `zacht` verschillen, telt precies de dichtste.
   */
  const kustAfstand = (x, z) => zachtMin(z - kustZ(x), eiland.kustAfstand(x, z), EILAND.kust.zacht);

  /** Ruwe landvorm zonder stempels, berg en fijne ruis. */
  function ruw(x, z, d = kustAfstand(x, z)) {
    let h = d < 0 ? d * S.helling - S.zeeDiepte * glad(-d / 40) : S.hoogte * glad(d / S.breedte) + d * J.stijging;
    const bosW = glad((d - J.heuvelStart) / J.heuvelOvergang);
    h += J.heuvels * (lagenruis(x / J.heuvelSchaal, z / J.heuvelSchaal, zHeuvel, 3) * 0.5 + 0.5) * bosW;
    return h;
  }
  const kampH = ruw(W.kamp.x, W.kamp.z);
  // De open plek voor de oefenrots (stap 9): vlak gras voor de wand, en geen bomen waar de rots zelf staat.
  const KR = KLIMMEN.rots;
  const rotsH = kampH + KR.voetBoven;
  const rotsX = W.kamp.x + KR.plek.dx;
  const rotsZ = W.kamp.z + KR.plek.dz;
  const rotsNx = -Math.sin(KR.richting);
  const rotsNz = -Math.cos(KR.richting);
  function rotsOpen(x, z) {
    const dx = x - rotsX;
    const dz = z - rotsZ;
    const u = dx * rotsNz - dz * rotsNx; // langs de wand (naar rechts = (nz, -nx))
    const voor = dx * rotsNx + dz * rotsNz;
    const du = Math.max(0, Math.abs(u) - (KR.breedte / 2 + KR.open.opzij));
    const dv = Math.max(0, voor - KR.open.voor, -KR.diepte - 0.5 - voor);
    return 1 - glad(Math.hypot(du, dv) / KR.open.rand);
  }
  const padX = (z) => W.kamp.x + W.pad.slinger * Math.sin(z * 0.09 + padFase);
  const geulX = (z) => lagX + 1.6 * Math.sin(z * 0.2 + geulFase);
  // De springweide ligt aan de andere kant van het kamp dan de lagune.
  const weide = maakWeide(WEIDE, { x: W.kamp.x, z: W.kamp.z, h: kampH }, kant, ruw);
  // De benedenrivier (stap 10): van een bronnetje in de jungle naar de lagune.
  const rivier = maakRivier(RIVIER, { x: lagX, z: lagZ, straal: lagR }, kant, ruw, W.kamp);
  const rv = { h: 0, water: 0, oever: 0, pad: 0, gras: 0, vlak: 0 };
  // Het speelbos (stap 11): boomhutplatforms achter de oefenrots, aan de kant weg van de lagune.
  // Een eigen deelzaadje, zodat de rest van de wereld er niet door verandert.
  const speelbos = maakSpeelbos(SPEELBOS, W.kamp, kant, ruw, (zaadje ^ 0x5eedb05) >>> 0);
  const sb = { h: 0, vlak: 0, vijver: 0 };
  // De berg: ravijnen en hellingbaan kennen nu het laagland. Het zandpaadje begint achter de springweide.
  const padBegin = weide.naarWereld(0, weide.R + weide.B + 3);
  eiland.bouw(ruw, padBegin);
  const bg = /** @type {import('./eiland.js').BergUit} */ ({});
  // De rivier over de berg (stap 14): pas te bouwen als de berg er staat (ze volgt het landschap).
  /** @type {ReturnType<typeof maakBergrivier> | null} */
  let bergrivier = null;
  const br = { h: 0, water: 0, oever: 0, gras: 0, vlak: 0, wand: 0, dicht: 0, eiland: 0 };

  /**
   * Vult `uit` met de hoogte en de soort ondergrond op (x, z).
   * @param {number} x @param {number} z @param {Bodem} uit
   */
  function bodem(x, z, uit) {
    const d = kustAfstand(x, z);
    let h = ruw(x, z, d);
    const bosW = glad((d - S.breedte * 0.8) / 18);
    const fijn = lagenruis(x / W.fijneRuis.schaal, z / W.fijneRuis.schaal, zFijn, 2) * W.fijneRuis.hoogte * (0.3 + 0.7 * bosW);

    // De open plek: vlak gemaakt.
    const kw0 = 1 - glad((Math.hypot(x - W.kamp.x, z - W.kamp.z) - W.kamp.straal) / W.kamp.rand);
    h += (kampH - h) * kw0;
    const ow = rotsOpen(x, z);
    h += (rotsH - h) * ow;
    const kw = Math.max(kw0, ow);

    // Het paadje van het kamp naar het strand.
    let pw = 0;
    if (z < W.kamp.z + 3 && d > 0) {
      pw = (1 - glad(Math.abs(x - padX(z)) / W.pad.breedte)) * glad(d / 6) * (1 - glad((z - W.kamp.z) / 3));
    }

    // De lagune: een ronde kom met een ondiepe geul naar de zee.
    const ruisR = 1 + 0.18 * (waardenruis(x / 7, z / 7, zLagune) * 2 - 1);
    const dl = Math.hypot(x - lagX, z - lagZ) / (lagR * ruisR);
    const lagBodem = -L.diepte + (L.diepte + 0.5) * glad(dl);
    const lw = 1 - glad((dl - 0.85) / 0.5);
    h += (Math.min(h, lagBodem) - h) * lw;
    let gw = 0;
    if (z < lagZ && d > -4) gw = 1 - glad((Math.abs(x - geulX(z)) - L.geulBreedte * 0.5) / L.geulBreedte);
    h += (Math.min(h, -L.geulDiepte) - h) * gw;

    // De rivier: bedding, oevers en een paadje.
    rivier.stempel(x, z, h, rv);
    h = rv.h;

    // De springweide: vlak gemaakt, met de beek en de vijver erin gegraven.
    const st = weide.stempel(x, z, h);
    h = st.h;

    // Het speelbos: een vlakke bosvloer met een vijver.
    speelbos.stempel(x, z, h, sb);
    h = sb.h;

    // De berg: rotsrand, etage, bergtop, ravijnen en de hellingbaan met het zandpaadje ernaartoe.
    h = eiland.berg(x, z, h, bg);
    pw = Math.max(pw, bg.pad);

    // De rivier over de berg: haar bedding, oevers en de terrasjes bij de steigers.
    if (bergrivier) {
      bergrivier.stempel(x, z, h, br);
      h = br.h;
    } else br.water = br.oever = br.gras = br.vlak = br.wand = br.dicht = 0;

    uit.h = h + fijn * (1 - kw) * (1 - pw) * (1 - lw) * (1 - st.weide) * (1 - rv.vlak) * (1 - sb.vlak) * (1 - bg.vlak) * (1 - br.vlak);
    let zand = 1 - glad((d - S.breedte * 0.75) / 5);
    zand = Math.max(zand, 1 - glad((dl - 1.08) / 0.3), gw, st.nat, rv.oever, sb.vijver, br.oever);
    if (uit.h < 0.3) zand = 1;
    uit.zand = zand;
    uit.kamp = Math.max(kw, rv.gras, sb.vlak, bg.open, br.gras) * (1 - zand);
    uit.speelbos = sb.vlak;
    uit.vijver = sb.vijver;
    uit.rivier = Math.max(rv.water, br.water);
    uit.bergrivier = br.dicht;
    uit.oever = rv.oever;
    uit.weide = st.weide * (1 - zand) * (1 - kw);
    uit.baan = st.baan * (1 - zand);
    uit.nat = st.nat;
    uit.pad = Math.max(pw, st.pad, st.baan, rv.pad * (1 - rv.oever)) * (1 - zand);
    uit.lagune = lw;
    uit.bos = Math.max(0, 1 - zand - uit.kamp - uit.pad - uit.weide);
    uit.d = d;
    uit.wand = Math.max(bg.wand * (1 - br.vlak), br.wand);
    uit.voet = bg.voet * (1 - zand) * (1 - br.dicht);
    uit.berg = bg.berg;
    uit.top = bg.top;
    uit.ravijn = bg.ravijn;
    return uit;
  }

  const zonder = /** @type {Bodem} */ ({});
  const sbBezet = { h: 0, vlak: 0, vijver: 0 };
  bergrivier = maakBergrivier(BERGRIVIER, {
    eiland, beneden: rivier, kant, grond: (x, z) => bodem(x, z, zonder).h, kamp: W.kamp,
    // Het speelbos (de bosvloer en de vijver): daar komt het bruggetje niet (stap 14b).
    bezet: (x, z) => speelbos.peilOp(x, z) > -Infinity || speelbos.stempel(x, z, 0, sbBezet).vlak > 0.3,
  });

  // Het bergplan (stap 13): het netwerk van plekken en doorgangen, en de doorgangen op het eiland gezet
  // (ponypaden, klimwanden, oversteken). Een eigen deelzaadje.
  const bergplan = maakBergplan(eiland, BERGPLAN, (zaadje ^ 0xb3e9a1) >>> 0, { berg: bergrivier, beneden: rivier });
  const geplaatst = plaatsBergplan({
    eiland, plan: bergplan, bodem, laagland: ruw, D: BERGPLAN, HB: EILAND.hellingbaan, K: KLIMMEN, SB: SPEELBOS,
    zaadje: (zaadje ^ 0x9a7c1) >>> 0, waarom, rivieren: { berg: bergrivier, beneden: rivier },
  });

  const tijdelijk = /** @type {Bodem} */ ({});
  return {
    bergplan,
    bergwanden: geplaatst.bergwanden,
    oversteken: geplaatst.oversteken,
    bodem,
    hoogte: (x, z) => bodem(x, z, tijdelijk).h,
    kustZ,
    kustAfstand,
    eiland,
    lagune: { x: lagX, z: lagZ, straal: lagR },
    weide,
    rivier,
    bergrivier,
    /** Alle rivieren: de benedenrivier (0) en de rivier over de berg (1), die erin uitkomt. */
    rivieren: [rivier, bergrivier],
    speelbos,
    /** Het waterpeil op (x, z): 0 in zee en lagune, hoger in de rivieren en in de vijver van het speelbos. */
    waterOp: (x, z) => Math.max(rivier.peilOp(x, z), bergrivier.peilOp(x, z), speelbos.peilOp(x, z)),
    /** De stroming van de rivieren op (x, z) als snelheid [x, z]. */
    stroomOp(x, z, uit = [0, 0]) {
      bergrivier.stroomOp(x, z, uit);
      if (uit[0] === 0 && uit[1] === 0) rivier.stroomOp(x, z, uit);
      return uit;
    },
    kamp: { x: W.kamp.x, z: W.kamp.z, straal: W.kamp.straal, h: kampH },
  };
}
