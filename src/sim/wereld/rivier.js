// De benedenrivier (BOUWPLAN 10, TP 5.7 en 6): een lint langs een curve, van een bronnetje in de jungle tot in
// de lagune. De simulatie kent de stroming als een formule langs dezelfde curve als het beeld, zodat vlot en
// water altijd overeenkomen. Alles werkt in riviercoördinaten: s langs de stroom, d dwars erop.
// Deze module graaft ook de bedding en de oevers in het landschap (stempel) en geeft het waterpeil.

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const STAP = 0.5; // afstand tussen twee punten op de middenlijn

/** Stuksgewijs lineair door een tabel [[s, waarde], ...]; buiten de tabel de eerste of laatste waarde. */
function tabel(t, s) {
  if (s <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (s <= t[i][0]) {
      const [s0, w0] = t[i - 1];
      const [s1, w1] = t[i];
      return w0 + ((w1 - w0) * (s - s0)) / (s1 - s0);
    }
  }
  return t[t.length - 1][1];
}

/**
 * @param {typeof import('../../data/rivier.js').RIVIER} R
 * @param {{ x:number, z:number, straal:number }} lagune
 * @param {number} kant aan welke kant van het kamp de lagune ligt (-1 of 1)
 * @param {(x:number, z:number) => number} ruw de landvorm zonder stempels
 * @param {{ x:number, z:number }} kamp
 */
export function maakRivier(R, lagune, kant, ruw, kamp) {
  // --- De middenlijn: een Catmull-Rom-curve door de punten, opnieuw verdeeld in stapjes van STAP meter ---
  const P = R.punten.map(([o, v]) => [lagune.x + kant * o, lagune.z + lagune.straal + v]);
  const fijn = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 40; k++) {
      const t = k / 40;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      fijn.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  fijn.push(P[P.length - 1]);
  // Langs de lengte opnieuw verdelen.
  const lijn = [fijn[0]];
  let rest = 0;
  for (let i = 1; i < fijn.length; i++) {
    const [ax, az] = fijn[i - 1];
    const [bx, bz] = fijn[i];
    const l = Math.hypot(bx - ax, bz - az);
    let t = STAP - rest;
    while (t <= l) {
      lijn.push([ax + ((bx - ax) * t) / l, az + ((bz - az) * t) / l]);
      t += STAP;
    }
    rest = l - (t - STAP);
  }
  // Recht verlengen voorbij de bron (6 m) en voorbij het laatste punt (10 m), voor de bronkom en de lagune.
  const VOOR = 12; // punten voor s = 0
  const NA = 20;
  const richt = (a, b) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const [bx0, bz0] = richt(lijn[0], lijn[2]);
  const [ex0, ez0] = richt(lijn[lijn.length - 3], lijn[lijn.length - 1]);
  const eind = lijn[lijn.length - 1];
  for (let i = 1; i <= VOOR; i++) lijn.unshift([lijn[0][0] - bx0 * STAP, lijn[0][1] - bz0 * STAP]);
  for (let i = 1; i <= NA; i++) lijn.push([eind[0] + ex0 * STAP * i, eind[1] + ez0 * STAP * i]);
  const N = lijn.length;
  const s0 = -VOOR * STAP; // s van het eerste punt
  const cx = new Float32Array(N);
  const cz = new Float32Array(N);
  const tx = new Float32Array(N);
  const tz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    cx[i] = lijn[i][0];
    cz[i] = lijn[i][1];
  }
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(N - 1, i + 1);
    const l = Math.hypot(cx[b] - cx[a], cz[b] - cz[a]);
    tx[i] = (cx[b] - cx[a]) / l;
    tz[i] = (cz[b] - cz[a]) / l;
  }
  const sEinde = s0 + (N - 1) * STAP;
  const lengte = (N - 1 - VOOR - NA) * STAP; // van de bron tot het laatste punt

  // Waar de rivier in de lagune komt.
  let sMond = lengte;
  for (let i = VOOR; i < N; i++) {
    if (Math.hypot(cx[i] - lagune.x, cz[i] - lagune.z) < lagune.straal * 0.92) {
      sMond = s0 + i * STAP;
      break;
    }
  }

  // Een kader rond alles wat de rivier aanraakt, om snel "niet in de buurt" te zeggen.
  const MARGE = 17;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < N; i++) {
    minX = Math.min(minX, cx[i]);
    maxX = Math.max(maxX, cx[i]);
    minZ = Math.min(minZ, cz[i]);
    maxZ = Math.max(maxZ, cz[i]);
  }
  minX -= MARGE;
  maxX += MARGE;
  minZ -= MARGE;
  maxZ += MARGE;

  // --- Profielen langs de stroom ---
  const mondMeng = (s) => glad((s - (sMond - 12)) / 4);
  const breedte = (s) => {
    const m = mondMeng(s);
    const a = tabel(R.breedte, s);
    // Voor het begin is er geen water meer (daar neemt de rivier over de berg het over).
    const dicht = s < R.sBegin ? -(R.sBegin - s) * 1.5 : 0;
    return (m >= 1 ? tabel(R.mondBreedte, s - sMond) : a + (tabel(R.mondBreedte, s - sMond) - a) * m) + dicht;
  };
  const basisSnelheid = (s) => {
    const m = mondMeng(s);
    const a = tabel(R.snelheid, s);
    return a + (tabel(R.mondSnelheid, s - sMond) - a) * m;
  };

  // Het waterpeil: bij de bron een eind onder het land, gelijkmatig dalend tot 0 in de lagune, met de sprong.
  let laagste = Infinity;
  for (let s = 0; s <= 8; s += 1) {
    const i = Math.round((s - s0) / STAP);
    laagste = Math.min(laagste, ruw(cx[i], cz[i]));
  }
  const SP = R.sprong;
  const bronPeil = Math.min(R.bronPeil[1], Math.max(R.bronPeil[0], laagste - R.bronOnderLand, SP.hoogte + 1));
  const helling = (bronPeil - SP.hoogte) / sMond;
  /** Hoe ver het water over de drempel al gevallen is (0..1): een boog zoals echt vallend water. */
  const val = (x) => (x <= 0 ? 0 : x >= SP.lengte ? 1 : (x / SP.lengte) ** 2);
  const peil = (s) => {
    if (s >= sMond) return 0;
    const ss = Math.max(0, s);
    return Math.max(0, bronPeil - helling * ss - SP.hoogte * val(s - SP.s));
  };
  // De oevers lopen achter de sprong zacht mee naar beneden (zodat je er kan lopen).
  const oeverPeil = (s) => {
    if (s >= sMond) return 0;
    const ss = Math.max(0, s);
    return Math.max(0, bronPeil - helling * ss - SP.hoogte * glad((s - SP.s) / 5));
  };

  // De stroomtong: een gladde V die stroomafwaarts smaller wordt.
  const T = R.tong;
  function tongOp(s, d) {
    if (s < T.van - 1 || s > T.tot) return 0;
    const f = (s - T.van) / (T.tot - T.van);
    const w = Math.max(0.05, T.breedte * (1 - Math.max(0, f)));
    const inV = 1 - glad((Math.abs(d) - w * 0.55) / (w * 0.6));
    return inV * glad((s - T.van + 1) / 1.5) * (1 - glad((s - T.tot + 1.2) / 1.2));
  }
  /** Hoe snel het water stroomt op (s, d), in m/s langs de stroom. */
  function stroom(s, d) {
    const b = Math.max(0.3, breedte(s));
    const q = Math.min(1, Math.abs(d) / b);
    return basisSnelheid(s) * (1 - R.oeverTraag * q * q) * (1 + T.extra * tongOp(s, d));
  }

  // --- Van de wereld naar riviercoördinaten ---
  function index(s) {
    const f = (s - s0) / STAP;
    return Math.min(N - 1.0001, Math.max(0, f));
  }
  /** Het punt (s, d) in de wereld. */
  function puntOp(s, d, uit = [0, 0]) {
    const f = index(s);
    const i = Math.floor(f);
    const t = f - i;
    const x = cx[i] + (cx[i + 1] - cx[i]) * t;
    const z = cz[i] + (cz[i + 1] - cz[i]) * t;
    const rx = -(tz[i] + (tz[i + 1] - tz[i]) * t);
    const rz = tx[i] + (tx[i + 1] - tx[i]) * t;
    const l = Math.hypot(rx, rz);
    // Voorbij de uiteinden: recht verder.
    const buiten = s < s0 ? s - s0 : s > sEinde ? s - sEinde : 0;
    uit[0] = x + (rz / l) * buiten + (rx / l) * d;
    uit[1] = z - (rx / l) * buiten + (rz / l) * d;
    return uit;
  }
  /** De stroomrichting op s als hoek rond de verticale as (zoals de richting van de wezens). */
  function richtingOp(s) {
    const f = index(s);
    const i = Math.floor(f);
    const t = f - i;
    return Math.atan2(tx[i] + (tx[i + 1] - tx[i]) * t, tz[i] + (tz[i + 1] - tz[i]) * t);
  }
  /** De stroomrichting op s als vector [x, z]. */
  function raaklijn(s, uit = [0, 0]) {
    const f = index(s);
    const i = Math.floor(f);
    const t = f - i;
    const x = tx[i] + (tx[i + 1] - tx[i]) * t;
    const z = tz[i] + (tz[i + 1] - tz[i]) * t;
    const l = Math.hypot(x, z);
    uit[0] = x / l;
    uit[1] = z / l;
    return uit;
  }

  /**
   * Zoekt het dichtste punt op de middenlijn. Vult uit.s en uit.d; false als (x, z) ver van de rivier ligt.
   * @param {number} x @param {number} z @param {{ s:number, d:number }} uit
   */
  function naar(x, z, uit) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
    let beste = 0;
    let bd = Infinity;
    for (let i = 0; i < N; i += 2) {
      const dx = x - cx[i];
      const dz = z - cz[i];
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) {
        bd = d2;
        beste = i;
      }
    }
    if (bd > MARGE * MARGE * 1.2) return false;
    // Fijner zoeken rond het beste punt, en dan loodrecht op het stukje lijn.
    for (let i = Math.max(0, beste - 2); i <= Math.min(N - 1, beste + 2); i++) {
      const d2 = (x - cx[i]) ** 2 + (z - cz[i]) ** 2;
      if (d2 < bd) {
        bd = d2;
        beste = i;
      }
    }
    const i = beste;
    const dx = x - cx[i];
    const dz = z - cz[i];
    let langs = dx * tx[i] + dz * tz[i];
    if ((i === 0 && langs < 0) || (i === N - 1 && langs > 0)) {
      // voorbij een uiteinde: recht verder
    } else langs = Math.max(-STAP, Math.min(STAP, langs));
    uit.s = s0 + i * STAP + langs;
    uit.d = -dx * tz[i] + dz * tx[i];
    return true;
  }

  // --- Rotsen in het water ---
  const rotsen = R.rotsen.map((r) => {
    const [x, z] = puntOp(r.s, r.d);
    return { ...r, x, z, y: peil(r.s) };
  });

  // --- De kant van het kamp: daar loopt het paadje en staat de steiger ---
  const S = R.steiger;
  const q0 = [0, 0];
  puntOp(S.s, 1, q0);
  const [mx, mz] = puntOp(S.s, 0);
  const padZijde = (q0[0] - mx) * (kamp.x - mx) + (q0[1] - mz) * (kamp.z - mz) > 0 ? 1 : -1;

  // De steigers als gedraaide rechthoeken: midden, as langs de lengte, halve lengte en breedte, hoogte.
  const maakDek = (x, z, ax, az, halfL, halfB, y) => ({ x, z, ax, az, halfL, halfB, y });
  const bS = breedte(S.s);
  const [dx0, dz0] = puntOp(S.s, padZijde * (bS - S.overWater + S.breedte / 2));
  const [ax0, az0] = raaklijn(S.s);
  const bovenDek = maakDek(dx0, dz0, ax0, az0, S.lengte / 2, S.breedte / 2, peil(S.s) + S.hoogte);
  // Het vlot ligt klaar naast de steiger.
  const ligplaats = { s: S.s, d: padZijde * (bS - S.overWater - 1.1) };

  // De steiger in de lagune: van de oever naar het midden toe, een eindje naast de monding (aan de kant van het kamp).
  const LS = R.lagunesteiger;
  const [mmx, mmz] = puntOp(sMond, 0);
  const ux = (mmx - lagune.x) / Math.hypot(mmx - lagune.x, mmz - lagune.z);
  const uz = (mmz - lagune.z) / Math.hypot(mmx - lagune.x, mmz - lagune.z);
  let lagDek = null;
  let besteKamp = Infinity;
  for (const teken of [-1, 1]) {
    const a = LS.hoek * teken;
    const vx = ux * Math.cos(a) - uz * Math.sin(a);
    const vz = ux * Math.sin(a) + uz * Math.cos(a);
    const rx = lagune.x + vx * lagune.straal * 0.97;
    const rz = lagune.z + vz * lagune.straal * 0.97;
    const dk = Math.hypot(rx - kamp.x, rz - kamp.z);
    if (dk < besteKamp) {
      besteKamp = dk;
      lagDek = maakDek(rx - vx * LS.lengte * 0.5, rz - vz * LS.lengte * 0.5, -vx, -vz, LS.lengte / 2, LS.breedte / 2, LS.hoogte);
    }
  }
  const dekken = [bovenDek, lagDek];
  // Aanleggen in de lagune: aan het einde van de steiger.
  const laguneLigplaats = [lagDek.x + lagDek.ax * (lagDek.halfL + 1.3), lagDek.z + lagDek.az * (lagDek.halfL + 1.3)];

  /** Ligt (x, z) op een steigerdek? Geeft de hoogte van het dek, of -Infinity. */
  function dekOp(x, z, marge = 0) {
    let best = -Infinity;
    for (const k of dekken) {
      const dx = x - k.x;
      const dz = z - k.z;
      const l = dx * k.ax + dz * k.az;
      const b = -dx * k.az + dz * k.ax;
      if (Math.abs(l) <= k.halfL + marge && Math.abs(b) <= k.halfB + marge && k.y > best) best = k.y;
    }
    return best;
  }

  /** Hoogte van de rotsen en de steigers op (x, z) (om op te staan), of -Infinity. */
  function blokOp(x, z) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return -Infinity;
    let best = dekOp(x, z);
    for (const r of rotsen) {
      const dx = x - r.x;
      const dz = z - r.z;
      const q = 1 - (dx * dx + dz * dz) / (r.r * r.r);
      if (q <= 0) continue;
      const h = r.y - 0.3 + (r.h + 0.3) * Math.sqrt(q);
      if (h > best) best = h;
    }
    return best;
  }

  // --- De bedding en de oevers in het landschap ---
  const O = R.oever;
  const q = { s: 0, d: 0 };
  /**
   * Graaft de rivier in de hoogte h op (x, z). Vult uit: h, water (in het water), oever (zand aan de waterlijn),
   * pad (het paadje), gras (de oever aan de kant van het kamp), vlak (hier geen fijne bultjes).
   */
  function stempel(x, z, h, uit) {
    uit.h = h;
    uit.water = 0;
    uit.oever = 0;
    uit.pad = 0;
    uit.gras = 0;
    uit.vlak = 0;
    if (!naar(x, z, q)) return uit;
    const s = q.s;
    const ad = Math.abs(q.d);
    const b = breedte(s);
    const e = ad - b;
    if (e > MARGE - 1) return uit;
    const W = peil(s);
    const mond = s >= sMond ? 0 : glad((sMond - s) / 5); // 1 stroomopwaarts, 0 in de lagune
    const padKant = Math.sign(q.d) === padZijde;
    let oever = padKant ? O.pad : O.ander;
    if (padKant) oever = Math.max(oever, R.bronPlek.breedte * (1 - glad((s - R.bronPlek.tot + 3) / 3)));
    if (s < -3 && s > R.sBegin + 0.5) oever = Math.max(oever, 2.5); // rond de bron
    if (e < 0) {
      // De bedding: diep in het midden, ondiep aan de oever.
      const f = 1 - (ad / b) ** 2;
      const diep = R.diepte * Math.min(1, b / 2.4) * Math.pow(Math.max(0, f), 0.6) + 0.05;
      const hb = W - diep;
      uit.h = mond > 0 ? Math.min(h, hb) + (hb - Math.min(h, hb)) * mond : Math.min(h, hb);
      uit.water = 1;
      uit.oever = 1;
      uit.vlak = 1;
      return uit;
    }
    const Wb = Math.max(W, oeverPeil(s));
    const rand = O.hoogte * glad(e / 0.8);
    const boven = Wb + rand + Math.max(0, e - oever) * O.wand + Math.max(0, e - 9) ** 2 * 0.6;
    const onder = Wb + rand - Math.max(0, e - oever - 1.5) * 0.6;
    let hn = Math.min(h, boven);
    hn += Math.max(0, onder - hn) * mond;
    uit.h = hn;
    uit.water = 1 - glad(e / 0.3);
    uit.oever = (1 - glad((e - 0.7) / 0.7)) * (s < sMond + 2 ? 1 : 0);
    uit.vlak = 1 - glad((e - oever) / 2);
    uit.gras = padKant ? (1 - glad((e - oever) / 1.5)) * mond : 0;
    if (padKant && s > -6 && s < sMond + 1) {
      const P2 = R.pad;
      const m = (P2.van + P2.tot) / 2;
      const hw = (P2.tot - P2.van) / 2;
      uit.pad = (1 - glad((Math.abs(e - m) - hw) / 0.5)) * glad((s + 6) / 2) * (1 - glad((s - sMond) / 1.5));
    }
    return uit;
  }

  /** Het waterpeil op (x, z): het peil van de rivier als je erin staat, anders 0 (de zee en de lagune). */
  const w = { s: 0, d: 0 };
  function peilOp(x, z) {
    if (!naar(x, z, w)) return 0;
    if (Math.abs(w.d) - breedte(w.s) > 0.4) return 0;
    return peil(w.s);
  }
  /** De stroming op (x, z) als snelheid [x, z] (0 buiten de rivier). */
  function stroomOp(x, z, uit = [0, 0]) {
    uit[0] = uit[1] = 0;
    if (!naar(x, z, w)) return uit;
    if (Math.abs(w.d) - breedte(w.s) > 0) return uit;
    const v = stroom(w.s, w.d);
    raaklijn(w.s, uit);
    uit[0] *= v;
    uit[1] *= v;
    return uit;
  }

  // Bloesems boven de goede lijn.
  const bloesems = R.bloesems.map(([s, d]) => {
    const [x, z] = puntOp(s, d);
    return { x, z, y: peil(s) + R.bloesemHoogte };
  });

  const sprongen = [{ s: SP.s, hoogte: SP.hoogte, lengte: SP.lengte, groot: false, top: peil(SP.s - 0.01) }];
  const inSprong = (s) => (s >= SP.s && s < SP.s + SP.lengte ? sprongen[0] : null);
  const steigers = [{ naam: 'bron', s: S.s, zijde: padZijde, klasse: 1, dek: bovenDek, ligplaats }];
  const tongen = [{ van: T.van, tot: T.tot, breedte: T.breedte, extra: T.extra }];

  return {
    naam: 'beneden',
    R,
    lengte,
    sMond,
    sBegin: R.sBegin,
    sprongen,
    inSprong,
    steigers,
    tongen,
    treinen: [{ van: T.tot, tot: T.tot + 7, hoogte: 0.07, golf: 2.4 }],
    kolken: [],
    keerwater: [],
    volgende: null,
    klasseOp: () => 1,
    golfOp: () => 0,
    keerOp: () => 0,
    eilandOp: () => 0,
    sEinde,
    bronPeil,
    padZijde,
    rotsen,
    dekken,
    bovenDek,
    lagDek,
    ligplaats,
    laguneLigplaats,
    bloesems,
    lagune,
    breedte,
    stroom,
    tongOp,
    peil,
    oeverPeil,
    puntOp,
    richtingOp,
    raaklijn,
    naar,
    stempel,
    peilOp,
    stroomOp,
    blokOp,
    dekOp,
    /** Is (x, z) in de buurt van de rivier (binnen het kader)? */
    dichtbij: (x, z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ,
  };
}
