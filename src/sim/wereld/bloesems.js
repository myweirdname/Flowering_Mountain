// Bloesems om te verzamelen (GD 10, 13): zwevende bloemetjes rond het kamp. Ze liggen vast per zaadje.
// Een paar liggen op plekken die iets vragen: boven op een grote rots, of midden boven de lagune.
import { maakWillekeur } from '../../kern/willekeur.js';

/**
 * @typedef {{ id:number, x:number, y:number, z:number, gepakt:boolean }} Bloesem
 * @param {ReturnType<typeof import('./hoogte.js').maakWereldvorm>} vorm
 * @param {{ grondOp(x:number, z:number): number, rotsen(tx:number, tz:number): any[], tegelGrootte:number }} w
 * @param {number} zaadje
 * @param {typeof import('../../data/bloesems.js').BLOESEMS} B
 * @param {{ x:number, y:number, z:number }[]} [vast] plekken die altijd een bloesem krijgen (bv. boven de hindernissen)
 * @returns {Bloesem[]}
 */
export function maakBloesems(vorm, w, zaadje, B, vast = []) {
  const r = maakWillekeur(zaadje ^ 0xb10e5);
  const lijst = [];
  const voeg = (x, z, y) => lijst.push({ id: lijst.length, x, y, z, gepakt: false });
  const vrij = (x, z, afstand) => lijst.every((b) => Math.hypot(b.x - x, b.z - z) > afstand);
  const k = vorm.kamp;
  for (const v of vast) voeg(v.x, v.z, v.y);

  // Boven op grote rotsen (opklimmen loont).
  const T = w.tegelGrootte;
  const n = Math.ceil(B.straal / T);
  const grote = [];
  for (let tz = -n; tz <= n; tz++)
    for (let tx = -n; tx <= n; tx++)
      for (const rots of w.rotsen(tx, tz)) if (rots.maat > 1.6 && Math.hypot(rots.x - k.x, rots.z - k.z) < B.straal && rots.y > 0.2) grote.push(rots);
  grote.sort((a, b) => Math.hypot(a.x - k.x, a.z - k.z) - Math.hypot(b.x - k.x, b.z - k.z));
  for (const rots of grote.slice(0, B.opRotsen)) voeg(rots.x, rots.z, w.grondOp(rots.x, rots.z) + B.zweefHoogte);

  // Boven de lagune (zwemmen loont): een kringetje.
  const L = vorm.lagune;
  for (let i = 0; i < B.inLagune; i++) {
    const a = (i / B.inLagune) * Math.PI * 2 + 0.4;
    const d = i === 0 ? 0 : L.straal * 0.45;
    voeg(L.x + Math.cos(a) * d, L.z + Math.sin(a) * d, B.zweefHoogte * 0.7);
  }

  // De rest verspreid over het land rond het kamp, sommige in slingers van drie.
  let pogingen = 0;
  while (lijst.length < B.aantal && pogingen++ < 4000) {
    const a = r.getal() * Math.PI * 2;
    const d = B.binnen + Math.sqrt(r.getal()) * (B.straal - B.binnen);
    const x = k.x + Math.cos(a) * d;
    const z = k.z + Math.sin(a) * d;
    const h = w.grondOp(x, z);
    if (h < 0.15 || !vrij(x, z, B.tussenafstand)) continue;
    const slinger = r.getal() < B.slingerKans && lijst.length + 3 <= B.aantal;
    if (!slinger) {
      voeg(x, z, h + B.zweefHoogte);
      continue;
    }
    const ra = r.getal() * Math.PI * 2;
    for (let j = 0; j < 3; j++) {
      const sx = x + Math.cos(ra) * j * 1.6;
      const sz = z + Math.sin(ra) * j * 1.6;
      voeg(sx, sz, Math.max(w.grondOp(sx, sz), 0) + B.zweefHoogte + (j === 1 ? 0.5 : 0));
    }
  }
  return lijst;
}

/** Pakt de bloesems die de speler raakt. */
export function pakBloesems(s, lijst, B, dt, meld) {
  s.sindsBloesem += dt;
  // Op de pony ben je groter: je zit hoger en reikt verder.
  const rijdt = s.modus === 'rijden';
  const midden = s.pos[1] + (rijdt ? B.rijMidden : 0.6);
  const straal = rijdt ? B.rijStraal : B.pakStraal;
  for (const b of lijst) {
    if (b.gepakt) continue;
    const dx = b.x - s.pos[0];
    const dz = b.z - s.pos[2];
    if (dx * dx + dz * dz > straal * straal) continue;
    if (Math.abs(b.y - midden) > B.pakHoogte) continue;
    b.gepakt = true;
    s.bloesems++;
    s.bloesemReeks = s.sindsBloesem < B.reeksTijd ? s.bloesemReeks + 1 : 0;
    s.sindsBloesem = 0;
    meld({ soort: 'bloesem', speler: s.id, id: b.id, pos: [b.x, b.y, b.z], aantal: s.bloesems, reeks: s.bloesemReeks });
  }
}
