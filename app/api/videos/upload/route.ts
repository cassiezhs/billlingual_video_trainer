import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { spawn } from 'child_process'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('video') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create storage directories if they don't exist
    const videosDir = join(process.cwd(), 'storage', 'videos')
    const audioDir = join(process.cwd(), 'storage', 'audio')

    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true })
    }
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true })
    }

    // Save video file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = join(videosDir, fileName)

    await writeFile(filePath, buffer)

    // Create video record
    const video = await prisma.video.create({
      data: {
        title: file.name,
        filePath: filePath,
        status: 'processing',
        fromLang: 'en',
        toLang: 'zh',
      },
    })

    // Start processing in background
    const pythonScript = join(process.cwd(), 'worker', 'process_video.py')
    // Try 'python3' first (Mac/Linux), fallback to 'python' (Windows)
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3'
    const child = spawn(pythonCmd, [pythonScript, video.id, filePath], {
      cwd: process.cwd(),
      env: { ...process.env },      // 关键：确保传递 OPENAI_API_KEY
      stdio: 'inherit',             // 关键：直接把 py 输出打到这个终端
      shell: false,                 // 去掉你现在看到的 shell 警告
    })

    return NextResponse.json({ id: video.id, title: video.title })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    )
  }
}
