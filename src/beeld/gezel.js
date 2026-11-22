// Het beeld van de tijger als reisgezel: de echte Bengaalse tijger uit de dierenproef, met zijn animatie,
// een schaduwvlek, en wat hij bekijkt (jou, de pony, de slaapbloem). De simulatie zegt waar hij is en wat hij doet.
import * as THREE from 'three';
import { TIJGERVORM, TIJGERS } from '../data/dieren.js';
import { GEZEL } from '../data/tijger.js';
import { maakTijger } from './maak/tijger.js';
import { maakDierAnimatie } from './dierAnimatie.js';

/**
 * @param {THREE.Scene} scene
 * @param {{ schaduw: boolean, detail: boolean }} K kwaliteit
 */
export function maakGezelbeeld(scene, K, soort = GEZEL.soort) {
  const dier = maakTijger(TIJGERVORM, TIJGERS[soort], 0, K.detail ? {} : GEZEL.laag);
  const houder = new THREE.Group();
  houder.scale.setScalar(GEZEL.schaal);
  houder.add(dier.groep);
  // De vlek onder het midden van het lijf (bij de echte tijger een eindje voor de heupen).
  const schaduw = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.22, depthWrite: false })
  );
  schaduw.renderOrder = 2;
  scene.add(houder, schaduw);
  if (K.schaduw) {
    dier.groep.traverse((o) => (o.castShadow = true));
    schaduw.visible = false;
  }
  const anim = maakDierAnimatie(dier, 7);
  const pos = new THREE.Vector3();
  const kijk = new THREE.Vector3();
  let kijkZacht = null;
  const midden = new THREE.Vector3();

  return {
    houder,
    anim,
    dier,
    /**
     * @param {import('../sim/wezens/tijger.js').Gezel} t
     * @param {number} overgang tussen de vorige en de huidige simulatiestap (0..1)
     * @param {number} dt
     * @param {THREE.Camera} camera
     * @param {(x: number, z: number) => number} grondOp
     */
    werkBij(t, overgang, dt, camera, grondOp) {
      pos.set(
        t.vorigePos[0] + (t.pos[0] - t.vorigePos[0]) * overgang,
        t.vorigePos[1] + (t.pos[1] - t.vorigePos[1]) * overgang,
        t.vorigePos[2] + (t.pos[2] - t.vorigePos[2]) * overgang
      );
      let dr = t.richting - t.vorigeRichting;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      houder.position.copy(pos);
      houder.rotation.y = t.vorigeRichting + dr * overgang;
      // Het kijkpunt schuift vloeiend mee (geen schokken als hij van jou naar de bloem kijkt).
      if (t.kijk) {
        kijk.set(t.kijk[0], t.kijk[1], t.kijk[2]);
        if (!kijkZacht) kijkZacht = kijk.clone();
        else kijkZacht.lerp(kijk, 1 - Math.exp(-5 * dt));
      } else kijkZacht = null;
      anim.werkBij(dt, t.gang, camera, { snelheid: t.snelheid / GEZEL.schaal, kijkNaar: kijkZacht });
      if (!K.schaduw) {
        const g = grondOp(pos.x, pos.z);
        schaduw.position.set(pos.x + Math.sin(houder.rotation.y) * 0.1, g + 0.03, pos.z + Math.cos(houder.rotation.y) * 0.1);
        schaduw.rotation.y = houder.rotation.y;
        schaduw.scale.set(dier.breedte * 0.6 * GEZEL.schaal, 1, dier.lengte * 0.42 * GEZEL.schaal);
      }
    },
    /** Raakt een straal (vanuit de camera door een tik) de tijger? */
    raakt(straal, camera) {
      const s = GEZEL.schaal;
      const r = houder.rotation.y;
      for (const [hoogte, voor, straalMaat] of [[0.62, 0, 0.55], [0.75, 0.75, 0.32], [0.6, -0.6, 0.45]]) {
        midden.set(Math.sin(r) * voor * s, hoogte * s, Math.cos(r) * voor * s).add(houder.position);
        if (straal.distanceToPoint(midden) < straalMaat * s && camera.position.distanceTo(midden) < 30) return true;
      }
      return false;
    },
  };
}
