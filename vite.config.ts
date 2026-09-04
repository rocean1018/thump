import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static, backend-free build — deployable to any free static host
// (Vercel, Netlify, GitHub Pages, Cloudflare Pages).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
