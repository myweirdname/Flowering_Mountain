// De proeven van stap 15a (steil en ondersteboven), zonder scherm: voor test.html en om in de console of in node te
// draaien. Elke proef gebruikt de echte spelregels (sim/modi/klimmen.js) via de simulatie.
// Gebruik: (await import('./src/sim/klimmen/dakproef.js')).steilProef(spel.sim)
import { klimProef } from './proefbot.js';

const leeg = { beweeg: [0, 0], spring: false, actie: false };

/** Laat de simulatie n stappen lopen met invoer `int`; geeft de gebeurtenissen van de speler terug. */
function loop(sim, id, n, int = {}) {
  const ev = [];
  for (let i = 0; i < n; i++) {
    sim.stap({ [id]: { ...leeg, ...int } }, 1 / 60);
    for (const e of sim.neemGebeurtenissen()) if (e.speler === id) ev.push(e.soort);
  }
  return ev;
}

/** Wacht tot de klimster klaar is met haar zetten (hoogstens 10 s). */
function wacht(sim, id) {
  const ev = [];
  for (let i = 0; i < 600; i++) {
    const k = sim.speler(id).klim;
    if (!k || (!k.zet && !k.rij.length && !k.dyno && !k.vleermuis)) break;
    ev.push(...loop(sim, id, 1));
  }
  return ev;
}

/**
 * Een kind dat tikt (of sleept): telkens op de hoogste greep die oplicht. Zo speelt de jongste.
 * Geeft { uitkomst, tijd, tikken, vallen, dyno } terug.
 */
export function kindProef(sim, wi, besturing = 'tikken', id = 'speler1', maxTijd = 240) {
  sim.klim(id, 0, besturing, wi);
  const G = sim.wereld.wanden[wi].grepen;
  const tel = {};
  let tikken = 0;
  let uitkomst = 'tijd op';
  let i = 0;
  for (; i < 60 * maxTijd; i++) {
    const k = sim.speler(id).klim;
    if (!k) {
      uitkomst = 'van de wand';
      break;
    }
    if (k.toestand === 'boven') {
      uitkomst = 'top';
      break;
    }
    if (k.toestand === 'klimt' && !k.zet && !k.rij.length && !k.dyno && !k.vleermuis && i % 30 === 0) {
      const hoog = Math.max(k.op.lh?.v ?? 0, k.op.rh?.v ?? 0);
      const b = sim.bereikbaar(id).filter((g) => G[g].soort !== 'knieklem' && G[g].v > hoog - 0.01);
      const beste = b.sort((a, c) => G[c].v - G[a].v)[0];
      if (beste != null) {
        sim.klimGreep(id, beste);
        tikken++;
      }
    }
    for (const e of loop(sim, id, 1)) tel[e] = (tel[e] ?? 0) + 1;
  }
  return { uitkomst, tijd: +(i / 60).toFixed(1), tikken, vallen: tel.val ?? 0, dyno: tel.dynoSprong ?? 0 };
}

/**
 * Alle proeven van stap 15a op één eiland. Geeft een lijst { naam, goed, tekst } terug.
 * @param {any} sim de simulatie (sim/spel.js), met of zonder speler
 */
export function steilProef(sim, id = 'speler1') {
  if (!sim.speler(id)) sim.voegSpelerToe(id);
  const W = sim.wereld.wanden;
  const wi = W.length - 1;
  const D = W[wi];
  const uit = [];
  const zet = (naam, goed, tekst) => uit.push({ naam, goed: !!goed, tekst });

  // 1. De drie routes van de oefenrots: nog altijd uitklimbaar met de strengere greeprichting.
  const oud = [0, 1, 2].map((ri) => klimProef(sim, ri, { wand: 0, speler: id }));
  zet('oefenrots (3, 5, 6a)', oud.every((r) => r.uitkomst === 'top'), oud.map((r) => `${r.route}: ${r.uitkomst} ${r.tijd} s, ${Math.round(r.maxPomp * 100)}%`).join(' · '));
  sim.terug(id);

  // 2. De dakroute met de proefbot: boven, met rust in de knieklem of op de richel, en met een hakhaak.
  const dak = klimProef(sim, 0, { wand: wi, speler: id, maxTijd: 300 });
  zet('dakroute (proefbot)', dak.uitkomst === 'top' && dak.vallen === 0 && dak.hakhaak > 0,
    `${dak.route}: ${dak.uitkomst} ${dak.tijd} s, armen ${Math.round(dak.maxPomp * 100)}%, vleermuis ${dak.vleermuis}, staan ${dak.staan}, hakhaak ${dak.hakhaak}`);
  const zonder = klimProef(sim, 0, { wand: wi, speler: id, maxTijd: 300, rusten: false });
  zet('dakroute zonder rusten', zonder.uitkomst === 'top', `${zonder.uitkomst} ${zonder.tijd} s, armen ${Math.round(zonder.maxPomp * 100)}%`);
  sim.terug(id);

  // 3. Een kind dat telkens op de hoogste greep tikt (of een hand sleept): boven, zonder te vallen.
  for (const b of ['tikken', 'handen']) {
    const r = kindProef(sim, wi, b, id);
    zet(`kind (${b})`, r.uitkomst === 'top' && r.vallen === 0, `${r.uitkomst} ${r.tijd} s, ${r.tikken} keer, dyno ${r.dyno}, vallen ${r.vallen}`);
    sim.terug(id);
  }

  // 4. Vleermuisrust: in het dak, met volle armen, de actieknop ingedrukt houden.
  sim.klim(id, 0, 'tikken', wi);
  loop(sim, id, 30);
  for (const g of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]) {
    sim.klimGreep(id, g);
    loop(sim, id, 1);
    wacht(sim, id);
  }
  let k = sim.speler(id).klim;
  const inDak = D.steilte(k.P[1] + 0.2) > 0.8;
  k.hand.lh.pomp = 0.7;
  k.hand.rh.pomp = 0.7;
  let ev = loop(sim, id, 60 * 3, { actie: true });
  const hangt = k.vleermuis?.fase === 'hangt';
  const na = Math.max(k.hand.lh.pomp, k.hand.rh.pomp);
  ev.push(...loop(sim, id, 60));
  zet('vleermuisrust', inDak && hangt && na < 0.4 && ev.includes('vleermuisUit') && !k.vleermuis,
    `in het dak ${inDak ? 'ja' : 'nee'}, ondersteboven ${hangt ? 'ja' : 'nee'}, armen 70% → ${Math.round(na * 100)}% in 3 s`);

  // 5. Magnesium: één beurt, zes zetten betere grip voor die hand.
  ev = loop(sim, id, 2, { magnesium: true });
  ev.push(...loop(sim, id, 80));
  const lid = k.krijt.lh > 0 ? 'lh' : 'rh';
  zet('magnesium', ev.includes('krijtKlaar') && k.krijt[lid] === 6 && k.krijtBeurten === 3, `hand ${lid}: ${k.krijt[lid]} zetten, nog ${k.krijtBeurten} beurten`);

  // 6. Vallen onder het dak: vrij in het touw, een eind van de wand, niet tegen de grond.
  k.besturing = 'handen';
  k.hand.lh.pomp = 1;
  k.hand.rh.pomp = 1;
  ev = loop(sim, id, 90, { besturing: 'handen' });
  const s = sim.speler(id);
  const vrij = !!k.vrij;
  const boven = s.pos[1] - D.voetHoogte;
  const uitWand = D.blokOp(s.pos[0], s.pos[2]) === -Infinity;
  ev.push(...loop(sim, id, 200, { besturing: 'handen' }));
  zet('vallen onder het dak', ev.includes('val') && vrij && boven > 1.5 && uitWand && k.toestand === 'klimt',
    `vrij in het touw ${vrij ? 'ja' : 'nee'}, ${boven.toFixed(1)} m boven de grond, daarna weer aan de wand: ${k.toestand}`);

  // 7. Laten zakken vanuit het dak: je landt onder de dakrand, niet in de rots.
  ev = loop(sim, id, 2, { zakken: true, besturing: 'handen' });
  ev.push(...loop(sim, id, 60 * 12, { besturing: 'handen' }));
  const pos = sim.speler(id).pos;
  zet('zakken vanuit het dak', ev.includes('beneden') && !sim.speler(id).klim && D.blokOp(pos[0], pos[2]) === -Infinity,
    `beneden ${ev.includes('beneden') ? 'ja' : 'nee'}, ${D.naarKaart(pos[0], pos[1], pos[2])[2].toFixed(1)} m voor de wandvoet`);

  // 8. De dyno: op de kopwand de springknop inhouden (naar boven gericht) en loslaten: de handen vangen de topbak.
  sim.klim(id, 0, 'handen', wi);
  loop(sim, id, 30);
  for (const g of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20]) {
    sim.klimGreep(id, g);
    loop(sim, id, 1);
    wacht(sim, id);
  }
  k = sim.speler(id).klim;
  const hoog = Math.max(k.op.lh?.v ?? 0, k.op.rh?.v ?? 0);
  ev = loop(sim, id, 45, { spring: true, leun: [0, 1], besturing: 'handen' });
  ev.push(...loop(sim, id, 40, { besturing: 'handen' }));
  k = sim.speler(id).klim;
  zet('dyno naar de top', ev.includes('dynoSprong') && ev.includes('dynoVang') && k?.toestand === 'boven',
    `vanaf ${hoog.toFixed(2)} m: ${ev.filter((e) => e.startsWith('dyno') || e === 'top' || e === 'val').join(', ')}`);
  sim.terug(id);
  return uit;
}
