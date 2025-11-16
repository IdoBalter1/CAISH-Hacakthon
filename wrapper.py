# from engagement_monitor import main as eng_vid
from pose_question import pose_questions, parse_transcript

import os
import json
import pandas as pd
from anthropic import Anthropic
from convert_to_mcq_data import convert_questions_to_mcq
from modules.utils import (
    init_anthropic_client,
    cal_trend,
    send_message,
    extract_json_from_claude_response,
    find_transcripts_for_period
)

def record_question(unique_sessions_file='output/questions.json',
                    output_file='output/mcqData.js',):
        
    client = init_anthropic_client()

    # eng_vid()

    # Import sentiment recording
    with open("data/engagement_Test1_2025-11-16_10-32-17.json", "r") as f:
        emotion_data = json.load(f)['engagement_timeline']

    # Import transcript data
    transcript_data = parse_transcript("data/ml_transcript_synced.json", client)
    # with open("data/ml_transcript.json", "r") as f:
    #     transcript_data = json.load(f)

    emotion_thresholds = {
        "bored": 30,
        "confused": 30,
        # "frustrated": 0.3,
    }

    things_happened, unique_sessions = pose_questions(
        client=client,
        data=emotion_data,
        transcript_dict=transcript_data,
        target=emotion_thresholds,
        nos_entry_before=2
    )

    # Save unique_sessions to file
    os.makedirs('output', exist_ok=True)
    with open(unique_sessions_file, 'w') as f:
        json.dump(unique_sessions, f, indent=2)

    title_prompt = "Based on the transcript_data, can you generate me a short title of the lecture? The best output only, within 10 words please."
    title_raw = send_message(client, message=title_prompt + str(transcript_data), max_tokens=100)

    # Save to file
    os.makedirs('output', exist_ok=True)
    mcq_data = convert_questions_to_mcq(input_file=unique_sessions_file,
                                        output_file=output_file, 
                                        title=title_raw)
    

if __name__ == "__main__":
    record_question()