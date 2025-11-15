"""
Main script for content extraction and analysis.

This script demonstrates how to use the utility functions for analyzing
lecture data and generating questions based on student engagement metrics.
"""

import os
import json
import pandas as pd
from anthropic import Anthropic
from modules.utils import (
    cal_trend,
    send_message,
    extract_json_from_claude_response,
    find_transcripts_for_period
)


def pose_questions(data: dict, 
                   transcript_dict: dict, 
                   target: dict, 
                   nos_entry_before: int = 1):
    """
    The main function to run content extraction and analysis.
    Inputs:
        - data: a list of dictionaries of a read JSON file containing emotion metrics and lectureContent topics
        {
            "timestamp": "2025-01-15T10:00:00Z",
            "bored": 0.10,
            "confused": 0.20,
            "engaged": 0.65,
            "frustrated": 0.05,
            "excited": 0.15,
            "lectureContent": "Introduction to Machine Learning"
        }
        - transcript_dict: a list of dictionaries of transcript data in JSON format:
        {'start_time': 'YYYY-MM-DDThh:mm:ssZ', 
        'end_time': 'YYYY-MM-DDThh:mm:ssZ', 
        'text': 'Transcript text here...',
        'summary': 
            {
                '5_word_summary': 'Brief summary here.',
                '20_word_summary': 'Longer summary here.'
            }
        }
        - target: dictionary of emotion thresholds
        - nos_entry_before (optional): Number of entries to look back for context
    
    Outputs:
        - things_happened: List of dictionaries containing details about what happened before and during exceedance periods
        {
            'emotion': 'bored', 
            'exceedance_period': ('2025-01-15T10:26:00Z', '2025-01-15T10:28:00Z'), # (begin time, end time)
            'trend': {'Increasing': ['bored', 'confused', 'frustrated'], 'Decreasing': ['engaged', 'excited'], 'No trend': []}, 
            'lecture_contents_before': ['Linear Regression Examples'], 
            'lecture_contents_during': ['Break - Interactive Demo', 'Linear Regression Examples']
        }
        - unique_sessions: List of dictionaries containing matched transcript segments, generated multiple choice questions and answers
        {
            'start_time': '2025-01-15T10:20:00Z',
            'end_time': '2025-01-15T10:28:00Z',
            'text': 'Transcript text here...',
            'summary': {
                '5_word_summary': 'summary in 5 words here',
                '20_word_summary': 'summary in 20 words here'
            },
            'questions': {
                'question_1': {
                    'question': 'Which of the following is NOT mentioned as a feature used in the house price prediction example?',
                    'options': ['A. Square footage', 'B. Number of bedrooms', 'C. Market trend index', 'D. Age of the house'],
                    'answer': 'C'}
                },
                'question_2': {...},
                'question_3': {...}
            }
        }

    """
    
    # Initialize Anthropic client with API key from environment
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    client = Anthropic(api_key=api_key)
    
    # Load data into DataFrame
    df = pd.DataFrame(data)

    # find the timestamp when emotions exceed thresholds
    results, periods = {}, {}
    for emotion, threshold in target.items():
        exceed_times_df = df.loc[df[emotion] > threshold, 'timestamp']
        results[emotion] = exceed_times_df.tolist()

        # group consecutive indices into runs (break when idx != prev+1)
        exceed_idx = sorted(exceed_times_df.index.tolist())
        if not exceed_idx:
            periods[emotion] = []
        else:
            runs = []
            start = prev = exceed_idx[0]
            for idx in exceed_idx[1:]:
                if idx == prev + 1:
                    prev = idx
                else:
                    runs.append((start, prev))
                    start = prev = idx
            runs.append((start, prev))

            # convert index runs to timestamp (start_time, end_time)
            periods[emotion] = [(df.loc[s, 'timestamp'], df.loc[e, 'timestamp']) for s, e in runs]


    print(f"Periods of consecutive exceedance: {periods}\n")

    # Task 1 - find what happened before and during the exceedance
    things_happened = []
    for emotion, times in periods.items():
        for t in times:
            idx = df.index[df['timestamp'] == t[0]][0]      # find the start time of each period
            context_start = max(0, idx - nos_entry_before)  # n entries before
            context = df.iloc[context_start: idx+1]         # from the context start to the exceedance time

            # (i) find the trend of emotion values
            trend = cal_trend(context) if not context.empty else "Not enough data"
            # print(f"Context before {emotion} exceedance at {t}: {trend}")

            # (ii) find the lectureContent before the exceedance
            lecture_contents = set(context['lectureContent'].dropna().tolist())
            # print(f"Lecture contents before {emotion} exceedance at {t}: {lecture_contents}")

            # (iii) find the lectureContent during the exceedance
            exceedance_context = df.loc[df['timestamp'].between(t[0], t[1]), 'lectureContent'].dropna().tolist()
            exceedance_contents = set(exceedance_context)
            # print(f"Lecture contents during {emotion} exceedance from {t[0]} to {t[1]}: {exceedance_contents}")
            # print()

            things_happened.append({
                "emotion": emotion,
                "exceedance_period": t,
                "trend": trend,
                "lecture_contents_before": list(lecture_contents),
                "lecture_contents_during": list(exceedance_contents)
            })

    # Generate a couple of example questions based on the lecture contents
    session_matched = []
    # for each exceedance period, find the overlapping transcript entries
    for event in things_happened:
        exceedance_period = event["exceedance_period"]
        # output the dictionaries in the transcript that overlaps the exceedance
        matched = find_transcripts_for_period(exceedance_period, transcript_dict)
        session_matched.extend(matched)
    # deduplicate session_matched based on (start_time, end_time)
    unique_sessions = list({(d['start_time'], d['end_time']): d for d in session_matched}.values())

    if unique_sessions:
        for content in unique_sessions:
            taught_text = content.get("text", "")
            question_prompt = """This is the part of the lecture transcript during an emotional exceedance period. 
            Based on this text, generate three multiple choice questions to test whether the student understood the material covered.
            Provide only the questions without any additional explanation. Output the questions in the following dictionary:
            {
                "question_1": 
                    {"question": "First question here?",
                    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
                    "answer": "B"
                    },
                "question_2": {"question": "Second question here?",
                    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
                    "answer": "C"
                    },
                "question_3": {"question": "Third question here?",
                    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
                    "answer": "A"
                    },
            }    
            """
            question_raw = send_message(client, message=question_prompt + taught_text, max_tokens=1000)
            question = extract_json_from_claude_response(question_raw)
            content['questions'] = question
            # print(f"Generated questions for exceedance period {content['start_time']} to {content['end_time']}:\n{question}\n")
    
    return things_happened, unique_sessions
    
def main():
    # Example usage
    with open("data/dummy.JSON", "r") as f:
        emotion_data = json.load(f)['sentimentTimeline']

    with open("data/ml_transcript.json", "r") as f:
        transcript_data = json.load(f)

    emotion_thresholds = {
        "bored": 0.3,
        "confused": 0.3,
        "frustrated": 0.3,
    }

    things_happened, unique_sessions = pose_questions(
        data=emotion_data,
        transcript_dict=transcript_data,
        target=emotion_thresholds,
        nos_entry_before=2
    )

    print("Things that happened during exceedance periods:")
    print(json.dumps(things_happened, indent=2))

    print("\nUnique sessions with generated questions:")
    print(json.dumps(unique_sessions, indent=2))

if __name__ == "__main__":
    main()
