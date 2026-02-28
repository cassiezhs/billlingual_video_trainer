# Bilingual Video Trainer - Project Architecture & Vibe Coding Summary

## 1. High-Level Architecture Overview

### System Components
- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend API**: Next.js API Routes (upload, video streaming, sentences, translation)
- **Worker**: Python script + FFmpeg + OpenAI Whisper API
- **Database**: SQLite + Prisma ORM
- **Storage**: Local file system (videos/audio folders)

### End-to-End Data Flow
1. User uploads video → POST `/api/videos/upload` saves file to `storage/videos/`
2. API creates Video record (status: "processing") → spawns Python worker
3. Python worker extracts audio with FFmpeg → saves to `storage/audio/`
4. Worker transcribes audio via OpenAI Whisper API → gets timestamped segments
5. Segments converted to sentences (merge/split logic) → saved via Node.js subprocess
6. Database updated: Sentence records created, Video status → "ready"
7. Frontend polls for sentences → displays clickable list with timestamps
8. User clicks sentence → video seeks via HTTP Range requests → plays with A-B loop

---

## 2. Project File Map

```
双语App/
├── app/
│   ├── page.tsx                          # Home page: video upload UI
│   ├── layout.tsx                        # Root layout with metadata
│   ├── globals.css                       # Tailwind CSS styles
│   ├── videos/[id]/page.tsx              # Video player + sentence list + repeat loop
│   └── api/
│       ├── videos/
│       │   ├── upload/route.ts           # Handle multipart upload, save file, spawn worker
│       │   └── [id]/
│       │       ├── route.ts              # GET video metadata
│       │       ├── file/route.ts         # HTTP Range streaming for video seeking
│       │       ├── sentences/route.ts   # GET sentence list for video
│       │       └── translate/route.ts    # POST translate sentences (OpenAI GPT)
│       └── sentences/[id]/star/route.ts  # POST toggle sentence star
├── lib/
│   └── prisma.ts                         # Prisma client singleton
├── prisma/
│   └── schema.prisma                     # Video & Sentence models
├── worker/
│   └── process_video.py                  # FFmpeg extract + Whisper transcribe + sentence split
└── storage/
    ├── videos/                           # Uploaded video files
    └── audio/                            # Extracted WAV files
```

---

## 3. Lines of Code (LOC) Breakdown

### Total LOC: ~1,177 lines

**By Area:**
- **Frontend (TS/TSX)**: ~506 lines
  - `app/videos/[id]/page.tsx`: 368 lines (video player + sentence list)
  - `app/page.tsx`: 111 lines (upload page)
  - `app/layout.tsx`: 20 lines
  - `app/globals.css`: 7 lines

- **API Routes (TS)**: ~368 lines
  - `app/api/videos/[id]/file/route.ts`: 136 lines (Range streaming)
  - `app/api/videos/upload/route.ts`: 67 lines
  - `app/api/videos/[id]/translate/route.ts`: 75 lines
  - `app/api/videos/[id]/route.ts`: 26 lines
  - `app/api/videos/[id]/sentences/route.ts`: 23 lines
  - `app/api/sentences/[id]/star/route.ts`: 31 lines
  - `lib/prisma.ts`: 10 lines

- **Worker (Python)**: 269 lines
  - `worker/process_video.py`: 269 lines

- **Prisma Schema**: 34 lines
  - `prisma/schema.prisma`: 34 lines

### Top 10 Largest Files
1. `app/videos/[id]/page.tsx` - 368 lines
2. `worker/process_video.py` - 269 lines
3. `app/api/videos/[id]/file/route.ts` - 136 lines
4. `app/page.tsx` - 111 lines
5. `app/api/videos/[id]/translate/route.ts` - 75 lines
6. `app/api/videos/upload/route.ts` - 67 lines
7. `app/api/sentences/[id]/star/route.ts` - 31 lines
8. `prisma/schema.prisma` - 34 lines
9. `app/api/videos/[id]/route.ts` - 26 lines
10. `app/api/videos/[id]/sentences/route.ts` - 23 lines

---

## 4. Vibe Coding (AI-Assisted Development) Reflections

### What Cursor/AI Accelerated
- Initial project scaffolding (Next.js setup, Prisma schema, file structure)
- API route boilerplate generation
- React component structure and hooks
- TypeScript type definitions
- Tailwind CSS styling patterns
- Basic error handling patterns

### What Required Human Reasoning/Debugging
- **HTTP Range request implementation**: Browser seeking failed → discovered missing Range support → implemented 206 Partial Content with byte streaming
- **Video element remounting bug**: Debug panel revealed React remounting video → fixed with useMemo, removed conditional rendering, stable refs
- **FFmpeg path configuration**: Windows absolute path needed → hardcoded path in Python script
- **OpenAI API quota/errors**: Rate limits and API failures → added fallback to mock transcription
- **State synchronization**: Loop boundaries stale in timeupdate handler → used refs instead of state
- **Python-Node.js bridge**: Python worker needs to save to Prisma → created temporary Node.js script execution

### Pros & Cons

**Pros:**
- Rapid prototyping: 1,177 LOC in short time
- Type safety: TypeScript caught many errors early
- Code suggestions: AI helped with React patterns, async/await
- Documentation: AI generated README and comments

**Cons:**
- Debugging complexity: AI-generated code had subtle bugs (remounting, Range requests)
- Over-engineering: Some solutions more complex than needed initially
- Platform-specific issues: Windows paths, Python/Node interop required manual fixes
- API integration: OpenAI errors needed manual handling and fallbacks

### Lessons Learned
- **Always verify browser APIs**: Range requests are critical for video seeking
- **React refs vs state**: Use refs for values accessed in event handlers to avoid stale closures
- **Debug tools essential**: Debug panel revealed root cause of remounting issue
- **Test with real data**: Mock data hid Range request requirement
- **Platform awareness**: Windows vs Mac path handling needed explicit attention

---

## Slide Format (Copy-Paste Ready)

### Slide 1: Architecture Overview
**Bilingual Video Trainer - System Architecture**

• Frontend: Next.js 14 + TypeScript + Tailwind
• Backend: Next.js API Routes
• Worker: Python + FFmpeg + Whisper API
• Database: SQLite + Prisma
• Storage: Local file system

**Data Flow:**
1. Upload → Save file → Create DB record
2. Spawn Python worker → Extract audio
3. Transcribe → Convert to sentences
4. Save to DB → Frontend displays
5. Click sentence → Range request → Seek & play

### Slide 2: Project Structure
**Key Files & Responsibilities**

• `app/videos/[id]/page.tsx` - Video player + sentence list
• `app/api/videos/[id]/file/route.ts` - HTTP Range streaming
• `worker/process_video.py` - FFmpeg + Whisper transcription
• `prisma/schema.prisma` - Video/Sentence models
• `app/api/videos/upload/route.ts` - File upload handler

### Slide 3: Code Metrics
**Lines of Code: ~1,177 total**

• Frontend (TS/TSX): 506 lines
• API Routes (TS): 368 lines
• Worker (Python): 269 lines
• Prisma Schema: 34 lines

**Largest Files:**
1. Video page: 368 lines
2. Python worker: 269 lines
3. Range streaming: 136 lines

### Slide 4: AI-Assisted Development
**What AI Accelerated:**
• Project scaffolding
• Component structure
• Type definitions
• Styling patterns

**What Required Human Debugging:**
• HTTP Range requests (video seeking)
• React remounting bugs
• FFmpeg path configuration
• OpenAI API error handling
• State synchronization issues

**Lessons:**
• Verify browser APIs early
• Use refs for event handlers
• Debug tools are essential
• Test with real data
• Platform-specific code needs attention
