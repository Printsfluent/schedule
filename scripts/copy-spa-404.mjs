import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

const index = join('dist', 'index.html')
const notFound = join('dist', '404.html')

if (existsSync(index)) {
  copyFileSync(index, notFound)
}
