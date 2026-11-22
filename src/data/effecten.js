// Afsteltabel voor kleine effecten: plof, spetters, kringen, hartjes en de bloemenregen.

export const EFFECTEN = {
  maxDeeltjes: 520,
  maxKringen: 8,
  plof: { aantal: 36, kleuren: [0xff8cc6, 0xffc2dc, 0xffffff, 0xffe14d, 0xff5fa2] },
  plons: { aantal: 18, kleur: 0xbfefff },
  zwemKring: 0.55,   // om de hoeveel seconden een kringetje bij het zwemmen
  hartjes: { kleuren: [0xff4f8b, 0xff7fb0, 0xff6f9f] },
  sterretjes: { kleuren: [0xffd23f, 0xffe97a, 0xffb84d] }, // een welpje dat kopje-onder gaat (stap 8c)
  stuifmeel: [0xffe14d, 0xfff3a0, 0xffd23f],              // een welpje dat niest
  bloemenregen: { aantal: 70, straal: 1.8, kleuren: [0xff6fae, 0xffd84d, 0xffffff, 0xb98bff, 0xff9f5a, 0x7fd8ff] },
  stof: 0xf3d49a,    // stofwolkje van de zandbaan bij het neerkomen
};
