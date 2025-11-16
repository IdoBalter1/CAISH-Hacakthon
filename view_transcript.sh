#!/bin/bash
# Quick script to view transcripts

echo "📁 Transcript Files:"
echo ""
ls -lh data/transcripts/ 2>/dev/null | tail -10 || echo "No transcripts yet"
echo ""

# If a specific file is requested
if [ -n "$1" ]; then
    if [ -f "data/transcripts/$1" ]; then
        echo "📄 Viewing: data/transcripts/$1"
        echo ""
        cat "data/transcripts/$1" | python3 -m json.tool
    else
        echo "File not found: data/transcripts/$1"
    fi
else
    # Show latest transcript
    LATEST=$(ls -t data/transcripts/*.json 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        echo "📄 Latest Transcript:"
        echo "$LATEST"
        echo ""
        cat "$LATEST" | python3 -m json.tool | head -100
    else
        echo "No transcripts found. Record something first!"
    fi
fi

