// De vaarbot (stap 14, TP 9): vaart met de echte spelregels van een steiger tot in de lagune.
// Hij zoekt de goede lijn (weg van de rotsen die eraan komen), kiest in de splitsing een arm en peddelt zacht mee.
// Voor test.html en de console (spel.vaarBot). Geen Three.js.
import { legeIntentie } from '../wezens/speler.js';

/**
 * @param {ReturnType<typeof import('../spel.js').maakSim>} sim
 * @param {string} steiger 'bron' (de benedenrivier) of 'top', 'etage', 'laag' (de bergrivier)
 * @param {{ id?: string, maxTijd?: number, arm?: number, peddel?: number }} [o]
 *   arm: in de splitsing de wilde (1) of de rustige (-1) arm; peddel: hoe hard vooruit (0..1)
 */
export function vaarProef(sim, steiger, o = {}) {
  const id = o.id ?? 'speler1';
  const maxTijd = o.maxTijd ?? 240;
  const peddel = o.peddel ?? 0.35;
  sim.vaar(id, steiger);
  sim.neemGebeurtenissen();
  const v = sim.vlot(id);
  const rivieren = sim.wereld.rivieren;
  const dt = 1 / 60;
  const uit = { steiger, uitkomst: 'te traag', tijd: 0, sprongen: 0, groteSprong: 0, botsingen: 0, kolk: 0, overgang: 0, klassen: new Set() };
  let t = 0;
  let besteS = -Infinity;
  let besteTak = v.tak;
  let stil = 0;
  while (t < maxTijd) {
    const r = rivieren[v.tak];
    const int = legeIntentie();
    let px = 0;
    let py = peddel;
    if (v.plek === 'vaart') {
      uit.klassen.add(r.klasseOp(v.s));
      const b = r.breedte(v.s + 3);
      // De arm van de splitsing: het midden van de gekozen arm.
      let voorkeur = 0;
      const sp = r.split;
      if (sp && v.s > sp.van - 10 && v.s < sp.tot) {
        const zij = o.arm ?? sp.wilde;
        const eil = r.eilandOp((sp.van + sp.tot) / 2);
        voorkeur = zij * (eil + (r.breedte((sp.van + sp.tot) / 2) - eil) / 2);
      }
      // Kies de d met de minste kosten: ver van de rotsen die eraan komen, dicht bij de voorkeur.
      let beste = 0;
      let bk = Infinity;
      const lim = Math.max(0.2, b - 1.2);
      for (let d = -lim; d <= lim + 1e-6; d += 0.25) {
        let k = Math.abs(d - voorkeur) * 0.4 + Math.abs(d - v.d) * 0.15;
        for (const rots of r.rotsen) {
          const ds = rots.s - v.s;
          if (ds < -1 || ds > 9) continue;
          const vrij = Math.abs(d - rots.d) - rots.r - 1.25;
          if (vrij < 0) k += 10 - vrij * 4;
        }
        const eil = r.eilandOp(v.s + 2);
        if (eil > 0 && Math.abs(d) < eil + 1.2) k += 20;
        if (k < bk) {
          bk = k;
          beste = d;
        }
      }
      px = Math.max(-1, Math.min(1, (beste - v.d) * 0.9 - v.vd * 0.5));
      if (v.inKolk > 0) py = 1;
    } else if (v.plek === 'lagune') {
      uit.uitkomst = 'lagune';
      break;
    }
    int.peddel = [px, py];
    sim.stap({ [id]: int }, dt);
    for (const g of sim.neemGebeurtenissen()) {
      if (g.soort === 'vlotSprong') {
        uit.sprongen++;
        if (g.groot) uit.groteSprong++;
      } else if (g.soort === 'vlotBots') uit.botsingen++;
      else if (g.soort === 'vlotKolk') uit.kolk++;
      else if (g.soort === 'vlotTak') uit.overgang++;
    }
    t += dt;
    // Vast? Komt hij 10 s lang niet verder, dan geeft hij het op.
    if (v.tak !== besteTak || v.s > besteS + 0.5) {
      besteS = v.s;
      besteTak = v.tak;
      stil = 0;
    } else if ((stil += dt) > 10) {
      uit.uitkomst = 'vast';
      break;
    }
  }
  uit.tijd = Math.round(t * 10) / 10;
  uit.klassen = [...uit.klassen].sort().reverse();
  sim.terug(id);
  return uit;
}
