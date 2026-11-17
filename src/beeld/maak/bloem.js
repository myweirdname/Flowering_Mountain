// De bloemgenerator, eerste versie (TP 5.5): een bloemplant uit "genen".
// Familie bepaalt de vorm (hibiscus, frangipani, lelie, heliconia), het palet de snoepkleuren.
// De blaadjes komen uit dezelfde bladgenerator als de bladplanten.
import * as THREE from 'three';
import { Bouwer, maakBuis, maakBol, matrix } from './vorm.js';
import { maakBlad } from './blad.js';

/**
 * @param {{ familie: string, palet: number[], zaad: number }} gen
 * @param {typeof import('../../data/flora.js').FLORA} F
 * @param {number} detail
 * @param {() => number} toeval
 */
export function maakBloemplant(gen, F, detail, toeval) {
  const fam = F.bloemFamilies[gen.familie];
  const [hart, blaadje, rand] = gen.palet;
  const bouwer = new Bouwer();
  const H = fam.hoogte[0] + toeval() * (fam.hoogte[1] - fam.hoogte[0]);

  // Een paar bladeren aan de voet.
  const voetBlad = maakBlad(
    { vorm: 'ovaal', lengte: 0.38, breedte: 0.17, kleur: F.bladKleurBloem, nerf: 0x9ff08a, rand: 0x6fdc7a, kom: 0.15, buiging: 0.35 },
    0
  );
  const nBlad = detail ? 4 : 3;
  for (let i = 0; i < nBlad; i++) {
    const a = (i / nBlad) * Math.PI * 2 + toeval();
    bouwer.voegToe(voetBlad, { matrix: matrix(0, 0.04, 0, -0.5 - toeval() * 0.3, a, 0), zwaai: (p, e) => e * 0.4 });
  }
  voetBlad.dispose();

  const kop = gen.familie === 'heliconia' ? maakHeliconia(fam, hart, blaadje, rand, detail) : maakBloemkop(fam, hart, blaadje, rand, detail);
  const nBloem = detail ? fam.bloemen : Math.min(fam.bloemen, 2);
  for (let i = 0; i < nBloem; i++) {
    const a = (i / nBloem) * Math.PI * 2 + toeval() * 1.2;
    const uit = nBloem > 1 ? 0.12 + toeval() * 0.1 : 0.03;
    const h = H * (nBloem > 1 ? 0.75 + toeval() * 0.3 : 1);
    const top = new THREE.Vector3(Math.sin(a) * uit, h, Math.cos(a) * uit);
    const steel = maakBuis(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(top.x * 0.3, h * 0.5, top.z * 0.3), top.clone()],
      (t) => 0.02 * (1 - 0.3 * t),
      detail ? 4 : 2,
      detail ? 4 : 3
    );
    bouwer.voegToe(steel, { kleur: F.steelKleurBloem, zwaai: (p) => p.y * 0.35 });
    // De bloem kijkt een beetje naar buiten en omhoog.
    const kantel = gen.familie === 'heliconia' ? 0 : -0.5 - toeval() * 0.4;
    bouwer.voegToe(kop, { matrix: matrix(top.x, top.y, top.z, kantel, a, 0), zwaai: h * 0.35 + 0.05 });
  }
  kop.dispose();
  return bouwer.maak();
}

/** Een open bloem met blaadjes rond een hart (hibiscus, frangipani, lelie). De bloem kijkt naar +y. */
function maakBloemkop(fam, hart, blaadje, rand, detail) {
  const bouwer = new Bouwer();
  const blad = maakBlad(
    {
      vorm: fam.breedte / fam.lengte > 0.7 ? 'peddel' : 'ovaal',
      lengte: fam.lengte,
      breedte: fam.breedte,
      kleur: blaadje,
      kom: fam.kom * 0.6,
      buiging: -fam.kom * 0.4,
      verloop: [hart, blaadje, rand],
      nL: detail ? 4 : 3,
      nW: detail ? 2 : 1,
    },
    detail
  );
  const n = fam.blaadjes;
  const open = 0.5 - fam.kom * 0.9; // hoe plat de bloem openligt (radialen boven horizontaal)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    bouwer.voegToe(blad, { matrix: matrix(0, 0, 0, -Math.max(0.05, open), a, fam.draai) });
  }
  blad.dispose();
  // Het hartje van de bloem.
  const midden = maakBol(fam.lengte * 0.16, 0);
  bouwer.voegToe(midden, { matrix: matrix(0, fam.lengte * 0.05, 0, 0, 0, 0, 1, 0.6, 1), kleur: hart });
  midden.dispose();
  if (fam.meeldraad > 0) {
    // De meeldraadstijl met een geel bolletje: het herkenningsteken van een hibiscus.
    const l = fam.lengte * fam.meeldraad * 1.4;
    const top = new THREE.Vector3(0, l, l * 0.25);
    const stijl = maakBuis([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, l * 0.5, l * 0.08), top], () => fam.lengte * 0.035, 3, 4);
    bouwer.voegToe(stijl, { kleur: rand });
    stijl.dispose();
    const knop = maakBol(fam.lengte * 0.075, 0);
    bouwer.voegToe(knop, { matrix: matrix(top.x, top.y, top.z), kleur: 0xffe14d });
    knop.dispose();
  }
  return bouwer.maak();
}

/** Heliconia (kreeftenklauw): bootvormige schutbladen die zigzaggend langs de steel omhoog staan. */
function maakHeliconia(fam, hart, blaadje, rand, detail) {
  const bouwer = new Bouwer();
  const n = detail ? fam.schutbladen : Math.max(3, fam.schutbladen - 2);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const l = fam.lengte * (1.15 - 0.55 * t);
    const blad = maakBlad({ vorm: 'ovaal', lengte: l, breedte: l * 0.5, kleur: blaadje, kom: 1.4, buiging: -0.25, verloop: [hart, blaadje, rand], nL: 3, nW: 2 }, detail);
    const kant = i % 2 ? 1 : -1;
    bouwer.voegToe(blad, { matrix: matrix(0, -0.05 + t * fam.lengte * 2.2, 0, -0.55, kant * Math.PI * 0.5, 0) });
    blad.dispose();
  }
  const steel = maakBuis(
    [new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.02, fam.lengte, 0), new THREE.Vector3(0, fam.lengte * 2.4, 0)],
    () => 0.018,
    3,
    3
  );
  bouwer.voegToe(steel, { kleur: 0x58b04a });
  steel.dispose();
  return bouwer.maak();
}
