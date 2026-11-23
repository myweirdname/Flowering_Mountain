// De hoogtefunctie hoogte(x, z) van de kampplek (TP 5.2): zee, strand, baai, lagune met geul,
// een open plek in de jungle, een zandpaadje en junglebulten die naar de berg oplopen.
// Daarnaast geeft bodem() per plek ook wat er ligt (zand, gras, pad, bos), voor kleur en planten.
// In stap 12 groeit dit uit tot het hele eiland; de vorm van de functie blijft dezelfde.
import { maakWillekeur } from '../../kern/willekeur.js';
import { lagenruis, waardenruis } from './ruis.js';
import { maakWeide } from './springweide.js';
import { WEIDE } from '../../data/springweide.js';
import { KLIMMEN } from '../../data/klimmen.js';

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @typedef {{ h:number, zand:number, kamp:number, pad:number, bos:number, lagune:number, d:number,
 *             weide:number, baan:number, nat:number }} Bodem
 */

/**
 * @param {number} zaadje
 * @param {typeof import('../../data/wereld.js').WERELD} W
 */
export function maakWereldvorm(zaadje, W) {
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

  /** Ruwe landvorm zonder stempels en fijne ruis. */
  function ruw(x, z) {
    const d = z - kustZ(x);
    let h = d < 0 ? d * S.helling - S.zeeDiepte * glad(-d / 40) : S.hoogte * glad(d / S.breedte) + d * J.stijging;
    const bosW = glad((d - J.heuvelStart) / J.heuvelOvergang);
    h += J.heuvels * (lagenruis(x / J.heuvelSchaal, z / J.heuvelSchaal, zHeuvel, 3) * 0.5 + 0.5) * bosW;
    h += J.bergHoogte * glad((z - J.bergStart) / J.bergSchaal);
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

  /**
   * Vult `uit` met de hoogte en de soort ondergrond op (x, z).
   * @param {number} x @param {number} z @param {Bodem} uit
   */
  function bodem(x, z, uit) {
    const kz = kustZ(x);
    const d = z - kz;
    let h = ruw(x, z);
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

    // De springweide: vlak gemaakt, met de beek en de vijver erin gegraven.
    const st = weide.stempel(x, z, h);
    h = st.h;

    uit.h = h + fijn * (1 - kw) * (1 - pw) * (1 - lw) * (1 - st.weide);
    let zand = 1 - glad((d - S.breedte * 0.75) / 5);
    zand = Math.max(zand, 1 - glad((dl - 1.08) / 0.3), gw, st.nat);
    if (uit.h < 0.3) zand = 1;
    uit.zand = zand;
    uit.kamp = kw * (1 - zand);
    uit.weide = st.weide * (1 - zand) * (1 - kw);
    uit.baan = st.baan * (1 - zand);
    uit.nat = st.nat;
    uit.pad = Math.max(pw, st.pad, st.baan) * (1 - zand);
    uit.lagune = lw;
    uit.bos = Math.max(0, 1 - zand - uit.kamp - uit.pad - uit.weide);
    uit.d = d;
    return uit;
  }

  const tijdelijk = /** @type {Bodem} */ ({});
  return {
    bodem,
    hoogte: (x, z) => bodem(x, z, tijdelijk).h,
    kustZ,
    lagune: { x: lagX, z: lagZ, straal: lagR },
    weide,
    kamp: { x: W.kamp.x, z: W.kamp.z, straal: W.kamp.straal, h: kampH },
  };
}
