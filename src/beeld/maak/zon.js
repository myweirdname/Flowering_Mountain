import * as THREE from 'three';

/**
 * Maakt een zon met zachte gloed, getekend door code op een klein canvas.
 * @param {typeof import('../../data/scene.js').SCENE.zon} z
 */
export function maakZon(z) {
  const n = 128;
  const doek = document.createElement('canvas');
  doek.width = doek.height = n;
  const g = doek.getContext('2d');
  const r = n / 2;
  const verloop = g.createRadialGradient(r, r, 0, r, r, r);
  verloop.addColorStop(0, '#ffffff');
  verloop.addColorStop(0.22, z.kleur);
  verloop.addColorStop(0.3, z.gloedKleur);
  verloop.addColorStop(1, 'rgba(255, 230, 120, 0)');
  g.fillStyle = verloop;
  g.fillRect(0, 0, n, n);

  const textuur = new THREE.CanvasTexture(doek);
  textuur.colorSpace = THREE.SRGBColorSpace;
  const zon = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textuur, transparent: true, depthWrite: false, fog: false })
  );
  zon.scale.setScalar(z.grootte);
  return zon;
}
