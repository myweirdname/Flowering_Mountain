// Start van het spel: koppelt simulatie, invoer en beeld aan elkaar.
import * as THREE from 'three';
import { INSTELLINGEN } from './kern/instellingen.js';
import { maakSpellus } from './kern/spellus.js';
import { SCENE } from './data/scene.js';
import { WERELD } from './data/wereld.js';
import { FLORA } from './data/flora.js';
import { KWALITEIT } from './data/kwaliteit.js';
import { LOPEN } from './data/beweging.js';
import { CAMERA } from './data/camera.js';
import { TESTFIGUUR } from './data/figuur.js';
import { maakSim } from './sim/spel.js';
import { maakToetsenbord } from './invoer/toetsenbord.js';
import { naarIntentie, voegSamen } from './invoer/intentie.js';
import { maakTouch, isTouchToestel } from './invoer/touch.js';
import { maakScherm } from './ui/scherm.js';
import { maakToetshulp } from './ui/toetshulp.js';
import { maakTestfiguur } from './beeld/maak/testfiguur.js';
import { maakVolgcamera } from './beeld/volgcamera.js';
import { maakHibiscus } from './beeld/maak/hibiscus.js';
import { maakHemel } from './beeld/hemel.js';
import { maakZee } from './beeld/water.js';
import { maakVerreBerg } from './beeld/maak/berg.js';
import { maakLichtstralen, maakStuifmeel } from './beeld/sfeer.js';
import { maakWereldbeeld } from './beeld/wereldbeeld.js';
import { WIND } from './beeld/wind.js';
import { maakDebugscherm } from './ui/debug.js';

const K = KWALITEIT[INSTELLINGEN.kwaliteit];

// --- Simulatie ---
const sim = maakSim(INSTELLINGEN.berg);
const LOKAAL = 'speler1'; // de speler op dit toestel; later kunnen er meer bij
sim.voegSpelerToe(LOKAAL);
const raster = sim.wereld.raster;

// --- Beeld ---
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('spelbeeld'));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: K.antialias, powerPreference: 'high-performance' });
renderer.setClearColor(SCENE.hemel.horizon);
if (K.schaduw) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(SCENE.hemel.horizon, K.mist[0], K.mist[1]);
const camera = new THREE.PerspectiveCamera(CAMERA.beeldhoek, 1, 0.15, 1500);

scene.add(new THREE.HemisphereLight(SCENE.hemelLicht, SCENE.grondLicht, SCENE.hemelLichtSterkte));
const lichtRichting = new THREE.Vector3(...SCENE.lichtRichting).normalize();
const zonlicht = new THREE.DirectionalLight(SCENE.zonkleur, SCENE.zonsterkte);
zonlicht.position.copy(lichtRichting);
scene.add(zonlicht, zonlicht.target);
if (K.schaduw) {
  // Eén echte schaduwkaart rond de speler (alleen op hoog, TP 5.7).
  zonlicht.castShadow = true;
  zonlicht.shadow.mapSize.set(2048, 2048);
  const c = zonlicht.shadow.camera;
  c.left = c.bottom = -34;
  c.right = c.top = 34;
  c.near = 1;
  c.far = 140;
  zonlicht.shadow.bias = -0.0006;
  zonlicht.shadow.normalBias = 0.04;
  zonlicht.shadow.intensity = SCENE.schaduwSterkte; // zachte schaduw: kawaii, nooit grauw
}

// Hemel, zon, wolken en de verre berg.
const zonRichting = new THREE.Vector3(...SCENE.zon.richting).normalize();
const hemel = maakHemel(SCENE, zonRichting, K.detail);
scene.add(hemel.koepel, hemel.zon, hemel.wolken);
const verreBerg = maakVerreBerg(WERELD.verreBerg, SCENE.hemel.horizon);
scene.add(verreBerg.berg, verreBerg.gloed);

// Het landschap en de jungle, in tegels rond de speler.
const wereldbeeld = maakWereldbeeld(scene, sim, K);
const zee = maakZee(sim.wereld.vorm.hoogte, SCENE, zonRichting, K.detail === 0);
scene.add(zee.vlak);
const stralen = K.lichtstralen ? maakLichtstralen(sim.wereld.vorm, SCENE.lichtstralen, lichtRichting) : null;
if (stralen) scene.add(stralen.mesh);
const stuifmeel = maakStuifmeel(K.stuifmeel, SCENE.stuifmeel);
scene.add(stuifmeel.punten);

const { figuur, lijf, schaduw, basisSchaal } = maakTestfiguur(TESTFIGUUR);
scene.add(figuur, schaduw);
if (K.schaduw) {
  figuur.traverse((o) => (o.castShadow = true));
  schaduw.visible = false; // de echte schaduw neemt het over
}

// Een grote hibiscus als herkenningspunt op de open plek, op een gebogen steel (kinderwens uit stap 1).
const H = SCENE.hibiscus;
const [bx, bz] = H.plek;
const bloemGrond = raster.hoogteOp(bx, bz);
const steel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.13, H.steelHoogte, 10),
  new THREE.MeshLambertMaterial({ color: H.steelKleur })
);
steel.position.set(bx, bloemGrond + H.steelHoogte / 2, bz);
steel.castShadow = K.schaduw;
scene.add(steel);
const bloem = new THREE.Group();
const draaier = new THREE.Group();
draaier.add(maakHibiscus(H));
draaier.rotation.x = 0.8; // naar de camera gekanteld, zodat je in de bloem kijkt
bloem.add(draaier);
const bloemY = bloemGrond + H.steelHoogte;
bloem.position.set(bx, bloemY, bz);
scene.add(bloem);

const volgcamera = maakVolgcamera(camera, canvas, (x, z) => Math.max(raster.hoogteOp(x, z), 0.1));
const toetsenbord = maakToetsenbord();
const uiLaag = /** @type {HTMLElement} */ (document.getElementById('ui'));
const touch = maakTouch(canvas, uiLaag, volgcamera);
maakScherm(uiLaag, { touch: isTouchToestel() });
if (!isTouchToestel()) maakToetshulp(uiLaag);

let pixel = 1;
function pasGrootteAan() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  pixel = Math.min(window.devicePixelRatio, K.pixelverhouding);
  renderer.setPixelRatio(pixel);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', pasGrootteAan);
pasGrootteAan();

const debug = maakDebugscherm(uiLaag, INSTELLINGEN.debug);

// Alles rond het startpunt meteen klaarzetten, zodat het eerste beeld al vol is.
{
  const s = sim.speler(LOKAAL);
  volgcamera.volg(new THREE.Vector3(...s.pos), 0, 0, LOPEN.rensnelheid, 0);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
  // Alle shaders nu al klaarmaken, zodat er onderweg nooit een hapering komt als iets voor het eerst in beeld komt.
  renderer.compile(scene, camera);
}

// --- Spellus ---
/** Intentie die window.spel kan opleggen (voor tests); anders null. */
let opgelegd = null;
let tijd = 0;
let pletten = 0; // 0..1, kort na een landing
const tekenpos = new THREE.Vector3();

const lus = maakSpellus({
  stap(dt) {
    // Beide altijd lezen, zodat een korte tik op een touchknop nooit verloren gaat.
    const invoer = voegSamen(toetsenbord.lees(), touch.lees());
    const intentie = opgelegd ?? naarIntentie(invoer, volgcamera.hoek);
    sim.stap({ [LOKAAL]: intentie }, dt);
    for (const g of sim.neemGebeurtenissen()) {
      if (g.soort === 'landing' && g.speler === LOKAAL) pletten = Math.min(1, g.snelheid / 12);
    }
  },

  teken(overgang, dt) {
    tijd += dt;
    const s = sim.speler(LOKAAL);

    // Vloeiend tussen de vorige en de huidige simulatiestap.
    tekenpos.set(
      s.vorigePos[0] + (s.pos[0] - s.vorigePos[0]) * overgang,
      s.vorigePos[1] + (s.pos[1] - s.vorigePos[1]) * overgang,
      s.vorigePos[2] + (s.pos[2] - s.vorigePos[2]) * overgang
    );
    let dr = s.richting - s.vorigeRichting;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    figuur.position.copy(tekenpos);
    figuur.rotation.y = s.vorigeRichting + dr * overgang;

    // Pletten bij een landing, uitrekken tijdens het stijgen.
    pletten = Math.max(0, pletten - dt * 6);
    const rek = s.opGrond ? 0 : THREE.MathUtils.clamp(s.vel[1] / LOPEN.springSnelheid, -0.5, 1) * TESTFIGUUR.rekken;
    const sy = 1 + rek - pletten * TESTFIGUUR.pletten;
    lijf.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)).multiplyScalar(basisSchaal);
    // Een klein wiebeltje tijdens het lopen.
    const v = Math.hypot(s.vel[0], s.vel[2]);
    lijf.rotation.z = s.opGrond ? Math.sin(tijd * v * 2.2) * Math.min(v / 6, 1) * 0.12 : 0;

    const grond = raster.hoogteOp(tekenpos.x, tekenpos.z);
    schaduw.position.set(tekenpos.x, grond + 0.03, tekenpos.z);
    schaduw.scale.setScalar(THREE.MathUtils.clamp(1 - (tekenpos.y - grond) / 6, 0.4, 1));

    volgcamera.volg(tekenpos, s.vel[0], s.vel[2], LOPEN.rensnelheid, dt);

    // De wereld rond de speler, en alles wat met de camera meeschuift.
    wereldbeeld.werkBij(tekenpos.x, tekenpos.z, camera);
    hemel.koepel.position.copy(camera.position);
    hemel.zon.position.copy(camera.position).addScaledVector(zonRichting, SCENE.zon.afstand);
    hemel.wolken.rotation.y = tijd * SCENE.wolken.draaisnelheid;
    verreBerg.gloed.material.opacity = 0.75 + 0.25 * Math.sin(tijd * 1.3);
    WIND.uTijd.value = tijd;
    WIND.uWind.value = SCENE.wind.sterkte;
    WIND.uSpeler.value.copy(tekenpos);
    zee.werkBij(tijd, camera);
    stralen?.werkBij(tijd);
    stuifmeel.werkBij(tijd, camera, pixel);
    if (K.schaduw) {
      zonlicht.target.position.copy(tekenpos);
      zonlicht.position.copy(tekenpos).addScaledVector(lichtRichting, 70);
    }

    bloem.rotation.y = tijd * H.draaisnelheid;
    bloem.position.y = bloemY + Math.sin(tijd * 1.6) * H.deinen;

    renderer.render(scene, camera);
    debug.beeld(renderer.info, () => {
      const w = wereldbeeld.stats;
      return (
        `kwaliteit      ${INSTELLINGEN.kwaliteit}
` +
        `tegels         ${w.tegels}${w.wachtrij ? ` (+${w.wachtrij})` : ''}
` +
        `planten        ${w.instanties.toLocaleString('nl-BE')}
` +
        `plek           ${tekenpos.x.toFixed(0)}, ${tekenpos.z.toFixed(0)}`
      );
    });
  },
});

// Pauzeren als het tabblad naar de achtergrond gaat (TP 7).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    renderer.setAnimationLoop(null);
  } else {
    lus.herstart();
    renderer.setAnimationLoop(lus.tik);
  }
});
renderer.setAnimationLoop(lus.tik);

// --- Debug-ingang (TP 9): toestand uitlezen en sturen vanuit de console ---
let handTijd = 0;
window.spel = {
  sim,
  renderer,
  scene,
  camera: volgcamera,
  get speler() {
    return sim.speler(LOKAAL);
  },
  /** Zet de speler op (x, z), op de grond. */
  zet(x, z) {
    const s = sim.speler(LOKAAL);
    const y = raster.hoogteOp(x, z);
    s.pos = [x, y, z];
    s.vorigePos = [x, y, z];
    s.vel = [0, 0, 0];
    s.opGrond = true;
  },
  /** Zet de camera: hoek 0 = kijkt naar de zee (-z), PI = naar de jungle; kanteling in radialen. */
  zetCamera(hoek, kanteling = CAMERA.kanteling, afstand = CAMERA.afstand) {
    CAMERA.afstand = afstand;
    volgcamera.zet(hoek, kanteling);
    this.speel(2);
  },
  /** Draait de camera met de muisgevoeligheid (dx, dy in pixels), zoals slepen. */
  kijk(dx, dy = 0) {
    volgcamera.kijk(dx, dy, CAMERA.muisGevoeligheid);
  },
  /** Legt een intentie op in plaats van het toetsenbord; null geeft het toetsenbord terug. */
  stuur(intentie) {
    opgelegd = intentie;
  },
  hoogte: (x, z) => raster.hoogteOp(x, z),
  /** Speelt n beelden van 1/60 s met de hand (ook als de browser geen beelden tekent, bv. op de achtergrond). */
  speel(n = 60) {
    handTijd = Math.max(handTijd, performance.now());
    for (let i = 0; i < n; i++) {
      handTijd += 1000 / 60;
      lus.tik(handTijd);
    }
  },
  /** De afsteltabellen, live aan te passen vanuit de console (bv. spel.afstel.CAMERA.afstand = 3). */
  afstel: { CAMERA, TESTFIGUUR, LOPEN, SCENE, WERELD, FLORA, K },
  kwaliteit: INSTELLINGEN.kwaliteit,
  wereld: wereldbeeld.stats,
  /** Per plantsoort en afstandsband: aantal planten en driehoeken (om prestaties te meten). */
  telling() {
    const rij = [];
    for (const s of wereldbeeld.soorten) {
      s.banden.forEach((b, i) => {
        const d = b.geo.attributes.position.count / 3;
        rij.push({ soort: s.naam, band: i, aantal: b.mesh.count, perPlant: d, driehoeken: d * b.mesh.count });
      });
    }
    return rij.sort((a, b) => b.driehoeken - a.driehoeken);
  },
};
