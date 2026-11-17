// Het hoogteraster (TP 5.2): de hoogtefunctie één keer in een raster gezet.
// Simulatie (voeten) en beeld (terrein) lezen allebei uit dit raster, dus ze kloppen exact.
// Elke rastercel bestaat uit twee driehoeken met de schuine lijn van (i,j) naar (i+1,j+1).

/**
 * @param {(x:number, z:number) => number} hoogte
 * @param {number} grootte zijde in meter, gecentreerd rond (0, 0)
 * @param {number} stap afstand tussen punten
 */
export function maakRaster(hoogte, grootte, stap) {
  const n = Math.round(grootte / stap); // aantal cellen per zijde
  const punten = n + 1;
  const begin = -grootte / 2;
  const h = new Float32Array(punten * punten);
  for (let j = 0; j < punten; j++) {
    for (let i = 0; i < punten; i++) {
      h[j * punten + i] = hoogte(begin + i * stap, begin + j * stap);
    }
  }

  /** Zoek de cel en de plek erin, met de vier hoekhoogtes. */
  function cel(x, z) {
    let u = (x - begin) / stap;
    let v = (z - begin) / stap;
    u = Math.min(Math.max(u, 0), n - 1e-6);
    v = Math.min(Math.max(v, 0), n - 1e-6);
    const i = Math.floor(u);
    const j = Math.floor(v);
    return {
      fu: u - i,
      fv: v - j,
      h00: h[j * punten + i],
      h10: h[j * punten + i + 1],
      h01: h[(j + 1) * punten + i],
      h11: h[(j + 1) * punten + i + 1],
    };
  }

  return {
    n,
    punten,
    begin,
    stap,
    grootte,
    hoogtes: h,

    /** Hoogte van het getekende terrein op (x, z). */
    hoogteOp(x, z) {
      const { fu, fv, h00, h10, h01, h11 } = cel(x, z);
      if (fu >= fv) return h00 + (h10 - h00) * fu + (h11 - h10) * fv;
      return h00 + (h11 - h01) * fu + (h01 - h00) * fv;
    },

    /** Helling op (x, z) als [dh/dx, dh/dz]. */
    hellingOp(x, z) {
      const { fu, fv, h00, h10, h01, h11 } = cel(x, z);
      if (fu >= fv) return [(h10 - h00) / stap, (h11 - h10) / stap];
      return [(h11 - h01) / stap, (h01 - h00) / stap];
    },
  };
}
