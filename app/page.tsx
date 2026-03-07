'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress('Uploading...')

    const formData = new FormData()
    formData.append('video', file)

    try {
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()
      setProgress('Upload successful! Processing video...')
      
      // Redirect to video page
      router.push(`/videos/${data.id}`)
    } catch (error) {
      setProgress('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              New: Smart sentence looping & translation export
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Train your listening & translation with videos
            </h1>

            <p className="text-lg leading-relaxed text-slate-600">
              Upload an English video, let the system segment it into sentences, and practice each line with playback controls, repeat loops, and translation support.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <FeatureCard emoji="🎬" title="Upload" description="Drop a video and start the processing pipeline." />
              <FeatureCard emoji="🧠" title="Segment" description="Automatic sentence detection with time-aligned playback." />
              <FeatureCard emoji="💬" title="Learn" description="Listen, loop, and translate to build confidence." />
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-200/60 to-blue-200/40 shadow-xl" />
            <div className="relative rounded-3xl border border-white/60 bg-white/80 p-8 shadow-lg backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">Upload a video</h2>
              <p className="mt-1 text-sm text-slate-600">
                Supported formats: MP4, MOV, WEBM. The file is processed on the server and made available for practice.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Select video file
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {file && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500"
                >
                  <span className="text-lg">⏫</span>
                  {uploading ? 'Uploading...' : 'Start processing'}
                </button>

                {progress && (
                  <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700 ring-1 ring-indigo-200">
                    {progress}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <HighlightCard
            title="Smart loop playback"
            description="Jump to a sentence and loop it automatically to improve listening and pronunciation."
            icon="🔁"
          />
          <HighlightCard
            title="Star favorite lines"
            description="Mark sentences you want to revisit and quickly review them later."
            icon="⭐"
          />
          <HighlightCard
            title="Translate on demand"
            description="Generate translations for any segment to deepen comprehension."
            icon="🌐"
          />
        </section>
      </div>
    </div>
  )
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
        {emoji}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  )
}

function HighlightCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}
