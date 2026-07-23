import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid skill slug' },
      { status: 400 }
    )
  }

  const skillDir = path.join(process.cwd(), '..', 'plugins', 'all-skills', 'skills', slug)

  if (!fs.existsSync(skillDir) || !fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
    return NextResponse.json(
      { error: 'Skill not found' },
      { status: 404 }
    )
  }

  const zip = new JSZip()

  function addDirectoryToZip(dirPath: string, zipPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        addDirectoryToZip(fullPath, entryZipPath)
      } else {
        zip.file(entryZipPath, fs.readFileSync(fullPath))
      }
    }
  }

  addDirectoryToZip(skillDir, slug)

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}.zip"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
