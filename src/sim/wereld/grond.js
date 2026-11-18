// De grond onder je voeten: het terrein, met de rotsen en de hindernissen van de springweide erop (TP 6). Een rots is een afgeplatte bol,
// dezelfde vorm als het beeld tekent (beeld/maak/klein.js maakRots), zonder de kleine bulten.

/**
 * @param {{ hoogteOp(x:number, z:number): number, tegelGrootte: number }} raster
 * @param {(tx:number, tz:number) => { x:number, y:number, z:number, maat:number, cos:number, sin:number }[]} rotsen
 * @param {(x:number, z:number) => number} [hindernisOp] bovenkant van de hindernissen in de springweide
 */
export function maakGrond(raster, rotsen, hindernisOp = () => -Infinity) {
  const T = raster.tegelGrootte;

  /** Hoogte van de rotsen op (x, z), of -Infinity als er geen rots ligt. */
  function rotsOp(x, z) {
    let best = -Infinity;
    const tx0 = Math.floor((x - 3) / T);
    const tx1 = Math.floor((x + 3) / T);
    const tz0 = Math.floor((z - 3) / T);
    const tz1 = Math.floor((z + 3) / T);
    for (let tz = tz0; tz <= tz1; tz++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        for (const r of rotsen(tx, tz)) {
          const dx = x - r.x;
          const dz = z - r.z;
          const S = r.maat;
          if (dx * dx + dz * dz > S * S) continue;
          // Terug naar de eigen assen van de rots (zelfde draaiing als het beeld).
          const lx = (dx * r.cos - dz * r.sin) / S;
          const lz = (dx * r.sin + dz * r.cos) / (S * 0.85);
          const q = 1 - lx * lx - lz * lz;
          if (q <= 0) continue;
          const h = r.y + S * (0.62 * Math.sqrt(q) - 0.18);
          if (h > best) best = h;
        }
      }
    }
    return best;
  }

  return {
    rotsOp,
    /** De hoogte waarop je staat: terrein, rots of hindernis, wat het hoogste is. */
    grondOp(x, z) {
      return Math.max(raster.hoogteOp(x, z), rotsOp(x, z), hindernisOp(x, z));
    },
    /** Terrein en rotsen, zonder de hindernissen (de pony springt erover in plaats van erop te staan). */
    terreinOp(x, z) {
      return Math.max(raster.hoogteOp(x, z), rotsOp(x, z));
    },
  };
}
