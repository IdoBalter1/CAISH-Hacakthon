from audiotranscription import transcribe_audio,create_summary, audio_to_json
import numpy as np
import pandas as pd
import speech_recognition as sr
import json
import os
from dotenv import load_dotenv
from anthropic import Anthropic, HUMAN_PROMPT, AI_PROMPT
from pathlib import Path
import anthropic
import speech_recognition as sr 
import os 
from pydub import AudioSegment
from pydub.silence import split_on_silence


from audiotranscription import audio_to_json
from face import EngagementMonitor, AudioRecorder
import cv2
import time
from datetime import datetime
from pathlib import Path

def main():
    """
    Main function to record both face data and audio, and return the results.
    
    Returns:
        audio_results (list): JSON-like list of audio transcription and summaries.
        face_data (dict): Engagement data from face analysis.
    """
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("\n❌ Error: Could not open webcam")
        return None, None

    # Set resolution (lower = faster processing)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # Initialize Engagement Monitor
    monitor = EngagementMonitor(
        analysis_interval=30, 
        history_length=200,
        lecture_name="Lecture_Recording"
    )

    # Initialize Audio Recorder
    timestamp_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    audio_filepath = Path('./data/engagement') / f"audio_{timestamp_str}.wav"
    audio_filepath.parent.mkdir(parents=True, exist_ok=True)
    audio_recorder = AudioRecorder(audio_filepath)

    # Start recording face data
    monitor.start_recording()

    # Start audio recording
    audio_recording_started = audio_recorder.start_recording()
    if not audio_recording_started:
        print("⚠️  Continuing without audio recording")
        audio_filepath = None

    print("\n▶️  Recording started... Press 'q' to stop.")
    fps_time = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("\n❌ Error: Could not read frame")
                break

            # Flip frame horizontally for mirror view
            frame = cv2.flip(frame, 1)

            # Analyze frame periodically
            monitor.frame_count += 1
            if monitor.frame_count % monitor.analysis_interval == 0:
                monitor.analyze_frame(frame)

            # Draw overlay
            frame = monitor.draw_overlay(frame)

            # Calculate and display FPS
            fps = 1.0 / (time.time() - fps_time)
            fps_time = time.time()
            cv2.putText(frame, f"FPS: {fps:.1f} | Press 'q' to stop", 
                        (10, frame.shape[0] - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # Show frame
            cv2.imshow('Engagement Monitor', frame)

            # Exit on 'q' press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\n⏹️  Stopping recording...")
                break

    except KeyboardInterrupt:
        print("\n⏹️  Recording interrupted by user...")

    finally:
        # Stop audio recording
        if audio_recorder and audio_recording_started:
            print("💾 Saving audio recording...")
            audio_recorder.stop_recording()
            audio_recorder.cleanup()

        # Save engagement data
        print("💾 Saving engagement data...")
        face_data = monitor.export_data(audio_path=audio_filepath)

        # Cleanup
        cap.release()
        cv2.destroyAllWindows()
        print("\n✓ Monitor stopped.\n")

    # Process audio transcription
    audio_results = None
    if audio_filepath:
        print("\n🔄 Processing audio transcription...")
        audio_results = audio_to_json(audio_filepath)

    return audio_results, face_data


if __name__ == "__main__":
    audio_results, face_data = main()
    print("\n🎤 Audio Transcription Results:")
    print(audio_results)
    print("\n📹 Face Engagement Data:")
    print(face_data)