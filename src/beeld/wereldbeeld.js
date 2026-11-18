// Het tegelsysteem in het beeld (TP 5.4, 7):
// - grof landschap voor de verte, fijne terreintegels rond de speler (gespreid geladen, geen haperingen);
// - elke plantsoort is één tekenopdracht (instancing), met per afstand een rijkere of eenvoudigere vorm;
// - bomen ver weg worden kruinbollen; struiken, bloemen en gras staan alleen dichtbij;
// - wat ver achter de camera staat, wordt niet getekend.
import * as THREE from 'three';
import { WERELD } from '../data/wereld.js';
import { FLORA } from '../data/flora.js';
import { maakWillekeur } from '../kern/willekeur.js';
import { maakGrondkleur, maakTegelTerrein, maakGrofTerrein } from './terrein.js';
import { maakPlantMateriaal } from './wind.js';
import { maakBladplant } from './maak/blad.js';
import { maakBloemplant } from './maak/bloem.js';
import { maakPalm } from './maak/palm.js';
import { maakBoom } from './maak/boom.js';
import { maakGras, maakRots } from './maak/klein.js';

/**
 * @param {THREE.Scene} scene
 * @param {ReturnType<typeof import('../sim/spel.js').maakSim>} sim
 * @param {typeof import('../data/kwaliteit.js').KWALITEIT.laag} K
 */
export function maakWereldbeeld(scene, sim, K) {
  const T = WERELD.tegelGrootte;
  const vorm = sim.wereld.vorm;
  const begroeiing = sim.wereld.begroeiing;
  const flora = begroeiing.flora;
  const d = K.detail;
  // Zo ver tekenen we bomen: net voor het einde van de mist zijn ze al bijna onzichtbaar (en groeien ze daar weg).
  const verStraal = K.mist[1] - 10;

  // --- Terrein ---
  const grondMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const kleurOp = maakGrondkleur(vorm, WERELD.kleuren);
  const grof = maakGrofTerrein(vorm, WERELD, kleurOp, grondMat);
  grof.mesh.receiveShadow = K.schaduw;
  scene.add(grof.mesh);

  // --- Plantsoorten ---
  // Elke fijnheid van dezelfde soort krijgt een verse reeks met hetzelfde zaadje: zelfde vorm, andere fijnheid.
  const toeval = (k) => maakWillekeur(flora.vormZaad + k).getal;
  const gewoon = { gloed: 0x0c160c };
  const bloemMat = { gloed: 0x2a1f24 };
  const rotsMat = { gloed: 0x000000 };
  const kl = new THREE.Color();

  /**
   * @typedef {{ geo: THREE.BufferGeometry, straal: number, mat: any, schaduw?: boolean,
   *             mesh?: THREE.InstancedMesh, cap?: number }} Band
   * @typedef {{ naam: string, bron: 'boom'|'palm'|'rots'|'struik'|'bloem'|'gras', laag: 'grote'|'kleine',
   *             filter: (p: any) => boolean, schaal: (p: any) => number, kleur: (p: any, c: THREE.Color) => void,
   *             zak?: number, banden: Band[] }} Soort
   */
  /** @type {Soort[]} */
  const soorten = [];
  const wit = (p, c) => c.setRGB(1, 1, 1);

  soorten.push({
    naam: 'boom', bron: 'boom', laag: 'grote', filter: () => true, schaal: (p) => p.schaal, zak: 0.2,
    kleur: (p, c) => c.setRGB(0.9 + 0.1 * p.tint, 1, 0.92 + 0.08 * (1 - p.tint)),
    banden: [
      { geo: maakBoom(FLORA.boom, flora.kruinKleuren, d, toeval(1)), straal: K.dichtbij, mat: gewoon, schaduw: true },
      { geo: maakBoom(FLORA.boom, flora.kruinKleuren, -1, toeval(1)), straal: K.middenStraal, mat: gewoon },
      { geo: maakBoom(FLORA.boom, flora.kruinKleuren, -2, toeval(1)), straal: verStraal, mat: gewoon },
    ],
  });
  soorten.push({
    naam: 'palm', bron: 'palm', laag: 'grote', filter: () => true, schaal: (p) => p.schaal, zak: 0.1,
    kleur: (p, c) => c.setRGB(0.93 + 0.07 * p.tint, 1, 0.94),
    banden: [
      { geo: maakPalm(FLORA.palm, d, toeval(2)), straal: K.dichtbij, mat: gewoon, schaduw: true },
      { geo: maakPalm(FLORA.palm, -1, toeval(2)), straal: verStraal, mat: gewoon },
    ],
  });
  soorten.push({
    naam: 'rots', bron: 'rots', laag: 'grote', filter: () => true, zak: 0,
    schaal: (p) => FLORA.rots.grootte[0] + p.schaal * (FLORA.rots.grootte[1] - FLORA.rots.grootte[0]),
    kleur: (p, c) => c.set(FLORA.rots.kleuren[Math.floor(p.tint * FLORA.rots.kleuren.length) % FLORA.rots.kleuren.length]),
    banden: [{ geo: maakRots(d), straal: Math.min(K.tegelStraal, 70), mat: rotsMat, schaduw: true }],
  });
  flora.struikNamen.forEach((naam, i) => {
    const P = FLORA.bladplanten[naam];
    const mat = P.gaten ? { gaten: P.gaten, gloed: 0x0c160c } : gewoon;
    soorten.push({
      naam, bron: 'struik', laag: 'kleine', filter: (p) => p.soort === i && p.kans < K.struiken, zak: 0.05,
      schaal: (p) => P.grootte[0] + p.schaal * (P.grootte[1] - P.grootte[0]),
      kleur: (p, c) => c.setScalar(0.88 + 0.12 * p.tint),
      banden: d
        ? [
            { geo: maakBladplant(P, 1, toeval(10 + i)), straal: K.dichtbijKlein, mat },
            { geo: maakBladplant(P, 0, toeval(10 + i)), straal: K.struikStraal, mat },
          ]
        : [{ geo: maakBladplant(P, 0, toeval(10 + i)), straal: K.struikStraal, mat }],
    });
  });
  flora.bloemen.forEach((gen, i) => {
    soorten.push({
      naam: 'bloem' + i, bron: 'bloem', laag: 'kleine', filter: (p) => p.soort === i && p.kans < K.bloemen, zak: 0.02,
      schaal: (p) => 0.85 + 0.4 * p.schaal, kleur: wit,
      banden: d
        ? [
            { geo: maakBloemplant(gen, FLORA, 1, maakWillekeur(gen.zaad).getal), straal: K.dichtbijKlein, mat: bloemMat },
            { geo: maakBloemplant(gen, FLORA, 0, maakWillekeur(gen.zaad).getal), straal: K.bloemStraal, mat: bloemMat },
          ]
        : [{ geo: maakBloemplant(gen, FLORA, 0, maakWillekeur(gen.zaad).getal), straal: K.bloemStraal, mat: bloemMat }],
    });
  });
  soorten.push({
    naam: 'gras', bron: 'gras', laag: 'kleine', filter: (p) => p.kans < K.gras, zak: 0.02,
    schaal: (p) => 0.7 + 0.6 * p.schaal, kleur: (p, c) => c.setRGB(0.88 + 0.12 * p.tint, 1, 0.9),
    banden: [{ geo: maakGras(FLORA.gras, d), straal: K.grasStraal, mat: gewoon }],
  });

  // Elke band krijgt een eigen materiaal (dezelfde shader, dus geen extra werk), zodat de laatste band
  // van elke soort aan zijn buitenrand kan laten ingroeien. Tussen twee banden wisselt alleen de vorm.
  for (const s of soorten) {
    s.banden.forEach((b, i) => {
      const laatste = i === s.banden.length - 1;
      b.mat = maakPlantMateriaal({ ...b.mat, rand: laatste ? [b.straal - K.ingroeien, b.straal] : undefined });
      b.cap = 0;
      maakBandMesh(b, 64);
    });
  }

  function maakBandMesh(b, cap) {
    if (b.mesh) {
      scene.remove(b.mesh);
      b.mesh.dispose();
    }
    b.cap = cap;
    b.mesh = new THREE.InstancedMesh(b.geo, b.mat, cap);
    b.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    b.mesh.count = 0;
    b.mesh.frustumCulled = false;
    b.mesh.castShadow = K.schaduw && !!b.schaduw;
    b.mesh.receiveShadow = K.schaduw;
    scene.add(b.mesh);
  }

  // --- Tegels ---
  /** @typedef {{ tx:number, tz:number, terrein?: THREE.Mesh, stap: number, inst: Map<string, { m: Float32Array, c: Float32Array, n: number }> }} Tegel */
  /** @type {Map<number, Tegel>} */
  const tegels = new Map();
  const sleutel = (tx, tz) => (tx + 4096) * 8192 + (tz + 4096);
  const half = WERELD.verGebied;
  const minT = Math.floor(-half / T);
  const maxT = Math.floor((half - 1) / T);

  function tegel(tx, tz) {
    const k = sleutel(tx, tz);
    let t = tegels.get(k);
    if (!t) {
      t = { tx, tz, stap: 0, lod: 0, lodNodig: 1, inst: new Map() };
      tegels.set(k, t);
    }
    return t;
  }

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const as = new THREE.Vector3(0, 1, 0);
  const plek = new THREE.Vector3();
  const sch = new THREE.Vector3();

  /** De instance-gegevens van soort s in tegel t (één keer berekend, daarna bewaard). */
  function instData(t, s) {
    let data = t.inst.get(s.naam);
    if (data) return data;
    const lagen = s.laag === 'grote' ? begroeiing.grote(t.tx, t.tz) : begroeiing.kleine(t.tx, t.tz);
    const lijst = lagen[s.bron].filter(s.filter);
    const m = new Float32Array(lijst.length * 16);
    const c = new Float32Array(lijst.length * 3);
    lijst.forEach((p, i) => {
      quat.setFromAxisAngle(as, p.draai);
      const f = s.schaal(p);
      mat4.compose(plek.set(p.x, p.y - (s.zak ?? 0) * f, p.z), quat, sch.set(f, f, f));
      mat4.toArray(m, i * 16);
      s.kleur(p, kl);
      c[i * 3] = kl.r;
      c[i * 3 + 1] = kl.g;
      c[i * 3 + 2] = kl.b;
    });
    data = { m, c, n: lijst.length };
    t.inst.set(s.naam, data);
    return data;
  }

  /** Afstand van (x, z) tot het verste punt van tegel (tx, tz). */
  function verste(tx, tz, x, z) {
    return Math.hypot(Math.max(Math.abs(x - tx * T), Math.abs(x - (tx + 1) * T)), Math.max(Math.abs(z - tz * T), Math.abs(z - (tz + 1) * T)));
  }

  /** Afstand van (x, z) tot de dichtstbijzijnde rand van tegel (tx, tz). */
  function afstand(tx, tz, x, z) {
    const dx = Math.max(tx * T - x, 0, x - (tx + 1) * T);
    const dz = Math.max(tz * T - z, 0, z - (tz + 1) * T);
    return Math.hypot(dx, dz);
  }

  // --- Bijwerken, elk beeld ---
  let laatsteTegelX = 1e9;
  let laatsteTegelZ = 1e9;
  let laatsteHoek = 1e9;
  let laatsteX = 1e9;
  let laatsteZ = 1e9;
  let moetHerbouwen = true;
  /** @type {Tegel[]} */
  let wachtrij = [];
  const metTerrein = new Set(); // tegels met fijn terrein (daar laat het grove vlak zijn cellen weg)
  const voor = new THREE.Vector3();
  const stats = { tegels: 0, wachtrij: 0, instanties: 0 };
  const kleineSoorten = soorten.filter((s) => s.laag === 'kleine');

  /**
   * Een tegel klaarmaken gaat in kleine stappen, zodat één beeld nooit te lang duurt:
   * 0 → hoogteraster (simulatie), 1 → terrein tekenen, 2 → kleine planten plaatsen. Na stap 2 is hij klaar.
   * @returns {boolean} true als het terrein net verscheen
   */
  function werkAanTegel(t) {
    if (t.stap === 0) {
      sim.wereld.raster.tegel(t.tx, t.tz);
      t.stap = 1;
    } else if (t.stap === 1 || t.lod !== t.lodNodig) {
      // Terrein (opnieuw) tekenen, fijn of grof naargelang de afstand.
      if (t.terrein) {
        scene.remove(t.terrein);
        t.terrein.geometry.dispose();
      }
      t.terrein = maakTegelTerrein(sim.wereld.raster.tegel(t.tx, t.tz), vorm.hoogte, kleurOp, grondMat, t.lodNodig);
      t.terrein.receiveShadow = K.schaduw;
      t.lod = t.lodNodig;
      scene.add(t.terrein);
      metTerrein.add(sleutel(t.tx, t.tz));
      if (t.stap === 1) t.stap = 2;
    } else if (t.stap === 2) {
      for (const s of kleineSoorten) instData(t, s);
      t.stap = 3;
    }
  }
  const tegelKlaar = (t) => t.stap >= 3 && t.lod === t.lodNodig;

  function geefTerreinVrij(t) {
    if (t.terrein) {
      scene.remove(t.terrein);
      t.terrein.geometry.dispose();
      t.terrein = undefined;
    }
    t.stap = 0;
    t.lod = 0;
    metTerrein.delete(sleutel(t.tx, t.tz));
    // Kleine planten van verre tegels vergeten (die komen terug als je weer dichtbij bent).
    for (const s of kleineSoorten) t.inst.delete(s.naam);
  }

  function herbouw(x, z, camera) {
    camera.getWorldDirection(voor);
    voor.y = 0;
    voor.normalize();
    // Halve horizontale kijkhoek, plus speling omdat pas na wat draaien opnieuw gebouwd wordt.
    const halfZicht = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect) + 0.4;
    let totaal = 0;
    for (const s of soorten) {
      for (let bi = 0; bi < s.banden.length; bi++) {
        const b = s.banden[bi];
        const binnen = bi === 0 ? 0 : s.banden[bi - 1].straal;
        // Welke tegels horen bij deze band?
        const lijst = [];
        let n = 0;
        const r = Math.ceil(b.straal / T) + 1;
        const cx = Math.floor(x / T);
        const cz = Math.floor(z / T);
        for (let tz = cz - r; tz <= cz + r; tz++) {
          for (let tx = cx - r; tx <= cx + r; tx++) {
            if (tx < minT || tx > maxT || tz < minT || tz > maxT) continue;
            const a = afstand(tx, tz, x, z);
            // Tegel helemaal buiten deze band? (dichtste punt te ver, of verste punt nog te dichtbij)
            if (a >= b.straal || verste(tx, tz, x, z) < binnen) continue;
            if (s.laag === 'kleine' && !(tegels.get(sleutel(tx, tz))?.stap >= 3)) continue;
            // Buiten beeld (naast of achter de camera): overslaan. Gemeten vanaf de camera zelf.
            if (a > 12) {
              const mx = (tx + 0.5) * T - camera.position.x;
              const mz = (tz + 0.5) * T - camera.position.z;
              const l = Math.hypot(mx, mz);
              // Een tegel waar de camera (bijna) in staat, wordt altijd getekend.
              if (l > T) {
                const hoek = Math.acos(Math.min(1, Math.max(-1, (mx * voor.x + mz * voor.z) / l)));
                if (hoek - Math.atan((T * 0.71) / l) > halfZicht) continue;
              }
            }
            const data = instData(tegel(tx, tz), s);
            if (data.n === 0) continue;
            lijst.push(data);
            n += data.n;
          }
        }
        if (n > b.cap) maakBandMesh(b, Math.ceil(n * 1.3));
        const mesh = b.mesh;
        const mArr = mesh.instanceMatrix.array;
        const cArr = mesh.instanceColor.array;
        const b2 = b.straal * b.straal;
        const i2 = binnen * binnen;
        let o = 0;
        for (const data of lijst) {
          // Per plant de afstand bekijken: zo krijgt alleen wat echt dichtbij staat de rijke vorm.
          for (let i = 0; i < data.n; i++) {
            const dx = data.m[i * 16 + 12] - x;
            const dz = data.m[i * 16 + 14] - z;
            const a2 = dx * dx + dz * dz;
            if (a2 >= b2 || a2 < i2) continue;
            mArr.set(data.m.subarray(i * 16, i * 16 + 16), o * 16);
            cArr.set(data.c.subarray(i * 3, i * 3 + 3), o * 3);
            o++;
          }
        }
        n = o;
        mesh.count = n;
        // Alleen het gebruikte stuk naar de grafische kaart sturen.
        mesh.instanceMatrix.clearUpdateRanges();
        mesh.instanceMatrix.addUpdateRange(0, n * 16);
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.clearUpdateRanges();
        mesh.instanceColor.addUpdateRange(0, n * 3);
        mesh.instanceColor.needsUpdate = true;
        totaal += n;
      }
    }
    stats.instanties = totaal;
  }

  return {
    stats,
    soorten,
    /**
     * @param {number} x @param {number} z waar de speler is
     * @param {THREE.Camera} camera
     * @param {boolean} alles alles meteen laden (bij de start)
     */
    werkBij(x, z, camera, alles = false) {
      const tx = Math.floor(x / T);
      const tz = Math.floor(z / T);
      if (tx !== laatsteTegelX || tz !== laatsteTegelZ || alles) {
        laatsteTegelX = tx;
        laatsteTegelZ = tz;
        // Tegels vrijgeven die te ver zijn (met wat speling, zodat ze niet heen en weer springen).
        for (const t of tegels.values()) {
          if (t.stap > 0 && afstand(t.tx, t.tz, x, z) > K.tegelStraal + 16) geefTerreinVrij(t);
        }
        // Nieuwe tegels in de wachtrij, de dichtste eerst.
        const r = Math.ceil(K.tegelStraal / T) + 1;
        const nieuw = [];
        for (let j = tz - r; j <= tz + r; j++) {
          for (let i = tx - r; i <= tx + r; i++) {
            if (i < minT || i > maxT || j < minT || j > maxT) continue;
            const a = afstand(i, j, x, z);
            if (a >= K.tegelStraal) continue;
            const t = tegel(i, j);
            t.lodNodig = a < K.fijnStraal ? 1 : 2;
            if (!tegelKlaar(t)) nieuw.push([a, t]);
          }
        }
        nieuw.sort((p, q) => p[0] - q[0]);
        wachtrij = nieuw.map((p) => p[1]);
        moetHerbouwen = true;
      }
      // Gespreid laden: kleine stappen tot het tijdsbudget van dit beeld op is (altijd minstens één).
      let terreinVeranderd = false;
      let plantenKlaar = false;
      const begin = performance.now();
      while (wachtrij.length && (alles || performance.now() - begin < K.bouwBudget)) {
        const t = wachtrij[0];
        if (t.stap >= 1) terreinVeranderd = true;
        werkAanTegel(t);
        if (tegelKlaar(t)) {
          wachtrij.shift();
          plantenKlaar = true;
        }
      }
      if (terreinVeranderd || alles) {
        // Speling van 40 m: het grove vlak wordt pas bij een nieuwe tegel opnieuw bijgesneden.
        grof.verberg((i, j) => metTerrein.has(sleutel(i, j)), x, z, K.mist[1] + 40);
      }
      if (plantenKlaar) moetHerbouwen = true;
      // Ook herbouwen als de camera ver genoeg gedraaid is.
      camera.getWorldDirection(voor);
      const hoek = Math.atan2(voor.x, voor.z);
      let dh = hoek - laatsteHoek;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      if (Math.abs(dh) > 0.2) moetHerbouwen = true;
      // En als je een paar meter verder bent (de afstandsbanden schuiven mee).
      if (Math.hypot(x - laatsteX, z - laatsteZ) > 4) moetHerbouwen = true;
      if (moetHerbouwen) {
        laatsteHoek = hoek;
        laatsteX = x;
        laatsteZ = z;
        herbouw(x, z, camera);
        moetHerbouwen = false;
      }
      stats.tegels = metTerrein.size;
      stats.wachtrij = wachtrij.length;
    },
  };
}
