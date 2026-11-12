import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths: the build works under any folder (GitHub Pages, itch.io).
  base: './',
  build: {
    // manual.html is the keyboard and browser test page for contributors.
    rollupOptions: { input: ['index.html', 'manual.html'] },
  },
  test: { environment: 'jsdom', setupFiles: ['src/test-setup.ts'] },
});
