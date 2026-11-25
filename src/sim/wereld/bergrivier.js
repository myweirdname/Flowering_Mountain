// De rivier over de berg (BOUWPLAN 14, GD 9, TP 5.2 en 5.7): van een bron op de bergtop, met watervalletjes de
// bergtop af, over de etage met een splitsing en een kolk, over de rotsrand in een grote waterval, en door het
// laagland tot in de bron van de benedenrivier (stap 10). Ze werkt net als de benedenrivier in
// riviercoördinaten (s langs de stroom, d dwars erop), met dezelfde functies, zodat het vlot over beide vaart.
//
// Het waterpeil volgt het landschap: de rivier graaft zich altijd een eindje in (nooit opgehoogde oevers).
// Op de bergtop daalt ze trager dan de helling en haalt ze de achterstand in met watervalletjes (klasse IV);
// op de etage zakt ze zacht (III); aan de rotsrand stort ze naar beneden; in het laagland (II) zakt ze zacht
// tot het peil van de benedenrivier. Geen Three.js.

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const STAP = 0.5;

/** Stuksgewijs lineair door een tabel [[s, waarde], ...] (gesorteerd op s). */
function tabel(t, s) {
  if (s <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (s <= t[i][0]) {
      const [s0, w0] = t[i - 1];
      const [s1, w1] = t[i];
      return s1 === s0 ? w1 : w0 + ((w1 - w0) * (s - s0)) / (s1 - s0);
    }
  }
  return t[t.length - 1][1];
}

/** Een Catmull-Rom-curve door de punten, opnieuw verdeeld in stapjes van STAP meter. */
function middenlijn(P) {
  const fijn = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      fijn.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), i + t]);
    }
  }
  fijn.push([...P[P.length - 1], P.length - 1]);
  const lijn = [fijn[0]];
  let rest = 0;
  for (let i = 1; i < fijn.length; i++) {
    const [ax, az, au] = fijn[i - 1];
    const [bx, bz, bu] = fijn[i];
    const l = Math.hypot(bx - ax, bz - az);
    let t = STAP - rest;
    while (t <= l) {
      lijn.push([ax + ((bx - ax) * t) / l, az + ((bz - az) * t) / l, au + ((bu - au) * t) / l]);
      t += STAP;
    }
    rest = l - (t - STAP);
  }
  return lijn;
}

/**
 * @param {typeof import('../../data/bergrivier.js').BERGRIVIER} B
 * @param {{ eiland: ReturnType<typeof import('./eiland.js').maakEiland>,
 *           beneden: ReturnType<typeof import('./rivier.js').maakRivier>, kant: number,
 *           grond: (x:number, z:number) => number, kamp: { x:number, z:number },
 *           bezet?: (x:number, z:number) => boolean }} c
 *   grond: de hoogte van het landschap zonder deze rivier; kant: de kant van de lagune (-1 of 1)
 */
export function maakBergrivier(B, c) {
  const { eiland: e, beneden, kant } = c;
  const C = e.midden;
  const RT = B.route;
  const half = e.randMaat.half;
  const hoekVan = (x, z) => Math.atan2(x - C.x, C.z - z);

  // --- De loop: punten van de bron op de bergtop tot in de bron van de benedenrivier ---
  const AANSLUIT = -5; // hier (s van de benedenrivier) komt de bergrivier erin
  const [jx, jz] = beneden.puntOp(AANSLUIT, 0);
  const aBron = hoekVan(jx, jz);
  const aW = aBron + kant * RT.valHoek;
  const aF = aBron + kant * RT.voetHoek;
  const aS = aBron + kant * RT.bronHoek;
  const rF = e.voetStraal(aF);
  const rS = rF - RT.bronHoger;
  /** Een punt op afstand r van de top in richting a, met `opzij` meter langs de ring. */
  const op = (a, r, opzij = 0) => {
    const [x, z] = e.punt(a, r);
    return [x + Math.cos(a) * opzij, z + Math.sin(a) * opzij];
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const P = [];
  const merk = {}; // index in P van de belangrijke punten
  P.push(op(aS, rS - 5));
  merk.bron = P.length;
  P.push(op(aS, rS));
  RT.kegelSlinger.forEach((o, i) => {
    const t = (i + 1) / (RT.kegelSlinger.length + 1);
    P.push(op(lerp(aS, aF, t), lerp(rS, rF + 4, t), o));
  });
  merk.voet = P.length;
  P.push(op(aF, rF + 6));
  const R1w = e.randStraal(aW);
  RT.etageSlinger.forEach((o, i) => {
    const t = (i + 1) / (RT.etageSlinger.length + 1);
    P.push(op(lerp(aF, aW, t), lerp(rF + 6, R1w - half - 8, t), o));
  });
  // Recht over de rotsrand, zodat de waterval er dwars overheen stort.
  P.push(op(aW, R1w - half - 7));
  merk.val = P.length;
  P.push(op(aW, R1w + half + 2));
  P.push(op(aW, R1w + half + RT.poel));
  // Door het laagland naar de benedenrivier, die de bergrivier recht verlengt.
  const [k2x, k2z] = beneden.puntOp(AANSLUIT - 16, 0);
  const pl = P[P.length - 1];
  RT.laagSlinger.forEach((o, i) => {
    const t = (i + 1) / (RT.laagSlinger.length + 1);
    const x = lerp(pl[0], k2x, t);
    const z = lerp(pl[1], k2z, t);
    const l = Math.hypot(k2x - pl[0], k2z - pl[1]) || 1;
    P.push([x + ((k2z - pl[1]) / l) * o, z - ((k2x - pl[0]) / l) * o]);
  });
  P.push([k2x, k2z]);
  P.push(beneden.puntOp(AANSLUIT - 8, 0));
  merk.eind = P.length;
  P.push([jx, jz]);

  const lijn = middenlijn(P);
  const N = lijn.length;
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
    const l = Math.hypot(cx[b] - cx[a], cz[b] - cz[a]) || 1;
    tx[i] = (cx[b] - cx[a]) / l;
    tz[i] = (cz[b] - cz[a]) / l;
  }
  /** Het eerste punt van de middenlijn na punt k van de loop. */
  const indexVan = (k) => {
    for (let i = 0; i < N; i++) if (lijn[i][2] >= k - 1e-6) return i;
    return N - 1;
  };
  const iBron = indexVan(merk.bron);
  const s0 = -iBron * STAP; // s van het eerste punt: de bron ligt op s = 0
  const sVan = (i) => s0 + i * STAP;
  const iVan = (s) => Math.min(N - 1, Math.max(0, Math.round((s - s0) / STAP)));
  const sEinde = sVan(N - 1);
  const sVoet = sVan(indexVan(merk.voet));

  // --- Van de wereld naar riviercoördinaten ---
  function index(s) {
    return Math.min(N - 1.0001, Math.max(0, (s - s0) / STAP));
  }
  function puntOp(s, d, uit = [0, 0]) {
    const f = index(s);
    const i = Math.floor(f);
    const t = f - i;
    const x = cx[i] + (cx[i + 1] - cx[i]) * t;
    const z = cz[i] + (cz[i + 1] - cz[i]) * t;
    const rx = -(tz[i] + (tz[i + 1] - tz[i]) * t);
    const rz = tx[i] + (tx[i + 1] - tx[i]) * t;
    const l = Math.hypot(rx, rz) || 1;
    const buiten = s < s0 ? s - s0 : s > sEinde ? s - sEinde : 0;
    uit[0] = x + (rz / l) * buiten + (rx / l) * d;
    uit[1] = z - (rx / l) * buiten + (rz / l) * d;
    return uit;
  }
  function richtingOp(s) {
    const f = index(s);
    const i = Math.floor(f);
    const t = f - i;
    return Math.atan2(tx[i] + (tx[i + 1] - tx[i]) * t, tz[i] + (tz[i + 1] - tz[i]) * t);
  }
  function raaklijn(s, uit = [0, 0]) {
    const f = index(s);
    const i = Math.floor(f);
    const t = f - i;
    const x = tx[i] + (tx[i + 1] - tx[i]) * t;
    const z = tz[i] + (tz[i + 1] - tz[i]) * t;
    const l = Math.hypot(x, z) || 1;
    uit[0] = x / l;
    uit[1] = z / l;
    return uit;
  }

  // Een rooster van vakjes met de punten van de middenlijn erin, om snel het dichtste punt te vinden.
  const MARGE = B.oever.marge + 8;
  const VAK = 24;
  const vakken = new Map();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(cx[i] / VAK) + ',' + Math.floor(cz[i] / VAK);
    if (!vakken.has(k)) vakken.set(k, []);
    vakken.get(k).push(i);
    minX = Math.min(minX, cx[i]);
    maxX = Math.max(maxX, cx[i]);
    minZ = Math.min(minZ, cz[i]);
    maxZ = Math.max(maxZ, cz[i]);
  }
  minX -= MARGE;
  maxX += MARGE;
  minZ -= MARGE;
  maxZ += MARGE;
  /** Zoekt het dichtste punt op de middenlijn; vult uit.s en uit.d (false als (x, z) ver van de rivier ligt). */
  function naar(x, z, uit) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
    const vx = Math.floor(x / VAK);
    const vz = Math.floor(z / VAK);
    let beste = -1;
    let bd = MARGE * MARGE;
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const lijst = vakken.get(vx + a + ',' + (vz + b));
        if (!lijst) continue;
        for (const i of lijst) {
          const d2 = (x - cx[i]) ** 2 + (z - cz[i]) ** 2;
          if (d2 < bd) {
            bd = d2;
            beste = i;
          }
        }
      }
    }
    if (beste < 0) return false;
    const i = beste;
    const dx = x - cx[i];
    const dz = z - cz[i];
    let langs = dx * tx[i] + dz * tz[i];
    if (!((i === 0 && langs < 0) || (i === N - 1 && langs > 0))) langs = Math.max(-STAP, Math.min(STAP, langs));
    uit.s = s0 + i * STAP + langs;
    uit.d = -dx * tz[i] + dz * tx[i];
    return true;
  }

  // --- Het landschap langs de rivier (zonder de rivier zelf), om het peil te kiezen ---
  const Z = B.zones;
  const G = new Float32Array(N);
  const pq = [0, 0];
  for (let i = 0; i < N; i++) {
    let m = Infinity;
    const b = i * STAP + s0 < sVoet ? Z.kegel.breedte : Z.etage.breedte;
    for (const d of [-b - 1, 0, b + 1]) {
      puntOp(sVan(i), d, pq);
      m = Math.min(m, c.grond(pq[0], pq[1]));
    }
    G[i] = m;
  }
  // De rotsrand: waar het landschap na de voet van de bergtop het eerst steil wegvalt.
  let iLip = -1;
  for (let i = iVan(sVoet + 10); i < N - 4; i++) {
    if (G[i + 2] < G[i] - 1.4) {
      iLip = Math.max(0, i - Math.round(B.waterval.voorRand / STAP));
      break;
    }
  }
  if (iLip < 0) iLip = indexVan(merk.val) - 6;
  let iRandVoet = iLip + 4;
  while (iRandVoet < N - 3 && !(G[iRandVoet + 2] > G[iRandVoet] - 0.35)) iRandVoet++;
  const sLip = sVan(iLip);

  // De stukken rivier, in s.
  const BK = B.bronKom;
  const VK = B.voetKom;
  const PK = B.poelKom;
  const sBegin = -3;
  const kegel = { van: BK.lengte, tot: sVoet - VK.lengte / 2 };
  const voetKom = { van: sVoet - VK.lengte / 2, tot: sVoet + VK.lengte / 2 };
  const etage = { van: voetKom.tot, tot: sLip };

  // --- Het waterpeil (een tabel per halve meter) en de watervallen ---
  const Pt = new Float32Array(N);
  /** @type {{ s:number, hoogte:number, lengte:number, groot:boolean, top:number }[]} */
  const sprongen = [];
  const inzet = B.inzet;
  const T = (i, zone) => G[i] - inzet[zone];
  const valNaar = (i, hoogte, lengte, groot) => {
    const L = Math.max(STAP * 2, Math.ceil(lengte / STAP) * STAP);
    sprongen.push({ s: sVan(i), hoogte, lengte: L, groot, top: 0 });
    return Math.round(L / STAP);
  };
  // De bronkom: vlak.
  const iK0 = iVan(kegel.van);
  let p = Infinity;
  for (let i = 0; i <= iK0; i++) p = Math.min(p, T(i, 'kegel'));
  for (let i = 0; i <= iK0; i++) Pt[i] = p;
  // De bergtop: een trap. Het water daalt trager dan de helling; ligt het zo hoog dat het de sleuf uit zou
  // komen, dan valt het naar beneden.
  const KT = B.kegelTrap;
  const iK1 = iVan(kegel.tot);
  let laatsteVal = iK0;
  for (let i = iK0 + 1; i <= iK1; i++) {
    const daling = Math.max(0, G[i - 1] - G[i]);
    p -= daling * KT.volgen;
    const doel = T(i, 'kegel');
    if (p > doel && i - laatsteVal > 14 && i < iK1 - 6) {
      const h = p - (doel - KT.valVanaf);
      const n = valNaar(i, h, KT.valLengte, false);
      sprongen[sprongen.length - 1].top = p;
      for (let k = 0; k < n && i + k <= iK1; k++) Pt[i + k] = p - h * ((k * STAP) / sprongen[sprongen.length - 1].lengte) ** 2;
      p -= h;
      i += n - 1;
      laatsteVal = i;
      continue;
    }
    p = Math.min(p, doel + 0.4); // nooit echt boven het land
    Pt[i] = p;
  }
  // De voetkom: vlak, met een laatste watervalletje als het water nog te hoog aankomt.
  const iV0 = iK1 + 1;
  const iV1 = iVan(voetKom.tot);
  let kom = Infinity;
  for (let i = iV0; i <= iV1; i++) kom = Math.min(kom, T(i, 'etage'));
  if (p - kom > 0.35) {
    const h = p - kom;
    const n = valNaar(iV0, h, KT.valLengte, false);
    sprongen[sprongen.length - 1].top = p;
    for (let k = 0; k < n; k++) Pt[iV0 + k] = p - h * ((k * STAP) / sprongen[sprongen.length - 1].lengte) ** 2;
    for (let i = iV0 + n; i <= iV1; i++) Pt[i] = kom;
  } else {
    kom = Math.min(kom, p);
    for (let i = iV0; i <= iV1; i++) Pt[i] = kom;
  }
  p = kom;
  /** Zacht dalend peil dat nooit boven het land komt: de onderste omhullende, gemiddeld over 2w + 1 punten. */
  function zacht(van, tot, zone, start, vloer = -Infinity) {
    const M = [];
    let m = start;
    for (let i = van; i <= tot + 16; i++) {
      m = Math.min(m, i < N ? T(Math.min(i, tot), zone) : m);
      M.push(Math.max(vloer, m));
    }
    const w = 6;
    for (let i = van; i <= tot; i++) {
      let som = 0;
      for (let k = 0; k <= 2 * w; k++) som += M[Math.min(M.length - 1, i - van + k)];
      Pt[i] = som / (2 * w + 1);
    }
  }
  // De etage.
  zacht(iV1 + 1, iLip, 'etage', p);
  p = Pt[iLip];
  // De grote waterval: het water vliegt zoals het vlot, en komt in de poel terecht.
  const iP0 = iRandVoet;
  const iP1 = Math.min(N - 1, iP0 + Math.round(PK.lengte / STAP));
  let poel = Infinity;
  for (let i = iP0; i <= iP1; i++) poel = Math.min(poel, T(i, 'laag'));
  poel = Math.max(poel, beneden.bronPeil);
  const Hval = p - poel;
  const W = B.waterval;
  const Lval = Math.max(sVan(iRandVoet) - sLip - 1, W.lipSnelheid * Math.sqrt((2 * Hval) / W.zwaartekracht));
  const nVal = valNaar(iLip, Hval, Lval, true);
  const groot = sprongen[sprongen.length - 1];
  groot.top = p;
  for (let k = 0; k < nVal; k++) Pt[iLip + k] = p - Hval * ((k * STAP) / groot.lengte) ** 2;
  const iPoel = iLip + nVal;
  const iPoelEind = Math.max(iPoel + 6, iP1);
  for (let i = iPoel; i <= iPoelEind; i++) Pt[i] = poel;
  const poelKom = { van: sVan(iPoel), tot: sVan(iPoelEind) };
  // Het laagland, tot het peil van de benedenrivier; een kleine waterval als het water daar nog te hoog ligt.
  const BV = B.bronval;
  const iBV = Math.max(iPoelEind + 4, N - 1 - Math.round(BV.voor / STAP));
  zacht(iPoelEind + 1, iBV, 'laag', poel, beneden.bronPeil);
  const hBron = Pt[iBV] - beneden.bronPeil;
  if (hBron > BV.minHoogte) {
    const n = valNaar(iBV, hBron, BV.lengte, false);
    sprongen[sprongen.length - 1].top = Pt[iBV];
    const top = Pt[iBV];
    for (let k = 0; k < n && iBV + k < N; k++) Pt[iBV + k] = top - hBron * ((k * STAP) / sprongen[sprongen.length - 1].lengte) ** 2;
    for (let i = iBV + n; i < N; i++) Pt[i] = beneden.bronPeil;
  } else {
    for (let i = iBV; i < N; i++) Pt[i] = beneden.bronPeil + (Pt[iBV] - beneden.bronPeil) * (1 - (i - iBV) / Math.max(1, N - 1 - iBV));
  }
  const laag = { van: poelKom.tot, tot: sVan(iBV) };
  sprongen.sort((a, b) => a.s - b.s);
  const zones = { kegel, voetKom, etage, poelKom, laag };

  function inSprong(s) {
    for (const sp of sprongen) if (s >= sp.s && s < sp.s + sp.lengte) return sp;
    return null;
  }
  /** Het waterpeil op s. */
  function peil(s) {
    const sp = inSprong(s);
    if (sp) return sp.top - sp.hoogte * ((s - sp.s) / sp.lengte) ** 2;
    const f = index(s);
    const i = Math.floor(f);
    return Pt[i] + (Pt[i + 1] - Pt[i]) * (f - i);
  }
  /** Het peil voor de oevers: rond een waterval zacht naar beneden (geen hap uit de oever). */
  function oeverPeil(s) {
    for (const sp of sprongen) {
      if (s > sp.s - 1 && s < sp.s + sp.lengte + 1) return sp.top - sp.hoogte * glad((s - sp.s + 1) / (sp.lengte + 2));
    }
    return peil(s);
  }

  // --- Breedte en snelheid ---
  const SPL = B.splitsing;
  const split = { van: lerp(etage.van, etage.tot, SPL.van), tot: lerp(etage.van, etage.tot, SPL.tot), wilde: SPL.wildeKant };
  const bt = [
    [sBegin, 0.3], [sBegin + 1.6, BK.breedte], [kegel.van - 1, BK.breedte], [kegel.van + 2, Z.kegel.breedte],
    [voetKom.van - 2, Z.kegel.breedte], [voetKom.van + 2, VK.breedte], [voetKom.tot - 2, VK.breedte], [voetKom.tot + 2, Z.etage.breedte],
    [split.van - 4, Z.etage.breedte], [split.van, SPL.breedte], [split.tot, SPL.breedte], [split.tot + 4, Z.etage.breedte],
    [sLip - 3, Z.etage.breedte * 0.9], [poelKom.van - 1, Z.etage.breedte * 0.9], [poelKom.van + 3, PK.breedte],
    [poelKom.tot - 4, PK.breedte], [poelKom.tot + 2, Z.laag.breedte], [sEinde - 8, B.eind.breedte * 1.15], [sEinde, B.eind.breedte],
  ];
  const vt = [
    [sBegin, 0.2], [0, BK.snelheid], [kegel.van - 1, BK.snelheid * 1.5], [kegel.van + 2.5, Z.kegel.snelheid],
    [voetKom.van - 1, Z.kegel.snelheid], [voetKom.van + 3, VK.snelheid], [voetKom.tot - 3, VK.snelheid * 1.4], [voetKom.tot + 2, Z.etage.snelheid],
    [sLip - 6, Z.etage.snelheid], [sLip, W.lipSnelheid], [poelKom.van, W.lipSnelheid], [poelKom.van + 3, PK.snelheid],
    [poelKom.tot - 4, PK.snelheid * 1.3], [poelKom.tot + 2, Z.laag.snelheid], [sEinde - 6, Z.laag.snelheid], [sEinde, B.eind.snelheid],
  ];
  /** Halve breedte van het water op s. */
  const breedte = (s) => tabel(bt, s) - (s < sBegin ? (sBegin - s) * 1.5 : 0);
  const diepteOp = (s) => (s > poelKom.van - 1 && s < poelKom.tot - 3 ? PK.diepte : s < voetKom.van ? Z.kegel.diepte : s < poelKom.van ? Z.etage.diepte : Z.laag.diepte);
  const klasseOp = (s) => (s < voetKom.van ? Z.kegel.klasse : s < poelKom.van ? Z.etage.klasse : Z.laag.klasse);
  const zoneS = (naam, f) => lerp(zones[naam].van, zones[naam].tot, f);

  /** Halve breedte van het eilandje van de splitsing op s (0 buiten de splitsing). */
  function eilandOp(s) {
    if (s <= split.van || s >= split.tot) return 0;
    const f = (s - split.van) / (split.tot - split.van);
    return SPL.eiland * Math.pow(Math.sin(Math.PI * f), 0.55);
  }

  // De stroomtongen, golftreinen, rotsen, keerwater en de kolk.
  const tongen = [];
  for (const [zone, lijst] of Object.entries(B.tongen)) for (const t of lijst) tongen.push({ van: zoneS(zone, t.van), tot: zoneS(zone, t.tot), breedte: t.breedte, extra: t.extra });
  const treinen = [];
  for (const [zone, lijst] of Object.entries(B.treinen)) {
    for (const t of lijst) {
      if (t.na === 'val') {
        for (const sp of sprongen) if (!sp.groot && sp.s > zones[zone].van - 3 && sp.s < zones[zone].tot + 3) treinen.push({ van: sp.s + sp.lengte + 0.6, tot: sp.s + sp.lengte + 0.6 + t.lengte, hoogte: t.hoogte, golf: t.golf });
      } else treinen.push({ van: zoneS(zone, t.van), tot: zoneS(zone, t.tot), hoogte: t.hoogte, golf: t.golf });
    }
  }
  /** @type {{ s:number, d:number, r:number, h:number, x:number, z:number, y:number }[]} */
  const rotsen = [];
  for (const [zone, lijst] of Object.entries(B.rotsen)) {
    for (const [f, df, r, h] of lijst) {
      // Niet op een waterval of waar je landt, niet in de splitsing, en nooit twee rotsen naast elkaar (er blijft
      // altijd een doorgang vrij voor het vlot).
      let s = zoneS(zone, f);
      for (let k = 0; k < 8; k++) {
        const sp = sprongen.find((q) => s > q.s - r - 1.2 && s < q.s + q.lengte + r + 4);
        const inSplit = s > split.van - 3 && s < split.tot + 2;
        const buur = rotsen.find((q) => Math.abs(q.s - s) < q.r + r + 2.6);
        if (!sp && !inSplit && !buur) break;
        s = sp ? sp.s + sp.lengte + r + 4.2 : inSplit ? split.tot + 3 : buur.s + buur.r + r + 2.7;
      }
      const d = df * breedte(s);
      const [x, z] = puntOp(s, d);
      rotsen.push({ s, d, r, h, x, z, y: peil(s) });
    }
  }
  const KW = B.keerwater;
  const keerwater = rotsen.map((r) => ({ s: r.s + r.r * 0.6, d: r.d, lengte: KW.lengte + r.r, breed: KW.breed + r.r * 0.4 }));
  const KO = B.kolk;
  const sKolk = zoneS('etage', KO.f);
  const kolken = [{ s: sKolk, d: KO.d * breedte(sKolk), r: KO.r, draai: KO.draai, wegDuw: KO.wegDuw }];

  function tongOp(s, d) {
    let m = 0;
    for (const T2 of tongen) {
      if (s < T2.van - 1 || s > T2.tot) continue;
      const f = (s - T2.van) / (T2.tot - T2.van);
      const w = Math.max(0.05, T2.breedte * (1 - Math.max(0, f) * 0.7));
      const inV = 1 - glad((Math.abs(d) - w * 0.55) / (w * 0.6));
      m = Math.max(m, inV * glad((s - T2.van + 1) / 1.5) * (1 - glad((s - T2.tot + 1.2) / 1.2)));
    }
    return m;
  }
  /** Hoe sterk het keerwater is op (s, d): 0 in de stroom, 1 vlak achter een rots. */
  function keerOp(s, d) {
    let m = 0;
    for (const k of keerwater) {
      const ds = s - k.s;
      if (ds < 0 || ds > k.lengte) continue;
      const q = Math.abs(d - k.d) / k.breed;
      if (q > 1.4) continue;
      m = Math.max(m, (1 - glad((ds - k.lengte * 0.5) / (k.lengte * 0.5))) * (1 - glad((q - 0.5) / 0.8)) * glad(ds / 0.4));
    }
    return m;
  }
  /** Hoe snel het water stroomt op (s, d), in m/s langs de stroom (negatief in het keerwater). */
  function stroom(s, d) {
    const b = Math.max(0.3, breedte(s));
    const q = Math.min(1, Math.abs(d) / b);
    let v = tabel(vt, s) * (1 - B.oeverTraag * q * q) * (1 + tongOp(s, d) * (tongen.find((t) => s >= t.van - 1 && s <= t.tot)?.extra ?? 0));
    if (s > split.van - 4 && s < split.tot + 4) {
      const k = glad((s - split.van + 4) / 4) * (1 - glad((s - split.tot) / 4));
      v *= 1 + ((d * split.wilde > 0 ? SPL.wild : SPL.rustig) - 1) * k;
    }
    v *= 1 - KW.sterkte * keerOp(s, d);
    for (const ko of kolken) {
      const a = Math.hypot(s - ko.s, d - ko.d);
      if (a < ko.r) v *= 1 - 0.55 * (1 - a / ko.r);
    }
    return v;
  }
  /** De staande golven op (s, d): hoe hoog het water daar opbolt. */
  function golfOp(s, d) {
    let h = 0;
    for (const t of treinen) {
      if (s < t.van || s > t.tot) continue;
      const f = (s - t.van) / (t.tot - t.van);
      const b = Math.max(0.3, breedte(s));
      h += t.hoogte * Math.sin(Math.PI * f) * Math.sin(((s - t.van) / t.golf) * Math.PI * 2) * (1 - glad((Math.abs(d) / b - 0.5) / 0.5));
    }
    return h;
  }

  // --- Steigers: op de oever aan de kant van het kamp. Hier ligt het vlot klaar. ---
  const ST = B.steiger;
  const steigers = [];
  const maakDek = (x, z, ax, az, halfL, halfB, y) => ({ x, z, ax, az, halfL, halfB, y });
  const kampZijde = (s) => {
    const [ax, az] = puntOp(s, 4);
    const [bx2, bz2] = puntOp(s, -4);
    return Math.hypot(ax - c.kamp.x, az - c.kamp.z) < Math.hypot(bx2 - c.kamp.x, bz2 - c.kamp.z) ? 1 : -1;
  };
  for (const [naam, s, klasse] of [['top', BK.lengte * 0.45, Z.kegel.klasse], ['etage', sVoet + 1, Z.etage.klasse], ['laag', poelKom.tot - 3.5, Z.laag.klasse]]) {
    const zijde = kampZijde(s);
    const b = breedte(s);
    const [x, z] = puntOp(s, zijde * (b - ST.overWater + ST.breedte / 2));
    const [ax, az] = raaklijn(s);
    const dek = maakDek(x, z, ax, az, ST.lengte / 2, ST.breedte / 2, peil(s) + ST.hoogte);
    steigers.push({ naam, s, zijde, klasse, dek, ligplaats: { s, d: zijde * (b - ST.overWater - 1.1) } });
  }
  const dekken = steigers.map((k) => k.dek);

  // --- Het bruggetje in het laagland (stap 14b): een houten boogbrug over de rivier, zodat je (en de pony)
  // droog naar de overkant loopt. Hoog genoeg in het midden om met het vlot onderdoor te varen. ---
  const BR = B.brug;
  /** @type {{ s:number, x:number, z:number, ax:number, az:number, halfL:number, halfB:number, yA:number, yB:number, boog:number, ingangen:[number,number][] } | null} */
  let brug = null;
  /** Kiest de plaats van het bruggetje (pas als de bedding en de oevers bekend zijn, zie onderaan). */
  function kiesBrug() {
    const tmpBrug = { h: 0, water: 0, oever: 0, gras: 0, vlak: 0, wand: 0, dicht: 0, eiland: 0 };
    const stLaag = steigers.find((k) => k.naam === 'laag');
    const q0 = { s: 0, d: 0 };
    // Elke meter van het laagland, het dichtst bij het liefste plekje eerst.
    const lief = zoneS('laag', BR.liefst);
    const kandidaten = [];
    for (let s = Math.ceil(laag.van); s <= laag.tot - BR.vanEinde; s++) kandidaten.push(s);
    kandidaten.sort((p, q) => Math.abs(p - lief) - Math.abs(q - lief));
    for (const s of kandidaten) {
      if (stLaag && Math.abs(s - stLaag.s) < BR.vanSteiger) continue;
      const [mx, mz] = puntOp(s, 0);
      const [px, pz] = puntOp(s, 1);
      const ax = px - mx;
      const az = pz - mz;
      // Zo lang dat elk uiteinde op vlak genoeg land ligt (voorbij de steile wand van de oever).
      const H = (l) => stempel(mx + ax * l, mz + az * l, c.grond(mx + ax * l, mz + az * l), tmpBrug).h;
      const vlakAan = (l, k2) => Math.abs(H(l + k2 * 1) - H(l)) <= BR.maxEindHelling && Math.abs(H(l) - H(l - k2 * 0.5)) <= BR.maxEindHelling * 0.5;
      let halfL = breedte(s) + B.oever.breed + BR.opLand;
      for (let ext = 0; ext < 4 && !(vlakAan(-halfL, -1) && vlakAan(halfL, 1)); ext++) halfL += 1;
      const A = [mx - ax * halfL, mz - az * halfL];
      const Bp = [mx + ax * halfL, mz + az * halfL];
      // Beide uiteinden op droog land, niet in de benedenrivier, en de rivier recht genoeg: het dichtste stuk
      // rivier bij elk uiteinde is dit stuk (niet een ander stuk in een bocht, dat de oever daar dieper uitgraaft).
      const droog = ([x, z]) => c.grond(x, z) > 0.4 && beneden.peilOp(x, z) === 0 && !c.bezet?.(x, z);
      if (!droog(A) || !droog(Bp)) continue;
      const recht = ([x, z]) => {
        for (const f2 of [0.6, 0.85, 1]) {
          const px2 = mx + (x - mx) * f2;
          const pz2 = mz + (z - mz) * f2;
          if (!naar(px2, pz2, q0) || Math.abs(q0.s - s) > BR.recht) return false;
        }
        return true;
      };
      if (!recht(A) || !recht(Bp)) continue;
      // Voorbij elk uiteinde droog land om af te stappen (niet meteen weer een ander stuk rivier in een bocht).
      const verder = (P, k2) => [1.5, 3.5].every((e2) => {
        const x = P[0] + ax * k2 * e2;
        const z = P[1] + az * k2 * e2;
        return droog([x, z]) && peilOp(x, z) === 0;
      });
      if (!verder(A, -1) || !verder(Bp, 1)) continue;
      // De hoogte van de uitgegraven oever aan elk uiteinde (zoals het landschap er straks echt ligt).
      const yA = stempel(A[0], A[1], c.grond(A[0], A[1]), tmpBrug).h + 0.03;
      const yB = stempel(Bp[0], Bp[1], c.grond(Bp[0], Bp[1]), tmpBrug).h + 0.03;
      if (Math.abs(yA - yB) > BR.maxVerschil) continue;
      const boog = Math.max(BR.minBoog, peil(s) + BR.vrij - (yA + yB) / 2);
      if ((Math.abs(yB - yA) + Math.PI * boog) / (2 * halfL) > BR.maxHelling) continue;
      brug = { s, x: mx, z: mz, ax, az, halfL, halfB: BR.breedte / 2, yA, yB, boog, ingangen: [A, Bp] };
      break;
    }
  }
  /** De hoogte van de brug op (x, z), of -Infinity. marge: zoveel van de zijkant af (voor de padzoeker). */
  function brugOp(x, z, marge = 0) {
    if (!brug) return -Infinity;
    const dx = x - brug.x;
    const dz = z - brug.z;
    const l = dx * brug.ax + dz * brug.az;
    const b = -dx * brug.az + dz * brug.ax;
    if (Math.abs(b) > brug.halfB - marge) return -Infinity;
    // Voorbij elk uiteinde een drempeltje dat in de grond wegzakt (geen trede tussen brug en gras).
    const voorbij = Math.abs(l) - brug.halfL;
    if (voorbij > 0) return voorbij > 0.7 ? -Infinity : (l < 0 ? brug.yA : brug.yB) - voorbij * 0.8;
    const f = (l + brug.halfL) / (2 * brug.halfL);
    return brug.yA + (brug.yB - brug.yA) * f + brug.boog * Math.sin(Math.PI * f);
  }
  /**
   * De leuningen van de brug: wie op de brug loopt (of er net boven springt), blijft erop. Duwt pos terug
   * naar binnen en haalt de vaart naar buiten weg. zij: hoe breed wie erop loopt (half).
   */
  function brugLeuning(pos, vel, zij = 0.3) {
    if (!brug) return false;
    const dx = pos[0] - brug.x;
    const dz = pos[2] - brug.z;
    const l = dx * brug.ax + dz * brug.az;
    if (Math.abs(l) > brug.halfL - BR.leuningVanEind) return false;
    const b = -dx * brug.az + dz * brug.ax;
    const max = brug.halfB - BR.leuning - zij;
    if (Math.abs(b) > brug.halfB + 0.4) return false;
    const f = (l + brug.halfL) / (2 * brug.halfL);
    const y = brug.yA + (brug.yB - brug.yA) * f + brug.boog * Math.sin(Math.PI * f);
    if (pos[1] < y - 0.6 || pos[1] > y + 2.5 || Math.abs(b) <= max) return false;
    const terug = b - Math.sign(b) * max;
    pos[0] += brug.az * terug;
    pos[2] -= brug.ax * terug;
    const v = -vel[0] * brug.az + vel[2] * brug.ax;
    if (v * b > 0) {
      vel[0] += brug.az * v;
      vel[2] -= brug.ax * v;
    }
    return true;
  }

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
  function blokOp(x, z) {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return -Infinity;
    let best = Math.max(dekOp(x, z), brugOp(x, z));
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

  // --- De bedding en de oevers in het landschap (TP 5.2, laag 4) ---
  const O = B.oever;
  const q = { s: 0, d: 0 };
  /**
   * Graaft de rivier in de hoogte h op (x, z). Vult uit: h, water, oever (zand aan de waterlijn), gras (de
   * terrasjes bij de steigers), vlak (geen fijne bultjes), wand (de steile wand van de sleuf), dicht (hoe dicht bij
   * de rivier: geen rotsblokken), eiland.
   */
  function stempel(x, z, h, uit) {
    uit.h = h;
    uit.water = 0;
    uit.oever = 0;
    uit.gras = 0;
    uit.vlak = 0;
    uit.wand = 0;
    uit.dicht = 0;
    if (!naar(x, z, q)) return uit;
    const s = q.s;
    if (s > sEinde || s < sBegin - 14) return uit;
    const d = q.d;
    const ad = Math.abs(d);
    const b = breedte(s);
    const eb = ad - b;
    if (eb > O.marge) return uit;
    // Aan het einde gaat de bedding over in die van de benedenrivier.
    const meng = 1 - glad((s - (sEinde - 3)) / 3);
    if (meng <= 0) return uit;
    const Wo = oeverPeil(s);
    // Bij een steiger: een vlak terrasje op de oever, om bij het vlot te komen.
    let oever = O.breed;
    let terras = 0;
    for (const st of steigers) {
      if (Math.sign(d) !== st.zijde) continue;
      const k = 1 - glad((Math.abs(s - st.s) - ST.terrasLengte / 2) / 3);
      if (k > 0) {
        terras = Math.max(terras, k);
        oever = Math.max(oever, O.breed + (ST.terras - O.breed) * k);
      }
    }
    const wand = s < voetKom.van ? O.wand : Math.min(O.wand, 0.85);
    let hn;
    const eil = eilandOp(s);
    if (eb < 0) {
      if (eil > 0 && ad < eil + 0.3) {
        // Het eilandje van de splitsing: een zandig bultje met gras.
        const t = Math.max(0, 1 - ad / (eil + 0.3));
        hn = Wo + 0.15 + 0.55 * Math.sqrt(t);
        uit.oever = 1 - glad((t - 0.15) / 0.3);
        uit.gras = 1 - uit.oever;
        uit.vlak = 1;
        uit.eiland = 1;
      } else {
        // De bedding: diep in het midden, ondiep aan de oever (en aan het eilandje).
        const W = peil(s);
        const binnen = eil > 0 ? (ad - eil - 0.3) / Math.max(0.3, b - eil - 0.3) : ad / b;
        const f = eil > 0 ? 1 - (2 * binnen - 1) ** 2 : 1 - binnen * binnen;
        const diep = diepteOp(s) * Math.min(1, b / 2.4) * Math.pow(Math.max(0, f), 0.6) + 0.05;
        hn = Math.min(h, W - diep);
        // Onder de grote waterval: de rand meteen steil weg, zodat je er niet op blijft staan (je valt mee).
        const spg = inSprong(s);
        if (spg?.groot) hn = Math.min(hn, spg.top - diepteOp(s) - 5 * glad((s - spg.s) / 1.4));
        uit.water = 1;
        uit.oever = inSprong(s)?.groot ? 0 : 1;
        uit.wand = inSprong(s)?.groot ? 1 : 0;
        uit.vlak = 1;
      }
    } else {
      // De oever: een strookje net boven het water, dan de wand van de sleuf (of een talud naar beneden).
      const rand = O.hoogte * glad(eb / 0.8);
      const voorbij = Math.max(0, eb - oever);
      const boven = Wo + rand + voorbij * wand;
      const onder = Wo + rand - voorbij * O.vul;
      hn = Math.min(Math.max(h, onder), boven);
      const buiten = glad((eb - (O.marge - 4)) / 4);
      hn += (h - hn) * buiten;
      uit.water = 1 - glad(eb / 0.3);
      uit.oever = (1 - glad((eb - 0.7) / 0.7)) * (1 - terras);
      uit.gras = terras * (1 - glad((eb - oever) / 1.5));
      uit.vlak = 1 - glad((eb - oever) / 2);
      if (voorbij > 0.3 && hn - (Wo + rand) > 0.7 && wand > 1) uit.wand = 1 - buiten;
      if (inSprong(s)?.groot || (Wo - peil(s) > 2 && voorbij < 3)) uit.wand = 1;
    }
    // Bij het bruggetje: vlak gras aan beide uiteinden (geen bultjes onder het begin van de brug).
    if (brug && Math.abs(s - brug.s) < brug.halfB + BR.opLand + 2) {
      const k = (1 - glad((Math.abs(s - brug.s) - brug.halfB - 1) / (BR.opLand + 1))) * (1 - glad((Math.abs(eb - (brug.halfL - b)) - 1.5) / 2));
      uit.vlak = Math.max(uit.vlak, k);
      uit.gras = Math.max(uit.gras, k * (1 - uit.water));
    }
    uit.h = h + (hn - h) * meng;
    uit.dicht = (1 - glad((eb - 3) / 6)) * meng;
    return uit;
  }

  const w = { s: 0, d: 0 };
  /** Het waterpeil op (x, z), of 0 als je niet in deze rivier bent. */
  function peilOp(x, z) {
    if (!naar(x, z, w)) return 0;
    if (w.s < sBegin - 0.5 || w.s > sEinde) return 0;
    const b = breedte(w.s);
    if (Math.abs(w.d) - b > 0.4) return 0;
    const eil = eilandOp(w.s);
    if (eil > 0 && eil > Math.abs(w.d) - 0.1) return 0; // op het eilandje van de splitsing
    return peil(w.s);
  }
  /** Zit (x, z) in het vallende water van een waterval? Vult uit.s, uit.d en uit.sprong (anders false). */
  function inValOp(x, z, uit) {
    if (!naar(x, z, w) || Math.abs(w.d) > breedte(w.s) + 0.3) return false;
    const sp = inSprong(w.s);
    if (!sp) return false;
    uit.s = w.s;
    uit.d = w.d;
    uit.sprong = sp;
    return true;
  }
  /** De stroming op (x, z) als snelheid [x, z] (0 buiten de rivier). */
  function stroomOp(x, z, uit = [0, 0]) {
    uit[0] = uit[1] = 0;
    if (!naar(x, z, w)) return uit;
    if (w.s < sBegin || w.s > sEinde || Math.abs(w.d) - breedte(w.s) > 0) return uit;
    const v = stroom(w.s, w.d);
    raaklijn(w.s, uit);
    const tx0 = uit[0];
    const tz0 = uit[1];
    uit[0] *= v;
    uit[1] *= v;
    // Voor en langs het eilandje van de splitsing duwt het water je opzij, een van de armen in.
    if (w.s > split.van - 3 && w.s < split.tot) {
      const eil = Math.max(eilandOp(w.s), eilandOp(w.s + 2));
      if (Math.abs(w.d) < eil + 1.2) {
        const zij = w.d !== 0 ? Math.sign(w.d) : split.wilde;
        uit[0] += -tz0 * zij * 1.3;
        uit[1] += tx0 * zij * 1.3;
      }
    }
    return uit;
  }

  const bloesems = B.bloesems.map(([zone, f, df]) => {
    const s = zoneS(zone, f);
    const [x, z] = puntOp(s, df * breedte(s));
    return { x, z, y: peil(s) + B.bloesemHoogte };
  });

  kiesBrug();

  return {
    naam: 'berg',
    R: B,
    lengte: sEinde,
    sBegin,
    sEinde,
    sMond: Infinity,     // geen lagune: de bergrivier komt uit in de benedenrivier
    sLip,
    sVoet,
    zones,
    split,
    sprongen,
    groteVal: groot,
    rotsen,
    keerwater,
    kolken,
    tongen,
    treinen,
    steigers,
    dekken,
    bloesems,
    breedte,
    stroom,
    tongOp,
    keerOp,
    golfOp,
    eilandOp,
    klasseOp,
    peil,
    oeverPeil,
    inSprong,
    puntOp,
    richtingOp,
    raaklijn,
    naar,
    stempel,
    peilOp,
    stroomOp,
    inValOp,
    blokOp,
    dekOp,
    /** Het bruggetje in het laagland (stap 14b), of null. */
    brug,
    brugOp,
    brugLeuning,
    dichtbij: (x, z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ,
    /** Stroomafwaarts gaat de bergrivier over in de benedenrivier, op deze s. */
    volgende: { tak: beneden, s: AANSLUIT, sHier: sEinde },
    /** De hoeken rond de top waar de rivier de rotsrand en de voet van de bergtop kruist (voor het bergplan). */
    hoeken: { val: aW, voet: aF, bron: aS },
  };
}
