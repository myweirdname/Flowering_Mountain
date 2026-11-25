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
import { maakAnimatie } from './beeld/animatie.js';
import { maakDeeltjes } from './beeld/deeltjes.js';
import { EFFECTEN } from './data/effecten.js';
import { maakBloesembeeld } from './beeld/bloesems.js';
import { BLOESEMS } from './data/bloesems.js';
import { maakHud } from './ui/hud.js';
import { maakGeluid } from './geluid/geluid.js';
import { GELUID } from './data/geluid.js';
import { ANIMATIE } from './data/animatie.js';
import { maakHibiscus } from './beeld/maak/hibiscus.js';
import { maakHemel } from './beeld/hemel.js';
import { maakZee } from './beeld/water.js';
import { maakTopGloed } from './beeld/maak/berg.js';
import { EILAND } from './data/eiland.js';
import { zetMist } from './beeld/mist.js';
import { maakLichtstralen, maakStuifmeel } from './beeld/sfeer.js';
import { maakWereldbeeld } from './beeld/wereldbeeld.js';
import { WIND } from './beeld/wind.js';
import { maakDebugscherm } from './ui/debug.js';
import { PONY } from './data/dieren.js';
import { laadPonyKleur, ponyMetKleur } from './kern/ponyKleur.js';
import { RIJDEN } from './data/rijden.js';
import { WEIDE } from './data/springweide.js';
import { maakPony as maakPonyVorm } from './beeld/maak/pony.js';
import { aanBot } from './beeld/maak/viervoeter.js';
import { maakDierAnimatie } from './beeld/dierAnimatie.js';
import { maakWeidebeeld } from './beeld/springweide.js';
import { maakBloeispoor } from './beeld/bloeispoor.js';
import { GEZEL } from './data/tijger.js';
import { maakGezelbeeld } from './beeld/gezel.js';
import { maakSlaapbloembeeld } from './beeld/slaapbloem.js';
import { WELPJES } from './data/welpjes.js';
import { maakWelpjesbeeld } from './beeld/welpjes.js';
import { KLIMMEN } from './data/klimmen.js';
import { maakOefenrotsbeeld } from './beeld/maak/oefenrots.js';
import { maakKlimmerbeeld } from './beeld/klimmer.js';
import { maakKlimbediening } from './ui/klimbediening.js';
import { RIVIER, VLOT, ZWEMTIJGER } from './data/rivier.js';
import { maakRivierbeeld } from './beeld/rivier.js';
import { maakBergrivierbeeld } from './beeld/bergrivier.js';
import { vaarProef } from './sim/modi/vaarbot.js';
import { maakVlotbeeld, maakZwemvest, maakZwemtijgerbeeld } from './beeld/vlot.js';
import { SPEELBOS } from './data/speelbos.js';
import { maakSpeelbosbeeld } from './beeld/speelbos.js';
import { maakWegwijzers } from './beeld/wegwijzers.js';
import { BERGPLAN } from './data/bergplan.js';
import { maakBot } from './sim/doorgangen/bots.js';
import { maakVogelvlucht, maakPrestatievlucht } from './beeld/vogelvlucht.js';

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
zetMist(scene, SCENE.hemel.horizon, K); // mist dichtbij, en een lichte waas tot ver op het eiland
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

// Hemel, zon en wolken (de wolken drijven rond het eiland, buiten de kust).
const zonRichting = new THREE.Vector3(...SCENE.zon.richting).normalize();
const hemel = maakHemel(SCENE, zonRichting, K.detail);
const bergTop = sim.wereld.vorm.eiland.top;
hemel.wolken.position.set(bergTop.x, 0, bergTop.z);
scene.add(hemel.koepel, hemel.zon, hemel.wolken);
// Een roze gloed op de top van de berg: daar komt later de Hartbloem (stap 18). Van overal te zien.
const topGloed = maakTopGloed(EILAND.top.gloed);
topGloed.position.set(bergTop.x, bergTop.h + 7, bergTop.z);
topGloed.scale.setScalar(34);
scene.add(topGloed);

// Het landschap en de jungle, in tegels rond de speler, en het grove eiland in de verte.
const wereldbeeld = maakWereldbeeld(scene, sim, K);
const zee = maakZee(sim.wereld.vorm.hoogte, SCENE, zonRichting, K.detail === 0, wereldbeeld.grofRaster);
scene.add(zee.vlak);
const stralen = K.lichtstralen ? maakLichtstralen(sim.wereld.vorm, SCENE.lichtstralen, lichtRichting) : null;
if (stralen) scene.add(stralen.mesh);
const stuifmeel = maakStuifmeel(K.stuifmeel, SCENE.stuifmeel);
scene.add(stuifmeel.punten);

const avonturier = maakTestfiguur(TESTFIGUUR);
const { figuur, schaduw } = avonturier;
scene.add(figuur, schaduw);
// Geluid: start pas bij de eerste tik of toets (zo wil de browser het). M zet het aan of uit.
const geluid = maakGeluid();
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') geluid.wissel();
});
const bodem = /** @type {any} */ ({});
/** Waar staan de voeten op: zand, gras, rots of water? */
function ondergrond(s) {
  if (s.modus === 'zwemmen') return 'water';
  const x = s.pos[0];
  const z = s.pos[2];
  // Het speelbos en de oversteken: houten platforms en bruggen, zachte bladeren, natte lotus.
  const bos = sim.wereld.parcours[s.parcours] ?? sim.wereld.speelbos;
  const op = bos.waarOp(s);
  if (op !== null) {
    if (bos.wedstrijd !== false && op === bos.dekken.length - 1) return 'gras';
    if (typeof op === 'string' && op.startsWith('m')) {
      const soort = bos.modules[+op.slice(1)].soort;
      return soort === 'lotus' ? 'water' : soort === 'reuzenblad' || soort === 'springbloem' ? 'gras' : 'hout';
    }
    return 'hout';
  }
  if (sim.wereld.rotsOp(x, z) > raster.hoogteOp(x, z) + 0.03) return 'rots';
  sim.wereld.vorm.bodem(x, z, bodem);
  if (bodem.h < 0.05 || sim.wereld.weide.water(x, z) > bodem.h || sim.wereld.waterOp(x, z) > bodem.h + 0.03) return 'water';
  return bodem.zand > 0.5 || bodem.pad > 0.5 ? 'zand' : 'gras';
}
const animatie = maakAnimatie(avonturier, {
  onStap() {
    const s = sim.speler(LOKAAL);
    geluid.stap(ondergrond(s), Math.min(1, Math.hypot(s.vel[0], s.vel[2]) / LOPEN.rensnelheid));
  },
});
const deeltjes = maakDeeltjes();
scene.add(deeltjes.punten, deeltjes.groep);
const bloesems = maakBloesembeeld(sim.wereld.bloesems, BLOESEMS);
scene.add(bloesems.groep);
if (K.schaduw) {
  figuur.traverse((o) => (o.castShadow = true));
  schaduw.visible = false; // de echte schaduw neemt het over
}

// --- De springweide en het bloeispoor ---
const weidebeeld = maakWeidebeeld(sim.wereld.weide, K.detail);
weidebeeld.vast.castShadow = K.schaduw;
weidebeeld.vast.receiveShadow = K.schaduw;
scene.add(weidebeeld.groep);
const bloeispoor = maakBloeispoor(K.detail ? 1600 : 700, K.detail, RIJDEN.spoorLeven, RIJDEN.spoorVerwelk);
scene.add(bloeispoor.mesh);

// --- De pony ---
// Met de kleuren die het kind zelf koos in de dierenproef (bewaard op dit toestel).
const ponyVorm = maakPonyVorm(ponyMetKleur(PONY, laadPonyKleur()));
const ponyHouder = new THREE.Group();
ponyHouder.scale.setScalar(RIJDEN.ponySchaal);
ponyHouder.add(ponyVorm.groep);
const ponySchaduw = new THREE.Mesh(
  new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.22, depthWrite: false })
);
ponySchaduw.renderOrder = 2;
scene.add(ponyHouder, ponySchaduw);
if (K.schaduw) {
  ponyVorm.groep.traverse((o) => (o.castShadow = true));
  ponySchaduw.visible = false;
}
// Het zadelpunt: hier zit de avonturier, het beweegt mee met de rug van de pony.
const zadel = new THREE.Object3D();
zadel.position.set(...RIJDEN.zadel);
aanBot(ponyVorm.bot.lijf, new THREE.Vector3(0, ponyVorm.rugY, 0), zadel);
/** Waar staan de hoeven op? */
function ponyOndergrond(p) {
  if (p.diepte > 0.05) return 'water';
  const x = p.pos[0];
  const z = p.pos[2];
  if (sim.wereld.rotsOp(x, z) > raster.hoogteOp(x, z) + 0.03) return 'rots';
  sim.wereld.vorm.bodem(x, z, bodem);
  return bodem.zand > 0.5 || bodem.pad > 0.5 ? 'zand' : 'gras';
}
const ponyAnim = maakDierAnimatie(ponyVorm, 1, {
  opHoef() {
    const p = sim.pony(LOKAAL);
    geluid.hoef(ponyOndergrond(p), Math.min(1, Math.abs(p.snelheid) / RIJDEN.galop));
  },
});
// --- De tijger als reisgezel en de slaapbloem (stap 8a) ---
const gezel = maakGezelbeeld(scene, K);
const slaapbloembeeld = maakSlaapbloembeeld(scene, sim.wereld.slaapbloemen, GEZEL.slaapbloem, K);
// --- De welpjes bij mama (stap 8b) ---
const welpjesbeeld = maakWelpjesbeeld(scene, sim.welpjesVan(LOKAAL), K, sim.takVan(LOKAAL));
// --- De oefenrots en de klimster (stap 9) ---
let rots = sim.wereld.oefenrots;
const rotsbeeld = maakOefenrotsbeeld(rots, KLIMMEN, K);
scene.add(rotsbeeld.groep);
const rotsMidden = new THREE.Vector3(...rots.midden);
const klimmer = maakKlimmerbeeld(scene, avonturier, rots, KLIMMEN, K);
const rotsN = new THREE.Vector3(...rots.N);
const rotsR = new THREE.Vector3(...rots.R);
// --- De klimwanden van de berg (stap 13): elk zijn eigen beeld. De klimster en de witte tijger gaan mee naar
// de wand waarop je begint te klimmen; `rots` is altijd die wand. ---
const wanden = sim.wereld.wanden;
const wandbeelden = [rotsbeeld, ...wanden.slice(1).map((w) => {
  const b = maakOefenrotsbeeld(w, KLIMMEN, K);
  scene.add(b.groep);
  return b;
})];
let huidigeWand = 0;
const geenLicht = new Map();
const wandPlek = new THREE.Vector3();
function kiesWand(wi) {
  if (wi === huidigeWand) return;
  huidigeWand = wi;
  rots = wanden[wi];
  rotsMidden.set(...rots.midden);
  rotsN.set(...rots.N);
  rotsR.set(...rots.R);
  klimmer.zetWand(rots);
  klimbediening.zetWand(rots);
}
// --- De benedenrivier, het vlot en de Sumatraanse tijger (stap 10) ---
const rivier = sim.wereld.rivier;
const rivierbeeld = maakRivierbeeld(rivier, VLOT, sim.wereld.vlotStukken, K, zonRichting, SCENE.hemel.horizon);
scene.add(rivierbeeld.groep);
// --- De rivier over de berg (stap 14): van de bergtop over de grote waterval tot in de bron ---
const bergrivier = sim.wereld.bergrivier;
const bergrivierbeeld = maakBergrivierbeeld(bergrivier, K, zonRichting, SCENE.hemel.horizon);
scene.add(bergrivierbeeld.groep);
const vlotbeeld = maakVlotbeeld(VLOT, K);
scene.add(vlotbeeld.groep);
const zwemvest = maakZwemvest(ponyVorm);
const zwemtijger = maakZwemtijgerbeeld(scene, ZWEMTIJGER, K, GEZEL.laag);
// --- Het speelbos (stap 11) ---
const speelbos = sim.wereld.speelbos;
const speelbosbeeld = maakSpeelbosbeeld(speelbos, K);
scene.add(speelbosbeeld.groep);
// --- De berg (stap 13): de oversteken over de ravijnen en de wegwijzers bij elke doorgang ---
const oversteekbeelden = sim.wereld.parcours.slice(1).map((bos) => {
  const b = maakSpeelbosbeeld(bos, K);
  scene.add(b.groep);
  return b;
});
const wegwijzers = maakWegwijzers(sim.wereld.bergplan.verbindingen.flatMap((v) => v.wegwijzers), sim.wereld.grondOp, BERGPLAN.wegwijzer, K);
scene.add(wegwijzers.groep);
figuur.rotation.order = 'YXZ'; // aan de liaan kantelt ze rond haar eigen dwarsas
let zwaaiBeeld = 0;
let zwaaiGeluid = 0;
/** Op of van het vlot springen: { t, duur, van } (de avonturier) en hetzelfde voor de pony (met `ver`: ze verschijnt). */
let vaarOvergang = null;
let ponyHop = null;
let laatstePeddel = [0, 0];
let kielTijd = 0;
let zwemKielTijd = 0;
let ponyLeun = 0;
const ZIT_ZAK = 0.17; // zittend op het vlot zakt het figuurtje tot op haar billetjes
const hopDoel = new THREE.Vector3();
const rivierPunt = { s: 0, d: 0 };
// Alle watervallen (om ze te horen razen): de kleine sprong van de benedenrivier en die van de bergrivier.
const watervallen = [rivier, bergrivier].flatMap((r) => r.sprongen.map((sp) => {
  const [x, z] = r.puntOp(sp.s + sp.lengte * 0.6, 0);
  return { x, y: r.peil(sp.s + sp.lengte * 0.6), z, bereik: sp.groot ? 90 : 18 + sp.hoogte * 4, sterkte: sp.groot ? 1 : Math.min(0.8, 0.45 + sp.hoogte * 0.1) };
}));

// Op- en afstappen: een sprongetje van de grond naar het zadel (of terug).
let rijOvergang = null;
let juichTijd = 0;
// De filmcamera bij de grote waterval (stap 14).
let valMix = 0;
const valCam = { pos: new THREE.Vector3(), doel: new THREE.Vector3(), klaar: false, sp: null, tak: 0 };
let aaiTijd = 0;
const zadelPos = new THREE.Vector3();
const zadelDraai = new THREE.Quaternion();
const ponyPos = new THREE.Vector3();

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

// De camera schuift niet in boomkruinen of door stammen: ze komt dan dichterbij.
const begroeiing = sim.wereld.begroeiing;
const kruinH = (FLORA.boom.hoogte[0] + FLORA.boom.hoogte[1]) / 2;
function vrijeAfstand(van, naar) {
  const dx = naar.x - van.x;
  const dy = naar.y - van.y;
  const dz = naar.z - van.z;
  const lengte = Math.hypot(dx, dy, dz);
  const T = raster.tegelGrootte;
  const bomen = [];
  const tx0 = Math.floor((Math.min(van.x, naar.x) - 7) / T);
  const tx1 = Math.floor((Math.max(van.x, naar.x) + 7) / T);
  const tz0 = Math.floor((Math.min(van.z, naar.z) - 7) / T);
  const tz1 = Math.floor((Math.max(van.z, naar.z) + 7) / T);
  for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) bomen.push(...begroeiing.grote(tx, tz).boom);
  // De reuzenbomen van het speelbos (stap 11): stam en kruin.
  const sb = sim.wereld.speelbos;
  const sbTop = sb.vloer + SPEELBOS.boomHoogte;
  const bosBomen = sb.stammen.filter((st) => Math.min(Math.hypot(st.x - van.x, st.z - van.z), Math.hypot(st.x - naar.x, st.z - naar.z)) < lengte + 4);
  if (!bomen.length && !bosBomen.length) return lengte;
  const stap = 0.25;
  for (let d = 0.8; d <= lengte; d += stap) {
    const f = d / lengte;
    const x = van.x + dx * f;
    const y = van.y + dy * f;
    const z = van.z + dz * f;
    for (const st of bosBomen) {
      const ex = x - st.x;
      const ez = z - st.z;
      if (ex * ex + ez * ez < (st.r + 0.45) ** 2 && y < sbTop) return d - stap;
      const ey = (y - (sbTop + 1.2)) / 2.6;
      if ((ex * ex + ez * ez) / 3.6 ** 2 + ey * ey < 1) return d - stap;
    }
    for (const b of bomen) {
      const ex = x - b.x;
      const ez = z - b.z;
      const k = b.schaal;
      // Stam (een zuil) en kruin (een platte bol rond de top), met wat speling.
      if (ex * ex + ez * ez < (FLORA.lagen.boom.stam * k + 0.35) ** 2 && y < b.y + kruinH * k) return d - stap;
      const ey = (y - (b.y + (kruinH - 0.4) * k)) / (3.6 * k);
      if ((ex * ex + ez * ez) / (6.2 * k) ** 2 + ey * ey < 1) return d - stap;
    }
  }
  return lengte;
}
const volgcamera = maakVolgcamera(camera, canvas, (x, z) => Math.max(sim.wereld.grondOp(x, z), 0.1), vrijeAfstand);
const toetsenbord = maakToetsenbord();
const uiLaag = /** @type {HTMLElement} */ (document.getElementById('ui'));
const touch = maakTouch(canvas, uiLaag, volgcamera);
maakScherm(uiLaag, { touch: isTouchToestel() });
const hud = maakHud(uiLaag, WEIDE.hindernissen.map((h) => h.soort));
const klimbediening = maakKlimbediening(canvas, uiLaag, camera, rots, KLIMMEN, {
  speler: () => sim.speler(LOKAAL),
  bereikbaar: (lid) => sim.bereikbaar(LOKAAL, lid),
  handPlek: (lid) => klimmer.handPlek(lid),
});
touch.zetVoorrang((e) => klimbediening.neem(e));

// Tik (of klik) op de pony: aaien.
let aaiWacht = false;
let aaiTijgerWacht = false;
/** @type {string | null} */
let aaiWelpWacht = null;
const tikken = new Map();
const straal = new THREE.Ray();
const ponyMidden = new THREE.Vector3();
canvas.addEventListener('pointerdown', (e) => tikken.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener('pointerup', (e) => {
  const t = tikken.get(e.pointerId);
  tikken.delete(e.pointerId);
  if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12 || performance.now() - t.t > 450) return;
  if (sim.speler(LOKAAL).modus === 'klimmen') return; // aan de wand tik je op grepen
  // Een straal vanuit de camera door de tik: raakt hij het lijf of het hoofd van de pony?
  const ndc = new THREE.Vector3((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, 0.5).unproject(camera);
  straal.origin.copy(camera.position);
  straal.direction.copy(ndc).sub(camera.position).normalize();
  // Eerst de welpjes (ze zijn klein en staan vaak voor mama).
  const welp = welpjesbeeld.raakt(straal, camera);
  if (welp) {
    aaiWelpWacht = welp;
    return;
  }
  if (gezel.raakt(straal, camera)) {
    aaiTijgerWacht = true;
    return;
  }
  const s = RIJDEN.ponySchaal;
  for (const [hoogte, voor, r] of [[0.65, 0, 0.62], [1.1, 0.6, 0.38]]) {
    ponyMidden.set(Math.sin(ponyHouder.rotation.y) * voor * s, hoogte * s, Math.cos(ponyHouder.rotation.y) * voor * s).add(ponyHouder.position);
    if (straal.distanceToPoint(ponyMidden) < r * s && camera.position.distanceTo(ponyMidden) < 30) {
      aaiWacht = true;
      return;
    }
  }
});
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

// Vogelvlucht (toets V of ?vogel=1) en de prestatievlucht (?vlucht=1): de camera vliegt los van de speler.
const vogel = maakVogelvlucht(CAMERA.vogelvlucht);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV' && !e.repeat) vogel.wissel(camera);
});
const vlucht = INSTELLINGEN.vlucht ? maakPrestatievlucht(sim.wereld.vorm, CAMERA.vlucht, uiLaag, { kwaliteit: INSTELLINGEN.kwaliteit }) : null;
let laatsteInvoer = { beweeg: [0, 0], spring: false, actie: false };
const stilInvoer = { beweeg: /** @type {[number, number]} */ ([0, 0]), spring: false, actie: false, fluit: false, brul: false };

// Alles rond het startpunt meteen klaarzetten, zodat het eerste beeld al vol is.
{
  const s = sim.speler(LOKAAL);
  volgcamera.volg(new THREE.Vector3(...s.pos), 0, 0, LOPEN.rensnelheid, 0);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
  // Alle shaders nu al klaarmaken, zodat er onderweg nooit een hapering komt als iets voor het eerst in beeld komt.
  renderer.compile(scene, camera);
  if (INSTELLINGEN.vogel) vogel.wissel(camera);
}

/** Beeld en geluid bij wat de tijger doet (en de slaapbloem). Geeft true als de gebeurtenis van hem was. */
const effectPlek = new THREE.Vector3();
function tijgerGebeurtenis(g) {
  const t = sim.tijger(LOKAAL);
  const kop = (hoogte = 0.85) => {
    const s = GEZEL.schaal;
    return [t.pos[0] + Math.sin(t.richting) * 0.95 * s, t.pos[1] + hoogte * s, t.pos[2] + Math.cos(t.richting) * 0.95 * s];
  };
  switch (g.soort) {
    case 'proest':
      geluid.proest(g.roept ? 2 : 3);
      gezel.anim.blij();
      return true;
    case 'kopje': {
      gezel.anim.kopje(GEZEL.kopjeDuur);
      geluid.spin(GEZEL.kopjeDuur);
      const [x, y, z] = kop(1.05);
      deeltjes.hartjes(x, y, z, g.eerste ? 7 : 4);
      return true;
    }
    case 'tijgerAai': {
      gezel.anim.blij();
      geluid.spin(1.6);
      const [x, y, z] = kop(1.05);
      deeltjes.hartjes(x, y, z, 3);
      return true;
    }
    case 'begroeting': {
      // Neusje aan neusje: hij proest, zij hinnikt zachtjes terug, en er zweven hartjes tussen hen in.
      geluid.proest(2);
      setTimeout(() => geluid.hinnik(true), 420);
      gezel.anim.blij();
      ponyAnim.blij();
      deeltjes.hartjes(g.pos[0], g.pos[1] + 1.5, g.pos[2], 6);
      return true;
    }
    case 'tijgerBijBloem':
      geluid.proest(2);
      return true;
    case 'tijgerWacht':
      return true;
    case 'brulStart':
      gezel.anim.brul();
      return true;
    case 'brul': {
      geluid.brul();
      // De lucht trilt: kringen over de grond en een wolk blaadjes uit de jungle voor hem.
      const [x, y, z] = kop(0.7);
      deeltjes.kring(x, z, 3.5, 1.6, t.pos[1] + 0.05);
      deeltjes.kring(x, z, 6, 2.2, t.pos[1] + 0.05);
      const vx = Math.sin(t.richting) * 3;
      const vz = Math.cos(t.richting) * 3;
      deeltjes.blaadjes(x + vx, y + 0.8, z + vz, 26, undefined, 1.4);
      return true;
    }
    case 'brulTeVroeg':
      hud.brulTeVroeg();
      geluid.grom();
      return true;
    case 'meterVol':
      geluid.hindernisTel(4);
      return true;
    case 'bloemOpen': {
      geluid.bloemOpen();
      const S = GEZEL.slaapbloem;
      setTimeout(() => {
        deeltjes.bloemenregen(g.pos[0], g.pos[1] + S.hoogte + S.grootte, g.pos[2]);
        deeltjes.glinsters(g.pos[0], g.pos[1] + S.hoogte + 0.6, g.pos[2], S.hartKleur, 24);
      }, 500);
      return true;
    }
    case 'schat': {
      hud.schat(g.aantal);
      geluid.schat();
      const [x, y, z] = g.pos;
      deeltjes.glinsters(x, y + 0.6, z, 0xffd84d, 40);
      deeltjes.bloemenregen(x, y + 1.2, z);
      deeltjes.blaadjes(x, y + 0.6, z, 22, [BLOESEMS.blaadjeKleur, BLOESEMS.randKleur], 1.2);
      return true;
    }
    case 'tijgerWeg':
      deeltjes.blaadjes(g.pos[0], g.pos[1] + 0.8, g.pos[2], 18);
      return true;
    case 'tijgerVerschijnt':
      deeltjes.blaadjes(g.pos[0], g.pos[1] + 0.8, g.pos[2], 24);
      geluid.proest(2);
      return true;
    case 'tijgerVast':
      return true;
  }
  return false;
}

/** Beeld en geluid bij wat de welpjes doen. Geeft true als de gebeurtenis van een welpje was. */
function welpGebeurtenis(g) {
  if (!g.soort.startsWith('welp')) return false;
  const b = welpjesbeeld.van(g.welp);
  const dichtbij = b && b.houder.visible && camera.position.distanceTo(b.houder.position) < 30;
  if (!dichtbij) return true;
  const [x, y, z] = g.pos;
  const kop = y + 0.55 * WELPJES.schaal;
  switch (g.soort) {
    case 'welpPiep':
      // Gevangen! Een fel piepje en een paar sterretjes.
      geluid.piep(1.2, 0.9);
      deeltjes.glinsters(x, kop, z, 0xffe15a, 10);
      break;
    case 'welpSpeelt':
      if (Math.random() < 0.6) geluid.piep(1, 0.6);
      break;
    case 'welpSprong':
      geluid.piep(0.9, 0.5);
      break;
    case 'welpLand':
      deeltjes.blaadjes(x, y + 0.1, z, 5, undefined, 0.3);
      break;
    case 'welpRolt':
      if (Math.random() < 0.5) geluid.piep(1.1, 0.5);
      break;
    case 'welpAai':
      // Op zijn rug voor een buikkriebel: hartjes, een blij piepje en een klein spinnetje.
      geluid.piep(1.05, 1);
      setTimeout(() => geluid.spin(1.4), 250);
      deeltjes.hartjes(x, kop + 0.2, z, 5);
      break;
    case 'welpTerug':
      geluid.piep(0.95, 0.7);
      break;
    case 'welpVerschijnt':
      deeltjes.blaadjes(x, y + 0.4, z, 14, undefined, 0.6);
      break;
    // Schatjesmomenten (stap 8c).
    case 'welpNies':
      // "Ha ... ha ... TSJIE!": een wolkje stuifmeel uit de bloem.
      geluid.nies();
      setTimeout(() => {
        const [nx, ny, nz] = g.neus;
        deeltjes.glinsters(nx, ny, nz, EFFECTEN.stuifmeel[0], 12);
        deeltjes.blaadjes(nx, ny - 0.3, nz, 4, EFFECTEN.stuifmeel, 0.35);
        welpjesbeeld.zeg(g.welp, 'hatsjie!', 1.3);
      }, 560);
      break;
    case 'welpHik':
      geluid.hik();
      welpjesbeeld.zeg(g.welp, 'hik!', 0.7);
      break;
    case 'welpStruikel':
      geluid.piep(1.35, 0.7);
      break;
    case 'welpTuimel':
      geluid.tuimel();
      deeltjes.blaadjes(x, y + 0.05, z, 6, undefined, 0.35);
      deeltjes.sterretjes(x, kop + 0.15, z, 6);
      break;
    case 'welpHuh':
      if (g.eerste) geluid.huh(3);
      welpjesbeeld.zeg(g.welp, '?', 1.4);
      break;
    case 'welpMeeBrul':
      geluid.miniBrul();
      setTimeout(() => welpjesbeeld.zeg(g.welp, 'mieuw!', 1.3), 170);
      break;
    // Spelen met elkaar (stap 8d).
    case 'welpStaart':
      geluid.piep(1.1, 0.6);
      break;
    case 'welpDuizelig':
      geluid.tuimel();
      geluid.duizelig();
      deeltjes.blaadjes(x, y + 0.05, z, 5, BLAD_GROEN, 0.3);
      break;
    case 'welpWankel':
      geluid.piep(0.85, 0.5);
      break;
    case 'welpVerstoppertje':
      geluid.piep(1.15, 0.8);
      break;
    case 'welpTelt':
      geluid.tel(g.n);
      welpjesbeeld.zeg(g.welp, String(g.n), 0.75);
      break;
    case 'welpKlaar':
      geluid.piep(1.25, 1);
      welpjesbeeld.zeg(g.welp, 'klaar!', 1.2);
      break;
    case 'welpVerstopt':
      geluid.ritsel(0.8);
      deeltjes.blaadjes(x, y + 0.3, z, 4, BLAD_GROEN, 0.25);
      break;
    case 'welpGevonden':
      // Hop, uit de struik! Bladeren vliegen in het rond.
      geluid.ritsel(1.2);
      geluid.piep(1.3, 1);
      deeltjes.blaadjes(x, y + 0.35, z, 10, BLAD_GROEN, 0.5);
      welpjesbeeld.zeg(g.welp, '!', 1.1);
      break;
    case 'welpBlij':
      welpjesbeeld.blij(g.welp);
      if (g.laatste !== undefined) {
        // De zoeker: een blij sprongetje.
        setTimeout(() => geluid.piep(1.2, 0.9), 120);
        setTimeout(() => welpjesbeeld.zeg(g.welp, g.laatste ? 'hihi!' : 'gevonden!', 1.2), 300);
        deeltjes.glinsters(x, kop + 0.2, z, 0xffe15a, 8);
      } else if (Math.random() < 0.6) geluid.piep(1.05, 0.6);
      break;
    case 'welpTakSpel':
      if (Math.random() < 0.6) geluid.piep(1, 0.6);
      break;
    case 'welpTakValt':
      geluid.tok();
      deeltjes.blaadjes(x, y + 0.1, z, 5, BLAD_GROEN, 0.3);
      break;
    case 'welpTakGrijp':
      if (Math.random() < 0.5) geluid.piep(0.95, 0.5);
      break;
    case 'welpGrom':
      geluid.miniGrom();
      break;
    case 'welpTakKrak':
      geluid.krak();
      deeltjes.blaadjes(x, y + 0.3, z, 6, [0xf2d6a2, 0x9a6a3e, 0x62d05c], 0.45);
      welpjesbeeld.zeg(g.welp, 'krak!', 1);
      break;
    case 'welpTakLos':
      geluid.zwiep();
      break;
    case 'welpPlof':
      geluid.tuimel();
      setTimeout(() => geluid.piep(1.3, 0.7), 90);
      deeltjes.blaadjes(x, y + 0.05, z, 5, BLAD_GROEN, 0.3);
      deeltjes.sterretjes(x, kop + 0.05, z, 4);
      break;
  }
  return true;
}
const BLAD_GROEN = [0x5ad67a, 0x7fe46a, 0x3db97e];

/** Beeld en geluid bij het klimmen (stap 9). Geeft true als de gebeurtenis van het klimmen was. */
const KRIJT = 0xfffaf4;
function klimGebeurtenis(g) {
  switch (g.soort) {
    case 'klimStart': {
      geluid.klimStart();
      setTimeout(() => geluid.proest(2), 250);
      // Het klimspreukje: een glitterwolkje, en het hoofdje wordt kleiner (beeld/klimmer.js).
      const s = sim.speler(LOKAAL);
      deeltjes.glinsters(s.pos[0], s.pos[1] + 0.9, s.pos[2], 0xfff3a0, 26);
      deeltjes.glinsters(s.pos[0], s.pos[1] + 0.9, s.pos[2], 0xff9ad0, 14);
      kiesWand(s.klim?.wand ?? 0);
      wandbeelden[huidigeWand].hangtouw(g.route, false);
      wandbeelden[huidigeWand].sluit(g.route);
      return true;
    }
    case 'klimGreep':
      geluid.greep(g.greepSoort);
      deeltjes.stof(g.pos[0], g.pos[1], g.pos[2], KRIJT);
      return true;
    case 'klimVoet':
      geluid.voetje(g.grond);
      if (g.hak) geluid.hakhaak();
      return true;
    // --- Steil en ondersteboven (stap 15a) ---
    case 'vleermuis': {
      // In de knieklem: ondersteboven, handen los. Een opgeluchte "hihi" en wat glitter.
      geluid.vleermuis();
      const s = sim.speler(LOKAAL);
      setTimeout(() => deeltjes.glinsters(s.pos[0], s.pos[1], s.pos[2], 0xfff3a0, 16), 500);
      return true;
    }
    case 'vleermuisUit':
      geluid.opklimmen();
      return true;
    case 'krijt': {
      // Een hand in het pofzakje: een wolkje magnesium.
      geluid.krijt();
      const p = klimmer.zakPlek();
      setTimeout(() => {
        deeltjes.stof(p.x, p.y, p.z, KRIJT);
        deeltjes.stof(p.x, p.y + 0.05, p.z, KRIJT);
      }, 250);
      return true;
    }
    case 'krijtKlaar': {
      const h = klimmer.handPlek(g.lid);
      deeltjes.stof(h.x, h.y, h.z, KRIJT);
      deeltjes.glinsters(h.x, h.y, h.z, 0xffffff, 8);
      klimbediening.krijt(g.beurten);
      return true;
    }
    case 'geenKrijt':
      geluid.teVer();
      klimbediening.krijt(0, true);
      return true;
    case 'dynoLaad':
      geluid.dynoLaad();
      return true;
    case 'dynoSprong':
      geluid.dynoSprong();
      return true;
    case 'dynoVang': {
      geluid.greep(g.greepSoort);
      geluid.dynoVang();
      const [x, y, z] = g.pos;
      deeltjes.stof(x, y, z, KRIJT);
      deeltjes.sterretjes(x, y, z, 5);
      return true;
    }
    case 'dynoMis':
      geluid.glijden();
      return true;
    case 'voetenLos':
      geluid.voetenLos();
      return true;
    case 'teVer':
    case 'andereRoute':
      geluid.teVer();
      klimbediening.flits(g.greep);
      return true;
    case 'handGlijdt': {
      geluid.glijden();
      const h = klimmer.handPlek(g.lid);
      deeltjes.stof(h.x, h.y, h.z, KRIJT);
      return true;
    }
    case 'val':
      geluid.val();
      klimmer.tijgerSchrik();
      return true;
    case 'touwRuk':
      geluid.touwRuk();
      return true;
    case 'opnieuw':
      geluid.piep(1.1, 0.4);
      return true;
    case 'top': {
      geluid.top();
      wandbeelden[huidigeWand].bloei(g.route);
      const [x, y, z] = g.pos;
      const kleur = rots.routes[g.route].kleur;
      setTimeout(() => {
        deeltjes.bloemenregen(x, y + 0.8, z, 70);
        deeltjes.glinsters(x, y + 0.3, z, kleur, 30);
      }, 150);
      klimmer.tijgerBlij();
      setTimeout(() => geluid.proest(3), 500);
      const kop = klimmer.tijgerKop();
      deeltjes.hartjes(kop.x, kop.y, kop.z, 5);
      return true;
    }
    case 'zakken':
      geluid.zakken();
      return true;
    case 'beneden': {
      geluid.landing(2);
      wandbeelden[huidigeWand].hangtouw(g.route, true);
      const s = sim.speler(LOKAAL);
      deeltjes.stof(s.pos[0], s.pos[1], s.pos[2], EFFECTEN.stof);
      deeltjes.glinsters(s.pos[0], s.pos[1] + 0.9, s.pos[2], 0xfff3a0, 16);
      // De camera staat voor de wand, met de rots in beeld.
      volgcamera.zet(Math.atan2(rotsN.x, rotsN.z), CAMERA.kanteling);
      return true;
    }
    case 'uitgestapt': {
      // Bovenaan een klimwand van de berg over de rand geklauterd (stap 13): je staat op de etage.
      geluid.landing(1.5);
      wandbeelden[huidigeWand].hangtouw(g.route, true);
      deeltjes.glinsters(g.pos[0], g.pos[1] + 0.9, g.pos[2], 0xfff3a0, 20);
      deeltjes.hartjes(g.pos[0], g.pos[1] + 1.4, g.pos[2], 4);
      volgcamera.zet(Math.atan2(rotsN.x, rotsN.z), CAMERA.kanteling);
      return true;
    }
    case 'schudden':
      geluid.schud();
      return true;
    case 'nietSchudden':
      geluid.teVer();
      return true;
    case 'besturing':
      geluid.tik();
      return true;
  }
  return false;
}

/** Beeld en geluid bij het vlot, de rivier en de Sumatraanse tijger (stap 10). */
const GLITTER = 0xfff3a0;
function vaarGebeurtenis(g) {
  switch (g.soort) {
    case 'bouwstuk': {
      rivierbeeld.pak(g.stuk);
      const [x, y, z] = g.pos;
      deeltjes.glinsters(x, y + 0.5, z, GLITTER, 18);
      deeltjes.blaadjes(x, y + 0.3, z, 8, BLAD_GROEN, 0.5);
      geluid.ritsel(1);
      geluid.bloesem(g.aantal - 1);
      return true;
    }
    case 'vlotBouwen': {
      vlotbeeld.bouw();
      const [x, y, z] = g.pos;
      deeltjes.glinsters(x, y + 1.2, z, GLITTER, 30);
      deeltjes.glinsters(x, y + 1.2, z, 0xff9ad0, 16);
      geluid.ritsel(1.2);
      return true;
    }
    case 'vlotKlaar': {
      const [x, y, z] = g.pos;
      geluid.top();
      deeltjes.bloemenregen(x, y + 1.5, z, 50);
      deeltjes.glinsters(x, y + 0.6, z, GLITTER, 24);
      return true;
    }
    case 'vlotIn':
      vaarOvergang = { t: 0, duur: 0.45, van: figuur.position.clone() };
      geluid.opstappen();
      return true;
    case 'vlotUit':
      vaarOvergang = { t: 0, duur: 0.45, van: figuur.position.clone() };
      setTimeout(() => geluid.landing(2), 380);
      return true;
    case 'ponyOpVlot':
      ponyHop = { t: 0, duur: g.ver ? 0.01 : 0.65, van: new THREE.Vector3(...g.van) };
      if (g.ver) {
        const v = sim.vlot(LOKAAL);
        deeltjes.blaadjes(v.pos[0], v.pos[1] + 0.6, v.pos[2], 24, [0x6fd35e, 0x9be37a, 0xff8cc6], 0.8);
      }
      geluid.hinnik(true);
      setTimeout(() => geluid.tok(), 600);
      return true;
    case 'ponyVanVlot':
      ponyHop = { t: 0, duur: 0.65, van: ponyHouder.position.clone() };
      setTimeout(() => geluid.hinnik(), 300);
      return true;
    case 'vlotHop':
      geluid.sprong();
      return true;
    case 'vlotSprong':
      // De wow-sprong: een zoef, de pony hinnikt, en alles even in slow motion.
      geluid.zoef();
      setTimeout(() => geluid.hinnik(true), 120);
      ponyAnim.blij();
      if (g.groot) {
        // De grote waterval over de rotsrand: nog een zoef, een juichkreetje en klokjes.
        setTimeout(() => geluid.zoef(), 700);
        setTimeout(() => geluid.hinnik(true), 1300);
        setTimeout(() => geluid.top(), 400);
        juichTijd = 4;
      }
      return true;
    case 'vlotLanding': {
      const [x, y, z] = g.pos;
      deeltjes.spetters(x, z, 2.2, y);
      deeltjes.spetters(x + 0.8, z - 0.5, 1.2, y);
      if (g.groot) {
        // Een diepe plons: een fontein van spetters, kringen en een bloemenregen.
        deeltjes.spetters(x - 0.9, z + 0.6, 2.6, y);
        deeltjes.spetters(x, z, 3.2, y);
        deeltjes.kring(x, z, 5, 1.8, y + 0.02);
        deeltjes.bloemenregen(x, y + 3, z, 40);
        setTimeout(() => geluid.plons(8), 90);
      }
      geluid.plons(6);
      animatie.land(0.5);
      ponyAnim.land(0.6);
      juichTijd = 0.9;
      return true;
    }
    case 'vlotKolk':
      // De kolk draait je rond: een zoef en een vrolijke hinnik.
      geluid.zoef();
      setTimeout(() => geluid.hinnik(true), 400);
      return true;
    case 'vlotBots': {
      const [x, y, z] = g.pos;
      deeltjes.spetters(x, z, 0.4 + g.sterkte * 0.8, y);
      geluid.vlotBots(g.sterkte, g.rots);
      return true;
    }
    case 'zwemtijgerSprong':
      return true;
    case 'zwemtijgerPlons': {
      const [x, y, z] = g.pos;
      deeltjes.spetters(x, z, 1.5, y);
      geluid.plons(3);
      zwemtijger.duik();
      return true;
    }
    case 'zwemtijgerVerschijnt': {
      const [x, y, z] = g.pos;
      deeltjes.spetters(x, z, 1, y);
      return true;
    }
    case 'inLagune':
    case 'vlotTerug':
      return true;
  }
  return false;
}

/** Beeld en geluid bij wat de pony doet. Geeft true als de gebeurtenis van de pony was. */
function ponyGebeurtenis(g) {
  const p = sim.pony(LOKAAL);
  const kop = () => {
    const s = RIJDEN.ponySchaal;
    return [p.pos[0] + Math.sin(p.richting) * 0.6 * s, p.pos[1] + 1.4 * s, p.pos[2] + Math.cos(p.richting) * 0.6 * s];
  };
  switch (g.soort) {
    case 'fluit':
      geluid.fluit();
      return true;
    case 'ponyErBij':
      ponyAnim.blij();
      geluid.hinnik(true);
      return true;
    case 'ponyWeg':
      deeltjes.blaadjes(g.pos[0], g.pos[1], g.pos[2], 20, [0x6fd35e, 0x9be37a, 0xff8cc6], 0.7);
      return true;
    case 'ponyVerschijnt':
      deeltjes.blaadjes(g.pos[0], g.pos[1], g.pos[2], 24, [0x6fd35e, 0x9be37a, 0xff8cc6], 0.8);
      geluid.hinnik();
      return true;
    case 'opstappen':
    case 'afstappen':
      rijOvergang = { t: 0, duur: 0.38, op: g.soort === 'opstappen', van: figuur.position.clone(), draai: figuur.quaternion.clone() };
      if (g.soort === 'opstappen') geluid.opstappen();
      else geluid.landing(2);
      return true;
    case 'ponySprong':
      geluid.ponySprong();
      return true;
    case 'ponyLanding':
      ponyAnim.land(g.snelheid / 7);
      animatie.land(Math.min(0.5, g.snelheid / 14));
      if (g.nat) {
        deeltjes.spetters(g.pos[0], g.pos[2], 1.3, g.pos[1]);
        geluid.plons(3);
      } else {
        deeltjes.stof(g.pos[0], g.pos[1], g.pos[2], EFFECTEN.stof);
        geluid.ponyLanding(g.snelheid, ponyOndergrond(p));
      }
      return true;
    case 'perfect': {
      deeltjes.bloemenregen(g.pos[0], g.pos[1], g.pos[2]);
      const [hx, hy, hz] = kop();
      deeltjes.hartjes(hx, hy, hz, 4);
      geluid.perfect();
      ponyAnim.blij();
      juichTijd = 1.1;
      return true;
    }
    case 'weigeren':
      ponyAnim.schud();
      geluid.weigeren();
      return true;
    case 'ponyTik':
      geluid.tik();
      return true;
    case 'ponyPlons':
      deeltjes.spetters(g.pos[0], g.pos[2], g.sterkte * 0.6, g.pos[1]);
      return true;
    case 'spoor':
      bloeispoor.voegToe(g.pos[0], g.pos[1], g.pos[2], g.keuze, g.draai);
      return true;
    case 'wortel':
      weidebeeld.pak(g.id);
      deeltjes.glinsters(g.pos[0], g.pos[1] + 0.3, g.pos[2], WEIDE.kleuren.wortel, 12);
      geluid.knabbel();
      hud.wortel();
      return true;
    case 'aai': {
      ponyAnim.blij();
      const [hx, hy, hz] = kop();
      deeltjes.hartjes(hx, hy, hz, 5);
      geluid.aai();
      if (g.rijdend) aaiTijd = 1.2;
      return true;
    }
    case 'rondeStart':
      hud.rondeStart();
      return true;
    case 'rondeHindernis':
      hud.hindernis(g.groep, g.perfect);
      geluid.hindernisTel(g.gedaan);
      return true;
    case 'rondeKlaar': {
      hud.rondeKlaar(g.tijd, g.perfect, g.record);
      geluid.rondeKlaar(g.record);
      const [hx, hy, hz] = kop();
      deeltjes.bloemenregen(hx, hy + 0.5, hz, 90);
      deeltjes.hartjes(hx, hy, hz, 6);
      return true;
    }
    case 'rondeStop':
      hud.rondeStop();
      return true;
    case 'hindernis':
      return true;
  }
  return false;
}

/** Gebeurtenissen van het speelbos (stap 11): lianen, springbloem, bladeren, voortgang. */
function bosGebeurtenis(g) {
  const s = sim.speler(LOKAAL);
  switch (g.soort) {
    case 'liaanGrijp':
      geluid.liaanGrijp(g.snelheid);
      deeltjes.blaadjes(g.pos[0], g.pos[1] + 1.6, g.pos[2], 5, [SPEELBOS.kleuren.liaanBlad, 0x9be86a], 0.4);
      animatie.land(0.25);
      return true;
    case 'liaanLos':
      geluid.zwaai(g.snelheid + 2);
      return true;
    case 'springbloemDruk':
      geluid.indrukken();
      return true;
    case 'springbloem':
      geluid.boing();
      deeltjes.blaadjes(g.pos[0], g.pos[1] + 0.2, g.pos[2], 14, [SPEELBOS.kleuren.springbloem, 0xffffff, SPEELBOS.kleuren.springHart], 0.9);
      return true;
    case 'bosStart':
      return true;
    case 'bosDek':
      if (g.schoon) {
        geluid.bosDek(g.dek);
        deeltjes.glinsters(g.pos[0], g.pos[1] + 1, g.pos[2], 0xfff3a0, 14);
      }
      return true;
    case 'bosVal':
      geluid.plof();
      return true;
    case 'bosKlaar': {
      hud.rondeKlaar(g.tijd, g.sterren, g.record);
      geluid.rondeKlaar(g.record);
      geluid.top();
      speelbosbeeld.luid();
      deeltjes.bloemenregen(g.pos[0], g.pos[1] + 2.5, g.pos[2], 110);
      deeltjes.hartjes(g.pos[0], g.pos[1] + 1.4, g.pos[2], 6);
      return true;
    }
    case 'landing': {
      // Op een blad of lotus: eigen geluidje (en de gewone landing erbij als het hard was).
      const bos = sim.wereld.parcours[s.parcours] ?? speelbos;
      const op = bos.waarOp(s);
      if (typeof op === 'string' && op.startsWith('m')) {
        const soort = bos.modules[+op.slice(1)].soort;
        if (soort === 'reuzenblad') geluid.blad();
        else if (soort === 'lotus') {
          geluid.lotus();
          deeltjes.spetters(s.pos[0], s.pos[2], 0.4, speelbos.peil);
        }
      }
      return false;
    }
  }
  return false;
}

// --- Spellus ---
/** Testcamera: een functie die [plek, kijkpunt] geeft, of null (gewoon de volgcamera). */
let testCamera = null;
/** Intentie die window.spel kan opleggen (voor tests); anders null. */
let opgelegd = null;
/** De testbot van het speelbos die het parcours voordoet (spel.bosBot()): { bot, i, tot }. */
let bosBot = null;
/** De bergbot (spel.bergBot()): loopt met de gewone loopregels langs het pad en de hellingbaan naar de top. */
let bergBot = null;
let tijd = 0;
let kringTijd = 0;
let bosRond = 0;
let ademTijd = 0;
let klimMix = 0;
const klimCam = { pos: new THREE.Vector3(), doel: new THREE.Vector3(), norm: new THREE.Vector3(0, 0, 1), raak: new THREE.Vector3(0, 1, 0), klaar: false };
const camNorm = new THREE.Vector3();
const camRaak = new THREE.Vector3();
const camA = [0, 0, 0];
const camPos = new THREE.Vector3();
const camDraai = new THREE.Quaternion();
const kijker = new THREE.PerspectiveCamera(); // alleen om te richten (lookAt van een camera kijkt langs -z)
const klimDoel = new THREE.Vector3();
const tekenpos = new THREE.Vector3();

const lus = maakSpellus({
  stap(dt) {
    // Beide altijd lezen, zodat een korte tik op een touchknop nooit verloren gaat.
    if (bosBot) {
      const s = sim.speler(LOKAAL);
      if (s.opGrond && speelbos.waarOp(s) === bosBot.i + 1) {
        if (bosBot.i + 1 < bosBot.tot) bosBot = { ...bosBot, i: bosBot.i + 1, bot: maakBot(speelbos, bosBot.i + 1, sim.wereld) };
        else {
          bosBot = null;
          opgelegd = null;
        }
      }
      if (bosBot) opgelegd = { fluit: false, ...bosBot.bot(s, sim.tik) };
    }
    if (bergBot) {
      const s = sim.speler(LOKAAL);
      const [dx, dz] = bergBot[0];
      const vx = dx - s.pos[0];
      const vz = dz - s.pos[2];
      const d = Math.hypot(vx, vz);
      if (d < 2.5) bergBot.shift();
      if (!bergBot.length) bergBot = opgelegd = null;
      else opgelegd = { beweeg: [vx / Math.max(d, 1e-3), vz / Math.max(d, 1e-3)], spring: false, actie: false, fluit: false, brul: false, aai: false, aaiTijger: false, aaiWelp: null };
    }
    let invoer = voegSamen(toetsenbord.lees(), touch.lees());
    // In vogelvlucht stuurt de invoer de camera; de speler blijft staan.
    if (vogel.aan || vlucht) {
      laatsteInvoer = invoer;
      invoer = stilInvoer;
    }
    const intentie = { ...(opgelegd ?? naarIntentie(invoer, volgcamera.hoek)) };
    if (aaiWacht) intentie.aai = true;
    aaiWacht = false;
    if (aaiTijgerWacht) intentie.aaiTijger = true;
    aaiTijgerWacht = false;
    if (aaiWelpWacht) intentie.aaiWelp = aaiWelpWacht;
    aaiWelpWacht = null;
    if (hud.leesBrul()) intentie.brul = true;
    // Klimmen: de besturing (tikken of handen), een gevraagde zet, laten zakken, en leunen met de joystick.
    intentie.besturing = klimbediening.besturing;
    if (sim.speler(LOKAAL).modus === 'klimmen') {
      const z = klimbediening.leesZet();
      if (z) {
        intentie.klimGreep = z.greep;
        intentie.klimLid = z.lid;
      }
      intentie.zakken = klimbediening.leesZakken();
      intentie.leun = [invoer.beweeg[0], invoer.beweeg[1]];
      // Aan de wand: R (of het pofzakje) is magnesium, niet brullen; de springknop is de dyno (stap 15a).
      intentie.magnesium = klimbediening.leesKrijt() || !!invoer.brul;
      intentie.brul = false;
    } else {
      klimbediening.leesZet();
      klimbediening.leesZakken();
      klimbediening.leesKrijt();
    }
    // Op het vlot: de joystick stuurt (links, rechts) en peddelt (vooruit, achteruit).
    if (sim.speler(LOKAAL).modus === 'varen') {
      intentie.peddel = opgelegd?.peddel ?? [invoer.beweeg[0], invoer.beweeg[1]];
      laatstePeddel = intentie.peddel;
    } else laatstePeddel = [0, 0];
    sim.stap({ [LOKAAL]: intentie }, dt);
    for (const g of sim.neemGebeurtenissen()) {
      if (g.soort === 'wortelTerug') weidebeeld.terug(g.id);
      if (g.speler !== LOKAAL) continue;
      if (ponyGebeurtenis(g)) continue;
      if (tijgerGebeurtenis(g)) continue;
      if (welpGebeurtenis(g)) continue;
      if (klimGebeurtenis(g)) continue;
      if (vaarGebeurtenis(g)) continue;
      if (bosGebeurtenis(g)) continue;
      if (g.soort === 'landing') {
        animatie.land(g.snelheid / 12);
        if (g.snelheid > 2) geluid.landing(g.snelheid);
        else geluid.stap(ondergrond(sim.speler(LOKAAL)), 0.5);
      } else if (g.soort === 'plons') {
        deeltjes.spetters(g.pos[0], g.pos[2], Math.min(1.6, 0.5 + g.snelheid / 6), g.pos[1]);
        geluid.plons(g.snelheid);
      } else if (g.soort === 'opklimmen') geluid.opklimmen();
      else if (g.soort === 'bloesem') {
        bloesems.pak(g.id);
        deeltjes.glinsters(g.pos[0], g.pos[1], g.pos[2], BLOESEMS.blaadjeKleur, 16);
        deeltjes.blaadjes(g.pos[0], g.pos[1] - 0.5, g.pos[2], 6, [BLOESEMS.blaadjeKleur, BLOESEMS.randKleur], 0.5);
        hud.bloesems(g.aantal);
        geluid.bloesem(g.reeks);
      } else if (g.soort === 'plof') deeltjes.blaadjes(g.pos[0], g.pos[1], g.pos[2]);
      else if (g.soort === 'terug') deeltjes.blaadjes(g.pos[0], g.pos[1], g.pos[2], 30, undefined, 0.8);
      else if (g.soort === 'sprong') {
        if (g.uitWater) {
          const p = sim.speler(LOKAAL).pos;
          deeltjes.spetters(p[0], p[2], 0.6);
          geluid.plons(0.5);
        } else geluid.sprong();
      }
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
    // Volledig rechtop zetten: na het rijden kan de draaiing van het zadel nog een kanteling rond x en z
    // bevatten (bv. x = z = π, wat samen een halve draai is). Alleen y zetten liet haar dan achterstevoren lopen.
    figuur.rotation.set(0, s.vorigeRichting + dr * overgang, 0);
    // Aan de liaan: ze hangt in het verlengde van het touw (en komt na het loslaten zacht weer rechtop).
    zwaaiBeeld += ((s.modus === 'slingeren' ? s.zwaai : 0) - zwaaiBeeld) * Math.min(1, dt * (s.modus === 'slingeren' ? 30 : 8));
    if (Math.abs(zwaaiBeeld) > 1e-3) figuur.rotation.x = -zwaaiBeeld;
    if (s.modus === 'slingeren') {
      const v = Math.hypot(s.vel[0], s.vel[1], s.vel[2]);
      zwaaiGeluid -= dt;
      if (v > 2.5 && zwaaiGeluid <= 0) {
        zwaaiGeluid = 0.9;
        geluid.zwaai(v);
      }
    }

    // --- De pony ---
    const p = sim.pony(LOKAAL);
    const rijdt = s.modus === 'rijden';
    ponyPos.set(
      p.vorigePos[0] + (p.pos[0] - p.vorigePos[0]) * overgang,
      p.vorigePos[1] + (p.pos[1] - p.vorigePos[1]) * overgang,
      p.vorigePos[2] + (p.pos[2] - p.vorigePos[2]) * overgang
    );
    let pr = p.richting - p.vorigeRichting;
    pr = Math.atan2(Math.sin(pr), Math.cos(pr));
    ponyHouder.position.copy(ponyPos);
    ponyHouder.rotation.y = p.vorigeRichting + pr * overgang;
    ponyAnim.werkBij(dt, p.gang, rijdt ? undefined : camera, {
      snelheid: Math.abs(p.snelheid) / RIJDEN.ponySchaal,
      lucht: !p.opGrond,
      vy: p.vel[1],
      graast: p.graast,
      achteruit: p.gang === 'terug',
    });
    {
      const pg = sim.wereld.terreinOp(ponyPos.x, ponyPos.z);
      const s0 = RIJDEN.ponySchaal * THREE.MathUtils.clamp(1 - (ponyPos.y - pg) / 4, 0.5, 1);
      ponySchaduw.visible = !K.schaduw && p.diepte < 0.3;
      ponySchaduw.position.set(ponyPos.x, pg + 0.03, ponyPos.z);
      ponySchaduw.rotation.y = ponyHouder.rotation.y;
      ponySchaduw.scale.set(0.4 * s0, 1, 0.78 * s0);
    }
    ponyHouder.updateMatrixWorld(true);
    zadel.getWorldPosition(zadelPos);
    zadel.getWorldQuaternion(zadelDraai);

    // De avonturier op de pony, of in een sprongetje op of af.
    if (rijOvergang) {
      rijOvergang.t += dt;
      const f = Math.min(1, rijOvergang.t / rijOvergang.duur);
      const e = f * f * (3 - 2 * f);
      if (rijOvergang.op) {
        figuur.position.lerpVectors(rijOvergang.van, zadelPos, e);
        figuur.quaternion.slerpQuaternions(rijOvergang.draai, zadelDraai, e);
      } else {
        const doel = figuur.quaternion.clone();
        figuur.position.lerpVectors(rijOvergang.van, tekenpos, e);
        figuur.quaternion.slerpQuaternions(rijOvergang.draai, doel, e);
      }
      figuur.position.y += Math.sin(f * Math.PI) * 0.55;
      if (f >= 1) rijOvergang = null;
    } else if (rijdt) {
      figuur.position.copy(zadelPos);
      figuur.quaternion.copy(zadelDraai);
    }
    // --- Het vlot (stap 10): zittend op het vlot, met de peddel; op en af in een sprongetje ---
    const v = sim.vlot(LOKAAL);
    const vaart = s.modus === 'varen';
    vlotbeeld.werkBij(v, overgang, dt, tijd, (w) => geluid.bamboe(Math.round(w * 8)));
    if (vaart) figuur.position.y += vlotbeeld.dobber - ZIT_ZAK;
    if (vaarOvergang) {
      vaarOvergang.t += dt;
      const f = Math.min(1, vaarOvergang.t / vaarOvergang.duur);
      const e = f * f * (3 - 2 * f);
      hopDoel.copy(figuur.position);
      figuur.position.lerpVectors(vaarOvergang.van, hopDoel, e);
      figuur.position.y += Math.sin(f * Math.PI) * 0.6;
      if (f >= 1) vaarOvergang = null;
    }
    const kracht = Math.max(0, laatstePeddel[1]) + Math.abs(laatstePeddel[0]) * 0.6;
    const slag = vlotbeeld.peddelBij(figuur, vaart && !vaarOvergang && !v.lucht, dt, Math.min(1, kracht), laatstePeddel[0], (x, y, z) => {
      deeltjes.spetters(x, z, 0.3 + kracht * 0.25, v.pos[1]);
      geluid.peddel(Math.min(1, 0.3 + kracht));
    });
    animatie.werkBij(s, dt, LOPEN.rensnelheid, rijdt
      ? { gang: p.gang, lucht: !p.opGrond, vy: p.vel[1], weigert: p.weigert > 0, juich: juichTijd, aai: aaiTijd }
      : undefined, vaart ? { slag: juichTijd > 0 ? 0 : slag, lucht: v.lucht || juichTijd > 0, hop: v.hop } : undefined);
    // De pony op het vlot: met haar zwemvestje, dobberend, en ze leunt mee in de bochten.
    const ponyOpVlot = p.modus === 'vlot';
    zwemvest.visible = ponyOpVlot || !!ponyHop;
    if (ponyOpVlot) {
      ponyHouder.position.y += vlotbeeld.dobber;
      let dr = v.richting - v.vorigeRichting;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      const doelLeun = THREE.MathUtils.clamp(-dr * 60 * Math.max(1, Math.abs(v.vs)) * 0.12, -0.28, 0.28);
      ponyLeun += (doelLeun - ponyLeun) * (1 - Math.exp(-4 * dt));
    } else ponyLeun *= Math.exp(-6 * dt);
    ponyHouder.rotation.z = ponyLeun;
    if (ponyHop) {
      ponyHop.t += dt;
      const f = Math.min(1, ponyHop.t / ponyHop.duur);
      const e = f * f * (3 - 2 * f);
      hopDoel.copy(ponyHouder.position);
      ponyHouder.position.lerpVectors(ponyHop.van, hopDoel, e);
      ponyHouder.position.y += Math.sin(f * Math.PI) * 0.9;
      if (f >= 1) ponyHop = null;
    }
    if (ponyOpVlot) ponySchaduw.visible = false;
    // De Sumatraanse tijger: alleen bijwerken als hij in de buurt van de camera is.
    const zt = sim.zwemtijger(LOKAAL);
    const ztDichtbij = (zt.pos[0] - camera.position.x) ** 2 + (zt.pos[2] - camera.position.z) ** 2 < 90 * 90;
    zwemtijger.houder.visible = ztDichtbij;
    if (ztDichtbij) zwemtijger.werkBij(zt, overgang, dt, camera);
    // Kielzog: kringen achter het vlot en de zwemmende tijger.
    if (vaart && !v.lucht && Math.hypot(v.vel[0], v.vel[2]) > 0.4) {
      kielTijd -= dt;
      if (kielTijd <= 0) {
        kielTijd = 0.3;
        const r = v.richting;
        deeltjes.kring(v.pos[0] - Math.sin(r) * 1.5, v.pos[2] - Math.cos(r) * 1.5, 1.4, 1.3, v.pos[1] + 0.02);
      }
    }
    if (ztDichtbij && !zt.lucht && zt.modus !== 'wacht') {
      zwemKielTijd -= dt;
      if (zwemKielTijd <= 0) {
        zwemKielTijd = 0.45;
        deeltjes.kring(zt.pos[0], zt.pos[2], 1.1, 1.2, zt.pos[1] + 0.02);
      }
    }
    // De bouwstukken in beeld zolang het vlot nog niet gebouwd is en je in de buurt van de bron bent.
    const bd = rivier.bovenDek;
    hud.bouw(!v.gebouwd && v.bouwt <= 0 && s.modus === 'lopen' && Math.hypot(s.pos[0] - bd.x, s.pos[2] - bd.z) < 30, VLOT.stukken.map((k) => k.soort), v.stukken);
    juichTijd = Math.max(0, juichTijd - dt);
    aaiTijd = Math.max(0, aaiTijd - dt);
    // Aan de klimwand: de klimster hangt aan haar grepen (en de witte tijger zekert).
    const klim = klimbediening.werkBij(dt);
    klimmer.werkBij(s, dt, camera, sim.wereld.terreinOp, klimbediening.hint);
    wandbeelden.forEach((b, wi) => {
      const nu = wi === huidigeWand;
      if ((s.klim && nu) || camera.position.distanceToSquared(wandPlek.set(...wanden[wi].midden)) < 60 * 60) {
        b.werkBij(dt, tijd, nu ? klim.licht : geenLicht, nu ? klim.flitsen : geenLicht);
      }
    });
    if (s.klim && Math.max(s.klim.hand.lh.pomp, s.klim.hand.rh.pomp) > KLIMMEN.kracht.trillenVanaf) {
      ademTijd -= dt;
      if (ademTijd <= 0) {
        ademTijd = 1.5;
        geluid.adem();
      }
    }
    weidebeeld.werkBij(tijd, dt);
    bloeispoor.werkBij(dt);

    // --- De tijger en de slaapbloem ---
    const tg = sim.tijger(LOKAAL);
    gezel.werkBij(tg, overgang, dt, camera, sim.wereld.terreinOp);
    welpjesbeeld.werkBij(overgang, dt, camera, sim.wereld.terreinOp);
    slaapbloembeeld.werkBij(dt, camera.position);
    hud.brulMeter(tg.vriend, s.brulMeter);

    // HUD: galopmeter, ronde, en wat de actieknop nu doet.
    hud.galop(rijdt, p.galop, p.galoppeert);
    if (s.ronde?.bezig) hud.rondeTijd(sim.tik / 60 - s.ronde.start);
    hud.werkBij();
    const wat = sim.actieVoor(LOKAAL);
    hud.actie(wat === 'afstappen' && Math.abs(p.snelheid) > 1.5 ? null : wat);
    touch.zetActie(wat ?? 'hand');

    const grond = sim.wereld.grondOp(tekenpos.x, tekenpos.z);
    // In het water: geen schaduw op de bodem, wel kringetjes rond het lijfje.
    const zwemt = s.modus === 'zwemmen';
    schaduw.visible = !K.schaduw && !zwemt && grond > -0.3 && !rijdt && !rijOvergang && !s.klim && !vaart && !vaarOvergang;
    if (zwemt) {
      kringTijd -= dt * (0.6 + Math.hypot(s.vel[0], s.vel[2]) * 0.4);
      if (kringTijd <= 0) {
        kringTijd = EFFECTEN.zwemKring;
        deeltjes.kring(tekenpos.x, tekenpos.z, 0.9, 1.4, sim.wereld.waterOp(tekenpos.x, tekenpos.z));
        if (Math.hypot(s.vel[0], s.vel[2]) > 0.4) geluid.zwemslag();
      }
    }
    const beeldSchaal = (window.innerHeight * pixel) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    deeltjes.werkBij(dt, beeldSchaal);

    // Omgevingsgeluid: branding dicht bij de zee, jungle tussen de bomen.
    sim.wereld.vorm.bodem(tekenpos.x, tekenpos.z, bodem);
    const zeeDichtbij = THREE.MathUtils.clamp(1 - Math.max(0, bodem.d) / 55, 0, 1);
    bosRond += (THREE.MathUtils.clamp(bodem.bos * 1.3 + bodem.kamp * 0.5, 0, 1) - bosRond) * Math.min(1, dt * 0.8);
    geluid.omgeving(zeeDichtbij, bosRond);
    // Het water van de rivier: luider dichtbij en als je snel vaart; de waterval raast.
    {
      let nabij = 0;
      let snel = 0;
      for (const r of [rivier, bergrivier]) {
        if (!r.naar(tekenpos.x, tekenpos.z, rivierPunt) || rivierPunt.s < r.sBegin - 3 || rivierPunt.s > r.sEinde + 2) continue;
        const e = Math.abs(rivierPunt.d) - r.breedte(rivierPunt.s);
        const n = THREE.MathUtils.clamp(1 - Math.max(0, e) / 22, 0, 1) * (rivierPunt.s < r.sMond + 4 ? 1 : 0.3);
        if (n <= nabij) continue;
        nabij = n;
        snel = vaart ? Math.min(1, Math.hypot(v.vel[0], v.vel[2]) / 4.2) : Math.min(1, Math.abs(r.stroom(rivierPunt.s, 0)) / 4.5);
      }
      let val = 0;
      for (const wv of watervallen) {
        const f = THREE.MathUtils.clamp(1 - Math.hypot(tekenpos.x - wv.x, tekenpos.y - wv.y, tekenpos.z - wv.z) / wv.bereik, 0, 1);
        val = Math.max(val, f * f * wv.sterkte);
      }
      geluid.rivier(nabij, snel, val);
    }
    bloesems.werkBij(tijd, dt, camera, beeldSchaal);
    schaduw.position.set(tekenpos.x, grond + 0.03, tekenpos.z);
    schaduw.scale.setScalar(THREE.MathUtils.clamp(1 - (tekenpos.y - grond) / 6, 0.4, 1));

    volgcamera.volg(tekenpos, s.vel[0], s.vel[2], rijdt ? RIJDEN.galop : vaart ? 2.6 : LOPEN.rensnelheid, dt, rijdt || vaart);
    // Aan de klimwand: de camera kijkt recht op de wand, met ±3 m wand rond de klimster (KL 11).
    const C = KLIMMEN.camera;
    klimMix = THREE.MathUtils.clamp(klimMix + (s.klim ? dt : -dt) / C.wissel, 0, 1);
    if (s.klim) {
      // Een beetje van onder en opzij: zo zie je de handjes boven het grote hoofd reiken. De camera draait mee met de
      // steilte (stap 15a): onder een dak zakt ze onder de klimster en kijkt ze schuin omhoog.
      const k = s.klim;
      const t = klimCam.klaar ? 1 - Math.exp(-C.volgen * dt) : 1;
      if (k.vrij || k.toestand === 'zakt') {
        camNorm.copy(rotsN);
        camRaak.set(0, 1, 0);
      } else {
        const v = k.P[1] + 0.25;
        rots.normaal(v, camA);
        camNorm.set(camA[0], camA[1], camA[2]);
        rots.raak(v, camA);
        camRaak.set(camA[0], camA[1], camA[2]);
      }
      const td = klimCam.klaar ? 1 - Math.exp(-C.draai * dt) : 1;
      klimCam.norm.lerp(camNorm, td).normalize();
      klimCam.raak.lerp(camRaak, td).normalize();
      klimDoel.set(s.pos[0], s.pos[1], s.pos[2]).addScaledVector(klimCam.raak, C.kijkHoger);
      klimCam.doel.lerp(klimDoel, t);
      // Onder een dak (de wand kijkt naar beneden): minder recht eronder en meer opzij en naar buiten, zodat je de
      // klimster van schuin onder echt ziet hangen (armen naar het dak, het lijf dat doorzakt).
      const onder = THREE.MathUtils.clamp(-klimCam.norm.y, 0, 1);
      klimDoel.set(s.pos[0], s.pos[1], s.pos[2]).addScaledVector(klimCam.raak, C.camHoger).addScaledVector(klimCam.norm, C.afstand * (1 - C.dakLager * onder)).addScaledVector(rotsR, C.opzij + C.dakOpzij * onder);
      klimDoel.addScaledVector(rotsN, C.dakUit * onder);
      const laagst = rots.voetHoogte + C.minHoogte;
      if (klimDoel.y < laagst) {
        klimDoel.addScaledVector(rotsN, (laagst - klimDoel.y) * 0.8);
        klimDoel.y = laagst;
      }
      klimCam.pos.lerp(klimDoel, t);
      klimCam.klaar = true;
    } else klimCam.klaar = false;
    if (klimMix > 0) {
      const m = klimMix * klimMix * (3 - 2 * klimMix);
      camPos.copy(camera.position);
      camDraai.copy(camera.quaternion);
      kijker.position.copy(klimCam.pos);
      kijker.lookAt(klimCam.doel);
      camera.position.lerpVectors(camPos, klimCam.pos, m);
      camera.quaternion.slerpQuaternions(camDraai, kijker.quaternion, m);
    }
    // De grote waterval (stap 14): een filmcamera opzij van de poel, halverwege de val, die het vlot volgt.
    // Ze blijft tot het vlot uit de poel vaart; daarna neemt de volgcamera het weer over (meteen op de goede plek,
    // anders hangt die nog boven op de rotsrand).
    if (vaart && v.lucht && v.sprong?.groot && !valCam.sp) {
      valCam.sp = v.sprong;
      valCam.tak = v.tak;
    }
    const opVal = !!valCam.sp && vaart && v.tak === valCam.tak && v.s < valCam.sp.s + valCam.sp.lengte + 11;
    if (valCam.sp && !opVal) {
      valCam.sp = null;
      volgcamera.herstel();
    }
    valMix = THREE.MathUtils.clamp(valMix + (opVal ? dt / 0.35 : -dt / 1.4), 0, 1);
    if (opVal && !valCam.klaar) {
      const r = sim.wereld.rivieren[v.tak];
      const sp = valCam.sp;
      const sCam = sp.s + sp.lengte + 9;
      let beste = null;
      for (const zij of [1, -1]) {
        const [x, z] = r.puntOp(sCam, zij * (r.breedte(sCam) + 5));
        const g = sim.wereld.grondOp(x, z);
        if (!beste || g < beste[1]) beste = [x, g, z];
      }
      valCam.pos.set(beste[0], Math.max(beste[1] + 2, r.peil(sCam) + sp.hoogte * 0.45), beste[2]);
      valCam.doel.copy(tekenpos);
      valCam.klaar = true;
    } else if (!opVal && valMix <= 0) valCam.klaar = false;
    if (valMix > 0 && valCam.klaar) {
      valCam.doel.lerp(tekenpos, 1 - Math.exp(-6 * dt));
      const m = valMix * valMix * (3 - 2 * valMix);
      camPos.copy(camera.position);
      camDraai.copy(camera.quaternion);
      kijker.position.copy(valCam.pos);
      kijker.lookAt(valCam.doel);
      camera.position.lerpVectors(camPos, valCam.pos, m);
      camera.quaternion.slerpQuaternions(camDraai, kijker.quaternion, m);
    }
    // Een vaste testcamera (alleen vanuit de console, om iets van dichtbij te bekijken).
    if (testCamera) {
      const [v, d] = testCamera();
      camera.position.set(...v);
      camera.lookAt(...d);
    }

    // Vogelvlucht of prestatievlucht: de camera vliegt vrij, en de wereld laadt rond de camera in plaats van rond de speler.
    if (vlucht) vlucht.werkBij(dt, camera, renderer.info);
    else if (vogel.aan) vogel.werkBij(dt, laatsteInvoer, volgcamera.hoek, volgcamera.kanteling, camera, sim.wereld.vorm.hoogte);
    const focus = vlucht ? vlucht.pos : vogel.aan ? vogel.pos : tekenpos;

    // De wereld rond de speler (of de vrije camera), en alles wat met de camera meeschuift.
    wereldbeeld.werkBij(focus.x, focus.z, camera);
    hemel.koepel.position.copy(camera.position);
    hemel.zon.position.copy(camera.position).addScaledVector(zonRichting, SCENE.zon.afstand);
    hemel.wolken.rotation.y = tijd * SCENE.wolken.draaisnelheid;
    // De gloed op de top: van ver een baken, van dichtbij weg (anders sta je er middenin).
    const gloedAfstand = camera.position.distanceTo(topGloed.position);
    topGloed.material.opacity = (0.75 + 0.25 * Math.sin(tijd * 1.3)) * THREE.MathUtils.smoothstep(gloedAfstand, 30, 80);
    WIND.uTijd.value = tijd;
    WIND.uWind.value = SCENE.wind.sterkte;
    WIND.uSpeler.value.copy(focus);
    zee.werkBij(tijd, camera);
    rivierbeeld.werkBij(tijd, dt, camera);
    bergrivierbeeld.werkBij(tijd, dt, camera);
    speelbosbeeld.werkBij(dt, camera);
    for (const b of oversteekbeelden) b.werkBij(dt, camera);
    stralen?.werkBij(tijd);
    stuifmeel.werkBij(tijd, camera, pixel);
    if (K.schaduw) {
      zonlicht.target.position.copy(focus);
      zonlicht.position.copy(focus).addScaledVector(lichtRichting, 70);
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
        `plek           ${tekenpos.x.toFixed(0)}, ${tekenpos.z.toFixed(0)}
` +
        `pony           ${p.gang} ${Math.abs(p.snelheid).toFixed(1)} m/s · bloeispoor ${bloeispoor.aantal}
` +
        `tijger         ${tg.modus}${tg.wacht ? ' (wacht)' : ''} ${tg.gang} ${tg.snelheid.toFixed(1)} m/s · brul ${Math.round(s.brulMeter * 100)}%` +
        (s.klim
          ? `
klimmen        wand ${s.klim.wand} · ${rots.routes[s.klim.route].graad} ${s.klim.toestand} · arm ${s.klim.armBelasting.toFixed(2)} · kracht ${Math.round(s.klim.hand.lh.pomp * 100)}/${Math.round(s.klim.hand.rh.pomp * 100)}%
               steilte ${s.klim.steilte.toFixed(2)} ${rots.zone?.(s.klim.P[1]) ?? ''} · open ${s.klim.zwaaiOpen.toFixed(2)}${s.klim.staat ? ' · staat' : ''}${s.klim.vleermuis ? ' · vleermuis' : ''}${s.klim.dyno ? ' · dyno ' + s.klim.dyno.fase : ''}${!s.klim.op.lv && !s.klim.op.rv ? ' · voeten los' : ''} · krijt ${s.klim.krijtBeurten}`
          : '') +
        (s.bos.dek >= 0
          ? `
speelbos       platform ${s.bos.dek}${s.bos.bezig ? ` · ${((sim.tik - s.bos.start) / 60).toFixed(1)} s · vallen ${s.bos.fouten.join('/')}` : ''}${s.modus === 'slingeren' ? ' · LIAAN ' + s.liaan.i : ''}`
          : '') +
        (s.modus === 'varen'
          ? `
vlot           ${v.plek} s ${v.s.toFixed(1)} d ${v.d.toFixed(1)} · ${Math.hypot(v.vel[0], v.vel[2]).toFixed(1)} m/s${v.lucht ? ' · SPRONG' : ''}`
          : '')
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
  kijker: camera, // de Three.js-camera zelf (om bv. een plek op het scherm te berekenen)
  deeltjes,
  geluid,
  get speler() {
    return sim.speler(LOKAAL);
  },
  /** Zet de speler op (x, z), op de grond. */
  zet(x, z) {
    const s = sim.speler(LOKAAL);
    sim.rijd(LOKAAL, false);
    const y = sim.wereld.grondOp(x, z);
    s.klimt = null;
    s.pos = [x, y, z];
    s.vorigePos = [x, y, z];
    s.vel = [0, 0, 0];
    s.opGrond = true;
  },
  /** Plof: terug naar de laatste veilige grond. */
  terug() {
    sim.terug(LOKAAL);
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
  get pony() {
    return sim.pony(LOKAAL);
  },
  /** Zet de pony op (x, z) met kijkrichting `richting` (radialen). */
  zetPony(x, z, richting = 0) {
    sim.zetPony(LOKAAL, x, z, richting);
  },
  /** Meteen op de pony (true) of eraf (false). */
  rijd(aan = true) {
    sim.rijd(LOKAAL, aan);
  },
  /** Zet pony en speler vlak voor de bloemenboog van de springweide, klaar om een ronde te rijden. */
  naarWeide(opPony = true) {
    const W = sim.wereld.weide;
    const p = W.baanPunt(WEIDE.start - 7);
    const [x, z] = W.naarWereld(p.u, p.v);
    const r = Math.atan2(W.su * p.tu, p.tv);
    this.zet(x - Math.cos(r) * 1.6, z + Math.sin(r) * 1.6);
    sim.speler(LOKAAL).richting = r;
    sim.zetPony(LOKAAL, x, z, r);
    if (opPony) sim.rijd(LOKAAL, true);
    volgcamera.zet(r + Math.PI, CAMERA.kanteling);
  },
  bloeispoor,
  get tijger() {
    return sim.tijger(LOKAAL);
  },
  /** De welpjes bij mama (plek, modus). */
  get welpjes() {
    return sim.welpjesVan(LOKAAL);
  },
  /**
   * Testcamera: kijk van dichtbij naar welpje i (of naar een punt [x, y, z]), vanaf `afstand` meter en
   * onder hoek `hoek` (radialen rond de verticale as). spel.testCamera() zet de gewone camera terug.
   */
  testCamera(i, afstand = 3, hoek = 0, hoogte = 1.2) {
    if (i === undefined) return void (testCamera = null);
    testCamera = () => {
      const p = typeof i === 'number' ? sim.welpjesVan(LOKAAL)[i].pos : i;
      const d = [p[0], p[1] + 0.3, p[2]];
      return [[d[0] + Math.sin(hoek) * afstand, d[1] + hoogte, d[2] + Math.cos(hoek) * afstand], d];
    };
  },
  /** Het takje bij mama (stap 8d). */
  get tak() {
    return sim.takVan(LOKAAL);
  },
  /**
   * Een schatjesmoment van de welpjes (stap 8c), om te testen: 'nies', 'hik' of 'struikel' voor welpje i (0, 1, 2),
   * of 'huh' en 'meebrul' voor alle drie. Bv. spel.welpMoment('nies', 1).
   * Spelletjes (stap 8d): 'staart' (welpje i), 'verstop' (welpje i zoekt) en 'tak' (welpje i en een ander).
   */
  welpMoment(soort, i = 0) {
    sim.welpMoment(LOKAAL, soort, i);
  },
  /** Aai een welpje (0, 1 of 2), zoals een tik erop. */
  aaiWelp(i = 0) {
    aaiWelpWacht = sim.welpjesVan(LOKAAL)[i]?.id ?? null;
  },
  /** Zet de tijger op (x, z); modus bv. 'volg' of 'gids' (dan is hij meteen je vriend). */
  zetTijger(x, z, richting = 0, modus) {
    sim.zetTijger(LOKAAL, x, z, richting, modus);
  },
  /** De slaapbloemen (plek, open, schat). */
  get slaapbloemen() {
    return sim.wereld.slaapbloemen;
  },
  /** Drukt één keer op de brulknop. */
  brul() {
    const vorig = opgelegd;
    opgelegd = { ...(vorig ?? { beweeg: [0, 0], spring: false, actie: false, fluit: false }), brul: true };
    this.speel(1);
    opgelegd = vorig;
  },
  /** Zet de speler aan de voet van route ri van de oefenrots (0 = geel 3, 1 = turkoois 5, 2 = koraal 6a). */
  naarRots(ri = 0) {
    const r0 = sim.wereld.oefenrots;
    const v = r0.routes[ri].voet;
    this.zet(v[0], v[2]);
    const s = sim.speler(LOKAAL);
    s.richting = s.vorigeRichting = Math.atan2(-r0.N[0], -r0.N[2]);
    volgcamera.zet(Math.atan2(r0.N[0], r0.N[2]), CAMERA.kanteling);
  },
  /** Meteen beginnen klimmen op route ri van wand wi (0 = de oefenrots), met besturing 'tikken' of 'handen'. */
  klim(ri = 0, besturing = klimbediening.besturing, wi = 0) {
    sim.klim(LOKAAL, ri, besturing, wi);
  },
  /** Zet de speler aan de voet van de dakroute op de dakvleugel van de oefenrots (stap 15a). */
  naarDak() {
    const d = sim.wereld.dakrots;
    const v = d.routes[0].voet;
    this.zet(v[0], v[2]);
    const s = sim.speler(LOKAAL);
    s.richting = s.vorigeRichting = Math.atan2(-d.N[0], -d.N[2]);
    volgcamera.zet(Math.atan2(d.N[0], d.N[2]), CAMERA.kanteling);
  },
  /** Meteen beginnen klimmen op de dakroute (stap 15a). */
  klimDak(besturing = klimbediening.besturing) {
    sim.klim(LOKAAL, 0, besturing, sim.dakWand);
  },
  /** De dakvleugel: grepen, profiel en de wandkaart (stap 15a). */
  get dakrots() {
    return sim.wereld.dakrots;
  },
  /** Het bergplan (stap 13): plekken, scheidingen en doorgangen (met waar ze liggen). */
  get bergplan() {
    return sim.wereld.bergplan;
  },
  /** Alle klimwanden: 0 = de oefenrots, daarna de klimwanden van de berg. */
  wanden,
  /**
   * Meteen bij doorgang vi van het bergplan ('v3', of een soort: 'klimwand', 'ponypad', 'touwbrug', ...):
   * onderaan (of bovenaan, met boven = true).
   */
  naarDoorgang(vi = 'klimwand', boven = false) {
    const lijst = sim.wereld.bergplan.verbindingen;
    // 'rivieroversteek': een oversteek over de rivier (stap 14b); 'steiger': de steiger op de etage.
    const v = lijst.find((q) => q.id === vi) ??
      (vi === 'rivieroversteek' ? lijst.find((q) => q.overRivier && q.geplaatst) : null) ??
      (vi === 'steiger' ? lijst.find((q) => q.soort === 'rivier' && q.steiger === 'etage' && q.geplaatst) : null) ??
      lijst.find((q) => q.soort === vi && q.geplaatst);
    if (!v || !sim.naarVerbinding(LOKAAL, v.id, boven)) return null;
    const s = sim.speler(LOKAAL);
    volgcamera.zet(s.richting + Math.PI, CAMERA.kanteling);
    wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
    return v;
  },
  /** Tik op greep id (of sleep hand lid ernaartoe). */
  klimGreep(id, lid = null) {
    sim.klimGreep(LOKAAL, id, lid);
  },
  /** De oefenrots: grepen, routes en de wandkaart. */
  rots,
  /** De benedenrivier (stap 10). */
  rivier,
  get vlot() {
    return sim.vlot(LOKAAL);
  },
  get zwemtijger() {
    return sim.zwemtijger(LOKAAL);
  },
  /** De rivier over de berg (stap 14). */
  bergrivier,
  /** Meteen op het vlot (het vlot is dan gebouwd), met de pony: aan de bron, of aan 'top', 'etage' of 'laag'. */
  vaar(steiger = 'bron') {
    sim.vaar(LOKAAL, steiger);
  },
  /** De vaarbot: vaart met de spelregels van een steiger tot in de lagune (in de achtergrond, zonder beeld). */
  vaarBot(steiger = 'top', arm) {
    const proef = maakSim(INSTELLINGEN.berg);
    proef.voegSpelerToe('bot');
    const r = vaarProef(proef, steiger, { id: 'bot', arm });
    console.log(r);
    return r;
  },
  /** Zet de speler bij een steiger van de bergrivier ('top', 'etage' of 'laag'). */
  naarBergrivier(naam = 'etage') {
    const st = bergrivier.steigers.find((k) => k.naam === naam) ?? bergrivier.steigers[0];
    const k = st.dek;
    this.zet(k.x - k.az * st.zijde * 2.6, k.z + k.ax * st.zijde * 2.6);
    const s = sim.speler(LOKAAL);
    s.richting = s.vorigeRichting = Math.atan2(k.ax, k.az);
    volgcamera.zet(Math.atan2(-k.ax, -k.az), CAMERA.kanteling);
  },
  /** Het bruggetje over de rivier in het laagland (stap 14b): zet de speler ervoor, met de neus naar de brug. */
  naarBrug(kant = 0) {
    const br = bergrivier.brug;
    if (!br) return null;
    const [x, z] = br.ingangen[kant];
    const [ox, oz] = br.ingangen[1 - kant];
    const lx = x + (x - ox) * (3 / (2 * br.halfL));
    const lz = z + (z - oz) * (3 / (2 * br.halfL));
    this.zet(lx, lz);
    const s = sim.speler(LOKAAL);
    s.richting = s.vorigeRichting = Math.atan2(ox - x, oz - z);
    volgcamera.zet(s.richting + Math.PI, CAMERA.kanteling);
    return br;
  },
  /** Laat de avonturier (of de pony, als je erop zit) met de gewone regels over het bruggetje lopen. */
  brugBot(kant = 0) {
    const br = bergrivier.brug;
    if (!br) return null;
    const [ax, az] = br.ingangen[kant];
    const [bx, bz] = br.ingangen[1 - kant];
    const dx = (bx - ax) / (2 * br.halfL);
    const dz = (bz - az) / (2 * br.halfL);
    bergBot = [[ax, az], [br.x, br.z], [bx + dx * 3, bz + dz * 3]];
    return bergBot;
  },
  /** Zet de speler op de steiger aan de bron van de rivier. */
  naarRivier() {
    const k = rivier.bovenDek;
    this.zet(k.x - k.az * rivier.padZijde * 2.2, k.z + k.ax * rivier.padZijde * 2.2);
    const s = sim.speler(LOKAAL);
    s.richting = s.vorigeRichting = Math.atan2(k.ax, k.az);
    volgcamera.zet(Math.atan2(-k.ax, -k.az), CAMERA.kanteling);
  },
  /** Het speelbos (stap 11): platforms en doorgangen. */
  speelbos,
  /** Meteen aan het begin van doorgang i (0 lianen, 1 touwbrug, 2 balanceerstam, 3 springbloem, 4 reuzenblad, 5 lotus). */
  naarBos(i = 0) {
    sim.naarBos(LOKAAL, i);
    const m = speelbos.modules[i];
    volgcamera.zet(Math.atan2(-m.a[0], -m.a[1]), CAMERA.kanteling);
    const s = sim.speler(LOKAAL);
    wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
  },
  /**
   * De testbot doet het speelbos voor, in het echte spel: doorgang i (of zonder getal: het hele parcours).
   * spel.bosBot(null) stopt hem.
   */
  bosBot(i) {
    if (i === null) {
      bosBot = null;
      opgelegd = null;
      return;
    }
    const van = i ?? 0;
    sim.naarBos(LOKAAL, van);
    bosBot = { bot: maakBot(speelbos, van, sim.wereld), i: van, tot: i === undefined ? speelbos.modules.length : van + 1 };
  },
  /** Zet de speler aan de voet van de trap naar het speelbos. */
  naarSpeelbos() {
    const t = speelbos.trap;
    const x = t.o[0] + t.a[0] * (t.len + 1.5);
    const z = t.o[1] + t.a[1] * (t.len + 1.5);
    this.zet(x, z);
    const s = sim.speler(LOKAAL);
    s.richting = s.vorigeRichting = Math.atan2(-t.a[0], -t.a[1]);
    volgcamera.zet(Math.atan2(t.a[0], t.a[1]), CAMERA.kanteling);
  },
  /**
   * Naar de berg (stap 12): 'helling' = onderaan de hellingbaan, 'etage' = bovenaan, 'top' = op de top,
   * 'zee' = op het water voor het kamp (om de berg te zien liggen).
   */
  naarBerg(waar = 'top') {
    const e = sim.wereld.vorm.eiland;
    const hb = e.hellingbaan;
    let x = e.top.x;
    let z = e.top.z - e.top.plateau + 1;
    let kijk = Math.PI; // de camera aan de zeekant: je kijkt naar de berg
    if (waar === 'helling') {
      x = hb.x0 - hb.ex * 6;
      z = hb.z0 - hb.ez * 6;
      kijk = Math.atan2(-hb.ex, -hb.ez);
    } else if (waar === 'etage') {
      x = hb.x1 + hb.ex * 4;
      z = hb.z1 + hb.ez * 4;
      kijk = Math.atan2(-hb.ex, -hb.ez);
    } else if (waar === 'top') kijk = 0; // op de top: kijken naar de zee en het kamp
    this.zet(x, z);
    volgcamera.zet(kijk, CAMERA.kanteling);
  },
  /** Laat de avonturier met de gewone loopregels naar de top lopen: langs het zandpaadje en de hellingbaan. */
  bergBot() {
    const e = sim.wereld.vorm.eiland;
    const hb = e.hellingbaan;
    const s = sim.speler(LOKAAL);
    const opEtage = Math.hypot(s.pos[0] - e.midden.x, s.pos[2] - e.midden.z) < e.randStraal(Math.atan2(s.pos[0] - e.midden.x, e.midden.z - s.pos[2]));
    bergBot = opEtage ? [] : [[e.pad.x0, e.pad.z0], [e.pad.x1, e.pad.z1], [hb.x0, hb.z0], [hb.x1, hb.z1]];
    bergBot.push([e.top.x, e.top.z]);
    if (!opEtage && Math.hypot(s.pos[0] - e.pad.x0, s.pos[2] - e.pad.z0) > Math.hypot(s.pos[0] - hb.x0, s.pos[2] - hb.z0)) bergBot.splice(0, 2);
  },
  /** De afsteltabellen, live aan te passen vanuit de console (bv. spel.afstel.CAMERA.afstand = 3). */
  afstel: { CAMERA, TESTFIGUUR, ANIMATIE, EFFECTEN, BLOESEMS, GELUID, LOPEN, SCENE, WERELD, FLORA, K, RIJDEN, WEIDE, GEZEL, WELPJES, KLIMMEN, RIVIER, VLOT, ZWEMTIJGER, SPEELBOS, EILAND, BERGPLAN },
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

// Snelkoppeling ?plek=weide: meteen bij de springweide beginnen, naast de pony (TP 9).
if (INSTELLINGEN.plek === 'weide') {
  window.spel.naarWeide(false);
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
// ?plek=rivier: meteen aan de bron van de rivier, bij de steiger (stap 10).
if (INSTELLINGEN.plek === 'rivier') {
  window.spel.naarRivier();
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
// ?plek=bergrivier (of ?plek=bergrivier-top, -etage, -laag): bij een steiger van de rivier over de berg (stap 14).
if (INSTELLINGEN.plek?.startsWith('bergrivier')) {
  window.spel.naarBergrivier(INSTELLINGEN.plek.split('-')[1] ?? 'etage');
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
// ?plek=brug: voor het bruggetje over de rivier in het laagland (stap 14b).
if (INSTELLINGEN.plek === 'brug') {
  window.spel.naarBrug();
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
// ?plek=bos: aan de voet van de trap naar het speelbos; ?doorgang=liaan (of touwbrug, ...): meteen aan die doorgang (stap 11).
// ?doorgang=v3 of ?doorgang=klimwand (ponypad, ...; met -boven: bovenaan): meteen bij een doorgang van de berg (stap 13).
{
  const doorgang = new URLSearchParams(location.search).get('doorgang');
  const i = speelbos.modules.findIndex((m) => m.soort === doorgang);
  const berg = doorgang && (/^v\d+/.test(doorgang) || ['klimwand', 'ponypad', 'rivieroversteek', 'steiger'].includes(doorgang.replace(/-boven$/, '')) || doorgang.startsWith('ravijn-'));
  if (berg) {
    const naam = doorgang.replace(/-boven$/, '').replace(/^ravijn-/, '');
    window.spel.naarDoorgang(naam, doorgang.endsWith('-boven'));
  } else if (i >= 0) window.spel.naarBos(i);
  else if (INSTELLINGEN.plek === 'bos') {
    window.spel.naarSpeelbos();
    const s = sim.speler(LOKAAL);
    wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
  }
}
// ?plek=helling, ?plek=etage of ?plek=top: meteen op de berg (stap 12).
if (['helling', 'etage', 'top'].includes(INSTELLINGEN.plek)) {
  window.spel.naarBerg(INSTELLINGEN.plek);
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
// ?plek=dak: meteen aan de voet van de dakroute op de dakvleugel van de oefenrots (stap 15a).
if (INSTELLINGEN.plek === 'dak') {
  window.spel.naarDak();
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
// ?plek=rots: meteen aan de voet van de oefenrots (stap 9).
if (INSTELLINGEN.plek === 'rots') {
  window.spel.naarRots(1);
  const s = sim.speler(LOKAAL);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
}
