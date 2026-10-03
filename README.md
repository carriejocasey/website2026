# carrienoonan.com

Personal site. Built with [Astro](https://astro.build): static HTML, plain CSS, and a few
kilobytes of TypeScript for the home page interactions. No UI framework.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve the built site
npm run check     # type-check .astro and .ts files
```

Deploys anywhere that serves static files (Vercel, Netlify, Cloudflare Pages): the build
command is `npm run build` and the output folder is `dist`. Set the real domain in `astro.config.mjs` (`site`).

## Where things live

```
src/
  content/
    work/*.md            one file per work sample   -> /work/<file-name>
    play/*.md            one file per side project  -> /play/<file-name>
  data/site.ts           site copy: name, header card lines, section titles
  styles/tokens.css      colors, fonts, motion curves and durations
  components/home/
    HomeStage.astro      the home stage: every state's geometry, plus the intro
    Section.astro        "Work samples" / "Side projects" heading + project list
    HeaderCard.astro     "carrie noonan*" / "*designer, maker" glass cards
    SkyPhoto.astro       the sky photo layer
  scripts/home/
    controller.ts        which state is open (hover, keyboard, touch rules)
    sky.ts               WebGL cloud drift
  layouts/               BaseLayout (head/meta), PageLayout (inner pages)
  pages/                 index, [section]/index (/work, /play), [section]/[slug], 404
```

## Common changes

**Add a work sample or side project:** add a markdown file to `src/content/work` or
`src/content/play`. It shows up on the home list, the index page and its own page.

```md
---
title: Campaigns 2.0      # shown in caps on home
tag: Hightouch            # the italic serif bit after the slash
order: 3                  # lower comes first
home: true                # false keeps it off the home list
draft: false              # true hides it in production (still visible in dev)
---

Write-up goes here.
```

**Change the words:** edit `src/data/site.ts`. Wrap a word in `*asterisks*` to set it in the
italic serif.

**Tune the motion:** edit `--ease-*` and `--dur-*` in `src/styles/tokens.css`. Cloud drift
speed and strength are in the `SKY` object at the top of `src/scripts/home/sky.ts`.

**Move or resize something on the home stage:** edit the custom properties at the top of
the `<style>` block in `HomeStage.astro`. All lengths are Figma px × `--u`, so values can be
copied straight from Figma. The same properties drive the shapes, the text positions and the
invisible hover zones, so they stay in sync.

**Review a state without hovering:** open `/#work`, `/#play`, `/#about` or `/#role`. Press
Esc to release it.

## How the home page works

Design source: Figma file **New Site 2026** (frames 4:6, 4:44, 4:34, 7:314, 7:361).

- **One stage, one state.** `<main data-state>` is `default`, `work`, `play`, `about` or
  `role`. Everything visual is CSS keyed off that attribute. The controller only decides which
  state is current.
- **Layers.** Grid paper, then the sky photo (its `clip-path` animates between right half, full
  bleed and rounded card), then the "sheet" (the work card). At rest the sheet is an exact copy
  of the left half, so it's invisible. Opening work clips it down to the card while its grid
  zooms from 40px to 48px around a point that lands the card's edges on grid lines.
- **Hover rules.** A state opens only from its text, never from background imagery. It stays
  open while the pointer is inside the card it opened into (its zone), so text that moves never
  slips out from under the cursor. Leaving the zone closes it after 160ms of grace, and landing
  on another heading switches straight to that state.
- **Motion.** Opening uses a long, soft landing and closing is quicker. Only transforms,
  clip-paths and colors animate. Header label colors flip at the moment the sky's edge passes
  them; the delays are computed against the easing curves (see the comments in `HomeStage.astro`).
- **Intro.** It plays on the first visit of a browser session: the photo rises in and the text
  slides up line by line. It's skipped on later visits and under reduced motion.
- **Clouds.** A small WebGL shader warps and drifts the photo on the GPU, and keeps the tree
  still. The plain `<img>` sits underneath as a fallback. It's off under `prefers-reduced-motion`.
- **Accessibility.** Focusing a heading or a project link opens its section. Header labels are
  buttons with `aria-expanded`. Esc closes. All links are real, so everything works without JS.
- **Touch.** The first tap on a heading opens it, and the second follows the link. Tapping
  outside closes it.
- **Portrait screens** (phones, tall tablets) get a stacked layout: paper on top, sky below.
  There's no Figma frame for it yet; its values are in the portrait block in `HomeStage.astro`.

## Open items

- Portrait layout needs a design pass in Figma.
- `/work`, `/play` and the project pages are placeholders, waiting on their designs.
- Figma repeats "AUREOLE / Find your light" twice in the side projects list. The site lists
  one entry until there's a second project.
- Add an Open Graph image.
