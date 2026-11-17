// Spellus met vaste tijdstap (TP 4): de simulatie schuift altijd op in stappen van 1/60 s,
// het beeld tekent zo vaak als het toestel kan, met een overgangsfactor tussen twee stappen.

export const STAP = 1 / 60;
const MAX_STAPPEN = 5; // na een hapering niet eindeloos inhalen

/**
 * @param {{ stap: (dt:number) => void, teken: (overgang:number, dtBeeld:number) => void }} lagen
 */
export function maakSpellus({ stap, teken }) {
  let opgespaard = 0;
  let vorige = -1;

  return {
    /** Oproepen bij elk beeld, met de tijd van requestAnimationFrame. */
    tik(nu) {
      // Nooit terug in de tijd (kan na een tabbladwissel of een test die vooruitspoelt), nooit meer dan 0,25 s.
      const dtBeeld = vorige < 0 ? STAP : Math.min(Math.max((nu - vorige) / 1000, 0), 0.25);
      vorige = nu;
      opgespaard += dtBeeld;
      let n = 0;
      while (opgespaard >= STAP && n < MAX_STAPPEN) {
        stap(STAP);
        opgespaard -= STAP;
        n++;
      }
      if (n === MAX_STAPPEN) opgespaard = 0;
      teken(opgespaard / STAP, dtBeeld);
    },
    /** Na een pauze: niet de hele pauze inhalen. */
    herstart() {
      vorige = -1;
      opgespaard = 0;
    },
  };
}
