import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

function familyBookClubManifest(): Plugin {
  let base = '/'
  const manifest = () => ({
    name: 'Book Club',
    short_name: 'Book Club',
    description:
      'A book club you share with a code: add rules, nominate books, and present the next pick.',
    start_url: base,
    scope: base,
    display: 'standalone',
    background_color: '#f3eee4',
    theme_color: '#f3eee4',
    icons: [
      { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
  })

  return {
    name: 'family-book-club-manifest',
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== `${base}manifest.webmanifest` && path !== '/manifest.webmanifest') {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(JSON.stringify(manifest()))
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(manifest()),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), familyBookClubManifest()],
  base: process.env.VITE_BASE || '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'firebase-messaging-sw': 'src/firebase-messaging-sw.ts',
      },
      output: {
        entryFileNames(chunk) {
          if (chunk.name === 'firebase-messaging-sw') return '[name].js'
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
