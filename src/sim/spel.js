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
import { maakDakrots } from './klimmen/dakrots.js';
import { beginKlimmen, stapKlimmen, stopKlimmen, bereikbaar, planVoor, knieklemVoor } from './modi/klimmen.js';
import { VLOT, ZWEMTIJGER } from '../data/rivier.js';
import { maakVlot, zetKlaar, stukPlek, pakStukken, bijSteiger, beginBouwen, stapIn, stapVaren, aanlegPlek, legAan, stapVlotVrij } from './modi/varen.js';
import { maakZwemtijger, stapZwemtijger } from './modi/zwemtijger.js';
import { legeBosToestand, bosActie, doeBosActie, bosInvoer, bosSlinger, bosNaStap, stapSpeelbos, bosLos } from './doorgangen/speelbos.js';

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
  // De benedenrivier (stap 10): rotsen en steigers om op te staan.
  const rivier = vorm.rivier;
  // De rivier over de berg (stap 14): komt uit in de bron van de benedenrivier. Het vlot vaart over allebei.
  const bergrivier = vorm.bergrivier;
  const rivieren = vorm.rivieren;
  // Het speelbos (stap 11): platforms, bruggen en bladeren om op te staan.
  const speelbos = vorm.speelbos;
  // De berg (stap 13): klimwanden op de rotsrand en oversteken over de ravijnen.
  // De dakvleugel van de oefenrots (stap 15a): overhang, dak en kopwand, aan de kant van de lagune.
  const dakrots = maakDakrots(KLIMMEN, oefenrots, vorm.kant);
  // Alle klimwanden (de oefenrots eerst, de dakvleugel achteraan) en alle parcours (het speelbos eerst) werken met
  // dezelfde regels.
  const wanden = [oefenrots, ...vorm.bergwanden, dakrots];
  const parcours = [speelbos, ...vorm.oversteken];
  const blokOp = (x, z) => {
    let h = Math.max(rivier.blokOp(x, z), bergrivier.blokOp(x, z), speelbos.blokOp(x, z));
    for (const w of wanden) h = Math.max(h, w.blokOp(x, z));
    for (let i = 1; i < parcours.length; i++) h = Math.max(h, parcours[i].blokOp(x, z));
    return h;
  };
  const grond = maakGrond(raster, begroeiing.rotsen, (x, z) => weide.hindernisOp(x, z), blokOp);
  // Botsen tegen de stammen: die van de jungle, en de reuzenbomen door de platforms van het speelbos.
  const T = WERELD.tegelGrootte;
  const bosStammen = new Map();
  for (const st of speelbos.stammen) {
    const k = `${Math.floor(st.x / T)},${Math.floor(st.z / T)}`;
    if (!bosStammen.has(k)) bosStammen.set(k, []);
    bosStammen.get(k).push(st);
  }
  const samen = new Map();
  const stammen = (tx, tz) => {
    const eigen = bosStammen.get(`${tx},${tz}`);
    if (!eigen) return begroeiing.stammen(tx, tz);
    const k = `${tx},${tz}`;
    if (!samen.has(k)) samen.set(k, [...begroeiing.stammen(tx, tz), ...eigen]);
    return samen.get(k);
  };
  const wereld = {
    raster,       // hoogteOp / hellingOp over alle tegels
    vorm,         // de hoogtefunctie en wat er ligt (zand, gras, bos, lagune, weide)
    begroeiing,   // waar de planten staan
    grens: vorm.eiland.grenzen, // geen onzichtbare muren: de zee houdt je tegen (GD 2), dit is alleen een vangnet
    stammen,
    grondOp: grond.grondOp,     // terrein met rotsen en hindernissen: waar je op staat
    terreinOp: grond.terreinOp, // zonder de hindernissen (de pony springt erover)
    rotsOp: grond.rotsOp,
    weide,        // de springweide: baan, hindernissen, water
    oefenrots,    // de klimwand met drie routes (stap 9)
    dakrots,      // de dakvleugel van de oefenrots met de dakroute (stap 15a)
    rivier,       // de benedenrivier met het vlot (stap 10)
    bergrivier,   // de rivier over de berg (stap 14)
    rivieren,     // allebei: het vlot vaart van de berg tot in de lagune
    speelbos,     // het speelbos met de eerste doorgangen (stap 11)
    wanden,       // alle klimwanden: de oefenrots (0), de klimwanden van de berg (stap 13) en de dakvleugel (laatste)
    parcours,     // alle parcours: het speelbos (0) en de oversteken over de ravijnen (stap 13)
    bergplan: vorm.bergplan, // het netwerk van plekken en doorgangen (stap 13)
    waterOp: vorm.waterOp, // het waterpeil: 0 in zee en lagune, hoger in de rivier
    stroomOp: vorm.stroomOp, // de stroming van de rivieren (in het water voert ze je mee)
    brugOp: bergrivier.brugOp, // het bruggetje over de rivier in het laagland (stap 14b)
  };
  const geenVaart = [0, 0, 0];
  // Waar de bouwstukken voor het vlot liggen (drie bundels bamboe en een liaan, rond de bron).
  wereld.vlotStukken = VLOT.stukken.map((_, i) => stukPlek(rivier, VLOT, i, grond.grondOp));
  // Boven elke hindernis zweeft een bloesem: wie er met de pony over springt, pakt hem.
  const boven = weide.groepen.map((gr) => {
    const delen = gr.delen.map((i) => weide.delen[i]);
    const x = delen.reduce((a, d) => a + d.x, 0) / delen.length;
    const z = delen.reduce((a, d) => a + d.z, 0) / delen.length;
    return { x, z, y: weide.hoogte + BLOESEMS.bovenHindernis };
  });
  wereld.bloesems = maakBloesems(vorm, { grondOp: grond.grondOp, rotsen: begroeiing.rotsen, tegelGrootte: WERELD.tegelGrootte }, zaadje, BLOESEMS, [...boven, ...rivier.bloesems, ...bergrivier.bloesems, ...parcours.flatMap((p) => p.bloesems)]);
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
  /** @type {import('./modi/varen.js').Vlot[]} */
  const vlotten = [];
  /** @type {import('./modi/zwemtijger.js').Zwemtijger[]} */
  const zwemmers = [];
  /** @type {any[]} */
  let gebeurtenissen = [];
  const meld = (g) => gebeurtenissen.push(g);
  let tik = 0;

  const ponyVan = (s) => ponies.find((p) => p.eigenaar === s.id);
  const tijgerVan = (s) => tijgers.find((t) => t.eigenaar === s.id);
  const ponyOnder = (s) => (s.rijdt ? ponies.find((p) => p.id === s.rijdt) : null);
  const vlotVan = (s) => vlotten.find((v) => v.eigenaar === s.id);
  /** De pony die met de speler meevaart (of null). */
  const ponyAanBoord = (s, v) => {
    const p = ponyVan(s);
    return p && v && v.pony === p.id ? p : null;
  };
  const bewaarVorige = (o) => {
    o.vorigePos[0] = o.pos[0];
    o.vorigePos[1] = o.pos[1];
    o.vorigePos[2] = o.pos[2];
    o.vorigeRichting = o.richting;
  };

  /** Bij de voet van welke route van welke wand staat de speler: { wand, route }, of null. */
  function wandBij(s) {
    if (s.modus !== 'lopen' || !s.opGrond || s.klimt) return null;
    let beste = null;
    let d0 = KLIMMEN.startAfstand;
    wanden.forEach((w, wi) => {
      if (Math.abs(s.pos[1] - w.voetHoogte) > 0.6 || Math.hypot(w.midden[0] - s.pos[0], w.midden[2] - s.pos[2]) > w.breedte + 3) return;
      w.routes.forEach((r, ri) => {
        const d = Math.hypot(r.voet[0] - s.pos[0], r.voet[2] - s.pos[2]);
        if (d < d0) {
          d0 = d;
          beste = { wand: wi, route: ri };
        }
      });
    });
    return beste;
  }
  /** Bij de voet van welke route van de oefenrots staat de speler (index), of -1 (voor de tests van stap 9). */
  const routeBij = (s) => {
    const b = wandBij(s);
    return b && b.wand === 0 ? b.route : -1;
  };
  /** Begint te klimmen op route ri van wand wi. */
  function klimOp(s, wi, ri, besturing) {
    beginKlimmen(s, wanden[wi], ri, KLIMMEN, meld, besturing);
    s.klim.wand = wi;
  }
  const wandVan = (s) => wanden[s.klim?.wand ?? s.laatsteWand ?? 0];

  /**
   * In welk parcours (speelbos of oversteek) is de speler bezig: de index, of -1. Verlaat je een parcours,
   * dan begint het volgende met een lege voortgang (het record van het speelbos blijft).
   */
  function parcoursBij(s) {
    const x = s.pos[0];
    const z = s.pos[2];
    if (s.parcours >= 0 && parcours[s.parcours].binnen(x, z, 2)) return s.parcours;
    const i = parcours.findIndex((p) => p.binnen(x, z, 0));
    if (i !== s.parcours) {
      if (s.parcours >= 0) Object.assign(s.bos, { dek: -1, bezig: false, op: null, laatsteOp: null });
      s.parcours = i;
    }
    return i;
  }
  const parcoursVan = (s) => parcours[parcoursBij(s)] ?? speelbos;

  /** Wat de actieknop nu zou doen voor deze speler. */
  function actieVoor(s) {
    if (s.modus === 'rijden') return 'afstappen';
    if (s.modus === 'klimmen') return 'uitschudden';
    if (s.modus === 'varen') return aanlegPlek(vlotVan(s), rivieren, wereld, VLOT) ? 'aanleggen' : null;
    if (wandBij(s)) return 'klimmen';
    const bosWat = bosActie(parcoursVan(s), s);
    if (bosWat) return bosWat;
    // Aan een steiger: het vlot bouwen (bij de bron, als je alle stukken hebt) of instappen. Op de berg ligt er
    // altijd een vlot klaar (stap 14).
    const v = vlotVan(s);
    const st = v && s.modus === 'lopen' && s.opGrond && !s.klimt && v.bouwt <= 0 ? bijSteiger(s, rivieren, VLOT) : null;
    if (st) {
      if (st.tak === 0 && !v.gebouwd) return v.stukken.every(Boolean) ? 'bouwen' : null;
      if (v.plek === 'boven' && v.tak === st.tak && v.steiger === st.steiger.naam) return 'varen';
    }
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
    vlotten,
    zwemmers,
    welpjes,
    wortels,

    voegSpelerToe(id) {
      const x = vorm.kamp.x;
      const z = vorm.kamp.z + 3;
      const s = maakSpeler(id, x, grond.grondOp(x, z), z);
      s.ronde = maakRonde();
      s.bos = legeBosToestand();
      s.parcours = -1;
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
      // Het vlot (nog te bouwen) aan de bron, en de Sumatraanse tijger die daar zwemt (stap 10).
      vlotten.push(maakVlot('vlot-' + id, id, rivieren, VLOT));
      zwemmers.push(maakZwemtijger('zwemtijger-' + id, id, rivier, ZWEMTIJGER));
      return s;
    },

    /** Plof: speler terug naar de laatste veilige grond (van de pony af als je erop zit). */
    terug(id) {
      const s = this.speler(id);
      if (s.modus === 'klimmen') stopKlimmen(s, wandVan(s), KLIMMEN);
      bosLos(parcoursVan(s), s);
      if (s.modus === 'varen') {
        const v = vlotVan(s);
        const p = ponyAanBoord(s, v);
        v.ruiter = null;
        s.vlot = null;
        s.modus = 'lopen';
        if (p) {
          const [x, , z] = s.veilig;
          Object.assign(p, { modus: 'staat', vlot: null, pos: [x + 1.6, grond.terreinOp(x + 1.6, z), z], opGrond: true });
          p.vorigePos = [...p.pos];
          v.pony = null;
        }
      }
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

    /** Meteen beginnen klimmen op route ri van wand wi (voor tests): de speler staat dan aan de voet. */
    klim(id, ri, besturing, wi = 0) {
      const s = this.speler(id);
      if (s.modus === 'rijden') this.rijd(id, false);
      if (s.modus === 'klimmen') stopKlimmen(s, wandVan(s), KLIMMEN);
      const w = wanden[wi];
      const v = w.routes[ri].voet;
      s.pos = [v[0], w.voetHoogte, v[2]];
      klimOp(s, wi, ri, besturing);
    },

    /** De wand waarop de speler klimt (of het laatst klom). */
    wand(id) {
      return wandVan(this.speler(id));
    },

    /** Een zet vragen op de wand (zoals een tik op een greep, of een hand slepen als `lid` gegeven is). */
    klimGreep(id, greep, lid = null) {
      this.speler(id).klimVraag = { greep, lid };
    },

    /** Welk plan het spel zou maken om hand `lid` op greep `greep` te krijgen (tests, klimbot). */
    klimPlan(id, greep, lid) {
      const s = this.speler(id);
      return planVoor(s, wandVan(s), KLIMMEN, greep, lid);
    },

    /** Is er een knieklem binnen bereik (id), of -1 (klimbot, stap 15a)? */
    knieklem(id) {
      const s = this.speler(id);
      return knieklemVoor(s, wandVan(s), KLIMMEN);
    },

    /** Welke wand is de dakvleugel (index in wereld.wanden)? */
    get dakWand() {
      return wanden.length - 1;
    },

    /** De grepen die de klimster nu kan bereiken (met hand `lid`, of met eender welke). */
    bereikbaar(id, lid = null) {
      const s = this.speler(id);
      return bereikbaar(s, wandVan(s), KLIMMEN, lid);
    },

    /** Meteen aan het begin van doorgang i van het speelbos (voor tests, ?doorgang=...). */
    naarBos(id, i = 0) {
      const s = this.speler(id);
      if (s.modus === 'rijden') this.rijd(id, false);
      if (s.modus !== 'lopen') this.terug(id);
      const plek = speelbos.startPlek(i);
      s.pos = [...plek.pos];
      s.vorigePos = [...plek.pos];
      s.vel = [0, 0, 0];
      s.richting = s.vorigeRichting = plek.richting;
      s.opGrond = true;
      s.veilig = [...plek.pos];
      s.parcours = 0;
      Object.assign(s.bos, { dek: i, op: i, laatsteOp: i, valVan: plek.pos[1], bezig: i === 0, geldig: i === 0 });
      // Op het eerste platform begint het parcours meteen (met de klok).
      if (i === 0) Object.assign(s.bos, { start: tik, fouten: speelbos.modules.map(() => 0) });
    },

    /**
     * Meteen bij verbinding `vi` van het bergplan (voor tests, ?doorgang=v3): onderaan het ponypad, aan de voet
     * van de klimwand, of op het eerste platform van een oversteek. boven = true: aan de andere kant.
     */
    naarVerbinding(id, vi, boven = false) {
      const v = vorm.bergplan.verbindingen.find((q) => q.id === vi || q === vi);
      if (!v?.geplaatst) return null;
      const s = this.speler(id);
      if (s.modus === 'rijden') this.rijd(id, false);
      if (s.modus !== 'lopen') this.terug(id);
      let x;
      let z;
      let richting;
      if (v.soort === 'ponypad') {
        const h = vorm.eiland.hellingen[v.plaats.helling];
        const t = boven ? h.len + 4 : -4;
        x = h.x0 + h.ex * t;
        z = h.z0 + h.ez * t;
        richting = boven ? Math.atan2(-h.ex, -h.ez) : Math.atan2(h.ex, h.ez);
      } else if (v.soort === 'klimwand') {
        const w = vorm.bergwanden[v.plaats.wand];
        [x, , z] = boven ? w.uitstap(0) : w.routes[0].voet;
        richting = Math.atan2(-w.N[0], -w.N[2]);
      } else if (v.plaats?.parcours !== undefined) {
        const plek = vorm.oversteken[v.plaats.parcours].startPlek(boven ? 1 : 0);
        [x, , z] = plek.pos;
        richting = plek.richting;
      } else if (v.soort === 'rivier') {
        // Op de oever bij de steiger, met je neus naar het water.
        [x, z] = v.plaats.land.voor;
        richting = Math.atan2(-v.plaats.land.uit[0], -v.plaats.land.uit[1]);
      } else {
        const p = vorm.bergplan.plekken.find((q) => q.id === v.van);
        [x, z] = vorm.eiland.punt(p.midden, (vorm.eiland.randStraal(p.midden) + vorm.eiland.voetStraal(p.midden)) / 2);
        richting = 0;
      }
      const y = grond.grondOp(x, z);
      s.pos = [x, y, z];
      s.vorigePos = [...s.pos];
      s.vel = [0, 0, 0];
      s.richting = s.vorigeRichting = richting;
      s.opGrond = true;
      s.veilig = [...s.pos];
      parcoursBij(s);
      return v;
    },

    /** Het vlot van een speler (stap 10). */
    vlot(id) {
      return vlotVan(this.speler(id));
    },

    /** De Sumatraanse tijger in de rivier (stap 10). */
    zwemtijger(id) {
      return zwemmers.find((t) => t.eigenaar === id);
    },

    /**
     * Meteen op het vlot (voor tests): aan de bron, of aan een steiger van de bergrivier ('top', 'etage', 'laag').
     * Het vlot is dan al gebouwd.
     */
    vaar(id, steiger = 'bron') {
      const s = this.speler(id);
      if (s.modus === 'rijden') this.rijd(id, false);
      if (s.modus === 'varen') this.terug(id);
      const v = vlotVan(s);
      v.gebouwd = true;
      v.stukken.fill(true);
      const tak = steiger === 'bron' ? 0 : 1;
      zetKlaar(v, rivieren, tak, steiger);
      const k = rivieren[tak].steigers.find((q) => q.naam === v.steiger).dek;
      s.pos = [k.x, k.y, k.z];
      s.veilig = [k.x, k.y, k.z];
      s.modus = 'lopen';
      stapIn(s, v, ponyVan(s), VLOT, meld);
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
      for (const v of vlotten) bewaarVorige(v);
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
        if (fluitNu && p && !p.ruiter && p.modus !== 'vlot') {
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
          else if (wat === 'klimmen') {
            const b = wandBij(s);
            klimOp(s, b.wand, b.route, int.besturing);
          }
          else if (wat === 'bouwen') beginBouwen(s, vlotVan(s), VLOT, meld);
          else if (wat === 'slingeren') doeBosActie(parcoursVan(s), s, meld);
          else if (wat === 'varen') stapIn(s, vlotVan(s), p, VLOT, meld);
          else if (wat === 'aanleggen') {
            const v = vlotVan(s);
            legAan(s, v, ponyAanBoord(s, v), aanlegPlek(v, rivieren, wereld, VLOT), wereld, meld);
          }
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

        if (s.modus === 'klimmen') {
          s.laatsteWand = s.klim.wand;
          stapKlimmen(s, int, wandVan(s), KLIMMEN, dt, meld);
        }
        else if (s.modus === 'varen') {
          const v = vlotVan(s);
          stapVaren(s, v, ponyAanBoord(s, v), int, rivieren, wereld, VLOT, dt, meld);
        } else if (s.modus === 'slingeren') bosSlinger(parcoursVan(s), s, int, dt, meld);
        else if (s.modus === 'lopen') {
          stapLopen(s, bosInvoer(parcoursVan(s), s, int), wereld, LOPEN, dt, meld, ZWEMMEN);
          bergrivier.brugLeuning(s.pos, s.vel, 0.3); // het bruggetje in het laagland (stap 14b)
          pakStukken(s, vlotVan(s), wereld.vlotStukken, VLOT, meld);
        }
        else if (s.modus === 'zwemmen') stapZwemmen(s, int, wereld, ZWEMMEN, dt, meld);
        else if (s.modus === 'rijden') {
          const q = ponyOnder(s);
          bewaarVorige(q);
          stapRijden(s, q, int, wereld, RIJDEN, dt, meld);
          if (bergrivier.brugLeuning(q.pos, geenVaart, 0.55)) {
            s.pos[0] = q.pos[0];
            s.pos[2] = q.pos[2];
          }
          werkRondeBij(s.ronde, q, weide, tik * dt, s.id, meld);
          if (q.stopt && q.opGrond && q.weigert <= 0 && Math.abs(q.snelheid) < RIJDEN.afstapSnelheid) {
            stapAf(s, q, wereld, meld);
            stopRonde(s.ronde, s.id, meld);
          }
        }
        // Het speelbos en de oversteken: lianen grijpen, de springbloem, en terug naar het begin van een
        // doorgang na een val.
        if (s.modus === 'lopen' || s.modus === 'zwemmen' || s.modus === 'slingeren') {
          const bos = parcoursVan(s);
          const plek = bosNaStap(bos, s, dt, tik, meld);
          if (plek) {
            bosLos(bos, s);
            naarVeiligeGrond(s, meld);
            s.richting = s.vorigeRichting = plek.richting;
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

      // De bewegende delen van het speelbos en de oversteken: lianen, brug, bladeren en lotus.
      for (const p of parcours) stapSpeelbos(p, spelers, dt);

      // Het vlot als niemand erop zit, en de Sumatraanse tijger in de rivier.
      for (const v of vlotten) {
        if (v.ruiter) continue;
        stapVlotVrij(v, spelers.find((q) => q.id === v.eigenaar), rivieren, VLOT, dt, meld);
      }
      for (const z of zwemmers) {
        bewaarVorige(z);
        const s = spelers.find((q) => q.id === z.eigenaar);
        // De Sumatraanse tijger zwemt alleen in de benedenrivier; is het vlot op de berg, dan wacht hij.
        const zv = s && vlotVan(s);
        stapZwemtijger(z, s, zv && zv.tak === 0 ? zv : null, rivier, ZWEMTIJGER, VLOT, dt, meld);
      }

      // De tijgers, na de spelers (ze reageren op waar je nu bent).
      for (const t of tijgers) {
        bewaarVorige(t);
        const s = spelers.find((q) => q.id === t.eigenaar);
        // Op het vlot wacht hij op de oever; daarna komt hij je weer zoeken.
        if (s.modus === 'varen') {
          t.snelheid = 0;
          t.gang = 'stil';
        } else stapGezel(t, s, ponyVan(s), wereld.slaapbloemen, wereld, pad, GEZEL, dt, meld);
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
        if (p.ruiter || p.modus === 'vlot') continue;
        bewaarVorige(p);
        stapPonyVrij(p, spelers.find((s) => s.id === p.eigenaar), wereld, RIJDEN, dt, meld);
        bergrivier.brugLeuning(p.pos, geenVaart, 0.55);
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
