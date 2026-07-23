import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@ide': path.resolve(__dirname, './src/components/ide'),
      '@stores': path.resolve(__dirname, './src/components/ide/stores'),
      '@services': path.resolve(__dirname, './src/components/ide/services'),
      '@hooks': path.resolve(__dirname, './src/components/ide/hooks'),
      '@adapters': path.resolve(__dirname, './src/components/ide/adapters'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion'],
          editor: ['@monaco-editor/react'],
          storage: ['idb'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})