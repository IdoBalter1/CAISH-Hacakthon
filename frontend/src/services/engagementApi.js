/**
 * Engagement Monitoring API Service
 * 
 * This service handles communication with the backend engagement monitoring API.
 * The backend should implement the following endpoints:
 * 
 * POST /api/engagement/start
 *   Body: { lecture_name: string }
 *   Response: { success: boolean, session_id?: string }
 * 
 * GET /api/engagement/current
 *   Response: {
 *     scores: {
 *       concentrated: number,
 *       engaged: number,
 *       confused: number,
 *       bored: number
 *     },
 *     state: string,
 *     emotion: string
 *   }
 * 
 * POST /api/engagement/stop
 *   Response: {
 *     metadata: {
 *       lecture_name: string,
 *       start_time: string (ISO),
 *       end_time: string (ISO),
 *       duration_seconds: number,
 *       total_data_points: number
 *     },
 *     engagement_timeline: Array<{
 *       timestamp: string (ISO),
 *       elapsed_seconds: number,
 *       scores: {
 *         concentrated: number,
 *         engaged: number,
 *         confused: number,
 *         bored: number
 *       }
 *     }>,
 *     summary_statistics: {
 *       avg_scores: {
 *         concentrated: number,
 *         engaged: number,
 *         confused: number,
 *         bored: number
 *       },
 *       key_moments: {
 *         confusion_peaks: Array<...>,
 *         boredom_periods: Array<...>
 *       }
 *     }
 *   }
 */

// Lazy get API base URL to prevent blocking on module load
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000' // Server-side fallback
  }
  // Use environment variable or default
  return (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) 
    ? process.env.REACT_APP_API_URL 
    : 'http://localhost:8000'
}

// Don't evaluate on module load - evaluate when function is called
const getApiUrl = () => getApiBaseUrl()

/**
 * Start engagement monitoring session
 * @param {string} lectureName - Name of the lecture
 * @returns {Promise<Object>} Response from backend
 */
export const startEngagementMonitoring = async (lectureName = 'Live Lecture') => {
  // Quick check - if fetch is not available, fail immediately
  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API not available')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // Reduced to 3 second timeout

    const response = await fetch(`${getApiUrl()}/api/engagement/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lecture_name: lectureName,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error('Request timeout - backend may not be available')
    }
    // Don't log network errors as errors - they're expected when backend is down
    if (!error.message.includes('timeout') && !error.message.includes('Failed to fetch')) {
      console.error('Error starting engagement monitoring:', error)
    }
    throw error
  }
}

/**
 * Get current engagement data
 * @returns {Promise<Object>} Current engagement scores and state
 */
export const getCurrentEngagement = async () => {
  // Quick check - if fetch is not available, fail immediately
  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API not available')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // Reduced to 2 second timeout

    const response = await fetch(`${getApiUrl()}/api/engagement/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error('Request timeout - backend may not be available')
    }
    // Don't log network errors as errors - they're expected when backend is down
    if (!error.message.includes('timeout') && !error.message.includes('Failed to fetch')) {
      console.error('Error fetching current engagement:', error)
    }
    throw error
  }
}

/**
 * Stop engagement monitoring and get final data
 * @returns {Promise<Object>} Complete engagement data
 */
export const stopEngagementMonitoring = async () => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${getApiUrl()}/api/engagement/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - backend may not be available')
    }
    console.error('Error stopping engagement monitoring:', error)
    throw error
  }
}

/**
 * Send video frame to backend for analysis
 * @param {Blob} frameBlob - Video frame as blob
 * @returns {Promise<Object>} Analysis result
 */
export const analyzeFrame = async (frameBlob) => {
  try {
    const formData = new FormData()
    formData.append('frame', frameBlob, 'frame.jpg')

    const response = await fetch(`${getApiUrl()}/api/engagement/analyze-frame`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error analyzing frame:', error)
    throw error
  }
}

export default {
  startEngagementMonitoring,
  getCurrentEngagement,
  stopEngagementMonitoring,
  analyzeFrame,
}

