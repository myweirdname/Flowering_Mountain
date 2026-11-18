// HUD (GD 13): weinig, groot en zonder tekst. Voorlopig de bloesemteller.

const BLOESEM_ICOON = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g transform="translate(50 50)">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="17" ry="24" cy="-24" transform="rotate(${a})" fill="#ff8cc6" stroke="#fff" stroke-width="5"/>`).join('')}
    <circle r="13" fill="#ffe14d" stroke="#fff" stroke-width="4"/>
  </g>
</svg>`;

/** @param {HTMLElement} ui */
export function maakHud(ui) {
  const teller = document.createElement('div');
  teller.className = 'bloesemteller';
  teller.innerHTML = `${BLOESEM_ICOON}<span>0</span>`;
  ui.appendChild(teller);
  const getal = /** @type {HTMLElement} */ (teller.querySelector('span'));

  return {
    /** Nieuw aantal, met een vrolijk wipje. */
    bloesems(aantal) {
      getal.textContent = String(aantal);
      teller.classList.remove('wip');
      void teller.offsetWidth; // animatie opnieuw starten
      teller.classList.add('wip');
    },
  };
}
