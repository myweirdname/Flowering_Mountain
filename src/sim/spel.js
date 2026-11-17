// De simulatie: de hele speltoestand en één stap vooruit. Importeert nooit Three.js of de DOM.
import { maakZaadje } from '../kern/willekeur.js';
import { maakWereldvorm } from './wereld/hoogte.js';
import { maakTegelwereld } from './wereld/tegels.js';
import { maakBegroeiing } from './wereld/begroeiing.js';
import { maakSpeler, legeIntentie } from './wezens/speler.js';
import { stapLopen } from './modi/lopen.js';
import { WERELD } from '../data/wereld.js';
import { FLORA } from '../data/flora.js';
import { LOPEN } from '../data/beweging.js';

/** @param {string|number} berg bergcode of zaadje */
export function maakSim(berg) {
  const zaadje = maakZaadje(berg);
  const vorm = maakWereldvorm(zaadje, WERELD);
  const hoogte = vorm.hoogte;
  const raster = maakTegelwereld(hoogte, WERELD.tegelGrootte, WERELD.rasterStap);
  const begroeiing = maakBegroeiing(vorm, FLORA, zaadje, WERELD.tegelGrootte);
  const wereld = {
    raster,       // hoogteOp / hellingOp over alle tegels
    vorm,         // de hoogtefunctie en wat er ligt (zand, gras, bos, lagune)
    begroeiing,   // waar de planten staan
    grens: WERELD.speelGrens,
    maxDiepte: WERELD.waterDiepteMax,
    stammen: begroeiing.stammen,
  };

  /** @type {import('./wezens/speler.js').Speler[]} */
  const spelers = [];
  /** @type {object[]} */
  let gebeurtenissen = [];
  const meld = (g) => gebeurtenissen.push(g);
  let tik = 0;

  return {
    berg,
    zaadje,
    hoogte,
    wereld,
    spelers,

    voegSpelerToe(id) {
      const x = vorm.kamp.x;
      const z = vorm.kamp.z + 3;
      const s = maakSpeler(id, x, raster.hoogteOp(x, z), z);
      spelers.push(s);
      return s;
    },

    speler(id) {
      return spelers.find((s) => s.id === id);
    },

    /**
     * Eén vaste tijdstap.
     * @param {Record<string, import('./wezens/speler.js').Intentie>} intenties per speler-id
     * @param {number} dt
     */
    stap(intenties, dt) {
      tik++;
      for (const s of spelers) {
        s.vorigePos[0] = s.pos[0];
        s.vorigePos[1] = s.pos[1];
        s.vorigePos[2] = s.pos[2];
        s.vorigeRichting = s.richting;
        const int = intenties[s.id] ?? legeIntentie();
        if (s.modus === 'lopen') stapLopen(s, int, wereld, LOPEN, dt, meld);
      }
    },

    /** Haalt de gebeurtenissen van sinds de vorige oproep op. */
    neemGebeurtenissen() {
      const g = gebeurtenissen;
      gebeurtenissen = [];
      return g;
    },

    get tik() {
      return tik;
    },
  };
}
