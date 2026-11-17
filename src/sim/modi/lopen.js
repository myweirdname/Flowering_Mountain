// Bewegingsregels te voet (TP 6, GD 5): lopen, rennen, springen, zwaartekracht, afglijden.
// Gewone wiskunde, geen fysica-engine en geen Three.js.

const naarRad = Math.PI / 180;

/**
 * Schuift één speler één tijdstap op.
 * @param {import('../wezens/speler.js').Speler} s
 * @param {import('../wezens/speler.js').Intentie} int
 * @param {{ raster: ReturnType<typeof import('../wereld/tegels.js').maakTegelwereld>,
 *           grens: { minX:number, maxX:number, minZ:number, maxZ:number }, maxDiepte: number,
 *           stammen: (tx:number, tz:number) => { x:number, z:number, r:number }[] }} wereld
 * @param {typeof import('../../data/beweging.js').LOPEN} L
 * @param {number} dt
 * @param {(g: object) => void} meld gebeurtenis doorgeven aan beeld en geluid
 */
export function stapLopen(s, int, wereld, L, dt, meld) {
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

  // Binnen het speelveld blijven.
  const gr = wereld.grens;
  if (s.pos[0] < gr.minX || s.pos[0] > gr.maxX) { s.pos[0] = Math.min(Math.max(s.pos[0], gr.minX), gr.maxX); s.vel[0] = 0; }
  if (s.pos[2] < gr.minZ || s.pos[2] > gr.maxZ) { s.pos[2] = Math.min(Math.max(s.pos[2], gr.minZ), gr.maxZ); s.vel[2] = 0; }

  // Niet dieper het water in dan je kan staan (zwemmen komt later). Langs de waterlijn schuiven mag.
  const diep = -wereld.maxDiepte;
  const r = wereld.raster;
  if (r.hoogteOp(s.pos[0], s.pos[2]) < diep) {
    const ox = s.vorigePos[0];
    const oz = s.vorigePos[2];
    if (r.hoogteOp(s.pos[0], oz) >= diep) { s.pos[2] = oz; s.vel[2] = 0; }
    else if (r.hoogteOp(ox, s.pos[2]) >= diep) { s.pos[0] = ox; s.vel[0] = 0; }
    else { s.pos[0] = ox; s.pos[2] = oz; s.vel[0] = 0; s.vel[2] = 0; }
  }

  // Niet door boomstammen lopen: zachtjes eruit duwen.
  duwUitStammen(s, wereld, L.lijfStraal);

  // --- Grond ---
  const grond = wereld.raster.hoogteOp(s.pos[0], s.pos[2]);
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

  // --- Draaien naar de looprichting ---
  if (Math.hypot(s.vel[0], s.vel[2]) > 0.3 && !glijdt) {
    const doelHoek = Math.atan2(s.vel[0], s.vel[2]);
    let verschil = doelHoek - s.richting;
    verschil = Math.atan2(Math.sin(verschil), Math.cos(verschil));
    s.richting += verschil * Math.min(1, L.draaisnelheid * dt);
  }
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
