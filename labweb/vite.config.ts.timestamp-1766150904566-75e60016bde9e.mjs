// vite.config.ts
import { defineConfig } from "file:///G:/New%20folder/labtech/labweb/node_modules/vite/dist/node/index.js";
import react from "file:///G:/New%20folder/labtech/labweb/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "G:\\New folder\\labtech\\labweb";
var vite_config_default = defineConfig({
  base: "./",
  // Fix asset paths for Electron production
  plugins: [react()],
  optimizeDeps: {
    // Avoid re-optimizing deps on every start; this speeds up dev startup significantly
    force: false
  },
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    hmr: { host: "127.0.0.1", clientPort: 8080, protocol: "ws" },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    // Use ordered array so specific aliases resolve before generic '@'
    alias: [
      { find: "@/components/Pharmacy components", replacement: path.resolve(__vite_injected_original_dirname, "./src/components/Pharmacy components") },
      { find: "@/pharmacy utilities", replacement: path.resolve(__vite_injected_original_dirname, "./src/pharmacy utilites") },
      { find: "@/services", replacement: path.resolve(__vite_injected_original_dirname, "./src/Pharmacy services") },
      { find: "@", replacement: path.resolve(__vite_injected_original_dirname, "./src") }
    ]
  },
  build: {
    sourcemap: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxOZXcgZm9sZGVyXFxcXGxhYnRlY2hcXFxcbGFid2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxOZXcgZm9sZGVyXFxcXGxhYnRlY2hcXFxcbGFid2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9HOi9OZXclMjBmb2xkZXIvbGFidGVjaC9sYWJ3ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBiYXNlOiAnLi8nLCAvLyBGaXggYXNzZXQgcGF0aHMgZm9yIEVsZWN0cm9uIHByb2R1Y3Rpb25cbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICAvLyBBdm9pZCByZS1vcHRpbWl6aW5nIGRlcHMgb24gZXZlcnkgc3RhcnQ7IHRoaXMgc3BlZWRzIHVwIGRldiBzdGFydHVwIHNpZ25pZmljYW50bHlcbiAgICBmb3JjZTogZmFsc2VcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogJzEyNy4wLjAuMScsXG4gICAgcG9ydDogODA4MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGhtcjogeyBob3N0OiAnMTI3LjAuMC4xJywgY2xpZW50UG9ydDogODA4MCwgcHJvdG9jb2w6ICd3cycgfSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIC8vIFVzZSBvcmRlcmVkIGFycmF5IHNvIHNwZWNpZmljIGFsaWFzZXMgcmVzb2x2ZSBiZWZvcmUgZ2VuZXJpYyAnQCdcbiAgICBhbGlhczogW1xuICAgICAgeyBmaW5kOiAnQC9jb21wb25lbnRzL1BoYXJtYWN5IGNvbXBvbmVudHMnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2NvbXBvbmVudHMvUGhhcm1hY3kgY29tcG9uZW50cycpIH0sXG4gICAgICB7IGZpbmQ6ICdAL3BoYXJtYWN5IHV0aWxpdGllcycsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvcGhhcm1hY3kgdXRpbGl0ZXMnKSB9LFxuICAgICAgeyBmaW5kOiAnQC9zZXJ2aWNlcycsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvUGhhcm1hY3kgc2VydmljZXMnKSB9LFxuICAgICAgeyBmaW5kOiAnQCcsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSB9LFxuICAgIF1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IHRydWVcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdSLFNBQVMsb0JBQW9CO0FBQzdTLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBO0FBQUEsRUFDTixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsY0FBYztBQUFBO0FBQUEsSUFFWixPQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osS0FBSyxFQUFFLE1BQU0sYUFBYSxZQUFZLE1BQU0sVUFBVSxLQUFLO0FBQUEsSUFDM0QsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBO0FBQUEsSUFFUCxPQUFPO0FBQUEsTUFDTCxFQUFFLE1BQU0sb0NBQW9DLGFBQWEsS0FBSyxRQUFRLGtDQUFXLHNDQUFzQyxFQUFFO0FBQUEsTUFDekgsRUFBRSxNQUFNLHdCQUF3QixhQUFhLEtBQUssUUFBUSxrQ0FBVyx5QkFBeUIsRUFBRTtBQUFBLE1BQ2hHLEVBQUUsTUFBTSxjQUFjLGFBQWEsS0FBSyxRQUFRLGtDQUFXLHlCQUF5QixFQUFFO0FBQUEsTUFDdEYsRUFBRSxNQUFNLEtBQUssYUFBYSxLQUFLLFFBQVEsa0NBQVcsT0FBTyxFQUFFO0FBQUEsSUFDN0Q7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsRUFDYjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
