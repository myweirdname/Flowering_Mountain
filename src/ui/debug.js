// Debugscherm (?debug=1): beelden per seconde, tekenopdrachten en driehoeken, plus vrije extra regels.

export function maakDebugscherm(ouder) {
  const el = document.createElement('div');
  el.className = 'debugscherm';
  ouder.appendChild(el);

  let beelden = 0;
  let sinds = performance.now();
  let laagste = Infinity;

  return {
    /** Na elk getekend beeld oproepen, met renderer.info en eventueel extra tekst. */
    beeld(info, extra = '') {
      beelden++;
      const nu = performance.now();
      if (nu - sinds >= 500) {
        const bps = (beelden * 1000) / (nu - sinds);
        if (performance.now() > 4000) laagste = Math.min(laagste, bps);
        el.textContent =
          `beelden/s      ${bps.toFixed(0)}  (laagste ${laagste === Infinity ? '-' : laagste.toFixed(0)})\n` +
          `tekenopdr.     ${info.render.calls}\n` +
          `driehoeken     ${info.render.triangles.toLocaleString('nl-BE')}\n` +
          extra;
        beelden = 0;
        sinds = nu;
      }
    },
  };
}
