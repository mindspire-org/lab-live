// vite.config.ts
import { defineConfig } from "file:///G:/lab%20-%20Copy/node_modules/vite/dist/node/index.js";
import react from "file:///G:/lab%20-%20Copy/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "G:\\lab - Copy";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxsYWIgLSBDb3B5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxsYWIgLSBDb3B5XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9HOi9sYWIlMjAtJTIwQ29weS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0LXN3Yyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGJhc2U6ICcuLycsIC8vIEZpeCBhc3NldCBwYXRocyBmb3IgRWxlY3Ryb24gcHJvZHVjdGlvblxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIC8vIEF2b2lkIHJlLW9wdGltaXppbmcgZGVwcyBvbiBldmVyeSBzdGFydDsgdGhpcyBzcGVlZHMgdXAgZGV2IHN0YXJ0dXAgc2lnbmlmaWNhbnRseVxuICAgIGZvcmNlOiBmYWxzZVxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnMTI3LjAuMC4xJyxcbiAgICBwb3J0OiA4MDgwLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG1yOiB7IGhvc3Q6ICcxMjcuMC4wLjEnLCBjbGllbnRQb3J0OiA4MDgwLCBwcm90b2NvbDogJ3dzJyB9LFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgLy8gVXNlIG9yZGVyZWQgYXJyYXkgc28gc3BlY2lmaWMgYWxpYXNlcyByZXNvbHZlIGJlZm9yZSBnZW5lcmljICdAJ1xuICAgIGFsaWFzOiBbXG4gICAgICB7IGZpbmQ6ICdAL2NvbXBvbmVudHMvUGhhcm1hY3kgY29tcG9uZW50cycsIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29tcG9uZW50cy9QaGFybWFjeSBjb21wb25lbnRzJykgfSxcbiAgICAgIHsgZmluZDogJ0AvcGhhcm1hY3kgdXRpbGl0aWVzJywgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9waGFybWFjeSB1dGlsaXRlcycpIH0sXG4gICAgICB7IGZpbmQ6ICdAL3NlcnZpY2VzJywgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9QaGFybWFjeSBzZXJ2aWNlcycpIH0sXG4gICAgICB7IGZpbmQ6ICdAJywgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpIH0sXG4gICAgXVxuICB9LFxuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogdHJ1ZVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaU8sU0FBUyxvQkFBb0I7QUFDOVAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUE7QUFBQSxFQUNOLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixjQUFjO0FBQUE7QUFBQSxJQUVaLE9BQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixLQUFLLEVBQUUsTUFBTSxhQUFhLFlBQVksTUFBTSxVQUFVLEtBQUs7QUFBQSxJQUMzRCxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQSxJQUVQLE9BQU87QUFBQSxNQUNMLEVBQUUsTUFBTSxvQ0FBb0MsYUFBYSxLQUFLLFFBQVEsa0NBQVcsc0NBQXNDLEVBQUU7QUFBQSxNQUN6SCxFQUFFLE1BQU0sd0JBQXdCLGFBQWEsS0FBSyxRQUFRLGtDQUFXLHlCQUF5QixFQUFFO0FBQUEsTUFDaEcsRUFBRSxNQUFNLGNBQWMsYUFBYSxLQUFLLFFBQVEsa0NBQVcseUJBQXlCLEVBQUU7QUFBQSxNQUN0RixFQUFFLE1BQU0sS0FBSyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxPQUFPLEVBQUU7QUFBQSxJQUM3RDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxFQUNiO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
