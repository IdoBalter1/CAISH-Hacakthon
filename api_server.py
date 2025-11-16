"""
Flask API Server for Listant Backend
Integrates engagement monitoring, audio transcription, MCQ generation, and AI-powered analysis
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import uuid
from pathlib import Path
from datetime import datetime
import tempfile
import shutil

# Import backend modules
# EngagementMonitor and AudioRecorder are in engagement_monitor.py
# Some files import from 'face' which may be an alias
try:
    from engagement_monitor import EngagementMonitor, AudioRecorder
except ImportError:
    try:
        # Try creating face.py as an alias if it doesn't exist
        import sys
        import engagement_monitor as face_module
        sys.modules['face'] = face_module
        from face import EngagementMonitor, AudioRecorder
    except ImportError:
        print("Warning: Could not import EngagementMonitor. Some features may not work.")
        EngagementMonitor = None
        AudioRecorder = None

from audiotranscription import get_large_audio_transcription_fixed_interval, create_summary
from pose_question import pose_questions, parse_transcript
from convert_to_mcq_data import convert_questions_to_mcq
from modules.utils import init_anthropic_client, send_message, extract_json_from_claude_response

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# In-memory session storage (in production, use Redis or database)
sessions = {}

# Ensure directories exist
os.makedirs('data/sessions', exist_ok=True)
os.makedirs('data/audio', exist_ok=True)
os.makedirs('data/transcripts', exist_ok=True)
os.makedirs('output', exist_ok=True)


def audio_to_json(audio_path):
    """
    Convert audio file to JSON transcript format.
    Uses get_large_audio_transcription_fixed_interval and formats the output.
    """
    try:
        # Check if file exists and is a supported format
        audio_file = Path(audio_path)
        if not audio_file.exists():
            print(f"Audio file not found: {audio_path}")
            return []
        
        # Check file extension
        if audio_file.suffix.lower() not in ['.wav', '.webm', '.mp3', '.m4a']:
            print(f"Unsupported audio format: {audio_file.suffix}")
            return []
        
        # Transcribe audio in 1-minute chunks
        # Note: get_large_audio_transcription_fixed_interval expects WAV, may need conversion
        results_json = get_large_audio_transcription_fixed_interval(audio_path, minutes=1)
        
        # Parse JSON string to list
        if isinstance(results_json, str):
            results = json.loads(results_json)
        else:
            results = results_json
        
        # Format to match expected structure
        formatted_results = []
        for item in results:
            # Parse summary if it's a string
            summary = item.get('summary', {})
            if isinstance(summary, str):
                try:
                    summary = json.loads(summary)
                except:
                    summary = {"5_word_summary": summary[:50], "20_word_summary": summary}
            
            formatted_results.append({
                'start_time': datetime.fromtimestamp(item.get('start_time', 0)).isoformat() + 'Z',
                'end_time': datetime.fromtimestamp(item.get('end_time', 0)).isoformat() + 'Z',
                'text': item.get('text', ''),
                'summary': summary
            })
        
        # Save transcript to file for easy access
        transcript_file = Path('data/transcripts') / f"transcript_{audio_file.stem}.json"
        with open(transcript_file, 'w') as f:
            json.dump(formatted_results, f, indent=2)
        print(f"Transcript saved to: {transcript_file}")
        
        return formatted_results
    except Exception as e:
        print(f"Error in audio_to_json: {e}")
        import traceback
        traceback.print_exc()
        return []


@app.route('/api/engagement/start', methods=['POST'])
def start_engagement():
    """Start a new engagement monitoring session"""
    try:
        data = request.get_json() or {}
        lecture_name = data.get('lecture_name', 'Live Lecture')
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Initialize engagement monitor
        if EngagementMonitor is None:
            return jsonify({'error': 'EngagementMonitor not available'}), 500
        
        monitor = EngagementMonitor(
            analysis_interval=30,
            history_length=200,
            lecture_name=lecture_name
        )
        
        # Initialize audio recorder
        if AudioRecorder is None:
            return jsonify({'error': 'AudioRecorder not available'}), 500
        
        timestamp_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        audio_filepath = Path('data/audio') / f"audio_{session_id}_{timestamp_str}.wav"
        audio_filepath.parent.mkdir(parents=True, exist_ok=True)
        audio_recorder = AudioRecorder(audio_filepath)
        
        # Start recording
        monitor.start_recording()
        audio_recording_started = audio_recorder.start_recording()
        
        # Store session data
        sessions[session_id] = {
            'monitor': monitor,
            'audio_recorder': audio_recorder,
            'audio_filepath': audio_filepath if audio_recording_started else None,
            'start_time': datetime.now().isoformat(),
            'lecture_name': lecture_name,
        }
        
        return jsonify({
            'sessionId': session_id,
            'success': True,
            'message': 'Engagement monitoring started'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/engagement/current/<session_id>', methods=['GET'])
def get_current_engagement(session_id):
    """Get current engagement scores for a session"""
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        monitor = sessions[session_id]['monitor']
        
        return jsonify({
            'scores': monitor.current_scores,
            'state': monitor.engagement_state,
            'emotion': monitor.dominant_emotion,
            'confidence': monitor.confidence
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/engagement/stop', methods=['POST'])
def stop_engagement():
    """Stop engagement monitoring and process audio"""
    try:
        session_id = None
        
        # Get session ID from form data or JSON
        if request.is_json:
            data = request.get_json()
            session_id = data.get('session_id')
        else:
            # Form data (when audio file is uploaded)
            session_id = request.form.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'Session ID not provided'}), 400
        
        if session_id not in sessions:
            return jsonify({'error': f'Session not found: {session_id}'}), 404
        
        print(f"🛑 Stopping engagement session: {session_id}")
        
        session = sessions[session_id]
        monitor = session['monitor']
        audio_recorder = session.get('audio_recorder')
        audio_filepath = session.get('audio_filepath')
        
        # Stop backend audio recording (if it was started)
        if audio_recorder:
            try:
                if hasattr(audio_recorder, 'stop_recording'):
                    audio_recorder.stop_recording()
                if hasattr(audio_recorder, 'cleanup'):
                    audio_recorder.cleanup()
                print("✅ Backend audio recorder stopped")
            except Exception as e:
                print(f"⚠️  Error stopping backend audio recorder: {e}")
        
        # Initialize audio_filepath variable
        final_audio_filepath = None
        
        # Use backend recorded audio as fallback if no file uploaded
        if audio_filepath and Path(audio_filepath).exists():
            final_audio_filepath = Path(audio_filepath)
            print(f"📁 Using backend recorded audio: {final_audio_filepath}")
        
        # Handle uploaded audio file if provided (from frontend)
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename:
                # Determine file extension from content type or filename
                original_filename = audio_file.filename
                file_ext = Path(original_filename).suffix.lower()
                if not file_ext or file_ext not in ['.webm', '.wav', '.mp3', '.m4a']:
                    # Try to determine from content type
                    content_type = audio_file.content_type or ''
                    if 'webm' in content_type:
                        file_ext = '.webm'
                    elif 'wav' in content_type:
                        file_ext = '.wav'
                    else:
                        file_ext = '.webm'  # Default to webm for MediaRecorder
                
                # Save uploaded audio with original extension
                uploaded_filepath = Path('data/audio') / f"uploaded_{session_id}{file_ext}"
                audio_file.save(str(uploaded_filepath))
                print(f"✅ Saved uploaded audio to: {uploaded_filepath}")
                
                # Convert to wav for transcription (required for speech_recognition)
                wav_filepath = Path('data/audio') / f"audio_{session_id}.wav"
                try:
                    from pydub import AudioSegment
                    print(f"🔄 Converting {uploaded_filepath} to WAV format...")
                    # Detect format from file extension
                    input_format = file_ext[1:] if file_ext.startswith('.') else 'webm'
                    audio_segment = AudioSegment.from_file(str(uploaded_filepath), format=input_format)
                    # Export as WAV with standard settings
                    audio_segment.export(str(wav_filepath), format="wav")
                    final_audio_filepath = wav_filepath
                    print(f"✅ Converted to WAV: {wav_filepath}")
                except ImportError:
                    print("❌ Error: pydub not installed. Cannot convert audio format.")
                    print("   Install with: pip install pydub")
                    # Try to use original file (may fail with speech_recognition)
                    final_audio_filepath = uploaded_filepath
                except Exception as e:
                    print(f"❌ Error converting webm to wav: {e}")
                    print(f"   This usually means ffmpeg is not installed.")
                    print(f"   Install ffmpeg: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)")
                    # Try to use original file (may fail with speech_recognition)
                    final_audio_filepath = uploaded_filepath
                    print(f"⚠️  Will attempt transcription with original format (may fail)")
        
        # Export engagement data
        print("💾 Exporting engagement data...")
        engagement_filepath = monitor.export_data(audio_path=final_audio_filepath)
        print(f"✅ Engagement data exported to: {engagement_filepath}")
        
        # Load engagement data
        with open(engagement_filepath, 'r') as f:
            engagement_data = json.load(f)
        
        # Process audio transcription if audio file exists
        transcript_data = None
        transcript_file_path = None
        if final_audio_filepath and Path(final_audio_filepath).exists():
            try:
                print(f"🎤 Starting audio transcription for: {final_audio_filepath}")
                transcript_data = audio_to_json(str(final_audio_filepath))
                # Get the transcript file path that was saved
                transcript_file_path = Path('data/transcripts') / f"transcript_{Path(final_audio_filepath).stem}.json"
                if transcript_data:
                    print(f"✅ Transcription complete: {len(transcript_data)} segments")
                else:
                    print(f"⚠️  Transcription returned empty data")
            except Exception as e:
                print(f"❌ Error transcribing audio: {e}")
                import traceback
                traceback.print_exc()
                transcript_data = []
        elif final_audio_filepath:
            print(f"⚠️  Audio file path provided but file does not exist: {final_audio_filepath}")
        else:
            print("⚠️  No audio file available for transcription")
        
        # Store processed data
        session['engagement_data'] = engagement_data
        session['transcript_data'] = transcript_data
        session['transcript_file'] = str(transcript_file_path) if transcript_file_path else None
        session['end_time'] = datetime.now().isoformat()
        session['audio_filepath'] = str(final_audio_filepath) if final_audio_filepath else None
        
        # Prepare response with audio file info
        response_data = {
            'sessionId': session_id,
            'engagementData': engagement_data,
            'transcript': transcript_data,
            'success': True
        }
        
        # Add audio file info if available
        if final_audio_filepath and Path(final_audio_filepath).exists():
            audio_path_obj = Path(final_audio_filepath)
            response_data['audioFile'] = {
                'path': str(final_audio_filepath),
                'exists': True,
                'format': audio_path_obj.suffix,
                'size': audio_path_obj.stat().st_size
            }
        else:
            response_data['audioFile'] = {
                'exists': False,
                'message': 'No audio file recorded'
            }
        
        # Add transcript file info
        if transcript_file_path and transcript_file_path.exists():
            response_data['transcriptFile'] = {
                'path': str(transcript_file_path),
                'exists': True,
                'size': transcript_file_path.stat().st_size
            }
        
        return jsonify(response_data)
    except Exception as e:
        print(f"Error in stop_engagement: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/engagement/data/<session_id>', methods=['GET'])
def get_engagement_data(session_id):
    """Get full engagement data for a session"""
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        if 'engagement_data' not in session:
            return jsonify({'error': 'Engagement data not available yet'}), 404
        
        response_data = session['engagement_data'].copy()
        
        # Add audio file info
        audio_filepath = session.get('audio_filepath')
        if audio_filepath:
            audio_path = Path(audio_filepath)
            if audio_path.exists():
                response_data['audioFile'] = {
                    'path': str(audio_path),
                    'exists': True,
                    'format': audio_path.suffix,
                    'size': audio_path.stat().st_size
                }
            else:
                response_data['audioFile'] = {
                    'exists': False,
                    'path': str(audio_path)
                }
        else:
            response_data['audioFile'] = {
                'exists': False,
                'message': 'No audio file path stored'
            }
        
        # Add transcript file info
        transcript_file = session.get('transcript_file')
        if transcript_file:
            transcript_path = Path(transcript_file)
            if transcript_path.exists():
                response_data['transcriptFile'] = {
                    'path': str(transcript_path),
                    'exists': True,
                    'size': transcript_path.stat().st_size
                }
            else:
                response_data['transcriptFile'] = {
                    'exists': False,
                    'path': str(transcript_path)
                }
        
        return jsonify(response_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/engagement/audio/<session_id>', methods=['GET'])
def get_audio_file(session_id):
    """Download the audio file for a session"""
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        audio_filepath = session.get('audio_filepath')
        
        if not audio_filepath:
            return jsonify({'error': 'No audio file for this session'}), 404
        
        audio_path = Path(audio_filepath)
        if not audio_path.exists():
            return jsonify({'error': 'Audio file not found'}), 404
        
        return send_file(
            str(audio_path),
            as_attachment=True,
            download_name=f"lecture_audio_{session_id}{audio_path.suffix}"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/engagement/transcript/<session_id>', methods=['GET'])
def get_transcript_file(session_id):
    """Download or view the transcript file for a session"""
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        transcript_file = session.get('transcript_file')
        
        if not transcript_file:
            return jsonify({'error': 'No transcript file for this session'}), 404
        
        transcript_path = Path(transcript_file)
        if not transcript_path.exists():
            return jsonify({'error': 'Transcript file not found'}), 404
        
        # Return as JSON
        with open(transcript_path, 'r') as f:
            transcript_data = json.load(f)
        
        return jsonify({
            'sessionId': session_id,
            'transcriptFile': str(transcript_path),
            'transcript': transcript_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment-timeline/<session_id>', methods=['GET'])
def get_sentiment_timeline(session_id):
    """Get sentiment timeline formatted for frontend graphs"""
    try:
        if session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        if 'engagement_data' not in session:
            return jsonify({'error': 'Engagement data not available yet'}), 404
        
        engagement_data = session['engagement_data']
        transcript_data = session.get('transcript_data', [])
        timeline = engagement_data.get('engagement_timeline', [])
        
        # Transform to frontend format
        sentiment_timeline = []
        for entry in timeline:
            scores = entry.get('scores', {})
            
            # Find matching transcript for lectureContent
            lecture_content = ''
            if transcript_data:
                entry_time = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
                for transcript in transcript_data:
                    try:
                        start = datetime.fromisoformat(transcript['start_time'].replace('Z', '+00:00'))
                        end = datetime.fromisoformat(transcript['end_time'].replace('Z', '+00:00'))
                        if start <= entry_time <= end:
                            summary = transcript.get('summary', {})
                            if isinstance(summary, dict):
                                lecture_content = summary.get('5_word_summary', '')
                            break
                    except:
                        continue
            
            sentiment_timeline.append({
                'timestamp': entry['timestamp'],
                'bored': (scores.get('bored', 0) / 100),
                'confused': (scores.get('confused', 0) / 100),
                'engaged': (scores.get('engaged', 0) / 100),
                'frustrated': 0,  # Not in backend
                'excited': (scores.get('engaged', 0) * 0.3 / 100),
                'lectureContent': lecture_content
            })
        
        return jsonify(sentiment_timeline)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/lecture/summary', methods=['POST'])
def generate_lecture_summary():
    """Generate lecture summary from transcript"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        transcript_data = session.get('transcript_data', [])
        
        if not transcript_data:
            return jsonify({'error': 'No transcript data available'}), 400
        
        # Generate summary using AI
        client = init_anthropic_client()
        
        # Combine all transcript text
        full_text = ' '.join([item.get('text', '') for item in transcript_data])
        
        # Generate comprehensive summary
        summary_prompt = f"""Based on the following lecture transcript, create a comprehensive lecture summary in JSON format:
{{
    "title": "Lecture Summary",
    "lectureTitle": "Generated from transcript",
    "date": "{session.get('start_time', datetime.now().isoformat())}",
    "duration": "Calculated from transcript",
    "instructor": "Unknown",
    "sections": [
        {{
            "title": "Section title",
            "duration": "X minutes",
            "keyPoints": ["point1", "point2"],
            "concepts": [
                {{"term": "term1", "definition": "definition1"}}
            ],
            "examples": ["example1", "example2"]
        }}
    ],
    "overallTakeaways": ["takeaway1", "takeaway2"],
    "nextSteps": ["step1", "step2"]
}}

Transcript:
{full_text[:8000]}  # Limit to avoid token limits
"""
        
        summary_raw = send_message(client, message=summary_prompt, max_tokens=2000)
        summary_data = extract_json_from_claude_response(summary_raw)
        
        # Store and return
        session['lecture_summary'] = summary_data
        return jsonify(summary_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/lecture/mcqs', methods=['POST'])
def generate_mcqs():
    """Generate MCQs from engagement data and transcript"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        engagement_data = session.get('engagement_data')
        transcript_data = session.get('transcript_data', [])
        
        if not engagement_data:
            return jsonify({'error': 'Engagement data not available'}), 400
        
        # Get engagement timeline
        emotion_data = engagement_data.get('engagement_timeline', [])
        
        # Parse transcript
        client = init_anthropic_client()
        
        # Convert transcript to dict format if needed
        if isinstance(transcript_data, list):
            transcript_dict = transcript_data
        else:
            transcript_dict = parse_transcript(transcript_data, client)
        
        # Generate MCQs using wrapper logic
        # Use lower thresholds to ensure we get some questions
        # Also check if we have enough data points
        if not emotion_data or len(emotion_data) < 5:
            # Not enough engagement data, generate questions from transcript only
            print("Warning: Not enough engagement data, generating questions from transcript only")
            unique_sessions = []
            # Generate questions from transcript segments
            if transcript_dict and len(transcript_dict) > 0:
                for i, transcript_segment in enumerate(transcript_dict[:5]):  # Use first 5 segments
                    # Generate questions for this segment
                    question_prompt = f"""Based on the following lecture transcript segment, generate 2-3 multiple choice questions in JSON format:
{{
    "question_1": {{
        "question": "Question text here",
        "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
        "answer": 0,
        "explanation": "Explanation here"
    }},
    "question_2": {{...}}
}}

Transcript segment:
{transcript_segment.get('text', '')[:1000]}

Return ONLY valid JSON with no additional text."""
                    
                    try:
                        question_raw = send_message(client, message=question_prompt, max_tokens=1000)
                        questions = extract_json_from_claude_response(question_raw)
                        
                        unique_sessions.append({
                            'start_time': transcript_segment.get('start_time', ''),
                            'end_time': transcript_segment.get('end_time', ''),
                            'text': transcript_segment.get('text', ''),
                            'summary': transcript_segment.get('summary', {}),
                            'questions': questions
                        })
                    except Exception as e:
                        print(f"Error generating questions for segment {i}: {e}")
                        continue
        else:
            # Use engagement-based question generation
            emotion_thresholds = {
                "bored": 20,  # Lower threshold to catch more periods
                "confused": 20,
            }
            
            things_happened, unique_sessions = pose_questions(
                client=client,
                data=emotion_data,
                transcript_dict=transcript_dict,
                target=emotion_thresholds,
                nos_entry_before=2
            )
            
            # If no questions generated from engagement, generate from transcript
            if not unique_sessions or len(unique_sessions) == 0:
                print("No questions from engagement data, generating from transcript")
                unique_sessions = []
                if transcript_dict and len(transcript_dict) > 0:
                    for i, transcript_segment in enumerate(transcript_dict[:3]):  # Use first 3 segments
                        question_prompt = f"""Based on the following lecture transcript segment, generate 2 multiple choice questions in JSON format:
{{
    "question_1": {{
        "question": "Question text here",
        "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
        "answer": 0,
        "explanation": "Explanation here"
    }},
    "question_2": {{...}}
}}

Transcript segment:
{transcript_segment.get('text', '')[:1000]}

Return ONLY valid JSON with no additional text."""
                        
                        try:
                            question_raw = send_message(client, message=question_prompt, max_tokens=1000)
                            questions = extract_json_from_claude_response(question_raw)
                            
                            unique_sessions.append({
                                'start_time': transcript_segment.get('start_time', ''),
                                'end_time': transcript_segment.get('end_time', ''),
                                'text': transcript_segment.get('text', ''),
                                'summary': transcript_segment.get('summary', {}),
                                'questions': questions
                            })
                        except Exception as e:
                            print(f"Error generating questions for segment {i}: {e}")
                            continue
        
        # Generate title
        title_prompt = "Based on the transcript_data, can you generate me a short title of the lecture? The best output only, within 10 words please."
        title_raw = send_message(client, message=title_prompt + str(transcript_dict), max_tokens=100)
        
        # Ensure we have at least some questions
        if not unique_sessions or len(unique_sessions) == 0:
            # Last resort: create a simple question from transcript
            print("Creating fallback questions")
            if transcript_dict and len(transcript_dict) > 0:
                first_segment = transcript_dict[0]
                unique_sessions = [{
                    'start_time': first_segment.get('start_time', ''),
                    'end_time': first_segment.get('end_time', ''),
                    'text': first_segment.get('text', '')[:500],
                    'summary': first_segment.get('summary', {'5_word_summary': 'Lecture Content'}),
                    'questions': {
                        'question_1': {
                            'question': 'What is the main topic discussed in this lecture?',
                            'options': ['A. The topic from the transcript', 'B. Option B', 'C. Option C', 'D. Option D'],
                            'answer': 0,
                            'explanation': 'Based on the lecture transcript'
                        }
                    }
                }]
        
        # Convert to MCQ format
        # Save unique_sessions temporarily
        temp_questions_file = Path('output') / f"questions_{session_id}.json"
        with open(temp_questions_file, 'w') as f:
            json.dump(unique_sessions, f, indent=2)
        
        # Convert to frontend format
        # Use temp output file
        temp_output_file = Path('output') / f"mcqData_{session_id}.js"
        mcq_data = convert_questions_to_mcq(
            input_file=str(temp_questions_file),
            output_file=str(temp_output_file),
            title=title_raw
        )
        
        # Ensure we have questions
        if not mcq_data.get('questions') or len(mcq_data.get('questions', [])) == 0:
            # Create a default question structure
            mcq_data = {
                'lectureTitle': title_raw.strip() if title_raw else 'Lecture Quiz',
                'questions': [{
                    'id': 1,
                    'topic': 'General',
                    'question': 'Please complete the engagement monitor first to generate personalized questions.',
                    'options': ['A. I understand', 'B. I understand', 'C. I understand', 'D. I understand'],
                    'correctAnswer': 0,
                    'explanation': 'Questions are generated based on your engagement data and lecture transcript. Please start and stop the engagement monitor first.'
                }]
            }
        
        # Clean up temp output file
        if temp_output_file.exists():
            temp_output_file.unlink()
        
        # Clean up temp file
        if temp_questions_file.exists():
            temp_questions_file.unlink()
        
        # Store and return
        session['mcq_data'] = mcq_data
        return jsonify(mcq_data)
    except Exception as e:
        print(f"Error in generate_mcqs: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/report/generate', methods=['POST'])
def generate_user_report():
    """Generate user report from engagement data and MCQ performance"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        mcq_results = data.get('mcq_results', [])
        
        if not session_id or session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        engagement_data = session.get('engagement_data')
        
        if not engagement_data:
            return jsonify({'error': 'Engagement data not available'}), 400
        
        # Generate report using AI
        client = init_anthropic_client()
        
        # Prepare data for AI
        engagement_timeline = engagement_data.get('engagement_timeline', [])
        mcq_performance = {
            'total_questions': len(mcq_results),
            'correct': sum(1 for r in mcq_results if r.get('isCorrect', False)),
            'results': mcq_results
        }
        
        report_prompt = f"""Based on the following engagement data and MCQ performance, generate a comprehensive user report in JSON format matching this structure:
{{
    "title": "Your Learning Report",
    "lectureTitle": "Lecture Title",
    "date": "YYYY-MM-DD",
    "overallStats": {{
        "averageEngagement": 0-100,
        "averageConfusion": 0-100,
        "averageFocus": 0-100,
        "totalTime": "X minutes"
    }},
    "sections": [
        {{
            "title": "Section title",
            "duration": "X minutes",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "metrics": {{
                "engagement": 0-100,
                "confusion": 0-100,
                "focus": 0-100,
                "bored": 0-100,
                "frustrated": 0-100,
                "excited": 0-100
            }},
            "analysis": {{
                "focusLevel": "High/Medium/Low",
                "confusionLevel": "High/Medium/Low",
                "recommendation": "Recommendation text"
            }},
            "highlights": ["highlight1", "highlight2"]
        }}
    ],
    "insights": [
        {{
            "type": "strength/weakness/improvement",
            "title": "Insight title",
            "description": "Insight description"
        }}
    ]
}}

Engagement Data: {json.dumps(engagement_timeline[:50], indent=2)}
MCQ Performance: {json.dumps(mcq_performance, indent=2)}
"""
        
        report_raw = send_message(client, message=report_prompt, max_tokens=3000)
        report_data = extract_json_from_claude_response(report_raw)
        
        # Store and return
        session['user_report'] = report_data
        return jsonify(report_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/plan/generate', methods=['POST'])
def generate_study_plan():
    """Generate study plan from engagement data and MCQ performance"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        mcq_results = data.get('mcq_results', [])
        
        if not session_id or session_id not in sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        engagement_data = session.get('engagement_data')
        transcript_data = session.get('transcript_data', [])
        
        if not engagement_data:
            return jsonify({'error': 'Engagement data not available'}), 400
        
        # Generate study plan using AI
        client = init_anthropic_client()
        
        engagement_timeline = engagement_data.get('engagement_timeline', [])
        mcq_performance = {
            'total_questions': len(mcq_results),
            'correct': sum(1 for r in mcq_results if r.get('isCorrect', False)),
            'results': mcq_results
        }
        
        plan_prompt = f"""Based on the following engagement data, transcript, and MCQ performance, generate a personalized study plan in JSON format:
{{
    "title": "Post-Lecture Study Plan",
    "lectureTitle": "Lecture Title",
    "date": "YYYY-MM-DD",
    "recommendations": [
        {{
            "topic": "Topic name",
            "priority": "High/Medium/Low",
            "timeEstimate": "X-Y minutes",
            "activities": ["activity1", "activity2"],
            "resources": ["resource1", "resource2"]
        }}
    ],
    "weeklyGoals": ["goal1", "goal2"],
    "studySchedule": [
        {{
            "day": "Today/Tomorrow/This Week",
            "tasks": ["task1", "task2"]
        }}
    ]
}}

Engagement Data: {json.dumps(engagement_timeline[:30], indent=2)}
MCQ Performance: {json.dumps(mcq_performance, indent=2)}
Transcript Topics: {json.dumps([t.get('summary', {}).get('5_word_summary', '') for t in transcript_data[:10]], indent=2)}
"""
        
        plan_raw = send_message(client, message=plan_prompt, max_tokens=2000)
        plan_data = extract_json_from_claude_response(plan_raw)
        
        # Store and return
        session['study_plan'] = plan_data
        return jsonify(plan_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/', methods=['GET'])
def root():
    """Root endpoint - list available API endpoints"""
    return jsonify({
        'message': 'Listant API Server',
        'version': '1.0',
        'endpoints': {
            'health': 'GET /api/health',
            'engagement': {
                'start': 'POST /api/engagement/start',
                'current': 'GET /api/engagement/current/<session_id>',
                'stop': 'POST /api/engagement/stop',
                'data': 'GET /api/engagement/data/<session_id>',
                'audio': 'GET /api/engagement/audio/<session_id>',
                'transcript': 'GET /api/engagement/transcript/<session_id>',
                'sentiment_timeline': 'GET /api/sentiment-timeline/<session_id>'
            },
            'lecture': {
                'summary': 'POST /api/lecture/summary',
                'mcqs': 'POST /api/lecture/mcqs'
            },
            'reports': {
                'user_report': 'POST /api/report/generate',
                'study_plan': 'POST /api/plan/generate'
            }
        },
        'status': 'running'
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'sessions': len(sessions)})


if __name__ == '__main__':
    print("Starting Listant API Server...")
    print("API will be available at http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=True)
