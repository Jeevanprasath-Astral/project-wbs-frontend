import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },

  build: {
    // Target modern browsers — smaller, faster output
    target: 'es2015',
    // Warn when any chunk exceeds 800 KB (default 500)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor libs into dedicated cached chunks so app code changes
        // don't bust the browser cache for unchanged third-party code.
        manualChunks: {
          // React core — almost never changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts — heavy (~300 KB) but only loaded on pages that need them
          'vendor-charts': ['recharts'],
          // Utilities — lighter, group together
          'vendor-utils': ['axios', 'date-fns', 'zustand', 'clsx', 'react-hook-form'],
        },
      },
    },
  },
})
