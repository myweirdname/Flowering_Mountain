// Bewegingsregels te voet (TP 6, GD 5): lopen, rennen, springen, zwaartekracht, afglijden
// en lage randen (rotsen) vanzelf opklimmen. In diep water ga je over op zwemmen.
import { onthoudVeilig, naarVeiligeGrond } from './veilig.js';
// Gewone wiskunde, geen fysica-engine en geen Three.js.

const naarRad = Math.PI / 180;

/**
 * Schuift één speler één tijdstap op.
 * @param {import('../wezens/speler.js').Speler} s
 * @param {import('../wezens/speler.js').Intentie} int
 * @param {{ raster: ReturnType<typeof import('../wereld/tegels.js').maakTegelwereld>,
 *           grens: { minX:number, maxX:number, minZ:number, maxZ:number }, vorm: any,
 *           stammen: (tx:number, tz:number) => { x:number, z:number, r:number }[],
 *           grondOp: (x:number, z:number) => number }} wereld
 * @param {typeof import('../../data/beweging.js').LOPEN} L
 * @param {number} dt
 * @param {(g: object) => void} meld gebeurtenis doorgeven aan beeld en geluid
 * @param {typeof import('../../data/beweging.js').ZWEMMEN} Z wanneer je begint te zwemmen
 */
export function stapLopen(s, int, wereld, L, dt, meld, Z) {
  if (s.klimt) {
    stapOpklimmen(s, L, dt);
    return;
  }

  // --- Invoer: gewenste horizontale snelheid ---
  let [bx, bz] = int.beweeg;
  const lengte = Math.hypot(bx, bz);
  const kracht = Math.min(1, lengte);
  if (lengte > 1e-3) {
    bx /= lengte;
    bz /= lengte;
  }
  const doel =
    kracht <= L.renDrempel
      ? (L.loopsnelheid * kracht) / L.renDrempel
      : L.loopsnelheid + ((L.rensnelheid - L.loopsnelheid) * (kracht - L.renDrempel)) / (1 - L.renDrempel);

  // --- Helling onder de voeten ---
  const [gx, gz] = wereld.raster.hellingOp(s.pos[0], s.pos[2]);
  const steilte = Math.atan(Math.hypot(gx, gz));
  const glijdt = s.opGrond && steilte > L.maxHelling * naarRad;
  s.glijdt = glijdt;

  // --- Horizontaal versnellen naar het doel ---
  let versn = s.opGrond ? (kracht > 1e-3 ? L.versnellingGrond : L.remmenGrond) : L.versnellingLucht;
  if (glijdt) versn *= L.glijControle;
  s.vel[0] = naderen(s.vel[0], bx * doel, versn * dt);
  s.vel[2] = naderen(s.vel[2], bz * doel, versn * dt);

  if (glijdt) {
    // Bergaf duwen, in de richting waarin het terrein daalt.
    const len = Math.hypot(gx, gz);
    s.vel[0] -= (gx / len) * L.glijVersnelling * dt;
    s.vel[2] -= (gz / len) * L.glijVersnelling * dt;
  }

  // --- Springen: buffer, coyote-tijd, kort of lang ---
  const drukNu = int.spring && !s.springVorige;
  s.springVorige = int.spring;
  s.sprongBuffer = drukNu ? L.sprongBuffer : Math.max(0, s.sprongBuffer - dt);
  s.coyote = s.opGrond && !glijdt ? L.coyoteTijd : Math.max(0, s.coyote - dt);

  if (s.sprongBuffer > 0 && s.coyote > 0) {
    s.vel[1] = L.springSnelheid;
    s.opGrond = false;
    s.coyote = 0;
    s.sprongBuffer = 0;
    s.springtVast = true;
    meld({ soort: 'sprong', speler: s.id });
  }
  // Loslaten tijdens het stijgen maakt er een kleine sprong van.
  if (s.springtVast && !int.spring && s.vel[1] > 0) {
    s.vel[1] *= L.korteSprongFactor;
    s.springtVast = false;
  }
  if (s.vel[1] <= 0) s.springtVast = false;

  // --- Zwaartekracht ---
  if (!s.opGrond) {
    const g = s.vel[1] > 0 ? L.zwaartekracht : L.valZwaartekracht;
    s.vel[1] = Math.max(s.vel[1] - g * dt, -L.maxValsnelheid);
  }

  // --- Verplaatsen ---
  s.pos[0] += s.vel[0] * dt;
  s.pos[1] += s.vel[1] * dt;
  s.pos[2] += s.vel[2] * dt;

  // Binnen het speelveld blijven: alleen de snelheid naar buiten verdwijnt, langs de rand lopen kan.
  const gr = wereld.grens;
  if (s.pos[0] < gr.minX || s.pos[0] > gr.maxX) { s.pos[0] = Math.min(Math.max(s.pos[0], gr.minX), gr.maxX); s.vel[0] = 0; }
  if (s.pos[2] < gr.minZ || s.pos[2] > gr.maxZ) { s.pos[2] = Math.min(Math.max(s.pos[2], gr.minZ), gr.maxZ); s.vel[2] = 0; }

  // Niet door boomstammen lopen: zachtjes eruit duwen.
  duwUitStammen(s, wereld, L.lijfStraal);

  // --- Randen: een lage rand klim je vanzelf op, een hoge houdt je tegen ---
  // Een rand is iets dat in één stap te hoog is, of steiler dan een muurtje (de zijkant van een rots).
  const hoger = wereld.grondOp(s.pos[0], s.pos[2]) - s.pos[1];
  const verplaatst = Math.hypot(s.pos[0] - s.vorigePos[0], s.pos[2] - s.vorigePos[2]);
  if (hoger > L.stapHoogte || (hoger > 0.03 && hoger > verplaatst * L.randSteilte)) {
    const hv = Math.hypot(s.vel[0], s.vel[2]);
    const rand = hv > 0.5 ? randHoogte(s, wereld, L, hv) : hoger;
    if (rand > L.stapHoogte) {
      if (rand <= L.klimHoogte && kracht > 0.2 && hv > 0.5) {
        beginOpklimmen(s, wereld, L, hv);
        meld({ soort: 'opklimmen', speler: s.id });
        return;
      }
      tegenhouden(s, wereld, L);
    }
  }

  // --- Grond ---
  const grond = wereld.grondOp(s.pos[0], s.pos[2]);
  const wasOpGrond = s.opGrond;
  if (s.pos[1] <= grond) {
    if (!wasOpGrond) meld({ soort: 'landing', speler: s.id, snelheid: -s.vel[1] });
    s.pos[1] = grond;
    if (s.vel[1] < 0) s.vel[1] = 0;
    s.opGrond = true;
  } else if (wasOpGrond && s.vel[1] <= 0 && s.pos[1] - grond < L.grondKleef) {
    s.pos[1] = grond; // bergaf blijven plakken in plaats van te huppelen
  } else {
    s.opGrond = false;
  }

  // Diep water: zwemmen (de zee en de lagune liggen op 0, de rivier hoger).
  const peil = wereld.waterOp(s.pos[0], s.pos[2]);
  if (grond < peil - Z.inDiepte && s.pos[1] < peil - Z.drijfDiepte + 0.05) {
    meld({ soort: 'plons', speler: s.id, pos: [s.pos[0], peil, s.pos[2]], snelheid: Math.max(1, -s.vel[1]) });
    s.modus = 'zwemmen';
    s.opGrond = false;
    s.vel[1] *= 0.3;
    return;
  }

  // Laatste veilige grond onthouden; te lang glijden of ver vallen brengt je daar terug.
  onthoudVeilig(s, grond - Math.max(0, peil), dt, L.veiligNa); // in de rivier is het niet veilig
  s.glijTijd = glijdt ? s.glijTijd + dt : 0;
  if (s.glijTijd > L.maxGlijTijd || s.pos[1] < L.terugOnder) {
    naarVeiligeGrond(s, meld);
    return;
  }

  // --- Draaien naar de looprichting ---
  if (Math.hypot(s.vel[0], s.vel[2]) > 0.3 && !glijdt) {
    const doelHoek = Math.atan2(s.vel[0], s.vel[2]);
    let verschil = doelHoek - s.richting;
    verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
    s.richting += verschil * Math.min(1, L.draaisnelheid * dt);
  }
}

const glad = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Hoe hoog de rand voor je is: de grond een eindje verder, ten opzichte van je voeten. */
function randHoogte(s, wereld, L, hv) {
  const nx = s.vorigePos[0] + (s.vel[0] / hv) * L.klimVooruit;
  const nz = s.vorigePos[2] + (s.vel[2] / hv) * L.klimVooruit;
  return Math.max(wereld.grondOp(nx, nz), wereld.grondOp(s.pos[0], s.pos[2])) - s.pos[1];
}

/** Start het opklimmen vanaf de vorige plek naar een plekje net op de rand. */
function beginOpklimmen(s, wereld, L, hv) {
  const dx = s.vel[0] / hv;
  const dz = s.vel[2] / hv;
  const ox = s.vorigePos[0];
  const oz = s.vorigePos[2];
  const nx = ox + dx * L.klimVooruit;
  const nz = oz + dz * L.klimVooruit;
  const top = wereld.grondOp(nx, nz);
  const hoogte = Math.max(0, top - s.pos[1]);
  s.klimt = { t: 0, duur: L.klimTijd * (0.6 + 0.4 * hoogte / L.klimHoogte), van: [ox, s.pos[1], oz], naar: [nx, top, nz], richting: [dx, dz] };
  s.pos[0] = ox;
  s.pos[2] = oz;
  s.vel[0] = s.vel[1] = s.vel[2] = 0;
  s.opGrond = false;
  s.richting = Math.atan2(dx, dz);
}

/** Eerst omhoog trekken, dan erop stappen. */
function stapOpklimmen(s, L, dt) {
  const k = s.klimt;
  k.t += dt;
  const f = k.t / k.duur;
  const boven = k.naar[1] + 0.06;
  if (f < 0.6) {
    s.pos[1] = k.van[1] + (boven - k.van[1]) * glad(f / 0.6);
  } else {
    const g = glad((f - 0.6) / 0.4);
    s.pos[0] = k.van[0] + (k.naar[0] - k.van[0]) * g;
    s.pos[2] = k.van[2] + (k.naar[2] - k.van[2]) * g;
    s.pos[1] = boven + (k.naar[1] - boven) * g;
  }
  if (f >= 1) {
    s.pos = [k.naar[0], k.naar[1], k.naar[2]];
    s.vel = [k.richting[0] * L.loopsnelheid * 0.5, 0, k.richting[1] * L.loopsnelheid * 0.5];
    s.opGrond = true;
    s.klimt = null;
  }
}

/** Te hoge rand: terug, maar langs de rand verder schuiven mag (eerst x alleen, dan z alleen). */
function tegenhouden(s, wereld, L) {
  const [ox, , oz] = s.vorigePos;
  const kan = (x, z) => wereld.grondOp(x, z) - s.pos[1] <= L.stapHoogte;
  if (kan(s.pos[0], oz)) { s.pos[2] = oz; s.vel[2] = 0; }
  else if (kan(ox, s.pos[2])) { s.pos[0] = ox; s.vel[0] = 0; }
  else { s.pos[0] = ox; s.pos[2] = oz; s.vel[0] = 0; s.vel[2] = 0; }
}

function duwUitStammen(s, wereld, straal) {
  const T = wereld.raster.tegelGrootte;
  const tx = Math.floor(s.pos[0] / T);
  const tz = Math.floor(s.pos[2] / T);
  for (let j = tz - 1; j <= tz + 1; j++) {
    for (let i = tx - 1; i <= tx + 1; i++) {
      for (const st of wereld.stammen(i, j)) {
        const dx = s.pos[0] - st.x;
        const dz = s.pos[2] - st.z;
        const min = st.r + straal;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-8) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const nz = dz / d;
        s.pos[0] = st.x + nx * min;
        s.pos[2] = st.z + nz * min;
        // De snelheid naar de stam toe wegnemen, langs de stam glijden mag.
        const v = s.vel[0] * nx + s.vel[2] * nz;
        if (v < 0) { s.vel[0] -= v * nx; s.vel[2] -= v * nz; }
      }
    }
  }
}

function naderen(waarde, doel, max) {
  const d = doel - waarde;
  return Math.abs(d) <= max ? doel : waarde + Math.sign(d) * max;
}
