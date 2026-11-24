// De oefenrots bij het kamp (stap 9, GD 14): een verticale wand met drie gekleurde routes.
// Hier staat de wandkaart (KL 2): de platte rekenlaag achter de 3D-wand. Een plek op de kaart is (u, v):
// u = meter vanaf de linkerrand (zoals je naar de wand kijkt), v = meter boven de voet. De steilte is een
// eigenschap van de plaats op de kaart; de oefenrots is overal verticaal (steilte 0). Geen Three.js.

/**
 * @typedef {{ id: number, u: number, v: number, soort: string, route: number, top: boolean, start: number }} Greep
 * start: -1, of 0 (linkerhand) / 1 (rechterhand) als dit een startgreep is.
 */

/**
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {{ x: number, z: number }} kamp
 * @param {number} voetHoogte hoogte van de grond aan de voet van de wand
 */
export function maakOefenrots(K, kamp, voetHoogte) {
  const R = K.rots;
  const a = R.richting;
  // N wijst uit de wand (naar het kamp), Rv naar rechts zoals je ernaar kijkt.
  const N = [-Math.sin(a), 0, -Math.cos(a)];
  const Rv = [-Math.cos(a), 0, Math.sin(a)];
  const midden = [kamp.x + R.plek.dx, voetHoogte, kamp.z + R.plek.dz];
  const O = [midden[0] - Rv[0] * R.breedte * 0.5, voetHoogte, midden[2] - Rv[2] * R.breedte * 0.5];

  /** Van de wandkaart naar de wereld; `uit` = zoveel meter voor de wand. */
  function naarWereld(u, v, uit = 0, doel = [0, 0, 0]) {
    doel[0] = O[0] + Rv[0] * u + N[0] * uit;
    doel[1] = O[1] + v;
    doel[2] = O[2] + Rv[2] * u + N[2] * uit;
    return doel;
  }
  /** Van de wereld naar de wandkaart: [u, v, voor de wand]. */
  function naarKaart(x, y, z) {
    const dx = x - O[0];
    const dz = z - O[2];
    return [dx * Rv[0] + dz * Rv[2], y - O[1], dx * N[0] + dz * N[2]];
  }

  /** @type {Greep[]} */
  const grepen = [];
  const routes = K.routes.map((r, ri) => {
    const ids = r.grepen.map(([u, v, soort], i) => {
      const g = { id: grepen.length, u, v, soort, route: ri, top: i === r.top, start: r.start.indexOf(i) };
      grepen.push(g);
      return g.id;
    });
    const startU = (r.grepen[r.start[0]][0] + r.grepen[r.start[1]][0]) / 2;
    return {
      ...r,
      ids,
      startGrepen: r.start.map((i) => ids[i]),
      topGreep: ids[r.top],
      startU,
      // Hier sta je om te beginnen: net voor de wand, onder de startgrepen.
      voet: naarWereld(startU, 0, 0.75),
    };
  });

  /**
   * De rots als blok om tegen te botsen: de hoogte van de bovenkant op (x, z), of -Infinity naast de rots.
   * Afgeronde hoeken, zodat je er vlot langs loopt.
   */
  function blokOp(x, z) {
    const [u, , voor] = naarKaart(x, voetHoogte, z);
    const diep = -voor;
    // Even groot als de getekende rots (beeld/maak/oefenrots.js): een afgeronde rechthoek die aan elke kant
    // `R.rand` voorbij de klimwand uitsteekt, met afgeronde hoeken (straal 1 m).
    const halfB = R.breedte / 2 + R.rand;
    const q0 = Math.max(0, Math.abs(u - R.breedte / 2) - (halfB - 1));
    const q1 = Math.max(0, Math.abs(diep - R.diepte / 2) - (R.diepte / 2 - 1));
    if (diep < 0 || q0 * q0 + q1 * q1 > 0.85 * 0.85) return -Infinity;
    return voetHoogte + R.hoogte;
  }

  return {
    soort: 'oefenrots',
    /** Voor het beeld: de maten en kleuren van de rots (een bergwand heeft hetzelfde, sim/klimmen/bergwand.js). */
    maat: R,
    /** Bovenaan uitstappen kan hier niet: de witte tijger laat je zakken. */
    uitstap: null,
    breedte: R.breedte,
    hoogte: R.hoogte,
    diepte: R.diepte,
    voetHoogte,
    N,
    R: Rv,
    O,
    midden,
    grepen,
    routes,
    naarWereld,
    naarKaart,
    blokOp,
    /** Steilte op hoogte v (KL 5): -0,3 plaat, 0 verticaal, 1 dak. De oefenrots is verticaal. */
    steilte: () => 0,
    /** De topankers: waar het touw van elke route bovenaan doorloopt. */
    anker: (ri) => {
      const t = grepen[routes[ri].topGreep];
      return [t.u, R.hoogte - 0.02];
    },
    /** Waar de witte tijger zit om te zekeren (voor de middelste route). */
    zekeraar: naarWereld(R.breedte / 2 + K.zekeraar.opzij, 0, K.zekeraar.voor),
  };
}
