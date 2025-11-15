import { useState, useEffect } from 'react'
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
      <div className="mcq-section">
        <div className="mcq-start-screen">
          <h3>📝 Multiple Choice Questions</h3>
          <p className="mcq-description">
            Test your understanding of the lecture material. Answer questions to help adjust sentiment analysis accuracy.
          </p>
          <div className="mcq-info">
            <p><strong>Total Questions:</strong> {questions.length}</p>
            <p><strong>Topics Covered:</strong> {[...new Set(questions.map(q => q.topic))].join(', ')}</p>
          </div>
          <button onClick={handleStart} className="start-mcq-button">
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  if (showSummary) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="mcq-section">
        <div className="mcq-summary">
          <h3>Quiz Complete! 🎉</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-value">{score}</div>
              <div className="stat-label">Correct</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{questions.length - score}</div>
              <div className="stat-label">Incorrect</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{percentage}%</div>
              <div className="stat-label">Score</div>
            </div>
          </div>
          <div className="summary-actions">
            <button onClick={handleFinish} className="finish-button">
              Submit & Finish
            </button>
          </div>
          <p className="summary-note">
            Your answers have been recorded and will be sent to the backend for analysis.
          </p>
        </div>
      </div>
    )
  }

  const userAnswer = userAnswers[currentQuestion.id]
  const isCorrect = userAnswer?.correct
  const showCorrectAnswer = hasAnswered && showResult

  return (
    <div className="mcq-section">
      <div className="mcq-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <span className="progress-text">
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
      </div>

      <div className="anki-card">
        <div className="card-front">
          <div className="card-header">
            <span className="question-topic">{currentQuestion.topic}</span>
          </div>
          <div className="card-content">
            <h4 className="question-text">{currentQuestion.question}</h4>
            <div className="options-container">
              {currentQuestion.options.map((option, index) => {
                let optionClass = 'option'
                if (hasAnswered) {
                  if (index === currentQuestion.correctAnswer) {
                    optionClass += ' correct-answer'
                  }
                  if (selectedOption === index && index !== currentQuestion.correctAnswer) {
                    optionClass += ' wrong-answer'
                  }
                } else if (selectedOption === index) {
                  optionClass += ' selected'
                }

                return (
                  <button
                    key={index}
                    className={optionClass}
                    onClick={() => handleOptionSelect(index)}
                    disabled={hasAnswered}
                  >
                    <span className="option-label">{String.fromCharCode(65 + index)}.</span>
                    <span className="option-text">{option}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {showResult && (
          <div className="card-back">
            <div className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="explanation">
              <strong>Explanation:</strong>
              <p>{currentQuestion.explanation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mcq-actions">
        {!hasAnswered ? (
          <button 
            onClick={handleSubmitAnswer} 
            className="submit-button"
            disabled={selectedOption === null}
          >
            Submit Answer
          </button>
        ) : (
          <button onClick={handleNext} className="next-button">
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Summary'}
          </button>
        )}
      </div>
    </div>
  )
}

export default MCQSection

