# Listant Backend Setup Guide

## Quick Start

### 1. Install Dependencies

A virtual environment has been created. To install dependencies:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

Or use the simplified install (core dependencies only):
```bash
source venv/bin/activate
pip install flask flask-cors anthropic python-dotenv
```

**Note:** Some dependencies like `opencv-python`, `deepface`, and `pyaudio` may require additional system libraries. Install them as needed for full functionality.

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
ANTHROPIC_API_KEY=your_actual_api_key_here
```

Get your API key from: https://console.anthropic.com/

### 3. Start the API Server

**Option 1: Using the startup script**
```bash
./start_api.sh
```

**Option 2: Manual start**
```bash
source venv/bin/activate
python3 api_server.py
```

The API will be available at `http://localhost:8000`

### 4. Test the API

Check if the server is running:
```bash
curl http://localhost:8000/api/health
```

You should see:
```json
{"status": "healthy", "sessions": 0}
```

## Frontend Integration

The frontend is already configured to connect to `http://localhost:8000`. 

If you need to change the API URL, set the environment variable:
```bash
export REACT_APP_API_URL=http://localhost:8000
```

## Troubleshooting

### Virtual Environment Issues
If you get "command not found" errors:
```bash
python3 -m venv venv
source venv/bin/activate
```

### Missing Dependencies
Some packages may require system libraries:
- `opencv-python`: May need `brew install opencv` on macOS
- `pyaudio`: May need `brew install portaudio` on macOS
- `deepface`: Requires TensorFlow and other ML libraries

For basic API functionality, you only need:
- `flask`
- `flask-cors`
- `anthropic`
- `python-dotenv`

### API Key Issues
Make sure your `.env` file is in the root directory and contains:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Next Steps

1. ✅ Install dependencies (in progress)
2. ⏳ Set up `.env` file with your API key
3. ⏳ Start the API server
4. ⏳ Test the frontend connection

