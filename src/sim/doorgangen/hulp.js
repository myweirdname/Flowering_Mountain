// Kleine hulpjes voor de doorgangen: elke doorgang heeft een eigen vlak assenstelsel.
// t = afstand langs de doorgang (vanaf de rand van het vorige platform), q = afstand opzij (links positief).

/** Wereld (x, z) naar de doorgang (t, q). */
export function naarLokaal(m, x, z) {
  const dx = x - m.o[0];
  const dz = z - m.o[1];
  return [dx * m.a[0] + dz * m.a[1], dx * m.b[0] + dz * m.b[1]];
}

/** Doorgang (t, q) naar de wereld (x, z). */
export function naarWereld(m, t, q) {
  return [m.o[0] + m.a[0] * t + m.b[0] * q, m.o[1] + m.a[1] * t + m.b[1] * q];
}

/** Een maat in centimeter uit [van, tot], gekozen met een geheel getal (TP 4), terug in meter. */
export const kies = (w, [van, tot]) => (van + w.geheel(tot - van + 1)) / 100;

/** Een aantal uit [van, tot]. */
export const kiesAantal = (w, [van, tot]) => van + w.geheel(tot - van + 1);

export const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Afstand van punt (x, z) tot het lijnstuk p-q, en waar op het stuk (0..1). */
export function totStuk(x, z, p, q) {
  const dx = q[0] - p[0];
  const dz = q[1] - p[1];
  const l2 = dx * dx + dz * dz || 1;
  const f = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / l2));
  return Math.hypot(x - p[0] - dx * f, z - p[1] - dz * f);
}
