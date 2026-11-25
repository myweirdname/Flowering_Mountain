// Het bergplan op het eiland zetten (stap 13, TP 5.3): ponypaden, klimwanden en oversteken op de plaats die
// het plan aanduidt. Elke kandidaat wordt eerst gekeurd (droog, niet op het speelterrein of in de rivier,
// boven op de etage, niet in een ravijn); de eerste die past, wordt gebouwd. Wat nergens past, blijft
// `geplaatst: false` en valt op in de controle (test.html). Daarna krijgt elke doorgang zijn wegwijzers.
// Stap 14b: ook de oversteken over de rivier, en de steigers (met het vlot naar beneden) met hun wegwijzer.
// Geen Three.js.
import { maakWillekeur } from '../../kern/willekeur.js';
import { maakBergwand } from '../klimmen/bergwand.js';
import { maakOversteek } from '../doorgangen/oversteek.js';

/**
 * @param {{ eiland: any, plan: ReturnType<typeof import('./bergplan.js').maakBergplan>, bodem: (x:number, z:number, uit:any) => any,
 *           laagland: (x:number, z:number) => number, D: typeof import('../../data/bergplan.js').BERGPLAN,
 *           HB: typeof import('../../data/eiland.js').EILAND.hellingbaan, K: typeof import('../../data/klimmen.js').KLIMMEN,
 *           SB: typeof import('../../data/speelbos.js').SPEELBOS, zaadje: number,
 *           rivieren?: { berg?: any, beneden?: any } }} c
 */
export function plaatsBergplan(c) {
  const { eiland: e, plan, D, HB, K, SB } = c;
  const w = maakWillekeur(c.zaadje);
  /** Waarom een kandidaat niet past (alleen om te testen: c.waarom = (soort, reden) => ...). */
  const waarom = c.waarom ?? (() => {});
  const b = {};
  const bodem = (x, z) => c.bodem(x, z, b);
  const { half, grillig } = e.randMaat;
  /** Naar buiten (weg van de top) en langs de rotsrand (de hoek op), in richting a. */
  const buiten = (a) => [Math.sin(a), -Math.cos(a)];
  const langs = (a) => [Math.cos(a), Math.sin(a)];
  /** Hoekverschil tussen -PI en PI. */
  const dHoek = (p, q) => Math.atan2(Math.sin(p - q), Math.cos(p - q));

  // --- Keuringen ---
  /** Laagland waar je vrij kan lopen: droog, landinwaarts, niet op het kampterrein, niet op de rotsrand. */
  function goedLaagland(x, z) {
    bodem(x, z);
    return b.d > 10 && b.rivier < 0.01 && b.lagune < 0.01 && b.weide < 0.01 && b.speelbos < 0.01 && b.ravijn < 0.05 &&
      b.berg < 0.05 && b.wand < 0.5 && b.vijver < 0.01 && b.bergrivier < 0.02;
  }
  /** Op de etage zelf: niet op de rotsrand, niet in een ravijn, niet op de bergtop. */
  function goedeEtage(x, z) {
    bodem(x, z);
    return b.berg > 0.97 && b.ravijn < 0.01 && b.wand < 0.5 && b.top < 0.01 && b.bergrivier < 0.02;
  }

  /** Bezette stukken rotsrand (hoeken): de ponypaden en de klimwanden, om ze uit elkaar te houden. */
  const bezet = e.hellingen.map((h) => [Math.min(h.a0, h.a1), Math.max(h.a0, h.a1)]);
  const vrijLangs = (a0, a1, marge) => bezet.every(([b0, b1]) => {
    const m = (b0 + b1) / 2;
    const half0 = (b1 - b0) / 2;
    const mij = (a0 + a1) / 2;
    return Math.abs(dHoek(mij, m)) > half0 + (a1 - a0) / 2 + marge;
  });

  const bergwanden = [];
  const oversteken = [];
  const naarHoek = (meter, a) => meter / e.randStraal(a);

  // ---------------------------------------------------------------- Ponypaden
  for (const v of plan.verbindingen.filter((q) => q.soort === 'ponypad')) {
    if (v.helling === 0) {
      // De hellingbaan van stap 12 is het ponypad van de plek achter het kamp.
      v.geplaatst = true;
      v.plaats = { helling: 0 };
      continue;
    }
    const breed = naarHoek(D.ponypad.lengte, v.kandidaten[0] ?? 0);
    for (const a0 of v.kandidaten) {
      const a1 = a0 + v.zin * breed;
      if (!vrijLangs(Math.min(a0, a1), Math.max(a0, a1), naarHoek(D.plaats.tussen, a0))) { waarom('ponypad', 'bezet'); continue; }
      // Onderaan: droog laagland, met het zandpaadje ervoor; bovenaan: de etage.
      const r0 = e.randStraal(a0) + half + HB.breedte + HB.marge;
      const onder = [0, 4, 8, 12, D.ponypad.padje].every((d) => {
        const [x, z] = e.punt(a0, r0 + d);
        return goedLaagland(x, z);
      });
      const [tx, tz] = e.punt(a1, e.randStraal(a1) - half - HB.breedte - HB.marge - 3);
      if (!onder || !goedeEtage(tx, tz)) { waarom('ponypad', onder ? 'boven' : 'onder'); continue; }
      const i = e.voegPonypadToe(a0, v.zin, D.ponypad.lengte, D.ponypad.padje, c.laagland);
      const h = e.hellingen[i];
      bezet.push([Math.min(h.a0, h.a1), Math.max(h.a0, h.a1)]);
      v.geplaatst = true;
      v.plaats = { helling: i };
      break;
    }
  }
  // Ook de hellingbaan van stap 12 telt als bezet (hij staat al in `bezet`).

  // ---------------------------------------------------------------- Klimwanden
  const BW = D.klimwand;
  for (const v of plan.verbindingen.filter((q) => q.soort === 'klimwand')) {
    for (const a of v.kandidaten) {
      const halfHoek = naarHoek(BW.breedte / 2 + BW.rand + BW.open.opzij, a);
      if (!vrijLangs(a - halfHoek, a + halfHoek, naarHoek(D.plaats.tussen, a))) { waarom('klimwand', 'bezet'); continue; }
      const R1 = e.randStraal(a);
      const rVoet = R1 + half + grillig + BW.voor;
      const N = buiten(a);
      const T = langs(a);
      const Rv = [N[1], -N[0]]; // naar rechts zoals je naar de wand kijkt
      const [mx, mz] = e.punt(a, rVoet);
      // Voor de wand: droog en vlak genoeg.
      const hoogtes = [];
      let goed = true;
      for (const u of [-BW.breedte / 2 - BW.rand, 0, BW.breedte / 2 + BW.rand]) {
        for (const vv of [0.5, BW.open.voor * 0.5, BW.open.voor]) {
          const x = mx + Rv[0] * u + N[0] * vv;
          const z = mz + Rv[1] * u + N[1] * vv;
          if (!goedLaagland(x, z)) goed = false;
          hoogtes.push(b.h);
        }
      }
      if (!goed) { waarom('klimwand', 'voor: ' + JSON.stringify({ d: +b.d.toFixed(1), rivier: b.rivier, lagune: b.lagune, weide: b.weide, speelbos: b.speelbos, ravijn: +b.ravijn.toFixed(2), berg: +b.berg.toFixed(2), wand: b.wand })); continue; }
      if (Math.max(...hoogtes) - Math.min(...hoogtes) > 3.5) { waarom('klimwand', 'scheef ' + (Math.max(...hoogtes) - Math.min(...hoogtes)).toFixed(1)); continue; }
      // Achter de wand: de etage, zonder ravijn of ponypad.
      const rTop = R1 - half - grillig - 0.5;
      let top = -Infinity;
      for (const u of [-BW.breedte / 2, 0, BW.breedte / 2]) {
        const x = e.punt(a, rTop)[0] + T[0] * u;
        const z = e.punt(a, rTop)[1] + T[1] * u;
        if (!goedeEtage(x, z) || b.pad > 0.3) goed = false;
        top = Math.max(top, b.h);
      }
      const [ax, az] = e.punt(a, R1 - half - grillig - BW.achter);
      if (!goed || !goedeEtage(ax, az)) { waarom('klimwand', 'achter ' + JSON.stringify({ berg: +b.berg.toFixed(2), ravijn: +b.ravijn.toFixed(2), wand: b.wand, top: b.top, pad: +b.pad.toFixed(2) })); continue; }
      const voetH = hoogtes.slice(0, 3).reduce((s, h) => s + h, 0) / 3 + 0.05;
      const hoogte = Math.round((top - voetH + 0.1) * 100) / 100;
      if (hoogte < 10 || hoogte > 45) { waarom('klimwand', 'hoogte ' + hoogte); continue; }
      const diep = rVoet - (R1 - half - grillig - BW.achter);
      const wand = maakBergwand(BW, { midden: [mx, mz], N, voetH, hoogte, diep }, K, w);
      wand.hoek = a;
      bergwanden.push(wand);
      // De grasplek voor de pijler (de pijler steekt `rand` voorbij de wandkaart uit).
      e.voegWandToe({
        x0: wand.O[0] - wand.R[0] * BW.rand, z0: wand.O[2] - wand.R[2] * BW.rand, rx: wand.R[0], rz: wand.R[2], nx: N[0], nz: N[1],
        breedte: BW.breedte + 2 * BW.rand, voetH, voor: BW.open.voor, opzij: BW.open.opzij, zacht: BW.open.rand, diep,
      });
      bezet.push([a - halfHoek, a + halfHoek]);
      v.geplaatst = true;
      v.plaats = { wand: bergwanden.length - 1 };
      // De moeilijkheid van een klimwand is die van de makkelijkste route.
      v.moeilijkheid = Math.min(...wand.routes.map((r) => graadNaarPootjes(r.graad)));
      break;
    }
  }

  // ---------------------------------------------------------------- Oversteken over de ravijnen
  const BO = D.oversteek;
  /** Per ravijn: waar er al een oversteek ligt (afstand tot de top). */
  const alOver = new Map();
  /** Zoekt een plek voor een oversteek van soort `soort` over het ravijn van v; bouwt ze als het lukt. */
  function probeerOversteek(v, soort) {
    const rv = e.ravijnen[v.ravijn];
    const T = langs(rv.a);
    const maxV = soort === 'liaan' ? BO.liaanVerschil : BO.maxVerschil;
    for (const f of v.kandidaten) {
      const r = rv.kop + (rv.voet - rv.kop) * f;
      if ((alOver.get(v.ravijn) ?? []).some((r2) => Math.abs(r2 - r) < BO.tussen)) { waarom('oversteek', 'te dicht'); continue; }
      const [cx, cz] = e.punt(rv.a, r);
      // De randen van het ravijn: vanaf het midden naar elke kant, tot de grond weer op de etage ligt.
      const rand = (kant) => {
        const ref = bodem(cx + T[0] * kant * (rv.breed + 3), cz + T[1] * kant * (rv.breed + 3)).h;
        for (let q = 1; q <= rv.breed + 3; q += 0.25) {
          const h = bodem(cx + T[0] * kant * q, cz + T[1] * kant * q).h;
          if (h >= ref - 0.6) return q;
        }
        return null;
      };
      const ra = rand(-1);
      const rb = rand(1);
      if (ra === null || rb === null) { waarom('oversteek', 'geen rand'); continue; }
      const qa = ra + BO.dekStraal - BO.overRand;
      const qb = rb + BO.dekStraal - BO.overRand;
      const A = [cx - T[0] * qa, cz - T[1] * qa];
      const B = [cx + T[0] * qb, cz + T[1] * qb];
      // Beide platforms op de etage, met een stukje beloopbare etage erachter.
      const achterA = [cx - T[0] * (qa + 3), cz - T[1] * (qa + 3)];
      const achterB = [cx + T[0] * (qb + 3), cz + T[1] * (qb + 3)];
      if (![A, B, achterA, achterB].every(([x, z]) => {
        bodem(x, z);
        return b.berg > 0.97 && b.wand < 0.5 && b.pad < 0.3 && b.top < 0.01;
      })) { waarom('oversteek', 'niet op etage'); continue; }
      // Elk platform net boven de hoogste grond eronder.
      const dekH = ([x, z]) => {
        let h = -Infinity;
        for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) h = Math.max(h, bodem(x + dx * BO.dekStraal, z + dz * BO.dekStraal).h);
        return h + BO.dekBoven;
      };
      const hA = dekH(A);
      const hB = dekH(B);
      if (Math.abs(hA - hB) > maxV) { waarom('oversteek', 'verschil ' + Math.abs(hA - hB).toFixed(2)); continue; }
      const gat = qa + qb - 2 * BO.dekStraal;
      if (gat < 5 || gat > 20) { waarom('oversteek', 'gat ' + gat.toFixed(1)); continue; }
      const bos = maakOversteek(SB, BO, soort, A, B, hA, hB, w);
      bos.verbinding = v.id;
      oversteken.push(bos);
      e.voegOpenToe(A[0], A[1], BO.dekStraal + 2.5);
      e.voegOpenToe(B[0], B[1], BO.dekStraal + 2.5);
      alOver.set(v.ravijn, [...(alOver.get(v.ravijn) ?? []), r]);
      return oversteken.length - 1;
    }
    return -1;
  }
  // ---------------------------------------------------------------- Oversteken over de rivier (stap 14b)
  // Zoals over een ravijn, maar hoger (het vlot met de pony vaart eronderdoor), met een trapje naar elk platform.
  const BR = c.rivieren?.berg;
  const BRO = D.rivierOversteek;
  const alOverRivier = [];
  function probeerRivierOversteek(v, soort) {
    if (!BR) return -1;
    const Z = BR.zones.etage;
    const stE = BR.steigers.find((k) => k.naam === 'etage');
    const maxV = soort === 'liaan' ? BO.liaanVerschil : BO.maxVerschil;
    for (const f of v.kandidaten) {
      const s = Z.van + (Z.tot - Z.van) * f;
      if (alOverRivier.some((s2) => Math.abs(s2 - s) < BRO.tussen)) { waarom('rivieroversteek', 'te dicht'); continue; }
      if ((stE && Math.abs(s - stE.s) < BRO.vanSteiger) || s > BR.sLip - BRO.vanRand || BR.inSprong(s)) { waarom('rivieroversteek', 'steiger of rand'); continue; }
      const [cx, cz] = BR.puntOp(s, 0);
      const [px, pz] = BR.puntOp(s, 1);
      const T = [px - cx, pz - cz]; // dwars op de stroom, naar de rechteroever
      const b0 = BR.breedte(s);
      // De rand van de sleuf: vanaf de waterlijn naar buiten, tot de grond weer op het land ligt.
      const rand = (kant) => {
        const ref = bodem(cx + T[0] * kant * (b0 + 7), cz + T[1] * kant * (b0 + 7)).h;
        for (let q = b0; q <= b0 + 6; q += 0.25) {
          if (bodem(cx + T[0] * kant * q, cz + T[1] * kant * q).h >= ref - 0.35) return q;
        }
        return null;
      };
      const ra = rand(-1);
      const rb = rand(1);
      if (ra === null || rb === null) { waarom('rivieroversteek', 'geen rand'); continue; }
      const qa = ra + BO.dekStraal - BO.overRand;
      const qb = rb + BO.dekStraal - BO.overRand;
      const A = [cx - T[0] * qa, cz - T[1] * qa];
      const B = [cx + T[0] * qb, cz + T[1] * qb];
      const gat = qa + qb - 2 * BO.dekStraal;
      if (gat < 5 || gat > 20) { waarom('rivieroversteek', 'gat ' + gat.toFixed(1)); continue; }
      // De grond onder elk platform, en het platform hoog boven het water.
      const peil = BR.peil(s);
      const grondOnder = ([x, z]) => {
        let h = -Infinity;
        for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) h = Math.max(h, bodem(x + dx * BO.dekStraal, z + dz * BO.dekStraal).h);
        return h;
      };
      const gA = grondOnder(A);
      const gB = grondOnder(B);
      const hA = Math.max(gA + BO.dekBoven, peil + BRO.boven);
      const hB = Math.max(gB + BO.dekBoven, peil + BRO.boven);
      if (Math.abs(hA - hB) > maxV) { waarom('rivieroversteek', 'verschil ' + Math.abs(hA - hB).toFixed(2)); continue; }
      // Een trapje van elk platform naar het land: liefst recht van de rivier weg, anders (in een bocht) langs de
      // oever. Zo lang als nodig voor de hoogte; onderaan gewone etage, droog en vlak genoeg.
      const zijwaarts = [-T[1], T[0]]; // langs de rivier (bij lianen staat de boom aan deze kant)
      const trappen = [];
      let goed = true;
      for (const [P, h, kant] of [[A, hA, -1], [B, hB, 1]]) {
        const richtingen = [[T[0] * kant, T[1] * kant], [-zijwaarts[0], -zijwaarts[1]]];
        if (soort !== 'liaan') richtingen.push(zijwaarts);
        let gekozen; // nog niets gevonden (null = geen trapje nodig)
        for (const r of richtingen) {
          const o = [P[0] + r[0] * (BO.dekStraal - 0.3), P[1] + r[1] * (BO.dekStraal - 0.3)];
          let L = 3;
          let gEind = 0;
          for (let k = 0; k < 4; k++) {
            gEind = bodem(o[0] + r[0] * L, o[1] + r[1] * L).h;
            L = Math.max(1.5, Math.min(9, (h - gEind) / BRO.trapHelling));
          }
          gEind = bodem(o[0] + r[0] * L, o[1] + r[1] * L).h;
          let ok = true;
          for (const f of [0.5, 1]) {
            bodem(o[0] + r[0] * L * f, o[1] + r[1] * L * f);
            if (b.rivier > 0.01) ok = false; // niet boven het water
          }
          for (const extra of [0.5, 2.5]) {
            bodem(o[0] + r[0] * (L + extra), o[1] + r[1] * (L + extra));
            if (!(b.berg > 0.97 && b.ravijn < 0.01 && b.top < 0.01 && b.rivier < 0.01 && b.wand < 0.5 && b.pad < 0.3)) ok = false;
          }
          if (!ok) continue;
          gekozen = Math.abs(h - BO.dekBoven - gEind) < 0.3 ? null : { lengte: L, h1: gEind + 0.02, richting: r };
          break;
        }
        if (gekozen === undefined) goed = false;
        trappen.push(gekozen ?? null);
      }
      if (!goed) { waarom('rivieroversteek', 'trapje niet op de etage'); continue; }
      const bos = maakOversteek(SB, BO, soort, A, B, hA, hB, w, {
        grond: [gA, gB], trappen, breedte: BRO.trapBreedte,
        peilOp: (x, z) => {
          const p = BR.peilOp(x, z);
          return p > 0 ? p : -Infinity;
        },
      });
      bos.verbinding = v.id;
      bos.overRivier = true;
      oversteken.push(bos);
      for (const [x, z] of [A, B]) e.voegOpenToe(x, z, BO.dekStraal + 2.5);
      for (const [x, z] of bos.ingangen) e.voegOpenToe(x, z, 2.5);
      alOverRivier.push(s);
      return oversteken.length - 1;
    }
    return -1;
  }

  for (const v of plan.verbindingen.filter((q) => q.ravijn !== undefined || q.overRivier)) {
    // Eerst de soort uit het plan; past die nergens, dan een andere die nog niet over deze scheiding gaat.
    const al = plan.verbindingen.filter((q) => q !== v && q.scheiding === v.scheiding && q.geplaatst).map((q) => q.soort);
    const soorten = [v.soort, ...(v.reserve ?? []).filter((q) => q !== v.soort)].filter((q) => !al.includes(q));
    for (const soort of soorten) {
      const i = v.overRivier ? probeerRivierOversteek(v, soort) : probeerOversteek(v, soort);
      if (i < 0) continue;
      if (soort !== v.soort) {
        const S = D.soorten[soort];
        Object.assign(v, { soort, terug: S.terug, moeilijkheid: S.moeilijkheid });
      }
      v.geplaatst = true;
      v.plaats = { parcours: i };
      break;
    }
  }

  // De helling van een plek naar de top: de kegel ligt er altijd (de loopkaart in test.html kijkt het na).
  for (const v of plan.verbindingen.filter((q) => q.soort === 'helling')) v.geplaatst = true;

  // Met het vlot naar beneden (stap 14b): elke steiger waar een vlot klaarligt.
  for (const v of plan.verbindingen.filter((q) => q.soort === 'rivier')) {
    const rv = v.tak === 1 ? BR : c.rivieren?.beneden;
    const st = rv?.steigers.find((k) => k.naam === v.steiger);
    if (!st) continue;
    v.geplaatst = true;
    v.plaats = { tak: v.tak, steiger: st.naam, land: steigerLand(rv, st, D.wegwijzer) };
  }

  // ---------------------------------------------------------------- Wegwijzers (GD 2)
  const WW = D.wegwijzer;
  const bord = (v, x, z, kijk) => v.wegwijzers.push({ x, z, richting: Math.atan2(kijk[0], kijk[1]), soort: v.soort, pictogram: D.soorten[v.soort]?.pictogram ?? v.soort, moeilijkheid: v.moeilijkheid });
  for (const v of plan.verbindingen) {
    if (!v.geplaatst || v.soort === 'helling') continue;
    if (v.soort === 'ponypad') {
      const h = e.hellingen[v.plaats.helling];
      const zij = [-h.ez, h.ex];
      // Onderaan, naast het begin van het pad, en bovenaan op de etage.
      const ox = h.x0 - h.ex * (3 + WW.voor);
      const oz = h.z0 - h.ez * (3 + WW.voor);
      const kant = zijNaarBuiten(e, ox, oz, zij);
      bord(v, ox + zij[0] * kant * (HB.breedte + WW.opzij), oz + zij[1] * kant * (HB.breedte + WW.opzij), [-h.ex, -h.ez]);
      const bx = h.x1 + h.ex * (WW.voor + 1);
      const bz = h.z1 + h.ez * (WW.voor + 1);
      bord(v, bx - zij[0] * kant * (HB.breedte + WW.opzij), bz - zij[1] * kant * (HB.breedte + WW.opzij), [h.ex, h.ez]);
    } else if (v.soort === 'klimwand') {
      const wand = bergwanden[v.plaats.wand];
      // Links voor de wand, schuin naar je toe (zoals de bordjes aan de oefenrots).
      const p = wand.naarWereld(-BW.rand - WW.opzij * 0.6, 0, WW.voor);
      bord(v, p[0], p[2], [wand.N[0], wand.N[2]]);
    } else if (v.soort === 'rivier') {
      // Aan de landkant van de steiger, een beetje opzij, met het bordje naar wie aankomt.
      const L = v.plaats.land;
      bord(v, L.bord[0], L.bord[1], L.uit);
    } else if (v.plaats?.parcours !== undefined) {
      const bos = oversteken[v.plaats.parcours];
      const m = bos.modules[0];
      const zij = m.b;
      const [A, B] = bos.dekken;
      if (bos.overRivier) {
        // Naast de voet van het trapje.
        const [ia, ib] = bos.ingangen;
        bord(v, ia[0] + zij[0] * WW.opzij * 0.7, ia[1] + zij[1] * WW.opzij * 0.7, [-m.a[0], -m.a[1]]);
        if (v.terug) bord(v, ib[0] - zij[0] * WW.opzij * 0.7, ib[1] - zij[1] * WW.opzij * 0.7, [m.a[0], m.a[1]]);
        continue;
      }
      bord(v, A.x - m.a[0] * (A.straal + 1) + zij[0] * WW.opzij, A.z - m.a[1] * (A.straal + 1) + zij[1] * WW.opzij, [-m.a[0], -m.a[1]]);
      if (v.terug) bord(v, B.x + m.a[0] * (B.straal + 1) - zij[0] * WW.opzij, B.z + m.a[1] * (B.straal + 1) - zij[1] * WW.opzij, [m.a[0], m.a[1]]);
    }
  }

  return { bergwanden, oversteken };
}

/**
 * De landkant van een steiger: waar je op de oever aankomt (voor), de richting van de rivier weg (uit) en
 * waar het bordje komt (bord: naast de steiger, aan de landkant).
 */
function steigerLand(rv, st, WW) {
  const dek = st.dek;
  const [mx, mz] = rv.puntOp(st.s, 0);
  let ux = dek.x - mx;
  let uz = dek.z - mz;
  const l = Math.hypot(ux, uz) || 1;
  ux /= l;
  uz /= l;
  const voor = [dek.x + ux * (dek.halfB + 1.6), dek.z + uz * (dek.halfB + 1.6)];
  const bord = [
    dek.x + ux * (dek.halfB + WW.steigerLand) + dek.ax * (dek.halfL + WW.steigerOpzij),
    dek.z + uz * (dek.halfB + WW.steigerLand) + dek.az * (dek.halfL + WW.steigerOpzij),
  ];
  return { voor, uit: [ux, uz], bord };
}

/** Graad naar pootjes op de wegwijzer: 3 en 4 = 1 pootje, 5 = 2, 6 en hoger = 3. */
export function graadNaarPootjes(graad) {
  const g = parseInt(graad, 10);
  return g <= 4 ? 1 : g === 5 ? 2 : 3;
}

/** Aan welke kant van het pad (+1 of -1 langs `zij`) ligt het laagland, weg van de berg. */
function zijNaarBuiten(e, x, z, zij) {
  const r1 = Math.hypot(x + zij[0] * 3 - e.midden.x, z + zij[1] * 3 - e.midden.z);
  const r2 = Math.hypot(x - zij[0] * 3 - e.midden.x, z - zij[1] * 3 - e.midden.z);
  return r1 > r2 ? 1 : -1;
}

/**
 * De eindpunten van een geplaatste doorgang, op de grond ernaast: waar je hem begint en waar je uitkomt
 * (voor de controle in test.html: van elk eindpunt kom je te voet in het midden van zijn plek, TP 5.3).
 * @returns {{ x:number, z:number, knoop:string }[]}
 */
export function eindpunten(vorm, v) {
  const e = vorm.eiland;
  if (!v.geplaatst) return [];
  if (v.soort === 'ponypad') {
    const h = e.hellingen[v.plaats.helling];
    return [
      { x: h.x0 - h.ex * 6, z: h.z0 - h.ez * 6, knoop: v.van },
      { x: h.x1 + h.ex * 6, z: h.z1 + h.ez * 6, knoop: v.naar },
    ];
  }
  if (v.soort === 'klimwand') {
    const w = vorm.bergwanden[v.plaats.wand];
    const voor = w.naarWereld(w.breedte / 2, 0, 3);
    const achter = w.naarWereld(w.breedte / 2, 0, -w.diepte - 2);
    return [{ x: voor[0], z: voor[2], knoop: v.van }, { x: achter[0], z: achter[2], knoop: v.naar }];
  }
  if (v.plaats?.parcours !== undefined) {
    const [ia, ib] = vorm.oversteken[v.plaats.parcours].ingangen;
    return [
      { x: ia[0], z: ia[1], knoop: v.van },
      { x: ib[0], z: ib[1], knoop: v.naar },
    ];
  }
  if (v.soort === 'rivier') {
    // Aan de steiger: daar moet je te voet kunnen komen (op de plek van de steiger).
    const [x, z] = v.plaats.land.voor;
    return [{ x, z, knoop: v.van }];
  }
  return [];
}
