// Scherm op mobiel (TP 8): bij de eerste tik volledig scherm, liggende stand en scherm wakker houden.
// In staande stand verschijnt een "draai je toestel"-pictogram (zonder tekst, voor de kleinsten).

const DRAAI_ICOON = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <g class="draaitoestel">
    <rect x="70" y="35" width="60" height="110" rx="12" fill="#fff" stroke="#c2417a" stroke-width="7"/>
    <circle cx="100" cy="130" r="5" fill="#c2417a"/>
  </g>
  <path d="M40 150 A70 70 0 0 1 40 60" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
  <path d="M28 70 L40 56 L54 68" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * @param {HTMLElement} ui
 * @param {{ touch: boolean }} opties
 */
export function maakScherm(ui, { touch }) {
  const draai = document.createElement('div');
  draai.className = 'draaischerm';
  draai.innerHTML = DRAAI_ICOON;
  ui.appendChild(draai);

  // Wake Lock: het scherm mag niet uitgaan terwijl je speelt.
  let wakker = null;
  async function houdWakker() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wakker) {
        wakker = await navigator.wakeLock.request('screen');
        wakker.addEventListener('release', () => (wakker = null));
      }
    } catch {
      // Niet ondersteund of geweigerd: geen probleem.
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (gestart) houdWakker();
  });

  async function volledigScherm() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
      // Liggend vastzetten lukt op Android alleen in volledig scherm.
      await screen.orientation?.lock?.('landscape');
    } catch {
      // Bv. op pc of iPhone: dan maar zonder.
    }
  }

  let gestart = false;
  const eersteTik = (e) => {
    if (e.pointerType === 'mouse') return; // op pc niet ongevraagd volledig scherm
    gestart = true;
    volledigScherm();
    houdWakker();
    // Later: hier ook het geluid ontgrendelen (stap 5).
  };
  // Bij elke tik, zodat wie volledig scherm verlaat (terugknop) het bij de volgende tik terugkrijgt.
  window.addEventListener('pointerdown', eersteTik);

  if (touch) document.body.classList.add('touch');
}
