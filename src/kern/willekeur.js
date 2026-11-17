// Willekeur met zaadje: hetzelfde zaadje geeft altijd dezelfde reeks (TP 4).
// Werkt alleen met gehele getallen (Math.imul), zodat elk toestel hetzelfde uitkomt.

/** Zet tekst of een getal om in een geheel zaadje van 32 bit. */
export function maakZaadje(waarde) {
  const s = String(waarde);
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Een generator (mulberry32). `geheel(n)` geeft 0..n-1, `getal()` geeft 0..1.
 * Gebruik `geheel` voor structurele keuzes, `getal` alleen voor kleine variatie.
 */
export function maakWillekeur(zaadje) {
  let a = zaadje >>> 0;
  function volgende() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  return {
    volgende,
    geheel: (n) => volgende() % n,
    getal: () => volgende() / 4294967296,
    tussen: (min, max) => min + (volgende() / 4294967296) * (max - min),
  };
}

/** Hash van twee gehele coördinaten met een zaadje: basis voor ruis. */
export function hash2(x, y, zaadje) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ zaadje;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
