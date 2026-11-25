// De dakvleugel van de oefenrots (stap 15a, KL 3): een rots die tegen de oefenrots aan groeit, aan de kant van de
// lagune, met een profiel van onder naar boven: plaat, verticaal (met een richel), overhang, dak, dakrand en kopwand.
// Eén handgemaakte dakroute. Dezelfde wandkaart als de oefenrots (sim/klimmen/oefenrots.js), maar gevouwen langs het
// profiel (sim/klimmen/profiel.js), zodat het klimmen, het beeld en de bediening op elke wand hetzelfde werken.
// Geen Three.js.
import { maakProfiel, maakVouw } from './profiel.js';

/**
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {ReturnType<typeof import('./oefenrots.js').maakOefenrots>} oefenrots
 * @param {number} kant de kant van de lagune (-1 of 1, zoals in de wereldvorm)
 */
export function maakDakrots(K, oefenrots, kant) {
  const D = K.dakrots;
  const B = D.breedte;
  const profiel = maakProfiel(D.profiel, D.overgang);
  const lengte = profiel.lengte;
  const voetHoogte = oefenrots.voetHoogte;
  // Zelfde richting als de oefenrots; opzij naar de lagune. Rv wijst naar rechts zoals je naar de wand kijkt.
  const N = [...oefenrots.N];
  const Rv = [...oefenrots.R];
  const zijR = kant * Math.sign(Rv[0] || 1); // langs +Rv (1) of -Rv (-1) ligt de lagune
  const midden = [
    oefenrots.midden[0] + Rv[0] * D.opzij * zijR + N[0] * D.voor,
    voetHoogte,
    oefenrots.midden[2] + Rv[2] * D.opzij * zijR + N[2] * D.voor,
  ];
  const O = [midden[0] - Rv[0] * B * 0.5, voetHoogte, midden[2] - Rv[2] * B * 0.5];
  const vouw = maakVouw(O, N, Rv, profiel);

  /** Van de wereld naar de wandkaart aan de voet: [u, hoogte, voor de wandvoet] (voor het botsen). */
  function naarKaart(x, y, z) {
    const dx = x - O[0];
    const dz = z - O[2];
    return [dx * Rv[0] + dz * Rv[2], y - O[1], dx * N[0] + dz * N[2]];
  }

  // --- De route en de richels ---
  const r = D.route;
  /** @type {(import('./oefenrots.js').Greep & { richting?: number, lip?: boolean, hak?: boolean, richel?: number })[]} */
  const grepen = [];
  const ids = r.grepen.map(([u, v, soort, richting, extra], i) => {
    const g = {
      id: grepen.length, u, v, soort, route: 0, top: i === r.top, start: r.start.indexOf(i),
      richting: richting ?? K.grepen[soort]?.richting ?? 0,
      lip: extra === 'lip',
      // Kan een voet hier haken? (KL 5: in het dak en op de dakrand)
      hak: profiel.hoek(v) >= K.dak.hakVanaf,
    };
    if (soort === 'zijgreep' && richting == null) g.richting = (u < B / 2 ? 1 : -1) * K.grepen.zijgreep.richting;
    grepen.push(g);
    return g.id;
  });
  const startU = (r.grepen[r.start[0]][0] + r.grepen[r.start[1]][0]) / 2;
  const routes = [{
    ...r,
    ids,
    startGrepen: r.start.map((i) => ids[i]),
    topGreep: ids[r.top],
    startU,
    voet: vouw.naarWereld(startU, 0, 0.75),
  }];
  const richels = D.richels.map((q) => ({ ...q }));

  // De hoogste punten van het profiel: de bovenrand van de kopwand, en de dakrand (voor het touw).
  const topY = profiel.y(lengte);
  const topZ = profiel.z(lengte);
  const dakZone = D.profiel.findIndex((z) => z.hoek >= 60);
  const randV = dakZone >= 0 ? profiel.grens[dakZone + 1] : null; // v van de dakrand (midden van de knik)

  /**
   * De rots als blok om tegen te botsen: alleen de voet (achter de wandvoet); onder het dak loop je vrij.
   * Afgeronde hoeken, zodat je er vlot langs loopt.
   */
  function blokOp(x, z) {
    const [u, , voor] = naarKaart(x, voetHoogte, z);
    const diep = -voor;
    const halfB = B / 2 + D.rand;
    const q0 = Math.max(0, Math.abs(u - B / 2) - (halfB - 1));
    const q1 = Math.max(0, Math.abs(diep - D.diepte / 2) - (D.diepte / 2 - 1));
    if (diep < -0.15 || q0 * q0 + q1 * q1 > 0.85 * 0.85) return -Infinity;
    return voetHoogte + topY;
  }

  return {
    soort: 'dakrots',
    profiel,
    maat: {
      breedte: B, hoogte: topY, diepte: D.diepte, rand: D.rand, kleur: D.kleur, kleurDonker: D.kleurDonker,
      kleurLaag: D.kleurLaag, mos: D.mos, gloed: K.rots.gloed, greepGloed: K.rots.greepGloed, bosjes: D.bosjes, palmen: D.palmen,
      bovenaan: 0.7, bult: [0.9, 0.4],
    },
    uitstap: null,
    breedte: B,
    /** De lengte van de wandkaart (langs de wand gemeten, van de voet tot de bovenrand). */
    hoogte: lengte,
    diepte: D.diepte,
    voetHoogte,
    N,
    R: Rv,
    O,
    midden,
    grepen,
    routes,
    richels,
    naarWereld: vouw.naarWereld,
    normaal: vouw.normaal,
    raak: vouw.raak,
    naarKaart,
    blokOp,
    /** Steilte op plaats v langs de wand (KL 5). */
    steilte: profiel.steilte,
    wandHoek: profiel.hoek,
    zone: profiel.zone,
    randV,
    /** Het topanker: boven op de kopwand. */
    anker: () => {
      const t = grepen[routes[0].topGreep];
      return [t.u, lengte - 0.06];
    },
    zekerVoor: D.zekerVoor,
    zekeraar: vouw.naarWereld(B / 2 + K.zekeraar.opzij, 0, D.zekerVoor - 1),
    topY,
    topZ,
  };
}
