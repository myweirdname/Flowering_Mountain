// Lichamen door code (TP 5.7): vloeiende lobben (een lijn met een dikteprofiel) en bollen,
// vastgemaakt aan een gewrichtenboom. Alles wordt één huid op een skelet: één tekenopdracht
// per dier, en de gewrichten buigen zacht mee. Geen skeletbestanden, geen modellen.
// Assen: het dier kijkt naar +z, y is omhoog, x is opzij. Maten in meter.
// Naast lobben en bollen kan een lichaam ook gebouwd worden uit vormvelden (vormveld.js): dan
// versmelten spieren en botten vloeiend, zoals bij de echte tijger.
import * as THREE from 'three';
import { zoekRand, veldNormaal, vrijheid } from './vormveld.js';

const _ab = new THREE.Vector3();
const _ap = new THREE.Vector3();
const _kl = new THREE.Color();
const _t = new THREE.Vector3();
const _s = new THREE.Vector3();
const _u = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _e = new THREE.Vector3();

function afstandTotSegment(p, a, b) {
  _ab.subVectors(b, a);
  _ap.subVectors(p, a);
  const l2 = _ab.lengthSq();
  const t = l2 > 1e-9 ? THREE.MathUtils.clamp(_ap.dot(_ab) / l2, 0, 1) : 0;
  return _ap.addScaledVector(_ab, -t).length();
}

/**
 * @typedef {{ t: number, v: number, lokaal: THREE.Vector3, hoek?: number, boog?: number, holte?: number }} Info
 *   t: plaats langs de lob (0..1); v: rond de lob (0 = bovenkant, 1 = onderkant);
 *   lokaal: de eenheidsrichting in de bol of doorsnede (voor kleuren per kant);
 *   hoek: hoek rond de lijn (0..2π, 0 = boven); boog: afstand langs de lijn in meter;
 *   holte: 1 = vrij, 0 = diep in een plooi (alleen met de optie `holte`)
 * @typedef {{
 *   botten: string[],
 *   kleur?: number | ((p: THREE.Vector3, n: THREE.Vector3, i: Info) => number | THREE.Color),
 *   streep?: (p: THREE.Vector3, n: THREE.Vector3, i: Info) => [number, number, number],
 *   scherpte?: number,
 *   botGewicht?: (p: THREE.Vector3, i: Info) => [string, number][],
 *   holte?: { veld: import('./vormveld.js').Veld, bereik: number, sterkte: number },
 * }} Opties
 *   botten: aan welke botten dit deel mag hangen (met zachte overgang ertussen);
 *   streep: [u, v, sterkte] voor de strepenshader (u = langs de streeprichting in meter);
 *   botGewicht: zelf kiezen hoe sterk elk punt aan welk bot hangt (bv. de bek: boven aan het
 *     hoofd, onder aan de kaak), in plaats van volgens de afstand;
 *   holte: plooien en holtes donkerder maken, gemeten met een vormveld van het hele lichaam
 */
export class Lichaam {
  constructor() {
    /** @type {{ naam: string, ouder: number, pos: THREE.Vector3, eind: THREE.Vector3 }[]} */
    this.botten = [];
    this.namen = new Map();
    this.pos = [];
    this.nor = [];
    this.kleur = [];
    this.streep = [];
    this.skinI = [];
    this.skinW = [];
    this.index = [];
  }

  /** Een bot op plaats `pos` (in lichaamsassen). `eind` bepaalt mee welk stukje huid erbij hoort. */
  bot(naam, ouder, pos, eind) {
    this.namen.set(naam, this.botten.length);
    this.botten.push({ naam, ouder: ouder ? this.namen.get(ouder) : -1, pos: pos.clone(), eind: (eind ?? pos).clone() });
    return this;
  }

  /** Plaats van een bot in lichaamsassen (in rusthouding). */
  botPos(naam) {
    return this.botten[this.namen.get(naam)].pos;
  }

  /**
   * Een lob langs een vloeiende lijn met een dikteprofiel. Sluit zich vanzelf als het profiel
   * aan de uiteinden naar nul gaat. `op` kiest hoe de doorsnede ligt (voor platte, ovale vormen).
   * @param {THREE.Vector3[]} pad
   * @param {(t: number) => [number, number]} profiel [breedte, hoogte] als straal
   * @param {Opties & { ringen?: number, zijden?: number, op?: THREE.Vector3 }} o
   */
  lob(pad, profiel, o) {
    const ringen = o.ringen ?? 16;
    const zijden = o.zijden ?? 14;
    const lijn = new THREE.CatmullRomCurve3(pad);
    const op = o.op ?? new THREE.Vector3(0, 1, 0);
    const P = [];
    const N = [];
    const I = [];
    const lengte = lijn.getLength();
    const dt = 1e-3;
    for (let i = 0; i <= ringen; i++) {
      const t = i / ringen;
      lijn.getPointAt(t, _c);
      lijn.getTangentAt(t, _t);
      if (i === 0) {
        _s.crossVectors(_t, op);
        if (_s.lengthSq() < 0.01) _s.set(1, 0, 0).addScaledVector(_t, -_t.x);
      } else {
        // Meegedragen van de vorige ring: zo draait de doorsnede nooit plots om.
        _s.addScaledVector(_t, -_s.dot(_t));
      }
      _s.normalize();
      _u.crossVectors(_s, _t).normalize();
      const [rx, ry] = profiel(t);
      // Helling van het profiel (voor juiste normalen bij een dikker of dunner wordend stuk).
      const ta = Math.max(0, t - dt);
      const tb = Math.min(1, t + dt);
      const pa = profiel(ta);
      const pb = profiel(tb);
      const ds = (tb - ta) * lengte;
      const drx = (pb[0] - pa[0]) / ds;
      const dry = (pb[1] - pa[1]) / ds;
      for (let j = 0; j <= zijden; j++) {
        const a = (j / zijden) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const p = _c.clone().addScaledVector(_u, ca * ry).addScaledVector(_s, sa * rx);
        // Normaal van de ellips, gekanteld volgens de helling van het profiel.
        _n.copy(_u).multiplyScalar(ca / Math.max(ry, 1e-4)).addScaledVector(_s, sa / Math.max(rx, 1e-4)).normalize();
        const helling = ca * ca * dry + sa * sa * drx;
        _n.addScaledVector(_t, -helling).normalize();
        if (rx < 1e-4 && ry < 1e-4) _n.copy(_t).multiplyScalar(t < 0.5 ? -1 : 1);
        P.push(p);
        N.push(_n.clone());
        I.push({ t, v: (a <= Math.PI ? a : Math.PI * 2 - a) / Math.PI, lokaal: new THREE.Vector3(sa, ca, 0) });
      }
    }
    this.#rooster(P, N, I, ringen + 1, zijden + 1, o);
    return this;
  }

  /**
   * Een (uitgerekte) bol.
   * @param {THREE.Vector3} c midden
   * @param {[number, number, number]} r stralen in x, y, z
   * @param {Opties & { draai?: THREE.Euler, breed?: number, hoog?: number }} o
   */
  bol(c, r, o) {
    const breed = o.breed ?? 20;
    const hoog = o.hoog ?? 14;
    const q = new THREE.Quaternion().setFromEuler(o.draai ?? new THREE.Euler());
    const P = [];
    const N = [];
    const I = [];
    for (let i = 0; i <= hoog; i++) {
      const th = (i / hoog) * Math.PI;
      for (let j = 0; j <= breed; j++) {
        const ph = (j / breed) * Math.PI * 2;
        _e.set(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
        const p = new THREE.Vector3(_e.x * r[0], _e.y * r[1], _e.z * r[2]).applyQuaternion(q).add(c);
        const n = new THREE.Vector3(_e.x / r[0], _e.y / r[1], _e.z / r[2]).applyQuaternion(q).normalize();
        P.push(p);
        N.push(n);
        I.push({ t: 0, v: th / Math.PI, lokaal: _e.clone() });
      }
    }
    this.#rooster(P, N, I, hoog + 1, breed + 1, o);
    return this;
  }

  /**
   * Een huid rond een lijn, gevormd door een vormveld: vanuit elk punt van de lijn zoekt een
   * krans van stralen waar de rand van de vorm ligt. Aan beide uiteinden sluit een kapje van
   * stralen de vorm af. De lijn moet overal binnen de vorm lopen.
   * @param {THREE.Vector3[]} pad
   * @param {import('./vormveld.js').Veld} veld
   * @param {Opties & { rMax: number, ringen?: number, zijden?: number, kap?: [number, number], op?: THREE.Vector3 }} o
   *   rMax: hoe ver de rand hoogstens van de lijn ligt; kap: aantal ringen in elk eindkapje
   */
  langs(pad, veld, o) {
    const ringen = o.ringen ?? 24;
    const zijden = o.zijden ?? 20;
    const [kapA, kapB] = o.kap ?? [6, 6];
    const lijn = new THREE.CatmullRomCurve3(pad);
    const lengte = lijn.getLength();
    const op = o.op ?? new THREE.Vector3(0, 1, 0);
    // Assen langs de lijn, meegedragen van ring tot ring zodat de krans nooit omdraait.
    const assen = [];
    const s = new THREE.Vector3();
    for (let i = 0; i <= ringen; i++) {
      const t = i / ringen;
      const c = lijn.getPointAt(t);
      const raak = lijn.getTangentAt(t);
      if (i === 0) {
        s.crossVectors(raak, op);
        if (s.lengthSq() < 0.01) s.set(1, 0, 0).addScaledVector(raak, -raak.x);
      } else {
        s.addScaledVector(raak, -s.dot(raak));
      }
      s.normalize();
      assen.push({ t, c, raak, s: s.clone(), u: new THREE.Vector3().crossVectors(s, raak).normalize() });
    }
    const P = [];
    const N = [];
    const I = [];
    const rij = (as, kanteling) => {
      const ck = Math.cos(kanteling);
      const sk = Math.sin(kanteling);
      for (let j = 0; j <= zijden; j++) {
        const a = (j / zijden) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        _e.copy(as.u).multiplyScalar(ca * ck).addScaledVector(as.s, sa * ck).addScaledVector(as.raak, sk).normalize();
        const r = zoekRand(veld, as.c.x, as.c.y, as.c.z, _e.x, _e.y, _e.z, o.rMax);
        const p = as.c.clone().addScaledVector(_e, r);
        P.push(p);
        N.push(veldNormaal(veld, p.x, p.y, p.z, new THREE.Vector3()));
        const boog = as.t * lengte + _ap.subVectors(p, as.c).dot(as.raak);
        I.push({ t: as.t, v: (a <= Math.PI ? a : Math.PI * 2 - a) / Math.PI, hoek: a, lokaal: new THREE.Vector3(sa, ca, 0), boog });
      }
    };
    for (let i = 0; i < kapA; i++) rij(assen[0], (-Math.PI / 2) * (1 - i / kapA));
    for (const as of assen) rij(as, 0);
    for (let i = 1; i <= kapB; i++) rij(assen[ringen], (Math.PI / 2) * (i / kapB));
    this.#rooster(P, N, I, kapA + ringen + 1 + kapB, zijden + 1, o);
    return this;
  }

  /**
   * Een huid rond een middelpunt, gevormd door een vormveld (bv. een poot met teentjes).
   * Elke richting vanuit het midden mag de rand maar één keer raken.
   * @param {THREE.Vector3} midden
   * @param {import('./vormveld.js').Veld} veld
   * @param {Opties & { rMax: number, breed?: number, hoog?: number, draai?: THREE.Euler }} o
   */
  rond(midden, veld, o) {
    const breed = o.breed ?? 24;
    const hoog = o.hoog ?? 16;
    const q = new THREE.Quaternion().setFromEuler(o.draai ?? new THREE.Euler());
    const P = [];
    const N = [];
    const I = [];
    const d = new THREE.Vector3();
    for (let i = 0; i <= hoog; i++) {
      const th = (i / hoog) * Math.PI;
      for (let j = 0; j <= breed; j++) {
        const ph = (j / breed) * Math.PI * 2;
        _e.set(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
        d.copy(_e).applyQuaternion(q);
        const r = zoekRand(veld, midden.x, midden.y, midden.z, d.x, d.y, d.z, o.rMax);
        const p = midden.clone().addScaledVector(d, r);
        P.push(p);
        N.push(veldNormaal(veld, p.x, p.y, p.z, new THREE.Vector3()));
        I.push({ t: 0, v: th / Math.PI, hoek: ph, lokaal: _e.clone(), boog: 0 });
      }
    }
    this.#rooster(P, N, I, hoog + 1, breed + 1, o);
    return this;
  }

  #rooster(P, N, I, rijen, kolommen, o) {
    const start = this.pos.length / 3;
    const kandidaten = o.botten.map((b) => {
      const i = this.namen.get(b);
      if (i === undefined) throw new Error(`Onbekend bot: ${b}`);
      return i;
    });
    const scherpte = o.scherpte ?? 4;
    const gewichten = new Array(kandidaten.length);
    for (let k = 0; k < P.length; k++) {
      const p = P[k];
      const n = N[k];
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(n.x, n.y, n.z);
      let donker = 1;
      if (o.holte) {
        I[k].holte = vrijheid(o.holte.veld, p, n, o.holte.bereik);
        donker = 1 - (1 - I[k].holte) * o.holte.sterkte;
      }
      const kl = typeof o.kleur === 'function' ? o.kleur(p, n, I[k]) : o.kleur ?? 0xffffff;
      if (kl instanceof THREE.Color) _kl.copy(kl);
      else _kl.set(kl);
      this.kleur.push(_kl.r * donker, _kl.g * donker, _kl.b * donker);
      const st = o.streep ? o.streep(p, n, I[k]) : [0, 0, 0];
      this.streep.push(st[0], st[1], st[2]);
      if (o.botGewicht) {
        // Zelf gekozen gewichten (hoogstens vier botten).
        const lijst = o.botGewicht(p, I[k]).slice(0, 4);
        let som = 0;
        for (const [, w] of lijst) som += w;
        for (let q = 0; q < 4; q++) {
          const g = lijst[q];
          const i = g && this.namen.get(g[0]);
          if (g && i === undefined) throw new Error(`Onbekend bot: ${g[0]}`);
          this.skinI.push(g ? i : 0);
          this.skinW.push(g ? g[1] / som : 0);
        }
        continue;
      }
      // Huidgewichten: hoe dichter bij een bot, hoe meer dit punt met dat bot meebeweegt.
      let som = 0;
      for (let b = 0; b < kandidaten.length; b++) {
        const bot = this.botten[kandidaten[b]];
        const d = afstandTotSegment(p, bot.pos, bot.eind);
        gewichten[b] = 1 / (Math.pow(d, scherpte) + 1e-7);
        som += gewichten[b];
      }
      const volgorde = kandidaten.map((_, b) => b).sort((a, b) => gewichten[b] - gewichten[a]).slice(0, 4);
      let som4 = 0;
      for (const b of volgorde) som4 += gewichten[b];
      for (let s = 0; s < 4; s++) {
        const b = volgorde[s];
        this.skinI.push(b === undefined ? 0 : kandidaten[b]);
        this.skinW.push(b === undefined ? 0 : gewichten[b] / som4);
      }
    }
    // Driehoeken, altijd met de buitenkant naar buiten (we controleren met de normaal).
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    for (let i = 0; i < rijen - 1; i++) {
      for (let j = 0; j < kolommen - 1; j++) {
        const a = i * kolommen + j;
        const b = a + kolommen;
        for (const [x, y, z] of [
          [a, b, a + 1],
          [b, b + 1, a + 1],
        ]) {
          A.subVectors(P[y], P[x]);
          B.subVectors(P[z], P[x]);
          const kruis = A.cross(B);
          if (kruis.lengthSq() < 1e-14) continue; // samengevallen punt aan een uiteinde
          const goed = kruis.dot(N[x]) + kruis.dot(N[y]) + kruis.dot(N[z]) > 0;
          if (goed) this.index.push(start + x, start + y, start + z);
          else this.index.push(start + x, start + z, start + y);
        }
      }
    }
  }

  /**
   * Maak de huid en het skelet.
   * @param {THREE.Material} materiaal
   * @returns {{ mesh: THREE.SkinnedMesh, bot: Record<string, THREE.Bone> }}
   */
  maak(materiaal) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.kleur, 3));
    geo.setAttribute('streep', new THREE.Float32BufferAttribute(this.streep, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinI, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinW, 4));
    geo.setIndex(this.index);
    geo.computeBoundingSphere();

    const botten = this.botten.map((b) => {
      const bone = new THREE.Bone();
      bone.name = b.naam;
      return bone;
    });
    /** @type {Record<string, THREE.Bone>} */
    const bot = {};
    let wortel = null;
    this.botten.forEach((b, i) => {
      const bone = botten[i];
      bot[b.naam] = bone;
      if (b.ouder < 0) {
        bone.position.copy(b.pos);
        wortel = wortel ?? bone;
      } else {
        bone.position.subVectors(b.pos, this.botten[b.ouder].pos);
        botten[b.ouder].add(bone);
      }
    });
    const mesh = new THREE.SkinnedMesh(geo, materiaal);
    mesh.add(wortel);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(botten));
    mesh.frustumCulled = false; // de poten bewegen buiten de rustvorm
    return { mesh, bot };
  }
}

/**
 * Een groot, glanzend kawaii-oog, licht gebogen zodat het tegen een bol hoofd aansluit.
 * Alle laagjes zitten in één geometrie met kleuren per punt. Kijkt naar +z van zijn groep.
 * Knipperen: `knipper.scale.y` naar 0.
 * @param {{ straal: number, kromming: number, iris: number, donker: number, kant: number,
 *           wimpers?: boolean, lijntje?: number, hoogte?: number }} o
 */
export function maakDierOog(o) {
  const R = o.straal;
  const h = o.hoogte ?? 1.12; // iets hoger dan breed: lief en verwonderd
  const delen = [];
  const laag = (rx, ry, x, y, kleur, z, stukken = 28) => {
    const g = new THREE.CircleGeometry(1, stukken);
    g.scale(rx, ry, 1);
    g.translate(x, y, 0);
    delen.push({ g, kleur, z });
  };
  laag(R, R * h, 0, 0, o.donker, 0);                                 // donkere rand
  laag(R * 0.84, R * h * 0.84, 0, -R * 0.03, o.iris, 0.0015);        // iris
  laag(R * 0.6, R * 0.38, 0, -R * h * 0.42, 0xffffff, 0.0025, 20);   // lichte gloed onderaan (half doorzichtig via mengkleur)
  laag(R * 0.42, R * h * 0.5, 0, 0.0, o.donker, 0.0035);             // grote pupil: vriendelijk
  laag(R * 0.3, R * 0.3, -o.kant * R * 0.28, R * 0.38, 0xffffff, 0.005, 20); // grote glim
  laag(R * 0.13, R * 0.13, o.kant * R * 0.3, -R * 0.32, 0xffffff, 0.005, 14); // kleine glim
  if (o.wimpers) {
    // Drie krulwimpertjes naar buiten.
    for (let i = 0; i < 3; i++) {
      const a = 0.55 + i * 0.32;
      const x = o.kant * Math.cos(a) * R * 1.02;
      const y = Math.sin(a) * R * h * 1.02;
      const g = new THREE.CircleGeometry(1, 10);
      g.scale(R * 0.22, R * 0.08, 1);
      g.rotateZ(o.kant * (a - 0.2));
      g.translate(x + o.kant * R * 0.12, y + R * 0.04, 0);
      delen.push({ g, kleur: o.donker, z: 0.0005 });
    }
  }
  // Samenvoegen en buigen volgens de kromming van het hoofd.
  let n = 0;
  for (const d of delen) n += d.g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const kleur = new Float32Array(n * 3);
  const index = [];
  let o0 = 0;
  const irisKleur = new THREE.Color(o.iris);
  for (const d of delen) {
    const p = d.g.attributes.position;
    _kl.set(d.kleur);
    // De gloed onderaan is een lichtere iriskleur, geen wit.
    if (d.kleur === 0xffffff && d.z === 0.0025) _kl.copy(irisKleur).lerp(new THREE.Color(0xffffff), 0.45);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const k = o.kromming;
      const z = -(k - Math.sqrt(Math.max(0, k * k - x * x - y * y))) + d.z;
      pos.set([x, y, z], (o0 + i) * 3);
      kleur.set([_kl.r, _kl.g, _kl.b], (o0 + i) * 3);
    }
    const idx = d.g.index;
    for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + o0);
    o0 += p.count;
    d.g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(kleur, 3));
  geo.setIndex(index);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  const knipper = new THREE.Group();
  knipper.add(mesh);
  const groep = new THREE.Group();
  groep.add(knipper);
  return { groep, knipper };
}

/**
 * Zet een plat onderdeel (oog, neus) op een (uitgerekte) bol, bv. een stuk van het hoofd.
 * @param {THREE.Object3D} obj
 * @param {THREE.Vector3} midden midden van de bol, in de assen van de ouder
 * @param {[number, number, number]} r stralen van de bol
 * @param {THREE.Vector3} richting waar op de bol, gezien vanuit het midden
 * @param {number} uit extra afstand naar buiten
 * @param {number} draai draaiing rond de eigen as (radialen)
 */
export function opEllips(obj, midden, r, richting, uit = 0.003, draai = 0) {
  const d = richting.clone().normalize();
  const k = 1 / Math.sqrt((d.x / r[0]) ** 2 + (d.y / r[1]) ** 2 + (d.z / r[2]) ** 2);
  const zAs = new THREE.Vector3(d.x / r[0] ** 2, d.y / r[1] ** 2, d.z / r[2] ** 2).normalize();
  obj.position.copy(midden).addScaledVector(d, k).addScaledVector(zAs, uit);
  // +z van het onderdeel wijst naar buiten, +y zoveel mogelijk omhoog.
  const xAs = new THREE.Vector3(0, 1, 0).cross(zAs).normalize();
  const yAs = new THREE.Vector3().crossVectors(zAs, xAs);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAs, yAs, zAs));
  if (draai) obj.rotateZ(draai);
  return obj;
}

/** Kleine vlakke vormen met kleur per punt samenvoegen tot één mesh (neus, mond, neusgaten...). */
export class Gezicht {
  constructor() {
    this.geos = [];
  }
  /** @param {THREE.BufferGeometry} g @param {number} kleur @param {THREE.Object3D} plaats (alleen matrix wordt gebruikt) */
  voegToe(g, kleur, plaats) {
    plaats.updateMatrix();
    const geo = g.index ? g.toNonIndexed() : g;
    geo.applyMatrix4(plaats.matrix);
    _kl.set(kleur);
    const c = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < c.length; i += 3) c.set([_kl.r, _kl.g, _kl.b], i);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    this.geos.push(geo);
    return this;
  }
  maak() {
    let n = 0;
    for (const g of this.geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3);
    const kleur = new Float32Array(n * 3);
    let o = 0;
    for (const g of this.geos) {
      pos.set(g.attributes.position.array, o * 3);
      kleur.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(kleur, 3));
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  }
}
