// Dierenproef (BOUWPLAN stap 6): een draaitafel om de pony en de tijgers los te bekijken,
// met stap- en drafanimatie, knipperen, oren en staart. Open dieren.html.
// Slepen = rondkijken, scrollen of knijpen = in- en uitzoomen, tik op een dier = blij dier.
// Dubbeltik (of dubbelklik) = daar inzoomen; rechts slepen, Shift + slepen of met twee vingers = verschuiven.
// "Kop" = de kop van dichtbij; "Pauze" = het dier staat stil (handig om rustig te bekijken).
// "Brul" laat de tijgers brullen; "Welp" toont de echte welpen; "Knuffelwelp" de knuffels met de echte
// bouw van een welp; "Knuffel" toont de eerste, schattige
// tijgers (bewaard voor later).
// Snelkoppelingen: ?dier=pony|bengaals|wit|goud|alle  ?gang=stil|stap|draf  ?tijger=welp|knuffelwelp|knuffel
//                  ?debug=1  ?kwaliteit=laag
import * as THREE from 'three';
import { INSTELLINGEN } from './kern/instellingen.js';
import { KWALITEIT } from './data/kwaliteit.js';
import { SCENE } from './data/scene.js';
import { PONY, PONYKLEUREN, TIJGERVORM, TIJGERS, WELPVORM, WELPEN, KNUFFELWELPVORM, KNUFFELWELPEN, KAWAII_TIJGERVORM, KAWAII_TIJGERS } from './data/dieren.js';
import { laadPonyKleur, bewaarPonyKleur, ponyMetKleur } from './kern/ponyKleur.js';
import { TESTFIGUUR } from './data/figuur.js';
import { maakPony } from './beeld/maak/pony.js';
import { maakTijger } from './beeld/maak/tijger.js';
import { maakKawaiiTijger } from './beeld/maak/tijgerKawaii.js';
import { maakKnuffelWelp } from './beeld/maak/knuffelWelp.js';
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
// stijl: alleen bij de tijgers ('echt', 'welp', 'knuffelwelp' of 'knuffel'); de pony heeft er geen.
/** @type {{ sleutel: string, naam: string, kleur: string, dier: any, anim: any, houder: THREE.Group, stijl?: string }[]} */
const dieren = [];
function voegDierToe(sleutel, naam, kleur, dier, i, stijl) {
  const houder = new THREE.Group();
  houder.add(dier.groep);
  houder.add(schaduwVlek(dier.breedte * 0.95, dier.lengte * 0.5));
  // De vlek onder het midden van het lijf, niet onder de heupen.
  houder.children[1].position.z = dier.soort === 'tijger' && stijl === 'echt' ? 0.12 : ['welp', 'knuffelwelp', 'knuffel'].includes(stijl) ? 0.04 : 0;
  dier.mesh.castShadow = schaduw;
  tafel.add(houder);
  dieren.push({ sleutel, naam, kleur, dier, anim: maakDierAnimatie(dier, i + 1), houder, stijl });
}
const hex = (c) => '#' + new THREE.Color(c).getHexString();
const bouwStart = performance.now();
// De pony met de kleuren die het kind zelf koos (knop "Kleuren").
let ponyKleur = laadPonyKleur();
voegDierToe('pony', PONY.naam, hex(ponyMetKleur(PONY, ponyKleur).vachtKleur), maakPony(ponyMetKleur(PONY, ponyKleur)), 0);
Object.entries(TIJGERS).forEach(([sleutel, T], i) => {
  voegDierToe(sleutel, T.naam, hex(T.vachtKleur), maakTijger(TIJGERVORM, T, i), i + 1, 'echt');
});
const bouwEcht = performance.now() - bouwStart;
const welpStart = performance.now();
Object.entries(WELPEN).forEach(([sleutel, T], i) => {
  voegDierToe(sleutel, T.naam, hex(T.vachtKleur), maakTijger(WELPVORM, T, i + 5), i + 4, 'welp');
});
const bouwWelp = performance.now() - welpStart;
Object.entries(KNUFFELWELPEN).forEach(([sleutel, T], i) => {
  voegDierToe(sleutel, T.naam, hex(T.vachtKleur), maakKnuffelWelp(KNUFFELWELPVORM, T, i + 9), i + 7, 'knuffelwelp');
});
Object.entries(KAWAII_TIJGERS).forEach(([sleutel, T], i) => {
  voegDierToe(sleutel, T.naam, hex(T.vachtKleur), maakKawaiiTijger(KAWAII_TIJGERVORM, T, i), i + 1, 'knuffel');
});
/** Welke tijgers je ziet: de echte, de welpen, de knuffelwelpen of de eerste knuffels. */
let tijgerStijl = ['welp', 'knuffelwelp', 'knuffel'].includes(url.get('tijger')) ? url.get('tijger') : 'echt';

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
  const stijl = tijgerStijl;
  dieren.forEach((d) => {
    d.houder.visible = (alle || d.sleutel === k) && (!d.stijl || d.stijl === stijl);
    if (alle) d.houder.position.set((rij.indexOf(d.sleutel) - 1.2) * 1.05, 0, 0);
    else d.houder.position.set(0, 0, 0);
  });
  meisjeHouder.visible = alle;
  meisjeHouder.position.set(2.85, 0, 0.15);
  // De echte tijgers zijn lang: dan wat verder weg. De welpen zijn klein: dichterbij.
  const tijger = k !== 'pony';
  const groot = tijger && stijl === 'echt';
  const welp = tijger && ['welp', 'knuffelwelp', 'knuffel'].includes(stijl); // allemaal welpgrootte
  if (alle) Object.assign(camDoel, { afstand: 7.6, hoogte: 0.28 });
  else Object.assign(camDoel, { afstand: groot ? 4.3 : welp ? 2.0 : 3.4, hoogte: 0.3 });
  camDoel.doel.set(alle ? 0.45 : 0, alle ? 0.55 : groot ? 0.6 : welp ? 0.28 : 0.62, groot ? 0.15 : welp ? 0.06 : 0);
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
for (const d of dieren.filter((q) => !q.stijl || q.stijl === 'echt')) {
  knop(boven, d.naam.replace(' tijger', '').replace('Bengaalse', 'Bengaals'), d.kleur, () => keuze === d.sleutel, () => zetKeuze(d.sleutel));
}
knop(boven, 'Allemaal', 'conic-gradient(#d98a4e 0 25%, #dc7a26 0 50%, #ece5d8 0 75%, #e6b35e 0)', () => keuze === 'alle', () => zetKeuze('alle'));
knop(onder, 'Stil', null, () => gang === 'stil', () => ((gang = 'stil'), werkKnoppenBij()));
knop(onder, 'Stap', null, () => gang === 'stap', () => ((gang = 'stap'), werkKnoppenBij()));
knop(onder, 'Draf', null, () => gang === 'draf', () => ((gang = 'draf'), werkKnoppenBij()));
knop(onder, 'Draaien', null, () => draaien, () => ((draaien = !draaien), werkKnoppenBij()));
knop(onder, 'Kop', null, () => false, naarKop);
knop(onder, 'Pauze', null, () => bevroren, () => ((bevroren = !bevroren), werkKnoppenBij()));
const brulKnop = knop(onder, 'Brul', null, () => false, brul);
const welpKnop = knop(onder, 'Welp', null, () => tijgerStijl === 'welp', () => ((tijgerStijl = tijgerStijl === 'welp' ? 'echt' : 'welp'), zetKeuze(keuze)));
const knuffelWelpKnop = knop(onder, 'Knuffelwelp', null, () => tijgerStijl === 'knuffelwelp', () => ((tijgerStijl = tijgerStijl === 'knuffelwelp' ? 'echt' : 'knuffelwelp'), zetKeuze(keuze)));
const knuffelKnop = knop(onder, 'Knuffel', null, () => tijgerStijl === 'knuffel', () => ((tijgerStijl = tijgerStijl === 'knuffel' ? 'echt' : 'knuffel'), zetKeuze(keuze)));
const kleurKnop = knop(onder, 'Kleuren', 'conic-gradient(#ff8cc6, #ffd84d, #7ee08a, #7ec8f0, #b9a3e3, #ff8cc6)', () => paneelOpen, () => {
  paneelOpen = !paneelOpen;
  werkKnoppenBij();
});
function brul() {
  bevroren = false;
  for (const d of dieren) if (d.houder.visible) d.anim.brul?.();
  werkKnoppenBij();
}
let bevroren = false;
/** De camera dicht bij de kop van het gekozen dier (of het eerste zichtbare). */
function naarKop() {
  const d = dieren.find((q) => q.houder.visible && q.sleutel === keuze) ?? dieren.find((q) => q.houder.visible);
  if (!d) return;
  d.dier.bot.hoofd.getWorldPosition(camDoel.doel);
  camDoel.afstand = d.dier.soort !== 'tijger' ? 1.3 : ['welp', 'knuffelwelp', 'knuffel'].includes(d.stijl) ? 0.6 : 1.1;
  camDoel.hoogte = 0.12;
  draaien = false;
  werkKnoppenBij();
}

// --- Kleuren van de pony: zelf kiezen uit kleurstalen, of zelf mengen met de regenboog ---
let paneelOpen = false;
const paneel = document.createElement('div');
paneel.className = 'kleurpaneel';
paneel.addEventListener('pointerdown', (e) => e.stopPropagation());
ui.append(paneel);
const ONDERDELEN = [
  ['vacht', 'Vacht', PONY.vachtKleur],
  ['manen', 'Manen', PONY.maanKleur],
  ['sokjes', 'Sokjes', PONY.sokKleur],
  ['bles', 'Bles', PONY.blesKleur],
];
/** @type {{ deel: string, kleur: number, b: HTMLElement }[]} */
const stalen = [];
const css = (c) => '#' + c.toString(16).padStart(6, '0');
for (const [deel, naam, standaard] of ONDERDELEN) {
  const rij = document.createElement('div');
  rij.className = 'kleurrij';
  const label = document.createElement('span');
  label.className = 'kleurnaam';
  label.textContent = naam;
  rij.append(label);
  const kleuren = [standaard, ...PONYKLEUREN[deel].filter((c) => c !== standaard)];
  for (const kleur of kleuren) {
    const b = document.createElement('button');
    b.className = 'staal';
    b.style.background = css(kleur);
    b.addEventListener('click', () => kiesKleur(deel, kleur));
    rij.append(b);
    stalen.push({ deel, kleur, b });
  }
  // Zelf mengen: de regenboog opent een kleurenschijf.
  const meng = document.createElement('label');
  meng.className = 'staal regenboog';
  const invoer = document.createElement('input');
  invoer.type = 'color';
  invoer.value = css(ponyKleur[deel] ?? standaard);
  invoer.addEventListener('input', () => kiesKleur(deel, parseInt(invoer.value.slice(1), 16)));
  meng.append(invoer);
  rij.append(meng);
  stalen.push({ deel, kleur: -1, b: meng });
  paneel.append(rij);
}
const terug = document.createElement('button');
terug.className = 'dierknop klein kleurterug';
terug.textContent = 'Zoals eerst';
terug.addEventListener('click', () => {
  ponyKleur = {};
  bewaarPonyKleur(ponyKleur);
  herbouwPony();
});
paneel.append(terug);
// De gekozen kleurcodes, klein onderaan: voor papa om af te lezen, zodat Claude ze als standaard kan
// instellen in de afsteltabel (PONY in src/data/dieren.js).
const codes = document.createElement('div');
codes.className = 'kleurcodes';
paneel.append(codes);

function kiesKleur(deel, kleur) {
  ponyKleur = { ...ponyKleur, [deel]: kleur };
  bewaarPonyKleur(ponyKleur);
  herbouwPony();
}

/** Bouw de pony opnieuw met de gekozen kleuren (gaat snel genoeg om meteen te zien). */
function herbouwPony() {
  const d = dieren.find((q) => q.sleutel === 'pony');
  const P = ponyMetKleur(PONY, ponyKleur);
  d.houder.remove(d.dier.groep);
  d.dier.groep.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  d.dier = maakPony(P);
  d.dier.mesh.castShadow = schaduw;
  d.houder.add(d.dier.groep);
  d.anim = maakDierAnimatie(d.dier, 1);
  ponyStip.style.background = hex(P.vachtKleur);
  werkKnoppenBij();
}
const ponyStip = /** @type {HTMLElement} */ (knoppen[0].b.querySelector('.stip'));
function werkKnoppenBij() {
  for (const k of knoppen) k.b.classList.toggle('aan', k.actief());
  // Brul en Knuffel horen bij de tijgers, Kleuren bij de pony.
  const pony = keuze === 'pony';
  if (!pony) paneelOpen = false;
  brulKnop.style.display = pony ? 'none' : '';
  welpKnop.style.display = pony ? 'none' : '';
  knuffelWelpKnop.style.display = pony ? 'none' : '';
  knuffelKnop.style.display = pony ? 'none' : '';
  kleurKnop.style.display = pony ? '' : 'none';
  paneel.style.display = paneelOpen ? '' : 'none';
  pasAan(); // met het paneel open schuift het beeld naar rechts, zodat de pony vrij staat
  uitleg.style.display = paneelOpen ? 'none' : '';
  for (const s of stalen) {
    const gekozen = ponyKleur[s.deel];
    const standaard = ONDERDELEN.find((o) => o[0] === s.deel)[2];
    const aan = s.kleur === -1 ? gekozen !== undefined && !PONYKLEUREN[s.deel].includes(gekozen) && gekozen !== standaard : (gekozen ?? standaard) === s.kleur;
    s.b.classList.toggle('aan', aan);
  }
  codes.textContent = 'Code: ' + ONDERDELEN.map(([deel, naam, standaard]) => `${naam.toLowerCase()} ${css(ponyKleur[deel] ?? standaard).slice(1)}`).join(' · ');
}
const uitleg = document.createElement('div');
uitleg.className = 'dierenuitleg';
uitleg.textContent = 'Sleep om rond te kijken · dubbeltik om in te zoomen · tik op een dier';
ui.append(uitleg);
setTimeout(() => (uitleg.style.opacity = '0'), 6000);
zetKeuze(keuze);

// --- Camera: slepen, zoomen, en tikken op een dier ---
const wijzers = new Map();
let knijpStart = 0;
let knijpAfstand = 0;
let gesleept = 0;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
let schuiven = false;
let knijpMidden = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesleept = 0;
  schuiven = e.button === 2 || e.shiftKey;
  if (wijzers.size === 2) {
    const [a, b] = [...wijzers.values()];
    knijpStart = Math.hypot(a.x - b.x, a.y - b.y);
    knijpAfstand = camDoel.afstand;
    knijpMidden = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
});
/** Het kijkpunt verschuiven in het vlak van het scherm. */
const _rechts = new THREE.Vector3();
const _op = new THREE.Vector3();
function verschuif(dx, dy) {
  camera.matrixWorld.extractBasis(_rechts, _op, new THREE.Vector3());
  const k = cam.afstand * 0.0016;
  camDoel.doel.addScaledVector(_rechts, -dx * k).addScaledVector(_op, dy * k);
  draaien = false;
}
canvas.addEventListener('pointermove', (e) => {
  const w = wijzers.get(e.pointerId);
  if (!w) return;
  const dx = e.clientX - w.x;
  const dy = e.clientY - w.y;
  w.x = e.clientX;
  w.y = e.clientY;
  gesleept += Math.abs(dx) + Math.abs(dy);
  if (wijzers.size === 1) {
    if (schuiven || e.shiftKey) verschuif(dx, dy);
    else {
      camDoel.hoek -= dx * 0.008;
      camDoel.hoogte = THREE.MathUtils.clamp(camDoel.hoogte + dy * 0.004, -0.6, 1.3);
    }
  } else if (wijzers.size === 2) {
    const [a, b] = [...wijzers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    camDoel.afstand = THREE.MathUtils.clamp(knijpAfstand * (knijpStart / Math.max(d, 1)), 0.35, 12);
    // Met twee vingers samen schuiven = verschuiven.
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    verschuif(m.x - knijpMidden.x, m.y - knijpMidden.y);
    knijpMidden = m;
  }
});
let vorigeTik = { t: 0, x: 0, y: 0 };
const los = (e) => {
  if (wijzers.size === 1 && gesleept < 8) {
    const nu = performance.now();
    // Dubbeltik: inzoomen op die plek.
    if (nu - vorigeTik.t < 350 && Math.hypot(e.clientX - vorigeTik.x, e.clientY - vorigeTik.y) < 30) {
      zoomOp(e.clientX, e.clientY);
      vorigeTik.t = 0;
    } else {
      tik(e.clientX, e.clientY);
      vorigeTik = { t: nu, x: e.clientX, y: e.clientY };
    }
  }
  wijzers.delete(e.pointerId);
};
canvas.addEventListener('pointerup', los);
canvas.addEventListener('pointercancel', (e) => wijzers.delete(e.pointerId));
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camDoel.afstand = THREE.MathUtils.clamp(camDoel.afstand * Math.exp(e.deltaY * 0.001), 0.35, 12);
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
/** Inzoomen op het punt van een dier waar je dubbeltikte. */
function zoomOp(x, y) {
  muis.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  straal.setFromCamera(muis, camera);
  const zichtbaar = dieren.filter((d) => d.houder.visible);
  const raak = straal.intersectObjects(zichtbaar.map((d) => d.dier.mesh), false)[0];
  if (!raak) return;
  camDoel.doel.copy(raak.point);
  camDoel.afstand = Math.min(camDoel.afstand * 0.55, 1.2);
  draaien = false;
  werkKnoppenBij();
}

function pasAan() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  // Op een smal (staand) scherm wat verder weg, zodat alles in beeld blijft.
  camera.fov = camera.aspect < 1 ? 52 : 38;
  if (paneelOpen) camera.setViewOffset(innerWidth, innerHeight, -Math.min(innerWidth * 0.22, 230), 0, innerWidth, innerHeight);
  else camera.clearViewOffset();
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

  if (!bevroren) for (const d of dieren) if (d.houder.visible) d.anim.werkBij(dt, gang, camera);
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
  knuffel: (aan) => ((tijgerStijl = aan ? 'knuffel' : 'echt'), zetKeuze(keuze)),
  welp: (aan) => ((tijgerStijl = aan ? 'welp' : 'echt'), zetKeuze(keuze)),
  knuffelwelp: (aan) => ((tijgerStijl = aan ? 'knuffelwelp' : 'echt'), zetKeuze(keuze)),
  brul,
  bouwtijd: Math.round(bouwEcht),
  bouwtijdWelpen: Math.round(bouwWelp),
  // Springt meteen (handig voor schermafdrukken); doel = [x, y, z] waar de camera naar kijkt.
  camera: (hoek, hoogte, afstand, doel) => {
    Object.assign(camDoel, { hoek, hoogte, afstand });
    if (doel) camDoel.doel.set(doel[0], doel[1], doel[2]);
    Object.assign(cam, { hoek, hoogte, afstand });
    cam.doel.copy(camDoel.doel);
  },
  tafel,
  lijst: dieren,
  renderer,
};
