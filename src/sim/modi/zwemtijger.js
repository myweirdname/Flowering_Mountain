// De Sumatraanse tijger (SC "Personages": de zwemmer). Hij wacht in de bronkom en zwemt mee naast het vlot,
// in het rustigere water opzij, en springt mee over de kleine sprong. In de lagune blijft hij bij het vlot.
// Hij beweegt net als het vlot in riviercoördinaten (s, d); in de lagune vrij. Geen Three.js.

/** @typedef {ReturnType<typeof maakZwemtijger>} Zwemtijger */
export function maakZwemtijger(id, eigenaar, rivier, Z) {
  const t = {
    id,
    eigenaar,
    modus: 'wacht',     // 'wacht' | 'mee' | 'lagune'
    s: Z.wachtPlek.s,
    d: -rivier.padZijde * Z.wachtPlek.d,
    vs: 0, vd: 0,
    y: 0, vy: 0, lucht: false,
    pos: [0, 0, 0], vorigePos: [0, 0, 0], vel: [0, 0, 0],
    richting: 0, vorigeRichting: 0,
    snelheid: 0,        // hoe hard hij peddelt (voor de animatie)
    /** @type {number[] | null} */
    kijk: null,
  };
  rivierNaarWereld(t, rivier);
  t.richting = rivier.richtingOp(t.s) + Math.PI * 0.6 * rivier.padZijde;
  t.vorigePos = [...t.pos];
  t.vorigeRichting = t.richting;
  return t;
}

const pt = [0, 0];
function rivierNaarWereld(t, rivier) {
  rivier.puntOp(t.s, t.d, pt);
  t.pos[0] = pt[0];
  t.pos[2] = pt[1];
  t.pos[1] = t.lucht ? t.y : rivier.peil(t.s);
}

const hoekNaar = (van, naar) => Math.atan2(Math.sin(naar - van), Math.cos(naar - van));

/**
 * @param {Zwemtijger} t @param {any} s de speler @param {import('./varen.js').Vlot} v het vlot van de speler
 * @param {ReturnType<typeof import('../wereld/rivier.js').maakRivier>} rivier
 * @param {typeof import('../../data/rivier.js').ZWEMTIJGER} Z
 */
export function stapZwemtijger(t, s, v, rivier, Z, V, dt, meld) {
  const opVlot = v && v.ruiter === s.id;
  let doelRichting = t.richting;
  t.kijk = null;

  if (t.modus === 'lagune') {
    // In stil water: bij het vlot blijven (opzij en wat ervoor), of rustig rond de steiger.
    let dx;
    let dz;
    if (v && v.plek === 'lagune') {
      const zij = 2.3;
      const c = Math.cos(v.richting);
      const sn = Math.sin(v.richting);
      dx = v.pos[0] + zij * c + 0.8 * sn;
      dz = v.pos[2] - zij * sn + 0.8 * c;
    } else {
      const [lx, lz] = rivier.laguneLigplaats;
      dx = lx + 2.5;
      dz = lz + 1;
    }
    const ex = dx - t.pos[0];
    const ez = dz - t.pos[2];
    const afst = Math.hypot(ex, ez);
    const doelV = Math.min(Z.snelheid * 0.7, afst * 1.2);
    const nx = afst > 1e-3 ? ex / afst : 0;
    const nz = afst > 1e-3 ? ez / afst : 0;
    t.vel[0] += (nx * doelV - t.vel[0]) * Math.min(1, dt * 2);
    t.vel[2] += (nz * doelV - t.vel[2]) * Math.min(1, dt * 2);
    t.pos[0] += t.vel[0] * dt;
    t.pos[2] += t.vel[2] * dt;
    t.pos[1] = 0;
    const hv = Math.hypot(t.vel[0], t.vel[2]);
    if (hv > 0.25) doelRichting = Math.atan2(t.vel[0], t.vel[2]);
    else if (v) doelRichting = Math.atan2(v.pos[0] - t.pos[0], v.pos[2] - t.pos[2]);
    t.snelheid = 0.7 + hv;
    // Kom je terug bij de bron, dan duikt hij daar weer op.
    const k = rivier.bovenDek;
    if (!opVlot && s && v?.plek === 'boven' && Math.hypot(s.pos[0] - k.x, s.pos[2] - k.z) < Z.verschijnVanaf) {
      t.modus = 'wacht';
      t.s = Z.wachtPlek.s;
      t.d = -rivier.padZijde * Z.wachtPlek.d;
      t.lucht = false;
      rivierNaarWereld(t, rivier);
      t.vorigePos = [...t.pos];
      t.richting = t.vorigeRichting = rivier.richtingOp(t.s) + Math.PI * 0.6 * rivier.padZijde;
      meld({ soort: 'zwemtijgerVerschijnt', speler: t.eigenaar, pos: [...t.pos] });
      return;
    }
  } else {
    const SP = rivier.R.sprong;
    let doelS;
    let doelD;
    let mee = 0;
    if (opVlot && v.plek === 'vaart') {
      t.modus = 'mee';
      // Naast het vlot, aan de kant met de meeste ruimte; is er geen plaats, dan erachter.
      const b = rivier.breedte(v.s + Z.voor);
      const zij = v.d > 0 ? -1 : 1;
      doelD = v.d + zij * Z.naast;
      doelS = v.s + Z.voor;
      if (Math.abs(doelD) > b - 0.55) {
        doelD = Math.max(-(b - 0.55), Math.min(b - 0.55, doelD));
        if (Math.abs(doelD - v.d) < 1.4) {
          doelS = v.s - 2.4;
          doelD = v.d * 0.6;
        }
      }
      mee = v.vs;
    } else {
      // Wachten in de bronkom.
      t.modus = 'wacht';
      doelS = Z.wachtPlek.s;
      doelD = -rivier.padZijde * Z.wachtPlek.d;
      if (s && Math.hypot(s.pos[0] - t.pos[0], s.pos[2] - t.pos[2]) < 12) t.kijk = [s.pos[0], s.pos[1] + 1, s.pos[2]];
    }
    const stroom = rivier.stroom(t.s, t.d);
    const doelVs = Math.max(-Z.snelheid * 0.5, Math.min(Z.snelheid + mee, mee + (doelS - t.s) * 1.6));
    const doelVd = Math.max(-1.6, Math.min(1.6, (doelD - t.d) * 2));
    t.vs += (doelVs - t.vs) * Math.min(1, dt * 2.5);
    t.vd += (doelVd - t.vd) * Math.min(1, dt * 3);
    // Om de rotsen heen.
    for (const r of rivier.rotsen) {
      const ds = t.s - r.s;
      const dd = t.d - r.d;
      const a = Math.hypot(ds, dd);
      const min = r.r + 0.55;
      if (a < min && a > 1e-6) {
        t.s = r.s + (ds / a) * min;
        t.d = r.d + (dd / a) * min;
      }
    }
    // De sprong: hij springt mee, met een grote plons.
    if (!t.lucht && t.s < SP.s && t.s + t.vs * dt >= SP.s) {
      t.lucht = true;
      t.y = rivier.peil(SP.s - 0.01);
      t.vy = 2.6;
      meld({ soort: 'zwemtijgerSprong', speler: t.eigenaar, pos: [...t.pos] });
    }
    const k = t.lucht && v?.lucht ? v.slowmo : 1;
    t.s += t.vs * dt * k;
    t.d += t.vd * dt * k;
    const b = rivier.breedte(t.s);
    t.d = Math.max(-(b - 0.5), Math.min(b - 0.5, t.d));
    if (t.lucht) {
      t.vy -= V.zwaartekracht * dt * k;
      t.y += t.vy * dt * k;
      const w = rivier.peil(t.s);
      if (t.y <= w && t.vy < 0) {
        t.lucht = false;
        meld({ soort: 'zwemtijgerPlons', speler: t.eigenaar, pos: [t.pos[0], w, t.pos[2]] });
      }
    }
    rivierNaarWereld(t, rivier);
    doelRichting = rivier.richtingOp(t.s) + Math.atan2(t.vd, Math.max(0.7, Math.abs(t.vs)));
    if (t.modus === 'wacht' && Math.abs(t.vs) < 0.3 && Math.abs(t.vd) < 0.3) doelRichting = rivier.richtingOp(t.s) + Math.PI * 0.6 * rivier.padZijde;
    if (t.vs < -0.3) doelRichting = rivier.richtingOp(t.s) + Math.PI;
    t.snelheid = 0.6 + Math.abs(t.vs - stroom) + Math.abs(t.vd) * 0.5;
    // De monding voorbij: vrij zwemmen in de lagune.
    if (t.s > rivier.sMond + 2) {
      t.modus = 'lagune';
      const [rx, rz] = rivier.raaklijn(t.s);
      t.vel = [rx * t.vs, 0, rz * t.vs];
      t.lucht = false;
    }
  }
  t.richting += Math.max(-Z.draai * dt, Math.min(Z.draai * dt, hoekNaar(t.richting, doelRichting)));
}
