// Zet invoer ten opzichte van de camera om in een intentie in wereldrichting.

/**
 * @param {{ beweeg: [number, number], spring: boolean, actie: boolean, fluit?: boolean }} invoer x = rechts, y = vooruit
 * @param {number} cameraHoek draaihoek van de camera rond de verticale as
 * @returns {import('../sim/wezens/speler.js').Intentie}
 */
export function naarIntentie(invoer, cameraHoek) {
  const [x, y] = invoer.beweeg;
  // Vooruit = weg van de camera; rechts = loodrecht daarop.
  const vx = -Math.sin(cameraHoek);
  const vz = -Math.cos(cameraHoek);
  const rx = Math.cos(cameraHoek);
  const rz = -Math.sin(cameraHoek);
  return {
    beweeg: [rx * x + vx * y, rz * x + vz * y],
    spring: invoer.spring,
    actie: invoer.actie,
    fluit: !!invoer.fluit,
    aai: false,
  };
}

/**
 * Voegt toetsenbord en touch samen: de grootste beweging wint, knoppen tellen als één van beide drukt.
 * @param {...{ beweeg: [number, number], spring: boolean, actie: boolean, fluit?: boolean }} bronnen
 */
export function voegSamen(...bronnen) {
  let beste = bronnen[0];
  for (const b of bronnen) if (Math.hypot(...b.beweeg) > Math.hypot(...beste.beweeg)) beste = b;
  return {
    beweeg: beste.beweeg,
    spring: bronnen.some((b) => b.spring),
    actie: bronnen.some((b) => b.actie),
    fluit: bronnen.some((b) => b.fluit),
  };
}
