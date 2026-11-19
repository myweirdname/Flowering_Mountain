// Het gedeelde skelet van een viervoeter (pony, tijger): lijf met voor- en achterkant, nek, hoofd,
// oren, een staart als ketting en vier poten van drie stukjes (boven, onder, voet).
// Volgorde van de poten overal: [linksvoor, rechtsvoor, linksachter, rechtsachter].
// Links is +x (het dier kijkt naar +z).
import * as THREE from 'three';
import { Lichaam } from './lichaam.js';

export const POTEN = [
  { naam: 'lv', kant: 1, voor: true },
  { naam: 'rv', kant: -1, voor: true },
  { naam: 'la', kant: 1, voor: false },
  { naam: 'ra', kant: -1, voor: false },
];

/** Afronding aan de uiteinden van een lob: 1 in het midden, zacht naar 0 aan de randen. */
export function kap(t, rand = 0.15, randB = rand) {
  const e = Math.min(t / rand, (1 - t) / randB, 1);
  const f = 1 - Math.max(0, e);
  return Math.sqrt(Math.max(0, 1 - f * f));
}

/** Een eenvoudige vaste willekeur (zelfde vorm bij elke start). */
export function vast(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * @typedef {{ heup: THREE.Vector3, knie: THREE.Vector3, enkel: THREE.Vector3, teen: THREE.Vector3 }} PootPunten
 * @param {{ rugY: number, rompVoor: number, rompAchter: number, voorZ: number, achterZ: number,
 *   pootX: number, heupY?: number, knieY?: number, enkelY?: number, voetVoor?: number,
 *   poot?: (poot: typeof POTEN[number]) => PootPunten,
 *   nek: [THREE.Vector3, THREE.Vector3], hoofd: THREE.Vector3, hoofdEind: THREE.Vector3,
 *   oor: [THREE.Vector3, THREE.Vector3], staart: THREE.Vector3[], kaak?: [THREE.Vector3, THREE.Vector3] }} m
 *   oor: linkeroor, het rechter is gespiegeld.
 *   poot: eigen gewrichten per poot (bv. een geknikte achterpoot met de hiel naar achter);
 *     zonder deze functie staan de poten recht onder heupY, knieY en enkelY.
 *   kaak: scharnier en kin van een beweegbare onderkaak (de bek kan open).
 */
export function maakSkelet(m) {
  const L = new Lichaam();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  L.bot('wortel', null, V(0, 0, 0));
  L.bot('lijf', 'wortel', V(0, m.rugY, 0));
  L.bot('achter', 'lijf', V(0, m.rugY, m.achterZ), V(0, m.rugY, m.rompAchter));
  L.bot('voor', 'lijf', V(0, m.rugY, m.voorZ), V(0, m.rugY, m.rompVoor));
  L.bot('nek', 'voor', m.nek[0], m.nek[1]);
  L.bot('hoofd', 'nek', m.hoofd, m.hoofdEind);
  const spiegel = (v) => V(-v.x, v.y, v.z);
  L.bot('oorL', 'hoofd', m.oor[0], m.oor[1]);
  L.bot('oorR', 'hoofd', spiegel(m.oor[0]), spiegel(m.oor[1]));
  if (m.kaak) L.bot('kaak', 'hoofd', m.kaak[0], m.kaak[1]);
  m.staart.forEach((p, i) => {
    if (i === m.staart.length - 1) return;
    L.bot('staart' + i, i ? 'staart' + (i - 1) : 'achter', p, m.staart[i + 1]);
  });
  for (const poot of POTEN) {
    const n = poot.naam;
    let g;
    if (m.poot) g = m.poot(poot);
    else {
      const x = poot.kant * m.pootX;
      const z = poot.voor ? m.voorZ : m.achterZ;
      g = { heup: V(x, m.heupY, z), knie: V(x, m.knieY, z), enkel: V(x, m.enkelY, z), teen: V(x, 0, z + m.voetVoor) };
    }
    L.bot(n + '_boven', poot.voor ? 'voor' : 'achter', g.heup, g.knie);
    L.bot(n + '_onder', n + '_boven', g.knie, g.enkel);
    L.bot(n + '_voet', n + '_onder', g.enkel, g.teen);
  }
  return L;
}

/**
 * Wat de animatie over het dier moet weten, na `L.maak(...)`.
 * @param {Lichaam} L
 * @param {Record<string, THREE.Bone>} bot
 * @param {any} m dezelfde maten als bij maakSkelet
 */
export function dierInfo(L, bot, m) {
  const poten = POTEN.map((p) => {
    const boven = L.botPos(p.naam + '_boven');
    const onder = L.botPos(p.naam + '_onder');
    const voet = L.botPos(p.naam + '_voet');
    return {
      ...p,
      boven: bot[p.naam + '_boven'],
      onder: bot[p.naam + '_onder'],
      voet: bot[p.naam + '_voet'],
      L1: boven.distanceTo(onder),
      L2: onder.distanceTo(voet),
      rust: voet.clone(), // waar de enkel staat in rust (in lichaamsassen)
      // Hoek van elk stuk in rust (0 = recht naar beneden, positief = naar voren). Bij de pony
      // staan de poten recht; de achterpoot van de tijger staat geknikt.
      hoekBoven: Math.atan2(onder.z - boven.z, boven.y - onder.y),
      hoekOnder: Math.atan2(voet.z - onder.z, onder.y - voet.y),
      // Voorpoten buigen met de knie naar voren, achterpoten met de hak naar achteren.
      buig: p.voor ? 1 : -1,
    };
  });
  const staart = [];
  for (let i = 0; bot['staart' + i]; i++) staart.push(bot['staart' + i]);
  for (const b of [bot.nek, bot.hoofd, bot.oorL, bot.oorR]) b.rotation.order = 'YXZ';
  // Hoogte van schouder tot enkel: grotere dieren nemen grotere stappen.
  const pootLengte = m.heupY !== undefined ? m.heupY - m.enkelY : L.botPos('lv_boven').y - L.botPos('lv_voet').y;
  return { poten, staart, rugY: m.rugY, pootLengte };
}

/**
 * Hang onderdelen die in lichaamsassen gebouwd zijn aan een bot (oog, neus...).
 * @param {THREE.Bone} b
 * @param {THREE.Vector3} botPos rustplaats van dat bot
 */
export function aanBot(b, botPos, ...objecten) {
  const houder = new THREE.Group();
  houder.position.copy(botPos).negate();
  houder.add(...objecten);
  b.add(houder);
  return houder;
}
