/**
 * Site-wide copy. Edit words here; layout and motion live in the components and styles.
 *
 * Lines use a little markdown:
 *   'living the *dream*'                 ->  italic serif accent on "dream"
 *   '[*Lattice*](https://lattice.com/)'  ->  that word links out (new tab)
 */
export const site = {
  name: 'Carrie Noonan',
  title: 'Carrie Noonan — designer, maker',
  description: 'Carrie Noonan is a designer and maker, currently at Hightouch, previously at Lattice.',

  about: {
    label: 'carrie noonan*',
    lines: ['living the *dream*', '& making my own *luck*'],
  },

  role: {
    label: '*designer, maker',
    lines: ['currently at [*Hightouch*](https://hightouch.com/)', 'previously at [*Lattice*](https://lattice.com/)'],
  },

  sections: {
    work: { eyebrow: '01 / WORK', title: 'Work samples' },
    play: { eyebrow: '02 / PLAY', title: 'side Projects' },
  },
} as const;

export type SectionKey = keyof typeof site.sections;
