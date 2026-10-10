import { spawnSync } from 'node:child_process'

// Store bundles are served from the app root. The Pages workflow sets
// VITE_BASE=/family-book-club/ itself and does not use this script.
const env = { ...process.env, VITE_BASE: '/' }

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    env,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('node_modules/typescript/lib/tsc.js', ['-b'])
run('node_modules/vite/bin/vite.js', ['build'])
