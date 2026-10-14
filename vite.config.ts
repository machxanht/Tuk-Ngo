import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/Tuk-Ngo/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three already separates its platform-independent core and WebGL
          // renderer. Keep those boundaries instead of loading every studio
          // and renderer in the root dashboard bundle.
          if (id.includes('/three/build/three.core.js')) return 'three-core';
          if (id.includes('/three/build/three.module.js')) return 'three-renderer';
          if (id.includes('/three/examples/')) return 'three-addons';
        },
      },
    },
  },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
