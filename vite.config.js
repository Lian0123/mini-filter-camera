import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function normalizeBasePath(value) {
  if (!value || value === '/') {
    return '/'
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function isRootPagesRepository(value) {
  return value?.endsWith('.github.io')
}

function resolveBasePath() {
  const explicitBase = process.env.VITE_PUBLIC_BASE
  if (explicitBase) {
    return normalizeBasePath(explicitBase)
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (repositoryName) {
    if (isRootPagesRepository(repositoryName)) {
      return '/'
    }

    return normalizeBasePath(repositoryName)
  }

  const folderName = process.cwd().split('/').filter(Boolean).at(-1)
  if (isRootPagesRepository(folderName)) {
    return '/'
  }

  return normalizeBasePath(folderName)
}

const basePath = resolveBasePath()

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['camera-icon.svg', 'camera-maskable.svg'],
      manifest: {
        name: 'Mini Filter Camera',
        short_name: 'FilterCam',
        description: '可安裝到手機的濾鏡相機，支援大量濾鏡、前後鏡頭切換與手電筒控制。',
        theme_color: '#1f6feb',
        background_color: '#09111f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: 'camera-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'camera-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ]
})
