// Een eenvoudige proefbot voor de klimproef (stap 9): klimt een route met de regels van het spel, zonder scherm.
// Hij kiest telkens de zet die hem het meest hoger brengt (de laagste hand eerst), nooit een zet waarbij
// de andere hand zou wegglijden, en rust en schudt uit op een goede greep als zijn armen vollopen.
// Dit is nog niet de klimbot uit KL 10 (die komt in stap 15b), maar wel het begin ervan.
// Stap 15a: hij rust ook staand op een richel en ondersteboven in een knieklem (vleermuisrust), en telt de hakhaken,
// de keren dat zijn voeten loskwamen en hoe ver hij openzwaaide.
// Gebruik in de console: (await import('./src/sim/klimmen/proefbot.js')).klimProef(spel.sim, 2)

const leeg = { beweeg: [0, 0], spring: false, actie: false };

/**
 * @param {any} sim de simulatie (sim/spel.js)
 * @param {number} ri route
 * @param {{ speler?: string, maxRisico?: number, maxTijd?: number, rusten?: boolean, wand?: number }} [opties]
 *   wand: welke wand (0 = de oefenrots, daarna de klimwanden van de berg, stap 13). Op een klimwand van de berg
 *   klimt hij door tot hij bovenaan is uitgestapt (uitkomst 'uitgestapt').
 */
export function klimProef(sim, ri, opties = {}) {
  const id = opties.speler ?? 'speler1';
  const maxRisico = opties.maxRisico ?? 2.0;
  const rusten = opties.rusten ?? true;
  const wi = opties.wand ?? 0;
  const R = sim.wereld.wanden[wi];
  const G = R.grepen;
  const r = R.routes[ri];
  const handGrepen = r.ids.filter((g) => !['voet', 'korrel', 'knieklem'].includes(G[g].soort));
  sim.klim(id, ri, 'handen', wi);
  const tel = {};
  const zetten = [];
  let maxPomp = 0;
  let schudden = 0;
  let staan = 0;
  let maxOpen = 0;
  let maxLast = 0;
  const stappen = Math.round((opties.maxTijd ?? 240) * 60);
  let uitkomst = 'tijd op';
  let i = 0;
  for (; i < stappen; i++) {
    const s = sim.speler(id);
    const k = s.klim;
    if (!k) {
      uitkomst = tel.uitgestapt ? 'uitgestapt' : 'van de wand';
      break;
    }
    maxPomp = Math.max(maxPomp, k.hand.lh.pomp, k.hand.rh.pomp);
    if ((k.toestand === 'boven' || k.toestand === 'uitstap') && !R.uitstap) {
      uitkomst = 'top';
      break;
    }
    let actie = false;
    maxOpen = Math.max(maxOpen, k.zwaaiOpen ?? 0);
    maxLast = Math.max(maxLast, k.armBelasting ?? 0);
    const pompNu = Math.max(k.hand.lh.pomp, k.hand.rh.pomp);
    if (k.vleermuis) {
      // Ondersteboven in de knieklem: blijven hangen tot beide armen fris zijn.
      actie = k.vleermuis.fase !== 'uit' && pompNu > 0.04;
    } else if (rusten && k.toestand === 'klimt' && k.staat && !k.zet && !k.rij.length && pompNu > 0.06) {
      // Staand op een richel: gewoon wachten, de armen herstellen vanzelf.
      if (!k.bot) staan++;
      k.bot = 1;
    } else if (rusten && k.toestand === 'klimt' && !k.zet && !k.rij.length && !k.schudt && pompNu > 0.35 && sim.knieklem?.(id) >= 0) {
      actie = true;
    } else if (k.toestand === 'klimt' && !k.zet && !k.rij.length && k.los.lh <= 0 && k.los.rh <= 0) {
      k.bot = 0;
      // Uitschudden zolang een arm te vol zit en we op een goede greep hangen.
      const pomp = Math.max(k.hand.lh.pomp, k.hand.rh.pomp);
      // Uitschudden tot die hand weer fris is; daarna (als het nodig is) de andere hand.
      if (rusten && (k.schudt ? k.hand[k.schudt].pomp > 0.08 : pomp > 0.45 && k.armBelasting < 0.35)) {
        actie = true;
        if (!k.schudt) schudden++;
      } else if (!k.schudt) {
        const hv = (l) => k.op[l]?.v ?? 0;
        const nu = Math.min(hv('lh'), hv('rh')) + 0.3 * Math.max(hv('lh'), hv('rh'));
        let beste = null;
        for (const g of handGrepen) {
          for (const lid of ['lh', 'rh']) {
            const p = sim.klimPlan(id, g, lid);
            if (!p || p.risico > maxRisico) continue;
            const gr = G[g];
            const ander = hv(lid === 'lh' ? 'rh' : 'lh');
            const kruist = lid === 'lh' ? gr.u > (k.op.rh?.u ?? 99) + 0.02 : gr.u < (k.op.lh?.u ?? -99) - 0.02;
            // Liefst de hand aan de kant van de greep (links van het lijf: linkerhand), zoals een klimmer doet.
            const kant = (lid === 'lh' ? -1 : 1) * (gr.u - k.P[0]) > -0.05 ? 0 : 0.3;
            const sc = Math.min(gr.v, ander) + 0.3 * Math.max(gr.v, ander) - p.risico * 0.05 - (kruist ? 0.4 : 0) - kant + (gr.top ? 5 : 0);
            if (!beste || sc > beste.sc) beste = { g, lid, sc, risico: p.risico };
          }
        }
        if (!beste || beste.sc <= nu + 0.01) {
          uitkomst = 'vast';
          break;
        }
        zetten.push(`${G[beste.g].u}/${G[beste.g].v} ${beste.lid} r${beste.risico.toFixed(1)}`);
        sim.klimGreep(id, beste.g, beste.lid);
      }
    }
    sim.stap({ [id]: { ...leeg, actie } }, 1 / 60);
    for (const e of sim.neemGebeurtenissen()) {
      if (e.speler !== id) continue;
      tel[e.soort] = (tel[e.soort] ?? 0) + 1;
      if (e.soort === 'klimVoet' && e.hak) tel.hakhaak = (tel.hakhaak ?? 0) + 1;
    }
  }
  const k = sim.speler(id).klim;
  return {
    route: r.graad,
    uitkomst,
    tijd: +(i / 60).toFixed(1),
    hoogte: k ? +k.P[1].toFixed(2) : null,
    zetten: zetten.length,
    schudden,
    maxPomp: +maxPomp.toFixed(2),
    vallen: tel.val ?? 0,
    glijden: tel.handGlijdt ?? 0,
    vleermuis: tel.vleermuis ?? 0,
    staan,
    hakhaak: tel.hakhaak ?? 0,
    voetenLos: tel.voetenLos ?? 0,
    maxOpen: +maxOpen.toFixed(2),
    maxLast: +maxLast.toFixed(2),
    laatste: zetten.slice(-4),
  };
}
