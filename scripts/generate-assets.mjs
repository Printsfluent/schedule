import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconSvg = join(root, 'assets/icon.svg')

async function svgToPng(svgPath, pngPath, size) {
  const svg = readFileSync(svgPath)
  await sharp(svg).resize(size, size).png().toFile(pngPath)
}

await svgToPng(iconSvg, join(root, 'assets/icon.png'), 1024)
await svgToPng(join(root, 'assets/splash.svg'), join(root, 'assets/splash.png'), 2732)
copyFileSync(iconSvg, join(root, 'public/logo.svg'))
console.log('Generated assets/icon.png, assets/splash.png, synced public/logo.svg')
