// De slaapbloem (GD 8): een grote bloem die dicht zit en slaapt, verstopt in de jungle bij het kamp.
// Een tijgerbrul in de buurt maakt haar wakker: ze gaat open en geeft een verstopte schat vrij.
import { maakWillekeur } from '../../kern/willekeur.js';

/**
 * Zoekt een plek voor de slaapbloem: in de jungle, een eind van het kamp, met vrije ruimte rondom,
 * en met een weg vanaf het kamp waar de tijger langs kan.
 * @param {any} vorm @param {any} pad de padvinder @param {number} zaadje @param {typeof import('../../data/tijger.js').GEZEL.slaapbloem} S
 */
export function maakSlaapbloemen(vorm, pad, grondOp, zaadje, S) {
  const r = maakWillekeur(zaadje ^ 0x51ab);
  const k = vorm.kamp;
  const L = vorm.lagune;
  const tmp = {};
  for (let poging = 0; poging < 400; poging++) {
    const a = r.getal() * Math.PI * 2;
    const d = S.afstand[0] + r.getal() * (S.afstand[1] - S.afstand[0]);
    const x = k.x + Math.cos(a) * d;
    const z = k.z + Math.sin(a) * d;
    vorm.bodem(x, z, tmp);
    if (tmp.bos < 0.6 || tmp.weide > 0 || tmp.pad > 0 || Math.hypot(x - L.x, z - L.z) < L.straal + 6) continue;
    if (vorm.weide.dichtbij(x, z)) continue;
    let ruim = true;
    for (let i = 0; i < 8 && ruim; i++) {
      const b = (i / 8) * Math.PI * 2;
      if (!pad.vrij(x + Math.cos(b) * S.vrij, z + Math.sin(b) * S.vrij, 0.3)) ruim = false;
    }
    if (!ruim || !pad.vrij(x, z, 0.8)) continue;
    if (!pad.zoek(k.x, k.z + 3, x, z)) continue;
    return [{ id: 'slaapbloem-0', x, y: grondOp(x, z), z, open: false, openTijd: 0, schat: { gepakt: false } }];
  }
  return [];
}

/** Pakt de schat in een open slaapbloem als de speler er dichtbij genoeg komt. */
export function pakSchat(s, bloemen, S, meld) {
  for (const b of bloemen) {
    if (!b.open || b.schat.gepakt || b.openTijd < S.openDuur * 0.7) continue;
    if (Math.hypot(s.pos[0] - b.x, s.pos[2] - b.z) > S.pakAfstand + S.grootte * 0.4 || Math.abs(s.pos[1] - b.y) > 2) continue;
    b.schat.gepakt = true;
    s.bloesems += S.schatBloesems;
    meld({ soort: 'schat', speler: s.id, bloem: b.id, pos: [b.x, b.y + S.hoogte, b.z], aantal: s.bloesems, erbij: S.schatBloesems });
  }
}
