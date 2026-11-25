// Het bergplan (stap 13, TP 5.1): het eiland als klein netwerk, zonder enige 3D.
// - knopen: het kamp (het laagland rond de berg), de open plekken op de etage, de top;
// - scheidingen: de rotsrand onder elke plek, en de ravijnen tussen twee plekken;
// - verbindingen: de doorgangen over een scheiding (soort, richting, moeilijkheid, vereiste), en de helling
//   van elke plek naar de top (gewoon lopen).
// Het plan kiest ook waar elke doorgang ongeveer komt (een hoek rond de berg, of een plek langs een ravijn),
// met reservekandidaten. Het bouwen op het eiland gebeurt elders (sim/wereld/hoogte.js); wat niet past,
// blijft `geplaatst: false` en valt op in de controle. Geen Three.js.
//
// De rivier over de berg (stap 14b) is ook een scheiding: ze deelt de plek waar ze over de etage stroomt in
// twee, met twee oversteken ertussen. En elke steiger is een verbinding omlaag: met het vlot naar het kamp
// (regel 5).
//
// Uitbreiden (meer etages in stap 17, nieuwe doorgangen in stap 16): voeg knopen, scheidingen of verbindingen
// toe in dezelfde vorm; `controleerBergplan` hoeft daarvoor niet te veranderen.
import { maakWillekeur } from '../../kern/willekeur.js';

const TWEE_PI = Math.PI * 2;
/** Hoek tussen 0 en 2PI. */
const rond = (a) => ((a % TWEE_PI) + TWEE_PI) % TWEE_PI;

/**
 * @typedef {{ id:string, soort:'kamp'|'plek'|'top', etage:number, van?:number, tot?:number, midden?:number }} Knoop
 *   van/tot: de hoeken rond de berg waartussen een plek ligt (tot > van, kan voorbij 2PI lopen)
 * @typedef {{ id:string, soort:'rotsrand'|'ravijn', tussen:[string,string], ravijn?:number }} Scheiding
 * @typedef {{ id:string, soort:string, richting:string, van:string, naar:string, terug:boolean, vereiste:string|null,
 *             moeilijkheid:number, scheiding:string|null, kandidaten:number[], ravijn?:number, geplaatst:boolean,
 *             plaats:any, wegwijzers:{x:number,z:number,richting:number}[] }} Verbinding
 */

/**
 * @param {ReturnType<typeof import('./eiland.js').maakEiland>} eiland na eiland.bouw (de ravijnen en de hellingbaan liggen vast)
 * @param {typeof import('../../data/bergplan.js').BERGPLAN} D
 * @param {number} zaadje
 * @param {{ berg?: any, beneden?: any }} [rivieren] de rivier over de berg en de benedenrivier (stap 14b)
 */
export function maakBergplan(eiland, D, zaadje, rivieren = {}) {
  const w = maakWillekeur(zaadje);
  const P = D.plaats;
  /** @type {Knoop[]} */
  const knopen = [{ id: 'kamp', soort: 'kamp', etage: 0 }];
  /** @type {Scheiding[]} */
  const scheidingen = [];
  /** @type {Verbinding[]} */
  const verbindingen = [];
  const nieuw = (soort, van, naar, scheiding, extra = {}) => {
    const S = D.soorten[soort] ?? { richting: 'helling', ...D.helling };
    const v = {
      id: 'v' + verbindingen.length, soort, richting: S.richting, van, naar, terug: S.terug, vereiste: S.vereiste,
      moeilijkheid: S.moeilijkheid, scheiding, kandidaten: [], geplaatst: false, plaats: null, wegwijzers: [], ...extra,
    };
    verbindingen.push(v);
    return v;
  };

  /** Meter langs de rotsrand naar radialen, rond hoek a. */
  const naarHoek = (meter, a) => meter / eiland.randStraal(a);
  const C = eiland.midden;
  const hoekVan = (x, z) => Math.atan2(x - C.x, C.z - z);
  const dHoek = (p, q) => Math.atan2(Math.sin(p - q), Math.cos(p - q));

  // --- De rivier over de etage (stap 14b): welk stuk van de ring ze inneemt, met haar oevers ---
  const br = rivieren.berg;
  let band = null;
  if (br) {
    const ref = br.hoeken.val;
    let lo = Infinity;
    let hi = -Infinity;
    const pq = [0, 0];
    for (let s = br.zones.voetKom.van; s <= br.sLip + 2; s += 1) {
      const b = br.breedte(s) + br.R.oever.breed;
      for (const d of [-b, 0, b]) {
        br.puntOp(s, d, pq);
        const a = dHoek(hoekVan(pq[0], pq[1]), ref);
        lo = Math.min(lo, a);
        hi = Math.max(hi, a);
      }
    }
    band = { midden: rond(ref + (lo + hi) / 2), half: (hi - lo) / 2 };
  }

  // --- De plekken: de etage tussen twee grenzen (een ravijn of de rivier) ---
  /** @type {{ a:number, soort:string, i?:number, half:number }[]} */
  const grenzen = eiland.ravijnen.map((r, i) => ({ a: rond(r.a), soort: 'ravijn', i, half: 0 }));
  if (band) grenzen.push({ a: band.midden, soort: 'rivier', half: band.half });
  grenzen.sort((p, q) => p.a - q.a);
  const n = grenzen.length;
  /** Hoe ver een doorgang van een grens blijft (radialen, rond hoek a). */
  const vanGrens = (g, a) => (g.soort === 'rivier' ? g.half + naarHoek(D.rivierOversteek.bandMarge, a) : naarHoek(P.vanRavijn, a));
  const plekken = grenzen.map((g, k) => {
    const volgende = grenzen[(k + 1) % n];
    const tot = k + 1 < n ? volgende.a : volgende.a + TWEE_PI;
    const lo = g.a + vanGrens(g, g.a);
    const hi = tot - vanGrens(volgende, volgende.a);
    /** @type {Knoop} */
    const p = {
      id: 'plek' + k, soort: 'plek', etage: 1, van: g.a, tot, midden: hi > lo ? (lo + hi) / 2 : (g.a + tot) / 2, lo, hi,
      grensVan: g.soort, grensTot: volgende.soort, ravijnVan: g.i, ravijnTot: volgende.i,
    };
    knopen.push(p);
    return p;
  });
  knopen.push({ id: 'top', soort: 'top', etage: 2 });
  // De plek met het kamp ervoor, en die met de hellingbaan van stap 12 (het eerste ponypad).
  const bevat = (p, a) => rond(a - p.van) < p.tot - p.van;
  const kampPlek = plekken.find((p) => bevat(p, 0));
  const hb = eiland.hellingbaan;
  const hbPlek = hb ? plekken.find((p) => bevat(p, (hb.a0 + hb.a1) / 2)) : null;

  plekken.forEach((p) => {
    // --- De rotsrand onder de plek: een ponypad en een klimwand (regels 3 en 4) ---
    const rand = { id: 'rand-' + p.id, soort: 'rotsrand', tussen: ['kamp', p.id] };
    scheidingen.push(rand);
    const lo = p.lo;
    const hi = p.hi;

    for (const soort of D.rotsrand) {
      if (soort === 'ponypad') {
        if (p === hbPlek) {
          // Het bestaande ponypad (de hellingbaan van stap 12) ligt al vast.
          const v = nieuw('ponypad', 'kamp', p.id, rand.id, { helling: 0, kandidaten: [hb.a0] });
          v.zin = Math.sign(hb.a1 - hb.a0);
          continue;
        }
        // Een nieuw ponypad: het loopt schuin langs de rotsrand, links- of rechtsom (het zaadje kiest).
        const zin = w.geheel(2) === 0 ? -1 : 1;
        const breed = naarHoek(D.ponypad.lengte, p.midden);
        const v = nieuw('ponypad', 'kamp', p.id, rand.id, { zin });
        if (hi - lo >= breed) for (const f of P.ponypad) v.kandidaten.push(lo + breed / 2 + (hi - lo - breed) * f - (zin * breed) / 2); // het beginpunt onderaan
      } else if (soort === 'klimwand') {
        // Alle plekjes langs de rotsrand; wat al bezet is (het ponypad), slaat de plaatsing over.
        const v = nieuw('klimwand', 'kamp', p.id, rand.id);
        for (const f of kandidaatReeks(P.stappen * 2)) v.kandidaten.push(lo + (hi - lo) * f);
        // Achter het kamp: zo dicht mogelijk bij het kamp, dan zie je de wand meteen liggen.
        if (p === kampPlek) v.kandidaten.sort((a, b) => Math.abs(Math.sin(a / 2)) - Math.abs(Math.sin(b / 2)));
      }
    }

    // --- Van de plek naar de top: gewoon de kegel op lopen ---
    nieuw('helling', p.id, 'top', null, { kandidaten: [p.midden] });
  });

  // --- De ravijnen (en de rivier) tussen twee plekken: twee verschillende oversteken ---
  plekken.forEach((p, k) => {
    const q = plekken[(k + 1) % n];
    const opRivier = p.grensTot === 'rivier';
    const sch = opRivier
      ? { id: 'rivier', soort: 'rivier', tussen: [p.id, q.id] }
      : { id: 'ravijn' + p.ravijnTot, soort: 'ravijn', tussen: [p.id, q.id], ravijn: p.ravijnTot };
    scheidingen.push(sch);
    const R = opRivier ? D.rivier : D.ravijn;
    const keuze = [...R.keuze];
    for (let i = keuze.length - 1; i > 0; i--) {
      const j = w.geheel(i + 1);
      [keuze[i], keuze[j]] = [keuze[j], keuze[i]];
    }
    for (let i = 0; i < R.aantal; i++) {
      // `reserve`: past deze soort nergens, dan probeert de plaatsing een andere uit de keuze.
      if (opRivier) nieuw(keuze[i % keuze.length], p.id, q.id, sch.id, { overRivier: true, kandidaten: [...D.rivierOversteek.afstanden], reserve: keuze });
      else nieuw(keuze[i % keuze.length], p.id, q.id, sch.id, { ravijn: p.ravijnTot, kandidaten: [...D.oversteek.afstanden], reserve: keuze });
    }
  });

  // --- Met het vlot naar beneden (regel 5): elke steiger is een verbinding omlaag, tot in de lagune (het kamp) ---
  const steigers = [
    ...(br ? br.steigers.map((st) => ({ tak: 1, st })) : []),
    ...(rivieren.beneden ? rivieren.beneden.steigers.map((st) => ({ tak: 0, st })) : []),
  ];
  for (const { tak, st } of steigers) {
    let knoop = 'kamp';
    if (tak === 1 && st.naam === 'top') knoop = 'top';
    else if (tak === 1 && st.naam === 'etage') {
      // De steiger ligt aan de kant van het kamp: op de plek achter het kamp, naast de rivier.
      const naastRivier = kampPlek && (kampPlek.grensTot === 'rivier' || kampPlek.grensVan === 'rivier');
      knoop = (naastRivier ? kampPlek : plekken.find((q) => bevat(q, hoekVan(st.dek.x, st.dek.z))))?.id ?? 'kamp';
    }
    nieuw('rivier', knoop, 'kamp', null, { tak, steiger: st.naam, klasse: st.klasse, moeilijkheid: D.klassePootjes[st.klasse - 1] ?? 1 });
  }

  return { knopen, scheidingen, verbindingen, plekken, kampPlek: kampPlek?.id ?? null, n, band };
}

/** Kandidaten tussen 0 en 1: eerst het midden, dan steeds verder naar de randen. */
function kandidaatReeks(n) {
  const uit = [0.5];
  for (let i = 1; uit.length < n; i++) {
    const d = (0.5 * i) / Math.ceil(n / 2);
    if (d > 0.5) break;
    uit.push(0.5 + d, 0.5 - d);
  }
  return uit.slice(0, n);
}

// ---------------------------------------------------------------------------------------------------------------
// De controle (TP 5.1): een eenvoudige zoektocht door het netwerk, per soort speler.

/** Welke verbindingen een speler kan gebruiken. */
export const SPELERS = {
  // Regel 1 en 2: alleen moeilijkheid 1, hoogstens de pony.
  basis: (v) => v.moeilijkheid <= 1 && (v.vereiste === null || v.vereiste === 'pony'),
  // Te voet, zonder pony, alle moeilijkheden.
  voet: (v) => v.vereiste === null,
  // Met de pony, alle moeilijkheden.
  pony: (v) => v.vereiste === null || v.vereiste === 'pony',
  // Alles (ook met de tijgers en 's nachts).
  alles: () => true,
};

/**
 * Welke knopen bereik je vanaf `van` langs de verbindingen die `mag` toelaat.
 * @param {{ knopen: Knoop[], verbindingen: Verbinding[] }} plan
 * @param {(v: Verbinding) => boolean} mag
 */
export function bereikbaar(plan, mag, van = 'kamp') {
  const gezien = new Set([van]);
  const rij = [van];
  while (rij.length) {
    const k = rij.shift();
    for (const v of plan.verbindingen) {
      if (!v.geplaatst || !mag(v)) continue;
      const naar = v.van === k ? v.naar : v.terug && v.naar === k ? v.van : null;
      if (naar && !gezien.has(naar)) {
        gezien.add(naar);
        rij.push(naar);
      }
    }
  }
  return gezien;
}

/**
 * Controleert de regels uit TP 5.1. Geeft per regel of ze klopt, en een lijst fouten (leeg = alles in orde).
 * @param {ReturnType<typeof maakBergplan>} plan
 */
export function controleerBergplan(plan) {
  const fouten = [];
  const regels = [];
  const regel = (nr, naam, ok, uitleg = '') => {
    regels.push({ nr, naam, ok, uitleg });
    if (ok === false) fouten.push(`regel ${nr} (${naam})${uitleg ? ': ' + uitleg : ''}`);
  };
  const ids = plan.knopen.map((k) => k.id);

  // 0. Elke doorgang staat op het eiland.
  const niet = plan.verbindingen.filter((v) => !v.geplaatst);
  regel(0, 'alles geplaatst', niet.length === 0, niet.map((v) => `${v.soort} ${v.van}-${v.naar}`).join(', '));

  // 1. Een basisroute van het kamp naar de top (moeilijkheid 1, hoogstens de pony).
  const basis = bereikbaar(plan, SPELERS.basis);
  regel(1, 'basisroute naar de top', basis.has('top'));

  // 2. Elke plek is langs zulke doorgangen bereikbaar, en je komt ook weer thuis.
  const kwijt = ids.filter((id) => !basis.has(id));
  const thuis = ids.filter((id) => !bereikbaar(plan, SPELERS.basis, id).has('kamp'));
  regel(2, 'elke plek bereikbaar en terug', kwijt.length === 0 && thuis.length === 0,
    [kwijt.length ? 'niet bereikbaar: ' + kwijt.join(', ') : '', thuis.length ? 'niet terug: ' + thuis.join(', ') : ''].filter(Boolean).join('; '));

  // 3. Elke scheiding heeft minstens twee doorgangen van een verschillende soort.
  const arm = plan.scheidingen.filter((s) => new Set(plan.verbindingen.filter((v) => v.scheiding === s.id && v.geplaatst).map((v) => v.soort)).size < 2);
  regel(3, 'twee soorten per scheiding', arm.length === 0, arm.map((s) => s.id).join(', '));

  // 4. Elke rotsrand heeft minstens één klimwand.
  const zonder = plan.scheidingen.filter((s) => s.soort === 'rotsrand' && !plan.verbindingen.some((v) => v.scheiding === s.id && v.soort === 'klimwand' && v.geplaatst));
  regel(4, 'klimwand op elke rotsrand', zonder.length === 0, zonder.map((s) => s.id).join(', '));

  // 5. Vanaf elke etage brengt de rivier je naar het kamp: op elke etage een steiger die je vanaf elke plek van
  // die etage bereikt (zonder eerst naar beneden te gaan), met een vaart tot in de lagune.
  const vaarten = plan.verbindingen.filter((v) => v.soort === 'rivier' && v.geplaatst && v.naar === 'kamp');
  const etageVan = (id) => plan.knopen.find((k) => k.id === id)?.etage ?? 0;
  const boven = (v) => SPELERS.voet(v) && v.van !== 'kamp' && v.naar !== 'kamp';
  const etages = [...new Set(plan.knopen.filter((k) => k.etage > 0).map((k) => k.etage))];
  const droog = etages.filter((e) => {
    const hier = plan.knopen.filter((k) => k.etage === e);
    return !vaarten.some((v) => etageVan(v.van) === e && hier.every((k) => bereikbaar(plan, boven, k.id).has(v.van)));
  });
  regel(5, 'de rivier naar het kamp', droog.length === 0, droog.map((e) => 'etage ' + e).join(', '));

  // 6. Doorgangen met een vereiste (gouden tijger, nacht) zijn altijd extra's, nooit de enige weg.
  const zonderExtra = bereikbaar(plan, SPELERS.pony);
  const metExtra = bereikbaar(plan, SPELERS.alles);
  regel(6, 'extra\'s nooit de enige weg', metExtra.size === zonderExtra.size);

  // Klaar als (BOUWPLAN 13): de top langs minstens twee verschillende wegen, met de pony en al klimmend.
  const zonderSoort = (soort) => (v) => SPELERS.pony(v) && !(v.richting === 'omhoog' && v.soort !== soort);
  const metPony = bereikbaar(plan, zonderSoort('ponypad')).has('top');
  const klimmend = bereikbaar(plan, (v) => SPELERS.voet(v) && !(v.richting === 'omhoog' && v.soort !== 'klimwand')).has('top');
  regel('A', 'top met de pony', metPony);
  regel('B', 'top al klimmend', klimmend);

  return { ok: fouten.length === 0, fouten, regels };
}
