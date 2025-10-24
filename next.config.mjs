import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    /**
     * Ensure Turbopack resolves modules from this project even when other lockfiles
     * exist higher up the directory tree (e.g. on Windows user folders).
     */
    root: projectRoot,
  },
}

export default nextConfig
