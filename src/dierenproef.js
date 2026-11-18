// Dierenproef (BOUWPLAN stap 6): een draaitafel om de pony en de tijgers los te bekijken,
// met stap- en drafanimatie, knipperen, oren en staart. Open dieren.html.
// Slepen = rondkijken, scrollen of knijpen = in- en uitzoomen, tik op een dier = blij dier.
// Snelkoppelingen: ?dier=pony|bengaals|wit|goud|alle  ?gang=stil|stap|draf  ?debug=1  ?kwaliteit=laag
import * as THREE from 'three';
import { INSTELLINGEN } from './kern/instellingen.js';
import { KWALITEIT } from './data/kwaliteit.js';
import { SCENE } from './data/scene.js';
import { PONY, TIJGERVORM, TIJGERS } from './data/dieren.js';
import { TESTFIGUUR } from './data/figuur.js';
import { maakPony } from './beeld/maak/pony.js';
import { maakTijger } from './beeld/maak/tijger.js';
import { maakTestfiguur } from './beeld/maak/testfiguur.js';
import { maakHibiscus } from './beeld/maak/hibiscus.js';
import { maakDierAnimatie } from './beeld/dierAnimatie.js';
import { maakAnimatie } from './beeld/animatie.js';
import { maakDebugscherm } from './ui/debug.js';

const K = KWALITEIT[INSTELLINGEN.kwaliteit];
const url = new URLSearchParams(location.search);

// --- Beeld ---
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('spelbeeld'));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, K.pixelverhouding ?? 2));
const schaduw = INSTELLINGEN.kwaliteit !== 'laag';
if (schaduw) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

// Hemel: een zacht verloop van snoepblauw naar licht aan de horizon.
{
  const g = new THREE.SphereGeometry(80, 24, 12);
  const kleur = new Float32Array(g.attributes.position.count * 3);
  const a = new THREE.Color(SCENE.hemel.zenit);
  const b = new THREE.Color(SCENE.hemel.horizon);
  const c = new THREE.Color();
  for (let i = 0; i < g.attributes.position.count; i++) {
    const y = g.attributes.position.getY(i) / 80;
    c.copy(b).lerp(a, THREE.MathUtils.smoothstep(y, 0.0, 0.7));
    kleur.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(kleur, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })));
}

scene.add(new THREE.HemisphereLight(SCENE.hemelLicht, SCENE.grondLicht, SCENE.hemelLichtSterkte));
const zon = new THREE.DirectionalLight(SCENE.zonkleur, SCENE.zonsterkte);
zon.position.set(-3, 7, 5);
scene.add(zon);
if (schaduw) {
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  const c = zon.shadow.camera;
  c.left = c.bottom = -4.5;
  c.right = c.top = 4.5;
  c.near = 1;
  c.far = 20;
  zon.shadow.bias = -0.0005;
  zon.shadow.normalBias = 0.03;
  zon.shadow.intensity = 0.45;
}

// --- De draaitafel: een rond grasplateau met bloemetjes langs de rand ---
const tafel = new THREE.Group();
scene.add(tafel);
const TAFEL_R = 3.2;
{
  const gras = new THREE.Mesh(
    new THREE.CylinderGeometry(TAFEL_R, TAFEL_R, 0.16, 64),
    new THREE.MeshLambertMaterial({ color: 0x9be37a })
  );
  gras.position.y = -0.08;
  gras.receiveShadow = true;
  tafel.add(gras);
  const rand = new THREE.Mesh(
    new THREE.TorusGeometry(TAFEL_R, 0.1, 10, 72),
    new THREE.MeshLambertMaterial({ color: 0xfff1f8, emissive: 0xfff1f8, emissiveIntensity: 0.2 })
  );
  rand.rotation.x = Math.PI / 2;
  rand.position.y = -0.02;
  tafel.add(rand);
  const voet = new THREE.Mesh(
    new THREE.CylinderGeometry(TAFEL_R * 0.98, TAFEL_R * 0.9, 0.5, 64),
    new THREE.MeshLambertMaterial({ color: 0xffc6e0 })
  );
  voet.position.y = -0.4;
  tafel.add(voet);
  // Bloemetjes en polletjes gras langs de rand.
  const kleuren = [0xff5fa2, 0xffb03a, 0xb87cff, 0xff7a7a, 0xffe14d];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.1;
    const r = TAFEL_R - 0.28 - (i % 3) * 0.08;
    if (i % 2 === 0) {
      const bloem = maakHibiscus({
        blaadjeKleur: kleuren[i % kleuren.length],
        hartKleur: 0xc0104e,
        stijlKleur: 0xffd0e0,
        stuifmeelKleur: 0xffe14d,
        grootte: 0.14,
        kom: 0.12,
        openheid: 0.0,
        stijl: 0.5,
      });
      bloem.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
      bloem.rotation.set(0.2, -a, 0);
      tafel.add(bloem);
    } else {
      const pol = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), new THREE.MeshLambertMaterial({ color: 0x6fcf5a }));
      pol.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      tafel.add(pol);
    }
  }
}

function schaduwVlek(straal, lengte) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.22, depthWrite: false })
  );
  m.scale.set(straal, lengte, 1);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  return m;
}

// --- De dieren ---
/** @type {{ sleutel: string, naam: string, kleur: string, dier: any, anim: any, houder: THREE.Group }[]} */
const dieren = [];
function voegDierToe(sleutel, naam, kleur, dier, i) {
  const houder = new THREE.Group();
  houder.add(dier.groep);
  houder.add(schaduwVlek(dier.breedte * 0.95, dier.lengte * 0.5));
  dier.mesh.castShadow = schaduw;
  tafel.add(houder);
  dieren.push({ sleutel, naam, kleur, dier, anim: maakDierAnimatie(dier, i + 1), houder });
}
const hex = (c) => '#' + new THREE.Color(c).getHexString();
voegDierToe('pony', PONY.naam, hex(PONY.vachtKleur), maakPony(PONY), 0);
Object.entries(TIJGERS).forEach(([sleutel, T], i) => {
  voegDierToe(sleutel, T.naam, hex(T.vachtKleur), maakTijger(TIJGERVORM, T, i), i + 1);
});

// De avonturier, om te zien hoe groot de dieren zijn (alleen bij "allemaal").
const meisje = maakTestfiguur(TESTFIGUUR);
const meisjeAnim = maakAnimatie(meisje);
const meisjeHouder = new THREE.Group();
meisjeHouder.add(meisje.figuur, meisje.schaduw);
meisje.schaduw.position.y = 0.004;
tafel.add(meisjeHouder);
const meisjeToestand = { vel: [0, 0, 0], modus: 'lopen', opGrond: true, glijdt: false, klimt: null };

// --- Keuze: welk dier en welke gang ---
let keuze = ['pony', 'bengaals', 'wit', 'goud', 'alle'].includes(url.get('dier')) ? url.get('dier') : 'pony';
let gang = /** @type {'stil'|'stap'|'draf'} */ (['stil', 'stap', 'draf'].includes(url.get('gang')) ? url.get('gang') : 'stap');
let draaien = url.get('draai') !== '0';

const cam = { hoek: 0.6, hoogte: 0.32, afstand: 3.4, doel: new THREE.Vector3(0, 0.6, 0) };
const camDoel = { ...cam, doel: cam.doel.clone() };

function zetKeuze(k) {
  keuze = k;
  const alle = k === 'alle';
  // In een rij, van klein naar groot, met de avonturier ernaast.
  const rij = ['pony', 'bengaals', 'wit', 'goud'];
  dieren.forEach((d) => {
    d.houder.visible = alle || d.sleutel === k;
    if (alle) d.houder.position.set((rij.indexOf(d.sleutel) - 1.2) * 1.05, 0, 0);
    else d.houder.position.set(0, 0, 0);
  });
  meisjeHouder.visible = alle;
  meisjeHouder.position.set(2.85, 0, 0.15);
  if (alle) Object.assign(camDoel, { afstand: 7.6, hoogte: 0.28 });
  else Object.assign(camDoel, { afstand: 3.4, hoogte: 0.3 });
  camDoel.doel.set(alle ? 0.45 : 0, alle ? 0.55 : 0.62, 0);
  if (alle) {
    tafel.rotation.y = 0;
    camDoel.hoek = 0;
    draaien = false;
  }
  werkKnoppenBij();
}

// --- Knoppen ---
const ui = document.getElementById('ui');
const boven = document.createElement('div');
boven.className = 'dierknoppen boven';
const onder = document.createElement('div');
onder.className = 'dierknoppen onder';
ui.append(boven, onder);
const knoppen = [];
function knop(ouder, tekst, kleur, actief, klik) {
  const b = document.createElement('button');
  b.className = 'dierknop' + (kleur ? '' : ' klein');
  if (kleur) {
    const stip = document.createElement('span');
    stip.className = 'stip';
    stip.style.background = kleur;
    b.append(stip);
  }
  b.append(tekst);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    klik();
  });
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  ouder.append(b);
  knoppen.push({ b, actief });
  return b;
}
for (const d of dieren) knop(boven, d.naam.replace(' tijger', '').replace('Bengaalse', 'Bengaals'), d.kleur, () => keuze === d.sleutel, () => zetKeuze(d.sleutel));
knop(boven, 'Allemaal', 'conic-gradient(#d98a4e 0 25%, #ff9d3f 0 50%, #f6f1ea 0 75%, #ffcf7e 0)', () => keuze === 'alle', () => zetKeuze('alle'));
knop(onder, 'Stil', null, () => gang === 'stil', () => ((gang = 'stil'), werkKnoppenBij()));
knop(onder, 'Stap', null, () => gang === 'stap', () => ((gang = 'stap'), werkKnoppenBij()));
knop(onder, 'Draf', null, () => gang === 'draf', () => ((gang = 'draf'), werkKnoppenBij()));
knop(onder, 'Draaien', null, () => draaien, () => ((draaien = !draaien), werkKnoppenBij()));
function werkKnoppenBij() {
  for (const k of knoppen) k.b.classList.toggle('aan', k.actief());
}
const uitleg = document.createElement('div');
uitleg.className = 'dierenuitleg';
uitleg.textContent = 'Sleep om rond te kijken · tik op een dier';
ui.append(uitleg);
setTimeout(() => (uitleg.style.opacity = '0'), 6000);
zetKeuze(keuze);

// --- Camera: slepen, zoomen, en tikken op een dier ---
const wijzers = new Map();
let knijpStart = 0;
let knijpAfstand = 0;
let gesleept = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesleept = 0;
  if (wijzers.size === 2) {
    const [a, b] = [...wijzers.values()];
    knijpStart = Math.hypot(a.x - b.x, a.y - b.y);
    knijpAfstand = camDoel.afstand;
  }
});
canvas.addEventListener('pointermove', (e) => {
  const w = wijzers.get(e.pointerId);
  if (!w) return;
  const dx = e.clientX - w.x;
  const dy = e.clientY - w.y;
  w.x = e.clientX;
  w.y = e.clientY;
  gesleept += Math.abs(dx) + Math.abs(dy);
  if (wijzers.size === 1) {
    camDoel.hoek -= dx * 0.008;
    camDoel.hoogte = THREE.MathUtils.clamp(camDoel.hoogte + dy * 0.004, -0.05, 1.2);
  } else if (wijzers.size === 2) {
    const [a, b] = [...wijzers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    camDoel.afstand = THREE.MathUtils.clamp(knijpAfstand * (knijpStart / Math.max(d, 1)), 1.2, 12);
  }
});
const los = (e) => {
  if (wijzers.size === 1 && gesleept < 8) tik(e.clientX, e.clientY);
  wijzers.delete(e.pointerId);
};
canvas.addEventListener('pointerup', los);
canvas.addEventListener('pointercancel', (e) => wijzers.delete(e.pointerId));
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camDoel.afstand = THREE.MathUtils.clamp(camDoel.afstand * Math.exp(e.deltaY * 0.001), 1.2, 12);
  },
  { passive: false }
);

const straal = new THREE.Raycaster();
const muis = new THREE.Vector2();
function tik(x, y) {
  muis.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  straal.setFromCamera(muis, camera);
  const zichtbaar = dieren.filter((d) => d.houder.visible);
  const raak = straal.intersectObjects(zichtbaar.map((d) => d.dier.mesh), false)[0];
  const d = raak && zichtbaar.find((q) => q.dier.mesh === raak.object);
  if (d) d.anim.blij();
}

function pasAan() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  // Op een smal (staand) scherm wat verder weg, zodat alles in beeld blijft.
  camera.fov = camera.aspect < 1 ? 52 : 38;
  camera.updateProjectionMatrix();
}
addEventListener('resize', pasAan);
pasAan();

const debug = maakDebugscherm(ui, INSTELLINGEN.debug);

// --- Spellus ---
let vorige = performance.now();
let pauze = false;
document.addEventListener('visibilitychange', () => {
  pauze = document.hidden;
  vorige = performance.now();
});
function beeld(nu) {
  requestAnimationFrame(beeld);
  if (pauze) return;
  const dt = Math.min(0.05, (nu - vorige) / 1000);
  vorige = nu;

  if (draaien) tafel.rotation.y += dt * 0.35;
  const o = 1 - Math.exp(-6 * dt);
  cam.hoek += (camDoel.hoek - cam.hoek) * o;
  cam.hoogte += (camDoel.hoogte - cam.hoogte) * o;
  cam.afstand += (camDoel.afstand - cam.afstand) * o;
  cam.doel.lerp(camDoel.doel, o);
  const ch = Math.cos(cam.hoogte);
  // Bij "allemaal" op een smal (staand) scherm verder weg, zodat de hele rij in beeld past.
  const afstand = cam.afstand * (keuze === 'alle' ? Math.max(1, 1.25 / camera.aspect) : 1);
  camera.position.set(
    cam.doel.x + Math.sin(cam.hoek) * ch * afstand,
    cam.doel.y + Math.sin(cam.hoogte) * afstand,
    cam.doel.z + Math.cos(cam.hoek) * ch * afstand
  );
  camera.lookAt(cam.doel);

  for (const d of dieren) if (d.houder.visible) d.anim.werkBij(dt, gang, camera);
  if (meisjeHouder.visible) meisjeAnim.werkBij(meisjeToestand, dt, 5);

  renderer.render(scene, camera);
  debug.beeld(renderer.info);
}
requestAnimationFrame(beeld);

// Debug-ingang (TP 9): bv. dieren.kies('wit'), dieren.gang('draf'), dieren.draai(false).
window.dieren = {
  kies: zetKeuze,
  gang: (g) => ((gang = g), werkKnoppenBij()),
  draai: (aan) => ((draaien = aan), werkKnoppenBij()),
  camera: (hoek, hoogte, afstand) => Object.assign(camDoel, { hoek, hoogte, afstand }),
  tafel,
  lijst: dieren,
  renderer,
};
