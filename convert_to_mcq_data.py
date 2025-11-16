#!/usr/bin/env python3
"""
Convert questions.json to mcqData.js format
"""

import json
from datetime import datetime

def convert_questions_to_mcq(input_file, output_file, title="Machine Learning Fundamentals"):
    """
    Convert questions.json to mcqData.js format
    
    Args:
        input_file: Path to questions.json
        output_file: Path to output mcqData.js
    """
    
    # Read the input JSON file
    with open(input_file, 'r', encoding='utf-8') as f:
        questions_data = json.load(f)
    
    # Initialize the MCQ data structure
    mcq_questions = []
    question_id = 1
    
    # Iterate through each segment in the input
    for segment in questions_data:
        # Get the topic from the 5-word summary
        topic = segment['summary']['5_word_summary']
        
        # Check if this segment has questions
        if 'questions' in segment:
            # Iterate through each question in the segment
            for question_key, question_data in segment['questions'].items():
                # Create MCQ question object
                mcq_question = {
                    'id': question_id,
                    'topic': topic,
                    'question': question_data['question'],
                    'options': question_data['options'],
                    'correctAnswer': question_data['answer'],
                    'explanation': question_data['explanation']
                }
                
                mcq_questions.append(mcq_question)
                question_id += 1
    
    # Create the final mcqData structure
    mcq_data = {
        'lectureTitle': title,
        'questions': mcq_questions
    }
    
    # Convert to JavaScript format
    js_content = "// MCQ data generated from questions.json\n"
    js_content += "export const mcqData = "
    
    # Convert Python dict to JavaScript object format
    js_content += json.dumps(mcq_data, indent=2, ensure_ascii=False)
    
    # Add semicolon at the end
    js_content += ";\n"
    
    # Write to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"✓ Conversion complete!")
    print(f"  Input: {input_file}")
    print(f"  Output: {output_file}")
    print(f"  Total questions generated: {len(mcq_questions)}")
    
    # Print summary by topic
    topic_counts = {}
    for q in mcq_questions:
        topic = q['topic']
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    
    print(f"\n  Questions by topic:")
    for topic, count in topic_counts.items():
        print(f"    - {topic}: {count} question(s)")
    
    return mcq_data

if __name__ == "__main__":
    input_file = "/mnt/user-data/uploads/questions.json"
    output_file = "/mnt/user-data/outputs/mcqData.js"
    
    mcq_data = convert_questions_to_mcq(input_file, output_file)
