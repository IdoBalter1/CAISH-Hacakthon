import cv2
from deepface import DeepFace
import time
from collections import deque
import numpy as np

class EngagementMonitor:
    def __init__(self, analysis_interval=30):
        """
        Initialize the engagement monitor.
        
        Args:
            analysis_interval: Number of frames between analyses (lower = more frequent but slower)
        """
        self.analysis_interval = analysis_interval
        self.frame_count = 0
        
        # Store recent emotions for smoothing
        self.emotion_history = deque(maxlen=10)
        
        # Engagement metrics
        self.engagement_state = "Starting..."
        self.dominant_emotion = "neutral"
        self.confidence = 0.0
        
        # Color schemes
        self.colors = {
            'concentrated': (0, 255, 0),      # Green
            'confused': (0, 165, 255),        # Orange
            'bored': (0, 0, 255),             # Red
            'engaged': (0, 255, 255),         # Yellow
            'neutral': (255, 255, 255)        # White
        }
        
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
            
            # Calculate engagement state
            self.engagement_state = self._calculate_engagement(emotions)
            self.confidence = emotions[self.dominant_emotion]
            
            return True
            
        except Exception as e:
            # No face detected or other error
            return False
    
    def _calculate_engagement(self, emotions):
        """
        Map emotions to learning engagement states.
        
        Engagement mapping:
        - Concentrated: High neutral, low negative emotions
        - Confused: Fear, surprise, sadness
        - Bored: Low arousal emotions (sad, neutral with low engagement)
        - Engaged: Happy, surprise (positive)
        """
        
        # Calculate engagement scores
        concentration_score = emotions['neutral'] + emotions['happy'] * 0.5
        confusion_score = emotions['fear'] + emotions['surprise'] * 0.7 + emotions['sad'] * 0.5
        boredom_score = emotions['sad'] * 0.8 + emotions['angry'] * 0.3
        engagement_score = emotions['happy'] + emotions['surprise'] * 0.6
        
        # Determine state based on highest score
        scores = {
            'concentrated': concentration_score,
            'confused': confusion_score,
            'bored': boredom_score,
            'engaged': engagement_score
        }
        
        return max(scores, key=scores.get)
    
    def get_smoothed_state(self):
        """Get smoothed engagement state based on recent history."""
        if len(self.emotion_history) < 3:
            return self.engagement_state
        
        # Average recent emotions
        avg_emotions = {}
        for emotion in self.emotion_history[0].keys():
            avg_emotions[emotion] = np.mean([e[emotion] for e in self.emotion_history])
        
        return self._calculate_engagement(avg_emotions)
    
    def draw_overlay(self, frame):
        """Draw engagement information overlay on frame."""
        height, width = frame.shape[:2]
        
        # Create semi-transparent overlay
        overlay = frame.copy()
        
        # Get current state
        state = self.get_smoothed_state()
        color = self.colors.get(state, self.colors['neutral'])
        
        # Draw top bar with state
        cv2.rectangle(overlay, (0, 0), (width, 80), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)
        
        # State text
        cv2.putText(frame, f"State: {state.upper()}", (20, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        
        # Emotion text
        cv2.putText(frame, f"Emotion: {self.dominant_emotion}", (20, 65), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        # Draw emotion bars if we have history
        if self.emotion_history:
            self._draw_emotion_bars(frame, list(self.emotion_history[-1].items()))
        
        # Status indicator (circle in top right)
        cv2.circle(frame, (width - 30, 30), 15, color, -1)
        
        return frame
    
    def _draw_emotion_bars(self, frame, emotions):
        """Draw emotion intensity bars."""
        height, width = frame.shape[:2]
        bar_width = 150
        bar_height = 15
        start_x = width - bar_width - 20
        start_y = 100
        
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
    print("Starting Student Engagement Monitor...")
    print("Press 'q' to quit")
    print("\nEngagement States:")
    print("- CONCENTRATED: Focused and attentive")
    print("- ENGAGED: Actively interested and positive")
    print("- CONFUSED: Shows signs of confusion or uncertainty")
    print("- BORED: Low engagement, possibly distracted")
    print("\n" + "="*50 + "\n")
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam")
        return
    
    # Set resolution (lower = faster processing)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    monitor = EngagementMonitor(analysis_interval=30)
    
    fps_time = time.time()
    fps = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame")
            break
        
        # Flip frame horizontally for mirror view
        frame = cv2.flip(frame, 1)
        
        # Analyze frame periodically
        monitor.frame_count += 1
        if monitor.frame_count % monitor.analysis_interval == 0:
            print(f"Analyzing... State: {monitor.get_smoothed_state()}, "
                  f"Emotion: {monitor.dominant_emotion}")
            monitor.analyze_frame(frame)
        
        # Draw overlay
        frame = monitor.draw_overlay(frame)
        
        # Calculate and display FPS
        fps = 1.0 / (time.time() - fps_time)
        fps_time = time.time()
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, frame.shape[0] - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Show frame
        cv2.imshow('Student Engagement Monitor', frame)
        
        # Exit on 'q' press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    print("\nMonitor stopped.")


if __name__ == "__main__":
    main()