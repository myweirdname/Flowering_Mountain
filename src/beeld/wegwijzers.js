// De wegwijzers (stap 13, GD 2: de weg vinden zonder te lezen): bij elke doorgang een houten paaltje met een
// bordje. Op het bordje staat een pictogram van het soort uitdaging (pony, klimmen, touwbrug, boomstam,
// lianen, en bij de steigers een vlotje: stap 14b) en 1 tot 3 pootjes voor de moeilijkheid. Alles door code getekend, samen twee tekenopdrachten.
// Een nieuwe soort doorgang krijgt hier een pictogram in TEKEN (en anders een vraagteken).
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './maak/vorm.js';

const CEL = 128;          // pixels per bordje in de textuur
const KOLOMMEN = 4;

/** Kleine tekeningen per soort doorgang, in een vak van 100 x 70 (midden 50, 38). */
const TEKEN = {
  pony(g) {
    // Een ponyhoofdje van opzij: hoofd, oor, manen, oog.
    g.fillStyle = '#f7b3d6';
    g.beginPath();
    g.ellipse(46, 40, 22, 15, -0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(64, 54, 13, 10, -0.2, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(36, 26); g.lineTo(40, 8); g.lineTo(48, 24); g.fill();
    g.fillStyle = '#9b6bd6';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(30 - i * 2, 26 + i * 8, 8, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#3a2a4a';
    g.beginPath(); g.arc(52, 36, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(53.5, 34.5, 1.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b06090';
    g.beginPath(); g.arc(70, 54, 2, 0, Math.PI * 2); g.fill();
  },
  klim(g) {
    // Een stukje wand met gekleurde grepen en een touw met een hartje bovenaan.
    g.fillStyle = '#d9c4f2';
    g.beginPath();
    g.roundRect(28, 6, 44, 64, 8);
    g.fill();
    const grepen = [[38, 60, '#ffd23f'], [58, 50, '#22c8c0'], [40, 38, '#ffd23f'], [60, 26, '#22c8c0'], [44, 16, '#ff7fb0']];
    for (const [x, y, c] of grepen) {
      g.fillStyle = c;
      g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#ff5fa2';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(80, 70); g.lineTo(80, 10); g.lineTo(72, 8); g.stroke();
  },
  brug(g) {
    // Een touwbrug die doorzakt, met plankjes.
    g.strokeStyle = '#c98a5a';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(8, 30); g.quadraticCurveTo(50, 52, 92, 30); g.stroke();
    g.fillStyle = '#d9a36a';
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const x = 8 + t * 84;
      const y = 44 + Math.sin(t * Math.PI) * 11;
      if (i === 5) continue; // een gat
      g.fillRect(x - 4, y - 3, 7, 6);
    }
    g.fillStyle = '#a8703f';
    g.fillRect(6, 24, 5, 34);
    g.fillRect(89, 24, 5, 34);
  },
  stam(g) {
    // Een boomstam over een kloof.
    g.fillStyle = '#8fd46a';
    g.fillRect(4, 48, 24, 22);
    g.fillRect(72, 48, 24, 22);
    g.fillStyle = '#b98557';
    g.beginPath(); g.roundRect(10, 38, 80, 12, 6); g.fill();
    g.fillStyle = '#f0c48f';
    g.beginPath(); g.ellipse(88, 44, 4, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff6f6f';
    g.beginPath(); g.arc(40, 36, 4, Math.PI, 0); g.fill();
  },
  vlot(g) {
    // Een bamboevlot op golfjes, met een peddel en een vlaggetje (stap 14b: bij de steigers).
    g.fillStyle = '#41b8ff';
    g.beginPath();
    g.moveTo(0, 56);
    for (let x = 0; x <= 100; x += 10) g.quadraticCurveTo(x + 5, 50, x + 10, 56);
    g.lineTo(100, 70); g.lineTo(0, 70); g.closePath(); g.fill();
    g.fillStyle = '#d9a36a';
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.roundRect(14 + i * 15, 38, 13, 16, 6); g.fill();
    }
    g.fillStyle = '#a8703f';
    g.fillRect(14, 43, 73, 3);
    // De peddel, schuin in het water.
    g.strokeStyle = '#a8703f';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(70, 14); g.lineTo(88, 58); g.stroke();
    g.fillStyle = '#7ed957';
    g.beginPath(); g.ellipse(89, 60, 4, 7, -0.4, 0, Math.PI * 2); g.fill();
    // Een vlaggetje.
    g.strokeStyle = '#fff4e6';
    g.beginPath(); g.moveTo(26, 38); g.lineTo(26, 8); g.stroke();
    g.fillStyle = '#ff4f8b';
    g.beginPath(); g.moveTo(27, 9); g.lineTo(46, 15); g.lineTo(27, 22); g.closePath(); g.fill();
    // Wit schuim tegen het vlot.
    g.fillStyle = '#ffffff';
    for (const [x, y] of [[10, 55], [90, 54], [52, 57]]) {
      g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
    }
  },
  liaan(g) {
    // Twee lianen aan een tak, met blaadjes.
    g.strokeStyle = '#7a5233';
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(6, 10); g.quadraticCurveTo(50, 4, 94, 12); g.stroke();
    g.strokeStyle = '#4f9e3a';
    g.lineWidth = 4;
    for (const [x, d] of [[34, -10], [70, 8]]) {
      g.beginPath(); g.moveTo(x, 9); g.quadraticCurveTo(x + d * 0.4, 40, x + d, 64); g.stroke();
      g.fillStyle = '#7ed957';
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.ellipse(x + d * (0.3 + i * 0.25) + 5, 24 + i * 13, 5, 3, 0.6, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ff7fb0';
      g.beginPath(); g.arc(x + d, 64, 4, 0, Math.PI * 2); g.fill();
    }
  },
};

/** Een pootje (oranje, zoals een tijgerpootje): een kussentje en vier teentjes. */
function pootje(g, x, y, s) {
  g.fillStyle = '#ff9a3d';
  g.beginPath(); g.ellipse(x, y + 3 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2); g.fill();
  for (const [dx, dy] of [[-6, -4], [-2, -7.5], [2, -7.5], [6, -4]]) {
    g.beginPath(); g.ellipse(x + dx * s, y + dy * s, 2.2 * s, 2.7 * s, 0, 0, Math.PI * 2); g.fill();
  }
}

/** De textuur met alle bordjes: per soort een rij, per moeilijkheid (1 tot 3) een kolom. */
function maakAtlas(soorten) {
  const rijen = Math.ceil((soorten.length * 3) / KOLOMMEN);
  const c = document.createElement('canvas');
  c.width = KOLOMMEN * CEL;
  c.height = rijen * CEL;
  const g = c.getContext('2d');
  const plek = new Map();
  let n = 0;
  for (const soort of soorten) {
    for (let m = 1; m <= 3; m++) {
      const kx = (n % KOLOMMEN) * CEL;
      const ky = Math.floor(n / KOLOMMEN) * CEL;
      plek.set(`${soort}|${m}`, n);
      n++;
      g.save();
      g.translate(kx, ky);
      // Het bordje: crème met een houten randje.
      g.fillStyle = '#a8703f';
      g.beginPath(); g.roundRect(2, 2, CEL - 4, CEL - 4, 18); g.fill();
      g.fillStyle = '#fff6e8';
      g.beginPath(); g.roundRect(9, 9, CEL - 18, CEL - 18, 13); g.fill();
      g.save();
      g.translate(14, 12);
      (TEKEN[soort] ?? ((gg) => {
        gg.fillStyle = '#9b6bd6';
        gg.font = '900 56px system-ui, sans-serif';
        gg.textAlign = 'center';
        gg.fillText('?', 50, 58);
      }))(g);
      g.restore();
      // De pootjes onderaan.
      const breed = 22;
      for (let i = 0; i < m; i++) pootje(g, CEL / 2 + (i - (m - 1) / 2) * breed, CEL - 26, 1.15);
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { textuur: t, plek, rijen };
}

/**
 * @param {{ x:number, z:number, richting:number, pictogram:string, moeilijkheid:number }[]} borden
 * @param {(x:number, z:number) => number} grondOp
 * @param {typeof import('../data/bergplan.js').BERGPLAN.wegwijzer} WW
 * @param {{ detail:number, schaduw:boolean }} K
 */
export function maakWegwijzers(borden, grondOp, WW, K) {
  const groep = new THREE.Group();
  if (!borden.length) return { groep };
  const soorten = [...new Set(borden.map((b) => b.pictogram))];
  const { textuur, plek, rijen } = maakAtlas(soorten);
  const fijn = K.detail > 0;

  // --- De paaltjes en de achterkant van de bordjes: één vorm ---
  const b = new Bouwer();
  const H = WW.hoogte;
  const BORD = 0.62;
  for (const w of borden) {
    const y = grondOp(w.x, w.z);
    b.voegToe(new THREE.CylinderGeometry(0.05, 0.06, H + 0.2, fijn ? 7 : 5), { matrix: matrix(w.x, y + (H + 0.2) / 2 - 0.2, w.z), kleur: 0xa8703f });
    b.voegToe(maakBol(0.07, fijn ? 1 : 0), { matrix: matrix(w.x, y + H, w.z), kleur: 0xf0c48f });
    b.voegToe(new THREE.BoxGeometry(BORD + 0.06, BORD + 0.06, 0.05), {
      matrix: matrix(w.x + Math.sin(w.richting) * 0.09, y + H - BORD * 0.42, w.z + Math.cos(w.richting) * 0.09, 0, w.richting, 0),
      kleur: 0xc98a5a,
    });
    // Een klein grasbosje aan de voet.
    b.voegToe(maakBol(0.22, 0), { matrix: matrix(w.x, y + 0.02, w.z, 0, 0, 0, 1, 0.45, 1), kleur: 0x6fcf5e });
  }
  const palen = new THREE.Mesh(b.maak(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a1a10, emissiveIntensity: 0.3 }));
  palen.castShadow = K.schaduw;
  groep.add(palen);

  // --- De voorkant: een vlak per bordje, met zijn stukje uit de textuur ---
  const pos = [];
  const uv = [];
  const idx = [];
  const p = new THREE.Vector3();
  const m = new THREE.Matrix4();
  for (const w of borden) {
    const n = plek.get(`${w.pictogram}|${Math.max(1, Math.min(3, w.moeilijkheid))}`);
    const u0 = (n % KOLOMMEN) / KOLOMMEN;
    const v1 = 1 - Math.floor(n / KOLOMMEN) / rijen;
    const v0 = v1 - 1 / rijen;
    const u1 = u0 + 1 / KOLOMMEN;
    const y = grondOp(w.x, w.z) + H - BORD * 0.42;
    // Voor het paaltje en het houten bord (dat 0,09 m voor het paaltje hangt en 0,05 m dik is).
    m.makeRotationY(w.richting).setPosition(w.x + Math.sin(w.richting) * 0.122, y, w.z + Math.cos(w.richting) * 0.122);
    const basis = pos.length / 3;
    for (const [x, yy, uu, vv] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
      p.set((x * BORD) / 2, (yy * BORD) / 2, 0).applyMatrix4(m);
      pos.push(p.x, p.y, p.z);
      uv.push(uu, vv);
    }
    idx.push(basis, basis + 1, basis + 2, basis, basis + 2, basis + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Het bordje gloeit een beetje: je moet het ook in de schaduw van de jungle zien.
  const voorkant = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: textuur, emissive: 0xffffff, emissiveMap: textuur, emissiveIntensity: 0.35 }));
  groep.add(voorkant);
  return { groep };
}
