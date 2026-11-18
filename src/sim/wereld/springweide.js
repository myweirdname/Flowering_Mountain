// De springweide bij het kamp (GD 6, 14): waar ze ligt, de baan, de hindernissen, het water en de wortels.
// Alleen gegevens en wiskunde: de hoogtefunctie gebruikt dit om de weide vlak te maken en de beek uit te
// graven, de simulatie om te springen en te weigeren, en het beeld om alles te tekenen.
//
// Eigen assen van de weide: u langs de lange zijde (positief = weg van het kamp), v dwars (positief = naar
// de jungle). De baan is een stadion: twee rechte stukken (v = -R en v = +R) en twee halve cirkels.

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @param {typeof import('../../data/springweide.js').WEIDE} W
 * @param {{ x:number, z:number, h:number }} kamp
 * @param {number} kant aan welke kant van het kamp de lagune ligt (-1 of 1); de weide ligt aan de andere kant
 * @param {(x:number, z:number) => number} ruw de landvorm zonder stempels
 */
export function maakWeide(W, kamp, kant, ruw) {
  const su = -kant; // richting van u in wereld-x
  const cx = kamp.x + su * W.afstand;
  const cz = kamp.z + W.z;
  const H = Math.min(Math.max(ruw(cx, cz), kamp.h + W.hoogteBoven[0]), kamp.h + W.hoogteBoven[1]);
  const L = W.baan.recht;
  const R = W.baan.straal;
  const B = W.baan.breedte;
  const lengte = 4 * L + 2 * Math.PI * R;
  const waterY = H - W.waterOnder;

  const naarLokaal = (x, z) => [(x - cx) * su, z - cz];
  const naarWereld = (u, v) => [cx + su * u, cz + v];

  /** Punt en richting op het midden van de baan, op afstand s (in weide-assen). */
  function baanPunt(s) {
    s = ((s % lengte) + lengte) % lengte;
    if (s < 2 * L) return { u: -L + s, v: -R, tu: 1, tv: 0 };
    s -= 2 * L;
    if (s < Math.PI * R) {
      const a = -Math.PI / 2 + s / R;
      return { u: L + R * Math.cos(a), v: R * Math.sin(a), tu: -Math.sin(a), tv: Math.cos(a) };
    }
    s -= Math.PI * R;
    if (s < 2 * L) return { u: L - s, v: R, tu: -1, tv: 0 };
    s -= 2 * L;
    const a = Math.PI / 2 + s / R;
    return { u: -L + R * Math.cos(a), v: R * Math.sin(a), tu: -Math.sin(a), tv: Math.cos(a) };
  }

  /** Afstand tot de "ruggengraat" van het stadion (het lijnstuk v = 0, |u| <= L). */
  const kern = (u, v) => Math.hypot(Math.max(Math.abs(u) - L, 0), v);
  /** Afstand tot het midden van de baan. */
  const baanAfstand = (u, v) => Math.abs(kern(u, v) - R);

  /** Hoe diep het water hier onder het gras ligt (0 = droog). */
  function waterDiepte(u, v) {
    const Vj = W.vijver;
    const P = W.poel;
    const Bk = W.beek;
    const o = Bk.oever;
    let d = 0;
    const kom = (cu, cv, r, diepte) => diepte * (1 - glad((Math.hypot(u - cu, v - cv) - (r - o)) / o));
    d = Math.max(d, kom(Vj.u, Vj.v, Vj.straal, Vj.diepte));
    d = Math.max(d, kom(P.u, P.v, P.straal, P.diepte));
    if (v > Vj.v && v < P.v) {
      // De beek: een rechte geul van het vijvertje naar de poel, met een klein slingertje.
      const midden = Vj.u + 0.35 * Math.sin((v - Vj.v) * 0.45);
      d = Math.max(d, Bk.diepte * (1 - glad((Math.abs(u - midden) - (Bk.breedte / 2 - o)) / o)));
    }
    return d;
  }

  // Het zandpaadje van het kamp naar de bocht van de weide.
  const [ax, az] = [kamp.x + su * 9, kamp.z - 5]; // langs de klimrotsen naast het kamp
  const [bx, bz] = naarWereld(-L - R - B / 2 + 0.5, 0);
  function padGewicht(x, z) {
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    return 1 - glad((d - W.pad.breedte / 2) / 1.0);
  }

  /**
   * Stempelt de weide in de landvorm en vult wat er ligt in.
   * @param {number} x @param {number} z @param {number} h hoogte tot nu toe
   * @returns {{ h:number, weide:number, baan:number, nat:number, pad:number }}
   */
  const stempelUit = { h: 0, weide: 0, baan: 0, nat: 0, pad: 0 };
  function stempel(x, z, h) {
    const [u, v] = naarLokaal(x, z);
    const ds = kern(u, v);
    const ww = 1 - glad((ds - W.vlak) / W.rand);
    const pw = padGewicht(x, z);
    stempelUit.weide = ww;
    stempelUit.pad = pw * (1 - ww);
    if (ww <= 0) {
      stempelUit.h = h;
      stempelUit.baan = stempelUit.nat = 0;
      return stempelUit;
    }
    h += (H - h) * ww;
    const diepte = waterDiepte(u, v) * ww;
    h -= diepte;
    stempelUit.h = h;
    stempelUit.nat = glad((diepte - 0.05) / 0.2);
    stempelUit.baan = (1 - glad((Math.abs(ds - R) - (B / 2 - 0.35)) / 0.7)) * ww * (1 - stempelUit.nat);
    return stempelUit;
  }

  // --- Hindernissen: elk deel is een rechthoek dwars op de baan ---
  /** @typedef {{ groep:number, deel:number, soort:string, x:number, z:number, nx:number, nz:number, tx:number, tz:number,
   *              diep:number, breed:number, hoogte:number, y:number, water:boolean, s:number }} Deel */
  /** @type {Deel[]} */
  const delen = [];
  const groepen = [];
  W.hindernissen.forEach((h, groep) => {
    const M = W.maten[h.soort];
    const plekken = h.soort === 'dubbel' ? [h.s - h.tussen / 2, h.s + h.tussen / 2] : [h.s];
    const deelIds = [];
    plekken.forEach((s, deel) => {
      const p = baanPunt(s);
      let cu = p.u;
      let cv = p.v;
      // Dwars op de baan, naar buiten.
      const ou = p.tv;
      const ov = -p.tu;
      let breed = B / 2 + W.uitsteek;
      if (h.soort === 'beek') {
        // De beek loopt van het vijvertje tot de poel: zo lang is ook de "hindernis".
        const van = W.vijver.v + W.vijver.straal;
        const tot = W.poel.v - W.poel.straal;
        breed = (tot - van) / 2 + 0.3;
        cv = (van + tot) / 2;
        cu = W.vijver.u;
      }
      const [x, z] = naarWereld(cu, cv);
      deelIds.push(delen.length);
      delen.push({
        groep, deel, soort: h.soort, s, x, z,
        nx: su * p.tu, nz: p.tv,
        tx: su * ou, tz: ov,
        diep: M.diepte / 2, breed, hoogte: M.hoogte, y: H, water: h.soort === 'beek',
      });
    });
    groepen.push({ soort: h.soort, delen: deelIds });
  });

  const sp = baanPunt(W.start);
  const [gx, gz] = naarWereld(sp.u, sp.v);
  const poort = { x: gx, z: gz, nx: su * sp.tu, nz: sp.tv, tx: su * sp.tv, tz: -sp.tu, breed: B / 2 + 0.8, y: H };

  const wortels = W.wortels.map((s, id) => {
    const p = baanPunt(s);
    const [x, z] = naarWereld(p.u + p.tv * W.wortelNaarBinnen, p.v - p.tu * W.wortelNaarBinnen);
    return { id, x, z, y: H, s };
  });

  /** Waar op een deel ligt (x, z)? a langs de baan, b dwars. */
  const inDeel = (d, x, z) => [(x - d.x) * d.nx + (z - d.z) * d.nz, (x - d.x) * d.tx + (z - d.z) * d.tz];

  const bereik = L + R + 6;
  return {
    midden: { x: cx, z: cz },
    hoogte: H,
    waterY,
    su,
    L, R, B, lengte,
    naarLokaal,
    naarWereld,
    baanPunt,
    baanAfstand,
    stempel,
    delen,
    groepen,
    poort,
    wortels,
    inDeel,

    /** Ligt (x, z) ergens in de buurt van de weide? */
    dichtbij(x, z, marge = 0) {
      return Math.abs(x - cx) < bereik + marge && Math.abs(z - cz) < R + 12 + marge;
    },

    /** Hoogte van het wateroppervlak in de weide op (x, z), of -Infinity als er geen water is. */
    water(x, z) {
      if (!this.dichtbij(x, z)) return -Infinity;
      const [u, v] = naarLokaal(x, z);
      return waterDiepte(u, v) > W.waterOnder + 0.02 ? waterY : -Infinity;
    },

    /** Bovenkant van een (vaste) hindernis op (x, z), om op te staan; -Infinity als er niets staat. */
    hindernisOp(x, z) {
      if (!this.dichtbij(x, z)) return -Infinity;
      let best = -Infinity;
      for (const d of delen) {
        if (d.water) continue;
        const [a, b] = inDeel(d, x, z);
        const fa = Math.abs(a) / d.diep;
        if (fa >= 1 || Math.abs(b) >= d.breed) continue;
        let top;
        if (d.soort === 'haag') top = d.hoogte * Math.cbrt(1 - fa * fa * fa);
        else if (d.soort === 'dubbel') top = d.hoogte;
        else top = d.hoogte * Math.sqrt(1 - fa * fa);
        best = Math.max(best, d.y + top);
      }
      return best;
    },
  };
}
