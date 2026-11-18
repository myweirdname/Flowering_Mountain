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
  const omgeving = { branding: null, insecten: null };
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
  };
}
