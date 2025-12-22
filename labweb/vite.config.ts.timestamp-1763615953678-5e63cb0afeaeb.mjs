// vite.config.ts
import { defineConfig } from "file:///G:/lab/node_modules/vite/dist/node/index.js";
import react from "file:///G:/lab/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "G:\\lab";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxsYWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkc6XFxcXGxhYlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRzovbGFiL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYmFzZTogJy4vJywgLy8gRml4IGFzc2V0IHBhdGhzIGZvciBFbGVjdHJvbiBwcm9kdWN0aW9uXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgLy8gQXZvaWQgcmUtb3B0aW1pemluZyBkZXBzIG9uIGV2ZXJ5IHN0YXJ0OyB0aGlzIHNwZWVkcyB1cCBkZXYgc3RhcnR1cCBzaWduaWZpY2FudGx5XG4gICAgZm9yY2U6IGZhbHNlXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcxMjcuMC4wLjEnLFxuICAgIHBvcnQ6IDgwODAsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBobXI6IHsgaG9zdDogJzEyNy4wLjAuMScsIGNsaWVudFBvcnQ6IDgwODAsIHByb3RvY29sOiAnd3MnIH0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2VcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICAvLyBVc2Ugb3JkZXJlZCBhcnJheSBzbyBzcGVjaWZpYyBhbGlhc2VzIHJlc29sdmUgYmVmb3JlIGdlbmVyaWMgJ0AnXG4gICAgYWxpYXM6IFtcbiAgICAgIHsgZmluZDogJ0AvY29tcG9uZW50cy9QaGFybWFjeSBjb21wb25lbnRzJywgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzL1BoYXJtYWN5IGNvbXBvbmVudHMnKSB9LFxuICAgICAgeyBmaW5kOiAnQC9waGFybWFjeSB1dGlsaXRpZXMnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3BoYXJtYWN5IHV0aWxpdGVzJykgfSxcbiAgICAgIHsgZmluZDogJ0Avc2VydmljZXMnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL1BoYXJtYWN5IHNlcnZpY2VzJykgfSxcbiAgICAgIHsgZmluZDogJ0AnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJykgfSxcbiAgICBdXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiB0cnVlXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3TSxTQUFTLG9CQUFvQjtBQUNyTyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQTtBQUFBLEVBQ04sU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLGNBQWM7QUFBQTtBQUFBLElBRVosT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLEtBQUssRUFBRSxNQUFNLGFBQWEsWUFBWSxNQUFNLFVBQVUsS0FBSztBQUFBLElBQzNELE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQTtBQUFBLElBRVAsT0FBTztBQUFBLE1BQ0wsRUFBRSxNQUFNLG9DQUFvQyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxzQ0FBc0MsRUFBRTtBQUFBLE1BQ3pILEVBQUUsTUFBTSx3QkFBd0IsYUFBYSxLQUFLLFFBQVEsa0NBQVcseUJBQXlCLEVBQUU7QUFBQSxNQUNoRyxFQUFFLE1BQU0sY0FBYyxhQUFhLEtBQUssUUFBUSxrQ0FBVyx5QkFBeUIsRUFBRTtBQUFBLE1BQ3RGLEVBQUUsTUFBTSxLQUFLLGFBQWEsS0FBSyxRQUFRLGtDQUFXLE9BQU8sRUFBRTtBQUFBLElBQzdEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLEVBQ2I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
