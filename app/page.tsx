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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Bilingual Video Trainer
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Upload English videos and practice listening and translation sentence by sentence
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Video File
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {file && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium
                hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </button>

            {progress && (
              <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
                {progress}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
