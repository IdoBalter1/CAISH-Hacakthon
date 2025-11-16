# Testing Guide - UI Recording & Transcript Location

## 🚀 Quick Start

### 1. Start Both Servers

**Backend API:**
```bash
cd /Users/duoyun/Desktop/CAISH-Hacakthon
source venv/bin/activate
python3 api_server.py
```
Or use: `./start_api.sh`

**Frontend:**
```bash
cd /Users/duoyun/Desktop/CAISH-Hacakthon/frontend
npm run dev
```

### 2. Open the UI
Open your browser to: **http://localhost:5173**

## 📹 Testing the Recording

### Step-by-Step:

1. **Click "Engagement Monitor" button**
2. **Click "Start Recording"**
   - Browser will ask for camera/microphone permissions
   - Allow both permissions
3. **Speak or play audio** for at least 10-30 seconds
4. **Click "Stop Recording"**
   - Audio will be sent to backend
   - Backend will process and transcribe

## 📁 File Locations

### Transcript Files:
**Location**: `data/transcripts/transcript_{audio_filename}.json`

**Example path:**
```
/Users/duoyun/Desktop/CAISH-Hacakthon/data/transcripts/transcript_audio_abc123.wav.json
```

### Audio Files:
**Location**: `data/audio/`

**Formats:**
- `uploaded_{session_id}.webm` - Original from frontend
- `audio_{session_id}.wav` - Converted WAV file for transcription

### Engagement Data:
**Location**: `data/engagement/engagement_{lecture_name}_{timestamp}.json`

## 🔍 Viewing Transcripts

### Method 1: Via API
```bash
# Get transcript for a session
curl http://localhost:8000/api/engagement/transcript/{session_id}
```

### Method 2: Direct File Access
```bash
# List all transcripts
ls -lah data/transcripts/

# View latest transcript
cat data/transcripts/transcript_*.json | tail -1 | python3 -m json.tool
```

### Method 3: In Browser Console
After stopping recording, check the response:
```javascript
// In browser console (F12)
// The response from stop_engagement will include:
{
  transcriptFile: {
    path: "data/transcripts/transcript_...",
    exists: true,
    size: 1234
  }
}
```

## 📊 Transcript Format

The transcript JSON contains:
```json
[
  {
    "start_time": "2025-11-16T10:32:26Z",
    "end_time": "2025-11-16T10:33:26Z",
    "text": "Transcribed text here...",
    "summary": {
      "5_word_summary": "Brief summary",
      "20_word_summary": "Longer summary here"
    }
  }
]
```

## 🧪 Quick Test Commands

```bash
# Check if servers are running
curl http://localhost:5173 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"
curl http://localhost:8000/api/health && echo "✅ Backend running" || echo "❌ Backend not running"

# List all transcripts
ls -lh data/transcripts/ 2>/dev/null || echo "No transcripts yet"

# View latest engagement data
ls -t data/engagement/*.json 2>/dev/null | head -1 | xargs cat | python3 -m json.tool | head -50
```

## 📝 Notes

- Transcripts are saved automatically after audio processing
- Each session gets its own transcript file
- Transcripts include timestamps and AI-generated summaries
- If transcription fails, check backend logs: `tail -f /tmp/api_server.log`

