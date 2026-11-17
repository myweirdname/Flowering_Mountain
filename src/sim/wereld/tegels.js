// Het tegelsysteem in eenvoudige vorm (TP 5.4): de wereld is verdeeld in vierkante tegels.
// Elke tegel krijgt zijn hoogteraster pas als iemand erom vraagt, en houdt het dan bij.
// Zo hoeft nooit de hele wereld tegelijk in het geheugen.
import { maakRaster } from './raster.js';

/**
 * @param {(x:number, z:number) => number} hoogte
 * @param {number} T tegelgrootte
 * @param {number} stap rasterafstand
 */
export function maakTegelwereld(hoogte, T, stap) {
  /** @type {Map<number, ReturnType<typeof maakRaster>>} */
  const cache = new Map();
  const sleutel = (tx, tz) => (tx + 4096) * 8192 + (tz + 4096);

  function tegel(tx, tz) {
    const k = sleutel(tx, tz);
    let r = cache.get(k);
    if (!r) {
      r = maakRaster(hoogte, tx * T, tz * T, T, stap);
      cache.set(k, r);
    }
    return r;
  }

  return {
    tegelGrootte: T,
    tegel,
    /** Welke tegel ligt onder (x, z)? */
    tegelVan: (x) => Math.floor(x / T),
    hoogteOp: (x, z) => tegel(Math.floor(x / T), Math.floor(z / T)).hoogteOp(x, z),
    hellingOp: (x, z) => tegel(Math.floor(x / T), Math.floor(z / T)).hellingOp(x, z),
    get aantal() {
      return cache.size;
    },
  };
}
