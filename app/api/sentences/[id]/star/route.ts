import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sentence = await prisma.sentence.findUnique({
      where: { id: params.id },
    })

    if (!sentence) {
      return NextResponse.json({ error: 'Sentence not found' }, { status: 404 })
    }

    const updated = await prisma.sentence.update({
      where: { id: params.id },
      data: { isStarred: !sentence.isStarred },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error toggling star:', error)
    return NextResponse.json(
      { error: 'Failed to toggle star' },
      { status: 500 }
    )
  }
}
