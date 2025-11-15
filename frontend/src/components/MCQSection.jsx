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
import { mcqData } from '../data/mcqData'
import './MCQSection.css'

const MCQSection = () => {
  const [isStarted, setIsStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [showResult, setShowResult] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  const questions = mcqData.questions
  const currentQuestion = questions[currentQuestionIndex]

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
    // Prepare data to send to backend
    const answerData = {
      lectureTitle: mcqData.lectureTitle,
      answers: userAnswers,
      score: score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      timestamp: new Date().toISOString()
    }
    
    // Save to localStorage for persistence
    try {
      const existingResults = JSON.parse(localStorage.getItem('mcqResults') || '[]')
      existingResults.push(answerData)
      localStorage.setItem('mcqResults', JSON.stringify(existingResults))
      console.log('MCQ results saved to localStorage')
    } catch (e) {
      console.error('Error saving MCQ results to localStorage:', e)
    }
    
    // Log for debugging
    console.log('MCQ Results Data:', answerData)
    console.log('Full answer data structure:', {
      lectureTitle: answerData.lectureTitle,
      totalQuestions: answerData.totalQuestions,
      score: answerData.score,
      percentage: answerData.percentage,
      timestamp: answerData.timestamp,
      answers: Object.keys(answerData.answers).map(qId => ({
        questionId: qId,
        selectedOption: answerData.answers[qId].selected,
        isCorrect: answerData.answers[qId].correct,
        timestamp: answerData.answers[qId].timestamp
      }))
    })
    
    // Send MCQ results to backend API
    fetch('/api/mcq/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answerData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to submit MCQ results')
        }
        return response.json()
      })
      .then(data => {
        console.log('MCQ results successfully sent to backend:', data)
        // Optionally show success message to user
      })
      .catch(error => {
        console.error('Error sending MCQ results to backend:', error)
        // Optionally show error message to user
        // You might want to keep the data in localStorage as backup
      })

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
          <Stack spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Total Questions:</strong> {questions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Topics Covered:</strong> {[...new Set(questions.map(q => q.topic))].join(', ')}
            </Typography>
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

