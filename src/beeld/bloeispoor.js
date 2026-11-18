// Het bloeispoor (GD 6, SC "Wow-momenten"): achter een galopperende pony schieten bloemetjes uit de grond,
// en ze blijven staan. Eén tekenopdracht voor alle bloemen (instancing); elke bloem groeit met een veertje op.
// Op elke plek groeit hooguit één bloem, zodat een vaak bereden baan vol bloemen staat in plaats van te vol.
import * as THREE from 'three';
import { Bouwer, maakBol, matrix } from './maak/vorm.js';
import { maakPlantMateriaal } from './wind.js';

const PALET = [0xff6fae, 0xffffff, 0xc39bff, 0xffd84d, 0xff8f6b, 0x7fd8ff, 0xff9fd0];
const GROOTTE = [1.7, 2.6]; // kleinste en grootste bloem (keer de basisvorm van ±12 cm)

/** De bloemvorm: vijf blaadjes, een geel hartje, een steeltje en twee blaadjes. */
function maakBloemvorm(detail) {
  const b = new Bouwer();
  // Hartje en steel krijgen niet de kleur van de bloem: daarvoor zet `bladpos.x = 1`.
  const kern = (geo) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const bp = new Float32Array(g.attributes.position.count * 2);
    for (let i = 0; i < bp.length; i += 2) {
      bp[i] = 1;
      bp[i + 1] = -9;
    }
    g.setAttribute('bladpos', new THREE.BufferAttribute(bp, 2));
    return g;
  };
  const kop = 0.15;
  b.voegToe(kern(new THREE.CylinderGeometry(0.008, 0.012, kop, 4)), { matrix: matrix(0, kop / 2, 0), kleur: 0x5fc94e, zwaai: (p) => p.y * 2 });
  for (const kant of [-1, 1]) {
    b.voegToe(kern(maakBol(1, 0)), { matrix: matrix(kant * 0.035, 0.05, 0, 0, 0, kant * 0.6, 0.04, 0.012, 0.02), kleur: 0x6fd35e, zwaai: 0.1 });
  }
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.voegToe(maakBol(1, detail ? 1 : 0), {
      matrix: matrix(Math.cos(a) * 0.045, kop + 0.005, Math.sin(a) * 0.045, 0, -a, 0.25, 0.05, 0.014, 0.034),
      kleur: 0xffffff,
      zwaai: 0.3,
    });
  }
  b.voegToe(kern(maakBol(0.022, 0)), { matrix: matrix(0, kop + 0.016, 0), kleur: 0xffd84d, zwaai: 0.3 });
  return b.maak();
}

/**
 * @param {number} max hoeveel bloemen er hooguit staan (de oudste maken plaats voor nieuwe)
 * @param {number} detail
 */
export function maakBloeispoor(max, detail) {
  const geo = maakBloemvorm(detail);
  const mat = maakPlantMateriaal({ gloed: 0x2a1f24 });
  // De kleur per bloem alleen op de blaadjes, niet op het hartje en de steel.
  const oud = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    oud(shader, r);
    shader.vertexShader = shader.vertexShader.replace(
      '#include <color_vertex>',
      `#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
        vColor.xyz = color.xyz * mix(instanceColor.xyz, vec3(1.0), step(0.5, bladpos.x));
      #endif`
    );
  };
  mat.customProgramCacheKey = () => 'bloeispoor';
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.setColorAt(0, new THREE.Color(1, 1, 1));

  const bezet = new Map(); // welke plekjes al een bloem hebben
  const plekVan = new Array(max).fill(null);
  /** @type {{ i:number, t:number, x:number, y:number, z:number, draai:number, schaal:number }[]} */
  const groeit = [];
  const plaats = new Array(max);
  let volgende = 0;
  let aantal = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const as = new THREE.Vector3(0, 1, 0);
  const kl = new THREE.Color();
  const CEL = 0.62;

  function zet(i, x, y, z, draai, schaal) {
    q.setFromAxisAngle(as, draai);
    s.setScalar(Math.max(1e-4, schaal));
    p.set(x, y, z);
    mesh.setMatrixAt(i, m.compose(p, q, s));
  }

  return {
    mesh,
    get aantal() {
      return aantal;
    },
    /**
     * Een nieuwe bloem op (x, y, z). keuze en draai: vaste toevalsgetallen 0..1 uit de simulatie.
     * @returns {boolean} false als daar al een bloem staat
     */
    voegToe(x, y, z, keuze, draai) {
      const sleutel = Math.floor(x / CEL) * 100003 + Math.floor(z / CEL);
      if (bezet.has(sleutel)) return false;
      const i = volgende;
      volgende = (volgende + 1) % max;
      if (plekVan[i] !== null) bezet.delete(plekVan[i]);
      plekVan[i] = sleutel;
      bezet.set(sleutel, i);
      aantal = Math.min(max, aantal + 1);
      mesh.count = aantal;
      mesh.setColorAt(i, kl.set(PALET[Math.floor(keuze * PALET.length) % PALET.length]));
      mesh.instanceColor.needsUpdate = true;
      const schaal = GROOTTE[0] + ((keuze * 7.31) % 1) * (GROOTTE[1] - GROOTTE[0]);
      plaats[i] = { x, y, z, draai: draai * Math.PI * 2, schaal };
      zet(i, x, y, z, 0, 0);
      groeit.push({ i, t: 0, ...plaats[i] });
      return true;
    },
    werkBij(dt) {
      if (!groeit.length) return;
      for (let k = groeit.length - 1; k >= 0; k--) {
        const g = groeit[k];
        g.t += dt;
        const f = Math.min(1, g.t / 0.5);
        // Opschieten met een veertje: even te groot, dan terug.
        const veer = 1 + Math.sin(f * Math.PI) * 0.45 * (1 - f * 0.5);
        zet(g.i, g.x, g.y, g.z, g.draai + (1 - f) * 2, g.schaal * f * veer);
        if (f >= 1) {
          zet(g.i, g.x, g.y, g.z, g.draai, g.schaal);
          groeit.splice(k, 1);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
