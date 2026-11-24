// Waar kan je te voet komen? (TP 5.3, stap 12) Een grof raster over het hele eiland met de loopregels:
// omhoog alleen over hellingen tot 45° (zoals in het spel: op een steilere plek glij je af en kom je niet hoger,
// ook niet schuin), omlaag altijd (springen of glijden mag), en de zee is geen land.
// Voor de controles in test.html (de top is bereikbaar, de rotsrand houdt je tegen) en later voor het bergplan.
// Geen Three.js.

/**
 * @param {ReturnType<typeof import('./hoogte.js').maakWereldvorm>} vorm
 * @param {number} stap rasterafstand in meter
 * @param {number} maxHelling in graden
 */
export function maakLoopkaart(vorm, stap = 2, maxHelling = 45) {
  const G = vorm.eiland.grenzen;
  const x0 = G.minX;
  const z0 = G.minZ;
  const nx = Math.floor((G.maxX - G.minX) / stap) + 1;
  const nz = Math.floor((G.maxZ - G.minZ) / stap) + 1;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) H[j * nx + i] = vorm.hoogte(x0 + i * stap, z0 + j * stap);
  const steil = Math.tan((maxHelling * Math.PI) / 180);
  // De echte steilte van elke plek (niet alleen in de richting van een stap).
  const S = new Float32Array(nx * nz);
  const h = (i, j) => H[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) S[j * nx + i] = Math.hypot(h(i + 1, j) - h(i - 1, j), h(i, j + 1) - h(i, j - 1)) / (2 * stap);
  const buren = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  const cel = (x, z) => {
    const i = Math.round((x - x0) / stap);
    const j = Math.round((z - z0) / stap);
    return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i;
  };

  /**
   * Zoekt een weg van (x, z) naar (doelX, doelZ).
   * @param {(x:number, z:number) => boolean} [verboden] plekken waar je niet mag komen (bv. de hellingbaan, om te zien of er een andere weg is)
   * @returns {{ gelukt: boolean, lengte: number, bereikt: number }}
   */
  function weg(x, z, doelX, doelZ, verboden) {
    const van = cel(x, z);
    const naar = cel(doelX, doelZ);
    const vorige = new Int32Array(nx * nz).fill(-2);
    const rij = new Int32Array(nx * nz);
    let kop = 0;
    let staart = 0;
    rij[staart++] = van;
    vorige[van] = -1;
    let bereikt = 0;
    while (kop < staart) {
      const a = rij[kop++];
      bereikt++;
      if (a === naar) break;
      const ai = a % nx;
      const aj = (a - ai) / nx;
      for (const [di, dj] of buren) {
        const i = ai + di;
        const j = aj + dj;
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        const b = j * nx + i;
        if (vorige[b] !== -2) continue;
        const hb = H[b];
        if (hb < 0.15) continue; // zee
        const d = di && dj ? stap * Math.SQRT2 : stap;
        if (hb - H[a] > d * steil) continue; // te steil om op te lopen
        if (hb > H[a] + 0.05 && S[b] > steil) continue; // hoger komen op een plek waar je afglijdt: nee
        if (verboden && verboden(x0 + i * stap, z0 + j * stap)) continue;
        vorige[b] = a;
        rij[staart++] = b;
      }
    }
    if (vorige[naar] === -2) return { gelukt: false, lengte: 0, bereikt };
    let lengte = 0;
    for (let c = naar; vorige[c] >= 0; c = vorige[c]) {
      const p = vorige[c];
      lengte += Math.hypot((c % nx) - (p % nx), Math.floor(c / nx) - Math.floor(p / nx)) * stap;
    }
    return { gelukt: true, lengte, bereikt };
  }

  return { H, S, nx, nz, x0, z0, stap, weg };
}
