import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const workspaceRoot = process.cwd()
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === 'true'

function removeIfExists(targetPath) {
  rmSync(targetPath, { recursive: true, force: true })
}

if (isGitHubActionsBuild) {
  removeIfExists(join(workspaceRoot, 'dist'))
} else {
  removeIfExists(join(workspaceRoot, 'assets'))
  removeIfExists(join(workspaceRoot, 'index.html'))
  removeIfExists(join(workspaceRoot, 'manifest.webmanifest'))
  removeIfExists(join(workspaceRoot, 'sw.js'))

  for (const fileName of readdirSync(workspaceRoot)) {
    if (fileName.startsWith('workbox-') && fileName.endsWith('.js')) {
      removeIfExists(join(workspaceRoot, fileName))
    }
  }
}