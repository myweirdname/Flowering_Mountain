// Zwemmen (GD 5, TP 6): drijven aan het wateroppervlak van stil water (de lagune, de baai).
// Traag vooruit, een sprongetje uit het water kan, en waar het ondiep wordt sta je weer.
// Te ver de zee in duwen de golven je zacht terug; nog verder en je staat terug op veilige grond.
import { naarVeiligeGrond } from './veilig.js';

/**
 * @param {import('../wezens/speler.js').Speler} s
 * @param {import('../wezens/speler.js').Intentie} int
 * @param {any} wereld
 * @param {typeof import('../../data/beweging.js').ZWEMMEN} Z
 * @param {number} dt
 * @param {(g: object) => void} meld
 */
export function stapZwemmen(s, int, wereld, Z, dt, meld) {
  let [bx, bz] = int.beweeg;
  const lengte = Math.hypot(bx, bz);
  const kracht = Math.min(1, lengte);
  if (lengte > 1e-3) {
    bx /= lengte;
    bz /= lengte;
  }
  const doel = Z.snelheid * kracht;
  const versn = kracht > 1e-3 ? Z.versnelling : Z.remmen;
  s.vel[0] = naderen(s.vel[0], bx * doel, versn * dt);
  s.vel[2] = naderen(s.vel[2], bz * doel, versn * dt);

  // Golven in de zee: hoe dieper, hoe harder ze je terug naar de kust duwen.
  const terrein = wereld.raster.hoogteOp(s.pos[0], s.pos[2]);
  const peil = wereld.waterOp(s.pos[0], s.pos[2]);
  const diepte = peil - terrein;
  const inLagune = wereld.vorm.bodem(s.pos[0], s.pos[2], bodem).lagune > 0.3;
  if (!inLagune && peil < 0.01 && diepte > Z.golfDiepte) {
    const [gx, gz] = wereld.raster.hellingOp(s.pos[0], s.pos[2]);
    const gl = Math.hypot(gx, gz) || 1;
    const duw = Z.golfDuw * Math.min(1, (diepte - Z.golfDiepte) / 1.5);
    s.vel[0] += (gx / gl) * duw * dt;
    s.vel[2] += (gz / gl) * duw * dt;
    if (diepte > Z.zeeGrens) {
      naarVeiligeGrond(s, meld);
      return;
    }
  }

  // Drijven: zacht naar de drijfhoogte toe (eerst wat wegzakken na een sprong in het water).
  const drijf = peil - Z.drijfDiepte;
  s.vel[1] += ((drijf - s.pos[1]) * Z.drijfVeer - s.vel[1] * Z.drijfDemping) * dt;

  // In de rivier voert de stroming je mee.
  wereld.rivier.stroomOp(s.pos[0], s.pos[2], stroom);
  s.pos[0] += (s.vel[0] + stroom[0] * Z.rivierMee) * dt;
  s.pos[1] += s.vel[1] * dt;
  s.pos[2] += (s.vel[2] + stroom[1] * Z.rivierMee) * dt;

  const gr = wereld.grens;
  if (s.pos[0] < gr.minX || s.pos[0] > gr.maxX) { s.pos[0] = Math.min(Math.max(s.pos[0], gr.minX), gr.maxX); s.vel[0] = 0; }
  if (s.pos[2] < gr.minZ || s.pos[2] > gr.maxZ) { s.pos[2] = Math.min(Math.max(s.pos[2], gr.minZ), gr.maxZ); s.vel[2] = 0; }

  // Een sprongetje uit het water (bv. op een rots of de oever).
  const drukNu = int.spring && !s.springVorige;
  s.springVorige = int.spring;
  if (drukNu) {
    s.modus = 'lopen';
    s.vel[1] = Z.sprong;
    s.pos[1] = Math.max(s.pos[1], drijf);
    s.opGrond = false;
    s.springtVast = false;
    meld({ soort: 'sprong', speler: s.id, uitWater: true });
    return;
  }

  // Ondiep genoeg om te staan: weer lopen.
  const grond = wereld.grondOp(s.pos[0], s.pos[2]);
  if (grond > peil - Z.uitDiepte) {
    s.modus = 'lopen';
    s.pos[1] = Math.max(s.pos[1], grond);
    s.opGrond = s.pos[1] - grond < 0.05;
    meld({ soort: 'uitWater', speler: s.id });
  } else if (s.pos[1] < grond) {
    s.pos[1] = grond;
  }

  if (Math.hypot(s.vel[0], s.vel[2]) > 0.2) {
    const doelHoek = Math.atan2(s.vel[0], s.vel[2]);
    let verschil = doelHoek - s.richting;
    verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
    s.richting += verschil * Math.min(1, Z.draaisnelheid * dt);
  }
}

const bodem = /** @type {any} */ ({});
const stroom = [0, 0];

function naderen(waarde, doel, max) {
  const d = doel - waarde;
  return Math.abs(d) <= max ? doel : waarde + Math.sign(d) * max;
}
