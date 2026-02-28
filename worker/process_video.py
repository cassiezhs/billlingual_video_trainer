#!/usr/bin/env python3
"""
Process video: extract audio, transcribe, and create sentences.
"""

import sys
import os
import json
import subprocess
from pathlib import Path

FFMPEG = r"D:\ffmpeg\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe"
# Add parent directory to path to import prisma client
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def extract_audio(video_path: str, output_path: str) -> bool:
    """Extract audio from video using ffmpeg."""
    try:
        cmd = [
            FFMPEG,
            '-i', video_path,
            '-ar', '16000',  # Sample rate for Whisper
            '-ac', '1',      # Mono
            '-y',            # Overwrite output
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print("FFmpeg not found. Please install ffmpeg.", file=sys.stderr)
        return False

def transcribe_audio(audio_path: str) -> list:
    """
    Transcribe audio to segments with timestamps.
    Returns list of dicts: [{"start": float, "end": float, "text": str}, ...]
    """
    openai_key = os.getenv('OPENAI_API_KEY')
    print("OPENAI_API_KEY loaded:", bool(openai_key))
    if openai_key:
        print("OPENAI_API_KEY prefix:", openai_key[:7])

    
    if openai_key:
        # Use OpenAI Whisper API
        try:
            import requests
            print("requests module:", requests.__file__)
            print("requests version:", getattr(requests, "__version__", "unknown"))
            with open(audio_path, 'rb') as audio_file:
                files = {'file': audio_file}
                data = {
                    'model': 'whisper-1',
                    'response_format': 'verbose_json',
                }
                headers = {'Authorization': f'Bearer {openai_key}'}

                print("Calling OpenAI Whisper API...")

                response = requests.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    headers=headers,
                    files=files,
                    data={
                        'model': 'whisper-1',
                        'response_format': 'verbose_json',
                    },
                    timeout=300
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get('segments', [])
                else:
                    print("OpenAI status:", response.status_code, file=sys.stderr)
                    print("OpenAI body:", response.text[:500], file=sys.stderr)

        except Exception as e:
            print(f"OpenAI transcription error: {e}", file=sys.stderr)
    
    # Mock transcription for testing
    return generate_mock_transcript()

def generate_mock_transcript() -> list:
    """Generate a mock transcript for testing."""
    mock_segments = [
        {"start": 0.0, "end": 3.5, "text": "Hello, welcome to this video tutorial."},
        {"start": 3.5, "end": 7.2, "text": "Today we will learn about web development."},
        {"start": 7.2, "end": 11.8, "text": "First, let's start with the basics."},
        {"start": 11.8, "end": 15.5, "text": "We'll cover HTML, CSS, and JavaScript."},
        {"start": 15.5, "end": 19.0, "text": "These are the fundamental technologies."},
        {"start": 19.0, "end": 23.5, "text": "Let's begin with HTML structure."},
        {"start": 23.5, "end": 27.8, "text": "HTML provides the content structure."},
        {"start": 27.8, "end": 32.0, "text": "CSS is used for styling and layout."},
        {"start": 32.0, "end": 36.5, "text": "JavaScript adds interactivity to pages."},
        {"start": 36.5, "end": 40.0, "text": "Thank you for watching this tutorial."},
    ]
    return mock_segments

def segments_to_sentences(segments: list) -> list:
    """
    Convert transcription segments to sentences.
    Merge very short segments and split on punctuation.
    """
    sentences = []
    current_sentence = {"start": None, "end": None, "text": ""}
    
    for seg in segments:
        text = seg["text"].strip()
        if not text:
            continue
            
        # If current sentence is empty, start new one
        if not current_sentence["text"]:
            current_sentence["start"] = seg["start"]
            current_sentence["text"] = text
            current_sentence["end"] = seg["end"]
        else:
            # Check if we should split on punctuation
            if text[0].isupper() and current_sentence["text"][-1] in '.!?':
                # Save current sentence and start new one
                sentences.append(current_sentence.copy())
                current_sentence = {
                    "start": seg["start"],
                    "text": text,
                    "end": seg["end"]
                }
            else:
                # Merge with current sentence
                current_sentence["text"] += " " + text
                current_sentence["end"] = seg["end"]
        
        # If segment ends with sentence-ending punctuation, finalize sentence
        if text[-1] in '.!?':
            sentences.append(current_sentence.copy())
            current_sentence = {"start": None, "end": None, "text": ""}
    
    # Add remaining sentence if any
    if current_sentence["text"]:
        sentences.append(current_sentence)
    
    # Filter out very short sentences (less than 0.5 seconds)
    sentences = [s for s in sentences if s["end"] - s["start"] >= 0.5]
    
    return sentences

def save_sentences_to_db(video_id: str, sentences: list):
    """Save sentences to database using Prisma."""
    # Since we're in Python, we'll use a simple approach:
    # Write to a JSON file and have the Next.js API read it
    # Or use a direct database connection
    
    # For simplicity, we'll use subprocess to call a Node.js script
    # that uses Prisma to save the data
    
    script_path = Path(__file__).parent / 'save_sentences.js'
    
    # Create a temporary Node.js script to save sentences
    node_script = f"""
const {{ PrismaClient }} = require('@prisma/client');
const prisma = new PrismaClient();


async function main() {{
  const videoId = '{video_id}';
  const sentences = {json.dumps(sentences)};
  
  for (const sent of sentences) {{
    await prisma.sentence.create({{
      data: {{
        videoId: videoId,
        startMs: Math.round(sent.start * 1000),
        endMs: Math.round(sent.end * 1000),
        textEn: sent.text,
      }},
    }});
  }}
  
  await prisma.video.update({{
    where: {{ id: videoId }},
    data: {{ status: 'ready' }},
  }});
  
  await prisma.$disconnect();
}}

main().catch(console.error);
"""
    
    # Write and execute Node.js script
    with open(script_path, 'w') as f:
        f.write(node_script)
    project_root = Path(__file__).parent.parent
    original_cwd = os.getcwd()

    try:
        os.chdir(str(project_root))

        result = subprocess.run(
            ['node', str(script_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60,
            cwd=str(project_root),
        )

        print("[node stdout]")
        print(result.stdout)

        print("[node stderr]", file=sys.stderr)
        print(result.stderr, file=sys.stderr)

        if result.returncode != 0:
            raise RuntimeError("Node script failed")

    finally:
        os.chdir(original_cwd)
        if script_path.exists():
            script_path.unlink()


def main():
    if len(sys.argv) < 3:
        print("Usage: process_video.py <video_id> <video_path>", file=sys.stderr)
        sys.exit(1)
    
    video_id = sys.argv[1]
    video_path = sys.argv[2]
    
    # Setup paths
    project_root = Path(__file__).parent.parent
    audio_dir = project_root / 'storage' / 'audio'
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    audio_path = audio_dir / f"{video_id}.wav"
    
    print(f"Processing video: {video_path}")
    
    # Step 1: Extract audio
    print("Extracting audio...")
    if not extract_audio(video_path, str(audio_path)):
        print("Failed to extract audio", file=sys.stderr)
        sys.exit(1)
    
    # Step 2: Transcribe
    print("Transcribing audio...")
    segments = transcribe_audio(str(audio_path))
    
    if not segments:
        print("No transcription segments found", file=sys.stderr)
        sys.exit(1)
    
    # Step 3: Convert to sentences
    print("Converting to sentences...")
    sentences = segments_to_sentences(segments)
    
    # Step 4: Save to database
    print(f"Saving {len(sentences)} sentences to database...")
    save_sentences_to_db(video_id, sentences)
    
    print("Processing complete!")

if __name__ == '__main__':
    main()
