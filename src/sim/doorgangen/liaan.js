// Lianen (GD 3, oversteken): van liaan naar liaan slingeren, loslaten op het juiste moment (TP 6: een
// wiskundige slinger). Joystick vooruit = hoger zwaaien, achteruit = afremmen, springknop = loslaten.
// Kom je in de lucht dicht bij een liaan, dan grijp je hem vanzelf vast.
import { kies, kiesAantal } from './hulp.js';

export function maakLianen(w, D) {
  const L = D.liaan;
  const n = kiesAantal(w, L.aantal);
  const lianen = [];
  let t = kies(w, L.eerste);
  for (let i = 0; i < n; i++) {
    lianen.push({ t, hoek: 0, hoekV: 0, door: null, fase: w.geheel(628) / 100 });
    if (i < n - 1) t += kies(w, L.tussen);
  }
  return { soort: 'liaan', len: t + kies(w, L.laatste), lianen, tijd: 0 };
}

/** Het ophangpunt van liaan l (wereld), en de lengte van het touw. */
export function anker(m, D, l) {
  return [m.o[0] + m.a[0] * l.t, m.h0 + D.liaan.ankerBoven, m.o[1] + m.a[1] * l.t];
}
export const touwLengte = (D) => D.liaan.ankerBoven - D.liaan.onderBoven;

/** Het uiteinde van het touw (of waar de handjes zitten, bij straal r). */
export function touwPunt(m, D, l, r, uit = [0, 0, 0]) {
  const [ax, ay, az] = anker(m, D, l);
  const s = Math.sin(l.hoek);
  uit[0] = ax + m.a[0] * s * r;
  uit[1] = ay - Math.cos(l.hoek) * r;
  uit[2] = az + m.a[1] * s * r;
  return uit;
}

/** De lianen waar niemand aan hangt: ze slingeren uit en wiegen zacht in de wind. */
export function stapLianen(m, D, dt) {
  m.tijd += dt;
  const L = D.liaan;
  const g = L.zwaartekracht / touwLengte(D);
  for (const l of m.lianen) {
    if (l.door) continue;
    const wind = 0.04 * Math.sin(m.tijd * 0.9 + l.fase);
    l.hoekV += (-g * Math.sin(l.hoek - wind) - l.hoekV * 0.6) * dt;
    l.hoek += l.hoekV * dt;
  }
}

/** Hoe hoog de zwaai nu reikt (de hoek waar de slinger stilvalt). */
function zwaaiHoogte(hoek, hoekV, r, g) {
  const c = Math.cos(hoek) - (hoekV * hoekV * r) / (2 * g);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** In de lucht: grijp je een liaan? Geeft true als je nu hangt. */
export function grijpLiaan(m, D, s, mi, meld) {
  const L = D.liaan;
  const hx = s.pos[0];
  const hy = s.pos[1] + L.handHoogte;
  const hz = s.pos[2];
  const R = touwLengte(D);
  for (let i = 0; i < m.lianen.length; i++) {
    const l = m.lianen[i];
    if (l.door) continue;
    if (s.liaanLos && s.liaanLos.m === mi && s.liaanLos.i === i && s.liaanLos.tijd > 0) continue;
    const [ax, ay, az] = anker(m, D, l);
    // Afstand van de handjes tot het touw (een lijnstuk van het anker naar het uiteinde).
    const ex = m.a[0] * Math.sin(l.hoek) * R;
    const ey = -Math.cos(l.hoek) * R;
    const ez = m.a[1] * Math.sin(l.hoek) * R;
    const f = Math.max(0.3, Math.min(1, ((hx - ax) * ex + (hy - ay) * ey + (hz - az) * ez) / (R * R)));
    const d = Math.hypot(hx - ax - ex * f, hy - ay - ey * f, hz - az - ez * f);
    if (d > L.grijp) continue;
    // Vast! De hoek volgt uit waar je de liaan pakt, de zwaaisnelheid uit je vaart.
    const r = Math.max(1.6, f * R);
    const langs = (hx - ax) * m.a[0] + (hz - az) * m.a[1];
    const hoek = Math.atan2(langs, Math.max(0.3, ay - hy));
    const vLangs = s.vel[0] * m.a[0] + s.vel[2] * m.a[1];
    // De liaan vangt een deel van je vaart op, en hoger dan de hoogste zwaai gaat het nooit.
    const g = L.zwaartekracht;
    const maxV = Math.sqrt(Math.max(0, (2 * g * (Math.cos(hoek) - Math.cos(L.maxZwaai))) / r));
    const hoekV = Math.max(-maxV, Math.min(maxV, ((vLangs * Math.cos(hoek) + s.vel[1] * Math.sin(hoek)) / r) * L.opvangen));
    l.door = s.id;
    l.hoek = hoek;
    l.hoekV = hoekV;
    s.modus = 'slingeren';
    s.liaan = { m: mi, i, r };
    s.opGrond = false;
    s.vlucht = 0;
    s.springVorige = !!s.springVorige;
    zetAanLiaan(m, D, s, l, r);
    meld({ soort: 'liaanGrijp', speler: s.id, pos: [...s.pos], snelheid: Math.abs(hoekV * r) });
    return true;
  }
  return false;
}

/** De speler hangt aan de liaan: de voetjes in het verlengde van het touw. */
function zetAanLiaan(m, D, s, l, r) {
  const L = D.liaan;
  const [ax, ay, az] = anker(m, D, l);
  const R = r + L.handHoogte;
  const sn = Math.sin(l.hoek);
  const cs = Math.cos(l.hoek);
  s.pos[0] = ax + m.a[0] * sn * R;
  s.pos[1] = ay - cs * R;
  s.pos[2] = az + m.a[1] * sn * R;
  const v = l.hoekV * R;
  s.vel[0] = m.a[0] * cs * v;
  s.vel[1] = sn * v;
  s.vel[2] = m.a[1] * cs * v;
  s.richting = Math.atan2(m.a[0], m.a[1]);
  s.zwaai = l.hoek;
}

/** Eén stap aan de liaan. */
export function stapSlingeren(m, D, s, int, dt, meld) {
  const L = D.liaan;
  const l = m.lianen[s.liaan.i];
  const r = s.liaan.r;
  const g = L.zwaartekracht / r;
  // Joystick vooruit (in de richting van het parcours) = pompen, achteruit = remmen.
  const f = int.beweeg[0] * m.a[0] + int.beweeg[1] * m.a[1];
  const richting = l.hoekV >= 0 ? 1 : -1;
  const hoogte = zwaaiHoogte(l.hoek, l.hoekV, r, L.zwaartekracht);
  let duw = 0;
  if (f > 0.2 && hoogte < L.maxZwaai) duw = L.pomp * f * richting;
  else if (f < -0.2) duw = -L.rem * -f * richting * Math.min(1, Math.abs(l.hoekV) * 2);
  else if (hoogte < 0.4) duw = L.vanzelf * richting;
  l.hoekV += (-g * Math.sin(l.hoek) - L.demping * l.hoekV + duw / r) * dt;
  l.hoek += l.hoekV * dt;
  zetAanLiaan(m, D, s, l, r);

  // Loslaten met de springknop: je vliegt verder met de vaart van de handjes, plus een hupje.
  const drukNu = int.spring && !s.springVorige;
  s.springVorige = int.spring;
  if (!drukNu) return;
  const v = l.hoekV * r;
  const cs = Math.cos(l.hoek);
  const vooruit = l.hoekV > 0 ? L.loslaatDuw : 0;
  s.vel = [m.a[0] * (cs * v + vooruit), Math.sin(l.hoek) * v + L.loslaatHup, m.a[1] * (cs * v + vooruit)];
  s.modus = 'lopen';
  s.opGrond = false;
  s.coyote = 0;
  s.springtVast = false;
  s.vlucht = L.vrijeVlucht;
  s.liaanLos = { m: s.liaan.m, i: s.liaan.i, tijd: L.opnieuw };
  s.liaan = null;
  s.zwaai = 0;
  l.door = null;
  meld({ soort: 'liaanLos', speler: s.id, pos: [...s.pos], snelheid: Math.abs(v) });
}

/** Laat de liaan los zonder sprong (bv. bij een plof). */
export function laatLiaanLos(m, s) {
  if (!s.liaan) return;
  m.lianen[s.liaan.i].door = null;
  s.liaan = null;
  s.zwaai = 0;
}

/** De actieknop aan de rand van het platform: een sprongetje naar de eerste liaan. */
export function springNaarLiaan(m, D, s, meld) {
  const L = D.liaan;
  const l = m.lianen[0];
  const doelX = m.o[0] + m.a[0] * l.t;
  const doelZ = m.o[1] + m.a[1] * l.t;
  const T = L.sprongNaarLiaan.tijd;
  s.vel = [(doelX - s.pos[0]) / T, L.sprongNaarLiaan.omhoog, (doelZ - s.pos[2]) / T];
  s.opGrond = false;
  s.coyote = 0;
  s.vlucht = T + 0.3;
  meld({ soort: 'sprong', speler: s.id });
}

export function bloesemsLiaan(m, D) {
  // Tussen twee lianen, op de hoogte van een flinke zwaai.
  const uit = [];
  for (let i = 0; i < m.lianen.length; i++) {
    const t0 = m.lianen[i].t;
    const t1 = i + 1 < m.lianen.length ? m.lianen[i + 1].t : m.len;
    uit.push([(t0 + t1) / 2, 0, m.h0 + 1.9]);
  }
  return uit;
}
