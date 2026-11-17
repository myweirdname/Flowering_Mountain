// Start van het spel: koppelt simulatie, invoer en beeld aan elkaar.
import * as THREE from 'three';
import { INSTELLINGEN, MAX_PIXELVERHOUDING } from './kern/instellingen.js';
import { maakSpellus } from './kern/spellus.js';
import { SCENE } from './data/scene.js';
import { TERREIN } from './data/terrein.js';
import { LOPEN } from './data/beweging.js';
import { CAMERA } from './data/camera.js';
import { TESTFIGUUR } from './data/figuur.js';
import { maakSim } from './sim/spel.js';
import { maakToetsenbord } from './invoer/toetsenbord.js';
import { naarIntentie, voegSamen } from './invoer/intentie.js';
import { maakTouch, isTouchToestel } from './invoer/touch.js';
import { maakScherm } from './ui/scherm.js';
import { maakToetshulp } from './ui/toetshulp.js';
import { maakTerrein } from './beeld/terrein.js';
import { maakTestfiguur } from './beeld/maak/testfiguur.js';
import { maakVolgcamera } from './beeld/volgcamera.js';
import { maakHibiscus } from './beeld/maak/hibiscus.js';
import { maakMonstera } from './beeld/maak/monstera.js';
import { maakWillekeur } from './kern/willekeur.js';
import { maakZon } from './beeld/maak/zon.js';
import { maakDebugscherm } from './ui/debug.js';

// --- Simulatie ---
const sim = maakSim(INSTELLINGEN.berg);
const LOKAAL = 'speler1'; // de speler op dit toestel; later kunnen er meer bij
sim.voegSpelerToe(LOKAAL);
const raster = sim.wereld.raster;

// --- Beeld ---
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('spelbeeld'));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(SCENE.hemelkleur);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(SCENE.hemelkleur, SCENE.mistBegin, SCENE.mistEinde);
const camera = new THREE.PerspectiveCamera(CAMERA.beeldhoek, 1, 0.1, 400);

scene.add(new THREE.HemisphereLight(SCENE.hemelLicht, SCENE.grondLicht, SCENE.hemelLichtSterkte));
const zonRichting = new THREE.Vector3(...SCENE.zon.richting).normalize();
const zonlicht = new THREE.DirectionalLight(SCENE.zonkleur, SCENE.zonsterkte);
zonlicht.position.set(...SCENE.lichtRichting);
scene.add(zonlicht);
const zon = maakZon(SCENE.zon);
scene.add(zon);

scene.add(maakTerrein(raster, TERREIN));

const { figuur, lijf, schaduw, basisSchaal } = maakTestfiguur(TESTFIGUUR);
scene.add(figuur, schaduw);

// Een grote hibiscus als herkenningspunt naast het startpunt, op een gebogen steel.
const H = SCENE.hibiscus;
const [bx, bz] = H.plek;
const bloemGrond = raster.hoogteOp(bx, bz);
const steel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.13, H.steelHoogte, 10),
  new THREE.MeshLambertMaterial({ color: H.steelKleur })
);
steel.position.set(bx, bloemGrond + H.steelHoogte / 2, bz);
scene.add(steel);
const bloem = new THREE.Group();
const draaier = new THREE.Group();
draaier.add(maakHibiscus(H));
draaier.rotation.x = 0.8; // naar de camera gekanteld, zodat je in de bloem kijkt
bloem.add(draaier);
const bloemY = bloemGrond + H.steelHoogte;
bloem.position.set(bx, bloemY, bz);
scene.add(bloem);

// Monstera-struiken; hun houding varieert met de bergcode.
const plantToeval = maakWillekeur(sim.zaadje ^ 0x5eed);
for (const [mx, mz] of SCENE.monstera.plekken) {
  const struik = maakMonstera(SCENE.monstera, plantToeval.getal);
  struik.position.set(mx, raster.hoogteOp(mx, mz), mz);
  struik.rotation.y = plantToeval.getal() * Math.PI * 2;
  scene.add(struik);
}

const volgcamera = maakVolgcamera(camera, canvas, (x, z) => raster.hoogteOp(x, z));
const toetsenbord = maakToetsenbord();
const uiLaag = /** @type {HTMLElement} */ (document.getElementById('ui'));
const touch = maakTouch(canvas, uiLaag, volgcamera);
maakScherm(uiLaag, { touch: isTouchToestel() });
if (!isTouchToestel()) maakToetshulp(uiLaag);

function pasGrootteAan() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXELVERHOUDING[INSTELLINGEN.kwaliteit]));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', pasGrootteAan);
pasGrootteAan();

const debug = INSTELLINGEN.debug ? maakDebugscherm(uiLaag) : null;

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
    zon.position.copy(camera.position).addScaledVector(zonRichting, SCENE.zon.afstand);

    bloem.rotation.y = tijd * H.draaisnelheid;
    bloem.position.y = bloemY + Math.sin(tijd * 1.6) * H.deinen;

    renderer.render(scene, camera);
    debug?.beeld(renderer.info, s);
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
  afstel: { CAMERA, TESTFIGUUR, LOPEN, SCENE },
};
