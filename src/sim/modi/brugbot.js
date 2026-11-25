// De brugbot (stap 14b, TP 9): loopt of rijdt met de echte spelregels over het bruggetje in het laagland, van
// het ene uiteinde naar het andere. Hij duwt onderweg ook even opzij tegen de leuning (die moet je op de brug
// houden). Voor test.html. Geen Three.js.
import { legeIntentie } from '../wezens/speler.js';

/**
 * @param {ReturnType<typeof import('../spel.js').maakSim>} sim
 * @param {{ id?: string, kant?: number, pony?: boolean, maxTijd?: number }} [o]
 *   kant: van welk uiteinde (0 of 1); pony: op de pony erover
 * @returns {{ uitkomst: 'over'|'te traag'|'nat'|'geen brug', tijd: number, opzij: number }}
 *   opzij: hoe ver de bot (of de pony) het verst van het midden van de brug kwam
 */
export function brugProef(sim, o = {}) {
  const id = o.id ?? 'speler1';
  const br = sim.wereld.bergrivier.brug;
  if (!br) return { uitkomst: 'geen brug', tijd: 0, opzij: 0 };
  const kant = o.kant ?? 0;
  const maxTijd = o.maxTijd ?? 30;
  const [ax, az] = br.ingangen[kant];
  const [bx, bz] = br.ingangen[1 - kant];
  const ux = (bx - ax) / (2 * br.halfL);
  const uz = (bz - az) / (2 * br.halfL);
  // Begin 3 m voor de brug, met je neus ernaartoe.
  const s = sim.speler(id);
  if (s.modus !== 'lopen') sim.terug(id);
  sim.rijd(id, false);
  const x0 = ax - ux * 3;
  const z0 = az - uz * 3;
  const y0 = sim.wereld.grondOp(x0, z0);
  Object.assign(s, { pos: [x0, y0, z0], vorigePos: [x0, y0, z0], vel: [0, 0, 0], opGrond: true, klimt: null, veilig: [x0, y0, z0] });
  s.richting = s.vorigeRichting = Math.atan2(ux, uz);
  if (o.pony) {
    sim.zetPony(id, x0, z0, s.richting);
    sim.rijd(id, true);
  }
  sim.neemGebeurtenissen();
  const wie = () => (o.pony ? sim.pony(id) : s);
  // De weg: het begin, het midden (met een duw opzij tegen de leuning), het einde en een stukje verder.
  const doelen = [[ax, az, 0], [br.x, br.z, 1], [bx + ux * 3, bz + uz * 3, 0]];
  const dt = 1 / 60;
  let t = 0;
  let opzij = 0;
  let duw = 0;
  while (t < maxTijd) {
    const w = wie();
    const [dx, dz, zij] = doelen[0];
    const vx = dx - w.pos[0];
    const vz = dz - w.pos[2];
    const d = Math.hypot(vx, vz);
    const int = legeIntentie();
    if (d < 1.6) {
      if (zij && duw < 1.2) {
        // Midden op de brug: even recht opzij tegen de leuning duwen.
        duw += dt;
        int.beweeg = [-br.az, br.ax];
      } else {
        doelen.shift();
        if (!doelen.length) return { uitkomst: 'over', tijd: t, opzij };
      }
    } else int.beweeg = [(vx / d) * 0.8, (vz / d) * 0.8];
    sim.stap({ [id]: int }, dt);
    t += dt;
    const ww = wie();
    const lx = ww.pos[0] - br.x;
    const lz = ww.pos[2] - br.z;
    if (Math.abs(lx * br.ax + lz * br.az) < br.halfL - 0.5) opzij = Math.max(opzij, Math.abs(-lx * br.az + lz * br.ax));
    if (sim.speler(id).modus === 'zwemmen' || (o.pony && sim.pony(id).zwemt)) return { uitkomst: 'nat', tijd: t, opzij };
  }
  return { uitkomst: 'te traag', tijd: t, opzij };
}
