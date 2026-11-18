// Animatie van de avonturier door code (TP 5.7): geen skeletbestanden, alleen golfbewegingen op
// scharnieren (heupen, schouders) en een paar laagjes erbovenop (knipperen, ademen, pletten).
// Leest alleen de toestand uit de simulatie; verandert er niets aan.
import * as THREE from 'three';
import { ANIMATIE as A } from '../data/animatie.js';

const klem = THREE.MathUtils.clamp;

/**
 * @param {ReturnType<typeof import('./maak/testfiguur.js').maakTestfiguur>} delen
 * @param {{ onStap?: () => void }} opties onStap: elke keer dat een voet de grond raakt (voor geluid)
 */
export function maakAnimatie(delen, { onStap } = {}) {
  const { lijf, benen, armen, ogen, basisSchaal } = delen;
  let fase = 0;          // loopcyclus in radialen
  let tijd = 0;
  let pletten = 0;
  let volgendeKnipper = 2;
  let knipperTot = 0;
  // Huidige hoeken, die vloeiend naar hun doel bewegen.
  const huidig = { benen: [0, 0], armenX: [0, 0], armenZ: [-A.armRust, A.armRust], beenZ: [0, 0], leun: 0, wieg: 0, hoog: 0 };

  return {
    /** Laat het figuurtje plat neerkomen (bij een landing), sterkte 0..1. */
    land(sterkte) {
      pletten = Math.max(pletten, klem(sterkte, 0, 1));
    },

    /**
     * @param {any} s speler uit de simulatie
     * @param {number} dt
     * @param {number} snelheidRen rensnelheid (voor de verhouding wandelen/rennen)
     */
    werkBij(s, dt, snelheidRen) {
      tijd += dt;
      const v = Math.hypot(s.vel[0], s.vel[2]);
      const ren = klem(v / snelheidRen, 0, 1);
      const zwemt = s.modus === 'zwemmen';
      const klimt = !!s.klimt;

      // Doelhoudingen.
      let beenX = [0, 0];
      let armX = [0, 0];
      let armZ = [-A.armRust, A.armRust];
      let beenZ = [0, 0];
      let leun = 0;
      let hoog = 0;
      let wieg = 0;

      if (klimt) {
        // Opklimmen over een rand: armen hoog vooruit, beentjes trappelen.
        fase += dt * 18;
        armX = [-2.6, -2.6];
        armZ = [-0.25, 0.25];
        beenX = [Math.sin(fase) * 0.9, -Math.sin(fase) * 0.9];
        leun = 0.25;
      } else if (zwemt) {
        // Schoolslag: armen zwaaien rond, beentjes schoppen, lijf voorover in het water.
        fase += dt * (3 + v * 2.2);
        const slag = Math.sin(fase);
        armX = [-1.6 + slag * 0.5, -1.6 + slag * 0.5];
        armZ = [-0.4 - (slag * 0.5 + 0.5) * 0.9, 0.4 + (slag * 0.5 + 0.5) * 0.9];
        beenX = [Math.sin(fase * 2) * 0.5, -Math.sin(fase * 2) * 0.5];
        leun = A.zwemLeun;
        hoog = Math.sin(tijd * 2.4) * 0.03;
      } else if (s.glijdt) {
        // Afglijden: armen wijd voor het evenwicht, achterover leunen.
        armX = [-0.4, -0.4];
        armZ = [-1.5, 1.5];
        beenX = [-0.5, -0.3];
        leun = -0.3;
        wieg = Math.sin(tijd * 9) * 0.08;
      } else if (!s.opGrond) {
        if (s.vel[1] > 0) {
          // Omhoog: armen de lucht in, één knietje op.
          armX = [-0.3, -0.3];
          armZ = [-2.5, 2.5];
          beenX = [-1.0, 0.35];
        } else {
          // Vallen: armen opzij, beentjes los.
          armX = [-0.2, -0.2];
          armZ = [-1.35, 1.35];
          beenX = [-0.4, 0.2];
          beenZ = [-0.15, 0.15];
        }
        leun = 0.1;
      } else if (v > A.stilDrempel) {
        // Wandelen en rennen: benen en armen tegengesteld, groter en sneller bij rennen.
        const vorige = Math.sin(fase);
        fase += v * (A.fasePerMeter + ren * A.faseRenExtra) * dt;
        const sn = Math.sin(fase);
        if (onStap && Math.sign(sn) !== Math.sign(vorige)) onStap();
        const beenAmp = A.beenLoop + (A.beenRen - A.beenLoop) * ren;
        const armAmp = A.armLoop + (A.armRen - A.armLoop) * ren;
        beenX = [sn * beenAmp, -sn * beenAmp];
        armX = [-sn * armAmp, sn * armAmp];
        armZ = [-A.armRust - ren * 0.25, A.armRust + ren * 0.25];
        leun = ren * A.renLeun;
        hoog = Math.abs(Math.cos(fase)) * (A.hupLoop + (A.hupRen - A.hupLoop) * ren);
        wieg = sn * A.wieg * (1 - ren * 0.5);
      } else {
        // Stilstaan: rustig ademen en een klein beetje wiegen.
        armX = [Math.sin(tijd * 1.3) * 0.06, -Math.sin(tijd * 1.3) * 0.06];
        wieg = Math.sin(tijd * 1.1) * 0.025;
      }

      // Vloeiend naar de doelhouding.
      const t = 1 - Math.exp(-A.soepel * dt);
      for (let i = 0; i < 2; i++) {
        huidig.benen[i] += (beenX[i] - huidig.benen[i]) * t;
        huidig.beenZ[i] += (beenZ[i] - huidig.beenZ[i]) * t;
        huidig.armenX[i] += (armX[i] - huidig.armenX[i]) * t;
        huidig.armenZ[i] += (armZ[i] - huidig.armenZ[i]) * t;
        benen[i].rotation.set(huidig.benen[i], 0, huidig.beenZ[i]);
        armen[i].rotation.set(huidig.armenX[i], 0, huidig.armenZ[i], 'ZXY');
      }
      huidig.leun += (leun - huidig.leun) * t;
      huidig.wieg += (wieg - huidig.wieg) * t;
      huidig.hoog += (hoog - huidig.hoog) * Math.min(1, t * 2);

      // Pletten bij een landing, uitrekken tijdens het stijgen.
      pletten = Math.max(0, pletten - dt * 6);
      const rek = s.opGrond || zwemt || klimt ? 0 : klem(s.vel[1] / 8, -0.5, 1) * A.rekken;
      const adem = s.opGrond && v < A.stilDrempel ? Math.sin(tijd * 2.2) * 0.012 : 0;
      const sy = 1 + rek + adem - pletten * A.pletten;
      lijf.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)).multiplyScalar(basisSchaal);
      lijf.rotation.set(huidig.leun, 0, huidig.wieg);
      lijf.position.y = huidig.hoog;

      // Knipperen: af en toe, soms twee keer kort na elkaar.
      if (tijd > volgendeKnipper) {
        knipperTot = tijd + A.knipperDuur;
        volgendeKnipper = tijd + A.knipperTussen[0] + Math.random() * (A.knipperTussen[1] - A.knipperTussen[0]);
        if (Math.random() < 0.2) volgendeKnipper = tijd + 0.25;
      }
      const dicht = tijd < knipperTot ? Math.sin(((knipperTot - tijd) / A.knipperDuur) * Math.PI) : 0;
      for (const o of ogen) o.scale.y = 1 - dicht * 0.9;
    },
  };
}
