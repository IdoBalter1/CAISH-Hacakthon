import cv2
from deepface import DeepFace
import time
from collections import deque
import numpy as np
from datetime import datetime
import json
import argparse
from pathlib import Path

class EngagementMonitor:
    def __init__(self, analysis_interval=30, history_length=100, lecture_name=None):
        """
        Initialize the engagement monitor.
        
        Args:
            analysis_interval: Number of frames between analyses (lower = more frequent but slower)
            history_length: Number of data points to keep in time-series history
            lecture_name: Name of the lecture for file naming
        """
        self.analysis_interval = analysis_interval
        self.frame_count = 0
        self.lecture_name = lecture_name
        
        # Recording metadata
        self.recording_start_time = None
        self.recording_end_time = None
        self.is_recording = False
        
        # Store recent emotions for smoothing
        self.emotion_history = deque(maxlen=10)
        
        # Time-series data for all 4 engagement states
        self.engagement_scores_history = {
            'concentrated': deque(maxlen=history_length),
            'confused': deque(maxlen=history_length),
            'bored': deque(maxlen=history_length),
            'engaged': deque(maxlen=history_length)
        }
        self.timestamps = deque(maxlen=history_length)
        
        # Current metrics
        self.engagement_state = "Starting..."
        self.dominant_emotion = "neutral"
        self.confidence = 0.0
        self.current_scores = {
            'concentrated': 0.0,
            'confused': 0.0,
            'bored': 0.0,
            'engaged': 0.0
        }
        
        # Color schemes
        self.colors = {
            'concentrated': (0, 255, 0),      # Green
            'confused': (0, 165, 255),        # Orange
            'bored': (0, 0, 255),             # Red
            'engaged': (0, 255, 255),         # Yellow
            'neutral': (255, 255, 255)        # White
        }
        
        # Plot colors (for potential future use)
        self.plot_colors = {
            'concentrated': '#00FF00',  # Green
            'confused': '#FFA500',      # Orange
            'bored': '#FF0000',         # Red
            'engaged': '#FFFF00'        # Yellow
        }
        
    def start_recording(self):
        """Start recording engagement data."""
        self.recording_start_time = datetime.now()
        self.is_recording = True
        print(f"\n🔴 Recording started at {self.recording_start_time.strftime('%H:%M:%S')}")
        if self.lecture_name:
            print(f"   Lecture: {self.lecture_name}")
        
    def analyze_frame(self, frame):
        """Analyze a single frame for emotions and engagement."""
        try:
            # Analyze face with DeepFace
            result = DeepFace.analyze(
                frame, 
                actions=['emotion'],
                enforce_detection=False,
                detector_backend='opencv',
                silent=True
            )
            
            # Handle both single face and multiple faces
            if isinstance(result, list):
                result = result[0]
            
            # Get emotion data
            emotions = result['emotion']
            self.dominant_emotion = result['dominant_emotion']
            
            # Store in history
            self.emotion_history.append(emotions)
            
            # Calculate engagement scores for all states
            scores = self._calculate_all_engagement_scores(emotions)
            self.current_scores = scores
            
            # Store time-series data
            current_time = time.time()
            self.timestamps.append(current_time)
            for state, score in scores.items():
                self.engagement_scores_history[state].append(score)
            
            # Determine winner-takes-all state
            self.engagement_state = max(scores, key=scores.get)
            self.confidence = scores[self.engagement_state]
            
            return True
            
        except Exception as e:
            # No face detected or other error
            return False
    
    def _calculate_all_engagement_scores(self, emotions):
        """
        Calculate scores for all 4 engagement states.
        Returns a dict with all scores.
        """
        scores = {
            'concentrated': emotions['neutral'] + emotions['happy'] * 0.5,
            'confused': emotions['fear'] + emotions['surprise'] * 0.7 + emotions['sad'] * 0.5,
            'bored': emotions['sad'] * 0.8 + emotions['angry'] * 0.3,
            'engaged': emotions['happy'] + emotions['surprise'] * 0.6
        }
        return scores
    
    def get_smoothed_state(self):
        """Get smoothed engagement state based on recent history."""
        if len(self.emotion_history) < 3:
            return self.engagement_state
        
        # Average recent emotions
        avg_emotions = {}
        for emotion in self.emotion_history[0].keys():
            avg_emotions[emotion] = np.mean([e[emotion] for e in self.emotion_history])
        
        scores = self._calculate_all_engagement_scores(avg_emotions)
        return max(scores, key=scores.get)
    
    def _find_key_moments(self):
        """Identify key moments: confusion peaks, boredom periods, engagement drops."""
        if len(self.timestamps) < 10:
            return {}
        
        timestamps_list = list(self.timestamps)
        start_time = timestamps_list[0]
        
        # Find confusion peaks (confusion > 70 for at least 3 consecutive readings)
        confusion_scores = list(self.engagement_scores_history['confused'])
        confusion_peaks = []
        i = 0
        while i < len(confusion_scores) - 2:
            if confusion_scores[i] > 70 and confusion_scores[i+1] > 70 and confusion_scores[i+2] > 70:
                peak_start = i
                while i < len(confusion_scores) and confusion_scores[i] > 70:
                    i += 1
                peak_end = i - 1
                
                confusion_peaks.append({
                    'timestamp': datetime.fromtimestamp(timestamps_list[peak_start]).strftime('%H:%M:%S'),
                    'elapsed_seconds': round(timestamps_list[peak_start] - start_time, 1),
                    'duration_seconds': round(timestamps_list[peak_end] - timestamps_list[peak_start], 1),
                    'avg_score': round(np.mean(confusion_scores[peak_start:peak_end+1]), 2),
                    'peak_score': round(max(confusion_scores[peak_start:peak_end+1]), 2)
                })
            i += 1
        
        # Find boredom periods (boredom > 60 for at least 5 consecutive readings)
        boredom_scores = list(self.engagement_scores_history['bored'])
        boredom_periods = []
        i = 0
        while i < len(boredom_scores) - 4:
            if all(score > 60 for score in boredom_scores[i:i+5]):
                period_start = i
                while i < len(boredom_scores) and boredom_scores[i] > 60:
                    i += 1
                period_end = i - 1
                
                boredom_periods.append({
                    'start_timestamp': datetime.fromtimestamp(timestamps_list[period_start]).strftime('%H:%M:%S'),
                    'end_timestamp': datetime.fromtimestamp(timestamps_list[period_end]).strftime('%H:%M:%S'),
                    'start_elapsed': round(timestamps_list[period_start] - start_time, 1),
                    'end_elapsed': round(timestamps_list[period_end] - start_time, 1),
                    'duration_seconds': round(timestamps_list[period_end] - timestamps_list[period_start], 1),
                    'avg_score': round(np.mean(boredom_scores[period_start:period_end+1]), 2)
                })
            i += 1
        
        return {
            'confusion_peaks': confusion_peaks[:10],  # Top 10
            'boredom_periods': boredom_periods[:5]     # Top 5
        }
    
    def export_data(self, output_dir='./data/engagement'):
        """Export engagement data to JSON file."""
        # Create output directory if it doesn't exist
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        self.recording_end_time = datetime.now()
        timestamp_str = self.recording_start_time.strftime('%Y-%m-%d_%H-%M-%S')
        
        if self.lecture_name:
            filename = f"engagement_{self.lecture_name}_{timestamp_str}.json"
        else:
            filename = f"engagement_{timestamp_str}.json"
        
        filepath = output_path / filename
        
        # Build timeline data
        timeline = []
        timestamps_list = list(self.timestamps)
        start_time = timestamps_list[0] if timestamps_list else time.time()
        
        for i, timestamp in enumerate(timestamps_list):
            timeline.append({
                'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                'elapsed_seconds': round(timestamp - start_time, 1),
                'scores': {
                    'concentrated': round(list(self.engagement_scores_history['concentrated'])[i], 2),
                    'engaged': round(list(self.engagement_scores_history['engaged'])[i], 2),
                    'confused': round(list(self.engagement_scores_history['confused'])[i], 2),
                    'bored': round(list(self.engagement_scores_history['bored'])[i], 2)
                }
            })
        
        # Calculate summary statistics
        summary_stats = {
            'avg_scores': {},
            'key_moments': self._find_key_moments()
        }
        
        for state in ['concentrated', 'engaged', 'confused', 'bored']:
            scores = list(self.engagement_scores_history[state])
            if scores:
                summary_stats['avg_scores'][state] = round(np.mean(scores), 2)
        
        # Build complete data structure
        data = {
            'metadata': {
                'lecture_name': self.lecture_name,
                'start_time': self.recording_start_time.isoformat(),
                'end_time': self.recording_end_time.isoformat(),
                'duration_seconds': round((self.recording_end_time - self.recording_start_time).total_seconds(), 1),
                'total_data_points': len(timeline),
                'student_id': None,  # Can be filled in later
                'course': None       # Can be filled in later
            },
            'engagement_timeline': timeline,
            'summary_statistics': summary_stats
        }
        
        # Save to file
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filepath
    
    def draw_overlay(self, frame):
        """Draw engagement information overlay on frame."""
        height, width = frame.shape[:2]
        
        # Create semi-transparent overlay
        overlay = frame.copy()
        
        # Get current state
        state = self.get_smoothed_state()
        color = self.colors.get(state, self.colors['neutral'])
        
        # Draw top bar with state
        cv2.rectangle(overlay, (0, 0), (width, 120), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)
        
        # Recording indicator and elapsed time
        if self.is_recording:
            elapsed = (datetime.now() - self.recording_start_time).total_seconds()
            elapsed_str = time.strftime('%H:%M:%S', time.gmtime(elapsed))
            cv2.putText(frame, f"REC {elapsed_str}", (width - 180, 35), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            cv2.circle(frame, (width - 200, 28), 8, (0, 0, 255), -1)  # Red recording dot
        
        # Lecture name
        if self.lecture_name:
            cv2.putText(frame, self.lecture_name, (20, 25), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        
        # State text (winner-takes-all)
        cv2.putText(frame, f"Primary State: {state.upper()}", (20, 55), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        
        # Emotion text
        cv2.putText(frame, f"Dominant Emotion: {self.dominant_emotion}", (20, 85), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        # Show all engagement scores
        cv2.putText(frame, f"All Scores:", (20, 110), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # Draw engagement score bars for all 4 states
        self._draw_engagement_bars(frame)
        
        # Draw emotion bars if we have history
        if self.emotion_history:
            self._draw_emotion_bars(frame, list(self.emotion_history[-1].items()))
        
        # Status indicator (circle in top right, next to recording indicator)
        cv2.circle(frame, (width - 30, 85), 15, color, -1)
        
        return frame
    
    def _draw_engagement_bars(self, frame):
        """Draw bars showing all 4 engagement state scores."""
        height, width = frame.shape[:2]
        bar_width = 200
        bar_height = 20
        start_x = 20
        start_y = 140
        
        states_ordered = ['concentrated', 'engaged', 'confused', 'bored']
        
        for i, state in enumerate(states_ordered):
            score = self.current_scores.get(state, 0)
            y_pos = start_y + i * (bar_height + 10)
            
            # State label
            label_color = self.colors.get(state, (255, 255, 255))
            cv2.putText(frame, f"{state.capitalize()}:", 
                       (start_x, y_pos + 15), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, label_color, 1)
            
            # Background bar
            bar_start_x = start_x + 140
            cv2.rectangle(frame, (bar_start_x, y_pos), 
                         (bar_start_x + bar_width, y_pos + bar_height), 
                         (50, 50, 50), -1)
            
            # Value bar (normalize to 0-100 scale)
            bar_length = int((score / 100) * bar_width)
            cv2.rectangle(frame, (bar_start_x, y_pos), 
                         (bar_start_x + bar_length, y_pos + bar_height), 
                         label_color, -1)
            
            # Score text
            cv2.putText(frame, f"{score:.1f}", 
                       (bar_start_x + bar_width + 10, y_pos + 15), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def _draw_emotion_bars(self, frame, emotions):
        """Draw emotion intensity bars."""
        height, width = frame.shape[:2]
        bar_width = 150
        bar_height = 15
        start_x = width - bar_width - 20
        start_y = 140
        
        for i, (emotion, value) in enumerate(emotions):
            y_pos = start_y + i * (bar_height + 5)
            
            # Background bar
            cv2.rectangle(frame, (start_x, y_pos), 
                         (start_x + bar_width, y_pos + bar_height), 
                         (50, 50, 50), -1)
            
            # Value bar
            bar_length = int((value / 100) * bar_width)
            cv2.rectangle(frame, (start_x, y_pos), 
                         (start_x + bar_length, y_pos + bar_height), 
                         (0, 255, 0), -1)
            
            # Emotion label
            cv2.putText(frame, f"{emotion}: {value:.1f}%", 
                       (start_x - 120, y_pos + 12), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        return frame


def main():
    """Main function to run the engagement monitor."""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Student Engagement Monitor')
    parser.add_argument('--lecture', type=str, required=True,
                       help='Name of the lecture (e.g., "CS229_Lecture5")')
    args = parser.parse_args()
    
    print("=" * 60)
    print("Student Engagement Monitor")
    print("=" * 60)
    print(f"\nLecture: {args.lecture}")
    print("\nEngagement States:")
    print("  🟢 CONCENTRATED: Focused and attentive")
    print("  🟡 ENGAGED: Actively interested and positive")
    print("  🟠 CONFUSED: Shows signs of confusion or uncertainty")
    print("  🔴 BORED: Low engagement, possibly distracted")
    print("\nControls:")
    print("  Press 'q' to save and quit")
    print("\nOutput:")
    print(f"  Data will be saved to: ./data/engagement/")
    print("=" * 60)
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("\n❌ Error: Could not open webcam")
        return
    
    # Set resolution (lower = faster processing)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    monitor = EngagementMonitor(
        analysis_interval=30, 
        history_length=200,
        lecture_name=args.lecture
    )
    
    # Start recording immediately
    monitor.start_recording()
    
    fps_time = time.time()
    fps = 0
    
    print("\n▶️  Recording started...")
    
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
            success = monitor.analyze_frame(frame)
            if success:
                state = monitor.get_smoothed_state()
                scores_str = ", ".join([f"{k}: {v:.1f}" for k, v in monitor.current_scores.items()])
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Primary: {state} | {scores_str}")
        
        # Draw overlay
        frame = monitor.draw_overlay(frame)
        
        # Calculate and display FPS
        fps = 1.0 / (time.time() - fps_time)
        fps_time = time.time()
        cv2.putText(frame, f"FPS: {fps:.1f} | Press 'q' to save & quit", 
                    (10, frame.shape[0] - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Show frame
        cv2.imshow('Student Engagement Monitor', frame)
        
        # Exit on 'q' press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n⏹️  Stopping recording...")
            break
    
    # Save data before quitting
    print("💾 Saving engagement data...")
    try:
        filepath = monitor.export_data()
        print(f"✅ Data saved successfully to:")
        print(f"   {filepath}")
        print(f"\n📊 Summary:")
        print(f"   Duration: {(monitor.recording_end_time - monitor.recording_start_time).total_seconds():.1f} seconds")
        print(f"   Data points: {len(list(monitor.timestamps))}")
        if monitor.current_scores:
            print(f"   Average scores:")
            for state, scores in monitor.engagement_scores_history.items():
                if scores:
                    print(f"     {state.capitalize()}: {np.mean(list(scores)):.2f}")
    except Exception as e:
        print(f"❌ Error saving data: {e}")
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    print("\n✓ Monitor stopped.\n")


if __name__ == "__main__":
    main()