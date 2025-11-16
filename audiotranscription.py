import numpy as np
import pandas as pd
import speech_recognition as sr
import json
import os
from dotenv import load_dotenv
from anthropic import Anthropic, HUMAN_PROMPT, AI_PROMPT
from pathlib import Path
import anthropic
# import speech_recognition as sr 
import os 
from pydub import AudioSegment
from pydub.silence import split_on_silence
from datetime import datetime, timedelta

client = anthropic.Anthropic()
# create a speech recognition object
r = sr.Recognizer()
load_dotenv()
api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("API key not found. Make sure ANTHROPIC_API_KEY is set in your .env file.")

client = Anthropic(api_key=api_key)
# a function to recognize speech in the audio file
# so that we don't repeat ourselves in in other functions
def transcribe_audio(path):
    # use the audio file as the audio source
    with sr.AudioFile(path) as source:
        audio_listened = r.record(source)
        # try converting it to text
        text = r.recognize_google(audio_listened)
    return text

def create_summary(text):
    # Initialize the Anthropic client with the API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("API key not found. Make sure ANTHROPIC_API_KEY is set.")
    
    client = Anthropic(api_key=api_key)
    
    # Define the prompt for Claude
    prompt = f"""Please create a JSON object with exactly this structure:
    {{
        "5_word_summary": "five word summary here",
        "20_word_summary": "twenty word summary here"
    }}

    Summarize the following text according to the word counts specified:

    {text}

    Return ONLY valid JSON with no additional text or formatting."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    # Extract and return the summary
    summary = response.content[0].text
    return summary

# a function that splits the audio file into fixed interval chunks
# and applies speech recognition
def audio_to_json(path, 
                  minutes=0.5, 
                  real_start_time=None):
    """Splitting the large audio file into fixed interval chunks
    and apply speech recognition on each of these chunks"""
    # open the audio file using pydub
    sound = AudioSegment.from_file(path)  
    # split the audio file into chunks
    chunk_length_ms = int(1000 * 60 * minutes) # convert to milliseconds
    chunks = [sound[i:i + chunk_length_ms] for i in range(0, len(sound), chunk_length_ms)]
    folder_name = "audio-fixed-chunks"
    # create a directory to store the audio chunks
    if not os.path.isdir(folder_name):
        os.mkdir(folder_name)
    
    # find the start time
    if real_start_time is None:
        real_start_time = datetime.now()
    # Convert real_start_time (float) to datetime
    if isinstance(real_start_time, float):
        real_start_time = datetime.fromtimestamp(real_start_time)

    # process each chunk 
    results = []  # to store transcriptions with timestamps
    for i, audio_chunk in enumerate(chunks, start=1):
        
        # start_time = (i - 1) * (chunk_length_ms / 1000)
        # end_time = i * (chunk_length_ms / 1000)

        # Calculate start and end times using timedelta
        chunk_duration_sec = chunk_length_ms / 1000
        start_time = real_start_time + timedelta(seconds=(i - 1) * chunk_duration_sec)
        end_time = real_start_time + timedelta(seconds=i * chunk_duration_sec)

        # export audio chunk and save it in the `folder_name` directory.
        chunk_filename = os.path.join(folder_name, f"chunk{i}.wav")
        audio_chunk.export(chunk_filename, format="wav")
        # recognize the chunk
        try:
            text = transcribe_audio(chunk_filename)
        except sr.UnknownValueError as e:
            print("Error:", str(e))
            text = "[Unintelligible]" 
        else:
            text = f"{text.capitalize()}. "

        summary = create_summary(text)
        results.append({
            "start_time": start_time.isoformat()+ 'Z',
            "end_time": end_time.isoformat()+ 'Z',
            "text": text,
            "summary": summary
        })
        print(f"Chunk {i} ({start_time:.2f}s - {end_time:.2f}s): {text}")
        results_json = json.dumps(results, indent=4)
        print(results_json)
    # return the results
    return results_json

text = """
Artificial intelligence (AI) represents one of the most transformative technological revolutions of the 21st century, fundamentally reshaping the landscape of virtually every industry and sector of the global economy. This paradigm shift is manifesting itself through three primary mechanisms that are profoundly altering how businesses operate, compete, and deliver value to their stakeholders.

First and foremost, AI is revolutionizing the automation of tasks across the entire spectrum of business operations. From routine, repetitive processes that once consumed countless hours of human labor to complex workflows that require sophisticated pattern recognition and data processing, AI-powered automation systems are dramatically increasing operational efficiency while simultaneously reducing costs and minimizing human error. Manufacturing facilities are deploying intelligent robotics and computer vision systems that can work continuously without fatigue, maintaining consistent quality standards and adapting to variations in production requirements. In the service sector, chatbots and virtual assistants powered by natural language processing are handling customer inquiries 24/7, providing instant responses and freeing human employees to focus on more complex, nuanced interactions that require emotional intelligence and creative problem-solving. Administrative tasks such as data entry, document processing, invoice management, and scheduling are being streamlined through intelligent automation platforms that can learn from patterns and improve their performance over time.

Secondly, AI is fundamentally enhancing decision-making capabilities across organizational hierarchies by providing unprecedented analytical insights derived from vast quantities of data. Machine learning algorithms can identify patterns, correlations, and anomalies in datasets that would be impossible for human analysts to detect manually, enabling more informed, data-driven decisions that are based on objective evidence rather than intuition or limited sample sizes. Predictive analytics powered by AI can forecast market trends, customer behavior, equipment failures, and supply chain disruptions with remarkable accuracy, allowing organizations to proactively address challenges before they escalate into critical problems. In healthcare, AI-assisted diagnostic systems are helping physicians identify diseases earlier and more accurately by analyzing medical images, patient histories, and genetic data. Financial institutions are leveraging AI to assess credit risk, detect fraudulent transactions in real-time, and optimize investment portfolios based on complex market dynamics. Strategic planning processes are being enhanced by AI systems that can simulate multiple scenarios, evaluate potential outcomes, and recommend optimal courses of action while accounting for numerous variables and constraints that would overwhelm traditional analytical approaches.

Thirdly, AI is enabling entirely new capabilities and business models that were previously impossible or economically unfeasible, opening up innovative opportunities for value creation and competitive differentiation. Autonomous vehicles are reimagining transportation and logistics, with the potential to dramatically reduce accidents caused by human error while optimizing route efficiency and fuel consumption. Personalization at scale has become achievable through AI recommendation engines that can tailor products, services, content, and experiences to individual preferences and behaviors across millions of customers simultaneously. Natural language generation systems are creating written content, from financial reports to news articles, while computer vision applications are enabling facial recognition, object detection, and visual quality inspection with superhuman accuracy. In scientific research, AI is accelerating drug discovery by predicting molecular interactions, analyzing clinical trial data, and identifying promising compounds from vast chemical libraries. Creative industries are being augmented by AI tools that can generate art, music, design elements, and even code, serving as collaborative partners that amplify human creativity rather than replacing it. The convergence of AI with other emerging technologies such as the Internet of Things, blockchain, and quantum computing promises to unlock even more revolutionary applications that will continue to reshape society and the economy in ways we are only beginning to understand.

This multifaceted transformation driven by artificial intelligence is not merely an incremental improvement in existing processes but represents a fundamental reimagining of what is possible in terms of efficiency, insight, and innovation across every domain of human endeavor.
"""

if __name__ == "__main__":
    ...
    # summary = create_summary(text)
    # print("Summary:", summary)
    # summary = create_summary(text)
    # print("Summary:", summary)
    # audio_file_path = Path(r"C:\Users\ieb28\Downloads\Voice 251115_155213.wav")
    # results_json = get_large_audio_transcription_fixed_interval(audio_file_path, minutes=1)
    # print("Transcription Results:", results_json)

    #def extract_audio_files(time)