import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Work samples and side projects are markdown files in src/content/work and src/content/play.
 * The file name becomes the URL: src/content/work/campaigns-2.md -> /work/campaigns-2
 *
 * Frontmatter shared by both:
 *   title    Shown in caps on the home list ("PLATFORM REDESIGN").
 *   tag      The italic serif bit after the slash ("Lattice", "Find your light").
 *   summary  One line used on index pages and in meta descriptions.
 *   order    Sort order, lowest first.
 *   home     Set to false to keep it off the home page list.
 *   draft    Set to true to hide it everywhere (still visible in `npm run dev`).
 */
const project = z.object({
  title: z.string(),
  tag: z.string(),
  summary: z.string().optional(),
  order: z.number().default(100),
  home: z.boolean().default(true),
  draft: z.boolean().default(false),
  year: z.number().optional(),
  role: z.string().optional(),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: project,
});

const play = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/play' }),
  schema: project,
});

export const collections = { work, play };
