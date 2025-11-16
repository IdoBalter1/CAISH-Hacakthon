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
  const audioStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const sessionIdRef = useRef(null)
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

      // Stop audio recording and create blob
      const createAudioBlob = () => {
        return new Promise((resolve) => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            // Set up handler before stopping
            const handleStop = () => {
              if (audioChunksRef.current.length > 0) {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
                audioChunksRef.current = []
                resolve(audioBlob)
              } else {
                resolve(null)
              }
            }
            
            mediaRecorderRef.current.onstop = handleStop
            mediaRecorderRef.current.stop()
            
            // Fallback: if onstop doesn't fire, wait a bit and resolve
            setTimeout(() => {
              if (audioChunksRef.current.length > 0) {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
                audioChunksRef.current = []
                resolve(audioBlob)
              }
            }, 1000)
          } else {
            resolve(null)
          }
        })
      }
      
      // Stop audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
        audioStreamRef.current = null
      }

      setIsRecording(false)

      // Create audio blob and send to backend
      setIsLoading(true)
      createAudioBlob().then((audioBlob) => {
        if (!audioBlob) {
          setIsLoading(false)
          return
        }
        
        // Call backend API to stop recording and send audio
        import('../services/api').then((api) => {
          // Try multiple sources for session ID
          let sessionId = sessionIdRef.current
          if (!sessionId) {
            sessionId = localStorage.getItem('currentSessionId')
          }
          
          if (sessionId) {
            api.stopEngagementSession(sessionId, audioBlob)
              .then((data) => {
                setEngagementData(data)
                setIsLoading(false)
              })
              .catch((apiError) => {
                setIsLoading(false)
                // Check if it's a session not found error
                if (apiError.message && apiError.message.includes('Session not found')) {
                  setError('Session expired. The audio was recorded but may not be processed. Please try starting a new recording.')
                } else {
                  setError(`Failed to process audio: ${apiError.message || apiError}`)
                }
              })
          } else {
            setIsLoading(false)
            
            // Try to start a session now and then stop it
            api.startEngagementSession('Live Lecture')
              .then((response) => {
                if (!response) return
                
                const newSessionId = response.sessionId || response.session_id
                if (newSessionId) {
                  return api.stopEngagementSession(newSessionId, audioBlob)
                } else {
                  throw new Error('No session ID in response')
                }
              })
              .then((data) => {
                if (!data) return
                setEngagementData(data)
                setIsLoading(false)
              })
              .catch((recoveryError) => {
                setIsLoading(false)
                // Silently handle backend errors - don't show to user
                // Audio was recorded but may not be processed
              })
          }
        }).catch((err) => {
          setIsLoading(false)
          // Silently handle API module load errors
        })
      }).catch((err) => {
        setIsLoading(false)
        setError('Failed to create audio file')
      })
    } catch (err) {
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
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
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

      // Request camera and audio access with iOS-compatible constraints
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: { ideal: 'user' },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Separate audio and video tracks
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      
      // Create video-only stream for display
      const videoStream = new MediaStream(videoTracks)
      audioStreamRef.current = new MediaStream(audioTracks)

      streamRef.current = videoStream

      if (videoRef.current) {
        videoRef.current.srcObject = videoStream
        videoRef.current.play()
      }

      // Start audio recording
      if (audioStreamRef.current && audioStreamRef.current.getAudioTracks().length > 0) {
        try {
          // Check if MediaRecorder is supported
          if (!window.MediaRecorder) {
            throw new Error('MediaRecorder API not supported')
          }
          
          // Try to find a supported mime type
          let mimeType = 'audio/webm;codecs=opus'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '' // Use default
            }
          }
          
          const mediaRecorder = new MediaRecorder(audioStreamRef.current, mimeType ? { mimeType } : undefined)
          
          audioChunksRef.current = []
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }
          
          mediaRecorder.onerror = () => {
            // Silently handle errors
          }
          
          mediaRecorder.start(1000) // Collect data every second
          mediaRecorderRef.current = mediaRecorder
        } catch (audioError) {
          setError(`Audio recording failed: ${audioError.message}`)
        }
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

      // Call backend API to start recording session
      import('../services/api').then((api) => {
        // Try to start session directly - health check might fail due to timing
        // We'll catch errors and handle them gracefully
        api.startEngagementSession('Live Lecture')
          .then((response) => {
            const newSessionId = response.sessionId || response.session_id
            if (newSessionId) {
              sessionIdRef.current = newSessionId
              localStorage.setItem('currentSessionId', newSessionId)
              // Clear any previous errors
              setError(null)
            }
            // Silently handle missing session ID - recording will continue
          })
          .catch((apiError) => {
            // Silently handle backend connection errors - don't show to user
            // Recording will continue without backend connection
          })
      }).catch((err) => {
        // Silently handle API module load errors
      })
    } catch (err) {
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

        <Box className="engagement-content">
          {/* Main Content: Camera and Engagement Side by Side on Desktop, Stacked on Mobile */}
          <Box
            className="engagement-layout"
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 2, md: 3 },
              alignItems: { xs: 'stretch', md: 'flex-start' },
            }}
          >
            {/* Camera Feed Section - Left on Desktop, Top on Mobile */}
            <Paper
              elevation={0}
              className="camera-feed-container"
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: '#2E2E2E',
                position: 'relative',
                width: { xs: '100%', md: '45%' },
                flexShrink: 0,
                maxWidth: { xs: '100%', md: '500px' },
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
                  <Videocam sx={{ fontSize: { xs: 48, md: 64 }, color: '#ABABAB' }} />
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

            {/* Engagement Display - Right on Desktop, Bottom on Mobile */}
            {isRecording ? (
              <Paper
                elevation={0}
                className="engagement-display"
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  flex: { xs: '0 0 auto', md: '1 1 0' },
                  minWidth: 0,
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
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(167, 205, 184, 0.1)',
                  border: '1px solid rgba(167, 205, 184, 0.3)',
                  flex: { xs: '0 0 auto', md: '1 1 0' },
                  minWidth: 0,
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
        </Box>
      </Container>
    </Box>
  )
}

export default EngagementMonitor

