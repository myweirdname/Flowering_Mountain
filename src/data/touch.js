// Afsteltabel voor de touchbediening (GD 4, TP 8). Groottes in procent van de schermhoogte.

export const TOUCH = {
  joystickStraal: 11,      // hoe ver de duim mag schuiven tot volle snelheid (vh)
  dodeZone: 0.12,          // kleine duimbewegingen negeren (0..1)
  renVanaf: 0.8,           // vanaf deze uitslag ren je (0..1); daaronder wandel je
  kijkGevoeligheid: 0.009, // rondkijken door op de rechterhelft te slepen
  springKnop: 24,          // diameter van de springknop (vh), minstens 15
  actieKnop: 17,           // diameter van de actieknop (vh), minstens 15
  randAfstand: 5,          // knoppen blijven zo ver uit de hoeken (vh)
  linkerDeel: 0.5,         // welk deel van het scherm (van links) de joystick is
};
