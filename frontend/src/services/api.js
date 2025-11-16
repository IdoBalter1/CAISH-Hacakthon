/**
 * Main API Service for Backend Integration
 * 
 * This service handles all communication with the backend API.
 * The backend should implement a REST API (Flask/FastAPI) with the following endpoints:
 * 
 * WORKFLOW:
 * 1. POST /api/engagement/start - Start recording engagement + audio
 * 2. POST /api/engagement/frame - Send video frame for analysis (optional, real-time)
 * 3. POST /api/engagement/audio-chunk - Send audio chunk (optional, streaming)
 * 4. POST /api/engagement/stop - Stop recording, process audio → transcript
 * 5. GET /api/engagement/data/:sessionId - Get engagement data
 * 6. POST /api/lecture/summary - Generate lecture summary from transcript
 * 7. POST /api/lecture/mcqs - Generate MCQs from engagement + transcript
 * 8. POST /api/report/generate - Generate user report from engagement + MCQ performance
 * 9. POST /api/plan/generate - Generate study plan from engagement + MCQ performance
 * 10. GET /api/sentiment-timeline/:sessionId - Get sentiment timeline for graphs
 */

// Lazy get API base URL to prevent blocking on module load
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000' // Server-side fallback
  }
  return (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) 
    ? process.env.REACT_APP_API_URL 
    : 'http://localhost:8000'
}

const getApiUrl = () => getApiBaseUrl()

// Helper function for API calls with timeout
const apiCall = async (endpoint, options = {}, timeout = 10000) => {
  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API not available')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const apiUrl = getApiUrl()
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error(`Request timeout - backend at ${getApiUrl()} may not be available. Make sure the API server is running.`)
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(`Cannot connect to backend at ${getApiUrl()}. Is the API server running? Start it with: python api_server.py`)
    }
    throw error
  }
}

/**
 * Check if backend is available
 * @returns {Promise<boolean>}
 */
export const checkBackendHealth = async () => {
  try {
    const apiUrl = getApiUrl()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // Increased timeout
    
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      await response.json()
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}

/**
 * ENGAGEMENT MONITORING API
 */

/**
 * Start engagement monitoring session
 * @param {string} lectureName - Name of the lecture
 * @returns {Promise<{sessionId: string, success: boolean}>}
 */
export const startEngagementSession = async (lectureName = 'Live Lecture') => {
  return apiCall('/api/engagement/start', {
    method: 'POST',
    body: JSON.stringify({ lecture_name: lectureName }),
  }, 5000)
}

/**
 * Send video frame for real-time analysis (optional)
 * @param {Blob} frameBlob - Video frame as blob
 * @param {string} sessionId - Session ID
 * @returns {Promise<{scores: object, state: string, emotion: string}>}
 */
export const analyzeFrame = async (frameBlob, sessionId) => {
  const formData = new FormData()
  formData.append('frame', frameBlob, 'frame.jpg')
  formData.append('session_id', sessionId)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(`${getApiUrl()}/api/engagement/frame`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

/**
 * Send audio chunk (optional, for streaming)
 * @param {Blob} audioBlob - Audio chunk as blob
 * @param {string} sessionId - Session ID
 * @returns {Promise<{success: boolean}>}
 */
export const sendAudioChunk = async (audioBlob, sessionId) => {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.wav')
  formData.append('session_id', sessionId)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${getApiUrl()}/api/engagement/audio-chunk`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

/**
 * Stop engagement monitoring and process audio
 * @param {string} sessionId - Session ID
 * @param {Blob} audioBlob - Final audio recording (if not streamed)
 * @returns {Promise<{sessionId: string, engagementData: object, transcript: object}>}
 */
export const stopEngagementSession = async (sessionId, audioBlob = null) => {
  if (audioBlob) {
    // Send audio file if provided
    const formData = new FormData()
    // Use correct filename based on blob type (webm from MediaRecorder)
    const filename = audioBlob.type.includes('webm') ? 'recording.webm' : 'recording.wav'
    formData.append('audio', audioBlob, filename)
    formData.append('session_id', sessionId)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s for audio processing

    try {
      const response = await fetch(`${getApiUrl()}/api/engagement/stop`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - audio processing may take longer')
      }
      throw error
    }
  } else {
    // Just stop the session
    return apiCall('/api/engagement/stop', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }, 10000)
  }
}

/**
 * Get current engagement data
 * @param {string} sessionId - Session ID
 * @returns {Promise<{scores: object, state: string, emotion: string}>}
 */
export const getCurrentEngagement = async (sessionId) => {
  return apiCall(`/api/engagement/current/${sessionId}`, {
    method: 'GET',
  }, 3000)
}

/**
 * Get engagement data for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Engagement data matching engagement_monitor.py export format
 */
export const getEngagementData = async (sessionId) => {
  return apiCall(`/api/engagement/data/${sessionId}`, {
    method: 'GET',
  }, 5000)
}

/**
 * LECTURE PROCESSING API
 */

/**
 * Generate lecture summary from transcript
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} Lecture summary matching lectureSummaryData.js format
 */
export const generateLectureSummary = async (sessionId) => {
  return apiCall('/api/lecture/summary', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  }, 30000) // 30s timeout for AI generation
}

/**
 * Generate MCQs from engagement data and transcript
 * @param {string} sessionId - Session ID
 * @returns {Promise<object>} MCQ data matching mcqData.js format
 */
export const generateMCQs = async (sessionId) => {
  return apiCall('/api/lecture/mcqs', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  }, 30000) // 30s timeout for AI generation
}

/**
 * USER REPORT API
 */

/**
 * Generate user report from engagement data and MCQ performance
 * @param {string} sessionId - Session ID
 * @param {Array<{questionId: number, selectedAnswer: number, isCorrect: boolean}>} mcqResults - MCQ performance data
 * @returns {Promise<object>} User report matching userReportData.js format
 */
export const generateUserReport = async (sessionId, mcqResults = []) => {
  return apiCall('/api/report/generate', {
    method: 'POST',
    body: JSON.stringify({ 
      session_id: sessionId,
      mcq_results: mcqResults,
    }),
  }, 30000) // 30s timeout for AI generation
}

/**
 * STUDY PLAN API
 */

/**
 * Generate study plan from engagement data and MCQ performance
 * @param {string} sessionId - Session ID
 * @param {Array<{questionId: number, selectedAnswer: number, isCorrect: boolean}>} mcqResults - MCQ performance data
 * @returns {Promise<object>} Study plan matching studyPlanData.js format
 */
export const generateStudyPlan = async (sessionId, mcqResults = []) => {
  return apiCall('/api/plan/generate', {
    method: 'POST',
    body: JSON.stringify({ 
      session_id: sessionId,
      mcq_results: mcqResults,
    }),
  }, 30000) // 30s timeout for AI generation
}

/**
 * SENTIMENT TIMELINE API
 */

/**
 * Get sentiment timeline for graphs
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Sentiment timeline matching dummy.JSON format:
 *   [{timestamp: string, bored: number, confused: number, engaged: number, 
 *     frustrated: number, excited: number, lectureContent: string}]
 */
export const getSentimentTimeline = async (sessionId) => {
  return apiCall(`/api/sentiment-timeline/${sessionId}`, {
    method: 'GET',
  }, 5000)
}

/**
 * DATA TRANSFORMATION UTILITIES
 */

/**
 * Transform backend engagement timeline to frontend sentiment timeline format
 * @param {Array} engagementTimeline - From engagement_monitor.py export
 * @param {Array} transcriptData - From audio transcription
 * @returns {Array} Frontend sentiment timeline format
 */
export const transformToSentimentTimeline = (engagementTimeline, transcriptData = []) => {
  return engagementTimeline.map((entry) => {
    // Map engagement scores to sentiment scores
    // Backend: concentrated, engaged, confused, bored
    // Frontend: bored, confused, engaged, frustrated, excited
    
    const scores = entry.scores || {}
    
    // Find matching transcript for lectureContent
    let lectureContent = ''
    if (transcriptData && transcriptData.length > 0) {
      const entryTime = new Date(entry.timestamp)
      const matched = transcriptData.find((t) => {
        const start = new Date(t.start_time)
        const end = new Date(t.end_time)
        return entryTime >= start && entryTime <= end
      })
      if (matched && matched.summary) {
        lectureContent = typeof matched.summary === 'string' 
          ? JSON.parse(matched.summary)['5_word_summary'] || ''
          : matched.summary['5_word_summary'] || ''
      }
    }
    
    return {
      timestamp: entry.timestamp,
      bored: (scores.bored || 0) / 100, // Convert from 0-100 to 0-1
      confused: (scores.confused || 0) / 100,
      engaged: (scores.engaged || 0) / 100,
      frustrated: 0, // Not in backend, set to 0 or calculate from confused
      excited: (scores.engaged || 0) * 0.3 / 100, // Approximate from engaged
      lectureContent: lectureContent,
    }
  })
}

export default {
  // Health
  checkBackendHealth,
  
  // Engagement
  startEngagementSession,
  analyzeFrame,
  sendAudioChunk,
  stopEngagementSession,
  getCurrentEngagement,
  getEngagementData,
  
  // Lecture
  generateLectureSummary,
  generateMCQs,
  
  // Reports
  generateUserReport,
  generateStudyPlan,
  
  // Data
  getSentimentTimeline,
  transformToSentimentTimeline,
}

