// Animatie van een viervoeter door code (TP 5.7): stap, draf en galop uit golfbewegingen, met voeten die
// echt op de grond staan (elke poot rekent zelf uit hoe hij moet buigen om zijn voet te plaatsen),
// en daarbovenop losse laagjes: knipperen, rondkijken (soms naar jou), oren en staart.
// In het spel komen er nog bij: springen (voorbenen ingetrokken), neerkomen, hoofd schudden (weigeren),
// grazen, en een ritme dat de echte snelheid volgt zodat de hoeven niet over de grond glijden.
// Werkt voor pony en tijgers; het verschil zit in hun vorm en in een paar karaktertrekjes hieronder.
import * as THREE from 'three';
import { GANGEN, LEVEN } from '../data/dieren.js';

const klem = THREE.MathUtils.clamp;
const glad = THREE.MathUtils.smoothstep;
const meng = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

const _doel = new THREE.Vector3();
const _lok = new THREE.Vector3();
const _kijk = new THREE.Vector3();

// Karakter per soort: hoe het dier zijn hoofd, oren en staart beweegt.
const KARAKTER = {
  pony: { knik: 0.07, staartZwaai: 0.18, staartAs: 'z', oorDraai: 0.9, oorRust: [0.15, 0.25], schoudersRol: 0.02, hoefKnik: 1.2 },
  tijger: { knik: 0.025, staartZwaai: 0.32, staartAs: 'y', oorDraai: 0.45, oorRust: [0.05, 0.1], schoudersRol: 0.06, hoefKnik: 0.8 },
};

/**
 * @typedef {{ snelheid?: number, lucht?: boolean, vy?: number, graast?: boolean, achteruit?: boolean }} Extra
 * snelheid: echte vaart in lichaamsmaat (m/s); lucht: ze springt; vy: snelheid omhoog;
 * graast: hoofd naar het gras; achteruit: ze stapt terug.
 */

/**
 * @param {ReturnType<typeof import('./maak/pony.js').maakPony> | ReturnType<typeof import('./maak/tijger.js').maakTijger>} dier
 * @param {number} [zaad] kleine verschillen in timing tussen dieren
 * @param {{ opHoef?: (poot: number, voor: boolean) => void }} [opties] opHoef: elke keer dat een hoef neerkomt
 */
export function maakDierAnimatie(dier, zaad = 0, opties = {}) {
  const K = KARAKTER[dier.soort];
  const { bot, poten, staart, ogen } = dier;
  let r = (zaad * 9301 + 49297) % 233280;
  const kans = () => (r = (r * 9301 + 49297) % 233280) / 233280;

  // Huidige gang (vloeiend in overgang naar de gekozen gang).
  const g = { frequentie: 0, pas: 0, optil: 0, deining: 0, draagtijd: 1, maxFrequentie: 1, galop: 0, fase: [...GANGEN.stap.fase] };
  // Grotere dieren nemen grotere stappen.
  const schaal = dier.pootLengte / 0.47;
  let cyclus = kans();
  let tijd = kans() * 10;
  let volgendeKnipper = 1 + kans() * 2;
  let knipperTot = 0;
  let volgendeOor = 1 + kans() * 2;
  const oor = [
    { y: 0, z: 0, doelY: 0, doelZ: 0, flap: 0 },
    { y: 0, z: 0, doelY: 0, doelZ: 0, flap: 0 },
  ];
  let volgendeKijk = 0.5;
  let kijkNaarCamera = false;
  const kijkRichting = new THREE.Vector3(0, -0.1, 1); // in lichaamsassen, als geen camera
  const kijk = { yaw: 0, pitch: 0 };
  let zwiep = 0; // een snelle staartzwiep (vliegjes wegjagen)
  let blij = 0;
  let blijTijd = 0;
  let sprong = 0;   // 0 = op de grond, 1 = in de lucht
  let vyZacht = 0;
  let plet = 0;     // even door de knieën bij het neerkomen
  let schudTijd = 0;
  let graas = 0;
  const vorigeF = [0, 0, 0, 0];

  return {
    /** Laat het dier blij reageren (bv. na een tik of aai). */
    blij() {
      blijTijd = 1.6;
      zwiep = 1;
    },
    /** Hoofd schudden: "nee, dat doe ik niet" (weigeren). */
    schud() {
      schudTijd = 1.0;
      zwiep = 1;
    },
    /** Neerkomen na een sprong, sterkte 0..1. */
    land(sterkte) {
      plet = Math.max(plet, klem(sterkte, 0, 1));
    },

    /**
     * @param {number} dt
     * @param {'stil' | 'stap' | 'draf' | 'galop' | 'terug'} gang
     * @param {THREE.Camera} [camera] om af en toe naar te kijken
     * @param {Extra} [extra]
     */
    werkBij(dt, gang, camera, extra = {}) {
      tijd += dt;
      const doel = GANGEN[gang === 'terug' ? 'stap' : gang];
      const o = 1 - Math.exp(-LEVEN.overgang * 1.6 * dt);
      for (const k of ['frequentie', 'pas', 'optil', 'deining', 'draagtijd', 'maxFrequentie', 'galop']) g[k] += ((doel[k] ?? 0) - g[k]) * o;
      for (let i = 0; i < 4; i++) g.fase[i] += (doel.fase[i] - g.fase[i]) * o;
      // Het ritme blijft doorlopen tijdens het afremmen, zodat de poten netjes terugkomen.
      let freq = Math.max(g.frequentie, 0.6 * glad(g.pas, 0.002, 0.05)) / Math.sqrt(schaal);
      let pas = g.pas * schaal;
      const D = klem(g.draagtijd, 0.3, 0.999);
      if (extra.snelheid !== undefined && pas > 0.02) {
        // De voet die op de grond staat, schuift even snel naar achter als het dier vooruit gaat.
        const v = Math.abs(extra.snelheid);
        freq = klem((v * D) / pas, freq * 0.85, g.maxFrequentie);
        if (v > 0.05) pas = Math.min(pas * 1.8, (v * D) / freq);
      }
      cyclus = (((cyclus + freq * dt * (extra.achteruit ? -1 : 1)) % 1) + 1) % 1;
      const optil = g.optil * schaal;
      const bewegen = glad(g.pas, 0, 0.3); // 0 = stil, 1 = volop in beweging
      const draf = glad(g.frequentie, 1.1, 1.8) * (1 - g.galop);
      const galop = g.galop;

      // Springen, neerkomen, schudden en grazen: vloeiend aan en uit.
      sprong += ((extra.lucht ? 1 : 0) - sprong) * (1 - Math.exp(-14 * dt));
      vyZacht += (klem((extra.vy ?? 0) / 6, -1, 1) - vyZacht) * (1 - Math.exp(-10 * dt));
      plet = Math.max(0, plet - dt * 4);
      schudTijd = Math.max(0, schudTijd - dt);
      graas += ((extra.graast && !extra.lucht ? 1 : 0) - graas) * (1 - Math.exp(-2.5 * dt));
      const schud = Math.sin(Math.min(1, schudTijd / 0.15) * Math.PI * 0.5) * Math.min(1, schudTijd * 3);

      // --- Lijf: deinen, kantelen, wiegen ---
      const c2 = cyclus * TAU * 2;
      const c1 = cyclus * TAU;
      const deinen =
        g.deining * schaal * (0.5 - 0.5 * Math.cos(c2 + draf * Math.PI * 0.5)) * (1 - galop) +
        galop * 0.055 * schaal * (0.5 - 0.5 * Math.cos(c1 + 0.9));
      const ademen = Math.sin(tijd * 1.6) * 0.004 * (1 - bewegen);
      bot.lijf.position.y = dier.rugY - 0.012 * schaal + (deinen + ademen - draf * 0.01) * (1 - sprong) - plet * 0.07 * schaal;
      bot.lijf.rotation.x =
        (Math.sin(c2) * 0.012 * bewegen + draf * 0.02 * Math.sin(c2 + 1)) * (1 - galop) +
        galop * 0.085 * Math.sin(c1 + 0.4) * (1 - sprong) -
        vyZacht * 0.32 * sprong + plet * 0.06;
      bot.lijf.rotation.z = (Math.sin(cyclus * TAU) * 0.025 * bewegen * (1 - draf * 0.6) + Math.sin(tijd * 0.7) * 0.01 * (1 - bewegen)) * (1 - sprong);
      bot.lijf.rotation.y = Math.sin(cyclus * TAU) * 0.02 * bewegen * (1 - sprong);
      // Schouders en heupen rollen tegen elkaar in (vooral bij de tijger: sluipende tred).
      bot.voor.rotation.z = Math.sin(cyclus * TAU) * K.schoudersRol * bewegen;
      bot.achter.rotation.z = -Math.sin(cyclus * TAU + 0.6) * K.schoudersRol * bewegen;
      bot.voor.rotation.y = Math.sin(cyclus * TAU) * K.schoudersRol * 0.6 * bewegen;
      bot.achter.rotation.y = -Math.sin(cyclus * TAU) * K.schoudersRol * 0.6 * bewegen;

      // --- Rondkijken: soms naar jou, soms ergens anders ---
      if (tijd > volgendeKijk) {
        volgendeKijk = tijd + LEVEN.kijkTussen[0] + kans() * (LEVEN.kijkTussen[1] - LEVEN.kijkTussen[0]);
        kijkNaarCamera = !!camera && kans() < LEVEN.kijkNaarJou;
        kijkRichting.set((kans() - 0.5) * 1.6, (kans() - 0.6) * 0.6, 1);
      }
      let yaw = Math.atan2(kijkRichting.x, kijkRichting.z);
      let pitch = Math.atan2(kijkRichting.y, 1);
      if (kijkNaarCamera && camera) {
        bot.voor.updateWorldMatrix(true, false);
        _kijk.copy(camera.position);
        bot.voor.worldToLocal(_kijk);
        _lok.copy(bot.hoofd.position).add(bot.nek.position);
        _kijk.sub(_lok);
        yaw = Math.atan2(_kijk.x, _kijk.z);
        pitch = Math.atan2(_kijk.y, Math.hypot(_kijk.x, _kijk.z));
        // Wat recht achter het dier ligt, kan het niet zien: dan kijkt het gewoon vooruit.
        if (Math.abs(yaw) > 2.1) yaw = 0;
      }
      yaw = klem(yaw, -1.0, 1.0) * (1 - bewegen * 0.6) * (1 - graas * 0.7);
      pitch = klem(pitch, -0.35, 0.45) * (1 - graas);
      const ko = 1 - Math.exp(-3.5 * dt);
      kijk.yaw += (yaw - kijk.yaw) * ko;
      kijk.pitch += (pitch - kijk.pitch) * ko;
      const knik = Math.sin(c2 - 0.6) * K.knik * bewegen * (1 - draf * 0.5) * (1 - galop) + galop * Math.sin(c1 - 0.6) * 0.11;
      // Blij: hoofdje schuin, oogjes dicht van plezier.
      blijTijd = Math.max(0, blijTijd - dt);
      blij += ((blijTijd > 0 ? 1 : 0) - blij) * (1 - Math.exp(-8 * dt));
      const knabbel = graas * Math.max(0, Math.sin(tijd * 7)) * 0.05;
      bot.nek.rotation.set(
        -kijk.pitch * 0.4 + knik + graas * 0.95 - sprong * vyZacht * 0.15,
        kijk.yaw * 0.45 + Math.sin(tijd * 19) * 0.42 * schud,
        0
      );
      bot.hoofd.rotation.set(
        -kijk.pitch * 0.6 + knik * 0.5 - blij * 0.1 + graas * 0.4 + knabbel,
        kijk.yaw * 0.55 + Math.sin(tijd * 19 - 0.6) * 0.3 * schud,
        Math.sin(tijd * 7) * 0.1 * blij + blij * 0.2 + Math.sin(tijd * 19 + 1) * 0.22 * schud
      );

      // --- Poten: elke voet volgt zijn baan, de poot buigt zich ernaar (IK met twee stukken) ---
      bot.lijf.updateWorldMatrix(true, true);
      const kantel = bot.lijf.rotation.x;
      const omhoog = klem(vyZacht * 1.6 + 0.5, 0, 1); // 1 = nog aan het stijgen, 0 = aan het dalen
      for (let i = 0; i < 4; i++) {
        const p = poten[i];
        const f = (((cyclus + g.fase[i]) % 1) + 1) % 1;
        let dz;
        let dy = 0;
        let zwaai = 0;
        if (f < D) {
          dz = pas * (0.5 - f / D); // op de grond, schuift naar achter
        } else {
          zwaai = (f - D) / (1 - D);
          const e = zwaai * zwaai * (3 - 2 * zwaai);
          dz = pas * (-0.5 + e);
          dy = optil * Math.sin(Math.PI * zwaai) * (p.voor ? 1 : 0.85);
        }
        // Een hoef komt neer: geluid.
        if (opties.opHoef && f < vorigeF[i] - 0.5 && bewegen > 0.3 && sprong < 0.3 && !extra.achteruit) opties.opHoef(i, p.voor);
        vorigeF[i] = f;
        // In de lucht: voorbenen ingetrokken, achterbenen eerst gestrekt (afzet), dan ook ingetrokken;
        // vlak voor het neerkomen reiken de voorbenen naar de grond.
        if (sprong > 0.01) {
          let sz;
          let sy;
          if (p.voor) {
            sz = meng(0.24, 0.12, omhoog) * schaal;
            sy = meng(0.1, 0.27, omhoog) * schaal;
          } else {
            sz = meng(-0.04, -0.3, omhoog) * schaal;
            sy = meng(0.2, 0.06, omhoog) * schaal;
          }
          dz = meng(dz, sz, sprong);
          dy = meng(dy, sy, sprong);
          zwaai *= 1 - sprong;
        }
        _doel.set(p.rust.x, p.rust.y + dy, p.rust.z + dz);
        bot.wortel.localToWorld(_doel);
        p.boven.parent.worldToLocal(_doel);
        const hz = _doel.z - p.boven.position.z;
        const hy = _doel.y - p.boven.position.y;
        const L1 = p.L1;
        const L2 = p.L2;
        const d = klem(Math.hypot(hz, hy), Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.999);
        const phi = Math.atan2(hz, -hy);
        const alfa = Math.acos(klem((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
        const beta = Math.acos(klem((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
        const t1 = phi + p.buig * alfa;
        const buig = Math.PI - beta;
        const t2 = t1 - p.buig * buig;
        p.boven.rotation.x = -t1;
        p.onder.rotation.x = p.buig * buig;
        // De voet blijft plat op de grond; tijdens het zwaaien klapt hij even om (hoefje omhoog).
        const ouderKantel = kantel + (p.voor ? bot.voor.rotation.x : bot.achter.rotation.x);
        const inLucht = sprong * (p.voor ? 0.9 : 0.5);
        p.voet.rotation.x = t2 - ouderKantel + (Math.sin(Math.PI * zwaai) * K.hoefKnik * (p.voor ? 1 : 0.55) * glad(optil, 0, 0.05)) + inLucht;
      }

      // --- Staart ---
      zwiep = Math.max(0, zwiep - dt * 0.9);
      if (dier.soort === 'pony' && kans() < dt * 0.12) zwiep = 1;
      const n = staart.length;
      for (let i = 0; i < n; i++) {
        const b = staart[i];
        const t = (i + 1) / n;
        const golf = Math.sin(tijd * (dier.soort === 'pony' ? 1.6 : 1.1) - i * 0.7) * K.staartZwaai * t;
        const snel = Math.sin(tijd * 11 - i * 0.9) * zwiep * 0.5 * t;
        const stap = Math.sin(cyclus * TAU - i * 0.5) * 0.12 * bewegen * t;
        if (K.staartAs === 'z') {
          b.rotation.z = golf + snel + stap;
          // Bij draf en galop gaat de staart wat op, in de lucht wappert hij achter haar aan.
          b.rotation.x = i === 0 ? -0.25 * draf - 0.45 * galop - blij * 0.2 - 0.6 * sprong : -0.1 * sprong;
        } else {
          b.rotation.y = golf + snel + stap;
          // Tijger: het puntje krult op en neer; bij blijdschap gaat de staart rechtop.
          b.rotation.x = (i >= n - 2 ? Math.sin(tijd * 1.7) * 0.25 : 0) - blij * (i < 2 ? 0.35 : 0.05);
        }
      }

      // --- Oren: rustig, af en toe eentje draaien of schudden ---
      if (tijd > volgendeOor) {
        volgendeOor = tijd + LEVEN.oorTussen[0] + kans() * (LEVEN.oorTussen[1] - LEVEN.oorTussen[0]);
        const welk = kans() < 0.5 ? 0 : 1;
        const soort = kans();
        if (soort < 0.4) oor[welk].doelY = (kans() < 0.5 ? -1 : 1) * K.oorDraai * (0.5 + kans() * 0.5);
        else if (soort < 0.7) oor[welk].flap = 1;
        else for (const q of oor) (q.doelY = 0), (q.doelZ = 0);
      }
      for (let i = 0; i < 2; i++) {
        const q = oor[i];
        const kant = i === 0 ? 1 : -1;
        if (schud > 0.3) q.flap = 1;
        q.flap = Math.max(0, q.flap - dt * 3);
        const oo = 1 - Math.exp(-6 * dt);
        // Bij een sprong spitst ze haar oren naar voren.
        q.y += (q.doelY * (1 - blij) * (1 - sprong) - q.y) * oo;
        const b = i === 0 ? bot.oorL : bot.oorR;
        b.rotation.y = kant * q.y;
        b.rotation.z = -kant * (K.oorRust[0] + Math.sin(tijd * 30) * q.flap * 0.35) + kant * blij * 0.15;
        b.rotation.x = -K.oorRust[1] * (1 - blij) - sprong * 0.25;
      }

      // --- Knipperen (en dichtgeknepen oogjes van plezier) ---
      if (tijd > volgendeKnipper) {
        knipperTot = tijd + LEVEN.knipperDuur;
        volgendeKnipper = tijd + LEVEN.knipperTussen[0] + kans() * (LEVEN.knipperTussen[1] - LEVEN.knipperTussen[0]);
        if (kans() < 0.2) volgendeKnipper = tijd + 0.28;
      }
      const dicht = tijd < knipperTot ? Math.sin(((knipperTot - tijd) / LEVEN.knipperDuur) * Math.PI) : 0;
      for (const oog of ogen) oog.scale.y = Math.max(0.06, 1 - Math.max(dicht, blij * 0.88, graas * 0.5) * 0.94);
    },
  };
}
