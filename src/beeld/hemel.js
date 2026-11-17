// De hemel: een koepel met kleurverloop en zonnegloed, een zon met een gezichtje,
// en kawaii wolkjes aan de horizon (een paar met oogjes en blosjes).
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './maak/vorm.js';

/** @param {typeof import('../data/scene.js').SCENE} S */
export function maakHemel(S, zonRichting, detail) {
  const H = S.hemel;
  const koepel = new THREE.Mesh(
    new THREE.SphereGeometry(1300, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenit: { value: new THREE.Color(H.zenit) },
        uHorizon: { value: new THREE.Color(H.horizon) },
        uGloed: { value: new THREE.Color(H.zonGloed) },
        uZon: { value: zonRichting },
      },
      vertexShader: `
        varying vec3 vRichting;
        void main() {
          vRichting = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uZenit, uHorizon, uGloed, uZon;
        varying vec3 vRichting;
        void main() {
          vec3 r = normalize(vRichting);
          vec3 c = mix(uHorizon, uZenit, pow(smoothstep(0.0, 0.6, r.y), 0.75));
          float z = max(dot(r, uZon), 0.0);
          c += uGloed * (pow(z, 5.0) * 0.35 + pow(z, 40.0) * 0.35) * (1.0 - smoothstep(0.3, 0.9, r.y));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  koepel.renderOrder = -10;
  koepel.frustumCulled = false;

  const zon = maakZon(S.zon);
  const wolken = maakWolken(S.wolken, detail);
  return { koepel, zon, wolken };
}

/** Een zon met zachte gloed en een blij gezichtje, getekend door code op een klein canvas. */
function maakZon(z) {
  const n = 256;
  const doek = document.createElement('canvas');
  doek.width = doek.height = n;
  const g = doek.getContext('2d');
  const r = n / 2;
  const verloop = g.createRadialGradient(r, r, 0, r, r, r);
  verloop.addColorStop(0, '#ffffff');
  verloop.addColorStop(0.2, z.kleur);
  verloop.addColorStop(0.27, z.gloedKleur);
  verloop.addColorStop(1, 'rgba(255, 230, 120, 0)');
  g.fillStyle = verloop;
  g.fillRect(0, 0, n, n);
  // Gezichtje: gesloten lachende oogjes, een glimlach en roze wangetjes.
  const s = n * 0.2; // straal van de schijf
  g.strokeStyle = z.gezichtKleur;
  g.lineWidth = s * 0.07;
  g.lineCap = 'round';
  for (const kant of [-1, 1]) {
    g.beginPath();
    g.arc(r + kant * s * 0.36, r - s * 0.08, s * 0.14, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
    g.fillStyle = z.wangKleur;
    g.beginPath();
    g.ellipse(r + kant * s * 0.58, r + s * 0.2, s * 0.15, s * 0.09, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(r, r + s * 0.12, s * 0.2, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();

  const textuur = new THREE.CanvasTexture(doek);
  textuur.colorSpace = THREE.SRGBColorSpace;
  const zon = new THREE.Sprite(new THREE.SpriteMaterial({ map: textuur, transparent: true, depthWrite: false, fog: false }));
  zon.scale.setScalar(z.grootte);
  zon.renderOrder = -9;
  return zon;
}

/** Bolle wolkjes rond het eiland, samen één tekenopdracht. */
function maakWolken(W, detail) {
  const bouwer = new Bouwer();
  const bol = maakBol(1, detail ? 2 : 1);
  const boven = new THREE.Color(W.kleur);
  const onder = new THREE.Color(W.onderKleur);
  const k = new THREE.Color();
  const n = new THREE.Vector3();
  // Vaste plaatsen (geen willekeur nodig): vooral boven de zee, een paar boven het land.
  for (let i = 0; i < W.aantal; i++) {
    const a = -Math.PI / 2 + (i - (W.aantal - 1) / 2) * 0.42 + (i % 3) * 0.05 + (i >= W.aantal - 2 ? Math.PI : 0);
    const afst = W.afstand[0] + ((i * 53) % 100) / 100 * (W.afstand[1] - W.afstand[0]);
    const hoogte = W.hoogte[0] + ((i * 37) % 100) / 100 * (W.hoogte[1] - W.hoogte[0]);
    const cx = Math.cos(a) * afst;
    const cz = Math.sin(a) * afst;
    const draai = Math.atan2(-cx, -cz); // de voorkant kijkt naar het eiland
    const grootte = 14 + ((i * 71) % 10) * 1.6;
    const wolk = new THREE.Matrix4().compose(
      new THREE.Vector3(cx, hoogte, cz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, draai, 0)),
      new THREE.Vector3(grootte, grootte, grootte)
    );
    const bollen = [[0, 0.35, 0, 1], [-1.1, 0, 0.1, 0.75], [1.15, 0.05, 0, 0.8], [-0.5, 0.15, -0.4, 0.8], [0.55, 0.2, -0.35, 0.85], [1.9, -0.2, 0, 0.5], [-1.85, -0.2, 0, 0.5]];
    for (const [x, y, z, r] of bollen) {
      const m = wolk.clone().multiply(matrix(x, y, z, 0, 0, 0, r, r * 0.8, r));
      const midden = new THREE.Vector3().setFromMatrixPosition(m);
      bouwer.voegToe(bol, {
        matrix: m,
        // Zacht verloop van boven naar onder, en iets lichter aan de kant van de zon.
        kleur: (p) => {
          n.copy(p).sub(midden).normalize();
          k.copy(onder).lerp(boven, THREE.MathUtils.smoothstep((p.y - hoogte) / grootte, -0.3, 0.5));
          return k.multiplyScalar(0.9 + 0.1 * Math.max(0, n.y * 0.8 + n.z * 0.2));
        },
      });
    }
    if (i < W.metGezicht) {
      // Oogjes, lichtvlekjes en blosjes aan de voorkant (+z van de wolk).
      for (const kant of [-1, 1]) {
        bouwer.voegToe(bol, { matrix: wolk.clone().multiply(matrix(kant * 0.32, 0.35, 0.98, 0, 0, 0, 0.1, 0.14, 0.05)), kleur: 0x3b2c5a });
        bouwer.voegToe(bol, { matrix: wolk.clone().multiply(matrix(kant * 0.32 + 0.03, 0.4, 1.02, 0, 0, 0, 0.035, 0.04, 0.02)), kleur: 0xffffff });
        bouwer.voegToe(bol, { matrix: wolk.clone().multiply(matrix(kant * 0.58, 0.18, 0.9, 0, 0, 0, 0.15, 0.08, 0.05)), kleur: W.wangKleur });
      }
      bouwer.voegToe(bol, { matrix: wolk.clone().multiply(matrix(0, 0.22, 1.0, 0, 0, 0, 0.07, 0.04, 0.03)), kleur: 0x3b2c5a });
    }
  }
  bol.dispose();
  const mesh = new THREE.Mesh(
    bouwer.maak(),
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })
  );
  return mesh;
}
