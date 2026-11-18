// Toetsenbord → intentie (TP 4, GD 4). De simulatie ziet nooit welke toets er werd ingedrukt.
// WASD/pijltjes bewegen, Shift rent (of galop op de pony), spatie springt, E is de actieknop, F fluit de pony.

const LINKS = ['KeyA', 'ArrowLeft'];
const RECHTS = ['KeyD', 'ArrowRight'];
const VOORUIT = ['KeyW', 'ArrowUp'];
const ACHTERUIT = ['KeyS', 'ArrowDown'];
const SPRING = ['Space'];
const ACTIE = ['KeyE'];
const FLUIT = ['KeyF'];
const REN = ['ShiftLeft', 'ShiftRight'];
const SPELTOETSEN = new Set([...LINKS, ...RECHTS, ...VOORUIT, ...ACHTERUIT, ...SPRING]);

export function maakToetsenbord(doel = window) {
  const ingedrukt = new Set();

  doel.addEventListener('keydown', (e) => {
    ingedrukt.add(e.code);
    if (SPELTOETSEN.has(e.code)) e.preventDefault(); // pagina niet laten scrollen
  });
  doel.addEventListener('keyup', (e) => ingedrukt.delete(e.code));
  // Venster verlaten: alles los, anders blijft het figuurtje doorlopen.
  window.addEventListener('blur', () => ingedrukt.clear());

  const iets = (lijst) => lijst.some((c) => ingedrukt.has(c));

  return {
    /**
     * Beweging ten opzichte van de camera: x = rechts, y = vooruit, lengte 0..1.
     * Zonder Shift wandel je, met Shift ren je.
     */
    lees() {
      let x = (iets(RECHTS) ? 1 : 0) - (iets(LINKS) ? 1 : 0);
      let y = (iets(VOORUIT) ? 1 : 0) - (iets(ACHTERUIT) ? 1 : 0);
      const l = Math.hypot(x, y);
      const kracht = iets(REN) ? 1 : 0.75;
      if (l > 0) {
        x = (x / l) * kracht;
        y = (y / l) * kracht;
      }
      return { beweeg: [x, y], spring: iets(SPRING), actie: iets(ACTIE), fluit: iets(FLUIT) };
    },
  };
}
