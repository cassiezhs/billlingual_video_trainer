import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sentences = await prisma.sentence.findMany({
      where: {
        videoId: params.id,
        textZh: null,
      },
    })

    const openaiKey = process.env.OPENAI_API_KEY

    for (const sentence of sentences) {
      let translation = ''

      if (openaiKey) {
        // Use OpenAI API for translation
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a translator. Translate English to Simplified Chinese.',
                },
                {
                  role: 'user',
                  content: `Translate this sentence to Simplified Chinese: "${sentence.textEn}"`,
                },
              ],
              temperature: 0.3,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            translation = data.choices[0]?.message?.content?.trim() || ''
          }
        } catch (error) {
          console.error('OpenAI translation error:', error)
        }
      }

      // Fallback to mock translation if OpenAI fails or is not available
      if (!translation) {
        translation = `[Translation] ${sentence.textEn}`
      }

      await prisma.sentence.update({
        where: { id: sentence.id },
        data: { textZh: translation },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error translating:', error)
    return NextResponse.json(
      { error: 'Failed to translate' },
      { status: 500 }
    )
  }
}
