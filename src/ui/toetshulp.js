// Op pc toont de HUD de toetsen (TP 8). Verdwijnt na een tijdje, of bij de eerste aanraking.

export function maakToetshulp(ui) {
  const el = document.createElement('div');
  el.className = 'toetshulp';
  el.innerHTML =
    '<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> lopen</span>' +
    '<span><kbd>Shift</kbd> rennen</span>' +
    '<span><kbd>spatie</kbd> springen</span>' +
    '<span><kbd>E</kbd> actie</span>' +
    '<span><kbd>M</kbd> geluid</span>' +
    '<span>muis slepen: rondkijken</span>';
  ui.appendChild(el);
  setTimeout(() => el.classList.add('weg'), 12000);
}
