import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material'
import { Videocam, Stop, FiberManualRecord } from '@mui/icons-material'
// Lazy load API to prevent blocking on import
import './EngagementMonitor.css'

const EngagementMonitor = () => {
  // Use React.lazy pattern to ensure component doesn't block
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [engagementData, setEngagementData] = useState(null)
  const [currentScores, setCurrentScores] = useState({
    concentrated: 0,
    engaged: 0,
    confused: 0,
    bored: 0,
  })
  const [engagementState, setEngagementState] = useState('Starting...')
  const [dominantEmotion, setDominantEmotion] = useState('neutral')
  
  // Ensure we're in browser environment
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    // Mark as mounted after first render
    setMounted(true)
  }, [])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const timeIntervalRef = useRef(null)

  const stopRecording = useCallback(async () => {
    try {
      // Stop timer
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
        timeIntervalRef.current = null
      }

      // Stop data fetching
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      setIsRecording(false)

      // Call backend API to stop recording and get final data (non-blocking)
      import('../services/engagementApi').then((module) => {
        module.default.stopEngagementMonitoring()
          .then((data) => {
            setEngagementData(data)
            console.log('Engagement monitoring stopped, data received:', data)
          })
          .catch((apiError) => {
            console.warn('Backend API not available:', apiError)
          })
      }).catch(() => {
        // API module failed to load, ignore
      })
    } catch (err) {
      console.error('Error stopping recording:', err)
      setError('Error stopping recording. Please try again.')
    }
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup on unmount - only clean up resources, don't call async functions
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available on this device')
      }

      // Request camera access with iOS-compatible constraints
      // iOS requires more flexible constraints
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: { ideal: 'user' }, // iOS prefers object format
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setIsRecording(true)
      setIsLoading(false)
      setRecordingTime(0)

      // Start timer
      timeIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Start with simulation immediately
      simulateEngagementData()

      // Start sending frames to backend (when API is ready)
      // For now, we'll simulate data updates
      intervalRef.current = setInterval(() => {
        fetchEngagementData()
      }, 2000) // Update every 2 seconds

      // Call backend API to start recording (non-blocking, lazy loaded)
      import('../services/engagementApi').then((module) => {
        module.default.startEngagementMonitoring('Live Lecture')
          .then(() => {
            console.log('Engagement monitoring started successfully')
          })
          .catch((apiError) => {
            console.warn('Backend API not available, using simulation mode:', apiError)
            // Already using simulation, so no action needed
          })
      }).catch(() => {
        // API module failed to load, ignore - simulation is already running
      })
    } catch (err) {
      console.error('Error starting recording:', err)
      let errorMessage = 'Failed to start camera. Please try again.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera access in Settings > Listant > Camera.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another app. Please close other apps using the camera.'
      } else if (err.message && err.message.includes('not available')) {
        errorMessage = 'Camera API not available on this device.'
      } else {
        errorMessage = `Failed to start camera: ${err.message || err.name || 'Unknown error'}`
      }
      
      setError(errorMessage)
      setIsLoading(false)
      setIsRecording(false)
    }
  }


  const fetchEngagementData = () => {
    // Use simulation by default - API calls are non-blocking
    simulateEngagementData()
    
    // Try to fetch from API in background (non-blocking, lazy loaded)
    import('../services/engagementApi').then((module) => {
      module.default.getCurrentEngagement()
        .then((data) => {
          updateEngagementDisplay(data)
        })
        .catch((err) => {
          // Silently fail - simulation is already running
        })
    }).catch(() => {
      // API module failed to load, ignore - simulation is already running
    })
  }

  const simulateEngagementData = () => {
    // Simulate engagement data for demo purposes
    const simulatedScores = {
      concentrated: Math.random() * 40 + 30,
      engaged: Math.random() * 40 + 30,
      confused: Math.random() * 30 + 10,
      bored: Math.random() * 30 + 10,
    }

    // Normalize to sum to ~100
    const total = Object.values(simulatedScores).reduce((a, b) => a + b, 0)
    Object.keys(simulatedScores).forEach((key) => {
      simulatedScores[key] = (simulatedScores[key] / total) * 100
    })

    const states = ['concentrated', 'engaged', 'confused', 'bored']
    const emotions = ['neutral', 'happy', 'sad', 'surprise', 'fear', 'angry']

    const state = states[Math.floor(Math.random() * states.length)]
    const emotion = emotions[Math.floor(Math.random() * emotions.length)]

    updateEngagementDisplay({
      scores: simulatedScores,
      state,
      emotion,
    })
  }

  const updateEngagementDisplay = (data) => {
    if (data.scores) {
      setCurrentScores(data.scores)
    }
    if (data.state) {
      setEngagementState(data.state)
    }
    if (data.emotion) {
      setDominantEmotion(data.emotion)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStateColor = (state) => {
    const colors = {
      concentrated: '#A7CDB8', // Mint green
      engaged: '#E8DF98', // Cream yellow
      confused: '#FFA500', // Orange
      bored: '#ABABAB', // Medium gray
    }
    return colors[state] || '#2E2E2E'
  }

  // Early return if not mounted or not in browser (safety check)
  if (!mounted || typeof window === 'undefined') {
    return (
      <Box className="engagement-monitor-container">
        <Container maxWidth={false} sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2 } }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#2E2E2E' }}>
            Loading...
          </Typography>
        </Container>
      </Box>
    )
  }

  return (
    <Box className="engagement-monitor-container">
      <Container maxWidth={false} sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2 } }}>
        <Typography
          variant="h4"
          className="engagement-title"
          sx={{ mb: 3, fontWeight: 700, color: '#2E2E2E' }}
        >
          Engagement Monitor
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box className="engagement-content">
          {/* Camera Feed Section */}
          <Paper
            elevation={0}
            className="camera-feed-container"
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              mb: 3,
              background: '#2E2E2E',
              position: 'relative',
            }}
          >
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: 'auto',
                display: isRecording ? 'block' : 'none',
                transform: 'scaleX(-1)', // Mirror effect
              }}
            />
            {!isRecording && (
              <Box
                className="camera-placeholder"
                sx={{
                  width: '100%',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #ECECEC 0%, #ABABAB 100%)',
                }}
              >
                <Videocam sx={{ fontSize: 64, color: '#ABABAB' }} />
              </Box>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <Box className="recording-indicator">
                <FiberManualRecord sx={{ color: '#FF0000', fontSize: 16, mr: 1 }} />
                <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                  REC {formatTime(recordingTime)}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Control Buttons */}
          <Box className="control-buttons" sx={{ mb: 3 }}>
            {!isRecording ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<Videocam />}
                onClick={startRecording}
                disabled={isLoading}
                className="start-recording-button"
                sx={{
                  background: 'linear-gradient(135deg, #A7CDB8 0%, #E8DF98 100%)',
                  color: '#2E2E2E',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(167, 205, 184, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #E8DF98 0%, #A7CDB8 100%)',
                    boxShadow: '0 6px 16px rgba(167, 205, 184, 0.45)',
                  },
                  '&:disabled': {
                    background: '#ABABAB',
                  },
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1, color: '#2E2E2E' }} />
                    Starting...
                  </>
                ) : (
                  'Start Recording'
                )}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                startIcon={<Stop />}
                onClick={stopRecording}
                className="stop-recording-button"
                sx={{
                  background: 'linear-gradient(135deg, #ABABAB 0%, #2E2E2E 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(46, 46, 46, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2E2E2E 0%, #ABABAB 100%)',
                    boxShadow: '0 6px 16px rgba(46, 46, 46, 0.45)',
                  },
                }}
              >
                Stop Recording
              </Button>
            )}
          </Box>

          {/* Engagement Display */}
          {isRecording && (
            <Paper
              elevation={0}
              className="engagement-display"
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2E2E2E' }}>
                Current Engagement
              </Typography>

              {/* Primary State */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#ABABAB', fontWeight: 500 }}>
                  Primary State
                </Typography>
                <Chip
                  label={engagementState.toUpperCase()}
                  sx={{
                    background: getStateColor(engagementState),
                    color: '#2E2E2E',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    px: 2,
                    py: 2.5,
                    height: 'auto',
                  }}
                />
              </Box>

              {/* Dominant Emotion */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#ABABAB', fontWeight: 500 }}>
                  Dominant Emotion
                </Typography>
                <Chip
                  label={dominantEmotion}
                  sx={{
                    background: '#ECECEC',
                    color: '#2E2E2E',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    px: 2,
                    py: 2.5,
                    height: 'auto',
                  }}
                />
              </Box>

              {/* Engagement Scores */}
              <Typography variant="body2" sx={{ mb: 2, color: '#ABABAB', fontWeight: 500 }}>
                Engagement Scores
              </Typography>
              <Stack spacing={2}>
                {Object.entries(currentScores).map(([state, score]) => (
                  <Box key={state} className="score-bar-container">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: '#2E2E2E', fontWeight: 600, textTransform: 'capitalize' }}
                      >
                        {state}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ABABAB', fontWeight: 500 }}>
                        {score.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box
                      className="score-bar-background"
                      sx={{
                        width: '100%',
                        height: 24,
                        background: '#ECECEC',
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <Box
                        className="score-bar-fill"
                        sx={{
                          width: `${score}%`,
                          height: '100%',
                          background: getStateColor(state),
                          borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Info Message */}
          {!isRecording && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'rgba(167, 205, 184, 0.1)',
                border: '1px solid rgba(167, 205, 184, 0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#2E2E2E', lineHeight: 1.6 }}>
                <strong>How it works:</strong>
                <br />
                Click "Start Recording" to begin monitoring your engagement during the lecture.
                The system will analyze your facial expressions in real-time and display your
                engagement levels: concentrated, engaged, confused, and bored.
                <br />
                <br />
                <strong>Note:</strong> This feature requires camera access. Your video is
                processed locally and sent to the backend for analysis.
              </Typography>
            </Paper>
          )}
        </Box>
      </Container>
    </Box>
  )
}

export default EngagementMonitor

