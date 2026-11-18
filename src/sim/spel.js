// De simulatie: de hele speltoestand en één stap vooruit. Importeert nooit Three.js of de DOM.
import { maakZaadje } from '../kern/willekeur.js';
import { maakWereldvorm } from './wereld/hoogte.js';
import { maakTegelwereld } from './wereld/tegels.js';
import { maakBegroeiing } from './wereld/begroeiing.js';
import { maakGrond } from './wereld/grond.js';
import { maakBloesems, pakBloesems } from './wereld/bloesems.js';
import { BLOESEMS } from '../data/bloesems.js';
import { maakSpeler, legeIntentie } from './wezens/speler.js';
import { stapLopen } from './modi/lopen.js';
import { stapZwemmen } from './modi/zwemmen.js';
import { naarVeiligeGrond } from './modi/veilig.js';
import { WERELD } from '../data/wereld.js';
import { FLORA } from '../data/flora.js';
import { LOPEN, ZWEMMEN } from '../data/beweging.js';

/** @param {string|number} berg bergcode of zaadje */
export function maakSim(berg) {
  const zaadje = maakZaadje(berg);
  const vorm = maakWereldvorm(zaadje, WERELD);
  const hoogte = vorm.hoogte;
  const raster = maakTegelwereld(hoogte, WERELD.tegelGrootte, WERELD.rasterStap);
  const begroeiing = maakBegroeiing(vorm, FLORA, zaadje, WERELD.tegelGrootte);
  const grond = maakGrond(raster, begroeiing.rotsen);
  const wereld = {
    raster,       // hoogteOp / hellingOp over alle tegels
    vorm,         // de hoogtefunctie en wat er ligt (zand, gras, bos, lagune)
    begroeiing,   // waar de planten staan
    grens: WERELD.speelGrens,
    stammen: begroeiing.stammen,
    grondOp: grond.grondOp, // terrein met rotsen: waar je op staat
    rotsOp: grond.rotsOp,
  };
  wereld.bloesems = maakBloesems(vorm, { grondOp: grond.grondOp, rotsen: begroeiing.rotsen, tegelGrootte: WERELD.tegelGrootte }, zaadje, BLOESEMS);

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
      const s = maakSpeler(id, x, grond.grondOp(x, z), z);
      spelers.push(s);
      return s;
    },

    /** Plof: speler terug naar de laatste veilige grond. */
    terug(id) {
      naarVeiligeGrond(this.speler(id), meld);
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
        if (s.modus === 'lopen') stapLopen(s, int, wereld, LOPEN, dt, meld, ZWEMMEN);
        else if (s.modus === 'zwemmen') stapZwemmen(s, int, wereld, ZWEMMEN, dt, meld);
        pakBloesems(s, wereld.bloesems, BLOESEMS, dt, meld);
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
