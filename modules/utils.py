"""
Supporting functions for content extraction and analysis.
"""

import re
import json
import os
from datetime import datetime
from typing import List, Dict, Tuple
from anthropic import Anthropic


def init_anthropic_client():
    """
    Initialize and return an Anthropic client using API key from environment.
    
    Returns:
        Anthropic client instance
        
    Raises:
        ValueError: If ANTHROPIC_API_KEY is not set in environment
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found in environment variables. Please set it in .env file.")
    return Anthropic(api_key=api_key)


def cal_trend(df_chunk):
    """
    Calculate trends for all numerical columns in a dataframe chunk.
    
    Args:
        df_chunk: DataFrame containing timestamp, lectureContent and numerical columns
        
    Returns:
        Dictionary with trend labels as keys and lists of column names as values
    """
    df_edit = df_chunk.drop(columns=["timestamp", "lectureContent"])
    remaining_columns = df_edit.columns.tolist()
    trend_results = {col: _cal_trend(df_edit[col].tolist()) for col in remaining_columns}
    labels = ["Increasing", "Decreasing", "No trend"]
    trend_ft = {lab: [k for k, v in trend_results.items() if v == lab] for lab in labels}
    return trend_ft


def _cal_trend(data):
    """
    Calculate the trend of a list of numerical data.
    
    Args:
        data: List of numerical values
        
    Returns:
        String indicating "Increasing", "Decreasing", or "No trend"
    """
    if len(data) < 2:
        return "Not enough data to determine trend."
    if data[-1] > data[0]:
        return "Increasing"
    elif data[-1] < data[0]:
        return "Decreasing"
    else:
        return "No trend"


def send_message(client, message, model="claude-haiku-4-5", max_tokens=1000):
    """
    Send a message to Claude API and get response.
    
    Args:
        client: Anthropic client instance
        message: Message text to send
        model: Model name to use (default: claude-haiku-4-5)
        max_tokens: Maximum tokens in response (default: 1000)
        
    Returns:
        Response text from Claude
    """
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "user",
                "content": message
            }
        ]
    )
    return response.content[0].text


def extract_json_from_claude_response(response_text):
    """
    Extract JSON from Claude's response, handling markdown code blocks.
    
    Args:
        response_text: The raw text from Claude's response
        
    Returns:
        Parsed JSON object (dict or list)
        
    Raises:
        json.JSONDecodeError: If JSON parsing fails
    """
    # Method 1: Try to extract from markdown code blocks
    # Pattern matches ```json ... ``` or ``` ... ```
    json_pattern = r'```(?:json)?\s*\n(.*?)\n```'
    match = re.search(json_pattern, response_text, re.DOTALL)
    
    if match:
        json_str = match.group(1)
    else:
        # Method 2: If no code blocks, assume entire response is JSON
        json_str = response_text
    
    # Parse and return the JSON
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print(f"Attempted to parse: {json_str[:200]}...")
        raise


def parse_iso_z(ts: str) -> datetime:
    """
    Parse ISO 8601 timestamp with Z suffix.
    
    Args:
        ts: ISO timestamp string (e.g., "2025-01-15T10:26:00Z")
        
    Returns:
        datetime object
    """
    # convert trailing Z to +00:00 so fromisoformat works
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.fromisoformat(ts)


def overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    """
    Check if two time periods overlap.
    
    Args:
        a_start: Start of first period
        a_end: End of first period
        b_start: Start of second period
        b_end: End of second period
        
    Returns:
        True if periods overlap, False otherwise
    """
    return (a_start <= b_end) and (b_start <= a_end)


def find_transcripts_for_period(exceedance: Tuple[str, str], transcripts: List[Dict]) -> List[Dict]:
    """
    Find transcript entries that overlap with an exceedance period.
    
    Args:
        exceedance: Tuple of (start_time, end_time) as ISO strings
                   e.g., ('2025-01-15T10:26:00Z','2025-01-15T10:28:00Z')
        transcripts: List of dicts with 'start_time' and 'end_time' ISO strings
        
    Returns:
        List of transcript entries that overlap the exceedance period
    """
    es, ee = map(parse_iso_z, exceedance)
    matches = []
    for entry in transcripts:
        ts = parse_iso_z(entry['start_time'])
        te = parse_iso_z(entry['end_time'])
        if overlaps(es, ee, ts, te):
            matches.append(entry)
    return matches
