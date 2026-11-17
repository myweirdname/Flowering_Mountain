// De simulatie: de hele speltoestand en één stap vooruit. Importeert nooit Three.js of de DOM.
import { maakZaadje } from '../kern/willekeur.js';
import { maakHoogtefunctie } from './wereld/hoogte.js';
import { maakRaster } from './wereld/raster.js';
import { maakSpeler, legeIntentie } from './wezens/speler.js';
import { stapLopen } from './modi/lopen.js';
import { TERREIN } from '../data/terrein.js';
import { LOPEN } from '../data/beweging.js';

/** @param {string|number} berg bergcode of zaadje */
export function maakSim(berg) {
  const zaadje = maakZaadje(berg);
  const hoogte = maakHoogtefunctie(zaadje, TERREIN);
  const raster = maakRaster(hoogte, TERREIN.grootte, TERREIN.rasterStap);
  const wereld = { raster, grens: TERREIN.grootte / 2 - TERREIN.rand };

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
      const s = maakSpeler(id, 0, raster.hoogteOp(0, 0), 0);
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
