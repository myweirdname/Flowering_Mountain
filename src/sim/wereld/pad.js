// De padzoeker voor dieren die zelf lopen (de tijger): een raster van vakjes over de speelplek, en een kortste weg
// eromheen (A*). Een vakje is loopbaar als het droog en niet te steil is, zonder rots, boomstam of hindernis.
// Het raster wordt pas uitgerekend waar het nodig is, en daarna onthouden.

/**
 * @param {any} wereld de wereld uit sim/spel.js
 * @param {{ cel: number, maxStappen: number }} P
 */
export function maakPadvinder(wereld, P) {
  const gr = wereld.grens;
  const C = P.cel;
  const x0 = gr.minX + 1;
  const z0 = gr.minZ + 1;
  const nx = Math.floor((gr.maxX - 1 - x0) / C);
  const nz = Math.floor((gr.maxZ - 1 - z0) / C);
  const vak = new Int8Array(nx * nz).fill(-1); // -1 = nog niet bekeken, 0 = nee, 1 = loopbaar
  const T = wereld.raster.tegelGrootte;

  /** Mag een tijger op dit punt staan? */
  function vrij(x, z, marge = 0.55) {
    if (x < x0 || z < z0 || x > gr.maxX - 1 || z > gr.maxZ - 1) return false;
    const g = wereld.raster.hoogteOp(x, z);
    if (g < 0.15) return false; // zee of lagune
    if (wereld.weide.water(x, z) > -Infinity) return false;
    if (wereld.weide.hindernisOp(x, z) > -Infinity) return false;
    if (wereld.rotsOp(x, z) > g + 0.3) return false;
    const [hx, hz] = wereld.raster.hellingOp(x, z);
    if (Math.hypot(hx, hz) > 0.75) return false;
    const tx = Math.floor(x / T);
    const tz = Math.floor(z / T);
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++)
        for (const st of wereld.stammen(tx + i, tz + j)) if (Math.hypot(st.x - x, st.z - z) < st.r + marge) return false;
    return true;
  }

  function loopbaar(i, j) {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
    const k = j * nx + i;
    if (vak[k] < 0) vak[k] = vrij(x0 + (i + 0.5) * C, z0 + (j + 0.5) * C) ? 1 : 0;
    return vak[k] === 1;
  }
  const naarVak = (x, z) => [Math.floor((x - x0) / C), Math.floor((z - z0) / C)];
  const midden = (i, j) => [x0 + (i + 0.5) * C, z0 + (j + 0.5) * C];

  /** Het dichtste loopbare vakje bij (i, j), tot `max` vakjes ver. */
  function dichtsteVrije(i, j, max = 6) {
    if (loopbaar(i, j)) return [i, j];
    for (let r = 1; r <= max; r++) {
      let beste = null;
      let bd = Infinity;
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !loopbaar(i + di, j + dj)) continue;
          const d = di * di + dj * dj;
          if (d < bd) (bd = d), (beste = [i + di, j + dj]);
        }
      if (beste) return beste;
    }
    return null;
  }

  /** Kan een tijger in een rechte lijn van a naar b lopen? */
  function zicht(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / (C * 0.4));
    for (let k = 1; k <= n; k++) {
      const [i, j] = naarVak(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n);
      if (!loopbaar(i, j)) return false;
    }
    return true;
  }

  // Een eenvoudige binaire hoop voor A*.
  const hoop = [];
  const prioriteit = [];
  function duw(k, p) {
    hoop.push(k);
    prioriteit.push(p);
    let i = hoop.length - 1;
    while (i > 0) {
      const o = (i - 1) >> 1;
      if (prioriteit[o] <= prioriteit[i]) break;
      [hoop[o], hoop[i]] = [hoop[i], hoop[o]];
      [prioriteit[o], prioriteit[i]] = [prioriteit[i], prioriteit[o]];
      i = o;
    }
  }
  function neem() {
    const top = hoop[0];
    const lk = hoop.pop();
    const lp = prioriteit.pop();
    if (hoop.length) {
      hoop[0] = lk;
      prioriteit[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < hoop.length && prioriteit[l] < prioriteit[m]) m = l;
        if (r < hoop.length && prioriteit[r] < prioriteit[m]) m = r;
        if (m === i) break;
        [hoop[m], hoop[i]] = [hoop[i], hoop[m]];
        [prioriteit[m], prioriteit[i]] = [prioriteit[i], prioriteit[m]];
        i = m;
      }
    }
    return top;
  }
  const kosten = new Float32Array(nx * nz);
  const van = new Int32Array(nx * nz);
  const gezien = new Uint32Array(nx * nz);
  let ronde = 0;
  const BUREN = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  /**
   * De kortste weg van (ax, az) naar (bx, bz), als een lijst punten [x, z] (zonder het beginpunt).
   * Ligt het doel niet op loopbare grond, dan gaat de weg naar het dichtste loopbare punt ernaast.
   * Geeft null als er geen weg is.
   */
  function zoek(ax, az, bx, bz) {
    const s = dichtsteVrije(...naarVak(ax, az), 3);
    const e = dichtsteVrije(...naarVak(bx, bz), 8);
    if (!s || !e) return null;
    const doelVrij = loopbaar(...naarVak(bx, bz));
    if (zicht(ax, az, bx, bz) && doelVrij) return [[bx, bz]];
    ronde++;
    hoop.length = 0;
    prioriteit.length = 0;
    const sk = s[1] * nx + s[0];
    const ek = e[1] * nx + e[0];
    gezien[sk] = ronde;
    kosten[sk] = 0;
    van[sk] = -1;
    const h = (i, j) => Math.hypot(i - e[0], j - e[1]);
    duw(sk, h(s[0], s[1]));
    let stappen = 0;
    let gevonden = false;
    while (hoop.length && stappen++ < P.maxStappen) {
      const k = neem();
      if (k === ek) {
        gevonden = true;
        break;
      }
      const i = k % nx;
      const j = (k - i) / nx;
      for (const [di, dj, c] of BUREN) {
        const ni = i + di;
        const nj = j + dj;
        if (!loopbaar(ni, nj)) continue;
        // Schuin alleen als de twee rechte buren ook vrij zijn (niet tussen twee stammen door glippen).
        if (di && dj && (!loopbaar(i + di, j) || !loopbaar(i, j + dj))) continue;
        const nk = nj * nx + ni;
        const nieuw = kosten[k] + c;
        if (gezien[nk] === ronde && kosten[nk] <= nieuw) continue;
        gezien[nk] = ronde;
        kosten[nk] = nieuw;
        van[nk] = k;
        duw(nk, nieuw + h(ni, nj));
      }
    }
    if (!gevonden) return null;
    // Terug van het doel naar het begin, en dan de bochten wegwerken (rechte stukken waar het kan).
    const vakken = [];
    for (let k = ek; k !== -1; k = van[k]) vakken.push(k);
    vakken.reverse();
    const punten = vakken.map((k) => midden(k % nx, Math.floor(k / nx)));
    if (doelVrij) punten[punten.length - 1] = [bx, bz];
    const weg = [];
    let [cx, cz] = [ax, az];
    let i = 0;
    while (i < punten.length - 1) {
      let j = punten.length - 1;
      while (j > i + 1 && !zicht(cx, cz, punten[j][0], punten[j][1])) j--;
      weg.push(punten[j]);
      [cx, cz] = punten[j];
      i = j;
    }
    if (!weg.length) weg.push(punten[punten.length - 1]);
    return weg;
  }

  return { zoek, vrij, zicht: (ax, az, bx, bz) => zicht(ax, az, bx, bz) };
}
