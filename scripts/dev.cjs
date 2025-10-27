const { spawn } = require('node:child_process')
const { resolve } = require('node:path')

const nextBin = resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const userArgs = process.argv.slice(2)
const filteredArgs = userArgs.filter((arg) => arg !== '--no-turbo')

if (userArgs.length !== filteredArgs.length) {
  console.warn('Warning: "--no-turbo" is no longer supported in Next.js 16 and will be ignored.')
}

const child = spawn(process.execPath, [nextBin, 'dev', ...filteredArgs], {
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
