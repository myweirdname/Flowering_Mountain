// Volgcamera: volgt het figuurtje en draait rustig mee in de looprichting (GD 4).
// Met de muis slepen (of op touch: slepen op de rechterhelft) kijkt rond;
// na even loslaten neemt de camera het weer over.
import * as THREE from 'three';
import { CAMERA as C } from '../data/camera.js';

/**
 * @param {THREE.PerspectiveCamera} camera
 * @param {HTMLElement} sleepvlak
 * @param {(x:number, z:number) => number} grondOp
 */
export function maakVolgcamera(camera, sleepvlak, grondOp) {
  let hoek = 0;            // draaihoek rond de verticale as; 0 = camera aan de +z-kant
  let kanteling = C.kanteling;
  let sindsSlepen = 99;
  const doel = new THREE.Vector3();
  let eersteKeer = true;

  /** Rondkijken: dx, dy in pixels. */
  function kijk(dx, dy, gevoeligheid) {
    hoek -= dx * gevoeligheid;
    kanteling = THREE.MathUtils.clamp(kanteling + dy * gevoeligheid, C.minKanteling, C.maxKanteling);
    sindsSlepen = 0;
  }

  // Rondkijken met de muis; touch roept kijk() aan vanuit invoer/touch.js.
  let sleept = false;
  let vx = 0;
  let vy = 0;
  sleepvlak.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    sleept = true;
    vx = e.clientX;
    vy = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!sleept) return;
    kijk(e.clientX - vx, e.clientY - vy, C.muisGevoeligheid);
    vx = e.clientX;
    vy = e.clientY;
  });
  window.addEventListener('pointerup', () => (sleept = false));

  return {
    kijk,
    get hoek() {
      return hoek;
    },

    /**
     * @param {THREE.Vector3} figuur getekende positie van de voeten
     * @param {number} vX horizontale snelheid x
     * @param {number} vZ horizontale snelheid z
     * @param {number} maxSnelheid
     * @param {number} dt
     */
    volg(figuur, vX, vZ, maxSnelheid, dt) {
      sindsSlepen += dt;

      // Rustig achter de looprichting draaien, maar niet als je naar de camera toe loopt.
      const snelheid = Math.hypot(vX, vZ);
      if (snelheid > 0.5 && !sleept && sindsSlepen > C.rustNaSlepen) {
        const achter = Math.atan2(-vX, -vZ); // camerahoek recht achter de looprichting
        let verschil = Math.atan2(Math.sin(achter - hoek), Math.cos(achter - hoek));
        const naarCamera = Math.max(0, -Math.cos(verschil)); // 1 = recht naar de camera toe
        const sterkte = C.meedraaien * Math.min(1, snelheid / maxSnelheid) * (1 - naarCamera);
        hoek += verschil * Math.min(1, sterkte * dt);
      }

      const t = 1 - Math.exp(-C.volgen * dt);
      const tv = 1 - Math.exp(-C.verticaalVolgen * dt);
      if (eersteKeer) {
        doel.set(figuur.x, figuur.y + C.hoogteDoel, figuur.z);
        eersteKeer = false;
      } else {
        doel.x += (figuur.x - doel.x) * t;
        doel.z += (figuur.z - doel.z) * t;
        doel.y += (figuur.y + C.hoogteDoel - doel.y) * tv;
      }

      const horizontaal = Math.cos(kanteling) * C.afstand;
      camera.position.set(
        doel.x + Math.sin(hoek) * horizontaal,
        doel.y + Math.sin(kanteling) * C.afstand,
        doel.z + Math.cos(hoek) * horizontaal
      );
      const grond = grondOp(camera.position.x, camera.position.z) + C.bovenGrond;
      if (camera.position.y < grond) camera.position.y = grond;
      camera.lookAt(doel);
    },
  };
}
