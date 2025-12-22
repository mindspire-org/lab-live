import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Fix asset paths for Electron production
  plugins: [react()],
  optimizeDeps: {
    // Avoid re-optimizing deps on every start; this speeds up dev startup significantly
    force: false
  },
  server: {
    host: '127.0.0.1',
    port: 8080,
    strictPort: true,
    hmr: { host: '127.0.0.1', clientPort: 8080, protocol: 'ws' },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    // Use ordered array so specific aliases resolve before generic '@'
    alias: [
      { find: '@/components/Pharmacy components', replacement: path.resolve(__dirname, './src/components/Pharmacy components') },
      { find: '@/pharmacy utilities', replacement: path.resolve(__dirname, './src/pharmacy utilites') },
      { find: '@/services', replacement: path.resolve(__dirname, './src/Pharmacy services') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ]
  },
  build: {
    sourcemap: true
  }
});
