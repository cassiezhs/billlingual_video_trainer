'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {video && <h1 className="text-3xl font-bold mb-6">{video.title}</h1>}

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* SINGLE video element - directly in component, no wrapper, no key, stable src */}
            <video
              ref={videoRef}
              src={videoSrc || undefined}
              controls
              className="w-full rounded"
              preload="metadata"
            />

            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Playback Speed:</label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => {
                    const speed = parseFloat(e.target.value)
                    setPlaybackSpeed(speed)
                    if (videoRef.current) {
                      videoRef.current.playbackRate = speed
                    }
                  }}
                  className="px-3 py-1 border rounded"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatSentence}
                  onChange={(e) => setRepeatSentence(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Single sentence repeat</span>
              </label>

              {video?.status === 'ready' && (
                <button
                  type="button"
                  onClick={handleTranslate}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Translate to Chinese
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">Loading...</p>
            </div>
          )}

          {video?.status === 'processing' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">Video is being processed, please wait...</p>
            </div>
          )}

          {!video && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Video not found</p>
            </div>
          )}

          {video?.status === 'ready' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Sentences</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {sentences.map((sentence) => (
                  <div
                    key={sentence.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSentenceClick(sentence, e as any)
                      }
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors
                      ${currentSentenceId === sentence.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}
                      ${sentence.isStarred ? 'border-yellow-300 bg-yellow-50' : ''}`}
                    onClick={(e) => handleSentenceClick(sentence, e)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-gray-800 mb-2">{sentence.textEn}</p>
                        {sentence.textZh && (
                          <p className="text-gray-600 text-sm">{sentence.textZh}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(sentence.startMs)} - {formatTime(sentence.endMs)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleStar(sentence.id, e)}
                        className="text-yellow-500 hover:text-yellow-600"
                        aria-label={sentence.isStarred ? 'Unstar sentence' : 'Star sentence'}
                      >
                        {sentence.isStarred ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
