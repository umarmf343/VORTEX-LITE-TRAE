const { spawn } = require('node:child_process')
const { resolve } = require('node:path')

const nextBin = resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const userArgs = process.argv.slice(2)

let requestedBundler = null
const forwardedArgs = []

for (const arg of userArgs) {
  if (arg === '--no-turbo') {
    console.warn(
      'Warning: "--no-turbo" has been replaced with webpack mode. Falling back to webpack.'
    )
    requestedBundler = 'webpack'
    continue
  }

  if (arg === '--webpack') {
    requestedBundler = 'webpack'
  } else if (arg === '--turbo' || arg === '--turbopack') {
    requestedBundler = 'turbopack'
  }

  forwardedArgs.push(arg)
}

if (!requestedBundler) {
  const envPreference = process.env.NEXT_DEV_BUNDLER?.toLowerCase()
  if (envPreference === 'turbopack') {
    requestedBundler = 'turbopack'
  } else {
    requestedBundler = 'webpack'
  }
}

if (requestedBundler === 'webpack' && !forwardedArgs.includes('--webpack')) {
  forwardedArgs.push('--webpack')
}

const child = spawn(process.execPath, [nextBin, 'dev', ...forwardedArgs], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})

child.on('error', (error) => {
  console.error('Failed to start Next.js:', error)
  process.exit(1)
})
