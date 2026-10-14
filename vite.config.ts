import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      compilerOptions: { runes: true },
      adapter: adapter(),
      // The Console checks for updates through its service worker only; no extra background polling.
      version: { pollInterval: 0 },
      // Every API mutation requires the X-Console-Request header (see hooks.server.ts), which is stronger
      // than an Origin match and also works for non-browser clients and behind TLS-terminating proxies.
      csrf: { trustedOrigins: ['*'] },
      csp: {
        mode: 'nonce',
        directives: {
          'default-src': ['self'],
          'script-src': ['self'],
          'style-src': ['self', 'unsafe-inline'],
          'img-src': ['self', 'data:', 'blob:'],
          'connect-src': ['self'],
          'font-src': ['self'],
          'object-src': ['none'],
          'frame-ancestors': ['none'],
          'base-uri': ['none'],
          'form-action': ['self']
        }
      }
    })
  ]
});
