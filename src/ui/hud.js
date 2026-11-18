// HUD (GD 13): weinig, groot en zonder tekst. De bloesemteller, en op de pony: de galopmeter,
// de ronde in de springweide (tijd en vijf hindernissen) en een rozet als je een ronde uitrijdt.
// Op pc ook een klein seintje welke toets de actie doet (opstappen, afstappen).

const BLOESEM_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g transform="translate(50 50)">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="17" ry="24" cy="-24" transform="rotate(${a})" fill="#ff8cc6" stroke="#fff" stroke-width="5"/>`).join('')}
    <circle r="13" fill="#ffe14d" stroke="#fff" stroke-width="4"/>
  </g>
</svg>`;

const WORTEL_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M30 88 L62 34 C66 28 76 30 76 38 L74 44 Z" fill="#ff8a2a" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
  <path d="M68 34 C64 22 66 12 72 8 M70 34 C78 24 88 22 94 24 M68 34 C60 26 50 24 44 26" stroke="#58cc4e" stroke-width="7" stroke-linecap="round" fill="none"/>
</svg>`;

// Kleine pictogrammen voor de vijf hindernissen, in dezelfde volgorde als WEIDE.hindernissen.
const HINDERNIS_ICONEN = {
  boomstam: `<svg viewBox="0 0 40 40"><rect x="5" y="15" width="30" height="13" rx="6.5" fill="#b9784f"/><circle cx="31" cy="21.5" r="5" fill="#f6d6a6"/></svg>`,
  haag: `<svg viewBox="0 0 40 40"><path d="M5 30 C3 18 13 14 16 20 C17 10 27 10 27 19 C32 13 39 20 35 30 Z" fill="#4fc56a"/><circle cx="14" cy="22" r="3" fill="#ff6fae"/><circle cx="25" cy="18" r="3" fill="#ffd84d"/><circle cx="30" cy="25" r="3" fill="#fff"/></svg>`,
  beek: `<svg viewBox="0 0 40 40"><path d="M4 16 q6 -6 12 0 t12 0 t12 0 M4 26 q6 -6 12 0 t12 0 t12 0" stroke="#3fb6e6" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  dubbel: `<svg viewBox="0 0 40 40"><rect x="4" y="14" width="13" height="4" fill="#ff7fb0"/><rect x="4" y="22" width="13" height="4" fill="#ff7fb0"/><rect x="23" y="14" width="13" height="4" fill="#ff7fb0"/><rect x="23" y="22" width="13" height="4" fill="#ff7fb0"/><rect x="4" y="11" width="3" height="19" fill="#fff"/><rect x="14" y="11" width="3" height="19" fill="#fff"/><rect x="23" y="11" width="3" height="19" fill="#fff"/><rect x="33" y="11" width="3" height="19" fill="#fff"/></svg>`,
  rots: `<svg viewBox="0 0 40 40"><path d="M4 31 C3 20 10 14 18 16 C22 10 32 11 34 19 C39 21 38 31 36 31 Z" fill="#c6b4e6"/><path d="M12 20 C14 18 17 18 19 19" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
};

const STER = `<svg viewBox="0 0 40 40"><path d="M20 3 L25 15 L38 15.5 L28 24 L31.5 37 L20 29.5 L8.5 37 L12 24 L2 15.5 L15 15 Z" fill="#ffd84d" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
const ROZET = `<svg viewBox="0 0 100 120" aria-hidden="true">
  <path d="M34 62 L22 112 L38 102 L46 116 L52 66 Z" fill="#ff7fb0"/>
  <path d="M66 62 L78 112 L62 102 L54 116 L48 66 Z" fill="#6fd3ff"/>
  <g transform="translate(50 48)">
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="0" cy="-34" r="11" transform="rotate(${(i * 360) / 14})" fill="${i % 2 ? '#ffd84d' : '#ffb3d1'}"/>`).join('')}
    <circle r="30" fill="#fff"/>
    <path d="M-12 14 L-13 0 A13 13 0 0 1 13 0 L12 14" stroke="#e0a21c" stroke-width="9" fill="none" stroke-linecap="round"/>
    ${[[-12, 8], [-11, -4], [0, -12], [11, -4], [12, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff6c8"/>`).join('')}
  </g>
</svg>`;
const KROON = `<svg viewBox="0 0 60 40"><path d="M6 34 L4 10 L18 20 L30 4 L42 20 L56 10 L54 34 Z" fill="#ffd84d" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="30" cy="22" r="4" fill="#ff6fae"/></svg>`;
const TOETS_ICONEN = {
  opstappen: `<svg viewBox="0 0 40 40"><path d="M20 6 L31 18 H25 V26 H15 V18 H9 Z" fill="#fff" stroke="#2f7d6d" stroke-width="2.5" stroke-linejoin="round"/><path d="M7 32 C12 27 28 27 33 32 L31 36 H9 Z" fill="#ffd84d"/></svg>`,
  afstappen: `<svg viewBox="0 0 40 40"><path d="M7 12 C12 7 28 7 33 12 L31 16 H9 Z" fill="#ffd84d"/><path d="M20 36 L31 24 H25 V18 H15 V24 H9 Z" fill="#fff" stroke="#2f7d6d" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
};

const tijdTekst = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
};

/**
 * @param {HTMLElement} ui
 * @param {string[]} hindernissen soorten, in de volgorde van de groepen in de weide
 */
export function maakHud(ui, hindernissen = []) {
  const teller = document.createElement('div');
  teller.className = 'bloesemteller';
  teller.innerHTML = `${BLOESEM_ICOON}<span>0</span>`;
  ui.appendChild(teller);
  const getal = /** @type {HTMLElement} */ (teller.querySelector('span'));

  // Galopmeter: een wortel met een balkje dat leegloopt in galop.
  const meter = document.createElement('div');
  meter.className = 'galopmeter';
  meter.innerHTML = `${WORTEL_ICOON}<div class="balk"><div class="vulling"></div></div>`;
  ui.appendChild(meter);
  const vulling = /** @type {HTMLElement} */ (meter.querySelector('.vulling'));

  // De ronde: tijd en vijf hindernissen die oplichten.
  const ronde = document.createElement('div');
  ronde.className = 'rondebalk';
  ronde.innerHTML = `<span class="rondetijd">0:00.0</span>${hindernissen.map((s) => `<span class="hindernisicoon">${HINDERNIS_ICONEN[s] ?? ''}</span>`).join('')}`;
  ui.appendChild(ronde);
  const rondeTijd = /** @type {HTMLElement} */ (ronde.querySelector('.rondetijd'));
  const iconen = [...ronde.querySelectorAll('.hindernisicoon')];

  // Rozet bij het uitrijden van een ronde.
  const kaart = document.createElement('div');
  kaart.className = 'rondekaart';
  ui.appendChild(kaart);
  let kaartTot = 0;

  // Pc: welke toets doet nu de actie.
  const hint = document.createElement('div');
  hint.className = 'actiehint';
  ui.appendChild(hint);
  let hintSoort = null;

  return {
    /** Nieuw aantal, met een vrolijk wipje. */
    bloesems(aantal) {
      getal.textContent = String(aantal);
      teller.classList.remove('wip');
      void teller.offsetWidth; // animatie opnieuw starten
      teller.classList.add('wip');
    },
    /** Galopmeter tonen (alleen op de pony), vulling 0..1. */
    galop(zichtbaar, vul, galoppeert) {
      meter.classList.toggle('zichtbaar', zichtbaar);
      vulling.style.width = `${Math.round(vul * 100)}%`;
      meter.classList.toggle('actief', galoppeert);
    },
    /** Een wortel: de meter wipt. */
    wortel() {
      meter.classList.remove('wip');
      void meter.offsetWidth;
      meter.classList.add('wip');
    },
    /** Een ronde begint: alle hindernissen weer grijs. */
    rondeStart() {
      ronde.classList.add('zichtbaar');
      for (const i of iconen) i.classList.remove('gedaan', 'perfect');
    },
    rondeStop() {
      ronde.classList.remove('zichtbaar');
    },
    rondeTijd(t) {
      rondeTijd.textContent = tijdTekst(t);
    },
    hindernis(groep, perfect) {
      const i = iconen[groep];
      if (!i) return;
      i.classList.add('gedaan');
      if (perfect) i.classList.add('perfect');
    },
    /** Ronde uitgereden: rozet met de tijd, een ster per perfecte sprong, en een kroon bij een record. */
    rondeKlaar(tijd, perfect, record) {
      kaart.innerHTML =
        `<div class="rozet">${ROZET}</div>` +
        `<div class="kaarttijd">${record ? `<span class="kroon">${KROON}</span>` : ''}${tijdTekst(tijd)}</div>` +
        `<div class="sterren">${Array.from({ length: perfect }, () => STER).join('')}</div>`;
      kaart.classList.remove('zichtbaar');
      void kaart.offsetWidth;
      kaart.classList.add('zichtbaar');
      kaartTot = performance.now() + 4200;
    },
    /** Pc-seintje voor de actietoets. */
    actie(soort) {
      if (soort === hintSoort) return;
      hintSoort = soort;
      hint.innerHTML = soort ? `<kbd>E</kbd>${TOETS_ICONEN[soort]}` : '';
      hint.classList.toggle('zichtbaar', !!soort);
    },
    werkBij() {
      if (kaartTot && performance.now() > kaartTot) {
        kaart.classList.remove('zichtbaar');
        kaartTot = 0;
      }
    },
  };
}
