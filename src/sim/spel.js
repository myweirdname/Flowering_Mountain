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
import { GEZEL } from '../data/tijger.js';
import { maakPadvinder } from './wereld/pad.js';
import { maakSlaapbloemen, pakSchat } from './wereld/slaapbloem.js';
import { maakGezel } from './wezens/tijger.js';
import { stapGezel, vraagBrul, aaiGezel } from './modi/gezel.js';
import { WELPJES } from '../data/welpjes.js';
import { maakWelp, maakTak } from './wezens/welp.js';
import { stapWelpjes, aaiWelp } from './modi/welpjes.js';
import { KLIMMEN } from '../data/klimmen.js';
import { maakOefenrots } from './klimmen/oefenrots.js';
import { beginKlimmen, stapKlimmen, stopKlimmen, bereikbaar, planVoor } from './modi/klimmen.js';

/** @param {string|number} berg bergcode of zaadje */
export function maakSim(berg) {
  const zaadje = maakZaadje(berg);
  const vorm = maakWereldvorm(zaadje, WERELD);
  const hoogte = vorm.hoogte;
  const raster = maakTegelwereld(hoogte, WERELD.tegelGrootte, WERELD.rasterStap);
  const begroeiing = maakBegroeiing(vorm, FLORA, zaadje, WERELD.tegelGrootte);
  const weide = vorm.weide;
  // De oefenrots achter het kamp (stap 9): een rotsblok met een klimwand naar het kamp toe.
  const oefenrots = maakOefenrots(KLIMMEN, vorm.kamp, vorm.kamp.h + KLIMMEN.rots.voetBoven);
  const grond = maakGrond(raster, begroeiing.rotsen, (x, z) => weide.hindernisOp(x, z), oefenrots.blokOp);
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
    oefenrots,    // de klimwand met drie routes (stap 9)
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
  // De padvinder voor de tijger, en de slaapbloem die hij je komt tonen.
  const pad = maakPadvinder(wereld, GEZEL.pad);
  wereld.pad = pad;
  wereld.slaapbloemen = maakSlaapbloemen(vorm, pad, grond.grondOp, zaadje, GEZEL.slaapbloem);

  /** @type {import('./wezens/speler.js').Speler[]} */
  const spelers = [];
  /** @type {import('./wezens/pony.js').Pony[]} */
  const ponies = [];
  /** @type {import('./wezens/tijger.js').Gezel[]} */
  const tijgers = [];
  /** @type {import('./wezens/welp.js').Welp[]} */
  const welpjes = [];
  /** @type {Map<string, import('./wezens/welp.js').Welp[]>} de welpjes per mama */
  const gezinnen = new Map();
  /** @type {Map<string, import('./wezens/welp.js').Tak>} het takje bij elke mama (stap 8d) */
  const takken = new Map();
  /** @type {any[]} */
  let gebeurtenissen = [];
  const meld = (g) => gebeurtenissen.push(g);
  let tik = 0;

  const ponyVan = (s) => ponies.find((p) => p.eigenaar === s.id);
  const tijgerVan = (s) => tijgers.find((t) => t.eigenaar === s.id);
  const ponyOnder = (s) => (s.rijdt ? ponies.find((p) => p.id === s.rijdt) : null);
  const bewaarVorige = (o) => {
    o.vorigePos[0] = o.pos[0];
    o.vorigePos[1] = o.pos[1];
    o.vorigePos[2] = o.pos[2];
    o.vorigeRichting = o.richting;
  };

  /** Bij de voet van welke route staat de speler (index), of -1. */
  function routeBij(s) {
    if (s.modus !== 'lopen' || !s.opGrond || s.klimt) return -1;
    let beste = -1;
    let d0 = KLIMMEN.startAfstand;
    oefenrots.routes.forEach((r, i) => {
      const d = Math.hypot(r.voet[0] - s.pos[0], r.voet[2] - s.pos[2]);
      if (d < d0 && Math.abs(s.pos[1] - oefenrots.voetHoogte) < 0.6) {
        d0 = d;
        beste = i;
      }
    });
    return beste;
  }

  /** Wat de actieknop nu zou doen voor deze speler. */
  function actieVoor(s) {
    if (s.modus === 'rijden') return 'afstappen';
    if (s.modus === 'klimmen') return 'uitschudden';
    if (routeBij(s) >= 0) return 'klimmen';
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
    tijgers,
    welpjes,
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
      // En een tijger als reisgezel: hij wacht aan de andere kant van het kamp (naar de lagune toe).
      let tx = vorm.kamp.x - weide.su * GEZEL.rustPlek.opzij;
      let tz = vorm.kamp.z + GEZEL.rustPlek.voor;
      for (let i = 0; i < 30 && !pad.vrij(tx, tz, 0.8); i++) tz += 0.5;
      const tr = Math.atan2(vorm.kamp.x - tx, vorm.kamp.z + 3 - tz);
      const t = maakGezel('tijger-' + id, id, tx, grond.terreinOp(tx, tz), tz, tr);
      t.soort = GEZEL.soort;
      tijgers.push(t);
      // Mama's welpjes spelen rond haar (stap 8b).
      gezinnen.set(t.id, []);
      takken.set(t.id, maakTak());
      WELPJES.wie.forEach(([model, soort], i) => {
        const a = tr + Math.PI * 0.6 + i * 1.7;
        let wx = tx + Math.sin(a) * 2;
        let wz = tz + Math.cos(a) * 2;
        for (let k = 0; k < 12 && !pad.vrij(wx, wz, 0.5); k++) {
          wx = tx + Math.sin(a + k * 0.5) * (1.6 + k * 0.15);
          wz = tz + Math.cos(a + k * 0.5) * (1.6 + k * 0.15);
        }
        const w = maakWelp(`welp-${id}-${i}`, t.id, model, soort, wx, grond.terreinOp(wx, wz), wz, a, (zaadje ^ (i * 2654435761)) >>> 0);
        welpjes.push(w);
        gezinnen.get(t.id).push(w);
      });
      s.brulMeter = GEZEL.meterStart;
      s.meterVolGemeld = false;
      return s;
    },

    /** Plof: speler terug naar de laatste veilige grond (van de pony af als je erop zit). */
    terug(id) {
      const s = this.speler(id);
      if (s.modus === 'klimmen') stopKlimmen(s, oefenrots, KLIMMEN);
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

    /** De welpjes bij de tijger van een speler. */
    welpjesVan(id) {
      const t = tijgerVan(this.speler(id));
      return (t && gezinnen.get(t.id)) || [];
    },

    /** Het takje bij de tijger van een speler (stap 8d). */
    takVan(id) {
      const t = tijgerVan(this.speler(id));
      return (t && takken.get(t.id)) || null;
    },

    /**
     * Een schatjesmoment oproepen (om te testen, stap 8c): 'nies', 'hik' of 'struikel' voor welpje i,
     * 'huh' of 'meebrul' voor het hele gezinnetje. Spelletjes (stap 8d): 'staart' (welpje i), 'verstop'
     * (welpje i zoekt) of 'tak' (welpje i en een ander trekken aan een tak).
     */
    welpMoment(id, soort, i = 0) {
      const w = this.welpjesVan(id)[i];
      if (w) w.vraag = soort;
    },

    /** De tijger van een speler. */
    tijger(id) {
      return tijgerVan(this.speler(id));
    },

    /** Zet de tijger van een speler op (x, z) (voor tests); vriend = meteen al ontmoet. */
    zetTijger(id, x, z, richting = 0, modus) {
      const t = tijgerVan(this.speler(id));
      const y = grond.terreinOp(x, z);
      Object.assign(t, { pos: [x, y, z], vorigePos: [x, y, z], richting, vorigeRichting: richting, snelheid: 0, weg: [], wegTijd: 99, vastTijd: 0, vastKeren: 0 });
      if (modus) {
        t.modus = modus;
        t.vriend = modus !== 'rust';
      }
    },

    /** Wat de actieknop nu doet: 'opstappen', 'afstappen', 'klimmen', 'uitschudden' of null. */
    actieVoor(id) {
      return actieVoor(this.speler(id));
    },

    /** Bij welke route (index) staat de speler klaar om te klimmen, of -1. */
    routeBij(id) {
      return routeBij(this.speler(id));
    },

    /** Meteen beginnen klimmen op route ri (voor tests): de speler staat dan aan de voet. */
    klim(id, ri, besturing) {
      const s = this.speler(id);
      if (s.modus === 'rijden') this.rijd(id, false);
      if (s.modus === 'klimmen') stopKlimmen(s, oefenrots, KLIMMEN);
      const v = oefenrots.routes[ri].voet;
      s.pos = [v[0], oefenrots.voetHoogte, v[2]];
      beginKlimmen(s, oefenrots, ri, KLIMMEN, meld, besturing);
    },

    /** Een zet vragen op de wand (zoals een tik op een greep, of een hand slepen als `lid` gegeven is). */
    klimGreep(id, greep, lid = null) {
      this.speler(id).klimVraag = { greep, lid };
    },

    /** Welk plan het spel zou maken om hand `lid` op greep `greep` te krijgen (tests, klimbot). */
    klimPlan(id, greep, lid) {
      return planVoor(this.speler(id), oefenrots, KLIMMEN, greep, lid);
    },

    /** De grepen die de klimster nu kan bereiken (met hand `lid`, of met eender welke). */
    bereikbaar(id, lid = null) {
      return bereikbaar(this.speler(id), oefenrots, KLIMMEN, lid);
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
        let int = intenties[s.id] ?? legeIntentie();
        if (s.klimVraag) {
          int = { ...int, klimGreep: s.klimVraag.greep, klimLid: s.klimVraag.lid };
          s.klimVraag = null;
        }
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
          else if (wat === 'klimmen') beginKlimmen(s, oefenrots, routeBij(s), KLIMMEN, meld, int.besturing);
        }

        // Aaien kan altijd: dichtbij, of zittend op haar rug.
        if (int.aai && p && (p.ruiter === s.id || Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) < 3.5)) {
          p.graast = false;
          meld({ soort: 'aai', speler: s.id, pony: p.id, pos: [...p.pos], rijdend: p.ruiter === s.id });
        }

        // De tijger: brullen (knop), aaien (tik op hem).
        const t = tijgerVan(s);
        const brulNu = !!int.brul && !s.brulVorige;
        s.brulVorige = !!int.brul;
        if (t && brulNu) vraagBrul(t, s, wereld.slaapbloemen, GEZEL, meld);
        if (t && int.aaiTijger && Math.hypot(t.pos[0] - s.pos[0], t.pos[2] - s.pos[2]) < (s.modus === 'rijden' ? 4.5 : 6)) aaiGezel(t, s, GEZEL, meld);
        // Een welpje aaien (tik erop): int.aaiWelp is zijn id.
        const aw = int.aaiWelp && welpjes.find((w) => w.id === int.aaiWelp);
        if (aw && t && Math.hypot(aw.pos[0] - s.pos[0], aw.pos[2] - s.pos[2]) < WELPJES.aaiAfstand + (s.modus === 'rijden' ? 1.5 : 0)) {
          aaiWelp(aw, gezinnen.get(t.id), t, s, WELPJES, meld);
        }

        if (s.modus === 'klimmen') stapKlimmen(s, int, oefenrots, KLIMMEN, dt, meld);
        else if (s.modus === 'lopen') stapLopen(s, int, wereld, LOPEN, dt, meld, ZWEMMEN);
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
        const voor = s.bloesems;
        pakBloesems(s, wereld.bloesems, BLOESEMS, dt, meld);
        pakSchat(s, wereld.slaapbloemen, GEZEL.slaapbloem, meld);
        // De brulmeter vult zich met de tijd en met elke bloesem (niet tijdens het brullen zelf).
        if (t?.vriend && t.modus !== 'brult') {
          s.brulMeter = Math.min(1, s.brulMeter + GEZEL.meterPerSeconde * dt + Math.max(0, s.bloesems - voor) * GEZEL.meterPerBloesem);
          if (s.brulMeter >= 1 && !s.meterVolGemeld) {
            s.meterVolGemeld = true;
            meld({ soort: 'meterVol', speler: s.id });
          }
        }
      }

      // De tijgers, na de spelers (ze reageren op waar je nu bent).
      for (const t of tijgers) {
        bewaarVorige(t);
        const s = spelers.find((q) => q.id === t.eigenaar);
        stapGezel(t, s, ponyVan(s), wereld.slaapbloemen, wereld, pad, GEZEL, dt, meld);
        const kleintjes = gezinnen.get(t.id) ?? [];
        for (const w of kleintjes) bewaarVorige(w);
        // Jij springt of fluit: de welpjes kijken je verbaasd aan ("huh?", stap 8c).
        let huh = false;
        for (let i = begin; i < gebeurtenissen.length; i++) {
          const g = gebeurtenissen[i];
          if (g.speler === t.eigenaar && (g.soort === 'sprong' || g.soort === 'fluit' || g.soort === 'ponySprong')) huh = true;
        }
        stapWelpjes(kleintjes, t, s, wereld, pad, WELPJES, dt, meld, { huh, tak: takken.get(t.id) });
      }
      for (const b of wereld.slaapbloemen) if (b.open) b.openTijd += dt;

      // Pony's waar niemand op zit.
      for (const p of ponies) {
        if (p.ruiter) continue;
        bewaarVorige(p);
        stapPonyVrij(p, spelers.find((s) => s.id === p.eigenaar), wereld, RIJDEN, dt, meld);
        // Begroet de tijger haar? Dan draait ze haar hoofd naar hem toe.
        const t = p.begroetDoor && tijgers.find((q) => q.id === p.begroetDoor);
        if (t && t.modus === 'begroet' && p.modus === 'staat') {
          const doel = Math.atan2(t.pos[0] - p.pos[0], t.pos[2] - p.pos[2]);
          const d = Math.atan2(Math.sin(doel - p.richting), Math.cos(doel - p.richting));
          p.richting += Math.max(-2 * dt, Math.min(2 * dt, d));
          p.graast = false;
        } else p.begroetDoor = null;
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
