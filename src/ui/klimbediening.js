// De bediening aan de klimwand (KL 7): "Tikken" (tik op een greep, het spel kiest de hand) en "Handen" (sleep je
// linker- of rechterhand naar een greep). Werkt met touch en muis. Grepen binnen bereik lichten op; een greep die te
// ver is, knippert rood. Knoppen: wisselen van besturing en laten zakken. Pc: T wisselt, B laat zakken,
// E (ingedrukt) schudt uit, WASD leunt. Dit is invoer en uitleg: de simulatie beslist wat er echt gebeurt.
// Stap 15a: het pofzakje (magnesium, R) met een bolletje per beurt; de springknop (spatie) blijft aan de wand: dat is
// de dyno (ingedrukt houden, richten met de joystick of WASD, loslaten). Bij een knieklem is E vleermuisrust.
import * as THREE from 'three';

const TIK_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="30" r="15" fill="none" stroke="#fff" stroke-width="5" opacity="0.8"/>
  <circle cx="50" cy="30" r="25" fill="none" stroke="#fff" stroke-width="4" opacity="0.45"/>
  <path d="M44 86 C34 76 30 66 32 58 C34 53 40 53 42 58 L44 62 V30 C44 24 54 24 54 30 V52 L66 54 C74 56 76 62 74 70 L70 86 Z"
        fill="#fff" stroke="#c2417a" stroke-width="5" stroke-linejoin="round"/>
</svg>`;
const HANDEN_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g fill="#fff" stroke="#2f7d6d" stroke-width="4.5" stroke-linejoin="round">
    <path d="M14 70 C10 58 12 40 18 30 C21 26 26 28 25 33 L24 44 L28 24 C29 19 36 20 35 26 L33 42 L38 22 C39 17 46 18 45 24 L42 44 L46 30 C47 26 53 27 52 32 L48 58 C46 68 38 76 28 78 Z"/>
    <path d="M86 70 C90 58 88 40 82 30 C79 26 74 28 75 33 L76 44 L72 24 C71 19 64 20 65 26 L67 42 L62 22 C61 17 54 18 55 24 L58 44 L54 30 C53 26 47 27 48 32 L52 58 C54 68 62 76 72 78 Z"/>
  </g>
</svg>`;
const KRIJT_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M30 34 H70 L66 84 C66 88 62 90 58 90 H42 C38 90 34 88 34 84 Z" fill="#fff" stroke="#c2417a" stroke-width="5" stroke-linejoin="round"/>
  <path d="M26 30 H74" stroke="#c2417a" stroke-width="8" stroke-linecap="round"/>
  <circle cx="44" cy="18" r="6" fill="#fff" opacity="0.9"/><circle cx="58" cy="12" r="4" fill="#fff" opacity="0.75"/>
  <circle cx="54" cy="24" r="5" fill="#fff" opacity="0.85"/>
</svg>`;
const ZAK_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 10 V58" stroke="#ff5fa2" stroke-width="8" stroke-linecap="round"/>
  <path d="M28 52 L50 80 L72 52 Z" fill="#fff" stroke="#c2417a" stroke-width="5" stroke-linejoin="round"/>
  <path d="M24 90 H76" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
</svg>`;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} ui
 * @param {THREE.PerspectiveCamera} camera
 * @param {ReturnType<typeof import('../sim/klimmen/oefenrots.js').maakOefenrots>} rots
 * @param {typeof import('../data/klimmen.js').KLIMMEN} K
 * @param {{ speler(): any, bereikbaar(lid: string | null): number[], handPlek(lid: string): THREE.Vector3 }} spel
 */
export function maakKlimbediening(canvas, ui, camera, rots, K, spel) {
  let besturing = K.besturing.standaard;
  try {
    const b = localStorage.getItem('klimBesturing');
    if (b === 'tikken' || b === 'handen') besturing = b;
  } catch {
    // Geen opslag: dan de standaard.
  }

  // --- HUD ---
  const hud = document.createElement('div');
  hud.className = 'klimhud';
  hud.innerHTML = `
    <button class="klimknop besturingknop" aria-label="besturing wisselen"></button>
    <button class="klimknop zakknop" aria-label="laten zakken">${ZAK_ICOON}</button>
    <button class="klimknop krijtknop" aria-label="magnesium">${KRIJT_ICOON}<span class="krijtbolletjes"><i></i><i></i><i></i><i></i></span></button>
    <div class="routebadge"></div>
    <div class="klimtoetsen"><span><kbd>E</kbd> uitschudden (ingedrukt)</span><span><kbd>B</kbd> laten zakken</span><span><kbd>T</kbd> tikken / handen</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> leunen</span><span><kbd>R</kbd> magnesium</span><span><kbd>spatie</kbd> dyno (ingedrukt)</span></div>
    <svg class="sleeplijn" width="100%" height="100%"><line x1="0" y1="0" x2="0" y2="0"/><circle r="0"/></svg>`;
  ui.appendChild(hud);
  const besturingKnop = /** @type {HTMLElement} */ (hud.querySelector('.besturingknop'));
  const zakKnop = /** @type {HTMLElement} */ (hud.querySelector('.zakknop'));
  const krijtKnop = /** @type {HTMLElement} */ (hud.querySelector('.krijtknop'));
  const bolletjes = [...hud.querySelectorAll('.krijtbolletjes i')];
  const badge = /** @type {HTMLElement} */ (hud.querySelector('.routebadge'));
  const lijn = /** @type {SVGLineElement} */ (hud.querySelector('.sleeplijn line'));
  const stip = /** @type {SVGCircleElement} */ (hud.querySelector('.sleeplijn circle'));
  const toonBesturing = () => {
    besturingKnop.innerHTML = `${besturing === 'tikken' ? TIK_ICOON : HANDEN_ICOON}<span>${besturing === 'tikken' ? 'tikken' : 'handen'}</span>`;
    besturingKnop.classList.toggle('handen', besturing === 'handen');
  };
  toonBesturing();
  const wissel = () => {
    besturing = besturing === 'tikken' ? 'handen' : 'tikken';
    try {
      localStorage.setItem('klimBesturing', besturing);
    } catch {
      // Niet bewaren lukt niet: geen probleem.
    }
    toonBesturing();
  };
  const knop = (el, doe) =>
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('ingedrukt');
      setTimeout(() => el.classList.remove('ingedrukt'), 150);
      doe();
    });
  let zakGevraagd = false;
  let krijtGevraagd = false;
  knop(besturingKnop, wissel);
  knop(zakKnop, () => (zakGevraagd = true));
  knop(krijtKnop, () => (krijtGevraagd = true));
  /** Toont hoeveel beurten magnesium er nog zijn (een bolletje per beurt). */
  function toonKrijt(n) {
    bolletjes.forEach((b, i) => b.classList.toggle('op', i >= n));
    krijtKnop.classList.toggle('leeg', n <= 0);
  }
  window.addEventListener('keydown', (e) => {
    if (!spel.speler()?.klim) return;
    if (e.code === 'KeyT') wissel();
    if (e.code === 'KeyB') zakGevraagd = true;
  });

  // --- Grepen en handen op het scherm ---
  const p = new THREE.Vector3();
  const opScherm = (v, uit = [0, 0]) => {
    p.copy(v).project(camera);
    uit[0] = (p.x * 0.5 + 0.5) * innerWidth;
    uit[1] = (-p.y * 0.5 + 0.5) * innerHeight;
    return uit;
  };
  let greepWereld = [];
  /** Naar een andere klimwand (stap 13): de grepen van die wand op het scherm. */
  function zetWand(nieuw) {
    rots = nieuw;
    greepWereld = rots.grepen.map((g) => {
      const w = rots.naarWereld(g.u, g.v, 0.05);
      return new THREE.Vector3(w[0], w[1], w[2]);
    });
  }
  zetWand(rots);
  const straal = () => Math.max(30, innerHeight * 0.06);
  /** De dichtste greep bij (x, y) op het scherm: eerst van de eigen route, anders eender welke. */
  function greepBij(x, y, enkelRoute = false) {
    const k = spel.speler()?.klim;
    let beste = -1;
    let besteD = straal();
    let ander = -1;
    let anderD = straal() * 0.7;
    const s = [0, 0];
    for (const g of rots.grepen) {
      if (K.grepen[g.soort].alleenVoet) continue;
      opScherm(greepWereld[g.id], s);
      const d = Math.hypot(s[0] - x, s[1] - y);
      if (k && g.route === k.route) {
        if (d < besteD) {
          besteD = d;
          beste = g.id;
        }
      } else if (d < anderD) {
        anderD = d;
        ander = g.id;
      }
    }
    return beste >= 0 || enkelRoute ? beste : ander;
  }
  function handBij(x, y) {
    let beste = null;
    let besteD = Math.max(44, innerHeight * 0.085);
    const s = [0, 0];
    for (const lid of ['lh', 'rh']) {
      opScherm(spel.handPlek(lid), s);
      const d = Math.hypot(s[0] - x, s[1] - y);
      if (d < besteD) {
        besteD = d;
        beste = lid;
      }
    }
    return beste;
  }

  // --- Gebaren ---
  /** @type {null | { id: number, x: number, y: number, t: number, lid: string | null }} */
  let gebaar = null;
  /** @type {null | { greep: number, lid: string | null }} */
  let zet = null;
  let hint = 0; // de handjes wenken: "sleep mij"
  /** Wat de greep onder je vinger zou doen tijdens het slepen. */
  let sleepDoel = -1;

  /** Neemt een aanraking over als ze voor de wand bedoeld is (voorrang op joystick en rondkijken). */
  function neem(e) {
    const k = spel.speler()?.klim;
    if (!k || gebaar) return false;
    const lid = besturing === 'handen' ? handBij(e.clientX, e.clientY) : null;
    const g = greepBij(e.clientX, e.clientY);
    if (!lid && g < 0) return false;
    gebaar = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), lid };
    sleepDoel = -1;
    return true;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') neem(e); // touch komt via de voorrang in invoer/touch.js
  });
  window.addEventListener('pointermove', (e) => {
    if (!gebaar || e.pointerId !== gebaar.id || !gebaar.lid) return;
    sleepDoel = greepBij(e.clientX, e.clientY, true);
    const [hx, hy] = opScherm(spel.handPlek(gebaar.lid));
    lijn.setAttribute('x1', String(hx));
    lijn.setAttribute('y1', String(hy));
    lijn.setAttribute('x2', String(e.clientX));
    lijn.setAttribute('y2', String(e.clientY));
    stip.setAttribute('cx', String(e.clientX));
    stip.setAttribute('cy', String(e.clientY));
    stip.setAttribute('r', '14');
    hud.classList.add('sleept');
  });
  const los = (e) => {
    if (!gebaar || e.pointerId !== gebaar.id) return;
    const g = gebaar;
    gebaar = null;
    hud.classList.remove('sleept');
    stip.setAttribute('r', '0');
    const bewogen = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (g.lid) {
      // Slepen: loslaten op een greep voert de zet uit, ernaast annuleert (KL 7).
      const doel = greepBij(e.clientX, e.clientY, true);
      if (doel >= 0 && bewogen > 10) zet = { greep: doel, lid: g.lid };
      else if (bewogen <= 10) hint = 1.2;
      return;
    }
    if (bewogen > 16 || performance.now() - g.t > 700) return;
    const doel = greepBij(e.clientX, e.clientY);
    if (doel < 0) return;
    if (besturing === 'tikken' || rots.grepen[doel].route !== spel.speler()?.klim?.route) zet = { greep: doel, lid: null };
    else hint = 1.2; // bij "handen" sleep je zelf: de handjes wenken
  };
  window.addEventListener('pointerup', los);
  window.addEventListener('pointercancel', los);

  // --- Oplichten en knipperen ---
  /** @type {Map<number, number>} */
  const licht = new Map();
  /** @type {Map<number, number>} */
  const flitsen = new Map();
  let sleutel = '';
  let bereik = [];
  let krijtNu = -1;

  return {
    neem,
    /** Naar een andere klimwand: de grepen van die wand op het scherm (stap 13; ontbrak tot stap 15a). */
    zetWand,
    get besturing() {
      return besturing;
    },
    /** De gevraagde zet (één keer lezen per simulatiestap). */
    leesZet() {
      const z = zet;
      zet = null;
      return z;
    },
    leesZakken() {
      const z = zakGevraagd;
      zakGevraagd = false;
      return z;
    },
    /** Het pofzakje ingedrukt (magnesium, stap 15a). */
    leesKrijt() {
      const z = krijtGevraagd;
      krijtGevraagd = false;
      return z;
    },
    /** Een beurt magnesium is gebruikt (of het zakje is leeg: dan schudt het knopje even). */
    krijt(beurten, leeg = false) {
      toonKrijt(beurten);
      if (leeg) {
        krijtKnop.classList.remove('nee');
        void krijtKnop.offsetWidth;
        krijtKnop.classList.add('nee');
      }
    },
    /** Een greep knippert rood (te ver of niet van jouw route). */
    flits(id) {
      flitsen.set(id, 1);
    },
    get hint() {
      return hint;
    },
    /** Per beeld: wat oplicht, en de HUD tonen of verbergen. */
    werkBij(dt) {
      const s = spel.speler();
      const k = s?.klim;
      document.body.classList.toggle('klimt', !!k);
      hint = Math.max(0, hint - dt);
      for (const [id, f] of flitsen) {
        if (f - dt * 2.5 <= 0) flitsen.delete(id);
        else flitsen.set(id, f - dt * 2.5);
      }
      licht.clear();
      if (!k) {
        sleutel = '';
        return { licht, flitsen };
      }
      badge.textContent = rots.routes[k.route].graad;
      if (k.krijtBeurten !== krijtNu) {
        krijtNu = k.krijtBeurten;
        toonKrijt(krijtNu);
      }
      badge.style.background = '#' + new THREE.Color(rots.routes[k.route].kleur).getHexString();
      // Bereikbare grepen: alleen opnieuw uitrekenen als de houding veranderd is.
      const lid = gebaar?.lid ?? null;
      const nu = `${k.toestand}|${k.zet ? 1 : 0}|${k.rij.length}|${['lh', 'rh', 'lv', 'rv'].map((l) => k.op[l]?.greep ?? 'x').join(',')}|${lid}|${besturing}`;
      if (nu !== sleutel) {
        sleutel = nu;
        bereik = k.toestand === 'klimt' && (besturing === 'tikken' || lid) ? spel.bereikbaar(lid) : [];
      }
      for (const id of bereik) licht.set(id, id === sleepDoel ? 1 : 0.55);
      if (gebaar?.lid && sleepDoel >= 0 && !licht.has(sleepDoel)) flitsen.set(sleepDoel, Math.max(flitsen.get(sleepDoel) ?? 0, 0.35));
      return { licht, flitsen };
    },
  };
}
