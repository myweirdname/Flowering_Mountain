// Het profiel van een klimwand (KL 3, stap 15a): van onder naar boven een reeks zones (plaat, verticaal, overhang,
// dak, kopwand), elk met een hoek ten opzichte van verticaal: + = voorover (de wand helt naar de klimster toe),
// − = achterover (een plaat), 90 = een dak. De wandkaart (u, v) blijft plat (KL 2): v is de afstand langs de wand.
// Het profiel vouwt die kaart om de 3D-wand: v wordt een hoogte y en een afstand z uit de wandvoet. Knikken zijn
// afgerond over `overgang` meter (de hoek verloopt geleidelijk), zodat er geen scherpe naad in zit; de overgang van een
// dak naar de kopwand erboven is de dakrand. Geen Three.js.

const graden = Math.PI / 180;
const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @typedef {{ soort: string, lengte: number, hoek: number }} Zone
 * @param {Zone[]} zones van onder naar boven
 * @param {number} [overgang] zo lang (langs de wand) duurt een knik
 */
export function maakProfiel(zones, overgang = 0.5, stap = 0.02) {
  const grens = [0];
  for (const z of zones) grens.push(grens[grens.length - 1] + z.lengte);
  const lengte = grens[grens.length - 1];
  const half = overgang / 2;

  /** De hoek (graden) op plaats v langs de wand. */
  function hoekOp(v) {
    let i = 0;
    while (i < zones.length - 1 && v >= grens[i + 1]) i++;
    // Dicht bij een grens: geleidelijk naar de hoek van de buurzone.
    if (i < zones.length - 1 && v > grens[i + 1] - half) {
      const t = glad((v - (grens[i + 1] - half)) / overgang);
      return zones[i].hoek + (zones[i + 1].hoek - zones[i].hoek) * t;
    }
    if (i > 0 && v < grens[i] + half) {
      const t = glad((v - (grens[i] - half)) / overgang);
      return zones[i - 1].hoek + (zones[i].hoek - zones[i - 1].hoek) * t;
    }
    return zones[i].hoek;
  }

  // Een tabel met y en z langs de wand (de hoek opgeteld in kleine stapjes).
  const n = Math.ceil(lengte / stap) + 1;
  const Y = new Float64Array(n);
  const Z = new Float64Array(n);
  const H = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.min(lengte, i * stap);
    H[i] = hoekOp(v);
    if (i > 0) {
      const dv = v - Math.min(lengte, (i - 1) * stap);
      const a = ((H[i] + H[i - 1]) / 2) * graden;
      Y[i] = Y[i - 1] + Math.cos(a) * dv;
      Z[i] = Z[i - 1] + Math.sin(a) * dv;
    }
  }
  const recht = zones.every((z) => z.hoek === 0);

  /** Interpoleert de tabel op v; buiten de wand loopt ze recht door met de eindhoek. */
  function lees(tabel, v) {
    if (v <= 0) return tabel === H ? H[0] : tabel[0] + (tabel === Y ? Math.cos(H[0] * graden) : Math.sin(H[0] * graden)) * v;
    if (v >= lengte) {
      const e = n - 1;
      if (tabel === H) return H[e];
      return tabel[e] + (tabel === Y ? Math.cos(H[e] * graden) : Math.sin(H[e] * graden)) * (v - lengte);
    }
    const f = v / stap;
    const i = Math.min(n - 2, Math.floor(f));
    const t = Math.min(1, f - i);
    return tabel[i] + (tabel[i + 1] - tabel[i]) * t;
  }

  return {
    zones,
    grens,
    lengte,
    /** Is de hele wand verticaal (de oefenrots, de klimwanden van stap 13)? */
    recht,
    hoek: (v) => (recht ? 0 : lees(H, v)),
    /** Hoogte boven de wandvoet op plaats v. */
    y: (v) => (recht ? v : lees(Y, v)),
    /** Zo ver steekt de wand op plaats v uit voorbij de wandvoet (naar de klimster toe). */
    z: (v) => (recht ? 0 : lees(Z, v)),
    /** Steilte (KL 5): −0,3 op een plaat, 0 verticaal, 0,5 bij 30° overhang, 1 in een dak (de sinus van de hoek). */
    steilte: (v) => (recht ? 0 : Math.sin(lees(H, v) * graden)),
    /** Welke zone op plaats v (de overgang van een dak naar de kopwand erboven heet 'dakrand'). */
    zone(v) {
      let i = 0;
      while (i < zones.length - 1 && v >= grens[i + 1]) i++;
      for (let j = 1; j < zones.length; j++) {
        if (Math.abs(v - grens[j]) < half + 0.15 && zones[j - 1].hoek >= 60 && zones[j].hoek < 45) return 'dakrand';
      }
      return zones[i].soort;
    },
  };
}

/**
 * De wandkaart van een wand met een profiel, gevouwen in de wereld. O = de linkeronderhoek van de wand (zoals je
 * ernaar kijkt), N = de richting uit de wandvoet (horizontaal), R = naar rechts zoals je ernaar kijkt.
 * @param {number[]} O @param {number[]} N @param {number[]} R @param {ReturnType<typeof maakProfiel>} P
 */
export function maakVouw(O, N, R, P) {
  /** Van de wandkaart naar de wereld; `uit` = zoveel meter voor de wand (loodrecht op de wand daar). */
  function naarWereld(u, v, uit = 0, doel = [0, 0, 0]) {
    const a = P.hoek(v) * graden;
    const y = P.y(v) - Math.sin(a) * uit;
    const z = P.z(v) + Math.cos(a) * uit;
    doel[0] = O[0] + R[0] * u + N[0] * z;
    doel[1] = O[1] + y;
    doel[2] = O[2] + R[2] * u + N[2] * z;
    return doel;
  }
  /** De richting uit de wand op plaats v (in de wereld): N op een verticale wand, recht omlaag onder een dak. */
  function normaal(v, doel = [0, 0, 0]) {
    const a = P.hoek(v) * graden;
    const c = Math.cos(a);
    doel[0] = N[0] * c;
    doel[1] = -Math.sin(a);
    doel[2] = N[2] * c;
    return doel;
  }
  /** De richting langs de wand omhoog (v groter) op plaats v: omhoog op een verticale wand, naar buiten in een dak. */
  function raak(v, doel = [0, 0, 0]) {
    const a = P.hoek(v) * graden;
    const s = Math.sin(a);
    doel[0] = N[0] * s;
    doel[1] = Math.cos(a);
    doel[2] = N[2] * s;
    return doel;
  }
  return { naarWereld, normaal, raak };
}
