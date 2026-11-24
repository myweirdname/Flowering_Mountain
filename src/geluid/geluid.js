// Geluid door code (TP 12): kleine "recepten" per klank met de Web Audio API, geen geluidsbestanden.
// Ruis door filters (branding, voetstappen, plons), korte tonen met een omhullende (bloesem, sprong)
// en vogeltjes uit toonsweeps. Hooguit een twaalftal klanken tegelijk, met een begrenzer op de uitgang.
// De browser laat pas geluid toe na een eerste tik of toets: daarom start alles pas dan.
import { GELUID as G } from '../data/geluid.js';

export function maakGeluid() {
  /** @type {AudioContext | null} */
  let ctx = null;
  let uit = null;       // hoofdvolume
  let ruis = null;      // 2 s witte ruis, voor alle ruisrecepten
  let actief = 0;       // klanken die nu spelen
  let aan = true;
  const omgeving = { branding: null, insecten: null, rivier: null, ruisen: null, waterval: null };
  let volgendeVogel = 0;
  let omgevingWaarden = { zee: 0, bos: 0 };

  function start() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const begrenzer = ctx.createDynamicsCompressor();
    begrenzer.threshold.value = -10;
    begrenzer.knee.value = 8;
    begrenzer.ratio.value = 12;
    begrenzer.attack.value = 0.003;
    begrenzer.release.value = 0.2;
    uit = ctx.createGain();
    uit.gain.value = aan ? G.volume : 0;
    uit.connect(begrenzer).connect(ctx.destination);

    ruis = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = ruis.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    maakOmgeving();
  }
  // Ontgrendelen bij de eerste aanraking of toets.
  const ontgrendel = () => start();
  window.addEventListener('pointerdown', ontgrendel);
  window.addEventListener('keydown', ontgrendel);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  // --- Bouwstenen ---
  /** Een klank mag alleen als er nog plaats is; geeft de starttijd terug of -1. */
  function plek(duur) {
    if (!ctx || !aan || ctx.state !== 'running' || actief >= G.maxKlanken) return -1;
    actief++;
    setTimeout(() => actief--, duur * 1000 + 50);
    return ctx.currentTime + 0.005;
  }

  /** Omhullende: snel aan, exponentieel uit. */
  function omhul(t, piek, aanslag, verval) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(piek, t + aanslag);
    g.gain.exponentialRampToValueAtTime(0.0001, t + aanslag + verval);
    return g;
  }

  function naarUit(knoop, pan = 0) {
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      knoop.connect(p).connect(uit);
    } else knoop.connect(uit);
  }

  /** Ruisstoot door een filter. */
  function ruisStoot(t, { soort = 'bandpass', freq = 1000, freqEind = freq, q = 1, piek = 0.3, aanslag = 0.005, verval = 0.1, pan = 0 }) {
    const bron = ctx.createBufferSource();
    bron.buffer = ruis;
    bron.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = soort;
    f.frequency.setValueAtTime(freq, t);
    if (freqEind !== freq) f.frequency.exponentialRampToValueAtTime(freqEind, t + aanslag + verval);
    f.Q.value = q;
    const g = omhul(t, piek, aanslag, verval);
    bron.connect(f).connect(g);
    naarUit(g, pan);
    bron.start(t, Math.random() * 1.5);
    bron.stop(t + aanslag + verval + 0.05);
  }

  /** Toon met een omhullende, eventueel glijdend naar een andere hoogte. */
  function toon(t, { vorm = 'sine', freq = 440, freqEind = freq, piek = 0.2, aanslag = 0.005, verval = 0.3, pan = 0 }) {
    const o = ctx.createOscillator();
    o.type = vorm;
    o.frequency.setValueAtTime(freq, t);
    if (freqEind !== freq) o.frequency.exponentialRampToValueAtTime(freqEind, t + aanslag + verval * 0.7);
    const g = omhul(t, piek, aanslag, verval);
    o.connect(g);
    naarUit(g, pan);
    o.start(t);
    o.stop(t + aanslag + verval + 0.05);
  }

  // --- Omgeving: branding en jungle, lopen altijd en schuiven mee met waar je bent ---
  function lus(filterSoort, freq, q) {
    const bron = ctx.createBufferSource();
    bron.buffer = ruis;
    bron.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterSoort;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    bron.connect(f).connect(g).connect(uit);
    bron.start();
    return { bron, f, g };
  }

  function maakOmgeving() {
    // Branding: diepe ruis die aanzwelt en wegebt zoals golven.
    const b = lus('lowpass', 520, 0.7);
    const golf = ctx.createGain();
    golf.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / G.golfPeriode;
    const diepte = ctx.createGain();
    diepte.gain.value = 0.45;
    lfo.connect(diepte).connect(golf.gain);
    b.g.disconnect();
    b.g.connect(golf).connect(uit);
    lfo.start();
    // De golfslag kleurt ook: helderder bij de top van de golf.
    const kleur = ctx.createGain();
    kleur.gain.value = 260;
    lfo.connect(kleur).connect(b.f.frequency);
    omgeving.branding = b;

    // Insecten: een zacht, hoog gezoem dat trilt.
    const ins = lus('bandpass', 5200, 9);
    const tril = ctx.createOscillator();
    tril.frequency.value = 23;
    const trilDiepte = ctx.createGain();
    trilDiepte.gain.value = 0.5;
    const trilG = ctx.createGain();
    trilG.gain.value = 0.5;
    tril.connect(trilDiepte).connect(trilG.gain);
    ins.g.disconnect();
    ins.g.connect(trilG).connect(uit);
    tril.start();
    omgeving.insecten = ins;

    // De rivier (stap 10): een diep gerommel, een helder geruis dat sterker wordt naarmate het water (of jij)
    // sneller gaat, en het geraas van de kleine waterval.
    omgeving.rivier = lus('lowpass', 380, 0.8);
    omgeving.ruisen = lus('bandpass', 1500, 0.6);
    omgeving.waterval = lus('bandpass', 900, 0.45);
  }

  /** Een vogeltje: twee of drie snelle fluitjes, ergens links of rechts. */
  function vogel() {
    const t = plek(1);
    if (t < 0) return;
    const pan = Math.random() * 1.6 - 0.8;
    const basis = 1800 + Math.random() * 2000;
    const n = 2 + Math.floor(Math.random() * 3);
    const soort = Math.random();
    const luid = G.vogels * omgevingWaarden.bos;
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.09 + soort * 0.08);
      const op = soort > 0.5;
      toon(s, { freq: basis * (op ? 0.8 : 1.25), freqEind: basis * (op ? 1.3 : 0.75), piek: luid, aanslag: 0.01, verval: 0.07 + soort * 0.05, pan });
    }
  }

  return {
    start,
    get aan() {
      return aan;
    },
    /** Geluid aan of uit (toets M). */
    wissel() {
      aan = !aan;
      if (uit) uit.gain.setTargetAtTime(aan ? G.volume : 0, ctx.currentTime, 0.05);
      return aan;
    },

    /**
     * Elk beeld: de omgeving volgt waar je bent.
     * @param {number} zee 0..1 hoe dicht bij de branding
     * @param {number} bos 0..1 hoeveel jungle rondom
     */
    omgeving(zee, bos) {
      omgevingWaarden = { zee, bos };
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      omgeving.branding?.g.gain.setTargetAtTime(G.branding * (0.15 + 0.85 * zee), t, 0.5);
      omgeving.insecten?.g.gain.setTargetAtTime(G.insecten * bos, t, 0.8);
      if (t > volgendeVogel) {
        if (bos > 0.15) vogel();
        volgendeVogel = t + G.vogelTussen[0] + Math.random() * (G.vogelTussen[1] - G.vogelTussen[0]);
      }
    },

    /** Voetstap op zand, gras, rots of in ondiep water. */
    stap(ondergrond, ren) {
      const t = plek(0.2);
      if (t < 0) return;
      const v = G.stappen * (0.7 + ren * 0.5);
      if (ondergrond === 'zand') ruisStoot(t, { soort: 'lowpass', freq: 1400, freqEind: 500, piek: v * 0.9, aanslag: 0.01, verval: 0.09 });
      else if (ondergrond === 'rots') {
        ruisStoot(t, { soort: 'highpass', freq: 2500, piek: v * 0.35, verval: 0.03 });
        toon(t, { vorm: 'triangle', freq: 260, freqEind: 180, piek: v * 0.5, verval: 0.05 });
      } else if (ondergrond === 'water') ruisStoot(t, { freq: 1300, freqEind: 600, q: 1.5, piek: v * 1.1, aanslag: 0.01, verval: 0.15 });
      else ruisStoot(t, { freq: 3200, freqEind: 1800, q: 0.8, piek: v * 0.55, aanslag: 0.008, verval: 0.07 });
    },

    sprong() {
      const t = plek(0.25);
      if (t < 0) return;
      toon(t, { freq: 330, freqEind: 720, piek: G.sprong, aanslag: 0.01, verval: 0.16 });
      toon(t, { vorm: 'triangle', freq: 660, freqEind: 1300, piek: G.sprong * 0.25, aanslag: 0.01, verval: 0.12 });
    },

    landing(sterkte) {
      const t = plek(0.2);
      if (t < 0) return;
      const v = G.landing * Math.min(1, 0.4 + sterkte / 10);
      ruisStoot(t, { soort: 'lowpass', freq: 700, freqEind: 200, piek: v, aanslag: 0.004, verval: 0.12 });
      toon(t, { freq: 120, freqEind: 70, piek: v * 0.8, verval: 0.1 });
    },

    opklimmen() {
      const t = plek(0.4);
      if (t < 0) return;
      toon(t, { vorm: 'triangle', freq: 300, freqEind: 380, piek: G.opklimmen, aanslag: 0.02, verval: 0.12 });
      toon(t + 0.16, { vorm: 'triangle', freq: 380, freqEind: 470, piek: G.opklimmen, aanslag: 0.02, verval: 0.12 });
      ruisStoot(t + 0.05, { freq: 2600, piek: G.opklimmen * 0.4, verval: 0.08 });
    },

    // --- Klimmen (stap 9) ---
    /** De gordel klikt vast en de tijger neemt het touw: klaar om te klimmen. */
    klimStart() {
      const t = plek(0.4);
      if (t < 0) return;
      const v = G.klim.gordel;
      toon(t, { vorm: 'triangle', freq: 1900, freqEind: 1500, piek: v, aanslag: 0.002, verval: 0.05 });
      toon(t + 0.07, { vorm: 'triangle', freq: 2400, freqEind: 2000, piek: v * 0.8, aanslag: 0.002, verval: 0.06 });
      ruisStoot(t, { soort: 'highpass', freq: 3500, piek: v * 0.3, verval: 0.03 });
    },
    /** Een hand pakt een greep: een doffe klop (bak), een tikje (richel, rand) of een zachte veeg (sloper), met wat magnesium. */
    greep(soort) {
      const t = plek(0.3);
      if (t < 0) return;
      const v = G.klim.greep;
      const pan = (Math.random() - 0.5) * 0.4;
      if (soort === 'bak') toon(t, { freq: 210, freqEind: 140, piek: v, aanslag: 0.003, verval: 0.09, pan });
      else if (soort === 'sloper') ruisStoot(t, { freq: 900, freqEind: 500, q: 0.8, piek: v * 0.8, aanslag: 0.01, verval: 0.12, pan });
      else toon(t, { vorm: 'triangle', freq: soort === 'rand' ? 760 : 520, freqEind: soort === 'rand' ? 600 : 400, piek: v * 0.7, aanslag: 0.002, verval: 0.05, pan });
      ruisStoot(t + 0.01, { soort: 'highpass', freq: 3000, piek: v * 0.22, aanslag: 0.004, verval: 0.08, pan }); // magnesiumpufje
    },
    /** Een klimschoentje op een trede (een piepje van rubber) of op de grond. */
    voetje(grond = false) {
      const t = plek(0.2);
      if (t < 0) return;
      const v = G.klim.voet;
      if (grond) ruisStoot(t, { soort: 'lowpass', freq: 600, piek: v, verval: 0.06 });
      else {
        toon(t, { freq: 1100, freqEind: 1450, piek: v * 0.5, aanslag: 0.004, verval: 0.05 });
        ruisStoot(t, { freq: 1800, q: 2, piek: v * 0.6, verval: 0.05 });
      }
    },
    /** "Hmm-mm": die greep is te ver (of niet van jouw route). */
    teVer() {
      const t = plek(0.5);
      if (t < 0) return;
      const v = G.klim.teVer;
      toon(t, { vorm: 'triangle', freq: 330, freqEind: 300, piek: v, aanslag: 0.02, verval: 0.14 });
      toon(t + 0.18, { vorm: 'triangle', freq: 280, freqEind: 230, piek: v, aanslag: 0.02, verval: 0.18 });
    },
    /** Een hand glijdt weg: een veeg en een geschrokken "oei". */
    glijden() {
      const t = plek(0.5);
      if (t < 0) return;
      const v = G.klim.glijden;
      ruisStoot(t, { freq: 2200, freqEind: 600, q: 1.2, piek: v * 0.7, aanslag: 0.01, verval: 0.2 });
      toon(t + 0.05, { freq: 620, freqEind: 880, piek: v * 0.5, aanslag: 0.02, verval: 0.12 });
      toon(t + 0.2, { freq: 880, freqEind: 560, piek: v * 0.4, aanslag: 0.01, verval: 0.15 });
    },
    /** Vallen: het touw zoeft door het anker. */
    val() {
      const t = plek(0.6);
      if (t < 0) return;
      const v = G.klim.val;
      ruisStoot(t, { freq: 500, freqEind: 2400, q: 1.5, piek: v, aanslag: 0.05, verval: 0.3 });
      toon(t, { freq: 700, freqEind: 380, piek: v * 0.35, aanslag: 0.01, verval: 0.3 });
    },
    /** Het touw vangt je op (een ruk en een doinggg), en daarna een opgeluchte zucht. */
    touwRuk() {
      const t = plek(1.4);
      if (t < 0) return;
      const v = G.klim.ruk;
      toon(t, { freq: 95, freqEind: 60, piek: v, aanslag: 0.003, verval: 0.16 });
      toon(t, { vorm: 'triangle', freq: 150, freqEind: 140, piek: v * 0.35, aanslag: 0.003, verval: 0.45 });
      ruisStoot(t + 0.45, { soort: 'lowpass', freq: 900, freqEind: 300, piek: G.klim.zucht, aanslag: 0.08, verval: 0.6 });
    },
    /** Boven! Klokjes omhoog, en een glinster. */
    top() {
      const t = plek(1.6);
      if (t < 0) return;
      const L = G.toonladder;
      const v = G.klim.top;
      [L[0], L[1], L[2], L[3], L[4], L[0] * 2].forEach((f, i) => toon(t + i * 0.08, { vorm: 'triangle', freq: f, piek: v, aanslag: 0.004, verval: 0.35 }));
      for (const f of [L[0] * 2, L[2] * 2, L[4] * 2]) toon(t + 0.5, { vorm: 'triangle', freq: f, piek: v * 0.6, aanslag: 0.01, verval: 1.0 });
    },
    /** Laten zakken: het touw ruist zacht door het anker. */
    zakken() {
      const t = plek(1.6);
      if (t < 0) return;
      ruisStoot(t, { freq: 1300, freqEind: 900, q: 2, piek: G.klim.zakken, aanslag: 0.3, verval: 1.2 });
    },
    /** Uitschudden: een armpje dat flappert. */
    schud() {
      const t = plek(0.5);
      if (t < 0) return;
      for (let i = 0; i < 4; i++) ruisStoot(t + i * 0.09, { freq: 700, q: 1, piek: G.klim.schud, aanslag: 0.01, verval: 0.05 });
    },
    /** Zwaar ademen als de armen vol zitten. */
    adem() {
      const t = plek(0.8);
      if (t < 0) return;
      ruisStoot(t, { soort: 'bandpass', freq: 1100, freqEind: 800, q: 0.7, piek: G.klim.adem, aanslag: 0.15, verval: 0.3 });
      ruisStoot(t + 0.42, { soort: 'bandpass', freq: 700, freqEind: 500, q: 0.7, piek: G.klim.adem * 0.8, aanslag: 0.1, verval: 0.3 });
    },

    /** Een klokje uit de vijftonige toonladder; snel na elkaar wordt elk klokje hoger. */
    bloesem(reeks) {
      const t = plek(0.9);
      if (t < 0) return;
      const ladder = G.toonladder;
      const i = Math.min(reeks, ladder.length * 2 - 1);
      const f = ladder[i % ladder.length] * (i >= ladder.length ? 2 : 1);
      toon(t, { freq: f, piek: G.bloesem, aanslag: 0.004, verval: 0.7 });
      toon(t, { freq: f * 2.76, piek: G.bloesem * 0.18, aanslag: 0.002, verval: 0.25 }); // klokkenklank
      toon(t + 0.06, { freq: f * 2, piek: G.bloesem * 0.35, aanslag: 0.004, verval: 0.45 });
    },

    plons(sterkte) {
      const t = plek(0.6);
      if (t < 0) return;
      const v = G.plons * Math.min(1, 0.5 + sterkte / 5);
      ruisStoot(t, { freq: 1800, freqEind: 350, q: 0.9, piek: v, aanslag: 0.01, verval: 0.45 });
      toon(t, { freq: 260, freqEind: 110, piek: v * 0.5, verval: 0.2 });
      // Druppeltjes erna.
      for (let k = 0; k < 3; k++) toon(t + 0.15 + Math.random() * 0.3, { freq: 900 + Math.random() * 900, freqEind: 1800, piek: v * 0.15, verval: 0.06 });
    },

    zwemslag() {
      const t = plek(0.4);
      if (t < 0) return;
      ruisStoot(t, { freq: 700, freqEind: 1300, q: 1.2, piek: G.zwemslag, aanslag: 0.12, verval: 0.25 });
    },

    /** Zachte plof bij mislukken, met een tinkeltje als je terug op veilige grond staat. */
    plof() {
      const t = plek(0.8);
      if (t < 0) return;
      ruisStoot(t, { soort: 'lowpass', freq: 900, freqEind: 250, piek: G.plof, aanslag: 0.02, verval: 0.28 });
      toon(t, { freq: 180, freqEind: 90, piek: G.plof * 0.7, aanslag: 0.01, verval: 0.2 });
      toon(t + 0.25, { freq: G.toonladder[2] * 2, piek: G.plof * 0.4, verval: 0.4 });
      toon(t + 0.33, { freq: G.toonladder[4] * 2, piek: G.plof * 0.4, verval: 0.5 });
    },

    /**
     * Elk beeld: het water van de rivier (stap 10).
     * @param {number} nabij 0..1 hoe dicht bij het water
     * @param {number} snel 0..1 hoe snel het water (of het vlot) gaat
     * @param {number} val 0..1 hoe dicht bij de waterval
     */
    rivier(nabij, snel, val) {
      if (!ctx || ctx.state !== 'running' || !omgeving.rivier) return;
      const t = ctx.currentTime;
      const R = G.rivier;
      omgeving.rivier.g.gain.setTargetAtTime(R.gerommel * nabij * (0.5 + 0.5 * snel), t, 0.3);
      omgeving.rivier.f.frequency.setTargetAtTime(300 + 260 * snel, t, 0.3);
      omgeving.ruisen.g.gain.setTargetAtTime(R.ruisen * nabij * snel * snel, t, 0.25);
      omgeving.ruisen.f.frequency.setTargetAtTime(1100 + 1400 * snel, t, 0.3);
      omgeving.waterval.g.gain.setTargetAtTime(R.waterval * val, t, 0.3);
    },

    /** Een peddelslag: het blad gaat het water in. */
    peddel(sterkte = 1) {
      const t = plek(0.4);
      if (t < 0) return;
      const v = G.rivier.peddel * (0.5 + 0.5 * sterkte);
      ruisStoot(t, { freq: 1300, freqEind: 600, q: 1.4, piek: v, aanslag: 0.015, verval: 0.18, pan: (Math.random() - 0.5) * 0.6 });
      toon(t + 0.02, { freq: 420, freqEind: 220, piek: v * 0.25, verval: 0.07 });
    },

    /** Het vlot botst: een holle bamboe-bonk, en spetters als het een rots was. */
    vlotBots(sterkte, rots) {
      const t = plek(0.6);
      if (t < 0) return;
      const v = G.rivier.bots * (0.5 + 0.5 * sterkte);
      toon(t, { vorm: 'triangle', freq: 190, freqEind: 120, piek: v, aanslag: 0.002, verval: 0.18 });
      toon(t + 0.01, { vorm: 'triangle', freq: 470, freqEind: 330, piek: v * 0.5, aanslag: 0.002, verval: 0.1 });
      toon(t + 0.07, { vorm: 'triangle', freq: 410, freqEind: 300, piek: v * 0.3, aanslag: 0.002, verval: 0.08 });
      if (rots) ruisStoot(t + 0.02, { freq: 1600, freqEind: 500, q: 0.9, piek: v * 0.6, aanslag: 0.01, verval: 0.3 });
    },

    /** Over de sprong: een zoef, en de wind langs je oren. */
    zoef() {
      const t = plek(1.2);
      if (t < 0) return;
      ruisStoot(t, { freq: 500, freqEind: 2600, q: 1.6, piek: G.rivier.zoef, aanslag: 0.25, verval: 0.6 });
      toon(t, { freq: G.toonladder[0], freqEind: G.toonladder[4], piek: G.rivier.zoef * 0.3, aanslag: 0.05, verval: 0.6 });
    },

    /** Een stam valt op het vlot (bouwen): een holle tik, steeds een toontje hoger. */
    bamboe(n = 0) {
      const t = plek(0.4);
      if (t < 0) return;
      const f = 300 * Math.pow(1.12, n % 12);
      toon(t, { vorm: 'triangle', freq: f, freqEind: f * 0.7, piek: G.rivier.bamboe, aanslag: 0.002, verval: 0.12 });
      toon(t, { vorm: 'sine', freq: f * 2.6, freqEind: f * 2, piek: G.rivier.bamboe * 0.3, aanslag: 0.002, verval: 0.06 });
    },

    // --- De pony (GD 16) ---

    /** Eén hoefslag op gras, zand, rots of in het water. sterkte 0..1 (stap zacht, galop luid). */
    hoef(ondergrond, sterkte) {
      const t = plek(0.15);
      if (t < 0) return;
      const v = G.hoef * (0.55 + sterkte * 0.6);
      const pan = Math.random() * 0.3 - 0.15;
      if (ondergrond === 'water') {
        ruisStoot(t, { freq: 1100, freqEind: 500, q: 1.4, piek: v * 1.1, aanslag: 0.008, verval: 0.16, pan });
        return;
      }
      // Een doffe klop, met wat ruis erbovenop: gras is zacht, zand ruist, rots klikt.
      toon(t, { vorm: 'triangle', freq: 150 + Math.random() * 30, freqEind: 75, piek: v, aanslag: 0.003, verval: 0.07, pan });
      if (ondergrond === 'zand') ruisStoot(t, { soort: 'lowpass', freq: 1300, freqEind: 400, piek: v * 0.7, aanslag: 0.005, verval: 0.08, pan });
      else if (ondergrond === 'rots') ruisStoot(t, { soort: 'highpass', freq: 2200, piek: v * 0.45, verval: 0.025, pan });
      else ruisStoot(t, { freq: 700, freqEind: 350, q: 0.9, piek: v * 0.55, aanslag: 0.004, verval: 0.06, pan });
    },

    /** De avonturier fluit haar pony: twee vrolijke fluittonen. */
    fluit() {
      const t = plek(0.7);
      if (t < 0) return;
      const vib = (s, f0, f1, d) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(f0, s);
        o.frequency.exponentialRampToValueAtTime(f1, s + d * 0.8);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 7;
        const diep = ctx.createGain();
        diep.gain.value = 25;
        lfo.connect(diep).connect(o.frequency);
        const g = omhul(s, G.fluit, 0.03, d);
        o.connect(g);
        naarUit(g);
        o.start(s);
        lfo.start(s);
        o.stop(s + d + 0.1);
        lfo.stop(s + d + 0.1);
      };
      vib(t, 1500, 2150, 0.16);
      vib(t + 0.22, 1350, 2000, 0.3);
      ruisStoot(t, { soort: 'highpass', freq: 3500, piek: G.fluit * 0.12, aanslag: 0.02, verval: 0.45 });
    },

    /** Hinniken: een vrolijk, hoog gehinnik met een trilling (blij = korter en hoger). */
    hinnik(blij = false) {
      const t = plek(1.2);
      if (t < 0) return;
      const duur = blij ? 0.55 : 0.85;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f0 = blij ? 1250 : 1100;
      o.frequency.setValueAtTime(f0 * 0.85, t);
      o.frequency.linearRampToValueAtTime(f0, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + duur);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 11;
      const diep = ctx.createGain();
      diep.gain.value = 70;
      lfo.connect(diep).connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 1.6;
      const zacht = ctx.createBiquadFilter();
      zacht.type = 'lowpass';
      zacht.frequency.value = 2600;
      // Trilling in de luidheid: het typische "hihihi".
      const trem = ctx.createGain();
      trem.gain.value = 0.6;
      const tl = ctx.createOscillator();
      tl.frequency.value = 13;
      const td = ctx.createGain();
      td.gain.value = 0.4;
      tl.connect(td).connect(trem.gain);
      const g = omhul(t, G.hinnik, 0.04, duur);
      o.connect(f).connect(zacht).connect(trem).connect(g);
      naarUit(g);
      for (const x of [o, lfo, tl]) {
        x.start(t);
        x.stop(t + duur + 0.1);
      }
      ruisStoot(t + duur * 0.6, { soort: 'bandpass', freq: 900, q: 1.5, piek: G.hinnik * 0.35, aanslag: 0.05, verval: 0.3 });
    },

    /** Snuiven: lippen die brrr doen. */
    snuif() {
      const t = plek(0.5);
      if (t < 0) return;
      const bron = ctx.createBufferSource();
      bron.buffer = ruis;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 650;
      f.Q.value = 1.8;
      const trem = ctx.createGain();
      trem.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 26;
      const ld = ctx.createGain();
      ld.gain.value = 0.5;
      lfo.connect(ld).connect(trem.gain);
      const g = omhul(t, G.snuif, 0.02, 0.38);
      bron.connect(f).connect(trem).connect(g);
      naarUit(g);
      bron.start(t, Math.random());
      lfo.start(t);
      bron.stop(t + 0.45);
      lfo.stop(t + 0.45);
      toon(t, { vorm: 'sawtooth', freq: 85, freqEind: 70, piek: G.snuif * 0.25, aanslag: 0.02, verval: 0.3 });
    },

    /** Afzet: een zwiep door de lucht. */
    ponySprong() {
      const t = plek(0.35);
      if (t < 0) return;
      ruisStoot(t, { freq: 500, freqEind: 1900, q: 1.2, piek: G.ponySprong, aanslag: 0.08, verval: 0.22 });
      toon(t, { freq: 260, freqEind: 520, piek: G.ponySprong * 0.5, aanslag: 0.01, verval: 0.14 });
    },

    /** Neerkomen: eerst de voorhoeven, dan de achterhoeven. */
    ponyLanding(sterkte, ondergrond) {
      const t = plek(0.3);
      if (t < 0) return;
      const v = G.ponyLanding * Math.min(1, 0.5 + sterkte / 10);
      for (const [d, s] of [[0, 1], [0.09, 0.8]]) {
        toon(t + d, { vorm: 'triangle', freq: 120, freqEind: 60, piek: v * s, aanslag: 0.003, verval: 0.1 });
        ruisStoot(t + d, { soort: 'lowpass', freq: ondergrond === 'zand' ? 1200 : 700, freqEind: 250, piek: v * s * 0.7, aanslag: 0.004, verval: 0.12 });
      }
    },

    /** Een perfecte sprong: een fonkelend loopje omhoog. */
    perfect() {
      const t = plek(1.2);
      if (t < 0) return;
      const L = G.toonladder;
      [L[0], L[2], L[3], L[4], L[0] * 2, L[2] * 2].forEach((f, i) => {
        toon(t + i * 0.055, { freq: f, piek: G.perfect, aanslag: 0.004, verval: 0.5 });
        toon(t + i * 0.055, { freq: f * 2.76, piek: G.perfect * 0.15, aanslag: 0.002, verval: 0.2 });
      });
      for (let k = 0; k < 6; k++) toon(t + 0.35 + Math.random() * 0.4, { freq: 3000 + Math.random() * 2500, piek: G.perfect * 0.18, verval: 0.12 });
    },

    /** Weigeren: snuiven en het schudden van de manen. */
    weigeren() {
      this.snuif();
      const t = plek(0.8);
      if (t < 0) return;
      for (let k = 0; k < 4; k++) ruisStoot(t + 0.15 + k * 0.11, { soort: 'highpass', freq: 1800, piek: G.weigeren, aanslag: 0.01, verval: 0.07, pan: k % 2 ? 0.25 : -0.25 });
    },

    /** Knabbelen aan een wortel: krok krok krok. */
    knabbel() {
      const t = plek(0.6);
      if (t < 0) return;
      for (let k = 0; k < 4; k++) {
        ruisStoot(t + k * 0.1, { freq: 2600, freqEind: 1400, q: 2.5, piek: G.knabbel, aanslag: 0.003, verval: 0.04 });
        toon(t + k * 0.1, { vorm: 'triangle', freq: 520, freqEind: 300, piek: G.knabbel * 0.4, verval: 0.04 });
      }
      toon(t + 0.45, { freq: G.toonladder[3] * 2, piek: G.knabbel * 0.6, verval: 0.3 });
    },

    /** Aaien: een tevreden, zacht gegrinnik en een tinkeltje. */
    aai() {
      const t = plek(0.8);
      if (t < 0) return;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.45);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 9;
      const ld = ctx.createGain();
      ld.gain.value = 18;
      lfo.connect(ld).connect(o.frequency);
      const g = omhul(t, G.aai, 0.04, 0.45);
      o.connect(g);
      naarUit(g);
      o.start(t);
      lfo.start(t);
      o.stop(t + 0.55);
      lfo.stop(t + 0.55);
      toon(t + 0.12, { freq: G.toonladder[4] * 2, piek: G.aai * 0.5, verval: 0.4 });
      toon(t + 0.22, { freq: G.toonladder[2] * 4, piek: G.aai * 0.35, verval: 0.4 });
    },

    /** Opstappen: hupsakee, met een zacht kraakje van het zadeldekje. */
    opstappen() {
      const t = plek(0.4);
      if (t < 0) return;
      toon(t, { freq: 380, freqEind: 700, piek: G.opstappen, aanslag: 0.01, verval: 0.16 });
      ruisStoot(t + 0.18, { freq: 380, q: 5, piek: G.opstappen * 0.6, aanslag: 0.02, verval: 0.12 });
    },

    /** Een tikje met de hoeven tegen een hindernis. */
    tik() {
      const t = plek(0.2);
      if (t < 0) return;
      toon(t, { vorm: 'triangle', freq: 520, freqEind: 330, piek: G.tik, aanslag: 0.002, verval: 0.06 });
      ruisStoot(t, { soort: 'highpass', freq: 2500, piek: G.tik * 0.4, verval: 0.02 });
    },

    /** Een hindernis van de ronde is gesprongen: één klokje, hoger naargelang hoeveel er al gedaan zijn. */
    hindernisTel(n) {
      const t = plek(0.6);
      if (t < 0) return;
      const L = G.toonladder;
      const f = L[n % L.length] * (n >= L.length ? 2 : 1);
      toon(t, { freq: f, piek: G.tel, aanslag: 0.004, verval: 0.55 });
      toon(t, { freq: f * 2.76, piek: G.tel * 0.15, aanslag: 0.002, verval: 0.2 });
    },

    /** Een ronde uitgereden: een klokjesloopje (met een extra zwier bij een nieuw record). */
    rondeKlaar(record) {
      const t = plek(1.8);
      if (t < 0) return;
      const L = G.toonladder;
      const reeks = record ? [L[0], L[2], L[3], L[4], L[0] * 2, L[2] * 2, L[3] * 2] : [L[0], L[2], L[3], L[0] * 2];
      reeks.forEach((f, i) => {
        toon(t + i * 0.11, { freq: f, piek: G.ronde, aanslag: 0.005, verval: 0.7 });
        toon(t + i * 0.11, { freq: f * 2, piek: G.ronde * 0.3, aanslag: 0.005, verval: 0.4 });
      });
      const eind = t + reeks.length * 0.11;
      toon(eind, { freq: L[0] * 2, piek: G.ronde * 0.8, verval: 1.0 });
      toon(eind, { freq: L[3] * 2, piek: G.ronde * 0.6, verval: 1.0 });
    },

    // --- De tijger (GD 16) ---

    /** Proesten: het vriendelijke "prrt-prrt" door de neus waarmee tijgers elkaar begroeten. */
    proest(keer = 2) {
      const t = plek(0.8);
      if (t < 0) return;
      for (let i = 0; i < keer; i++) {
        const t0 = t + i * 0.17;
        // Een luchtstoot door de neus, met fladderende lippen (snel aan en uit).
        const bron = ctx.createBufferSource();
        bron.buffer = ruis;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(950, t0);
        f.frequency.exponentialRampToValueAtTime(420, t0 + 0.14);
        f.Q.value = 1.2;
        const fladder = ctx.createGain();
        fladder.gain.value = 0.55;
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 34;
        const ld = ctx.createGain();
        ld.gain.value = 0.45;
        lfo.connect(ld).connect(fladder.gain);
        const g = omhul(t0, G.proest * (i === 0 ? 1 : 0.8), 0.012, 0.15);
        bron.connect(f).connect(fladder).connect(g);
        naarUit(g);
        bron.start(t0, Math.random());
        bron.stop(t0 + 0.2);
        lfo.start(t0);
        lfo.stop(t0 + 0.2);
        // Een zacht stemmetje eronder.
        toon(t0, { vorm: 'triangle', freq: 150, freqEind: 110, piek: G.proest * 0.25, aanslag: 0.01, verval: 0.13 });
      }
    },

    /** Spinnen: een diep, rommelend gesnor, in en uit ademend. */
    /**
     * Een welpje piept: een klein, hoog "mieuw" dat omhoog en weer omlaag glijdt (stap 8b).
     * hoogte: 1 = gewoon, hoger = nog kleiner en feller (bv. als hij gevangen wordt); luid 0..1.
     */
    piep(hoogte = 1, luid = 1) {
      const duur = 0.24 + Math.random() * 0.12;
      const t = plek(duur + 0.1);
      if (t < 0) return;
      const f0 = (720 + Math.random() * 160) * hoogte;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * 1.45, t + duur * 0.35);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.82, t + duur);
      // Een trillertje in de stem.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 17;
      const diep = ctx.createGain();
      diep.gain.value = f0 * 0.03;
      lfo.connect(diep).connect(o.frequency);
      // "mi-" (dicht) naar "-euw" (open): het filter gaat open en weer dicht.
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2.2;
      f.frequency.setValueAtTime(f0 * 1.4, t);
      f.frequency.linearRampToValueAtTime(f0 * 2.6, t + duur * 0.4);
      f.frequency.exponentialRampToValueAtTime(f0 * 1.2, t + duur);
      const g = omhul(t, G.piep * luid, 0.03, duur);
      o.connect(f).connect(g);
      naarUit(g, Math.random() * 0.6 - 0.3);
      for (const x of [o, lfo]) {
        x.start(t);
        x.stop(t + duur + 0.08);
      }
    },

    // --- Schatjesmomenten van de welpjes (stap 8c) ---

    /** "Ha ... ha ... TSJIE!": twee piepkleine inademingen en een fel niesje (het niesje valt 0,55 s na het begin). */
    nies() {
      const t = plek(0.9);
      if (t < 0) return;
      const G2 = G.nies;
      for (const [dt, f] of [[0, 900], [0.27, 1050]]) {
        // "ha": een ademstootje met een klein stemmetje dat omhoog gaat.
        ruisStoot(t + dt, { soort: 'bandpass', freq: 1700 + f * 0.4, q: 1.6, piek: G2 * 0.35, aanslag: 0.04, verval: 0.14 });
        toon(t + dt, { vorm: 'triangle', freq: f, freqEind: f * 1.25, piek: G2 * 0.3, aanslag: 0.03, verval: 0.12 });
      }
      // "TSJIE!": een scherpe sis en een piepje dat naar beneden valt.
      const t2 = t + 0.55;
      ruisStoot(t2, { soort: 'highpass', freq: 4200, freqEind: 2600, q: 0.8, piek: G2, aanslag: 0.004, verval: 0.2 });
      ruisStoot(t2, { soort: 'bandpass', freq: 2400, freqEind: 1400, q: 2, piek: G2 * 0.6, aanslag: 0.004, verval: 0.1 });
      toon(t2 + 0.01, { vorm: 'triangle', freq: 1500, freqEind: 820, piek: G2 * 0.55, aanslag: 0.005, verval: 0.16 });
    },

    /** "Hik!": een piepklein, kort hikje. */
    hik() {
      const t = plek(0.15);
      if (t < 0) return;
      const f = 1050 + Math.random() * 150;
      toon(t, { vorm: 'triangle', freq: f, freqEind: f * 1.5, piek: G.hik, aanslag: 0.004, verval: 0.07 });
      ruisStoot(t, { soort: 'bandpass', freq: 2600, q: 3, piek: G.hik * 0.5, aanslag: 0.002, verval: 0.03 });
    },

    /** "Mrr?": een vragend piepje dat omhoog gaat (de kopjes gaan schuin). keer: hoeveel welpjes tegelijk. */
    huh(keer = 3) {
      for (let i = 0; i < keer; i++) {
        const duur = 0.26 + Math.random() * 0.06;
        const t = plek(duur + 0.1);
        if (t < 0) return;
        const t0 = t + i * 0.07;
        const f0 = (560 + Math.random() * 120) * (1 + i * 0.12);
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.linearRampToValueAtTime(f0 * 0.92, t0 + duur * 0.35);
        o.frequency.exponentialRampToValueAtTime(f0 * 1.7, t0 + duur);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 1.8;
        f.frequency.setValueAtTime(f0 * 1.3, t0);
        f.frequency.exponentialRampToValueAtTime(f0 * 2.4, t0 + duur);
        const g = omhul(t0, G.huh * (i === 0 ? 1 : 0.75), 0.04, duur);
        o.connect(f).connect(g);
        naarUit(g, (i - 1) * 0.35);
        o.start(t0);
        o.stop(t0 + duur + 0.08);
      }
    },

    /** Mee proberen te brullen: een klein "hrr" van inspanning ... en dan alleen "mieuw!". */
    miniBrul() {
      const t = plek(0.25);
      if (t < 0) return;
      ruisStoot(t, { soort: 'lowpass', freq: 900, freqEind: 500, q: 2, piek: G.piep * 0.35, aanslag: 0.05, verval: 0.15 });
      setTimeout(() => this.piep(1.2, 1.15), 170);
    },

    // --- Spelen met elkaar (stap 8d) ---

    /** Verstoppertje: de zoeker telt, elk getal een zacht piepje dat een tikje hoger gaat. */
    tel(n) {
      const t = plek(0.25);
      if (t < 0) return;
      const f = 620 * Math.pow(1.06, Math.min(n, 9));
      toon(t, { vorm: 'triangle', freq: f, freqEind: f * 0.92, piek: G.welpSpel.tel, aanslag: 0.02, verval: 0.16 });
      toon(t, { vorm: 'sine', freq: f * 2, piek: G.welpSpel.tel * 0.25, aanslag: 0.02, verval: 0.1 });
    },

    /** Geritsel van bladeren (een welpje kruipt in een struik, of springt eruit). */
    ritsel(sterk = 1) {
      const t = plek(0.5);
      if (t < 0) return;
      for (let i = 0; i < 4; i++) {
        ruisStoot(t + i * 0.07 + Math.random() * 0.03, {
          soort: 'bandpass', freq: 2600 + Math.random() * 2200, q: 1.4, piek: G.welpSpel.ritsel * sterk * (1 - i * 0.15), aanslag: 0.01, verval: 0.07 + Math.random() * 0.05,
        });
      }
    },

    /** Een takje valt in het gras: "tok". */
    tok() {
      const t = plek(0.3);
      if (t < 0) return;
      toon(t, { vorm: 'triangle', freq: 640, freqEind: 420, piek: G.welpSpel.tok, aanslag: 0.002, verval: 0.09 });
      toon(t + 0.11, { vorm: 'triangle', freq: 560, freqEind: 400, piek: G.welpSpel.tok * 0.45, aanslag: 0.002, verval: 0.07 });
      ruisStoot(t, { soort: 'bandpass', freq: 1800, q: 2, piek: G.welpSpel.tok * 0.4, aanslag: 0.002, verval: 0.05 });
    },

    /** Krak! Het takje breekt. */
    krak() {
      const t = plek(0.4);
      if (t < 0) return;
      for (let i = 0; i < 3; i++) {
        ruisStoot(t + i * 0.018, { soort: 'highpass', freq: 2200 + i * 900, q: 0.9, piek: G.welpSpel.krak * (1 - i * 0.25), aanslag: 0.001, verval: 0.04 });
      }
      toon(t, { vorm: 'square', freq: 260, freqEind: 140, piek: G.welpSpel.krak * 0.25, aanslag: 0.001, verval: 0.06 });
    },

    /** Het takje schiet los: een zacht "zwiep". */
    zwiep() {
      const t = plek(0.3);
      if (t < 0) return;
      ruisStoot(t, { soort: 'bandpass', freq: 900, freqEind: 3200, q: 3, piek: G.welpSpel.krak * 0.5, aanslag: 0.06, verval: 0.12 });
    },

    /** Een piepklein grommetje van inspanning (trekken aan de tak). */
    miniGrom() {
      const duur = 0.22 + Math.random() * 0.1;
      const t = plek(duur + 0.05);
      if (t < 0) return;
      const f0 = 300 + Math.random() * 80;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * 0.85, t + duur);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 36;
      const ld = ctx.createGain();
      ld.gain.value = f0 * 0.1;
      lfo.connect(ld).connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1500;
      const g = omhul(t, G.welpSpel.grom, 0.04, duur);
      o.connect(f).connect(g);
      naarUit(g, Math.random() * 0.6 - 0.3);
      for (const x of [o, lfo]) {
        x.start(t);
        x.stop(t + duur + 0.08);
      }
    },

    /** Duizelig: een wiebelend fluitje dat omlaag glijdt ("wieieieuw"). */
    duizelig() {
      const t = plek(1);
      if (t < 0) return;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1300, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.85);
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(7, t);
      lfo.frequency.linearRampToValueAtTime(4, t + 0.85);
      const ld = ctx.createGain();
      ld.gain.value = 70;
      lfo.connect(ld).connect(o.frequency);
      const g = omhul(t, G.welpSpel.duizelig, 0.05, 0.85);
      o.connect(g);
      naarUit(g);
      for (const x of [o, lfo]) {
        x.start(t);
        x.stop(t + 0.95);
      }
    },

    /** Kopje-onder: een zachte plof in het gras en een verschrikt piepje. */
    tuimel() {
      const t = plek(0.4);
      if (t < 0) return;
      ruisStoot(t, { soort: 'lowpass', freq: 700, freqEind: 220, piek: G.tuimel, aanslag: 0.01, verval: 0.22 });
      toon(t, { freq: 170, freqEind: 95, piek: G.tuimel * 0.6, aanslag: 0.005, verval: 0.16 });
      ruisStoot(t + 0.05, { soort: 'bandpass', freq: 3000, q: 1, piek: G.tuimel * 0.25, aanslag: 0.01, verval: 0.18 });
    },

    spin(duur = 2.4) {
      const t = plek(duur + 0.2);
      if (t < 0) return;
      const bron = ctx.createBufferSource();
      bron.buffer = ruis;
      bron.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 360;
      f.Q.value = 2;
      const brom = ctx.createOscillator();
      brom.type = 'sawtooth';
      brom.frequency.value = 52;
      const bromF = ctx.createBiquadFilter();
      bromF.type = 'lowpass';
      bromF.frequency.value = 220;
      const bromG = ctx.createGain();
      bromG.gain.value = 0.5;
      // Het snorren zelf: ±25 tikjes per seconde.
      const snor = ctx.createGain();
      snor.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 25;
      const ld = ctx.createGain();
      ld.gain.value = 0.5;
      lfo.connect(ld).connect(snor.gain);
      // In- en uitademen: twee keer aanzwellen.
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      const adem = duur / 2;
      for (let i = 0; i < 2; i++) {
        const a = t + i * adem;
        g.gain.linearRampToValueAtTime(G.spin * (i === 0 ? 0.8 : 1), a + adem * 0.35);
        g.gain.linearRampToValueAtTime(G.spin * 0.25, a + adem * 0.95);
      }
      g.gain.exponentialRampToValueAtTime(0.0001, t + duur + 0.1);
      bron.connect(f).connect(snor);
      brom.connect(bromF).connect(bromG).connect(snor);
      snor.connect(g);
      naarUit(g);
      bron.start(t, Math.random());
      brom.start(t);
      lfo.start(t);
      for (const x of [bron, brom, lfo]) x.stop(t + duur + 0.15);
    },

    /** De brul: een grote, rommelende brul die aanzwelt en wegzakt. */
    brul(sterk = 1) {
      const t = plek(2.2);
      if (t < 0) return;
      const duur = 1.5;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t);
      o.frequency.linearRampToValueAtTime(175, t + 0.28);
      o.frequency.linearRampToValueAtTime(150, t + 0.8);
      o.frequency.exponentialRampToValueAtTime(62, t + duur);
      const o2 = ctx.createOscillator();
      o2.type = 'sawtooth';
      o2.frequency.setValueAtTime(113, t);
      o2.frequency.linearRampToValueAtTime(171, t + 0.3);
      o2.frequency.exponentialRampToValueAtTime(60, t + duur);
      // Het grommen: de stem rammelt (snel op en neer in luidheid en toonhoogte).
      const grom = ctx.createOscillator();
      grom.frequency.value = 38;
      const gromD = ctx.createGain();
      gromD.gain.value = 14;
      grom.connect(gromD).connect(o.frequency);
      const rammel = ctx.createGain();
      rammel.gain.value = 0.6;
      const rd = ctx.createGain();
      rd.gain.value = 0.4;
      grom.connect(rd).connect(rammel.gain);
      // De keel en de bek: de bek gaat open (helderder) en weer dicht.
      const keel = ctx.createBiquadFilter();
      keel.type = 'bandpass';
      keel.frequency.setValueAtTime(380, t);
      keel.frequency.linearRampToValueAtTime(720, t + 0.35);
      keel.frequency.exponentialRampToValueAtTime(300, t + duur);
      keel.Q.value = 1.4;
      const bek = ctx.createBiquadFilter();
      bek.type = 'lowpass';
      bek.frequency.setValueAtTime(900, t);
      bek.frequency.linearRampToValueAtTime(2200, t + 0.3);
      bek.frequency.exponentialRampToValueAtTime(500, t + duur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(G.brul * sterk, t + 0.18);
      g.gain.setValueAtTime(G.brul * sterk, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duur + 0.15);
      o.connect(keel);
      o2.connect(keel);
      keel.connect(bek).connect(rammel).connect(g);
      // De lucht die mee naar buiten raast.
      const bron = ctx.createBufferSource();
      bron.buffer = ruis;
      const rf = ctx.createBiquadFilter();
      rf.type = 'bandpass';
      rf.frequency.value = 700;
      rf.Q.value = 0.8;
      const rg = ctx.createGain();
      rg.gain.value = 0.35;
      bron.connect(rf).connect(rg).connect(rammel);
      naarUit(g);
      bron.start(t, Math.random());
      o.start(t);
      o2.start(t);
      grom.start(t);
      for (const x of [o, o2, grom, bron]) x.stop(t + duur + 0.2);
      // En diep in je buik: een lage dreun.
      toon(t + 0.05, { vorm: 'sine', freq: 70, freqEind: 42, piek: G.brul * 0.6 * sterk, aanslag: 0.12, verval: 1.3 });
    },

    /** Een klein grommetje: "nog niet" (de brulmeter is nog niet vol). */
    grom() {
      const t = plek(0.5);
      if (t < 0) return;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.3);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 30;
      const ld = ctx.createGain();
      ld.gain.value = 10;
      lfo.connect(ld).connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 600;
      const g = omhul(t, G.brul * 0.25, 0.04, 0.3);
      o.connect(f).connect(g);
      naarUit(g);
      for (const x of [o, lfo]) {
        x.start(t);
        x.stop(t + 0.4);
      }
    },

    /** Een slaapbloem gaat open: klokjes die de toonladder opklimmen, met een glinstering erboven. */
    bloemOpen() {
      const t = plek(2.4);
      if (t < 0) return;
      const L = G.toonladder;
      const reeks = [L[0] / 2, L[2] / 2, L[3] / 2, L[0], L[1], L[2], L[3], L[4], L[0] * 2, L[2] * 2];
      reeks.forEach((f, i) => {
        toon(t + i * 0.12, { freq: f, piek: G.bloemOpen, aanslag: 0.004, verval: 0.9 });
        toon(t + i * 0.12, { freq: f * 2.76, piek: G.bloemOpen * 0.12, aanslag: 0.002, verval: 0.3 });
      });
      ruisStoot(t + 0.3, { soort: 'highpass', freq: 6000, piek: G.bloemOpen * 0.25, aanslag: 0.6, verval: 1.2 });
    },

    /** De schat: een vrolijk loopje en een regen van glinsters. */
    schat() {
      const t = plek(2.0);
      if (t < 0) return;
      const L = G.toonladder;
      [L[0], L[2], L[3], L[0] * 2].forEach((f, i) => {
        toon(t + i * 0.09, { vorm: 'triangle', freq: f, piek: G.schat, aanslag: 0.005, verval: 0.4 });
      });
      const e = t + 0.4;
      for (const f of [L[0] * 2, L[2] * 2, L[3] * 2]) toon(e, { vorm: 'triangle', freq: f, piek: G.schat * 0.7, aanslag: 0.01, verval: 1.2 });
      for (let i = 0; i < 10; i++) toon(e + 0.1 + i * 0.07, { freq: L[i % 5] * 4, piek: G.schat * 0.12, aanslag: 0.002, verval: 0.2 });
    },
  };
}
