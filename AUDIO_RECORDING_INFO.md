# Audio Recording & Engagement Data Format

## Audio Recording Flow

### Frontend (Browser/iOS)
- **Format**: WebM (audio/webm;codecs=opus)
- **Recording**: Uses `MediaRecorder` API
- **Location**: Recorded in browser memory, sent to backend when stopping

### Backend Processing
- **Received**: WebM file from frontend
- **Conversion**: WebM → WAV (using pydub, requires ffmpeg)
- **Storage**: Saved to `data/audio/audio_{session_id}.wav`
- **Transcription**: WAV file is processed by `speech_recognition` library

## Engagement Data Structure

The engagement data JSON contains:

```json
{
  "metadata": {
    "lecture_name": "Lecture Name",
    "start_time": "2025-11-16T10:32:17.481110",
    "end_time": "2025-11-16T10:33:49.381019",
    "duration_seconds": 91.9,
    "total_data_points": 67,
    "audio_file": "audio_filename.wav",  // Reference to audio file
    "student_id": null,
    "course": null
  },
  "engagement_timeline": [
    {
      "timestamp": "2025-11-16T10:32:26.565588",
      "elapsed_seconds": 0.0,
      "scores": {
        "concentrated": 28.62,  // 0-100 scale
        "engaged": 17.25,        // 0-100 scale
        "confused": 19.02,       // 0-100 scale
        "bored": 13.18          // 0-100 scale
      }
    },
    // ... more timeline entries
  ],
  "summary_statistics": {
    "avg_scores": {
      "concentrated": 45.23,
      "engaged": 32.15,
      "confused": 18.45,
      "bored": 12.67
    },
    "key_moments": [...]
  }
}
```

## Key Points

1. **Audio Format**:
   - Frontend sends: **WebM** (browser-native format)
   - Backend converts to: **WAV** (for transcription)
   - Stored as: **WAV file** in `data/audio/`

2. **Engagement Scores**:
   - All scores are on **0-100 scale** (not 0-1)
   - Thresholds in MCQ generation use **20-30** (not 0.2-0.3)

3. **Audio File Reference**:
   - Stored in `metadata.audio_file` as filename only
   - Full path: `data/audio/{audio_file}`
   - Can be downloaded via: `GET /api/engagement/audio/<session_id>`

4. **Transcription**:
   - Only happens if WAV file exists
   - Uses Google Speech Recognition API
   - Processes in 1-minute chunks
   - Returns transcript with timestamps and summaries

## API Endpoints for Audio

- `POST /api/engagement/stop` - Returns audio file info in response
- `GET /api/engagement/data/<session_id>` - Includes audio file info
- `GET /api/engagement/audio/<session_id>` - Download audio file

