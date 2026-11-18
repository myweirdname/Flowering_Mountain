// De simulatie: de hele speltoestand en één stap vooruit. Importeert nooit Three.js of de DOM.
import { maakZaadje } from '../kern/willekeur.js';
import { maakWereldvorm } from './wereld/hoogte.js';
import { maakTegelwereld } from './wereld/tegels.js';
import { maakBegroeiing } from './wereld/begroeiing.js';
import { maakGrond } from './wereld/grond.js';
import { maakBloesems, pakBloesems } from './wereld/bloesems.js';
import { BLOESEMS } from '../data/bloesems.js';
import { maakSpeler, legeIntentie } from './wezens/speler.js';
import { maakPony } from './wezens/pony.js';
import { stapLopen } from './modi/lopen.js';
import { stapZwemmen } from './modi/zwemmen.js';
import { naarVeiligeGrond } from './modi/veilig.js';
import { stapRijden, stapPonyVrij, stapOp, stapAf, verschijn } from './modi/rijden.js';
import { maakRonde, werkRondeBij, stopRonde, hindernisGesprongen, maakWortels, stapWortels } from './modi/ronde.js';
import { WERELD } from '../data/wereld.js';
import { FLORA } from '../data/flora.js';
import { LOPEN, ZWEMMEN } from '../data/beweging.js';
import { RIJDEN } from '../data/rijden.js';

/** @param {string|number} berg bergcode of zaadje */
export function maakSim(berg) {
  const zaadje = maakZaadje(berg);
  const vorm = maakWereldvorm(zaadje, WERELD);
  const hoogte = vorm.hoogte;
  const raster = maakTegelwereld(hoogte, WERELD.tegelGrootte, WERELD.rasterStap);
  const begroeiing = maakBegroeiing(vorm, FLORA, zaadje, WERELD.tegelGrootte);
  const weide = vorm.weide;
  const grond = maakGrond(raster, begroeiing.rotsen, (x, z) => weide.hindernisOp(x, z));
  const wereld = {
    raster,       // hoogteOp / hellingOp over alle tegels
    vorm,         // de hoogtefunctie en wat er ligt (zand, gras, bos, lagune, weide)
    begroeiing,   // waar de planten staan
    grens: WERELD.speelGrens,
    stammen: begroeiing.stammen,
    grondOp: grond.grondOp,     // terrein met rotsen en hindernissen: waar je op staat
    terreinOp: grond.terreinOp, // zonder de hindernissen (de pony springt erover)
    rotsOp: grond.rotsOp,
    weide,        // de springweide: baan, hindernissen, water
  };
  // Boven elke hindernis zweeft een bloesem: wie er met de pony over springt, pakt hem.
  const boven = weide.groepen.map((gr) => {
    const delen = gr.delen.map((i) => weide.delen[i]);
    const x = delen.reduce((a, d) => a + d.x, 0) / delen.length;
    const z = delen.reduce((a, d) => a + d.z, 0) / delen.length;
    return { x, z, y: weide.hoogte + BLOESEMS.bovenHindernis };
  });
  wereld.bloesems = maakBloesems(vorm, { grondOp: grond.grondOp, rotsen: begroeiing.rotsen, tegelGrootte: WERELD.tegelGrootte }, zaadje, BLOESEMS, boven);
  const wortels = maakWortels(weide);

  /** @type {import('./wezens/speler.js').Speler[]} */
  const spelers = [];
  /** @type {import('./wezens/pony.js').Pony[]} */
  const ponies = [];
  /** @type {any[]} */
  let gebeurtenissen = [];
  const meld = (g) => gebeurtenissen.push(g);
  let tik = 0;

  const ponyVan = (s) => ponies.find((p) => p.eigenaar === s.id);
  const ponyOnder = (s) => (s.rijdt ? ponies.find((p) => p.id === s.rijdt) : null);
  const bewaarVorige = (o) => {
    o.vorigePos[0] = o.pos[0];
    o.vorigePos[1] = o.pos[1];
    o.vorigePos[2] = o.pos[2];
    o.vorigeRichting = o.richting;
  };

  /** Wat de actieknop nu zou doen voor deze speler. */
  function actieVoor(s) {
    if (s.modus === 'rijden') return 'afstappen';
    const p = ponyVan(s);
    if (!p || p.ruiter || s.modus !== 'lopen' || !s.opGrond || s.klimt || !p.opGrond || p.weigert > 0) return null;
    const d = Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]);
    return d < RIJDEN.opstapAfstand && Math.abs(p.pos[1] - s.pos[1]) < 1 ? 'opstappen' : null;
  }

  return {
    berg,
    zaadje,
    hoogte,
    wereld,
    spelers,
    ponies,
    wortels,

    voegSpelerToe(id) {
      const x = vorm.kamp.x;
      const z = vorm.kamp.z + 3;
      const s = maakSpeler(id, x, grond.grondOp(x, z), z);
      s.ronde = maakRonde();
      spelers.push(s);
      // Elke speler krijgt een eigen pony; ze staat naast het kamp, aan de kant van de springweide.
      const px = vorm.kamp.x + weide.su * 3.6;
      const pz = vorm.kamp.z + 1.2;
      ponies.push(maakPony('pony-' + id, id, px, grond.terreinOp(px, pz), pz, Math.atan2(-weide.su, 0.4), RIJDEN.galopStart));
      return s;
    },

    /** Plof: speler terug naar de laatste veilige grond (van de pony af als je erop zit). */
    terug(id) {
      const s = this.speler(id);
      const p = ponyOnder(s);
      if (p) {
        stapAf(s, p, wereld, meld);
        stopRonde(s.ronde, s.id, meld);
      }
      naarVeiligeGrond(s, meld);
    },

    speler(id) {
      return spelers.find((s) => s.id === id);
    },

    /** De pony van een speler. */
    pony(id) {
      return ponyVan(this.speler(id));
    },

    /** Wat de actieknop nu doet: 'opstappen', 'afstappen' of null. */
    actieVoor(id) {
      return actieVoor(this.speler(id));
    },

    /** Zet de pony van een speler op (x, z) (voor tests). */
    zetPony(id, x, z, richting = 0) {
      const p = ponyVan(this.speler(id));
      const y = grond.terreinOp(x, z);
      Object.assign(p, {
        pos: [x, y, z], vorigePos: [x, y, z], vel: [0, 0, 0], snelheid: 0, richting, vorigeRichting: richting,
        opGrond: true, sprong: null, weigert: 0, modus: 'staat', veilig: [x, y, z],
      });
      const s = this.speler(id);
      if (s.rijdt === p.id) {
        s.pos = [x, y, z];
        s.vorigePos = [x, y, z];
        s.richting = s.vorigeRichting = richting;
      }
    },

    /** Meteen opstappen (aan = true) of afstappen (voor tests). */
    rijd(id, aan = true) {
      const s = this.speler(id);
      const p = ponyVan(s);
      if (aan && s.modus !== 'rijden') stapOp(s, p, meld);
      else if (!aan && s.modus === 'rijden') {
        stapAf(s, p, wereld, meld);
        stopRonde(s.ronde, s.id, meld);
      }
    },

    /**
     * Eén vaste tijdstap.
     * @param {Record<string, import('./wezens/speler.js').Intentie>} intenties per speler-id
     * @param {number} dt
     */
    stap(intenties, dt) {
      tik++;
      const begin = gebeurtenissen.length;
      for (const s of spelers) {
        bewaarVorige(s);
        const int = intenties[s.id] ?? legeIntentie();
        const p = ponyVan(s);

        // Fluiten: de pony komt aangedraafd (of zoekt zelf een weg als ze ver weg is).
        const fluitNu = !!int.fluit && !s.fluitVorige;
        s.fluitVorige = !!int.fluit;
        if (fluitNu && p && !p.ruiter) {
          meld({ soort: 'fluit', speler: s.id, pos: [...s.pos] });
          const d = Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]);
          if (d > RIJDEN.verFluit) verschijn(p, s, wereld, RIJDEN, meld);
          else if (d < RIJDEN.komtStop + 1.2) meld({ soort: 'ponyErBij', pony: p.id, speler: s.id });
          else Object.assign(p, { modus: 'komt', vastTijd: 0, vorigeAfstand: d, graast: false });
        }

        // De actieknop: opstappen, of (al rijdend) afstappen zodra ze stilstaat.
        const actieNu = !!int.actie && !s.actieVorige;
        s.actieVorige = !!int.actie;
        if (actieNu) {
          const wat = actieVoor(s);
          if (wat === 'opstappen') stapOp(s, p, meld);
          else if (wat === 'afstappen') ponyOnder(s).stopt = true;
        }

        // Aaien kan altijd: dichtbij, of zittend op haar rug.
        if (int.aai && p && (p.ruiter === s.id || Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) < 3.5)) {
          p.graast = false;
          meld({ soort: 'aai', speler: s.id, pony: p.id, pos: [...p.pos], rijdend: p.ruiter === s.id });
        }

        if (s.modus === 'lopen') stapLopen(s, int, wereld, LOPEN, dt, meld, ZWEMMEN);
        else if (s.modus === 'zwemmen') stapZwemmen(s, int, wereld, ZWEMMEN, dt, meld);
        else if (s.modus === 'rijden') {
          const q = ponyOnder(s);
          bewaarVorige(q);
          stapRijden(s, q, int, wereld, RIJDEN, dt, meld);
          werkRondeBij(s.ronde, q, weide, tik * dt, s.id, meld);
          if (q.stopt && q.opGrond && q.weigert <= 0 && Math.abs(q.snelheid) < RIJDEN.afstapSnelheid) {
            stapAf(s, q, wereld, meld);
            stopRonde(s.ronde, s.id, meld);
          }
        }
        pakBloesems(s, wereld.bloesems, BLOESEMS, dt, meld);
      }

      // Pony's waar niemand op zit.
      for (const p of ponies) {
        if (p.ruiter) continue;
        bewaarVorige(p);
        stapPonyVrij(p, spelers.find((s) => s.id === p.eigenaar), wereld, RIJDEN, dt, meld);
      }
      stapWortels(wortels, ponies, RIJDEN, dt, meld);

      // Gesprongen hindernissen en weigeringen van deze stap tellen mee in de ronde van de ruiter.
      for (let i = begin; i < gebeurtenissen.length; i++) {
        const g = gebeurtenissen[i];
        if (g.soort !== 'hindernis' && g.soort !== 'weigeren') continue;
        const s = spelers.find((q) => q.id === g.speler);
        if (!s || s.modus !== 'rijden') continue;
        if (g.soort === 'hindernis') hindernisGesprongen(s.ronde, weide, g.deel, g.perfect, s.id, meld);
        else if (s.ronde.bezig) s.ronde.weigeringen++;
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
