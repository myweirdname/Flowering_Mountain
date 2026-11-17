// Debugscherm (?debug=1): beelden per seconde, tekenopdrachten en driehoeken.

export function maakDebugscherm(ouder) {
  const el = document.createElement('div');
  el.className = 'debugscherm';
  ouder.appendChild(el);

  let beelden = 0;
  let sinds = performance.now();

  return {
    /** Na elk getekend beeld oproepen, met renderer.info. */
    beeld(info) {
      beelden++;
      const nu = performance.now();
      if (nu - sinds >= 500) {
        const bps = (beelden * 1000) / (nu - sinds);
        el.textContent =
          `beelden/s      ${bps.toFixed(0)}\n` +
          `tekenopdr.     ${info.render.calls}\n` +
          `driehoeken     ${info.render.triangles.toLocaleString('nl-BE')}`;
        beelden = 0;
        sinds = nu;
      }
    },
  };
}
