// Een monstera-struik in kawaii-stijl: bolle hartvormige bladeren met ronde gaatjes,
// op lange stelen. Alle bladeren samen zijn één tekenopdracht (instancing).
import * as THREE from 'three';

/**
 * @param {{ bladKleur:number, nerfKleur:number, steelKleur:number, bladGrootte:number, aantal:number, hoogte:number }} p
 * @param {() => number} toeval getal tussen 0 en 1 (voor kleine variatie in houding)
 */
export function maakMonstera(p, toeval) {
  const groep = new THREE.Group();
  const s = p.bladGrootte;

  // Bladvorm: een bol hart, met de punt naar voren (+y in de vorm, wordt later +z).
  const vorm = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = Math.sin(t) * (0.5 + 0.08 * Math.cos(t));
    const y = -Math.cos(t) * 0.55 + 0.12 * Math.abs(Math.sin(t)) ** 3 - 0.05;
    // Inkeping aan de steel (onderaan): het hartje.
    const inkeping = Math.exp(-((t % (Math.PI * 2)) ** 2) * 30) * 0.12;
    if (i === 0) vorm.moveTo(x * s, (y + inkeping) * s);
    else vorm.lineTo(x * s, (y + inkeping) * s);
  }
  // De typische gaatjes, in twee rijtjes naast de middennerf.
  for (const kant of [-1, 1]) {
    for (let r = 0; r < 3; r++) {
      const gat = new THREE.Path();
      const cx = kant * (0.22 + r * 0.03) * s;
      const cy = (-0.25 + r * 0.25) * s;
      gat.absellipse(cx, cy, 0.05 * s, 0.085 * s, 0, Math.PI * 2, false, kant * 0.5);
      vorm.holes.push(gat);
    }
  }
  const blad = new THREE.ShapeGeometry(vorm, 10);
  // Plat leggen (vorm-y wordt wereld-z), dan bol buigen: de randen hangen omlaag, de punt ook.
  blad.rotateX(-Math.PI / 2);
  const pos = blad.attributes.position;
  const kleuren = new Float32Array(pos.count * 3);
  const licht = new THREE.Color(p.bladKleur);
  const nerf = new THREE.Color(p.nerfKleur);
  const k = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / s;
    const z = -pos.getZ(i) / s; // van steel (-) naar punt (+)
    pos.setY(i, (-x * x * 0.55 - Math.max(0, z) ** 2 * 0.45 + 0.08) * s);
    pos.setZ(i, (z + 0.55) * s); // de steel zit op z = 0
    // Een lichte middennerf.
    k.copy(licht).lerp(nerf, Math.exp(-(x * x) * 400) * 0.8);
    kleuren.set([k.r, k.g, k.b], i * 3);
  }
  blad.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
  blad.computeVertexNormals();

  const bladeren = new THREE.InstancedMesh(
    blad,
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    p.aantal
  );
  const steelVorm = new THREE.CylinderGeometry(0.025, 0.04, 1, 6);
  steelVorm.translate(0, 0.5, 0);
  const stelen = new THREE.InstancedMesh(steelVorm, new THREE.MeshLambertMaterial({ color: p.steelKleur }), p.aantal);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const top = new THREE.Vector3();
  const een = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < p.aantal; i++) {
    const hoek = (i / p.aantal) * Math.PI * 2 + toeval() * 0.6;
    const helling = 0.35 + toeval() * 0.35; // hoe ver de steel naar buiten leunt
    const lengte = p.hoogte * (0.75 + toeval() * 0.4);
    // Steel: leunt naar buiten in de richting 'hoek'.
    e.set(helling, hoek, 0, 'YXZ');
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(), q, new THREE.Vector3(1, lengte, 1));
    stelen.setMatrixAt(i, m);
    top.set(0, lengte, 0).applyQuaternion(q);
    // Blad: aan de top van de steel, naar buiten gericht en een beetje gekanteld.
    e.set(-0.55 - toeval() * 0.35, hoek, (toeval() - 0.5) * 0.3, 'YXZ');
    q.setFromEuler(e);
    m.compose(top, q, een);
    bladeren.setMatrixAt(i, m);
  }
  groep.add(stelen, bladeren);
  return groep;
}
