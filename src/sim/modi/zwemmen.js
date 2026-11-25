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

  // Bij een waterval van de rivier over de berg: je glijdt mee met het vallende water, zoals op een glijbaan,
  // tot in de poel eronder (GD 5: de rivier neemt je mee; dat kost alleen hoogte en tijd).
  const br = wereld.bergrivier;
  if (br && br.inValOp(s.pos[0], s.pos[2], val)) {
    const sp = val.sprong;
    const v = Math.max(3, br.stroom(val.s, val.d));
    const sNa = val.s + v * dt;
    br.puntOp(sNa, val.d * 0.98, pa);
    s.vel[0] = (pa[0] - s.pos[0]) / dt;
    s.vel[2] = (pa[1] - s.pos[2]) / dt;
    s.pos[0] = pa[0];
    s.pos[2] = pa[1];
    const y = br.peil(Math.min(sNa, sp.s + sp.lengte - 0.01)) - Z.drijfDiepte;
    s.vel[1] = (y - s.pos[1]) / dt;
    s.pos[1] = y;
    if (!s.glijdtVal) meld({ soort: 'meegevoerd', speler: s.id, pos: [...s.pos], groot: !!sp.groot });
    s.glijdtVal = true;
    s.richting = br.richtingOp(val.s);
    return;
  }
  s.glijdtVal = false;

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

  // In de rivier voert de stroming je mee (GD 5). In rustig water spoel je zacht aan bij de dichtste oever.
  wereld.stroomOp(s.pos[0], s.pos[2], stroom);
  const sv = Math.hypot(stroom[0], stroom[1]);
  if (peil > 0.01 && wereld.rivieren && sv < Z.aanspoelStroom) {
    for (const r of wereld.rivieren) {
      if (!r.naar(s.pos[0], s.pos[2], rq) || Math.abs(rq.d) > r.breedte(rq.s) + 0.4) continue;
      const zij = rq.d >= 0 ? 1 : -1;
      r.puntOp(rq.s, rq.d, pa);
      r.puntOp(rq.s, rq.d + zij, pb);
      const k = Z.aanspoel * (1 - sv / Z.aanspoelStroom);
      s.pos[0] += (pb[0] - pa[0]) * k * dt;
      s.pos[2] += (pb[1] - pa[1]) * k * dt;
      break;
    }
  }
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
    // Aangespoeld uit de rivier: hier ben je weer veilig (ook al ligt het lager dan waar je erin viel).
    if (peil > 0.01) s.veilig = [s.pos[0], Math.max(s.pos[1], grond), s.pos[2]];
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
const rq = { s: 0, d: 0 };
const val = { s: 0, d: 0, sprong: null };
const pa = [0, 0];
const pb = [0, 0];

function naderen(waarde, doel, max) {
  const d = doel - waarde;
  return Math.abs(d) <= max ? doel : waarde + Math.sign(d) * max;
}
