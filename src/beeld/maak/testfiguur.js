// De speelfiguur: een kawaii-meisje in chibi-verhoudingen (groot hoofd, klein lijfje),
// met lang, blond, zacht krullend haar en een hibiscus in het haar. Volledig uit code.
// Ze kijkt naar +z. De animatie zit in beeld/animatie.js.
import * as THREE from 'three';
import { maakHibiscus } from './hibiscus.js';
import { maakBol } from './vorm.js';

/** @param {typeof import('../../data/figuur.js').TESTFIGUUR} f */
export function maakTestfiguur(f) {
  const figuur = new THREE.Group();   // staat op de voeten, draait naar de looprichting
  const lijf = new THREE.Group();     // wordt geplet en uitgerekt bij springen en landen
  figuur.add(lijf);

  const s = f.hoogte / 1.3;           // alle maten hieronder zijn voor 1,3 m
  const mat = (kleur) => new THREE.MeshLambertMaterial({ color: kleur });
  const vlak = (kleur, extra = {}) => new THREE.MeshBasicMaterial({ color: kleur, ...extra });
  // Huid met wat eigen gloed: zacht en egaal, zoals in een kawaii-tekening.
  const huid = new THREE.MeshLambertMaterial({ color: f.huidKleur, emissive: f.huidKleur, emissiveIntensity: 0.35 });

  // --- Beentjes en bolle schoentjes, elk aan een heupscharnier zodat ze kunnen stappen ---
  const benen = [];
  for (const kant of [-1, 1]) {
    const heup = new THREE.Group();
    heup.position.set(kant * 0.08, 0.21, 0);
    const been = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.16, 8), huid);
    been.position.set(0, -0.08, 0);
    heup.add(been);
    const schoen = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 8), mat(f.schoenKleur));
    schoen.scale.set(0.95, 0.7, 1.25);
    schoen.position.set(0, -0.16, 0.02);
    heup.add(schoen);
    lijf.add(heup);
    benen.push(heup);
  }

  // --- Jurkje: een kort klokje, met een wit kraagje ---
  const jurk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.32, 20), mat(f.jurkKleur));
  jurk.position.y = 0.36;
  lijf.add(jurk);
  const zoom = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.025, 6, 24), mat(f.kraagKleur));
  zoom.rotation.x = Math.PI / 2;
  zoom.position.y = 0.21;
  lijf.add(zoom);
  const borst = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 10), jurk.material);
  borst.scale.set(1, 0.9, 0.9);
  borst.position.y = 0.52;
  lijf.add(borst);
  const kraag = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 20), mat(f.kraagKleur));
  kraag.rotation.x = Math.PI / 2;
  kraag.position.y = 0.6;
  lijf.add(kraag);

  // --- Korte armpjes met bolle handjes ---
  // Elk armpje hangt aan een schouderscharnier: zwaaien, omhoog bij een sprong, zwemslagen.
  const armen = [];
  for (const kant of [-1, 1]) {
    const schouder = new THREE.Group();
    schouder.position.set(kant * 0.15, 0.55, 0.02);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.17, 4, 8), huid);
    arm.position.set(0, -0.12, 0);
    schouder.add(arm);
    lijf.add(schouder);
    armen.push(schouder);
  }

  // --- Het grote hoofd ---
  const R = f.hoofdGrootte;
  const hoofdY = 0.62 + R * 0.92;
  const hoofd = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), huid);
  hoofd.scale.set(1.05, 0.95, 1);
  hoofd.position.y = hoofdY;
  lijf.add(hoofd);

  /** Zet een plat onderdeel op het gezicht, met de normaal van de bol mee. */
  function opGezicht(obj, x, y, uit = 0.004) {
    const z = Math.sqrt(Math.max(0, R * R - x * x - y * y)) + uit;
    obj.position.set(x * 1.05, hoofdY + y * 0.95, z);
    obj.rotation.set(-Math.asin(y / R), Math.atan2(x, z), 0, 'YXZ');
    lijf.add(obj);
  }

  // Enorme glanzende ogen: lagen van platte ovaaltjes, met twee lichtvlekjes.
  const oogY = -R * 0.12;
  const oogX = R * 0.38;
  const ovaal = (rx, ry) => {
    const g = new THREE.CircleGeometry(1, 24);
    g.scale(rx, ry, 1);
    return g;
  };
  const ogen = [];
  for (const kant of [-1, 1]) {
    const oog = new THREE.Group();
    const rand = new THREE.Mesh(ovaal(R * 0.2, R * 0.27), vlak(f.oogDonker));
    const iris = new THREE.Mesh(ovaal(R * 0.165, R * 0.23), vlak(f.oogKleur));
    iris.position.set(0, -R * 0.015, 0.002);
    // Onderaan iets lichter: geeft die typische glans van anime-ogen.
    const gloed = new THREE.Mesh(ovaal(R * 0.12, R * 0.09), vlak(0xa9d4ff, { transparent: true, opacity: 0.85 }));
    gloed.position.set(0, -R * 0.12, 0.003);
    const pupil = new THREE.Mesh(ovaal(R * 0.08, R * 0.11), vlak(f.oogDonker));
    pupil.position.set(0, R * 0.01, 0.004);
    const glim1 = new THREE.Mesh(ovaal(R * 0.065, R * 0.065), vlak(0xffffff));
    glim1.position.set(kant * -R * 0.05 - R * 0.02, R * 0.09, 0.006);
    const glim2 = new THREE.Mesh(ovaal(R * 0.03, R * 0.03), vlak(0xffffff));
    glim2.position.set(R * 0.07, -R * 0.08, 0.006);
    // Wimpertjes: een dikker boogje bovenaan met een klein flapje opzij.
    const wimper = new THREE.Mesh(
      new THREE.TorusGeometry(R * 0.2, R * 0.03, 4, 16, Math.PI * 0.8),
      vlak(f.oogDonker)
    );
    wimper.scale.set(1, 1.3, 0.3);
    wimper.rotation.z = Math.PI * 0.1;
    wimper.position.z = 0.005;
    const flapje = new THREE.Mesh(ovaal(R * 0.05, R * 0.02), vlak(f.oogDonker));
    flapje.position.set(kant * R * 0.21, R * 0.2, 0.005);
    flapje.rotation.z = kant * 0.6;
    // Binnenste groep: die knijpen we plat om te knipperen.
    const knipper = new THREE.Group();
    knipper.add(rand, iris, gloed, pupil, glim1, glim2, wimper, flapje);
    oog.add(knipper);
    ogen.push(knipper);
    opGezicht(oog, kant * oogX, oogY, 0.012);

    // Roze wangetjes.
    const wang = new THREE.Mesh(ovaal(R * 0.13, R * 0.075), vlak(f.wangKleur, { transparent: true, opacity: 0.75 }));
    opGezicht(wang, kant * R * 0.62, -R * 0.38, 0.006);
  }

  // Een klein lachje.
  const mond = new THREE.Mesh(new THREE.TorusGeometry(R * 0.06, R * 0.014, 4, 12, Math.PI), vlak(0x9b3b4f));
  mond.rotation.z = Math.PI;
  const mondGroep = new THREE.Group();
  mondGroep.add(mond);
  opGezicht(mondGroep, 0, -R * 0.42, 0.006);

  // --- Haar: een bol kapje met een pony van krulletjes, en lange krullen over de rug ---
  const haarKleur = new THREE.Color(f.haarKleur);
  const haarMat = new THREE.MeshLambertMaterial({ color: f.haarKleur, emissive: f.haarKleur, emissiveIntensity: 0.2 });
  const kap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), haarMat);
  kap.scale.set(1.05, 0.95, 1);
  kap.position.set(0, hoofdY + R * 0.04, -R * 0.03);
  lijf.add(kap);
  const achter = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 24, 14), haarMat);
  achter.scale.set(1.04, 0.98, 0.88);
  achter.position.set(0, hoofdY - R * 0.02, -R * 0.14);
  lijf.add(achter);

  // Gladde bolletjes van 80 driehoeken: op deze grootte even rond als fijnere, en 4 keer goedkoper.
  const krulVorm = maakBol(f.krulGrootte, 1);
  const ponyAantal = 9;
  const aantal = f.aantalLokken * f.krulInLok + ponyAantal;
  const krullen = new THREE.InstancedMesh(
    krulVorm,
    new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: f.haarKleur, emissiveIntensity: 0.2 }),
    aantal
  );
  const donker = new THREE.Color(f.haarSchaduw);
  const kl = new THREE.Color();
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  let k = 0;
  for (let l = 0; l < f.aantalLokken; l++) {
    // Van de ene kant van het gezicht via de rug naar de andere (de voorkant blijft vrij).
    const a = -2.0 + (l / (f.aantalLokken - 1)) * 4.0; // hoek rond het hoofd, 0 = recht achter
    const rx = Math.sin(a);
    const rz = -Math.cos(a);
    const zijkant = Math.abs(Math.sin(a));
    const lengte = f.haarLengte * (1 - zijkant * 0.25);
    for (let i = 0; i < f.krulInLok; i++) {
      const t = i / (f.krulInLok - 1);
      const krul = t * 10 + l * 1.7;               // spiraal: zachte krullen
      const straal = R * (1.0 + t * 0.04) - t * t * R * 0.2;
      p.set(
        rx * straal * 1.05 + Math.cos(krul) * 0.03 * t,
        hoofdY + R * 0.05 - t * (R * 0.55 + lengte),
        rz * straal + Math.sin(krul) * 0.03 * t - t * 0.05
      );
      sc.setScalar((1 - t * 0.3) * (0.9 + 0.2 * Math.sin(l * 3.1 + i)));
      m.compose(p, q, sc);
      krullen.setMatrixAt(k, m);
      krullen.setColorAt(k, kl.copy(haarKleur).lerp(donker, t * 0.7));
      k++;
    }
  }
  // Pony: een rijtje bolle krulletjes over het voorhoofd.
  for (let i = 0; i < ponyAantal; i++) {
    const a = -1.0 + (i / (ponyAantal - 1)) * 2.0;
    p.set(Math.sin(a) * R * 1.0, hoofdY + R * 0.5 - Math.abs(a) * R * 0.12, Math.cos(a) * R * 0.82);
    sc.setScalar(0.85 - Math.abs(a) * 0.1);
    m.compose(p, q, sc);
    krullen.setMatrixAt(k, m);
    krullen.setColorAt(k, haarKleur);
    k++;
  }
  lijf.add(krullen);

  // --- Een hibiscus in het haar ---
  const bloem = maakHibiscus(f.haarbloem);
  bloem.position.set(R * 0.82, hoofdY + R * 0.56, R * 0.78); // opzij boven het oog, voor op het hoofd
  bloem.rotation.set(1.25, 0.35, -0.2); // het bloemhart kijkt naar voren, een tikje opzij en omhoog
  lijf.add(bloem);

  lijf.scale.setScalar(s);
  const basisSchaal = s;

  // Schaduwvlek onder de voeten: maakt sprongen goed leesbaar.
  const schaduw = new THREE.Mesh(
    new THREE.CircleGeometry(f.breedte * 1.0, 20),
    new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.25, depthWrite: false })
  );
  schaduw.rotation.x = -Math.PI / 2;

  return { figuur, lijf, schaduw, basisSchaal, benen, armen, ogen, krullen };
}
