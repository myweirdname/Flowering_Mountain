// Waardenruis met zaadje: zachte, glooiende golven. Geen Three.js, geen Math.random.
import { hash2 } from '../../kern/willekeur.js';

const glad = (t) => t * t * (3 - 2 * t);

/** Ruis tussen 0 en 1 op een raster met afstand 1. */
export function waardenruis(x, y, zaadje) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = glad(x - x0);
  const fy = glad(y - y0);
  const a = hash2(x0, y0, zaadje);
  const b = hash2(x0 + 1, y0, zaadje);
  const c = hash2(x0, y0 + 1, zaadje);
  const d = hash2(x0 + 1, y0 + 1, zaadje);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Meerdere lagen ruis op elkaar (fbm), resultaat ongeveer tussen -1 en 1. */
export function lagenruis(x, y, zaadje, lagen) {
  let som = 0;
  let amp = 1;
  let freq = 1;
  let totaal = 0;
  for (let i = 0; i < lagen; i++) {
    som += (waardenruis(x * freq, y * freq, zaadje + i * 1013) * 2 - 1) * amp;
    totaal += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return som / totaal;
}
