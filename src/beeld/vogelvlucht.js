// Vogelvlucht en prestatievlucht (TP 7, 9, stap 12).
// - Vogelvlucht: een vrije camera om het hele eiland te bekijken (toets V, of ?vogel=1). Bewegen zoals lopen
//   (WASD of joystick, Shift of de joystick helemaal = sneller), spatie of springknop = omhoog, E of actieknop = omlaag,
//   slepen = rondkijken. De speler blijft intussen staan.
// - Prestatievlucht (?vlucht=1): de camera vliegt een vaste ronde over het eiland (over het pad, de hellingbaan op,
//   over de etage naar de top, hoog rond het eiland en terug naar het kamp) en meet hoe vlot het beeld blijft.
//   Op het einde staat de uitslag op het scherm: dat is de vaste meting op elk toestel.
import * as THREE from 'three';

/** @param {typeof import('../data/camera.js').CAMERA.vogelvlucht} V */
export function maakVogelvlucht(V) {
  const pos = new THREE.Vector3();
  let aan = false;
  return {
    get aan() {
      return aan;
    },
    /** Aan of uit; de camera begint waar ze nu is. */
    wissel(camera) {
      aan = !aan;
      if (aan) pos.copy(camera.position).add(new THREE.Vector3(0, 6, 0));
    },
    /** Het punt op de grond onder de camera: daar wordt de wereld rond geladen. */
    get pos() {
      return pos;
    },
    /**
     * @param {number} dt
     * @param {{ beweeg: [number, number], spring: boolean, actie: boolean }} invoer x = rechts, y = vooruit
     * @param {number} hoek draaihoek van de camera (zoals de volgcamera: slepen draait)
     * @param {number} kanteling hoe ver naar beneden ze kijkt
     * @param {THREE.Camera} camera
     * @param {(x:number, z:number) => number} grondOp
     */
    werkBij(dt, invoer, hoek, kanteling, camera, grondOp) {
      const [x, y] = invoer.beweeg;
      const snel = V.snelheid * (Math.hypot(x, y) > 0.9 ? V.snelFactor : 1);
      const vx = -Math.sin(hoek);
      const vz = -Math.cos(hoek);
      const rx = Math.cos(hoek);
      const rz = -Math.sin(hoek);
      pos.x += (rx * x + vx * y) * snel * dt;
      pos.z += (rz * x + vz * y) * snel * dt;
      pos.y += ((invoer.spring ? 1 : 0) - (invoer.actie ? 1 : 0)) * V.klimSnelheid * dt;
      pos.y = Math.min(V.maxHoogte, Math.max(pos.y, grondOp(pos.x, pos.z) + V.bovenGrond));
      camera.position.copy(pos);
      const k = Math.max(kanteling, 0.05);
      camera.lookAt(pos.x + vx * Math.cos(k), pos.y - Math.sin(k), pos.z + vz * Math.cos(k));
    },
  };
}

/**
 * De vaste ronde van de prestatievlucht, uitgerekend uit het eiland (dus op elk toestel dezelfde).
 * @param {ReturnType<typeof import('../sim/wereld/hoogte.js').maakWereldvorm>} vorm
 * @param {typeof import('../data/camera.js').CAMERA.vlucht} P
 */
function bouwRoute(vorm, P) {
  const e = vorm.eiland;
  const hb = e.hellingbaan;
  const pad = e.pad;
  const top = e.top;
  const C = e.midden;
  const k = vorm.kamp;
  /** @type {{ x:number, y:number, z:number, v:number, kijk: number[] | null }[]} */
  const pts = [];
  const lijn = (van, naar, boven, v, kijk = null) => {
    const L = Math.hypot(naar[0] - van[0], naar[1] - van[1]);
    const n = Math.max(1, Math.ceil(L / 3));
    for (let i = pts.length ? 1 : 0; i <= n; i++) {
      const t = i / n;
      const x = van[0] + (naar[0] - van[0]) * t;
      const z = van[1] + (naar[1] - van[1]) * t;
      pts.push({ x, z, y: vorm.hoogte(x, z) + boven, v, kijk });
    }
  };
  // Laag over de grond zoals tijdens het spelen: het kamp uit, over het zandpaadje, de hellingbaan op.
  lijn([k.x, k.z - 6], [pad.x0, pad.z0], P.laag, P.traag);
  lijn([pad.x0, pad.z0], [pad.x1, pad.z1], P.laag, P.traag);
  lijn([pad.x1, pad.z1], [hb.x1, hb.z1], P.laag, P.traag);
  // Over de etage en de bergtop op, boven de bomen.
  lijn([hb.x1, hb.z1], [top.x, top.z], P.boomHoog, P.traag);
  // Van de top omhoog en hoog rond het eiland, kijkend naar de top.
  const n = 60;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const a = Math.PI * 0.15 + f * P.rondje * Math.PI * 2;
    const r = P.rondStraal * Math.min(1, 0.3 + f * 4);
    const x = C.x + Math.sin(a) * r;
    const z = C.z - Math.cos(a) * r;
    pts.push({ x, z, y: Math.max(P.rondHoogte, vorm.hoogte(x, z) + 15), v: P.snel, kijk: [C.x, top.h * 0.7, C.z] });
  }
  // Terug omlaag naar het strand bij het kamp.
  const laatste = pts[pts.length - 1];
  const lagune = vorm.lagune;
  const m = 40;
  for (let i = 1; i <= m; i++) {
    const t = i / m;
    const x = laatste.x + (lagune.x - laatste.x) * t;
    const z = laatste.z + (lagune.z - 6 - laatste.z) * t;
    const y = laatste.y + (Math.max(0, vorm.hoogte(x, z)) + 6 - laatste.y) * (t * t * (3 - 2 * t));
    pts.push({ x, z, y: Math.max(y, vorm.hoogte(x, z) + 4), v: P.snel * (1 - 0.6 * t), kijk: null });
  }
  // Hoogtes zacht maken (geen schokjes van elke bult), maar nooit onder de grond.
  for (let ronde = 0; ronde < 3; ronde++) {
    for (let i = 1; i < pts.length - 1; i++) {
      const g = (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4;
      pts[i].y = Math.max(g, vorm.hoogte(pts[i].x, pts[i].z) + 2.5);
    }
  }
  // Tijd per punt (uit de afstand en de snelheid).
  let t = 0;
  pts[0].t = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    t += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / ((a.v + b.v) / 2);
    b.t = t;
  }
  return { pts, duur: t };
}

/**
 * @param {ReturnType<typeof import('../sim/wereld/hoogte.js').maakWereldvorm>} vorm
 * @param {typeof import('../data/camera.js').CAMERA.vlucht} P
 * @param {HTMLElement} uiLaag
 * @param {{ kwaliteit: string }} info
 */
export function maakPrestatievlucht(vorm, P, uiLaag, info) {
  const { pts, duur } = bouwRoute(vorm, P);
  const pos = new THREE.Vector3();
  const kijk = new THREE.Vector3();
  const kijkDoel = new THREE.Vector3();
  let t = -P.wacht;
  let i = 0;
  let klaar = false;
  let vorigPct = -2;
  // Meting: beelden per seconde in vensters van 1 s, het langste beeld, haperingen, tekenopdrachten, driehoeken.
  const meting = { beelden: 0, venster: 0, vensterBeelden: 0, laagste: Infinity, langste: 0, haperingen: 0, tijd: 0, maxTeken: 0, maxDrie: 0 };

  const label = document.createElement('div');
  label.className = 'vluchtlabel';
  uiLaag.appendChild(label);

  function toonUitslag() {
    const m = meting;
    const gem = m.beelden / Math.max(1e-3, m.tijd);
    const doel = info.kwaliteit === 'laag' ? 30 : 60;
    const el = document.createElement('div');
    el.className = 'vluchtuitslag';
    el.innerHTML = `
      <h2>Prestatievlucht klaar</h2>
      <table>
        <tr><td>laagste beelden/s</td><td><b class="${m.laagste >= doel ? 'goed' : 'slecht'}">${m.laagste.toFixed(0)}</b> (doel ${doel})</td></tr>
        <tr><td>gemiddeld</td><td>${gem.toFixed(0)} beelden/s</td></tr>
        <tr><td>langste beeld</td><td>${(m.langste * 1000).toFixed(0)} ms</td></tr>
        <tr><td>haperingen (&gt; 50 ms)</td><td>${m.haperingen}</td></tr>
        <tr><td>tekenopdrachten (max)</td><td>${m.maxTeken}</td></tr>
        <tr><td>driehoeken (max)</td><td>${m.maxDrie.toLocaleString('nl-BE')}</td></tr>
        <tr><td>kwaliteit</td><td>${info.kwaliteit}</td></tr>
        <tr><td>duur</td><td>${m.tijd.toFixed(0)} s</td></tr>
      </table>
      <div class="knoppen"><button data-doe="opnieuw">Nog eens</button><button data-doe="spelen">Spelen</button></div>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      const doe = /** @type {HTMLElement} */ (e.target).dataset?.doe;
      if (doe === 'opnieuw') location.reload();
      if (doe === 'spelen') {
        const u = new URL(location.href);
        u.searchParams.delete('vlucht');
        location.href = u.toString();
      }
    });
    uiLaag.appendChild(el);
    label.remove();
    window.spel.vluchtUitslag = { ...m, gemiddeld: gem };
  }

  return {
    duur,
    get klaar() {
      return klaar;
    },
    /** Waar de camera nu is (daar wordt de wereld rond geladen). */
    pos,
    /**
     * @param {number} dt echte tijd sinds het vorige beeld
     * @param {THREE.Camera} camera
     * @param {{ render: { calls: number, triangles: number } }} renderInfo van het vorige beeld
     */
    werkBij(dt, camera, renderInfo) {
      if (klaar) return;
      t += dt;
      const tt = Math.max(0, t);
      while (i < pts.length - 2 && pts[i + 1].t < tt) i++;
      const a = pts[i];
      const b = pts[i + 1];
      const f = Math.min(1, Math.max(0, (tt - a.t) / Math.max(1e-6, b.t - a.t)));
      pos.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
      // Kijken: naar een punt een eindje verder op de route, of naar de top tijdens het rondje.
      if (b.kijk) kijkDoel.set(b.kijk[0], b.kijk[1], b.kijk[2]);
      else {
        const j = Math.min(pts.length - 1, i + 6);
        kijkDoel.set(pts[j].x, pts[j].y - 2, pts[j].z);
      }
      if (t <= -P.wacht + 1e-6 || kijk.lengthSq() === 0) kijk.copy(kijkDoel);
      kijk.lerp(kijkDoel, 1 - Math.exp(-2.5 * dt));
      camera.position.copy(pos);
      camera.lookAt(kijk);

      // Meten (niet tijdens het wachten in het begin).
      if (t > 0) {
        const m = meting;
        m.tijd += dt;
        m.beelden++;
        m.venster += dt;
        m.vensterBeelden++;
        if (dt > m.langste) m.langste = dt;
        if (dt > 0.05) m.haperingen++;
        m.maxTeken = Math.max(m.maxTeken, renderInfo.render.calls);
        m.maxDrie = Math.max(m.maxDrie, renderInfo.render.triangles);
        if (m.venster >= 1) {
          m.laagste = Math.min(m.laagste, m.vensterBeelden / m.venster);
          m.venster = 0;
          m.vensterBeelden = 0;
        }
        const pct = Math.round((tt / duur) * 100);
        if (pct !== vorigPct) label.textContent = `prestatievlucht ${(vorigPct = pct)}%`;
      } else if (vorigPct !== -1) {
        vorigPct = -1;
        label.textContent = 'prestatievlucht: even laden ...';
      }
      if (tt >= duur) {
        klaar = true;
        toonUitslag();
      }
    },
  };
}
