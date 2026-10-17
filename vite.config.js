import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Every build gets an id; the game compares it with dist/version.json on the
// server to notice when a newer version has been deployed (src/updates.js),
// and the service worker names its cache with it (src/sw.js).
const BUILD_ID = Date.now().toString(36);

export default defineConfig({
  base: '/iso/',
  server: { port: 3000 },
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [{
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
      // the service worker, its cache named for this build (src/sw.js)
      const sw = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8').replaceAll('__BUILD_ID__', BUILD_ID);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  }],
});
