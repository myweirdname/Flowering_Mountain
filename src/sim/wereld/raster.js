// Het hoogteraster van één tegel (TP 5.2): de hoogtefunctie één keer in een raster gezet.
// Simulatie (voeten) en beeld (terrein) lezen allebei uit dit raster, dus ze kloppen exact.
// Elke rastercel bestaat uit twee driehoeken met de schuine lijn van (i,j) naar (i+1,j+1).

/**
 * @param {(x:number, z:number) => number} hoogte
 * @param {number} beginX linkerrand van de tegel
 * @param {number} beginZ voorrand van de tegel
 * @param {number} grootte zijde in meter
 * @param {number} stap afstand tussen punten
 */
export function maakRaster(hoogte, beginX, beginZ, grootte, stap) {
  const n = Math.round(grootte / stap); // aantal cellen per zijde
  const punten = n + 1;
  const h = new Float32Array(punten * punten);
  for (let j = 0; j < punten; j++) {
    for (let i = 0; i < punten; i++) {
      h[j * punten + i] = hoogte(beginX + i * stap, beginZ + j * stap);
    }
  }

  // Hergebruikte uitkomst, zodat er in de spellus geen nieuwe objecten ontstaan.
  const c = { fu: 0, fv: 0, h00: 0, h10: 0, h01: 0, h11: 0 };
  const helling = [0, 0];
  function cel(x, z) {
    let u = (x - beginX) / stap;
    let v = (z - beginZ) / stap;
    u = Math.min(Math.max(u, 0), n - 1e-6);
    v = Math.min(Math.max(v, 0), n - 1e-6);
    const i = Math.floor(u);
    const j = Math.floor(v);
    c.fu = u - i;
    c.fv = v - j;
    c.h00 = h[j * punten + i];
    c.h10 = h[j * punten + i + 1];
    c.h01 = h[(j + 1) * punten + i];
    c.h11 = h[(j + 1) * punten + i + 1];
    return c;
  }

  return {
    n,
    punten,
    beginX,
    beginZ,
    stap,
    grootte,
    hoogtes: h,

    /** Hoogte van het getekende terrein op (x, z). */
    hoogteOp(x, z) {
      const { fu, fv, h00, h10, h01, h11 } = cel(x, z);
      if (fu >= fv) return h00 + (h10 - h00) * fu + (h11 - h10) * fv;
      return h00 + (h11 - h01) * fu + (h01 - h00) * fv;
    },

    /** Helling op (x, z) als [dh/dx, dh/dz]. Hetzelfde lijstje wordt hergebruikt: meteen uitlezen. */
    hellingOp(x, z) {
      const { fu, fv, h00, h10, h01, h11 } = cel(x, z);
      if (fu >= fv) {
        helling[0] = (h10 - h00) / stap;
        helling[1] = (h11 - h10) / stap;
      } else {
        helling[0] = (h11 - h01) / stap;
        helling[1] = (h01 - h00) / stap;
      }
      return helling;
    },
  };
}
