'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

interface Video {
  id: string
  title: string
  filePath: string
  status: string
  fromLang: string
  toLang: string
}

interface Sentence {
  id: string
  startMs: number
  endMs: number
  textEn: string
  textZh: string | null
  isStarred: boolean
}

export default function VideoPage() {
  const params = useParams()
  const videoId = params.id as string
  const [video, setVideo] = useState<Video | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [loading, setLoading] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [repeatSentence, setRepeatSentence] = useState(false)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [currentSentenceId, setCurrentSentenceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyStarred, setShowOnlyStarred] = useState(false)

  // SINGLE source of truth - ONE ref for ONE video element
  const videoRef = useRef<HTMLVideoElement>(null)

  // Refs for loop boundaries to avoid stale state in timeupdate handler
  const loopStartRef = useRef<number | null>(null)
  const loopEndRef = useRef<number | null>(null)
  const repeatSentenceRef = useRef<boolean>(false)

  // Stable video src using useMemo - only changes when videoId changes
  const videoSrc = useMemo(() => {
    if (!videoId) return undefined
    return `/api/videos/${videoId}/file`
  }, [videoId])

  const filteredSentences = useMemo(() => {
    const base = showOnlyStarred ? sentences.filter((s) => s.isStarred) : sentences
    const q = searchQuery.trim().toLowerCase()
    if (!q) return base
    return base.filter((s) => s.textEn.toLowerCase().includes(q) || (s.textZh?.toLowerCase().includes(q) ?? false))
  }, [sentences, showOnlyStarred, searchQuery])

  // Sync refs when state changes
  useEffect(() => {
    loopStartRef.current = loopStart
    loopEndRef.current = loopEnd
    repeatSentenceRef.current = repeatSentence
  }, [loopStart, loopEnd, repeatSentence])

  useEffect(() => {
    fetchVideo()
    fetchSentences()

    // Poll for sentences if video is processing
    const interval = setInterval(() => {
      if (video?.status === 'processing') {
        fetchSentences()
        fetchVideo()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [videoId, video?.status])

  // Handle timeupdate for looping - uses refs to avoid stale state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const isRepeatEnabled = repeatSentenceRef.current
      const start = loopStartRef.current
      const end = loopEndRef.current
      const current = video.currentTime

      if (isRepeatEnabled && start !== null && end !== null) {
        // If currentTime is outside the loop range, snap to start immediately
        if (current < start || current > end) {
          video.currentTime = start
          return
        }

        // If reached the end, loop back to start
        if (current >= end) {
          video.currentTime = start
        }
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, []) // Empty deps - uses refs instead of state

  const fetchVideo = async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}`)
      if (res.ok) {
        const data = await res.json()
        setVideo(data)
      }
    } catch (error) {
      console.error('Failed to fetch video:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSentences = async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}/sentences`)
      if (res.ok) {
        const data = await res.json()
        setSentences(data)
      }
    } catch (error) {
      console.error('Failed to fetch sentences:', error)
    }
  }

  // Simple, direct seek function
  const seekTo = async (startSec: number): Promise<void> => {
    const v = videoRef.current

    if (!v) {
      return
    }

    // Wait for metadata if needed
    if (v.readyState < 1) {
      await new Promise<void>((resolve) => {
        const onLoadedMetadata = () => {
          v.removeEventListener('loadedmetadata', onLoadedMetadata)
          resolve()
        }
        v.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
      })
    }

    // Simple seek: pause, set time, play
    v.pause()
    v.currentTime = startSec

    try {
      await v.play()
    } catch (err) {
      console.error('Playback failed:', err)
    }
  }

  const handleSentenceClick = async (sentence: Sentence, e: React.MouseEvent) => {
    // Prevent any navigation or default behavior
    e.preventDefault()
    e.stopPropagation()

    if (!videoRef.current) {
      return
    }

    const start = sentence.startMs / 1000
    const end = sentence.endMs / 1000

    // Only change these states - DO NOT change videoSrc
    setCurrentSentenceId(sentence.id)

    // Set playback speed
    videoRef.current.playbackRate = playbackSpeed

    // If repeat mode is enabled, set loop boundaries BEFORE seeking
    // This ensures the loop is active immediately when we jump to the new sentence
    if (repeatSentence) {
      // Update state and refs immediately
      setLoopStart(start)
      setLoopEnd(end)
      loopStartRef.current = start
      loopEndRef.current = end
    } else {
      setLoopStart(null)
      setLoopEnd(null)
      loopStartRef.current = null
      loopEndRef.current = null
    }

    // Now seek to the sentence start - loop boundaries are already set
    await seekTo(start)

    // After seek completes, ensure we're within loop bounds if repeat is enabled
    if (repeatSentence && videoRef.current) {
      const current = videoRef.current.currentTime
      if (current < start || current > end) {
        videoRef.current.currentTime = start
      }
    }
  }

  const toggleStar = async (sentenceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    try {
      const res = await fetch(`/api/sentences/${sentenceId}/star`, {
        method: 'POST',
      })
      if (res.ok) {
        fetchSentences()
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handleTranslate = async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}/translate`, {
        method: 'POST',
      })
      if (res.ok) {
        fetchSentences()
      }
    } catch (error) {
      console.error('Failed to translate:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        {video && (
          <header className="mb-8 w-full rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 px-6 py-6 text-white shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{video.title}</h1>
                <p className="mt-1 text-sm text-white/80">
                  Practice sentence-by-sentence with repeat loops and translation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={video.status} />
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white/90">
                  {video.fromLang} → {video.toLang}
                </span>
              </div>
            </div>
          </header>
        )}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading video details…</p>
          </div>
        )}

        {!video && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-rose-700">Video not found.</p>
          </div>
        )}

        {video?.status === 'processing' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-amber-700">Video is being processed — check back in a moment.</p>
          </div>
        )}

        {video && (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <video
                  ref={videoRef}
                  src={videoSrc || undefined}
                  controls
                  className="w-full rounded-2xl bg-slate-950"
                  preload="metadata"
                />

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">Playback</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Speed</span>
                        <select
                          value={playbackSpeed}
                          onChange={(e) => {
                            const speed = parseFloat(e.target.value)
                            setPlaybackSpeed(speed)
                            if (videoRef.current) {
                              videoRef.current.playbackRate = speed
                            }
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
                        >
                          <option value="0.5">0.5x</option>
                          <option value="0.75">0.75x</option>
                          <option value="1">1x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2">2x</option>
                        </select>
                      </div>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={repeatSentence}
                        onChange={(e) => setRepeatSentence(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Repeat current sentence</span>
                    </label>

                    {video.status === 'ready' && (
                      <button
                        type="button"
                        onClick={handleTranslate}
                        className="mt-4 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        Translate to Chinese
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Quick tips</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      <li>• Click a sentence to jump to that part of the video.</li>
                      <li>• Use repeat mode to listen multiple times in a row.</li>
                      <li>• Star sentences you want to review later.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-800">Sentence list</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {filteredSentences.length} shown
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 px-3">
                      <span className="text-slate-400">🔍</span>
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sentences"
                        className="h-8 w-40 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowOnlyStarred((prev) => !prev)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        showOnlyStarred
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {showOnlyStarred ? 'Showing starred' : 'Show starred'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-2">
                  {filteredSentences.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No sentences match your filters.
                    </div>
                  ) : (
                    filteredSentences.map((sentence) => (
                      <SentenceRow
                        key={sentence.id}
                        sentence={sentence}
                        isActive={sentence.id === currentSentenceId}
                        onClick={handleSentenceClick}
                        onToggleStar={toggleStar}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">Video metadata</h3>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <MetaRow label="Video ID" value={video.id} />
                  <MetaRow label="Status" value={video.status} />
                  <MetaRow label="From" value={video.fromLang} />
                  <MetaRow label="To" value={video.toLang} />
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">Keyboard shortcuts</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li>• Select sentences with arrow keys and press Enter to jump.</li>
                  <li>• Use spacebar to play/pause video (native control).</li>
                  <li>• Toggle repeat mode for focused listening.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function SentenceRow({
  sentence,
  isActive,
  onClick,
  onToggleStar,
}: {
  sentence: Sentence
  isActive: boolean
  onClick: (sentence: Sentence, e: React.MouseEvent) => void
  onToggleStar: (sentenceId: string, e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(sentence, e)}
      className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        isActive
          ? 'border-indigo-300 bg-indigo-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">{sentence.textEn}</p>
          {sentence.textZh && <p className="mt-1 text-sm text-slate-600">{sentence.textZh}</p>}
          <p className="mt-2 text-xs text-slate-400">
            {formatTime(sentence.startMs)} - {formatTime(sentence.endMs)}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => onToggleStar(sentence.id, e)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
            sentence.isStarred ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          aria-label={sentence.isStarred ? 'Unstar sentence' : 'Star sentence'}
        >
          {sentence.isStarred ? '★' : '☆'}
        </button>
      </div>
    </button>
  )
}

function MetaRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700 truncate">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isReady = status === 'ready'
  const isProcessing = status === 'processing'

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        isReady
          ? 'bg-emerald-100 text-emerald-700'
          : isProcessing
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700'
      }`}
    >
      {isReady ? 'Ready' : isProcessing ? 'Processing' : status}
    </span>
  )
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
