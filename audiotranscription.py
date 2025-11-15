import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import speech_recognition as sr
import json


import speech_recognition as sr 
import os 
from pydub import AudioSegment
from pydub.silence import split_on_silence

# create a speech recognition object
r = sr.Recognizer()

# a function to recognize speech in the audio file
# so that we don't repeat ourselves in in other functions
def transcribe_audio(path):
    # use the audio file as the audio source
    with sr.AudioFile(path) as source:
        audio_listened = r.record(source)
        # try converting it to text
        text = r.recognize_google(audio_listened)
    return text

# a function that splits the audio file into fixed interval chunks
# and applies speech recognition
def get_large_audio_transcription_fixed_interval(path, minutes=0.5):
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
    # process each chunk 
    results = []  # to store transcriptions with timestamps
    for i, audio_chunk in enumerate(chunks, start=1):
        # export audio chunk and save it in
        # the `folder_name` directory.
        start_time = (i - 1) * (chunk_length_ms / 1000)
        end_time = i * (chunk_length_ms / 1000)
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


        results.append({
            "start_time": start_time,
            "end_time": end_time,
            "text": text
        })
        print(f"Chunk {i} ({start_time:.2f}s - {end_time:.2f}s): {text}")
        results_json = json.dumps(results, indent=4)
    # return the results
    return results_json
