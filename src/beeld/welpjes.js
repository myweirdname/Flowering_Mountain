// Het beeld van de welpjes bij mama tijger (stap 8b): de echte welp, de knuffelwelp en de eerste knuffeltijger uit
// de dierenproef, elk met zijn eigen animatie en schaduwvlek. Bovenop de gewone animatie (stap, draf, galop,
// knipperen, rondkijken) komen hier het omrollen, op de rug liggen (aaien) en de sprong (bespringen).
// De simulatie (sim/modi/welpjes.js) zegt waar ze zijn en wat ze doen.
// Stap 8c: de schatjesmomenten krijgen hier hun gezichtje (niezen, de hik, kopje schuin, meebrullen), het
// kopje-onder bij het struikelen, en een tekstwolkje boven het kopje ("?", "hik!", "hatsjie!", "mieuw!").
import * as THREE from 'three';
import { WELPVORM, WELPEN, KNUFFELWELPVORM, KNUFFELWELPEN, KAWAII_TIJGERVORM, KAWAII_TIJGERS } from '../data/dieren.js';
import { GEZEL } from '../data/tijger.js';
import { WELPJES } from '../data/welpjes.js';
import { maakTijger } from './maak/tijger.js';
import { maakKnuffelWelp } from './maak/knuffelWelp.js';
import { maakKawaiiTijger } from './maak/tijgerKawaii.js';
import { maakDierAnimatie } from './dierAnimatie.js';

const glad = (x) => x * x * (3 - 2 * x);
const klem = THREE.MathUtils.clamp;
const glad01 = (x) => glad(klem(x, 0, 1));

// --- Tekstwolkjes: een wit wolkje met een woordje erin, één textuur per woord ---
const wolkTexturen = new Map();
function wolkTextuur(tekst) {
  let t = wolkTexturen.get(tekst);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.font = '900 60px "Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  const breed = Math.min(244, Math.max(110, g.measureText(tekst).width + 50));
  const x0 = (256 - breed) / 2;
  g.beginPath();
  g.roundRect(x0, 10, breed, 92, 44);
  // Een puntje naar beneden, naar het kopje toe.
  g.moveTo(118, 100);
  g.lineTo(128, 122);
  g.lineTo(140, 100);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ff8cc6';
  g.lineWidth = 7;
  g.stroke();
  g.fill();
  g.fillStyle = '#7a3db8';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(tekst, 128, 60);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  wolkTexturen.set(tekst, t);
  return t;
}

// --- Sterretjes die rond een duizelig kopje draaien (stap 8d) ---
let sterTextuur = null;
function sterTex() {
  if (sterTextuur) return sterTextuur;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 12 : 28;
    g.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r);
  }
  g.closePath();
  g.lineJoin = 'round';
  g.fillStyle = '#ffe14d';
  g.strokeStyle = '#ff9f2e';
  g.lineWidth = 5;
  g.stroke();
  g.fill();
  sterTextuur = new THREE.CanvasTexture(c);
  sterTextuur.colorSpace = THREE.SRGBColorSpace;
  return sterTextuur;
}

// --- Het takje (stap 8d): twee helften die samen één tak zijn, tot hij breekt ---
/** Eén helft: begint in de oorsprong (het buitenste eind, waar het bekje zit) en loopt langs +z naar het midden. */
function maakTakHelft(L, kant, schorsMat, houtMat, bladMat) {
  const helft = new THREE.Group();
  const lang = L / 2;
  const stok = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, lang, 7, 1).rotateX(Math.PI / 2).translate(0, 0, lang / 2), schorsMat);
  helft.add(stok);
  // Het afgebroken eind: licht hout, een beetje gekarteld.
  const breuk = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.045, 7, 1).rotateX(Math.PI / 2).translate(0, 0, lang + 0.012), houtMat);
  helft.add(breuk);
  if (kant === 1) {
    // Een zijtakje met twee blaadjes.
    const zij = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.2, 5, 1).translate(0, 0.1, 0), schorsMat);
    zij.position.set(0, 0, lang * 0.55);
    zij.rotation.set(0.9, 0, -0.7);
    helft.add(zij);
  }
  const blad = new THREE.Shape();
  blad.moveTo(0, 0);
  blad.quadraticCurveTo(0.035, 0.04, 0, 0.11);
  blad.quadraticCurveTo(-0.035, 0.04, 0, 0);
  const bladGeo = new THREE.ShapeGeometry(blad, 4);
  for (const [z, a, kn] of kant ? [[0.06, 0.8, 0.5], [0.16, -0.9, -0.4]] : [[0.1, 1.1, 0.3]]) {
    const b = new THREE.Mesh(bladGeo, bladMat);
    b.position.set(0, 0.012, z);
    b.rotation.set(-0.6, kn, a);
    helft.add(b);
  }
  helft.traverse((o) => (o.castShadow = true));
  return helft;
}

function maakModel(model, soort, zaad, K) {
  const fijn = K.detail ? {} : GEZEL.laag;
  if (model === 'knuffelwelp') return maakKnuffelWelp(KNUFFELWELPVORM, KNUFFELWELPEN[soort], zaad, fijn);
  if (model === 'knuffel') return maakKawaiiTijger(KAWAII_TIJGERVORM, KAWAII_TIJGERS[soort], zaad);
  return maakTijger(WELPVORM, WELPEN[soort], zaad, fijn);
}

/**
 * @param {THREE.Scene} scene
 * @param {import('../sim/wezens/welp.js').Welp[]} welpjes
 * @param {{ schaduw: boolean, detail: boolean }} K kwaliteit
 * @param {import('../sim/wezens/welp.js').Tak | null} [tak] het takje bij mama (stap 8d)
 */
export function maakWelpjesbeeld(scene, welpjes, K, tak = null) {
  const S = WELPJES.schaal;
  const schaduwGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const schaduwMat = new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.22, depthWrite: false });
  const doos = new THREE.Box3();
  const maat = new THREE.Vector3();

  const beelden = welpjes.map((w, i) => {
    const dier = maakModel(w.model, w.soort, 11 + i * 3, K);
    // Waar zijn bekje zit, gezien vanuit zijn hoofd (zo blijft het takje erin hangen, hoe hij ook beweegt).
    dier.groep.updateMatrixWorld(true);
    const mondLokaal = dier.bot.hoofd.worldToLocal(new THREE.Vector3(...(WELPJES.mond[w.model] ?? WELPJES.mond.welp)));
    // Hoe groot is hij? (voor het omrollen: rond welk punt, en hoe hoog hij dan ligt)
    doos.setFromObject(dier.groep);
    doos.getSize(maat);
    const hoog = maat.y;
    const midden = hoog * 0.42;            // de as door het lijf, waarrond hij rolt
    const opZij = Math.min(maat.x * 0.5, hoog * 0.4); // zo hoog ligt die as als hij op zijn zij ligt
    const opRug = hoog * 0.34;             // en als hij op zijn rug ligt
    // Kopje-onder: halverwege staat hij op zijn neus, dus dan moet de as hoger.
    const opNeus = Math.max(midden, maat.z * 0.42);

    const houder = new THREE.Group();
    houder.scale.setScalar(S);
    const kantel = new THREE.Group();
    kantel.position.y = midden;
    dier.groep.position.y = -midden;
    kantel.add(dier.groep);
    houder.add(kantel);
    const schaduw = new THREE.Mesh(schaduwGeo, schaduwMat);
    schaduw.renderOrder = 2;
    scene.add(houder, schaduw);
    if (K.schaduw) {
      dier.groep.traverse((o) => (o.castShadow = true));
      schaduw.visible = false;
    }
    const anim = maakDierAnimatie(dier, 21 + i * 5);
    const wolk = new THREE.Sprite(new THREE.SpriteMaterial({ map: wolkTextuur('?'), transparent: true, depthTest: false }));
    wolk.renderOrder = 9;
    wolk.visible = false;
    scene.add(wolk);
    // Duizelig: vier sterretjes die rond zijn kopje draaien.
    const sterren = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: sterTex(), transparent: true, depthWrite: false }));
      st.scale.setScalar(0.11);
      sterren.add(st);
    }
    sterren.visible = false;
    scene.add(sterren);
    return {
      w, dier, houder, kantel, schaduw, anim, midden, opZij, opRug, opNeus, hoog, kijkZacht: null, vorigeY: w.pos[1], vy: 0, blijVoor: '',
      wolk, wolkTijd: 0, wolkDuur: 1, geschud: false, gezicht: {}, mondLokaal, mond: new THREE.Vector3(), sterren, sterSterk: 0, verstopZacht: 0,
    };
  });

  const pos = new THREE.Vector3();
  const kijk = new THREE.Vector3();
  const lijf = new THREE.Vector3();

  /** Hoe ver hij gekanteld is (0 = rechtop, π = op zijn rug) voor zijn huidige modus. */
  function kanteling(b) {
    const w = b.w;
    if (w.modus === 'rol') {
      const f = klem(1 - w.timer / w.duur, 0, 1);
      return w.rolKant * glad(f) * Math.PI * 2;
    }
    if (w.modus === 'aai') {
      const t = w.duur - w.timer;
      const op = glad(klem(t / 0.35, 0, 1)) * glad(klem(w.timer / 0.35, 0, 1));
      // Op zijn rug, en een beetje heen en weer wiebelen van plezier.
      return w.rolKant * op * (Math.PI + Math.sin(t * 9) * 0.16);
    }
    if (w.modus === 'staart') {
      // Rondjes: hij helt over naar binnen ... duizelig op zijn zij ... en daarna wiebelt hij nog na.
      const S = WELPJES.staart;
      const t = w.duur - w.timer;
      const t1 = S.draai;
      const t3 = t1 + S.val + S.liggen;
      const t4 = t3 + S.op;
      const helling = w.rolKant * 0.16 * glad01(t / t1) * (1 - glad01((t - t1) / 0.2));
      const zij = glad01((t - t1) / S.val) * (1 - glad01((t - t3) / S.op));
      const wiebel = t > t4 ? Math.sin((t - t4) * 4.4) * 0.17 * (1 - glad01((t - t4) / S.wankel)) : 0;
      return helling - w.rolKant * zij * 1.42 + wiebel;
    }
    if (w.modus === 'tak' && w.fase === 2) return Math.sin(performance.now() * 0.011 + (w.takKant ? 1.3 : 0)) * 0.07; // rukken en sjorren
    return 0;
  }

  /** Kopje-onder (struikelen): hoe ver hij voorover is gerold (0 .. 2π). Negatief: achterover (stap 8d). */
  function voorover(w) {
    if (w.modus === 'achterover') {
      const T = WELPJES.tak;
      const t = w.duur - w.timer;
      const neer = glad01(t / T.terugDuur);
      const op = glad01((t - (w.duur - T.opDuur)) / T.opDuur);
      // Op zijn rug: een beetje nawiebelen.
      const wiebel = t > T.terugDuur ? Math.sin((t - T.terugDuur) * 9) * 0.12 * (1 - op) : 0;
      return -(T.achterHoek * neer * (1 - op)) + wiebel;
    }
    if (w.modus !== 'struikel') return 0;
    const S = WELPJES.struikel;
    const t = w.duur - w.timer;
    return glad01((t - S.rol[0]) / (S.rol[1] - S.rol[0])) * Math.PI * 2;
  }

  /** Het gezichtje bij het schatjesmoment dat hij nu beleeft (zie Gezicht in dierAnimatie.js). */
  function gezicht(b) {
    const w = b.w;
    const gz = b.gezicht;
    gz.bek = gz.kopOp = gz.knik = gz.schuin = gz.oorPlat = gz.ogen = gz.schrap = gz.opzit = 0;
    const t = w.duur - w.timer;
    if (w.modus === 'nies') {
      const N = WELPJES.nies;
      if (t < N.snuffel) gz.knik = 0.12 + Math.sin(t * 17) * 0.05; // snuf snuf snuf
      else if (t < N.hatsjie) {
        // "ha ... ha ...": kopje gaat omhoog, oogjes knijpen dicht, bekje gaat een beetje open.
        const x = (t - N.snuffel) / (N.hatsjie - N.snuffel);
        gz.kopOp = 0.42 * glad(x) + 0.07 * Math.sin(x * Math.PI * 4);
        gz.ogen = 0.9 * x;
        gz.bek = 0.14 * x;
      } else {
        // "TSJIE!": kopje schiet naar beneden.
        const y = t - N.hatsjie;
        const knal = Math.exp(-y * 6);
        gz.knik = 0.62 * knal * glad01(y / 0.05);
        gz.ogen = y < 0.4 ? 1 : 0;
        gz.bek = 0.24 * knal;
        gz.oorPlat = 0.8 * knal;
        if (y > 0.4 && !b.geschud) {
          b.geschud = true;
          b.anim.schud();
        }
      }
    } else if (w.modus === 'hik') {
      const e = Math.exp(-w.hikSinds * 7);
      gz.kopOp = 0.28 * e;
      gz.bek = 0.12 * e;
      gz.oorPlat = -0.3 * e;
    } else if (w.modus === 'struikel') {
      const S = WELPJES.struikel;
      if (t < S.rol[0]) gz.knik = 0.5 * (t / S.rol[0]);
      else if (t > S.rol[1]) {
        // Even beduusd: oogjes half dicht, kopje wiebelt.
        const d = t - S.rol[1];
        gz.ogen = 0.5 * Math.exp(-d * 1.5);
        gz.schuin = Math.sin(d * 6) * 0.55 * Math.exp(-d * 1.4);
        if (d > 0.35 && !b.geschud) {
          b.geschud = true;
          b.anim.schud();
        }
      }
    } else if (w.modus === 'meebrul') {
      // Schrap zetten ... bekje wijd open ... "mieuw!" ... en weer dicht.
      const B = WELPJES.meeBrul;
      const x = t - w.wacht;
      if (x > 0) {
        const af = 1 - glad01((x - B.dicht) / 0.45);
        const open = glad01((x - B.schrap) / (B.open - B.schrap)) * af;
        gz.schrap = glad01(x / B.schrap) * af;
        gz.bek = open * 0.78 + (x > B.mieuw && x < B.dicht ? Math.sin(x * 38) * 0.035 : 0);
        gz.kopOp = open * 0.42 + gz.schrap * 0.08;
        gz.ogen = open * 0.75;
        gz.oorPlat = open * 0.65;
      }
    }
    // --- Spelen met elkaar (stap 8d) ---
    else if (w.modus === 'staart') {
      const S = WELPJES.staart;
      const t1 = S.draai;
      if (t > t1) {
        // Duizelig: oogjes half dicht, kopje zwalpt rond.
        const d = t - t1;
        const na = 1 - glad01((d - S.val - S.liggen - S.op - S.wankel * 0.5) / (S.wankel * 0.5));
        gz.ogen = 0.55 * na;
        gz.schuin = Math.sin(d * 3.3) * 0.75 * na;
        gz.kopOp = Math.sin(d * 2.2) * 0.12 * na;
        gz.oorPlat = 0.35 * na;
      } else gz.oorPlat = -0.2; // oortjes gespitst: daar is dat staartje!
    } else if (w.modus === 'tel') {
      // Kopje tegen mama, oogjes stijf dicht.
      if (w.fase >= 1) {
        const klaar = w.fase === 2 ? glad01(w.faseTijd / 0.25) : 0;
        gz.ogen = 1 - klaar;
        gz.knik = 0.32 * (1 - klaar);
        gz.oorPlat = 0.3 * (1 - klaar) - 0.3 * klaar;
        gz.kopOp = 0.25 * klaar;
      }
    } else if (w.modus === 'zoek') {
      if (w.fase === 1) gz.knik = 0.18 + Math.sin(w.faseTijd * 16) * 0.05; // snuf snuf
      else if (w.fase === 3) gz.knik = 0.22 + Math.sin(w.faseTijd * 18) * 0.06;
      else if (w.fase === 4) {
        gz.kopOp = 0.3;
        gz.oorPlat = -0.3;
      }
    } else if (w.modus === 'verstop') {
      // Muisstil in de struik: oortjes recht omhoog, grote oogjes.
      gz.oorPlat = -0.45 * b.verstopZacht;
    } else if (w.modus === 'gevonden') {
      gz.kopOp = 0.25 * (1 - glad01((t - 0.6) / 0.5));
      gz.oorPlat = -0.4;
    } else if (w.modus === 'tak') {
      if (w.fase >= 1) gz.bek = 0.16; // het takje tussen de tandjes
      if (w.fase === 2) {
        // Trekken! Schrap zetten, oortjes plat, en met het kopje rukken.
        const tt = performance.now() * 0.001;
        gz.schrap = 0.9;
        gz.oorPlat = 0.6;
        gz.ogen = 0.45;
        gz.schuin = Math.sin(tt * 7.3 + (w.takKant ? 2 : 0)) * 0.35;
        gz.kopOp = -0.08;
      }
    } else if (w.modus === 'achterover') {
      const T = WELPJES.tak;
      // Verbaasd: oogjes wijd, oortjes alle kanten op; daarna een gelukkig snoetje.
      gz.oorPlat = t < 0.6 ? 0.7 : -0.2;
      gz.bek = t < T.loslaat ? 0.16 : 0.1 * Math.exp(-(t - T.loslaat) * 3);
    }
    // "Huh?": alle kopjes tegelijk schuin, naar dezelfde kant.
    if (w.huhTijd > 0) {
      const H = WELPJES.huh;
      const env = glad01((H.duur - w.huhTijd) / 0.16) * glad01(w.huhTijd / 0.3);
      gz.schuin += w.huhKant * 0.8 * env;
      gz.kopOp += 0.06 * env;
      gz.oorPlat -= 0.3 * env;
    }
    return gz;
  }

  // --- Het takje (stap 8d): twee helften, die in de bekjes hangen, in het gras liggen of samen één tak zijn ---
  const T = WELPJES.tak;
  let takBeeld = null;
  const hulp = new THREE.Object3D();
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _f = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  if (tak) {
    const schors = new THREE.MeshLambertMaterial({ color: 0x9a6a3e });
    const hout = new THREE.MeshLambertMaterial({ color: 0xf2d6a2 });
    const blad = new THREE.MeshLambertMaterial({ color: 0x62d05c, side: THREE.DoubleSide });
    const helften = [0, 1].map((k) => {
      const groep = maakTakHelft(T.lengte, k, schors, hout, blad);
      groep.visible = false;
      scene.add(groep);
      return { groep, vast: false, val: 1, van: new THREE.Vector3(), vanQ: new THREE.Quaternion(), grootte: 0 };
    });
    takBeeld = { helften };
  }
  const beeldVan = (id) => beelden.find((q) => q.w.id === id);
  /** Waar het hoofd van welpje b heen kijkt (vlak, een beetje omlaag). */
  function kopVooruit(b, uit) {
    b.dier.bot.hoofd.getWorldQuaternion(_q);
    uit.set(0, 0, 1).applyQuaternion(_q);
    uit.y = Math.min(uit.y, 0.1) - 0.15;
    return uit.normalize();
  }
  /** Zet helft h met zijn eind in `van`, wijzend naar `naar`, `lang` meter lang. */
  function zet(h, van, naar, lang, vast) {
    hulp.position.copy(van);
    hulp.lookAt(naar);
    if (vast) {
      h.vast = true;
      h.val = 1;
    } else if (h.vast) {
      // Net losgelaten: vanaf hier valt hij in het gras.
      h.vast = false;
      h.val = 0;
      h.van.copy(h.groep.position);
      h.vanQ.copy(h.groep.quaternion);
    }
    if (h.val < 1) {
      const e = glad01(h.val);
      h.groep.position.lerpVectors(h.van, hulp.position, e);
      h.groep.position.y += Math.sin(Math.PI * Math.min(1, h.val)) * 0.08;
      h.groep.quaternion.slerpQuaternions(h.vanQ, hulp.quaternion, e);
    } else {
      h.groep.position.copy(hulp.position);
      h.groep.quaternion.copy(hulp.quaternion);
    }
    h.groep.scale.set(h.grootte, h.grootte, (h.grootte * lang) / (T.lengte / 2));
  }
  /** De hele tak van `a` (eind 0) naar `c` (eind 1). */
  function zetHeel(a, c, vast) {
    const [h0, h1] = takBeeld.helften;
    const lang = klem(a.distanceTo(c) / 2, T.lengte * 0.35, T.lengte * 0.65);
    zet(h0, a, c, lang, vast);
    zet(h1, c, a, lang, vast);
  }
  function werkTakBij(dt, camera, grondOp) {
    const helften = takBeeld.helften;
    const zichtbaar = tak.staat !== 'weg' && camera.position.distanceTo(_a.set(tak.pos[0], tak.pos[1], tak.pos[2])) < WELPJES.zichtbaarTot;
    for (const h of helften) {
      h.val = Math.min(1, h.val + dt / 0.32);
      // Verdwijnen in het gras gaat zacht.
      h.grootte = tak.staat === 'weg' ? Math.max(0, h.grootte - dt * 2.5) : 1;
      h.groep.visible = h.grootte > 0.01 && (zichtbaar || tak.staat === 'weg');
    }
    if (tak.staat === 'weg') return;
    const opGrond = (x, z, dy = 0.02) => grondOp(x, z) + dy;
    if (tak.staat === 'valt' || tak.staat === 'ligt') {
      // Neervallen (met wat tollen), of gewoon in het gras liggen.
      const f = tak.staat === 'valt' ? klem(tak.tijd / T.valTijd, 0, 1) : 1;
      const hoog = 2.6 * (1 - f) * (1 - f);
      const tol = (1 - f) * 5;
      const hx = Math.sin(tak.richting + tol) * T.lengte * 0.5;
      const hz = Math.cos(tak.richting + tol) * T.lengte * 0.5;
      const kantelY = Math.sin(tol * 1.7) * 0.25 * (1 - f);
      _a.set(tak.pos[0] - hx, opGrond(tak.pos[0] - hx, tak.pos[2] - hz) + hoog - kantelY, tak.pos[2] - hz);
      _b.set(tak.pos[0] + hx, opGrond(tak.pos[0] + hx, tak.pos[2] + hz) + hoog + kantelY, tak.pos[2] + hz);
      zetHeel(_a, _b, false);
      return;
    }
    if (tak.staat === 'vast') {
      // In de bekjes: de tak loopt van het ene snuitje naar het andere.
      const [ba, bb] = tak.vast.map(beeldVan);
      if (ba && bb) zetHeel(_a.copy(ba.mond), _b.copy(bb.mond), true);
      return;
    }
    if (tak.staat === 'los') {
      // Losgeschoten: één welpje houdt de hele tak nog in zijn bek (hij steekt voor zijn snuitje uit).
      const bh = beeldVan(tak.vast[0]);
      if (!bh) return;
      kopVooruit(bh, _f);
      _b.copy(bh.mond).addScaledVector(_f, T.lengte);
      if (bh.w.takKant === 0) zetHeel(_a.copy(bh.mond), _b, true);
      else zetHeel(_b, _a.copy(bh.mond), true);
      return;
    }
    // Gebroken: elk stuk hangt in een bekje, of ligt in het gras.
    for (const k of [0, 1]) {
      const h = helften[k];
      const houder = tak.vast.map(beeldVan).find((q) => q && q.w.takKant === k);
      if (houder) {
        kopVooruit(houder, _f);
        zet(h, _a.copy(houder.mond), _b.copy(houder.mond).addScaledVector(_f, 1), T.lengte / 2, true);
      } else if (tak.helften[k]) {
        const [x, , z, r] = tak.helften[k];
        _a.set(x, opGrond(x, z), z);
        _b.set(x + Math.sin(r), opGrond(x, z), z + Math.cos(r));
        // Na een tijdje zakken de stukken weg in het gras.
        h.grootte = 1 - glad01((tak.tijd - (T.wegNa - 1.2)) / 1.2);
        zet(h, _a, _b, T.lengte / 2, false);
      }
    }
  }

  return {
    beelden,
    /**
     * @param {number} overgang tussen de vorige en de huidige simulatiestap (0..1)
     * @param {number} dt
     * @param {THREE.Camera} camera
     * @param {(x: number, z: number) => number} grondOp
     */
    werkBij(overgang, dt, camera, grondOp) {
      for (const b of beelden) {
        const w = b.w;
        pos.set(
          w.vorigePos[0] + (w.pos[0] - w.vorigePos[0]) * overgang,
          w.vorigePos[1] + (w.pos[1] - w.vorigePos[1]) * overgang,
          w.vorigePos[2] + (w.pos[2] - w.vorigePos[2]) * overgang
        );
        const zichtbaar = camera.position.distanceTo(pos) < WELPJES.zichtbaarTot;
        b.houder.visible = zichtbaar;
        b.schaduw.visible = zichtbaar && !K.schaduw;
        if (!zichtbaar) {
          b.wolk.visible = false;
          continue;
        }
        let dr = w.richting - w.vorigeRichting;
        dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        b.houder.position.copy(pos);
        b.houder.rotation.y = w.vorigeRichting + dr * overgang;

        // Omrollen of op de rug liggen: kantelen rond de lengteas, en de as zo hoog dat hij op de grond ligt.
        const a = kanteling(b);
        const c = Math.cos(a);
        const s = Math.sin(a);
        b.kantel.rotation.z = a;
        b.kantel.position.y = c * c * (c >= 0 ? b.midden : b.opRug) + s * s * b.opZij;
        // Kopje-onder (struikelen): voorover rond de dwarsas.
        const v = voorover(w);
        b.kantel.rotation.x = v;
        if (v) {
          const cv = Math.cos(v);
          const sv = Math.sin(v);
          b.kantel.position.y = cv * cv * (cv >= 0 ? b.midden : b.opRug) + sv * sv * b.opNeus;
        }
        if (w.modus !== b.modusVoor) b.geschud = false;
        b.modusVoor = w.modus;

        // Blij als hij gevangen wordt, aangeaaid, iemand bespringt, of gevonden wordt.
        if (w.modus !== b.blijVoor && ['aai', 'rol', 'sprong', 'gevonden'].includes(w.modus)) b.anim.blij();
        b.blijVoor = w.modus;

        if (w.kijk) {
          kijk.set(w.kijk[0], w.kijk[1], w.kijk[2]);
          if (!b.kijkZacht) b.kijkZacht = kijk.clone();
          else b.kijkZacht.lerp(kijk, 1 - Math.exp(-6 * dt));
        } else b.kijkZacht = null;
        b.vy = dt > 0 ? (pos.y - b.vorigeY) / dt : 0;
        b.vorigeY = pos.y;
        const inLucht = ['sprong', 'nies', 'hik', 'gevonden', 'zoek'].includes(w.modus) && w.hoogte > 0.02;
        const gz = gezicht(b);
        // Verstopt in een struik: zo diep wegduiken (of zo rechtop gaan zitten) dat net de oortjes erbovenuit komen.
        const verstopt = w.modus === 'verstop' && w.fase === 1 && w.struik;
        b.verstopZacht += ((verstopt ? 1 : 0) - b.verstopZacht) * (1 - Math.exp(-(verstopt ? 4 : 10) * dt));
        if (b.verstopZacht > 0.001 && w.struik) {
          const tekort = w.struik[2] + WELPJES.verstop.oorBoven - b.hoog * S;
          b.houder.position.y += Math.min(0, tekort) * b.verstopZacht;
          gz.opzit = klem(tekort / 0.1, 0, 1) * b.verstopZacht;
          gz.kopOp += 0.1 * gz.opzit;
        }
        // Achterover op zijn rug: pootjes spartelen in de lucht.
        const ta = w.duur - w.timer;
        const spartel = w.modus === 'achterover' && ta > WELPJES.tak.terugDuur && ta < w.duur - WELPJES.tak.opDuur;
        const snuffelt = (w.modus === 'nies' && ta < WELPJES.nies.snuffel) || (w.modus === 'zoek' && [0, 2, 3].includes(w.fase));
        b.anim.werkBij(dt, w.modus === 'aai' || w.modus === 'rol' ? 'stil' : spartel ? 'draf' : w.gang, camera, {
          snelheid: spartel ? 0.9 : w.snelheid / S,
          kijkNaar: Math.abs(a) < 0.3 && v === 0 ? b.kijkZacht : null,
          lucht: inLucht,
          vy: b.vy,
          graast: snuffelt,
          gezicht: gz,
        });

        // Waar zijn bekje nu is (voor het takje).
        const hoofd = b.dier.bot.hoofd;
        hoofd.updateWorldMatrix(true, false);
        b.mond.copy(b.mondLokaal);
        hoofd.localToWorld(b.mond);

        // Duizelig (staart achterna): sterretjes die rond zijn kopje draaien.
        const ST = WELPJES.staart;
        const duizelig = w.modus === 'staart' && ta > ST.draai + ST.val * 0.6 && ta < ST.draai + ST.val + ST.liggen + ST.op * 0.6;
        b.sterSterk += ((duizelig ? 1 : 0) - b.sterSterk) * (1 - Math.exp(-6 * dt));
        b.sterren.visible = b.sterSterk > 0.02;
        if (b.sterren.visible) {
          hoofd.getWorldPosition(lijf);
          b.sterren.position.set(lijf.x, lijf.y + 0.15, lijf.z);
          const draai = performance.now() * 0.0045;
          b.sterren.children.forEach((st, k) => {
            const hoek = draai + (k * Math.PI) / 2;
            st.position.set(Math.cos(hoek) * 0.15, Math.sin(hoek * 2) * 0.02, Math.sin(hoek) * 0.15);
            st.scale.setScalar(0.11 * b.sterSterk);
            st.material.rotation = -draai * 2;
          });
        }

        // Het tekstwolkje: springt op boven het kopje, zweeft een beetje omhoog en vervaagt.
        if (b.wolkTijd > 0) {
          b.wolkTijd = Math.max(0, b.wolkTijd - dt);
          const f = 1 - b.wolkTijd / b.wolkDuur;
          const pop = f < 0.12 ? glad(f / 0.12) * 1.18 : 1 + 0.18 * Math.exp(-(f - 0.12) * 14) * Math.cos((f - 0.12) * 40);
          b.wolk.visible = true;
          b.wolk.position.set(pos.x, pos.y + b.hoog * S + 0.22 + f * 0.28, pos.z);
          b.wolk.scale.set(0.62 * pop, 0.31 * pop, 1);
          b.wolk.material.opacity = 1 - glad01((f - 0.72) / 0.28);
        } else b.wolk.visible = false;

        const g = grondOp(pos.x, pos.z);
        const breed = 1 + Math.abs(s) * 0.3;
        b.schaduw.position.set(pos.x, g + 0.03, pos.z);
        b.schaduw.rotation.y = b.houder.rotation.y;
        const klein = 1 - klem(w.hoogte / 0.6, 0, 0.5);
        b.schaduw.scale.set(b.dier.breedte * 0.62 * S * breed * klein, 1, b.dier.lengte * 0.42 * S * klein);
      }
      if (takBeeld) werkTakBij(dt, camera, grondOp);
    },
    /** Laat een welpje blij reageren (staartje omhoog, oogjes dicht van plezier). */
    blij(id) {
      beelden.find((q) => q.w.id === id)?.anim.blij();
    },
    /** Welk welpje raakt een straal (vanuit de camera door een tik)? Geeft zijn id, of null. */
    raakt(straal, camera) {
      let beste = null;
      let bd = Infinity;
      for (const b of beelden) {
        if (!b.houder.visible) continue;
        lijf.copy(b.houder.position);
        lijf.y += b.midden * S;
        const d = camera.position.distanceTo(lijf);
        if (d > 25) continue;
        if (straal.distanceToPoint(lijf) < 0.42 * S && d < bd) {
          bd = d;
          beste = b.w.id;
        }
      }
      return beste;
    },
    /** Een tekstwolkje boven het kopje van een welpje ("?", "hik!", "hatsjie!", "mieuw!"). */
    zeg(id, tekst, duur = 1.2) {
      const b = beelden.find((q) => q.w.id === id);
      if (!b) return;
      b.wolk.material.map = wolkTextuur(tekst);
      b.wolkTijd = b.wolkDuur = duur;
    },
    /** Het beeld van één welpje (voor de effecten). */
    van(id) {
      return beelden.find((b) => b.w.id === id);
    },
  };
}
