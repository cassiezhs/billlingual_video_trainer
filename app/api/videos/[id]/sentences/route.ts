import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sentences = await prisma.sentence.findMany({
      where: { videoId: params.id },
      orderBy: { startMs: 'asc' },
    })

    return NextResponse.json(sentences)
  } catch (error) {
    console.error('Error fetching sentences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sentences' },
      { status: 500 }
    )
  }
}
