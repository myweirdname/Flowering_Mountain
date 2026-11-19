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
import { maakVerreBerg } from './beeld/maak/berg.js';
import { maakLichtstralen, maakStuifmeel } from './beeld/sfeer.js';
import { maakWereldbeeld } from './beeld/wereldbeeld.js';
import { maakGrens } from './beeld/grens.js';
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
const grens = maakGrens(sim.wereld.vorm.hoogte, WERELD.speelGrens, WERELD.grensLint);
scene.add(grens.lint, grens.gordijn);
const zee = maakZee(sim.wereld.vorm.hoogte, SCENE, zonRichting, K.detail === 0);
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
  if (sim.wereld.rotsOp(x, z) > raster.hoogteOp(x, z) + 0.03) return 'rots';
  sim.wereld.vorm.bodem(x, z, bodem);
  if (bodem.h < 0.05 || sim.wereld.weide.water(x, z) > bodem.h) return 'water';
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
// Op- en afstappen: een sprongetje van de grond naar het zadel (of terug).
let rijOvergang = null;
let juichTijd = 0;
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
  if (!bomen.length) return lengte;
  const stap = 0.25;
  for (let d = 0.8; d <= lengte; d += stap) {
    const f = d / lengte;
    const x = van.x + dx * f;
    const y = van.y + dy * f;
    const z = van.z + dz * f;
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

// Tik (of klik) op de pony: aaien.
let aaiWacht = false;
const tikken = new Map();
const straal = new THREE.Ray();
const ponyMidden = new THREE.Vector3();
canvas.addEventListener('pointerdown', (e) => tikken.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener('pointerup', (e) => {
  const t = tikken.get(e.pointerId);
  tikken.delete(e.pointerId);
  if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12 || performance.now() - t.t > 450) return;
  // Een straal vanuit de camera door de tik: raakt hij het lijf of het hoofd van de pony?
  const ndc = new THREE.Vector3((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, 0.5).unproject(camera);
  straal.origin.copy(camera.position);
  straal.direction.copy(ndc).sub(camera.position).normalize();
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

// Alles rond het startpunt meteen klaarzetten, zodat het eerste beeld al vol is.
{
  const s = sim.speler(LOKAAL);
  volgcamera.volg(new THREE.Vector3(...s.pos), 0, 0, LOPEN.rensnelheid, 0);
  wereldbeeld.werkBij(s.pos[0], s.pos[2], camera, true);
  // Alle shaders nu al klaarmaken, zodat er onderweg nooit een hapering komt als iets voor het eerst in beeld komt.
  renderer.compile(scene, camera);
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

// --- Spellus ---
/** Intentie die window.spel kan opleggen (voor tests); anders null. */
let opgelegd = null;
let tijd = 0;
let kringTijd = 0;
let bosRond = 0;
const tekenpos = new THREE.Vector3();

const lus = maakSpellus({
  stap(dt) {
    // Beide altijd lezen, zodat een korte tik op een touchknop nooit verloren gaat.
    const invoer = voegSamen(toetsenbord.lees(), touch.lees());
    const intentie = { ...(opgelegd ?? naarIntentie(invoer, volgcamera.hoek)) };
    if (aaiWacht) intentie.aai = true;
    aaiWacht = false;
    sim.stap({ [LOKAAL]: intentie }, dt);
    for (const g of sim.neemGebeurtenissen()) {
      if (g.soort === 'wortelTerug') weidebeeld.terug(g.id);
      if (g.speler !== LOKAAL) continue;
      if (ponyGebeurtenis(g)) continue;
      if (g.soort === 'landing') {
        animatie.land(g.snelheid / 12);
        if (g.snelheid > 2) geluid.landing(g.snelheid);
        else geluid.stap(ondergrond(sim.speler(LOKAAL)), 0.5);
      } else if (g.soort === 'plons') {
        deeltjes.spetters(g.pos[0], g.pos[2], Math.min(1.6, 0.5 + g.snelheid / 6));
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
    figuur.rotation.y = s.vorigeRichting + dr * overgang;

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
    animatie.werkBij(s, dt, LOPEN.rensnelheid, rijdt
      ? { gang: p.gang, lucht: !p.opGrond, vy: p.vel[1], weigert: p.weigert > 0, juich: juichTijd, aai: aaiTijd }
      : undefined);
    juichTijd = Math.max(0, juichTijd - dt);
    aaiTijd = Math.max(0, aaiTijd - dt);
    weidebeeld.werkBij(tijd, dt);
    bloeispoor.werkBij(dt);

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
    schaduw.visible = !K.schaduw && !zwemt && grond > -0.3 && !rijdt && !rijOvergang;
    if (zwemt) {
      kringTijd -= dt * (0.6 + Math.hypot(s.vel[0], s.vel[2]) * 0.4);
      if (kringTijd <= 0) {
        kringTijd = EFFECTEN.zwemKring;
        deeltjes.kring(tekenpos.x, tekenpos.z, 0.9, 1.4);
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
    bloesems.werkBij(tijd, dt, camera, beeldSchaal);
    schaduw.position.set(tekenpos.x, grond + 0.03, tekenpos.z);
    schaduw.scale.setScalar(THREE.MathUtils.clamp(1 - (tekenpos.y - grond) / 6, 0.4, 1));

    volgcamera.volg(tekenpos, s.vel[0], s.vel[2], rijdt ? RIJDEN.galop : LOPEN.rensnelheid, dt, rijdt);

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
    grens.werkBij(tijd);
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
        `plek           ${tekenpos.x.toFixed(0)}, ${tekenpos.z.toFixed(0)}
` +
        `pony           ${p.gang} ${Math.abs(p.snelheid).toFixed(1)} m/s · bloeispoor ${bloeispoor.aantal}`
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
  /** De afsteltabellen, live aan te passen vanuit de console (bv. spel.afstel.CAMERA.afstand = 3). */
  afstel: { CAMERA, TESTFIGUUR, ANIMATIE, EFFECTEN, BLOESEMS, GELUID, LOPEN, SCENE, WERELD, FLORA, K, RIJDEN, WEIDE },
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
