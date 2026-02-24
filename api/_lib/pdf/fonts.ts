// api/_lib/pdf/fonts.ts
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load Inter font as base64 for embedding in HTML
export function loadFontAsBase64(): { regular: string; bold: string } | null {
  const possiblePaths = [
    {
      regular: path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf'),
      bold: path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf'),
    },
    {
      regular: path.join(__dirname, '../../_assets/fonts/Inter-Regular.ttf'),
      bold: path.join(__dirname, '../../_assets/fonts/Inter-Bold.ttf'),
    },
  ]

  for (const paths of possiblePaths) {
    try {
      if (fs.existsSync(paths.regular)) {
        const regularBuffer = fs.readFileSync(paths.regular)
        const boldBuffer = fs.existsSync(paths.bold)
          ? fs.readFileSync(paths.bold)
          : regularBuffer
        return {
          regular: regularBuffer.toString('base64'),
          bold: boldBuffer.toString('base64'),
        }
      }
    } catch (e) {
      // Continue to next path
    }
  }
  return null
}
