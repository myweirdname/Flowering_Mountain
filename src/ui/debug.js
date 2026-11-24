// Debugscherm: beelden per seconde, tekenopdrachten en driehoeken, plus vrije extra regels.
// Zichtbaar met ?debug=1, of aan/uit door drie keer snel linksboven in de hoek te tikken (op pc: F3).
import { VERSIE } from '../versie.js';

export function maakDebugscherm(ouder, zichtbaar) {
  const el = document.createElement('div');
  el.className = 'debugscherm';
  el.hidden = !zichtbaar;
  ouder.appendChild(el);

  let beelden = 0;
  let sinds = performance.now();
  let laagste = Infinity;
  let start = performance.now();
  let langste = 0; // het langste beeld in dit venster (ms): zo zie je haperingen tijdens het laden
  let vorigBeeld = -1;

  function wissel() {
    el.hidden = !el.hidden;
    // Opnieuw beginnen met meten, zodat "laagste" over deze meting gaat.
    laagste = Infinity;
    beelden = 0;
    vorigBeeld = -1;
    sinds = start = performance.now();
  }

  // Drie tikken binnen een seconde in de hoek linksboven.
  let tikken = [];
  window.addEventListener('pointerdown', (e) => {
    if (e.clientX > 90 || e.clientY > 90) return;
    const nu = performance.now();
    tikken = tikken.filter((t) => nu - t < 1000);
    tikken.push(nu);
    if (tikken.length >= 3) {
      tikken = [];
      wissel();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3') {
      e.preventDefault();
      wissel();
    }
  });

  return {
    get zichtbaar() {
      return !el.hidden;
    },
    /** Na elk getekend beeld oproepen, met renderer.info en eventueel extra tekst (een functie, alleen opgeroepen als nodig). */
    beeld(info, extra) {
      if (el.hidden) return;
      beelden++;
      const nu = performance.now();
      if (vorigBeeld >= 0) langste = Math.max(langste, nu - vorigBeeld);
      vorigBeeld = nu;
      if (nu - sinds >= 500) {
        const bps = (beelden * 1000) / (nu - sinds);
        if (nu - start > 3000) laagste = Math.min(laagste, bps);
        el.textContent =
          `versie         ${VERSIE}\n` +
          `beelden/s      ${bps.toFixed(0)}  (laagste ${laagste === Infinity ? '-' : laagste.toFixed(0)})\n` +
          `langste beeld  ${langste.toFixed(0)} ms\n` +
          `tekenopdr.     ${info.render.calls}\n` +
          `driehoeken     ${info.render.triangles.toLocaleString('nl-BE')}\n` +
          (extra ? extra() : '');
        beelden = 0;
        sinds = nu;
        langste = 0;
      }
    },
  };
}
