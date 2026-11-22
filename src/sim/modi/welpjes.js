// De welpjes bij mama tijger (BOUWPLAN 8b, GD 8). Staat mama stil, dan spelen ze rond haar: ze huppelen naar een
// plekje, snuffelen en kijken rond, zitten elkaar achterna tot de een de ander bespringt (die rolt dan om), of
// rollen zomaar eens om. Zijn ze te ver weg, dan rennen ze terug. Loopt mama, dan dribbelen ze achter haar aan.
// Ze lopen nooit door rotsen, bomen of water: rechtdoor als dat kan, anders over een weg uit de padvinder.
// Schatjesmomenten (stap 8c): af en toe niest er een (na het snuffelen aan een bloem), heeft er een de hik,
// struikelt er een tijdens het rennen (kopje-onder), gaan alle kopjes tegelijk schuin als jij springt of fluit,
// en na mama's brul proberen ze mee te brullen ... maar er komt alleen "mieuw!" uit.
// Spelen met elkaar (stap 8d): achter hun staart aan tot ze duizelig omvallen, verstoppertje (de zoeker telt met
// zijn kopje tegen mama, de anderen kruipen in een lage struik met hun oortjes erbovenuit), en trekken aan een
// takje tot het breekt of losschiet en ze allebei achterover vallen.
import { WERELD } from '../../data/wereld.js';
import { FLORA } from '../../data/flora.js';

const hoekVerschil = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const klem = (x, a, b) => Math.max(a, Math.min(b, x));

/** Een eigen willekeurig getal 0..1 voor dit welpje (mulberry32 op zijn zaadje: overal hetzelfde). */
function kans(w) {
  w.zaad = (w.zaad + 0x6d2b79f5) >>> 0;
  let t = w.zaad;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const tussen = (w, [a, b]) => a + kans(w) * (b - a);

function draai(w, doel, W, dt) {
  const d = hoekVerschil(doel, w.richting);
  const max = W.draaiSnelheid * dt;
  w.richting += klem(d, -max, max);
}
const draaiNaar = (w, x, z, W, dt) => draai(w, Math.atan2(x - w.pos[0], z - w.pos[2]), W, dt);

function rem(w, W, dt) {
  w.snelheid = Math.max(0, w.snelheid - W.versnelling * 2 * dt);
}

let pad;

/** Loopt naar (x, z): rechtdoor als dat kan, anders over een gezochte weg. Geeft de resterende afstand. */
function loopNaar(w, x, z, v, W, dt) {
  const rest = Math.hypot(x - w.pos[0], z - w.pos[2]);
  let px = x;
  let pz = z;
  if (rest > 0.6 && !pad.zicht(w.pos[0], w.pos[2], x, z)) {
    w.wegTijd += dt;
    if (!w.weg.length || w.wegTijd > W.pad.herzoek) {
      w.weg = pad.zoek(w.pos[0], w.pos[2], x, z) ?? [];
      w.wegTijd = 0;
    }
    while (w.weg.length > 1 && Math.hypot(w.weg[0][0] - w.pos[0], w.weg[0][1] - w.pos[2]) < 0.4) w.weg.shift();
    if (w.weg.length) [px, pz] = w.weg[0];
  } else {
    w.weg.length = 0;
    w.wegTijd = 99;
  }
  const dx = px - w.pos[0];
  const dz = pz - w.pos[2];
  const d = Math.hypot(dx, dz);
  if (d < 0.05) {
    rem(w, W, dt);
    return rest;
  }
  const hoek = Math.atan2(dx, dz);
  draai(w, hoek, W, dt);
  const fout = Math.abs(hoekVerschil(hoek, w.richting));
  let doelV = v * Math.max(0.2, Math.cos(Math.min(fout, 1.4)));
  if (rest < 1.2) doelV = Math.min(doelV, 0.35 + rest * 1.6);
  w.snelheid += klem(doelV - w.snelheid, -W.versnelling * 2 * dt, W.versnelling * dt);
  const stap = Math.min(d, w.snelheid * dt);
  const nx = w.pos[0] + (dx / d) * stap;
  const nz = w.pos[2] + (dz / d) * stap;
  if (pad.vrij(nx, nz, 0.3)) {
    w.pos[0] = nx;
    w.pos[2] = nz;
    w.vastTijd = v > 0.3 && stap < 0.1 * v * dt ? w.vastTijd + dt : Math.max(0, w.vastTijd - dt);
  } else {
    w.snelheid *= 0.5;
    w.vastTijd += dt;
    w.wegTijd = 99;
  }
  return rest;
}

/** Waar mama's kop is (om naar te kijken). */
function mamaKop(m, schaal) {
  return [m.pos[0] + Math.sin(m.richting) * 0.95 * schaal, m.pos[1] + 0.85 * schaal, m.pos[2] + Math.cos(m.richting) * 0.95 * schaal];
}

/** Even stilstaan en snuffelen; ondertussen kijkt hij naar mama, een ander welpje, jou, of zelf rond. */
function snuffel(w, welpjes, m, s, W, duur) {
  w.modus = 'snuffel';
  w.hoogte = 0;
  w.bloem = null;
  w.timer = duur ?? tussen(w, W.snuffelDuur);
  w.maat = null;
  const r = kans(w);
  if (r < 0.3) w.kijk = mamaKop(m, W.schaal);
  else if (r < 0.55) {
    const o = welpjes[Math.floor(kans(w) * welpjes.length)];
    w.kijk = o !== w ? [o.pos[0], o.pos[1] + 0.3, o.pos[2]] : null;
  } else if (r < 0.75 && s) w.kijk = [s.pos[0], s.pos[1] + 1.2, s.pos[2]];
  else w.kijk = null;
}

/** Laat zijn speelkameraadje los (die gaat dan even snuffelen). */
function laatLos(w, welpjes, m, s, W) {
  const o = w.maat && welpjes.find((q) => q.id === w.maat);
  if (o && o.maat === w.id && (o.modus === 'jaagt' || o.modus === 'vlucht')) snuffel(o, welpjes, m, s, W, 0.6);
  w.maat = null;
}

/** Een plekje rond mama om naartoe te huppelen, dat hij rechtdoor kan halen. */
function kiesPlekje(w, m, W) {
  for (let i = 0; i < 10; i++) {
    const a = kans(w) * Math.PI * 2;
    const r = tussen(w, W.speelStraal);
    const x = m.pos[0] + Math.sin(a) * r;
    const z = m.pos[2] + Math.cos(a) * r;
    if (Math.hypot(x - w.pos[0], z - w.pos[2]) < 1) continue;
    if (pad.vrij(x, z, 0.45) && pad.zicht(w.pos[0], w.pos[2], x, z)) return [x, z];
  }
  return null;
}

const vrijVoorSpel = (o) => o.modus === 'snuffel' || o.modus === 'dartel';

/** Huppelt naar een plekje rond mama (of snuffelt verder als er geen is). */
function dartel(w, welpjes, m, s, W) {
  const doel = kiesPlekje(w, m, W);
  if (doel) Object.assign(w, { modus: 'dartel', doel, kijk: null, timer: 6, bloem: null });
  else snuffel(w, welpjes, m, s, W);
}

/** Wat hij nu gaat doen (na het snuffelen). */
function kies(w, welpjes, m, s, wereld, W, meld, tak) {
  const K = W.keuze;
  const r = kans(w);
  let grens = 0;
  const onder = (p) => r < (grens += p ?? 0);
  if (onder(K.dartel)) return dartel(w, welpjes, m, s, W);
  if (onder(K.achterna)) {
    const maat = welpjes.find((o) => o !== w && vrijVoorSpel(o));
    if (!maat) return dartel(w, welpjes, m, s, W);
    // Achternazitten: eerst even loeren (stilstaan, kijken), dan ervandoor.
    const duur = tussen(w, W.achternaDuur);
    Object.assign(w, { modus: 'jaagt', maat: maat.id, timer: duur, duur, kijk: null });
    Object.assign(maat, { modus: 'vlucht', maat: w.id, timer: duur + 0.6, duur: duur + 0.6, kijk: null, rolKant: kans(maat) < 0.5 ? 1 : -1 });
    meld({ soort: 'welpSpeelt', welp: w.id, maat: maat.id, pos: [...w.pos] });
    return;
  }
  if (onder(K.rol)) {
    rol(w, W, kans(w) < 0.5 ? 1 : -1);
    meld({ soort: 'welpRolt', welp: w.id, pos: [...w.pos] });
    return;
  }
  if (onder(K.nies)) return naarBloem(w, m, wereld, W);
  if (onder(K.hik)) {
    begin(w, 'hik', tussen(w, W.hik.duur));
    w.hikVolgende = 0.35;
    w.hikSinds = 9;
    return;
  }
  // Achter zijn staart aan: maar één tegelijk (twee draaiende welpjes naast elkaar is te veel van hetzelfde).
  if (onder(K.staart)) return welpjes.some((o) => o.modus === 'staart') ? dartel(w, welpjes, m, s, W) : staartAchterna(w, W, meld);
  if (onder(K.verstop)) return void (startVerstop(w, welpjes, m, wereld, W, meld) || dartel(w, welpjes, m, s, W));
  if (onder(K.tak)) return void (startTak(w, welpjes, m, s, tak, W, meld) || dartel(w, welpjes, m, s, W));
  snuffel(w, welpjes, m, s, W);
}

// ---------- Spelen met elkaar (stap 8d) ----------

/** De spelletjes waarin ze verder van mama mogen zijn, en die stoppen als mama gaat lopen. */
const SPEL = ['tel', 'zoek', 'verstop', 'tak'];
/** Een speelkameraadje in hetzelfde spelletje. */
const inSpel = (o, w, modi) => o !== w && o.spel === w.spel && modi.includes(o.modus);

/** Achter zijn staart aan: rondjes, steeds sneller ... duizelig omvallen ... en wankel weer op. */
function staartAchterna(w, W, meld) {
  const S = W.staart;
  begin(w, 'staart', S.draai + S.val + S.liggen + S.op + S.wankel);
  w.rolKant = kans(w) < 0.5 ? 1 : -1;
  meld({ soort: 'welpStaart', welp: w.id, pos: [...w.pos] });
}

/** Ronde bosjes rond mama waar een welpje in kan kruipen (met de oortjes erbovenuit). */
function verstopStruiken(m, wereld, W) {
  const V = W.verstop;
  const B = FLORA.bosje;
  const T = WERELD.tegelGrootte;
  const tx = Math.floor(m.pos[0] / T);
  const tz = Math.floor(m.pos[2] / T);
  const lijst = [];
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      for (const b of wereld.begroeiing.kleine(tx + i, tz + j).bosje) {
        // Zo hoog als het bosje in beeld staat.
        const top = B.top * (B.grootte[0] + b.schaal * (B.grootte[1] - B.grootte[0]));
        const d = Math.hypot(b.x - m.pos[0], b.z - m.pos[2]);
        if (d < V.afstand[0] || d > V.afstand[1] || !pad.vrij(b.x, b.z, 0.3)) continue;
        lijst.push({ x: b.x, z: b.z, top, d });
      }
    }
  }
  return lijst;
}

/** Verstoppertje: w telt, de anderen (die vrij zijn) verstoppen zich. Geeft false als het niet kan. */
function startVerstop(w, welpjes, m, wereld, W, meld, toch = false) {
  const V = W.verstop;
  const vrij = welpjes.filter((o) => o !== w && (toch ? !DRUK.includes(o.modus) : vrijVoorSpel(o))).slice(0, 2);
  if (!vrij.length) return false;
  const struiken = verstopStruiken(m, wereld, W);
  if (!struiken.length) return false;
  const spel = `verstop:${w.id}:${w.zaad}`;
  let vorige = null;
  vrij.forEach((o, k) => {
    // Elk zijn eigen struik als dat kan; anders samen in dezelfde, naast elkaar.
    const st = struiken.length ? struiken.splice(Math.floor(kans(w) * struiken.length), 1)[0] : vorige;
    const samen = st === vorige;
    vorige = st;
    const ux = (st.x - m.pos[0]) / st.d;
    const uz = (st.z - m.pos[2]) / st.d;
    const opzij = samen ? 0.32 : vrij.length > 1 && struiken.length === 0 && k === 0 ? -0.32 : 0;
    const x = st.x + ux * V.dieper - uz * opzij;
    const z = st.z + uz * V.dieper + ux * opzij;
    laatLos(o, welpjes, m, null, W);
    begin(o, 'verstop', V.maxLopen);
    Object.assign(o, { spel, doel: pad.vrij(x, z, 0.25) ? [x, z] : [st.x, st.z], struik: [st.x, st.z, st.top], fase: 0 });
  });
  laatLos(w, welpjes, m, null, W);
  begin(w, 'tel', V.maxLopen);
  Object.assign(w, { spel, telN: 0, telVolgende: 0.6, gevonden: 0, faseTijd: 0 });
  meld({ soort: 'welpVerstoppertje', welp: w.id, pos: [...w.pos] });
  return true;
}

/** Hij springt op uit zijn struik: gevonden! */
function gevonden(o, z, W, meld) {
  const V = W.verstop;
  const dx = z.pos[0] - o.pos[0];
  const dz = z.pos[2] - o.pos[2];
  const d = Math.hypot(dx, dz) || 1;
  const x = o.pos[0] + (dx / d) * 0.55;
  const zz = o.pos[2] + (dz / d) * 0.55;
  const struik = o.struik;
  begin(o, 'gevonden', V.gevondenDuur);
  Object.assign(o, { springVan: [o.pos[0], o.pos[2]], springNaar: pad.vrij(x, zz, 0.3) ? [x, zz] : [o.pos[0], o.pos[2]], kijk: [z.pos[0], z.pos[1] + 0.3, z.pos[2]] });
  o.richting = Math.atan2(dx, dz);
  meld({ soort: 'welpGevonden', welp: o.id, zoeker: z.id, pos: [...o.pos], struik });
}

/** Trekken aan een tak: w en een vrij welpje. Valt er eerst een takje bij mama als er geen ligt. */
function startTak(w, welpjes, m, s, tak, W, meld, toch = false) {
  const T = W.tak;
  const maat = welpjes.find((o) => o !== w && (toch ? !DRUK.includes(o.modus) : vrijVoorSpel(o)));
  if (!maat || !tak) return false;
  const bijMama = tak.staat === 'ligt' && Math.hypot(tak.pos[0] - m.pos[0], tak.pos[2] - m.pos[2]) < T.ligtTot;
  if (!bijMama) {
    if (tak.staat !== 'weg' && tak.staat !== 'ligt') return false;
    // Een nieuw takje valt naast mama neer, dwars, zodat beide welpjes er een eind van kunnen pakken.
    let plek = null;
    for (let i = 0; i < 14 && !plek; i++) {
      const a = kans(w) * Math.PI * 2;
      const r = tussen(w, T.plek);
      const x = m.pos[0] + Math.sin(a) * r;
      const z = m.pos[2] + Math.cos(a) * r;
      const rr = a + Math.PI / 2;
      const ux = Math.sin(rr) * (T.lengte / 2 + T.mond);
      const uz = Math.cos(rr) * (T.lengte / 2 + T.mond);
      if (pad.vrij(x, z, 0.5) && pad.vrij(x - ux, z - uz, 0.35) && pad.vrij(x + ux, z + uz, 0.35)) plek = [x, z, rr];
    }
    if (!plek) return false;
    Object.assign(tak, { staat: 'valt', pos: [plek[0], 0, plek[1]], richting: plek[2], tijd: 0, vast: [], helften: [null, null], x: 0 });
  }
  const spel = `tak:${w.id}:${w.zaad}`;
  // Wie het dichtst bij een eind staat, neemt dat eind.
  const ux = Math.sin(tak.richting);
  const uz = Math.cos(tak.richting);
  const kant = (w.pos[0] - tak.pos[0]) * ux + (w.pos[2] - tak.pos[2]) * uz > 0 ? 1 : 0;
  for (const [o, k] of [[w, kant], [maat, 1 - kant]]) {
    laatLos(o, welpjes, m, s, W);
    begin(o, 'tak', T.maxLopen);
    Object.assign(o, { spel, takKant: k });
  }
  meld({ soort: 'welpTakSpel', welp: w.id, maat: maat.id, pos: [...w.pos] });
  return true;
}

/** Waar het welpje met eind `kant` van de tak moet staan, en welke kant hij dan op kijkt. */
function takPlek(tak, kant, T) {
  const ux = Math.sin(tak.richting);
  const uz = Math.cos(tak.richting);
  const t = (kant ? 1 : -1) * (T.lengte / 2 + T.mond) + tak.x;
  return [tak.pos[0] + ux * t, tak.pos[2] + uz * t, kant ? tak.richting + Math.PI : tak.richting];
}

/** Het takje zelf: neervallen, meegetrokken worden, breken of losschieten, en opgeruimd worden. */
function stapTak(tak, welpjes, m, s, wereld, W, dt, meld) {
  const T = W.tak;
  tak.tijd += dt;
  const id = welpjes[0]?.id;
  if (tak.staat === 'valt') {
    tak.pos[1] = wereld.terreinOp(tak.pos[0], tak.pos[2]);
    if (tak.tijd >= T.valTijd) {
      Object.assign(tak, { staat: 'ligt', tijd: 0 });
      meld({ soort: 'welpTakValt', welp: id, pos: [...tak.pos] });
    }
  } else if (tak.staat === 'vast') {
    const [a, b] = tak.vast.map((q) => welpjes.find((o) => o.id === q));
    if (!a || !b || a.modus !== 'tak' || b.modus !== 'tak' || a.fase !== 2 || b.fase !== 2) {
      // Iemand liet los (mama loopt weg, of hij wil iets anders): de tak valt in het gras.
      Object.assign(tak, { staat: 'ligt', tijd: 0, vast: [], x: 0 });
      return;
    }
    // Heen en weer: nu eens wint de een, dan de ander.
    const t = tak.tijd;
    tak.x = T.slinger * (0.6 * Math.sin(t * 2.3 + 0.5) + 0.4 * Math.sin(t * 5.3 + 1.7)) * Math.min(1, t * 2);
    for (const o of [a, b]) {
      const [x, z, r] = takPlek(tak, o.takKant, T);
      const v = Math.hypot(x - o.pos[0], z - o.pos[2]) / Math.max(dt, 1e-3);
      if (pad.vrij(x, z, 0.25)) {
        o.pos[0] = x;
        o.pos[2] = z;
      }
      o.richting = r;
      o.snelheid = Math.min(v, 1);
    }
    tak.gromVolgende -= dt;
    if (tak.gromVolgende <= 0) {
      tak.gromVolgende = tussen(a, T.gromTussen);
      tak.gromWie = 1 - tak.gromWie;
      const o = tak.gromWie ? b : a;
      meld({ soort: 'welpGrom', welp: o.id, pos: [...o.pos] });
    }
    if (t >= tak.trekDuur) {
      // Krak! Of hij schiet los. Hoe dan ook: allebei achterover.
      const breekt = kans(a) < T.breekKans;
      const houder = kans(b) < 0.5 ? a : b;
      Object.assign(tak, { staat: breekt ? 'stuk' : 'los', tijd: 0, vast: breekt ? [a.id, b.id] : [houder.id] });
      meld({ soort: breekt ? 'welpTakKrak' : 'welpTakLos', welp: a.id, pos: [...tak.pos] });
      for (const o of [a, b]) achterover(o, W);
    }
  } else if (tak.staat === 'stuk' || tak.staat === 'los') {
    // Wie nog een stuk vasthoudt maar niet meer achterover ligt, laat het vallen.
    for (const q of [...tak.vast]) {
      const o = welpjes.find((p) => p.id === q);
      if (!o) tak.vast = tak.vast.filter((p) => p !== q);
      else if (o.modus !== 'achterover') laatTakVallen(tak, o, W, wereld);
    }
    if (tak.staat === 'los' && !tak.vast.length) Object.assign(tak, { staat: 'ligt', tijd: 0 });
    if (tak.staat === 'stuk' && !tak.vast.length && tak.tijd > T.wegNa) Object.assign(tak, { staat: 'weg', tijd: 0, helften: [null, null] });
  }
  // Een vergeten takje verdwijnt als niemand meer in de buurt is.
  if (tak.staat === 'ligt' || (tak.staat === 'stuk' && !tak.vast.length)) {
    const ver = (p) => !p || Math.hypot(p.pos[0] - tak.pos[0], p.pos[2] - tak.pos[2]) > T.opruimen;
    if (ver(m) && ver(s)) Object.assign(tak, { staat: 'weg', tijd: 0, helften: [null, null] });
  }
}

/** Een welpje laat zijn stuk tak (of de hele tak) in het gras vallen, vlak voor zijn snuitje. */
function laatTakVallen(tak, o, W, wereld) {
  const T = W.tak;
  if (!tak.vast.includes(o.id)) return;
  tak.vast = tak.vast.filter((q) => q !== o.id);
  const fx = Math.sin(o.richting);
  const fz = Math.cos(o.richting);
  const x = o.pos[0] + fx * T.mond;
  const z = o.pos[2] + fz * T.mond;
  if (tak.staat === 'stuk') {
    tak.helften[o.takKant] = [x, wereld.terreinOp(x, z), z, o.richting];
    tak.tijd = 0;
  } else {
    // De hele tak: hij hield één eind vast, dus het midden ligt een halve tak verder.
    const cx = x + fx * T.lengte * 0.5;
    const cz = z + fz * T.lengte * 0.5;
    Object.assign(tak, { staat: 'ligt', tijd: 0, vast: [], x: 0, pos: [cx, wereld.terreinOp(cx, cz), cz], richting: o.richting });
  }
}

/** De tak breekt of schiet los: hij valt achterover, spartelt even op zijn rug, en krabbelt weer op. */
function achterover(o, W) {
  const T = W.tak;
  const x = o.pos[0] - Math.sin(o.richting) * T.terug;
  const z = o.pos[2] - Math.cos(o.richting) * T.terug;
  const naar = pad.vrij(x, z, 0.3) ? [x, z] : [o.pos[0], o.pos[2]];
  begin(o, 'achterover', T.valDuur);
  Object.assign(o, { spel: o.spel, springVan: [o.pos[0], o.pos[2]], springNaar: naar, snelheid: 0 });
}

/** Begint een schatjesmoment van `duur` seconden. */
function begin(w, modus, duur) {
  Object.assign(w, { modus, timer: duur, duur, fase: 0, kijk: null, maat: null, hoogte: 0, weg: [], wegTijd: 99 });
}

/** Waar zijn neus is (een eindje voor zijn pootjes). */
const neus = (w, W) => [w.pos[0] + Math.sin(w.richting) * 0.36 * W.schaal, w.pos[1] + 0.18 * W.schaal, w.pos[2] + Math.cos(w.richting) * 0.36 * W.schaal];

/** Zoekt een bloem in de buurt (die op elk kwaliteitsniveau te zien is) en huppelt erheen om eraan te snuffelen. */
function naarBloem(w, m, wereld, W) {
  const N = W.nies;
  const T = WERELD.tegelGrootte;
  const tx = Math.floor(w.pos[0] / T);
  const tz = Math.floor(w.pos[2] / T);
  let beste = null;
  let bd = N.bloemZoek;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      for (const b of wereld.begroeiing.kleine(tx + i, tz + j).bloem) {
        if (b.kans >= N.bloemKans) continue;
        const d = Math.hypot(b.x - w.pos[0], b.z - w.pos[2]);
        if (d >= bd || Math.hypot(b.x - m.pos[0], b.z - m.pos[2]) > W.terugAfstand - 1) continue;
        if (!pad.zicht(w.pos[0], w.pos[2], b.x, b.z)) continue;
        beste = b;
        bd = d;
      }
    }
  }
  if (beste) {
    // Net voor de bloem stoppen, zodat zijn neus erbij is.
    const ux = (w.pos[0] - beste.x) / (bd || 1);
    const uz = (w.pos[2] - beste.z) / (bd || 1);
    const doel = [beste.x + ux * 0.36 * W.schaal, beste.z + uz * 0.36 * W.schaal];
    const bloem = [beste.x, wereld.terreinOp(beste.x, beste.z) + 0.12, beste.z];
    if (bd > 0.6 && pad.vrij(doel[0], doel[1], 0.3)) {
      Object.assign(w, { modus: 'dartel', doel, kijk: null, timer: 4, bloem, hoogte: 0 });
      return;
    }
    return nies(w, W, bloem);
  }
  // Geen bloem in de buurt: dan maar aan het gras snuffelen.
  const [x, , z] = neus(w, W);
  nies(w, W, [x, wereld.terreinOp(x, z) + 0.05, z]);
}

/** Snuffelen ... "ha ... ha ... TSJIE!" en een sprongetje achteruit. */
function nies(w, W, bloem) {
  begin(w, 'nies', W.nies.duur);
  w.bloem = bloem;
  w.kijk = bloem;
}

/** Struikelen over zijn te grote voeten: kopje-onder, en weer overeind. */
function struikel(w, welpjes, m, s, W, meld) {
  laatLos(w, welpjes, m, s, W);
  const v = Math.max(w.snelheid, W.dartel);
  begin(w, 'struikel', W.struikel.duur);
  w.glijV = Math.min(v, (2 * W.struikel.glij) / W.struikel.rol[1]);
  w.snelheid = 0;
  meld({ soort: 'welpStruikel', welp: w.id, pos: [...w.pos] });
}

/** Mee proberen te brullen (na mama's brul). n: het hoeveelste welpje (ze beginnen kort na elkaar). */
function meeBrul(w, n, welpjes, m, s, W) {
  laatLos(w, welpjes, m, s, W);
  const B = W.meeBrul;
  const wacht = B.wacht[0] + n * B.wacht[1];
  begin(w, 'meebrul', wacht + B.duur);
  w.wacht = wacht;
  w.kijk = mamaKop(m, W.schaal);
  // Ze brullen dezelfde kant op als mama.
  w.brulRichting = m.brulDoel ? Math.atan2(m.brulDoel[0] - w.pos[0], m.brulDoel[1] - w.pos[2]) : m.richting;
}

/** Jij springt of fluit: alle welpjes in de buurt kijken je tegelijk aan, met hun kopje schuin ("huh?"). */
function huh(welpjes, m, s, W, meld, toch = false) {
  if (!s || (!toch && welpjes.some((w) => w.huhRust > 0))) return;
  const H = W.huh;
  const kant = kans(welpjes[0]) < 0.5 ? 1 : -1;
  let eerste = true;
  for (const w of welpjes) {
    if (Math.hypot(w.pos[0] - s.pos[0], w.pos[2] - s.pos[2]) > H.afstand) continue;
    if (['rol', 'sprong', 'aai', 'struikel', 'meebrul', 'nies', 'staart', 'achterover', 'gevonden'].includes(w.modus)) continue;
    // Midden in een spelletje (of verstopt in een struik): alleen even het kopje schuin, en dan spelen ze verder.
    if (w.modus !== 'mee' && w.modus !== 'terug' && !SPEL.includes(w.modus)) {
      laatLos(w, welpjes, m, s, W);
      begin(w, 'huh', H.duur);
    }
    Object.assign(w, { huhTijd: H.duur, huhKant: kant, huhRust: H.rust });
    meld({ soort: 'welpHuh', welp: w.id, pos: [...w.pos], eerste });
    eerste = false;
  }
}

const kopVan = (s) => [s.pos[0], s.pos[1] + 1.2, s.pos[2]];
const RENT = ['jaagt', 'vlucht', 'terug', 'mee', 'dartel'];
const DRUK = ['rol', 'sprong', 'aai', 'struikel', 'nies', 'meebrul', 'staart', 'achterover', 'gevonden'];

function rol(w, W, kant) {
  Object.assign(w, { modus: 'rol', timer: W.rolDuur, duur: W.rolDuur, rolKant: kant, kijk: null, maat: null });
}

/** Hij komt achter mama uit de struiken tevoorschijn. */
function verschijn(w, m, wereld, W, meld) {
  const achter = m.richting + Math.PI;
  for (const r of [2.6, 3.6, 1.8]) {
    for (const da of [0.5, -0.5, 1.1, -1.1, 0, 1.8, -1.8, Math.PI]) {
      const x = m.pos[0] + Math.sin(achter + da) * r;
      const z = m.pos[2] + Math.cos(achter + da) * r;
      if (!pad.vrij(x, z, 0.5)) continue;
      const y = wereld.terreinOp(x, z);
      w.pos = [x, y, z];
      w.vorigePos = [x, y, z];
      w.richting = w.vorigeRichting = m.richting;
      Object.assign(w, { snelheid: 0, weg: [], wegTijd: 99, vastTijd: 0, hoogte: 0, modus: 'snuffel', timer: 0.4, maat: null });
      meld({ soort: 'welpVerschijnt', welp: w.id, pos: [x, y, z] });
      return true;
    }
  }
  return false;
}

/** Afstand van (x, z) tot de lijn door mama's lijf (van haar heupen tot haar kop). */
function totMama(x, z, m, schaal) {
  const fx = Math.sin(m.richting);
  const fz = Math.cos(m.richting);
  const t = klem((x - m.pos[0]) * fx + (z - m.pos[2]) * fz, -0.75 * schaal, 0.9 * schaal);
  const px = m.pos[0] + fx * t;
  const pz = m.pos[2] + fz * t;
  return [Math.hypot(x - px, z - pz), px, pz];
}

/**
 * Eén stap voor de welpjes van één mama.
 * @param {import('../wezens/welp.js').Welp[]} welpjes
 * @param {import('../wezens/tijger.js').Gezel} m mama
 * @param {import('../wezens/speler.js').Speler | undefined} s de speler bij wie mama hoort
 */
export function stapWelpjes(welpjes, m, s, wereld, padvinder, W, dt, meld, vraag = {}) {
  pad = padvinder;
  const meldNaar = meld;
  meld = (g) => meldNaar({ speler: m.eigenaar, ...g }); // elke gebeurtenis hoort bij de speler van mama
  const mamaLoopt = m.snelheid > W.mamaLoopt;
  const tak = vraag.tak;
  if (tak) stapTak(tak, welpjes, m, s, wereld, W, dt, meld);

  // Schatjesmomenten voor het hele gezinnetje: "huh?" en meebrullen (ook op te roepen vanuit de console).
  const vraagt = (v) => welpjes.some((w) => w.vraag === v);
  if (vraag.huh || vraagt('huh')) huh(welpjes, m, s, W, meld, vraagt('huh'));
  const brult = m.modus === 'brult';
  const brulKlaar = vraagt('meebrul') || welpjes.some((w) => w.mamaBrulde && !brult);
  let n = 0;
  for (const w of welpjes) {
    w.mamaBrulde = brult;
    w.huhTijd = Math.max(0, w.huhTijd - dt);
    w.huhRust -= dt;
    if (w.vraag === 'huh' || w.vraag === 'meebrul') w.vraag = null;
    if (brulKlaar && !['sprong', 'aai', 'achterover', 'gevonden'].includes(w.modus) && Math.hypot(m.pos[0] - w.pos[0], m.pos[2] - w.pos[2]) < W.meeBrul.afstand) {
      meeBrul(w, n++, welpjes, m, s, W);
    }
    // Terwijl mama brult, kijken ze vol bewondering naar haar.
    if (brult && (w.modus === 'snuffel' || w.modus === 'dartel')) Object.assign(w, { modus: 'snuffel', timer: 0.8, kijk: mamaKop(m, W.schaal), bloem: null });
  }

  welpjes.forEach((w, i) => {
    w.mamaStil = mamaLoopt ? 0 : w.mamaStil + dt;
    const dm = Math.hypot(m.pos[0] - w.pos[0], m.pos[2] - w.pos[2]);
    if (dm > W.verschijnVanaf && verschijn(w, m, wereld, W, meld)) return;
    // Een moment dat de console vraagt (om te testen).
    if (w.vraag && w.modus !== 'sprong') {
      const v = w.vraag;
      w.vraag = null;
      laatLos(w, welpjes, m, s, W);
      if (v === 'nies') naarBloem(w, m, wereld, W);
      else if (v === 'hik') {
        begin(w, 'hik', tussen(w, W.hik.duur));
        w.hikVolgende = 0.35;
      } else if (v === 'struikel') {
        w.snelheid = Math.max(w.snelheid, W.ren);
        struikel(w, welpjes, m, s, W, meld);
      } else if (v === 'staart') staartAchterna(w, W, meld);
      else if (v === 'verstop') {
        if (!startVerstop(w, welpjes, m, wereld, W, meld, true)) console.warn('verstoppertje: geen lage struik in de buurt van mama');
      } else if (v === 'tak') {
        if (!startTak(w, welpjes, m, s, tak, W, meld, true)) console.warn('tak: geen plekje of geen takje vrij');
      }
    }
    // Struikelen over zijn grote voeten, af en toe, als hij hard rent.
    w.struikelRust -= dt;
    if (RENT.includes(w.modus) && w.struikelRust <= 0 && w.snelheid >= W.struikel.vanaf && kans(w) < W.struikel.kansPerSeconde * dt) {
      struikel(w, welpjes, m, s, W, meld);
    }
    const bezig = DRUK.includes(w.modus);
    if (!bezig) {
      if (mamaLoopt && w.modus !== 'mee') {
        laatLos(w, welpjes, m, s, W);
        Object.assign(w, { modus: 'mee', kijk: null, vastTijd: 0, hoogte: 0 });
      } else if (w.modus === 'mee' && w.mamaStil > 0.7 + i * 0.45) snuffel(w, welpjes, m, s, W, 0.3 + i * 0.3);
      else if (w.modus !== 'mee' && w.modus !== 'terug' && !SPEL.includes(w.modus) && dm > W.terugAfstand) {
        laatLos(w, welpjes, m, s, W);
        Object.assign(w, { modus: 'terug', kijk: null, vastTijd: 0, hoogte: 0 });
        meld({ soort: 'welpTerug', welp: w.id, pos: [...w.pos] });
      }
    }
    w.timer -= dt;

    switch (w.modus) {
      case 'snuffel':
        rem(w, W, dt);
        if (w.kijk) draaiNaar(w, w.kijk[0], w.kijk[2], { draaiSnelheid: W.draaiSnelheid * 0.25 }, dt);
        if (w.timer <= 0) kies(w, welpjes, m, s, wereld, W, meld, tak);
        break;

      case 'dartel': {
        const rest = loopNaar(w, w.doel[0], w.doel[1], W.dartel, W, dt);
        if (rest < 0.3 || w.timer <= 0 || w.vastTijd > 0.8) {
          if (w.bloem) nies(w, W, w.bloem);
          else snuffel(w, welpjes, m, s, W);
        }
        break;
      }

      case 'nies': {
        // Snuffelen aan de bloem ... "ha ... ha ... TSJIE!" ... en van de schrik een sprongetje achteruit.
        const N = W.nies;
        const t = w.duur - w.timer;
        rem(w, W, dt);
        if (t < N.snuffel && w.bloem) draaiNaar(w, w.bloem[0], w.bloem[2], { draaiSnelheid: 3 }, dt);
        if (w.fase === 0 && t >= N.snuffel) {
          w.fase = 1;
          meld({ soort: 'welpNies', welp: w.id, pos: [...w.pos], neus: neus(w, W) });
        }
        if (w.fase === 1 && t >= N.hatsjie) {
          w.fase = 2;
          w.kijk = null;
          const x = w.pos[0] - Math.sin(w.richting) * N.terug;
          const z = w.pos[2] - Math.cos(w.richting) * N.terug;
          w.springVan = [w.pos[0], w.pos[2]];
          w.springNaar = pad.vrij(x, z, 0.3) ? [x, z] : [w.pos[0], w.pos[2]];
        }
        if (w.fase === 2) {
          const f = klem((t - N.hatsjie) / N.springDuur, 0, 1);
          w.pos[0] = w.springVan[0] + (w.springNaar[0] - w.springVan[0]) * f;
          w.pos[2] = w.springVan[1] + (w.springNaar[1] - w.springVan[1]) * f;
          w.hoogte = 4 * N.springHoogte * f * (1 - f);
          if (f >= 1) w.fase = 3;
        }
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.8);
        break;
      }

      case 'hik': {
        // Bij elke "hik" een hupje omhoog.
        const H = W.hik;
        rem(w, W, dt);
        w.hikSinds += dt;
        w.hikVolgende -= dt;
        if (w.hikVolgende <= 0 && w.timer > 0.4) {
          w.hikSinds = 0;
          w.hikVolgende = tussen(w, H.tussen);
          meld({ soort: 'welpHik', welp: w.id, pos: [...w.pos] });
        }
        const f = w.hikSinds / H.hupDuur;
        w.hoogte = f < 1 ? 4 * H.hoogte * f * (1 - f) : 0;
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.6);
        break;
      }

      case 'struikel': {
        // Kopje-onder: hij schuift nog wat door, en zit dan even beduusd.
        const S = W.struikel;
        const t = w.duur - w.timer;
        w.snelheid = 0;
        if (t < S.rol[1]) {
          const v = w.glijV * (1 - t / S.rol[1]);
          const x = w.pos[0] + Math.sin(w.richting) * v * dt;
          const z = w.pos[2] + Math.cos(w.richting) * v * dt;
          if (pad.vrij(x, z, 0.3)) {
            w.pos[0] = x;
            w.pos[2] = z;
          } else w.glijV = 0;
          const f = klem((t - S.rol[0]) / (S.rol[1] - S.rol[0]), 0, 1);
          w.hoogte = Math.sin(Math.PI * f) * 0.1;
        } else w.hoogte = 0;
        if (w.fase === 0 && t >= S.rol[1]) {
          w.fase = 1;
          meld({ soort: 'welpTuimel', welp: w.id, pos: [...w.pos] });
        }
        if (w.timer <= 0) {
          w.struikelRust = S.rust;
          snuffel(w, welpjes, m, s, W, 0.5);
        }
        break;
      }

      case 'huh':
        rem(w, W, dt);
        if (s) {
          w.kijk = kopVan(s);
          draaiNaar(w, s.pos[0], s.pos[2], { draaiSnelheid: W.draaiSnelheid * 0.4 }, dt);
        }
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.4);
        break;

      case 'meebrul': {
        // Eerst kijken ze naar mama, dan zetten ze zich schrap, doen hun bekje wijd open ... "mieuw!"
        const B = W.meeBrul;
        const t = w.duur - w.timer - w.wacht;
        rem(w, W, dt);
        if (t < 0) w.kijk = mamaKop(m, W.schaal);
        else {
          w.kijk = null;
          draai(w, w.brulRichting, { draaiSnelheid: W.draaiSnelheid * 0.5 }, dt);
        }
        if (w.fase === 0 && t >= B.mieuw) {
          w.fase = 1;
          meld({ soort: 'welpMeeBrul', welp: w.id, pos: [...w.pos] });
        }
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 1);
        break;
      }

      // ---------- Spelen met elkaar (stap 8d) ----------

      case 'staart': {
        // Rondjes achter zijn staart aan, steeds sneller ... duizelig om ... en wankel weer verder.
        const S = W.staart;
        const t = w.duur - w.timer;
        const wankelVan = S.draai + S.val + S.liggen + S.op;
        if (t < S.draai) {
          const f = t / S.draai;
          const om = S.omega[0] + (S.omega[1] - S.omega[0]) * f * f;
          w.richting += om * w.rolKant * dt;
          const v = om * S.straal;
          const x = w.pos[0] + Math.sin(w.richting) * v * dt;
          const z = w.pos[2] + Math.cos(w.richting) * v * dt;
          if (pad.vrij(x, z, 0.3)) {
            w.pos[0] = x;
            w.pos[2] = z;
          }
          w.snelheid = Math.max(1.2, v);
          // Hij kijkt naar zijn staartpuntje: achter hem, aan de binnenkant van het rondje.
          const a = w.richting + w.rolKant * 1.9;
          w.kijk = [w.pos[0] + Math.sin(a) * 0.6, w.pos[1] + 0.1, w.pos[2] + Math.cos(a) * 0.6];
        } else if (t < wankelVan) {
          if (w.fase === 0) {
            w.fase = 1;
            w.kijk = null;
            meld({ soort: 'welpDuizelig', welp: w.id, pos: [...w.pos] });
          }
          w.snelheid = 0;
        } else {
          if (w.fase === 1) {
            w.fase = 2;
            meld({ soort: 'welpWankel', welp: w.id, pos: [...w.pos] });
          }
          // Wankel: zwalpend, een beetje links en rechts, met horten en stoten.
          const tw = t - wankelVan;
          w.richting += Math.sin(tw * 3.1) * 1.6 * dt;
          const v = S.wankelV * (0.5 + 0.5 * Math.sin(tw * 8.8)) * Math.min(1, (S.wankel - tw) * 1.5);
          const x = w.pos[0] + Math.sin(w.richting) * v * dt;
          const z = w.pos[2] + Math.cos(w.richting) * v * dt;
          if (pad.vrij(x, z, 0.3)) {
            w.pos[0] = x;
            w.pos[2] = z;
          } else w.richting += 2.5 * dt;
          w.snelheid = Math.max(0, v);
        }
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.7);
        break;
      }

      case 'tel': {
        // Verstoppertje: de zoeker telt met zijn oogjes dicht en zijn kopje tegen mama.
        const V = W.verstop;
        const verstoppers = welpjes.filter((o) => inSpel(o, w, ['verstop']));
        if (!verstoppers.length) {
          snuffel(w, welpjes, m, s, W, 0.6);
          break;
        }
        const [d, px, pz] = totMama(w.pos[0], w.pos[2], m, W.schaal);
        if (w.fase === 0) {
          const ux = (w.pos[0] - px) / (d || 1);
          const uz = (w.pos[2] - pz) / (d || 1);
          const rest = loopNaar(w, px + ux * V.telAfstand, pz + uz * V.telAfstand, W.dartel, W, dt);
          if (rest < 0.2 || w.timer <= 0 || w.vastTijd > 1) {
            w.fase = 1;
            w.timer = 99;
          }
        } else if (w.fase === 1) {
          rem(w, W, dt);
          draaiNaar(w, px, pz, { draaiSnelheid: 4 }, dt);
          w.kijk = [px, m.pos[1] + 0.5 * W.schaal, pz];
          w.telVolgende -= dt;
          if (w.telVolgende <= 0) {
            const klaar = verstoppers.every((o) => o.fase === 1);
            if ((w.telN >= V.tellen && klaar) || w.telN >= V.maxTellen) {
              w.fase = 2;
              w.faseTijd = 0;
              meld({ soort: 'welpKlaar', welp: w.id, pos: [...w.pos] });
            } else {
              w.telN++;
              w.telVolgende = V.telTussen;
              meld({ soort: 'welpTelt', welp: w.id, n: w.telN, pos: [...w.pos] });
            }
          }
        } else {
          // "Klaar! Ik kom!": kopje omhoog, even rondkijken, en dan zoeken.
          rem(w, W, dt);
          w.kijk = null;
          w.faseTijd += dt;
          if (w.faseTijd > 0.7) {
            begin(w, 'zoek', V.maxZoeken);
            Object.assign(w, { fase: 0, faseTijd: 0, omweg: null });
          }
        }
        break;
      }

      case 'zoek': {
        // Snuffelend rond, neus bij de grond ... en dan één voor één gevonden!
        const V = W.verstop;
        const verstoppers = welpjes.filter((o) => inSpel(o, w, ['verstop']));
        w.faseTijd += dt;
        if (w.fase === 4) {
          // Een blij sprongetje: gevonden!
          const f = klem(w.faseTijd / V.hupDuur, 0, 1);
          w.hoogte = 4 * V.hupHoogte * f * (1 - f);
          rem(w, W, dt);
          if (f >= 1) Object.assign(w, { hoogte: 0, fase: 0, faseTijd: 0, maat: null, omweg: null });
          break;
        }
        if (!verstoppers.length || w.timer <= 0) {
          snuffel(w, welpjes, m, s, W, 1);
          break;
        }
        let o = w.maat && verstoppers.find((q) => q.id === w.maat);
        if (!o) {
          // De dichtstbijzijnde eerst. Soms snuffelt hij eerst ergens anders ("hier? nee ...").
          o = verstoppers.reduce((a, b) => (Math.hypot(a.pos[0] - w.pos[0], a.pos[2] - w.pos[2]) < Math.hypot(b.pos[0] - w.pos[0], b.pos[2] - w.pos[2]) ? a : b));
          Object.assign(w, { maat: o.id, fase: 2, faseTijd: 0, omweg: null });
          if (kans(w) < V.omweg) {
            const dx = o.struik[0] - w.pos[0];
            const dz = o.struik[1] - w.pos[2];
            const l = Math.hypot(dx, dz) || 1;
            const k = kans(w) < 0.5 ? 1 : -1;
            const x = w.pos[0] + dx * 0.5 - (dz / l) * 1.7 * k;
            const z = w.pos[2] + dz * 0.5 + (dx / l) * 1.7 * k;
            if (pad.vrij(x, z, 0.4)) Object.assign(w, { omweg: [x, z], fase: 0 });
          }
        }
        if (w.fase === 0) {
          w.kijk = null;
          const rest = loopNaar(w, w.omweg[0], w.omweg[1], V.zoekV, W, dt);
          if (rest < 0.3 || w.vastTijd > 1 || w.faseTijd > 5) Object.assign(w, { fase: 1, faseTijd: 0 });
        } else if (w.fase === 1) {
          // Snuf snuf ... niet hier. Even rondkijken ... daar misschien?
          rem(w, W, dt);
          w.kijk = w.faseTijd > 0.7 ? [o.struik[0], o.pos[1] + 0.4, o.struik[1]] : null;
          if (w.faseTijd > 1.4) Object.assign(w, { fase: 2, faseTijd: 0, kijk: null });
        } else if (w.fase === 2) {
          const [bx, bz] = o.struik;
          const dx = w.pos[0] - bx;
          const dz = w.pos[2] - bz;
          const l = Math.hypot(dx, dz) || 1;
          const rest = loopNaar(w, bx + (dx / l) * V.zoekAfstand, bz + (dz / l) * V.zoekAfstand, V.zoekV, W, dt);
          if (rest < 0.2 || l < V.zoekAfstand + 0.1 || w.vastTijd > 1.5 || w.faseTijd > 10) Object.assign(w, { fase: 3, faseTijd: 0 });
        } else if (w.fase === 3) {
          // Snuf ... daar zit iemand!
          rem(w, W, dt);
          draaiNaar(w, o.pos[0], o.pos[2], { draaiSnelheid: 4 }, dt);
          w.kijk = [o.pos[0], o.pos[1] + 0.4, o.pos[2]];
          if (w.faseTijd > V.ruiken) {
            gevonden(o, w, W, meld);
            w.gevonden++;
            Object.assign(w, { fase: 4, faseTijd: 0 });
            meld({ soort: 'welpBlij', welp: w.id, pos: [...w.pos], laatste: verstoppers.length === 1 });
          }
        }
        break;
      }

      case 'verstop': {
        // In een struik kruipen ... en muisstil blijven zitten, met de oortjes erbovenuit.
        const z = welpjes.find((o) => inSpel(o, w, ['tel', 'zoek']));
        if (!z) {
          snuffel(w, welpjes, m, s, W, 0.5);
          break;
        }
        if (w.fase === 0) {
          const rest = loopNaar(w, w.doel[0], w.doel[1], W.ren, W, dt);
          if (rest < 0.2) {
            Object.assign(w, { fase: 1, timer: 999, snelheid: 0 });
            meld({ soort: 'welpVerstopt', welp: w.id, pos: [...w.pos] });
          } else if (w.timer <= 0 || w.vastTijd > 1.5) snuffel(w, welpjes, m, s, W, 0.5);
        } else {
          rem(w, W, dt);
          // Met grote oogjes de zoeker in de gaten houden.
          draaiNaar(w, z.pos[0], z.pos[2], { draaiSnelheid: 1.5 }, dt);
          w.kijk = [z.pos[0], z.pos[1] + 0.3, z.pos[2]];
        }
        break;
      }

      case 'gevonden': {
        // Hop! Uit de struik.
        const V = W.verstop;
        const t = w.duur - w.timer;
        const f = klem(t / V.hupDuur, 0, 1);
        w.pos[0] = w.springVan[0] + (w.springNaar[0] - w.springVan[0]) * f;
        w.pos[2] = w.springVan[1] + (w.springNaar[1] - w.springVan[1]) * f;
        w.hoogte = 4 * V.hupHoogte * 1.15 * f * (1 - f);
        rem(w, W, dt);
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.4);
        break;
      }

      case 'tak': {
        // Trekken aan een tak: elk een eind in het bekje.
        const T = W.tak;
        const maat = welpjes.find((o) => inSpel(o, w, ['tak']));
        if (!maat || !tak || !['valt', 'ligt', 'vast'].includes(tak.staat) || (w.fase === 2 && tak.staat !== 'vast')) {
          snuffel(w, welpjes, m, s, W, 0.6);
          break;
        }
        const [x, z, r] = takPlek(tak, w.takKant, T);
        if (w.fase === 0) {
          if (tak.staat === 'valt') {
            // Wat valt daar? Eerst kijken.
            rem(w, W, dt);
            w.kijk = [tak.pos[0], tak.pos[1] + 0.3, tak.pos[2]];
            draaiNaar(w, tak.pos[0], tak.pos[2], { draaiSnelheid: 3 }, dt);
          } else {
            w.kijk = [tak.pos[0], tak.pos[1] + 0.05, tak.pos[2]];
            const rest = loopNaar(w, x, z, W.dartel, W, dt);
            if (rest < 0.15) w.fase = 1;
            else if (w.timer <= 0 || w.vastTijd > 1.5) snuffel(w, welpjes, m, s, W, 0.6);
          }
        } else if (w.fase === 1) {
          // Op zijn plekje: naar de tak draaien, en wachten tot de ander er ook is.
          rem(w, W, dt);
          w.pos[0] += (x - w.pos[0]) * Math.min(1, dt * 6);
          w.pos[2] += (z - w.pos[2]) * Math.min(1, dt * 6);
          draai(w, r, { draaiSnelheid: 5 }, dt);
          w.kijk = [maat.pos[0], maat.pos[1] + 0.3, maat.pos[2]];
          const klaar = (o) => o.fase === 1 && Math.abs(hoekVerschil(takPlek(tak, o.takKant, T)[2], o.richting)) < 0.25;
          if (w.takKant === 0 && tak.staat === 'ligt' && klaar(w) && klaar(maat)) {
            Object.assign(tak, { staat: 'vast', tijd: 0, vast: [w.id, maat.id], x: 0, trekDuur: tussen(w, T.trekDuur), gromVolgende: 0.5 });
            for (const o of [w, maat]) {
              Object.assign(o, { fase: 2, timer: 99 });
              meld({ soort: 'welpTakGrijp', welp: o.id, pos: [...o.pos] });
            }
          } else if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.6);
        } else {
          // Trekken! (stapTak schuift ze samen heen en weer)
          w.kijk = [maat.pos[0], maat.pos[1] + 0.3, maat.pos[2]];
        }
        break;
      }

      case 'achterover': {
        // De tak breekt of schiet los: plof, achterover! Even spartelen, en weer overeind.
        const T = W.tak;
        const t = w.duur - w.timer;
        const f = klem(t / T.terugDuur, 0, 1);
        const e = 1 - (1 - f) * (1 - f);
        w.pos[0] = w.springVan[0] + (w.springNaar[0] - w.springVan[0]) * e;
        w.pos[2] = w.springVan[1] + (w.springNaar[1] - w.springVan[1]) * e;
        w.snelheid = 0;
        w.kijk = null;
        if (w.fase === 0 && t >= T.plof) {
          w.fase = 1;
          meld({ soort: 'welpPlof', welp: w.id, pos: [...w.pos] });
        }
        // Een gebroken stuk laat hij meteen vallen; de hele tak houdt hij trots vast tot hij weer staat.
        if (t >= T.loslaat && tak && tak.staat === 'stuk' && tak.vast.includes(w.id)) laatTakVallen(tak, w, W, wereld);
        if (w.timer <= 0) {
          const o = welpjes.find((q) => q !== w && q.spel === w.spel);
          if (tak && tak.vast.includes(w.id)) laatTakVallen(tak, w, W, wereld);
          snuffel(w, welpjes, m, s, W, 1.1);
          if (o) w.kijk = [o.pos[0], o.pos[1] + 0.3, o.pos[2]];
          meld({ soort: 'welpBlij', welp: w.id, pos: [...w.pos] });
        }
        break;
      }

      case 'jaagt': {
        const o = welpjes.find((q) => q.id === w.maat);
        if (!o || o.modus !== 'vlucht' || o.maat !== w.id || w.timer <= 0 || w.vastTijd > 1.2) {
          laatLos(w, welpjes, m, s, W);
          snuffel(w, welpjes, m, s, W);
          break;
        }
        w.kijk = [o.pos[0], o.pos[1] + 0.25, o.pos[2]];
        // Eerst even loeren: stilstaan en kijken, dan ervandoor.
        if (w.duur - w.timer < 0.55) {
          rem(w, W, dt);
          draaiNaar(w, o.pos[0], o.pos[2], W, dt);
          break;
        }
        const d = loopNaar(w, o.pos[0], o.pos[2], W.ren, W, dt);
        if (d < W.vangAfstand) {
          // Hop! Hij bespringt het andere welpje, dat omrolt (en piept).
          const ex = (o.pos[0] - w.pos[0]) / Math.max(d, 0.01);
          const ez = (o.pos[2] - w.pos[2]) / Math.max(d, 0.01);
          let nx = w.pos[0] + ex * Math.min(W.springVer, d + 0.15);
          let nz = w.pos[2] + ez * Math.min(W.springVer, d + 0.15);
          if (!pad.vrij(nx, nz, 0.3)) {
            nx = w.pos[0] + ex * 0.3;
            nz = w.pos[2] + ez * 0.3;
          }
          Object.assign(w, { modus: 'sprong', timer: W.springDuur, duur: W.springDuur, springVan: [w.pos[0], w.pos[2]], springNaar: [nx, nz], maat: null });
          w.richting = Math.atan2(ex, ez);
          rol(o, W, o.rolKant);
          meld({ soort: 'welpSprong', welp: w.id, pos: [...w.pos] });
          meld({ soort: 'welpPiep', welp: o.id, pos: [...o.pos] });
        }
        break;
      }

      case 'vlucht': {
        const o = welpjes.find((q) => q.id === w.maat);
        if (!o || o.modus !== 'jaagt' || o.maat !== w.id || w.timer <= 0) {
          snuffel(w, welpjes, m, s, W);
          break;
        }
        // Even schrikken (de jager loert nog), dan wegrennen in een kring rond mama.
        if (w.duur - w.timer < 0.45) {
          rem(w, W, dt);
          draaiNaar(w, o.pos[0], o.pos[2], W, dt);
          w.kijk = [o.pos[0], o.pos[1] + 0.25, o.pos[2]];
          break;
        }
        w.kijk = null;
        let ax = w.pos[0] - o.pos[0];
        let az = w.pos[2] - o.pos[2];
        const al = Math.hypot(ax, az) || 1;
        ax /= al;
        az /= al;
        let mx = m.pos[0] - w.pos[0];
        let mz = m.pos[2] - w.pos[2];
        const ml = Math.hypot(mx, mz) || 1;
        mx /= ml;
        mz /= ml;
        const naarMama = Math.max(0, (ml - 3) / 1.5);
        const rx = ax * 0.6 - mz * w.rolKant * 0.8 + mx * naarMama;
        const rz = az * 0.6 + mx * w.rolKant * 0.8 + mz * naarMama;
        const basis = Math.atan2(rx, rz);
        let gevonden = false;
        for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3]) {
          const x = w.pos[0] + Math.sin(basis + da) * 1.6;
          const z = w.pos[2] + Math.cos(basis + da) * 1.6;
          if (pad.vrij(x, z, 0.4) && pad.zicht(w.pos[0], w.pos[2], x, z)) {
            loopNaar(w, x, z, W.ren * W.vluchtVoorsprong, W, dt);
            gevonden = true;
            break;
          }
        }
        if (!gevonden) {
          // In een hoekje: dan maar omrollen (gevangen!).
          rol(w, W, w.rolKant);
          meld({ soort: 'welpPiep', welp: w.id, pos: [...w.pos] });
        }
        break;
      }

      case 'sprong': {
        const f = klem(1 - w.timer / w.duur, 0, 1);
        const e = f * f * (3 - 2 * f);
        w.pos[0] = w.springVan[0] + (w.springNaar[0] - w.springVan[0]) * e;
        w.pos[2] = w.springVan[1] + (w.springNaar[1] - w.springVan[1]) * e;
        w.hoogte = 4 * W.springHoogte * f * (1 - f);
        w.snelheid = Math.hypot(w.springNaar[0] - w.springVan[0], w.springNaar[1] - w.springVan[1]) / w.duur;
        if (w.timer <= 0) {
          w.hoogte = 0;
          w.snelheid = 0;
          meld({ soort: 'welpLand', welp: w.id, pos: [...w.pos] });
          snuffel(w, welpjes, m, s, W, 0.9);
        }
        break;
      }

      case 'rol':
        rem(w, W, dt);
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 0.7);
        break;

      case 'aai':
        rem(w, W, dt);
        if (s) {
          w.kijk = [s.pos[0], s.pos[1] + 1.2, s.pos[2]];
          draaiNaar(w, s.pos[0], s.pos[2], { draaiSnelheid: 2 }, dt);
        }
        if (w.timer <= 0) snuffel(w, welpjes, m, s, W, 1.2);
        break;

      case 'terug': {
        w.kijk = w.huhTijd > 0 && s ? kopVan(s) : null;
        // Naar de kant van mama waar hij vandaan komt.
        const ux = (w.pos[0] - m.pos[0]) / (dm || 1);
        const uz = (w.pos[2] - m.pos[2]) / (dm || 1);
        let tx = m.pos[0] + ux * 1.7;
        let tz = m.pos[2] + uz * 1.7;
        if (!pad.vrij(tx, tz, 0.4)) {
          tx = m.pos[0] - Math.sin(m.richting) * 1.9;
          tz = m.pos[2] - Math.cos(m.richting) * 1.9;
        }
        const rest = loopNaar(w, tx, tz, dm > 10 ? W.galop * 0.6 : W.ren, W, dt);
        if (rest < 0.6 || dm < W.speelStraal[1] * 0.7) snuffel(w, welpjes, m, s, W, 0.5);
        else if (w.vastTijd > 2.5) verschijn(w, m, wereld, W, meld);
        break;
      }

      case 'mee': {
        w.kijk = w.huhTijd > 0 && s ? kopVan(s) : null;
        // Achter mama aan, elk op zijn eigen plekje.
        const [opzij, voor] = W.meePlekken[i % W.meePlekken.length];
        const fx = Math.sin(m.richting);
        const fz = Math.cos(m.richting);
        let tx = m.pos[0] + fx * voor + fz * opzij;
        let tz = m.pos[2] + fz * voor - fx * opzij;
        if (!pad.vrij(tx, tz, 0.35)) {
          tx = m.pos[0] + fx * voor;
          tz = m.pos[2] + fz * voor;
        }
        const rest = Math.hypot(tx - w.pos[0], tz - w.pos[2]);
        if (rest < 0.25 && !mamaLoopt) {
          rem(w, W, dt);
          draai(w, m.richting, W, dt);
        } else loopNaar(w, tx, tz, klem(m.snelheid * 1.05 + (rest - 0.2) * 2.2, 0, W.galop), W, dt);
        if (w.vastTijd > 2.5 && dm > W.terugAfstand) verschijn(w, m, wereld, W, meld);
        break;
      }
    }
  });

  // Niet in elkaar en niet in mama: zachtjes opzij duwen.
  for (let i = 0; i < welpjes.length; i++) {
    const a = welpjes[i];
    if (a.modus === 'sprong') continue;
    for (let j = i + 1; j < welpjes.length; j++) {
      const b = welpjes[j];
      if (b.modus === 'sprong') continue;
      const dx = b.pos[0] - a.pos[0];
      const dz = b.pos[2] - a.pos[2];
      const d = Math.hypot(dx, dz);
      if (d >= W.afstandTotElkaar || d < 1e-4) continue;
      const duw = (W.afstandTotElkaar - d) / 2;
      duwOpzij(a, (-dx / d) * duw, (-dz / d) * duw);
      duwOpzij(b, (dx / d) * duw, (dz / d) * duw);
    }
    const [d, px, pz] = totMama(a.pos[0], a.pos[2], m, W.schaal);
    // De zoeker bij verstoppertje mag dichterbij: zijn kopje leunt tegen mama aan.
    const totMamaMin = a.modus === 'tel' ? W.verstop.telAfstand - 0.04 : W.afstandTotMama;
    if (d < totMamaMin && d > 1e-4) {
      const duw = totMamaMin - d;
      duwOpzij(a, ((a.pos[0] - px) / d) * duw, ((a.pos[2] - pz) / d) * duw);
    }
  }

  for (const w of welpjes) {
    w.pos[1] = wereld.terreinOp(w.pos[0], w.pos[2]) + w.hoogte;
    const v = w.snelheid;
    const stil = (DRUK.includes(w.modus) && w.modus !== 'staart') || w.modus === 'hik' || (w.modus === 'verstop' && w.fase === 1);
    w.gang = w.modus === 'sprong' ? 'draf' : stil ? 'stil' : v < 0.08 ? 'stil' : v < 1.3 ? 'stap' : v < 4.2 ? 'draf' : 'galop';
  }
}

function duwOpzij(w, dx, dz) {
  const x = w.pos[0] + dx;
  const z = w.pos[2] + dz;
  if (pad.vrij(x, z, 0.3)) {
    w.pos[0] = x;
    w.pos[2] = z;
  }
}

/** Je aait een welpje (tik erop): het rolt op zijn rug voor een buikkriebel. */
export function aaiWelp(w, welpjes, m, s, W, meld) {
  if (w.modus === 'sprong' || w.modus === 'aai') return;
  w.hoogte = 0;
  const meldNaar = meld;
  meld = (g) => meldNaar({ speler: s.id, ...g });
  laatLos(w, welpjes, m, s, W);
  Object.assign(w, { modus: 'aai', timer: W.aaiDuur, duur: W.aaiDuur, rolKant: kans(w) < 0.5 ? 1 : -1 });
  meld({ soort: 'welpAai', welp: w.id, speler: s.id, pos: [...w.pos] });
}
