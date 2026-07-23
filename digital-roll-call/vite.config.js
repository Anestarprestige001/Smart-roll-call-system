import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'AGS - Smart Roll Call',
        short_name: 'Smart Roll Call',
        description: 'A smart roll-call and attendance management system for Anestar schools.',
        theme_color: '#9c27b0',
        background_color: '#9c27b0',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'images.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'images.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})