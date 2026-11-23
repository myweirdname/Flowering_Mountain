// Touch → invoer (TP 8, GD 4). Duim links: zwevende joystick die verschijnt waar je tikt.
// Rechts: grote springknop en actieknop; slepen op de rechterhelft kijkt rond.
// Meerdere vingers tegelijk, via pointer-events.
import { TOUCH as T } from '../data/touch.js';

const SPRING_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 18 L80 52 H62 V80 H38 V52 H20 Z" fill="#fff" stroke="#c2417a" stroke-width="6" stroke-linejoin="round"/>
</svg>`;
const ACTIE_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M36 82 C24 70 20 60 22 50 C24 44 31 44 34 50 L38 58 V26 C38 20 47 20 47 26 V48 V20 C47 14 56 14 56 20 V48 V24
           C56 18 65 18 65 24 V50 V32 C65 26 74 26 74 32 V58 C74 72 68 82 58 84 Z"
        fill="#fff" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
</svg>`;

const FLUIT_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M28 80 C14 56 18 22 50 20 C82 22 86 56 72 80" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"/>
  <path d="M28 80 C14 56 18 22 50 20 C82 22 86 56 72 80" fill="none" stroke="#e0a21c" stroke-width="9" stroke-linecap="round"/>
  ${[[24, 62], [24, 40], [50, 26], [76, 40], [76, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff"/>`).join('')}
</svg>`;

// Wat de actieknop doet, met een eigen pictogram (GD 4: het pictogram wisselt naargelang de situatie).
export const ACTIE_ICONEN = {
  hand: ACTIE_ICOON,
  opstappen: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 14 L74 40 H60 V58 H40 V40 H26 Z" fill="#fff" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
    <path d="M18 74 C30 62 70 62 82 74 L78 86 H22 Z" fill="#ffd84d" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
  </svg>`,
  // Klimmen: een greep op de rots met een handje erop.
  klimmen: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M14 88 C10 60 18 30 40 16 C60 6 82 14 88 40 L90 88 Z" fill="#e3d2f6" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="52" cy="48" rx="15" ry="9" fill="#ffd23f" stroke="#2f7d6d" stroke-width="4"/>
    <path d="M40 46 C40 36 46 34 49 40 L50 28 C51 22 58 23 57 29 L57 40 L60 32 C62 27 68 29 66 35 L62 50 C60 58 50 60 44 56 Z" fill="#fff" stroke="#2f7d6d" stroke-width="4" stroke-linejoin="round"/>
  </svg>`,
  // Uitschudden: een handje met trillijntjes.
  uitschudden: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M36 84 C26 72 24 62 26 54 C28 48 34 48 36 54 L38 60 V30 C38 24 47 24 47 30 V50 V24 C47 18 56 18 56 24 V50 V28 C56 22 65 22 65 28 V54 V38 C65 32 74 32 74 38 V62 C74 74 66 84 56 86 Z"
          fill="#fff" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
    <path d="M14 34 Q8 42 14 50 M86 34 Q92 42 86 50 M18 24 Q12 30 16 36 M82 24 Q88 30 84 36" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  </svg>`,
  afstappen: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M18 30 C30 18 70 18 82 30 L78 42 H22 Z" fill="#ffd84d" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 88 L74 62 H60 V48 H40 V62 H26 Z" fill="#fff" stroke="#2f7d6d" stroke-width="5" stroke-linejoin="round"/>
  </svg>`,
};

/** Is dit vermoedelijk een toestel met aanraakscherm als hoofdbediening? */
export function isTouchToestel() {
  return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches;
}

/**
 * @param {HTMLElement} vlak waar je op tikt (het spelbeeld)
 * @param {HTMLElement} ui laag voor knoppen en joystick
 * @param {{ kijk(dx: number, dy: number, gevoeligheid: number): void }} camera
 */
export function maakTouch(vlak, ui, camera) {
  const laag = document.createElement('div');
  laag.className = 'touchlaag';
  laag.style.setProperty('--spring', `${T.springKnop}vh`);
  laag.style.setProperty('--actie', `${T.actieKnop}vh`);
  laag.style.setProperty('--rand', `${T.randAfstand}vh`);
  laag.style.setProperty('--stick', `${T.joystickStraal}vh`);
  laag.style.setProperty('--fluit', `${T.fluitKnop}vh`);
  laag.innerHTML = `
    <div class="joystick"><div class="knop-stick"></div></div>
    <button class="touchknop springknop" aria-label="springen">${SPRING_ICOON}</button>
    <button class="touchknop actieknop" aria-label="actie">${ACTIE_ICOON}</button>
    <button class="touchknop fluitknop" aria-label="pony fluiten">${FLUIT_ICOON}</button>`;
  ui.appendChild(laag);

  const stick = /** @type {HTMLElement} */ (laag.querySelector('.joystick'));
  const stickKnop = /** @type {HTMLElement} */ (laag.querySelector('.knop-stick'));

  // --- Joystick en rondkijken ---
  let stickId = null;
  let start = [0, 0];
  let beweeg = [0, 0];
  let kijkId = null;
  let kijkVorig = [0, 0];

  const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';

  /** @type {null | ((e: PointerEvent) => boolean)} */
  let voorrang = null;

  vlak.addEventListener('pointerdown', (e) => {
    if (!isTouch(e)) return;
    toon();
    // Iets anders mag de aanraking eerst nemen (bv. een hand of greep op de klimwand, KL 7).
    if (voorrang && voorrang(e)) return;
    if (e.clientX < innerWidth * T.linkerDeel && stickId === null) {
      stickId = e.pointerId;
      start = [e.clientX, e.clientY];
      beweeg = [0, 0];
      stick.style.left = `${e.clientX}px`;
      stick.style.top = `${e.clientY}px`;
      stickKnop.style.transform = 'translate(-50%, -50%)';
      stick.classList.add('zichtbaar');
    } else if (kijkId === null) {
      kijkId = e.pointerId;
      kijkVorig = [e.clientX, e.clientY];
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickId) {
      const straal = (innerHeight * T.joystickStraal) / 100;
      let dx = e.clientX - start[0];
      let dy = e.clientY - start[1];
      const l = Math.hypot(dx, dy);
      if (l > straal) {
        dx *= straal / l;
        dy *= straal / l;
      }
      stickKnop.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      // Uitslag 0..1, met dode zone; onder "renVanaf" wandel je, erboven ren je.
      const uit = Math.min(1, l / straal);
      if (uit < T.dodeZone) {
        beweeg = [0, 0];
      } else {
        const kracht = uit >= T.renVanaf ? 1 : 0.75 * ((uit - T.dodeZone) / (T.renVanaf - T.dodeZone));
        beweeg = [(dx / Math.hypot(dx, dy)) * kracht, (-dy / Math.hypot(dx, dy)) * kracht];
      }
    } else if (e.pointerId === kijkId) {
      camera.kijk(e.clientX - kijkVorig[0], e.clientY - kijkVorig[1], T.kijkGevoeligheid);
      kijkVorig = [e.clientX, e.clientY];
    }
  });

  const laatLos = (e) => {
    if (e.pointerId === stickId) {
      stickId = null;
      beweeg = [0, 0];
      stick.classList.remove('zichtbaar');
    }
    if (e.pointerId === kijkId) kijkId = null;
  };
  window.addEventListener('pointerup', laatLos);
  window.addEventListener('pointercancel', laatLos);

  // --- Knoppen ---
  // Een korte tik moet altijd meetellen, ook als hij tussen twee simulatiestappen valt:
  // daarom onthouden we "werd ingedrukt" tot de simulatie het één keer gelezen heeft.
  function maakKnop(el) {
    const vingers = new Set();
    let nogNietGelezen = false;
    const los = (e) => {
      vingers.delete(e.pointerId);
      if (vingers.size === 0) el.classList.remove('ingedrukt');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      vingers.add(e.pointerId);
      try {
        el.setPointerCapture(e.pointerId); // vinger blijft van de knop, ook als hij wat verschuift
      } catch {
        // Kan mislukken als de vinger al weg is; geen probleem.
      }
      nogNietGelezen = true;
      el.classList.add('ingedrukt');
      toon();
    });
    el.addEventListener('pointerup', los);
    el.addEventListener('pointercancel', los);
    el.addEventListener('lostpointercapture', los);
    return () => {
      const aan = vingers.size > 0 || nogNietGelezen;
      nogNietGelezen = false;
      return aan;
    };
  }
  const leesSpring = maakKnop(/** @type {HTMLElement} */ (laag.querySelector('.springknop')));
  const actieKnop = /** @type {HTMLElement} */ (laag.querySelector('.actieknop'));
  const leesActie = maakKnop(actieKnop);
  const leesFluit = maakKnop(/** @type {HTMLElement} */ (laag.querySelector('.fluitknop')));
  let actieSoort = 'hand';

  // Lang drukken mag geen menu of selectie openen.
  vlak.addEventListener('contextmenu', (e) => e.preventDefault());
  laag.addEventListener('contextmenu', (e) => e.preventDefault());

  // De knoppen verschijnen alleen op touchtoestellen (of bij de eerste aanraking).
  let zichtbaar = false;
  function toon() {
    if (zichtbaar) return;
    zichtbaar = true;
    document.body.classList.add('touch');
  }
  if (isTouchToestel()) toon();

  return {
    /** Beweging ten opzichte van de camera: x = rechts, y = vooruit, lengte 0..1. */
    lees() {
      return { beweeg: [beweeg[0], beweeg[1]], spring: leesSpring(), actie: leesActie(), fluit: leesFluit() };
    },
    /** Zet het pictogram van de actieknop ('hand', 'opstappen', 'afstappen', 'klimmen', 'uitschudden'); wenkt als er iets te doen is. */
    zetActie(soort) {
      const s = soort ?? 'hand';
      if (s === actieSoort) return;
      actieSoort = s;
      actieKnop.innerHTML = ACTIE_ICONEN[s] ?? ACTIE_ICONEN.hand;
      actieKnop.classList.toggle('wenkt', s !== 'hand' && s !== 'uitschudden');
    },
    /** Een functie die een aanraking eerst mag nemen (true = genomen: geen joystick of rondkijken). */
    zetVoorrang(f) {
      voorrang = f;
    },
  };
}
