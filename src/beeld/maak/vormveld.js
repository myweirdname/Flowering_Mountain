// Vormvelden (in het Engels "signed distance fields"): een vorm als een functie die voor elk punt
// zegt hoe ver het van de rand ligt: negatief = binnen, positief = buiten. Het grote voordeel:
// vormen versmelten vloeiend met elkaar (een schouderspier loopt zacht over in de borst), zoals
// bij een echt dier. Lichaam.langs() en Lichaam.rond() maken er een huid van (zie lichaam.js).
// Alles werkt met losse getallen (x, y, z) zodat het bouwen snel blijft. Maten in meter.
// Elke vorm draagt een "grens" mee (een bol waarbinnen hij ligt): verre vormen worden overgeslagen.
import * as THREE from 'three';

/** @typedef {((x: number, y: number, z: number) => number) & { grens?: [number, number, number, number] }} Veld */

/**
 * Een (gedraaide) ellipsoïde: midden c, stralen r. Benaderde afstand (goed genoeg om te versmelten).
 * @param {THREE.Vector3} c
 * @param {[number, number, number]} r
 * @param {THREE.Euler} [draai]
 * @returns {Veld}
 */
export function ellips(c, r, draai) {
  const [rx, ry, rz] = r;
  const kx2 = 1 / (rx * rx), ky2 = 1 / (ry * ry), kz2 = 1 / (rz * rz);
  const kleinste = Math.min(rx, ry, rz);
  const cx = c.x, cy = c.y, cz = c.z;
  // Omgekeerde draaiing: een wereldpunt naar de assen van de ellips.
  const m = draai ? new THREE.Matrix4().makeRotationFromEuler(draai).invert().elements : null;
  /** @type {Veld} */
  const veld = (x, y, z) => {
    let px = x - cx, py = y - cy, pz = z - cz;
    if (m) {
      const qx = m[0] * px + m[4] * py + m[8] * pz;
      const qy = m[1] * px + m[5] * py + m[9] * pz;
      const qz = m[2] * px + m[6] * py + m[10] * pz;
      px = qx; py = qy; pz = qz;
    }
    const k0 = Math.sqrt(px * px * kx2 + py * py * ky2 + pz * pz * kz2);
    const k1 = Math.sqrt(px * px * kx2 * kx2 + py * py * ky2 * ky2 + pz * pz * kz2 * kz2);
    if (k1 < 1e-9) return -kleinste;
    return (k0 * (k0 - 1)) / k1;
  };
  veld.grens = [cx, cy, cz, Math.max(rx, ry, rz)];
  return veld;
}

/**
 * Een afgeronde kegel van a (straal ra) naar b (straal rb): ledematen, spieren, plukjes vacht.
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {number} ra
 * @param {number} rb
 * @returns {Veld}
 */
export function kegel(a, b, ra, rb) {
  const ax = a.x, ay = a.y, az = a.z;
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  /** @type {Veld} */
  const veld = (x, y, z) => {
    const pax = x - ax, pay = y - ay, paz = z - az;
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
  veld.grens = [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, Math.sqrt(l2) / 2 + Math.max(ra, rb)];
  return veld;
}

/** Zacht minimum: twee vormen versmelten over een breedte k. */
export function zachtMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Een bol die alle grenzen omvat. */
function grensRond(velden, extra = 0) {
  const g = velden.map((v) => v.grens);
  if (g.some((q) => !q)) return undefined;
  const c = [0, 0, 0];
  for (const q of g) for (let i = 0; i < 3; i++) c[i] += q[i] / g.length;
  let r = 0;
  for (const q of g) r = Math.max(r, Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) + q[3]);
  return /** @type {[number, number, number, number]} */ ([c[0], c[1], c[2], r + extra]);
}

/** Hoe ver een punt hoogstens buiten de grens van een vorm ligt (ondergrens voor de afstand). */
function buitenGrens(g, x, y, z) {
  const dx = x - g[0], dy = y - g[1], dz = z - g[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - g[3];
}

/**
 * Vormen zacht samenvoegen.
 * @param {number} k breedte van de overgang (meter)
 * @param {Veld[]} velden
 * @returns {Veld}
 */
export function samen(k, ...velden) {
  const n = velden.length;
  const g = velden.map((v) => v.grens);
  /** @type {Veld} */
  const veld = (x, y, z) => {
    let d = velden[0](x, y, z);
    for (let i = 1; i < n; i++) {
      // Ligt deze vorm zo ver weg dat hij niets verandert? Dan overslaan.
      if (g[i] && buitenGrens(g[i], x, y, z) > d + k) continue;
      d = zachtMin(d, velden[i](x, y, z), k);
    }
    return d;
  };
  veld.grens = grensRond(velden, k);
  return veld;
}

/** Hard samenvoegen (geen overgang): voor losse delen die niet mogen versmelten. */
export function los(...velden) {
  const n = velden.length;
  const g = velden.map((v) => v.grens);
  /** @type {Veld} */
  const veld = (x, y, z) => {
    let d = Infinity;
    for (let i = 0; i < n; i++) {
      if (g[i] && buitenGrens(g[i], x, y, z) > d) continue;
      d = Math.min(d, velden[i](x, y, z));
    }
    return d;
  };
  veld.grens = grensRond(velden);
  return veld;
}

/**
 * Een holte uitsnijden: vorm a min vorm b, met een zachte rand k (bv. een oogkas).
 * @param {number} k
 * @param {Veld} a
 * @param {Veld} b
 * @returns {Veld}
 */
export function zonder(k, a, b) {
  /** @type {Veld} */
  const veld = (x, y, z) => -zachtMin(-a(x, y, z), b(x, y, z), k);
  veld.grens = a.grens;
  return veld;
}

/**
 * Zoek langs een straal (vanuit een punt binnen de vorm) het buitenste randpunt: we stappen van
 * buitenaf naar binnen, telkens zo ver als de vorm zeker nog weg is. Geeft de afstand vanaf het
 * beginpunt terug, of 0 als de straal nergens binnen de vorm komt.
 * @param {Veld} veld
 */
export function zoekRand(veld, ox, oy, oz, dx, dy, dz, rMax) {
  let r = rMax;
  let buiten = rMax;
  const minStap = rMax / 400;
  for (let i = 0; i < 120; i++) {
    const d = veld(ox + dx * r, oy + dy * r, oz + dz * r);
    if (d <= 0) {
      // Net binnen: verfijnen tussen het laatste punt buiten en dit punt.
      let a = r;
      let b = buiten;
      for (let k = 0; k < 12; k++) {
        const m = (a + b) * 0.5;
        if (veld(ox + dx * m, oy + dy * m, oz + dz * m) <= 0) a = m;
        else b = m;
      }
      return (a + b) * 0.5;
    }
    if (d < 0.0002) return r;
    if (r === 0) return 0;
    buiten = r;
    r = Math.max(0, r - Math.max(d * 0.8, minStap));
  }
  return r;
}

/** Richting naar buiten (normaal) van een vormveld in een punt. */
export function veldNormaal(veld, x, y, z, uit = new THREE.Vector3(), e = 0.0015) {
  uit.set(
    veld(x + e, y, z) - veld(x - e, y, z),
    veld(x, y + e, z) - veld(x, y - e, z),
    veld(x, y, z + e) - veld(x, y, z - e)
  );
  const l = uit.length();
  if (l > 1e-12) uit.divideScalar(l);
  else uit.set(0, 1, 0);
  return uit;
}

/**
 * Hoe diep een punt in een plooi of holte ligt (1 = vrij, 0 = helemaal ingesloten).
 * Kijkt een paar stapjes naar buiten langs de normaal hoe dicht de rest van het lichaam is.
 * @param {Veld} veld het hele lichaam
 * @param {number} bereik hoe ver we kijken (meter)
 */
export function vrijheid(veld, p, n, bereik) {
  let dicht = 0;
  let w = 1;
  for (let i = 1; i <= 5; i++) {
    const h = (bereik * i) / 5;
    const d = veld(p.x + n.x * h, p.y + n.y * h, p.z + n.z * h);
    dicht += Math.max(0, h - d) * w;
    w *= 0.62;
  }
  return Math.max(0, Math.min(1, 1 - (1.7 * dicht) / bereik));
}
