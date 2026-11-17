// Een hibiscus in kawaii-stijl: vijf brede, bolle blaadjes met een donker hart,
// en een lange meeldraadstijl met een geel puntje. Gebruikt voor de grote bloem en het haarbloemetje.
import * as THREE from 'three';

/**
 * @param {{ blaadjeKleur:number, hartKleur:number, stijlKleur:number, stuifmeelKleur:number,
 *           grootte:number, kom?:number, openheid?:number, stijl?:number,
 *           hartje?: { kleur:number, grootte:number } }} h
 * kom: hoe hol de blaadjes zijn; openheid: hoe plat de bloem openligt; stijl: lengte van de meeldraad
 */
export function maakHibiscus(h) {
  const groep = new THREE.Group();
  const g = h.grootte; // straal van de open bloem
  const kom = h.kom ?? 0.22;
  const openheid = h.openheid ?? -0.1;
  const stijlFactor = h.stijl ?? 0.9;

  // Eén blaadje: een plat gedrukte bol, naar buiten geschoven en komvormig omhoog gebogen.
  // De kleur loopt van een donker hart naar de blaadjeskleur (vertexkleuren, geen textuur).
  const blad = new THREE.SphereGeometry(0.5, 24, 12);
  blad.scale(g * 1.25, g * 0.1, g * 1.05); // breed, zodat de blaadjes elkaar overlappen tot een ronde bloem
  blad.translate(0, 0, g * 0.5);
  const pos = blad.attributes.position;
  const kleuren = new Float32Array(pos.count * 3);
  const hart = new THREE.Color(h.hartKleur);
  const rand = new THREE.Color(h.blaadjeKleur);
  const k = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const x = pos.getX(i);
    // Komvorm: hoe verder naar buiten, hoe hoger; de randen golven een beetje.
    const t = z / g;
    pos.setY(i, pos.getY(i) + t * t * g * kom + Math.sin(Math.atan2(x, z) * 9) * g * 0.025 * t);
    k.copy(hart).lerp(rand, THREE.MathUtils.smoothstep(t, 0.05, h.hartGrootte ?? 0.32));
    kleuren.set([k.r, k.g, k.b], i * 3);
  }
  blad.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
  blad.computeVertexNormals();

  const blaadjes = new THREE.InstancedMesh(
    blad,
    // Een beetje eigen gloed: ook de achterkant van de blaadjes blijft vrolijk roze.
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: h.blaadjeKleur, emissiveIntensity: 0.22 }),
    5
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const een = new THREE.Vector3(1, 1, 1);
  const nul = new THREE.Vector3();
  for (let i = 0; i < 5; i++) {
    e.set(openheid, (i / 5) * Math.PI * 2 + 0.3, 0, 'YXZ');
    q.setFromEuler(e);
    m.compose(nul, q, een);
    blaadjes.setMatrixAt(i, m);
  }
  groep.add(blaadjes);

  // De meeldraadstijl: het herkenningsteken van een hibiscus.
  const stijlLengte = g * stijlFactor;
  const stijl = new THREE.Mesh(
    new THREE.CylinderGeometry(g * 0.035 / Math.sqrt(stijlFactor), g * 0.05 / Math.sqrt(stijlFactor), stijlLengte, 8),
    new THREE.MeshLambertMaterial({ color: h.stijlKleur })
  );
  stijl.position.set(0, stijlLengte * 0.45, g * 0.18);
  stijl.rotation.x = 0.4;
  groep.add(stijl);
  const top = new THREE.Vector3(0, stijlLengte * 0.9, g * 0.36);

  // Bolletjes stuifmeel rond de top.
  const stuifmeel = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(g * 0.035 / Math.sqrt(stijlFactor), 1),
    new THREE.MeshLambertMaterial({ color: h.stuifmeelKleur, emissive: h.stuifmeelKleur, emissiveIntensity: 0.25 }),
    10
  );
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    m.compose(
      new THREE.Vector3(top.x + Math.cos(a) * g * 0.07, top.y - (i % 2) * g * 0.08, top.z + Math.sin(a) * g * 0.07),
      q.identity(),
      een
    );
    stuifmeel.setMatrixAt(i, m);
  }
  groep.add(stuifmeel);

  // Optioneel: het rode hartje bovenop (een wens van de kinderen bij stap 1).
  if (h.hartje) {
    const hartje = new THREE.Mesh(
      maakHartVorm(h.hartje.grootte),
      new THREE.MeshLambertMaterial({ color: h.hartje.kleur, emissive: h.hartje.kleur, emissiveIntensity: 0.25 })
    );
    hartje.position.copy(top).add(new THREE.Vector3(0, h.hartje.grootte * 0.55, 0));
    hartje.userData.draait = true;
    groep.add(hartje);
    groep.userData.hartje = hartje;
  }

  return groep;
}

/** Een bol hartje: de klassieke hartkromme, uitgerekt met afgeronde randen. */
export function maakHartVorm(hoogte) {
  const vorm = new THREE.Shape();
  const stappen = 64;
  for (let i = 0; i <= stappen; i++) {
    const t = (i / stappen) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) vorm.moveTo(x, y);
    else vorm.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(vorm, {
    depth: 4,
    bevelEnabled: true,
    bevelThickness: 3,
    bevelSize: 2.5,
    bevelSegments: 5,
  });
  geo.center();
  geo.computeVertexNormals();
  const schaal = hoogte / 30;
  geo.scale(schaal, schaal, schaal);
  return geo;
}
