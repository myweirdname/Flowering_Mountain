// Het beeld van de slaapbloem (GD 8): een grote, dichte paarse knop op een korte stengel tussen brede bladeren,
// die zachtjes ademt en Z'tjes laat opstijgen. Na een tijgerbrul gaan de blaadjes open (roze en lichtgevend
// van binnen) en zie je de schat in het hart: een schatkistje. Raak je het aan, dan springt het deksel open.
// Per bloem: stengel en bladeren (1 tekenopdracht), blaadjes (1, instancing), hart en kistje (1), deksel (1), Z (1).
import * as THREE from 'three';

/** Stukken met elk hun eigen kleur samenvoegen tot één geometrie (één tekenopdracht). Normalen blijven per stuk. */
function voegSamen(stukken) {
  const delen = stukken.map((d) => (d.index ? d.toNonIndexed() : d));
  const n = delen.reduce((a, d) => a + d.attributes.position.count, 0);
  const uit = new THREE.BufferGeometry();
  for (const naam of ['position', 'normal', 'color']) {
    const a = new Float32Array(n * 3);
    let o = 0;
    for (const d of delen) {
      a.set(d.attributes[naam].array, o);
      o += d.attributes[naam].array.length;
    }
    uit.setAttribute(naam, new THREE.BufferAttribute(a, 3));
  }
  return uit;
}

const glad = THREE.MathUtils.smoothstep;
const kleur = (geo, c) => {
  const k = new THREE.Color(c);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([k.r, k.g, k.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
};
// Na het openen schiet een blaadje iets te ver door en veert terug.
const veer = (x) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

/** Een Z'tje op een tekenvlak, als beeldje dat altijd naar je toe kijkt. */
function maakZ() {
  const doek = document.createElement('canvas');
  doek.width = doek.height = 64;
  const c = doek.getContext('2d');
  c.font = 'bold 54px "Baloo 2", "Comic Sans MS", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 8;
  c.strokeStyle = '#5a3fa8';
  c.strokeText('z', 32, 34);
  c.fillStyle = '#ffffff';
  c.fillText('z', 32, 34);
  const tex = new THREE.CanvasTexture(doek);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
}

/**
 * @param {THREE.Scene} scene
 * @param {any[]} bloemen de slaapbloemen uit de simulatie
 * @param {typeof import('../data/tijger.js').GEZEL.slaapbloem} S
 * @param {{ schaduw: boolean, detail: boolean }} K
 */
export function maakSlaapbloembeeld(scene, bloemen, S, K) {
  const g = S.grootte;
  const N = 7; // blaadjes

  // --- Eén blaadje: een lange, holle schelp. Buiten paars met lichte nerven, binnen roze. ---
  const blad = new THREE.SphereGeometry(0.5, K.detail ? 18 : 12, K.detail ? 14 : 9);
  const L = g * 1.15;
  blad.scale(g * 0.78, L, g * 0.16);
  blad.translate(0, L * 0.5, 0);
  {
    const p = blad.attributes.position;
    const n = p.count;
    const kl = new Float32Array(n * 3);
    const knop = new THREE.Color(S.knopKleur);
    const nerf = new THREE.Color(S.nerfKleur);
    const binnen = new THREE.Color(S.binnenKleur);
    const hart = new THREE.Color(S.hartKleur);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const t = y / L; // 0 = voet, 1 = punt
      // Hol: de randen buigen naar binnen (-z), en het blaadje wordt naar de punt toe smaller en spitser.
      const smal = 1 - 0.55 * glad(t, 0.55, 1);
      p.setX(i, x * smal);
      p.setZ(i, z - (x * x) / (g * 0.9) - Math.sin(t * Math.PI) * g * 0.08);
      if (z < 0) {
        // Binnenkant: roze, met een geel hart aan de voet.
        c.copy(hart).lerp(binnen, glad(t, 0.05, 0.4));
      } else {
        // Buitenkant: paars, de middennerf en twee zijnerven lichter.
        const u = Math.abs(x) / (g * 0.39);
        const nerven = Math.max(1 - glad(u, 0, 0.12), 0.6 * (1 - glad(Math.abs(u - 0.55), 0, 0.1)));
        c.copy(knop).lerp(nerf, nerven * 0.8).multiplyScalar(0.85 + 0.25 * t);
      }
      kl.set([c.r, c.g, c.b], i * 3);
    }
    blad.setAttribute('color', new THREE.BufferAttribute(kl, 3));
    blad.computeVertexNormals();
  }
  const bladMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0xff4f9e, emissiveIntensity: 0 });

  // --- Stengel en grote bladeren aan de voet (één geheel) ---
  const delen = [];
  const steel = new THREE.CylinderGeometry(0.12 * g, 0.2 * g, S.hoogte + 0.2, 10);
  steel.translate(0, (S.hoogte + 0.2) / 2 - 0.2, 0);
  delen.push(kleur(steel, S.bladKleur));
  for (let i = 0; i < 5; i++) {
    const b = new THREE.SphereGeometry(0.5, 12, 6);
    b.scale(g * 0.75, 0.06, g * 1.7);
    b.translate(0, 0, g * 0.75);
    b.rotateX(-0.18);
    b.rotateY((i / 5) * Math.PI * 2 + 0.4);
    b.translate(0, 0.08, 0);
    delen.push(kleur(b, i % 2 ? 0x4fb466 : S.bladKleur));
  }
  const voetGeo = voegSamen(delen);
  const voetMat = new THREE.MeshLambertMaterial({ vertexColors: true });

  // --- Het hart en het schatkistje (één geheel), en het deksel apart (dat gaat open) ---
  const kist = [];
  const hartBol = new THREE.SphereGeometry(g * 0.3, 14, 8);
  hartBol.scale(1, 0.45, 1);
  kist.push(kleur(hartBol, S.hartKleur));
  const B = g * 0.42; // breedte van het kistje
  const romp = new THREE.BoxGeometry(B, B * 0.55, B * 0.7);
  romp.translate(0, g * 0.1 + B * 0.275, 0);
  kist.push(kleur(romp, 0xc46a3c));
  for (const x of [-0.32, 0.32]) {
    const band = new THREE.BoxGeometry(B * 0.1, B * 0.57, B * 0.72);
    band.translate(x * B, g * 0.1 + B * 0.275, 0);
    kist.push(kleur(band, 0xffc93c));
  }
  const slot = new THREE.BoxGeometry(B * 0.16, B * 0.2, B * 0.06);
  slot.translate(0, g * 0.1 + B * 0.45, B * 0.36);
  kist.push(kleur(slot, 0xffe27a));
  const kistGeo = voegSamen(kist);
  const kistMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x553300, emissiveIntensity: 0.3 });
  // Het deksel: een halve rol, scharnier aan de achterkant.
  const dekselDelen = [];
  const rol = new THREE.CylinderGeometry(B * 0.35, B * 0.35, B * 1.0, 14, 1, false, 0, Math.PI);
  rol.rotateZ(Math.PI / 2);
  rol.rotateX(Math.PI / 2);
  rol.translate(0, 0, B * 0.35);
  dekselDelen.push(kleur(rol, 0xd9784a));
  for (const x of [-0.32, 0.32]) {
    const band = new THREE.CylinderGeometry(B * 0.37, B * 0.37, B * 0.1, 14, 1, false, 0, Math.PI);
    band.rotateZ(Math.PI / 2);
    band.rotateX(Math.PI / 2);
    band.translate(x * B, 0, B * 0.35);
    dekselDelen.push(kleur(band, 0xffc93c));
  }
  const dekselGeo = voegSamen(dekselDelen);
  // Binnenin het kistje: goud licht.
  const gloedMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const een = new THREE.Vector3(1, 1, 1);
  const voetPunt = new THREE.Vector3();

  const lijst = bloemen.map((b, nr) => {
    const groep = new THREE.Group();
    groep.position.set(b.x, b.y, b.z);
    groep.rotation.y = nr * 1.3;
    const voet = new THREE.Mesh(voetGeo, voetMat);
    const kop = new THREE.Group(); // alles op de stengel: ademt en wiegt samen
    kop.position.y = S.hoogte;
    const blaadjes = new THREE.InstancedMesh(blad, bladMat.clone(), N);
    const kistje = new THREE.Mesh(kistGeo, kistMat);
    const deksel = new THREE.Mesh(dekselGeo, kistMat);
    const scharnier = new THREE.Group();
    scharnier.position.set(0, g * 0.1 + B * 0.55, -B * 0.35);
    scharnier.add(deksel);
    const gloed = new THREE.Mesh(new THREE.SphereGeometry(B * 0.42, 12, 8), gloedMat.clone());
    gloed.position.set(0, g * 0.1 + B * 0.6, 0);
    gloed.scale.set(1, 0.7, 0.8);
    kop.add(blaadjes, kistje, scharnier, gloed);
    groep.add(voet, kop);
    if (K.schaduw) {
      voet.receiveShadow = true;
      blaadjes.castShadow = true;
    }
    const z = maakZ();
    z.scale.setScalar(0.35);
    scene.add(groep, z);
    return { b, groep, kop, blaadjes, kistje, scharnier, gloed, z, zTijd: nr * 0.7, open: 0, deksel: 0, pakTijd: -1 };
  });

  let tijd = 0;
  return {
    /** @param {number} dt @param {THREE.Vector3} camPos */
    werkBij(dt, camPos) {
      tijd += dt;
      for (const L of lijst) {
        const b = L.b;
        const dichtbij = camPos.distanceTo(L.groep.position) < 70;
        L.groep.visible = dichtbij;
        L.z.visible = false;
        if (!dichtbij) continue;
        // Open gaan: elk blaadje een fractie later, met een veer.
        const doel = b.open ? Math.min(1, b.openTijd / S.openDuur) : 0;
        L.open = doel;
        const adem = b.open ? 0 : Math.sin(tijd * 1.4) * 0.5 + 0.5;
        L.kop.scale.set(1 + adem * 0.035, 1 - adem * 0.025, 1 + adem * 0.035);
        L.kop.rotation.z = Math.sin(tijd * 0.6) * 0.035 * (1 - L.open);
        L.kop.rotation.x = Math.sin(tijd * 0.45 + 1) * 0.03 * (1 - L.open);
        for (let i = 0; i < N; i++) {
          const f = THREE.MathUtils.clamp((L.open * S.openDuur - i * 0.07) / (S.openDuur * 0.7), 0, 1);
          const hoek = -0.28 + (1.32 + 0.28) * (f > 0 ? veer(f) : 0) + Math.sin(tijd * 2 + i) * 0.02 * f;
          const a = (i / N) * Math.PI * 2;
          e.set(hoek, a, 0, 'YXZ');
          q.setFromEuler(e);
          voetPunt.set(Math.sin(a) * g * 0.24, 0, Math.cos(a) * g * 0.24);
          m.compose(voetPunt, q, een);
          L.blaadjes.setMatrixAt(i, m);
        }
        L.blaadjes.instanceMatrix.needsUpdate = true;
        L.blaadjes.material.emissiveIntensity = 0.35 * L.open + 0.1 * Math.sin(tijd * 2) * L.open;
        // Het kistje: verborgen in de knop, na het openen gloeit het en springt het deksel open als je het pakt.
        const zie = L.open > 0.3;
        L.scharnier.visible = zie;
        L.kistje.visible = zie;
        if (b.schat.gepakt && L.pakTijd < 0) L.pakTijd = 0;
        if (L.pakTijd >= 0) L.pakTijd += dt;
        const dekselDoel = L.pakTijd >= 0 ? 1 : 0;
        L.deksel += (dekselDoel - L.deksel) * (1 - Math.exp(-10 * dt));
        L.scharnier.rotation.x = -L.deksel * 1.9;
        const g0 = b.schat.gepakt ? Math.max(0, 1 - L.pakTijd / 2.5) * 0.9 : zie ? 0.25 + 0.15 * Math.sin(tijd * 3) : 0;
        L.gloed.material.opacity = g0;
        L.gloed.visible = g0 > 0.01;
        // Z'tjes: zolang ze slaapt, stijgt er af en toe eentje op en vervaagt.
        if (!b.open) {
          L.zTijd += dt;
          const c = (L.zTijd % 2.6) / 2.6;
          L.z.visible = true;
          L.z.position.set(L.groep.position.x + c * 0.5, L.groep.position.y + S.hoogte + g * 1.3 + c * 1.1, L.groep.position.z + Math.sin(c * 6) * 0.15);
          L.z.material.opacity = Math.sin(c * Math.PI);
          L.z.scale.setScalar(0.25 + c * 0.3);
        }
      }
    },
    /** Waar het kistje zit (voor effecten), in wereldcoördinaten. */
    kistPlek(id, uit) {
      const L = lijst.find((q) => q.b.id === id);
      if (!L) return null;
      return uit.set(L.b.x, L.b.y + S.hoogte + g * 0.4, L.b.z);
    },
  };
}
