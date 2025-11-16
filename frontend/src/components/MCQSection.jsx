import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  Stack,
  Paper
} from '@mui/material'
import { CheckCircle, Cancel, PlayArrow, Send, NavigateNext } from '@mui/icons-material'
import { mcqData as defaultMcqData } from '../data/mcqData'
import './MCQSection.css'

const MCQSection = ({ propMcqData, onResultsChange }) => {
  const [isStarted, setIsStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [showResult, setShowResult] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  // Use prop data if available, otherwise show message
  // Only use default data if explicitly no data is provided (for testing)
  const mcqData = propMcqData || defaultMcqData
  const questions = mcqData?.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  
  // Check if we're using real data or dummy data
  const isUsingRealData = propMcqData !== null && propMcqData !== undefined

  // Initialize user answers object
  useEffect(() => {
    if (isStarted) {
      const initialAnswers = {}
      questions.forEach(q => {
        initialAnswers[q.id] = null
      })
      setUserAnswers(initialAnswers)
    }
  }, [isStarted, questions])

  const handleStart = () => {
    setIsStarted(true)
    setCurrentQuestionIndex(0)
    setShowResult(false)
    setSelectedOption(null)
    setHasAnswered(false)
    setScore(0)
    setShowSummary(false)
  }

  const handleOptionSelect = (optionIndex) => {
    if (hasAnswered) return // Prevent changing answer after submission
    
    setSelectedOption(optionIndex)
  }

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return

    const isCorrect = selectedOption === currentQuestion.correctAnswer
    const updatedAnswers = {
      ...userAnswers,
      [currentQuestion.id]: {
        selected: selectedOption,
        correct: isCorrect,
        timestamp: new Date().toISOString()
      }
    }
    setUserAnswers(updatedAnswers)
    setHasAnswered(true)
    setShowResult(true)

    if (isCorrect) {
      setScore(prev => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
      setHasAnswered(false)
      setShowResult(false)
    } else {
      // All questions answered, show summary
      setShowSummary(true)
    }
  }

  const handleFinish = () => {
    // Prepare results in the format expected by the backend
    const results = questions.map((q, index) => ({
      questionId: q.id,
      question: q.question,
      selectedAnswer: userAnswers[q.id]?.selected ?? null,
      correctAnswer: q.correctAnswer,
      isCorrect: userAnswers[q.id]?.correct ?? false,
      topic: q.topic
    }))
    
    // Prepare data to send to backend
    const answerData = {
      lectureTitle: mcqData.lectureTitle,
      answers: userAnswers,
      score: score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      timestamp: new Date().toISOString()
    }
    
    // Notify parent component of results (for report/plan generation)
    if (onResultsChange) {
      onResultsChange(results)
    }
    
    // Save to localStorage for persistence
    try {
      const existingResults = JSON.parse(localStorage.getItem('mcqResults') || '[]')
      existingResults.push(answerData)
      localStorage.setItem('mcqResults', JSON.stringify(existingResults))
    } catch (e) {
      // Silently handle localStorage errors
    }

    // Reset for new session
    setIsStarted(false)
    setCurrentQuestionIndex(0)
    setUserAnswers({})
    setShowResult(false)
    setSelectedOption(null)
    setHasAnswered(false)
    setScore(0)
    setShowSummary(false)
  }

  if (!isStarted) {
    return (
      <Box className="mcq-section" sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h4" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            📝 Multiple Choice Questions
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            Test your understanding of the lecture material. Answer questions to help adjust sentiment analysis accuracy.
          </Typography>
          {!isUsingRealData && propMcqData === null && (
            <Alert severity="info" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              Questions are being generated from your lecture recording. Please wait...
            </Alert>
          )}
          {questions.length > 0 ? (
            <>
              <Stack spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Questions:</strong> {questions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Topics Covered:</strong> {[...new Set(questions.map(q => q.topic))].join(', ')}
                </Typography>
                {isUsingRealData && (
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    ✓ Using questions generated from your lecture
                  </Typography>
                )}
              </Stack>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayArrow />}
                onClick={handleStart}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Start Quiz
              </Button>
            </>
          ) : (
            <Alert severity="warning" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              No questions available. Please complete a lecture recording first to generate questions.
            </Alert>
          )}
        </Paper>
      </Box>
    )
  }

  if (showSummary) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <Box className="mcq-section" sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h4" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Quiz Complete! 🎉
          </Typography>
          <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 4 }}>
            <Box>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 700 }}>
                {score}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Correct
              </Typography>
            </Box>
            <Box>
              <Typography variant="h3" color="error.main" sx={{ fontWeight: 700 }}>
                {questions.length - score}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Incorrect
              </Typography>
            </Box>
            <Box>
              <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>
                {percentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            size="large"
            startIcon={<Send />}
            onClick={handleFinish}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              borderRadius: 2,
              textTransform: 'none',
              mb: 2,
            }}
          >
            Submit & Finish
          </Button>
          <Alert severity="info" sx={{ mt: 2 }}>
            Your answers have been recorded and will be sent to the backend for analysis.
          </Alert>
        </Paper>
      </Box>
    )
  }

  const userAnswer = userAnswers[currentQuestion.id]
  const isCorrect = userAnswer?.correct
  const showCorrectAnswer = hasAnswered && showResult

  return (
    <Box className="mcq-section" sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={((currentQuestionIndex + 1) / questions.length) * 100}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      <Card elevation={3} sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={currentQuestion.topic}
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="h5" component="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            {currentQuestion.question}
          </Typography>
          <Stack spacing={2}>
            {currentQuestion.options.map((option, index) => {
              const isCorrect = index === currentQuestion.correctAnswer
              const isSelected = selectedOption === index
              const isWrong = hasAnswered && isSelected && !isCorrect
              const showCorrect = hasAnswered && isCorrect

              let color = 'default'
              let variant = 'outlined'
              if (hasAnswered) {
                if (showCorrect) {
                  color = 'success'
                  variant = 'contained'
                } else if (isWrong) {
                  color = 'error'
                  variant = 'contained'
                }
              } else if (isSelected) {
                color = 'primary'
                variant = 'contained'
              }

              return (
                <Button
                  key={index}
                  variant={variant}
                  color={color}
                  onClick={() => handleOptionSelect(index)}
                  disabled={hasAnswered}
                  fullWidth
                  sx={{
                    py: 2,
                    px: 3,
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontSize: '1rem',
                    borderRadius: 2,
                  }}
                  startIcon={
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                      {String.fromCharCode(65 + index)}.
                    </Typography>
                  }
                >
                  {option}
                </Button>
              )
            })}
          </Stack>
        </CardContent>
      </Card>

      {showResult && (
        <Alert
          severity={isCorrect ? 'success' : 'error'}
          icon={isCorrect ? <CheckCircle /> : <Cancel />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Typography>
          <Typography variant="body2">
            <strong>Explanation:</strong> {currentQuestion.explanation}
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        {!hasAnswered ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<Send />}
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Submit Answer
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            endIcon={<NavigateNext />}
            onClick={handleNext}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Summary'}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default MCQSection

