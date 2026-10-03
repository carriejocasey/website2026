// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Set this to the production domain once it's live (used for canonical URLs and the sitemap).
  site: 'https://carrienoonan.com',
  // Prefetch links on hover so project pages open instantly.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
