import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync, statSync, createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || 'mp4'
  const mimeTypes: { [key: string]: string } = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  }
  return mimeTypes[ext] || 'video/mp4'
}

function parseRange(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
  // Format: "bytes=start-end" or "bytes=start-"
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (!match) return null

  const start = parseInt(match[1], 10)
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

  // Validate range
  if (start < 0 || start >= fileSize || end < start || end >= fileSize) {
    return null
  }

  return { start, end }
}

function streamToReadableStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      nodeStream.on('end', () => {
        controller.close()
      })
      nodeStream.on('error', (err) => {
        controller.error(err)
      })
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
    })

    if (!video || !existsSync(video.filePath)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Get file stats
    const stats = await stat(video.filePath)
    const fileSize = stats.size
    const contentType = getContentType(video.filePath)

    // Check for Range header
    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      // Parse range
      const range = parseRange(rangeHeader, fileSize)
      
      if (!range) {
        // Invalid range, return 416 Range Not Satisfiable
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          },
        })
      }

      const { start, end } = range
      const chunkSize = end - start + 1

      // Create read stream for the range
      const stream = createReadStream(video.filePath, {
        start,
        end,
      })

      // Convert Node stream to Web ReadableStream
      const readableStream = streamToReadableStream(stream)

      // Return 206 Partial Content
      return new NextResponse(readableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } else {
      // No Range header - return full file
      const stream = createReadStream(video.filePath)
      const readableStream = streamToReadableStream(stream)

      return new NextResponse(readableStream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }
  } catch (error) {
    console.error('Error serving video file:', error)
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    )
  }
}
