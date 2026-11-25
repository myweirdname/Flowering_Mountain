// Een klimwand op de rotsrand (stap 13, GD 3, KL 10 eenvoudig): een verticale rotspijler voor de rotsrand,
// met gegenereerde gekleurde routes waarin elke zet binnen bereik ligt. Dezelfde wandkaart als de oefenrots
// (sim/klimmen/oefenrots.js), zodat het klimmen, het beeld en de bediening op elke wand werken. Bovenaan stap
// je uit op de etage. In stap 15b komt er een echte wandgenerator met de klimbot; die vervangt deze wanden.
// Geen Three.js.
import { maakProfiel } from './profiel.js';

/**
 * @param {typeof import('../../data/bergplan.js').BERGPLAN.klimwand} BW
 * @param {{ midden: [number, number], N: [number, number], voetH: number, hoogte: number, diep: number }} plaats
 *   midden = het midden van de wandvoet (x, z), N = de richting uit de wand, diep = hoe ver de pijler naar achter loopt
 * @param {typeof import('../../data/klimmen.js').KLIMMEN} K
 * @param {{ geheel: (n: number) => number }} w willekeur met zaadje
 */
export function maakBergwand(BW, plaats, K, w) {
  const B = BW.breedte;
  const H = plaats.hoogte;
  const voetHoogte = plaats.voetH;
  // N wijst uit de wand, Rv naar rechts zoals je ernaar kijkt (zoals bij de oefenrots).
  const N = [plaats.N[0], 0, plaats.N[1]];
  const Rv = [N[2], 0, -N[0]];
  const midden = [plaats.midden[0], voetHoogte, plaats.midden[1]];
  const O = [midden[0] - Rv[0] * B * 0.5, voetHoogte, midden[2] - Rv[2] * B * 0.5];

  function naarWereld(u, v, uit = 0, doel = [0, 0, 0]) {
    doel[0] = O[0] + Rv[0] * u + N[0] * uit;
    doel[1] = O[1] + v;
    doel[2] = O[2] + Rv[2] * u + N[2] * uit;
    return doel;
  }
  function naarKaart(x, y, z) {
    const dx = x - O[0];
    const dz = z - O[2];
    return [dx * Rv[0] + dz * Rv[2], y - O[1], dx * N[0] + dz * N[2]];
  }

  // --- De routes, vanuit de oplossing (TP 5.3): handgrepen om en om links en rechts, nooit verder dan een
  // gewone zet, en voetgrepen ertussen. Met de afmetingen van de gele route op de oefenrots (stap 9). ---
  const kies = ([a, b]) => (a + w.geheel(b - a + 1)) / 100;
  /** @type {import('./oefenrots.js').Greep[]} */
  const grepen = [];
  const routes = BW.routes.map((r, ri) => {
    const lijst = [];
    const u0 = r.u;
    // Twee startgrepen naast elkaar.
    const z0 = kies(r.zij);
    lijst.push([u0 - z0 * 0.85, 1.15, r.grepen[0]], [u0 + z0 * 0.85, 1.2, r.grepen[0]]);
    const topV = H - BW.topOnder;
    // Eerst de stappen kiezen tot aan de top, dan allemaal een beetje kleiner maken zodat de laatste
    // precies op de topgreep uitkomt: zo is geen enkele zet groter dan gekozen.
    const stappen = [];
    let som = 0;
    while (som < topV - 1.2) {
      const st = kies(r.stap);
      stappen.push(st);
      som += st;
    }
    const schaal = (topV - 1.2) / som;
    let v = 1.2;
    let kant = -1;
    let rust = r.rust;
    stappen.forEach((st, i) => {
      v += st * schaal;
      if (i === stappen.length - 1) return; // de laatste is de topgreep
      let soort = r.grepen[w.geheel(r.grepen.length)];
      if (r.rust > 0 && v >= rust) {
        soort = 'bak'; // een rustbak om uit te schudden
        rust += r.rust;
      }
      lijst.push([u0 + kant * kies(r.zij), v, soort]);
      kant = -kant;
    });
    const top = lijst.length;
    lijst.push([u0, topV, 'bak']);
    // Voetgrepen: om en om, vlak naast het midden.
    let kv = 0.32;
    let vk = -1;
    while (kv < topV - 1.1) {
      lijst.push([u0 + vk * 0.17, kv, 'voet']);
      kv += BW.voetStap;
      vk = -vk;
    }
    const ids = lijst.map(([u, vv, soort], i) => {
      const g = { id: grepen.length, u, v: vv, soort, route: ri, top: i === top, start: i < 2 ? i : -1, richting: 0, hak: false };
      grepen.push(g);
      return g.id;
    });
    return {
      naam: r.naam, graad: r.graad, kleur: r.kleur,
      grepen: lijst, start: [0, 1], top,
      ids,
      startGrepen: [ids[0], ids[1]],
      topGreep: ids[top],
      startU: u0,
      voet: naarWereld(u0, 0, 0.75),
    };
  });

  /** De pijler als blok: de bovenkant op (x, z), of -Infinity ernaast. Afgeronde hoeken. */
  function blokOp(x, z) {
    const [u, , voor] = naarKaart(x, voetHoogte, z);
    const diep = -voor;
    const halfB = B / 2 + BW.rand;
    const q0 = Math.max(0, Math.abs(u - B / 2) - (halfB - 1));
    const q1 = Math.max(0, Math.abs(diep - plaats.diep / 2) - (plaats.diep / 2 - 1));
    if (diep < 0 || q0 * q0 + q1 * q1 > 0.85 * 0.85) return -Infinity;
    return voetHoogte + H;
  }

  return {
    soort: 'bergwand',
    breedte: B,
    hoogte: H,
    diepte: plaats.diep,
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
    steilte: () => 0,
    profiel: maakProfiel([{ soort: 'verticaal', lengte: H, hoek: 0 }]),
    wandHoek: () => 0,
    zone: () => 'verticaal',
    normaal: (v, d = [0, 0, 0]) => ((d[0] = N[0]), (d[1] = 0), (d[2] = N[2]), d),
    raak: (v, d = [0, 0, 0]) => ((d[0] = 0), (d[1] = 1), (d[2] = 0), d),
    richels: [],
    randV: null,
    zekerVoor: K.zekeraar.zekerVoor,
    anker: (ri) => {
      const t = grepen[routes[ri].topGreep];
      return [t.u, H - 0.02];
    },
    zekeraar: naarWereld(B / 2 + K.zekeraar.opzij, 0, K.zekeraar.voor),
    /** Bovenaan uitstappen: hier sta je daarna op de pijler, met je neus naar de berg. */
    uitstap: (ri) => naarWereld(routes[ri].startU, H, -BW.uitstap),
    /** Voor het beeld: de maten en kleuren van de pijler. */
    maat: {
      breedte: B, hoogte: H, diepte: plaats.diep, rand: BW.rand, kleur: BW.kleur, kleurDonker: BW.kleurDonker,
      kleurLaag: BW.kleurLaag, mos: BW.mos, gloed: K.rots.gloed, greepGloed: K.rots.greepGloed, bosjes: [], palmen: [],
      bovenaan: 0.02, bult: [0.3, 1], // vlak bovenop: je stapt er uit en loopt erover
    },
  };
}
