const { spawn } = require('node:child_process')
const { resolve } = require('node:path')

const nextBin = resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const port = process.env.PORT || '3000'
const host = process.env.HOST || '0.0.0.0'

const child = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', host], {
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
