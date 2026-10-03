/**
 * Site-wide copy. Edit words here; layout and motion live in the components and styles.
 *
 * Lines can mix in the italic serif accent with *asterisks*, like markdown:
 *   'living the *dream*'  ->  living the <em>dream</em>
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
    lines: ['currently at *Hightouch*', 'previously at *Lattice*'],
  },

  sections: {
    work: { eyebrow: '01 / WORK', title: 'Work samples', href: '/work' },
    play: { eyebrow: '02 / PLAY', title: 'Side projects', href: '/play' },
  },
} as const;

export type SectionKey = keyof typeof site.sections;
