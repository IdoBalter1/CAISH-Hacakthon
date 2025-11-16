# Listant API Server

Flask REST API server that integrates all backend functionality for the Listant application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
Create a `.env` file with:
```
ANTHROPIC_API_KEY=your_api_key_here
```

3. Run the server:
```bash
python api_server.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Engagement Monitoring

- `POST /api/engagement/start` - Start a new engagement monitoring session
- `GET /api/engagement/current/<session_id>` - Get current engagement scores
- `POST /api/engagement/stop` - Stop monitoring and process audio
- `GET /api/engagement/data/<session_id>` - Get full engagement data
- `GET /api/sentiment-timeline/<session_id>` - Get sentiment timeline for graphs

### Lecture Processing

- `POST /api/lecture/summary` - Generate lecture summary from transcript
- `POST /api/lecture/mcqs` - Generate MCQs from engagement + transcript

### Reports & Plans

- `POST /api/report/generate` - Generate user report from engagement + MCQ performance
- `POST /api/plan/generate` - Generate study plan from engagement + MCQ performance

### Health

- `GET /api/health` - Health check endpoint

## Frontend Integration

The frontend is already configured to use this API. Set the environment variable:
```
REACT_APP_API_URL=http://localhost:8000
```

Or the frontend will default to `http://localhost:8000`.

## Notes

- Sessions are stored in memory (use Redis/database for production)
- Audio files are saved to `data/audio/`
- Engagement data is saved to `data/engagement/`
- Output files are saved to `output/`

