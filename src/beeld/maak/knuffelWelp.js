// De KNUFFELWELP (verbeterronde stap 6, op vraag van de gebruiker): een knuffel, zo lief als de eerste
// knuffeltijger (tijgerKawaii.js, die ongewijzigd bewaard blijft), maar met de echte bouw en de
// verhoudingen van een welp die we nagemeten hebben op foto's: een grote ronde kop met een bol voorhoofd
// en een kort snoetje, de oren ver naar buiten, de echte gezichtstekening (witte vlekken boven de ogen,
// de wangstrepen, het voorhoofd), dikke pootjes met grote ronde voeten, een kort staartje met ringen.
// Het lijf is dat van de echte welp (maakTijger met KNUFFELWELPVORM); dit bestand maakt er speelgoed van:
// een gladde vacht zonder haartjes, snoepkleuren met een zachte gloed, grote glanzende kawaii-ogen, een
// roze neusje, een lachend mondje, blosjes en een paar witte snorharen.
import * as THREE from 'three';
import { maakTijger } from './tijger.js';
import { maakDierOog } from './lichaam.js';

// Welke vaste gezichtsstrepen (KOPSTREPEN in tijger.js) de knuffel houdt, en hoe dik: alleen de grote,
// en wat vetter (de fijne balkjes, neusgaten, traanstreepjes en de lijn langs de lip zijn voor de echte
// tijger; bij een knuffel maken ze het gezicht onrustig).
const KNUFFEL_KOPSTREPEN = { 0: 1.2, 1: 1.3, 2: 1.3, 3: 1.3, 4: 1.3, 9: 1.35, 10: 1.35, 11: 1.3 };

/**
 * @param {typeof import('../../data/dieren.js').KNUFFELWELPVORM} F vorm (welpverhoudingen)
 * @param {typeof import('../../data/dieren.js').KNUFFELWELPEN.bengaals} T soort (snoepkleuren en strepen)
 * @param {number} [zaadje] eigen streeppatroon
 * @param {{ fijnheid?: number, kopFijnheid?: number }} [extra] bv. een minder fijne huid op laag niveau
 */
export function maakKnuffelWelp(F, T, zaadje = 0, extra = {}) {
  return maakTijger(F, T, zaadje, {
    ...extra,
    // Grote, glanzende, ronde ogen met glimlichtjes (zoals de eerste knuffeltijger).
    oog: (o) => maakDierOog({ straal: o.breedte, kromming: o.kromming, iris: o.iris, donker: o.donker, kant: o.kant, hoogte: 1.05 }),
    kopStreep: (i) => KNUFFEL_KOPSTREPEN[i] ?? 0,
    gezicht: ({ gz, plek, opKop, H, kussen, bereik, s, hg }) => {
      const m = s * hg; // hoofdmaat in meter
      // Een streepje van het neusje naar het mondje, in het midden.
      opKop(plek, H(0, 0.8, 1.0), new THREE.Vector3(0, -0.15, 1), 0.0012 * s, undefined, 0.12 * m);
      gz.voegToe(new THREE.PlaneGeometry(0.006 * m, 0.03 * m), F.lachKleur, plek);
      for (const k of [1, -1]) {
        const c = kussen(k);
        // Mondje: twee boogjes (een "ω") die naar boven lachen.
        opKop(plek, c, new THREE.Vector3(k * -0.2, -0.45, 0.88), 0.0012 * s, undefined, bereik);
        gz.voegToe(new THREE.TorusGeometry(0.022 * m, 0.0034 * m, 4, 12, Math.PI).rotateZ(Math.PI), F.lachKleur, plek);
        // Drie snorhaarpuntjes.
        for (let j = 0; j < 3; j++) {
          opKop(plek, c, new THREE.Vector3(k * (0.55 + j * 0.14), 0.22 - j * 0.15 + (j === 1 ? 0.05 : 0), 0.8), 0.0012 * s, undefined, bereik);
          gz.voegToe(new THREE.CircleGeometry(0.0055 * m, 8), F.lachKleur, plek);
        }
        // Drie lange witte snorharen.
        for (let j = 0; j < 3; j++) {
          opKop(plek, c, new THREE.Vector3(k * 0.92, 0.15 - j * 0.2, 0.3), 0.0006 * s, undefined, bereik);
          plek.rotateY(-k * 0.35);
          const lengte = 0.17 * m;
          const haar = new THREE.PlaneGeometry(lengte, 0.004 * m).translate((k * lengte) / 2, 0, 0).rotateZ(k * (0.14 - j * 0.14));
          gz.voegToe(haar, F.snorKleur, plek);
        }
        // Blosjes op de wangen, onder de ogen.
        opKop(plek, H(k * 0.05, 0.88, 0.93), new THREE.Vector3(k * 0.62, -0.32, 0.72), 0.0015 * s);
        gz.voegToe(new THREE.CircleGeometry(1, 18).scale(0.03 * m, 0.018 * m, 1), new THREE.Color(T.buikKleur).lerp(new THREE.Color(F.wangKleur), 0.6).getHex(), plek);
      }
    },
  });
}
