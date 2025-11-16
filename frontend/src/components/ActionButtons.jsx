import { useState, useEffect } from 'react'


import {
  Button as NextUIButton,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from '@nextui-org/react'
import {
  Button,
  Box,
  Container,
  Typography,
  IconButton,
  useTheme,
  CircularProgress,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { studyPlanData } from '../data/studyPlanData'
import { lectureSummaryData } from '../data/lectureSummaryData'
import { userReportData } from '../data/userReportData'
import QuestionAssistant from './QuestionAssistant'
import MCQSection from './MCQSection'
import SentimentGraphA from './SentimentGraphA'
import SentimentGraphB from './SentimentGraphB'
import SharedTimeAxis from './SharedTimeAxis'
import EngagementMonitor from './EngagementMonitor'
import './ActionButtons.css'

// Apple-inspired MUI Theme with custom colors
const appleTheme = createTheme({
  palette: {
    primary: {
      main: '#A7CDB8', // Light green/mint
      light: '#C4E4D3',
      dark: '#8AB8A0',
    },
    secondary: {
      main: '#E8DF98', // Light yellow/cream
      light: '#F2EBB8',
      dark: '#D4C878',
    },
    background: {
      default: '#ECECEC', // Light gray
      paper: 'rgba(255, 255, 255, 0.95)',
    },
    text: {
      primary: '#2E2E2E', // Dark gray
      secondary: '#ABABAB', // Medium gray
    },
    grey: {
      300: '#ECECEC',
      500: '#ABABAB',
      900: '#2E2E2E',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12, // Apple's preferred border radius
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(20px)',
        },
      },
    },
  },
})

const ActionButtons = ({ data }) => {
  const [activeView, setActiveView] = useState(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  // States for real data from API
  const [lectureSummary, setLectureSummary] = useState(null)
  const [mcqData, setMcqData] = useState(null)
  const [userReport, setUserReport] = useState(null)
  const [studyPlan, setStudyPlan] = useState(null)
  const [mcqResults, setMcqResults] = useState(null)
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    summary: false,
    mcq: false,
    report: false,
    plan: false
  })

  useEffect(() => {
    console.log('Modal isOpen changed to:', isOpen)
    console.log('Active view:', activeView)
  }, [isOpen, activeView])

  const handleButtonClick = async (view) => {
    console.log('Button clicked:', view)
    setActiveView(view)
    console.log('Opening modal, isOpen will be:', true)
    onOpen()
    console.log('Modal state after onOpen')
    
    // Fetch real data when buttons are clicked
    const sessionId = localStorage.getItem('currentSessionId')
    
    if (view === 'summary' && !lectureSummary && sessionId) {
      setLoadingStates(prev => ({ ...prev, summary: true }))
      try {
        const apiModule = await import('../services/api')
        const api = apiModule.default || apiModule
        const summary = await api.generateLectureSummary(sessionId)
        setLectureSummary(summary)
      } catch (error) {
        console.error('Error fetching lecture summary:', error)
      } finally {
        setLoadingStates(prev => ({ ...prev, summary: false }))
      }
    } else if (view === 'mcq' && !mcqData && sessionId) {
      setLoadingStates(prev => ({ ...prev, mcq: true }))
      try {
        const apiModule = await import('../services/api')
        const api = apiModule.default || apiModule
        const mcq = await api.generateMCQs(sessionId)
        setMcqData(mcq)
      } catch (error) {
        console.error('Error fetching MCQs:', error)
      } finally {
        setLoadingStates(prev => ({ ...prev, mcq: false }))
      }
    } else if (view === 'report' && !userReport && sessionId) {
      setLoadingStates(prev => ({ ...prev, report: true }))
      try {
        const apiModule = await import('../services/api')
        const api = apiModule.default || apiModule
        const report = await api.generateUserReport(sessionId, mcqResults)
        setUserReport(report)
      } catch (error) {
        console.error('Error fetching user report:', error)
      } finally {
        setLoadingStates(prev => ({ ...prev, report: false }))
      }
    } else if (view === 'plan' && !studyPlan && sessionId) {
      setLoadingStates(prev => ({ ...prev, plan: true }))
      try {
        const apiModule = await import('../services/api')
        const api = apiModule.default || apiModule
        const plan = await api.generateStudyPlan(sessionId, mcqResults)
        setStudyPlan(plan)
      } catch (error) {
        console.error('Error fetching study plan:', error)
      } finally {
        setLoadingStates(prev => ({ ...prev, plan: false }))
      }
    }
  }
  
  const handleMCQResults = (results) => {
    setMcqResults(results)
    // Clear cached report and plan to trigger regeneration with new results
    setUserReport(null)
    setStudyPlan(null)
  }

  const handleClose = () => {
    setActiveView(null)
    onClose()
  }

  const buttonConfigs = [
    { key: 'engagement', icon: '📹', label: 'Engagement Monitor', ariaLabel: 'Start engagement monitoring' },
    { key: 'feel', icon: '😊', label: 'How Do You Feel?', ariaLabel: 'View sentiment graphs' },
    { key: 'mcq', icon: '❓', label: 'MCQ Quiz', ariaLabel: 'Take multiple choice quiz' },
    { key: 'report', icon: '📊', label: 'User Report', ariaLabel: 'View user report' },
    { key: 'summary', icon: '📝', label: 'Lecture Summary', ariaLabel: 'View lecture summary' },
    { key: 'question', icon: '💬', label: 'Ask Questions', ariaLabel: 'Open question assistant' },
    { key: 'plan', icon: '📚', label: 'Study Plan', ariaLabel: 'View study plan' },
  ]

  return (
    <ThemeProvider theme={appleTheme}>
      <CssBaseline />
      <Box className="action-buttons-container">
        <Container maxWidth={false} sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 }, width: '100%', maxWidth: '100%', position: 'relative', zIndex: 1 }}>
          <Box className="home-header">
            <Typography 
              className="home-title"
              sx={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              }}
            >
              Listant
            </Typography>
            <Typography 
              className="home-subtitle"
              sx={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
              }}
            >
              {`Your intelligent lecture assistant.
Listant is always there for you:)`}
            </Typography>
          </Box>
          <Box className="action-buttons-wrapper">
            <Box className="action-buttons" sx={{ gap: 2 }}>
              {buttonConfigs.map((config) => (
                <NextUIButton
                  key={config.key}
                  className={`action-button-apple ${activeView === config.key ? 'active' : ''}`}
                  onPress={() => handleButtonClick(config.key)}
                  aria-label={config.ariaLabel}
                  size="lg"
                  radius="xl"
                  style={{
                    background: activeView === config.key
                      ? 'linear-gradient(135deg, #A7CDB8 0%, #E8DF98 100%)'
                      : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    border: activeView === config.key
                      ? '1px solid rgba(167, 205, 184, 0.4)'
                      : '1px solid rgba(171, 171, 171, 0.25)',
                    boxShadow: activeView === config.key
                      ? '0 12px 40px rgba(167, 205, 184, 0.35), 0 4px 12px rgba(167, 205, 184, 0.2)'
                      : '0 8px 24px rgba(46, 46, 46, 0.1), 0 2px 8px rgba(46, 46, 46, 0.05)',
                    color: activeView === config.key ? '#2E2E2E' : '#2E2E2E',
                    fontWeight: 600,
                    fontSize: 'clamp(0.95rem, 4vw, 1.05rem)',
                    padding: 'clamp(18px, 4vw, 22px) clamp(24px, 5vw, 36px)',
                    minHeight: '60px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    width: '100%',
                    maxWidth: '100%',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span style={{ fontSize: '1.3em', marginRight: '12px' }}>{config.icon}</span>
                  {config.label}
                </NextUIButton>
              ))}
            </Box>
          </Box>
        </Container>

        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          size="full"
          placement="center"
          scrollBehavior="inside"
          hideCloseButton={true}
          isDismissable={true}
          classNames={{
            base: "apple-modal-base",
            backdrop: "apple-modal-backdrop",
            header: "apple-modal-header",
            body: "apple-modal-body",
          }}
          motionProps={{
            variants: {
              enter: {
                y: 0,
                opacity: 1,
                transition: {
                  duration: 0.35,
                  ease: [0.4, 0, 0.2, 1], // Apple's easing curve
                },
              },
              exit: {
                y: -20,
                opacity: 0,
                transition: {
                  duration: 0.25,
                  ease: [0.4, 0, 1, 1],
                },
              },
            }
          }}
        >
          <ModalContent>
            <ModalHeader className="apple-modal-header-content">
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                width: '100%',
                marginTop: 0,
                paddingTop: 0,
                paddingBottom: 0,
              }}>
                <IconButton
                  onClick={handleClose}
                  aria-label="go back"
                  className="modal-back-button"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: '12px',
                    background: 'rgba(171, 171, 171, 0.1)',
                    color: '#2E2E2E',
                    marginTop: 0,
                    marginBottom: 0,
                    '&:hover': {
                      background: 'rgba(167, 205, 184, 0.2)',
                      transform: 'scale(0.95)',
                    },
                    '&:active': {
                      transform: 'scale(0.9)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <ArrowBack />
                </IconButton>
                <Typography
                  variant="h6"
                  sx={{
                    flexGrow: 1,
                    fontWeight: 600,
                    color: '#2E2E2E',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  }}
                >
                  {buttonConfigs.find(c => c.key === activeView)?.label || ''}
                </Typography>
              </Box>
            </ModalHeader>
            <ModalBody className="apple-modal-content">
            {activeView === 'feel' && data && (
              <Container maxWidth="lg" sx={{ py: 2 }}>
                <Box className="content-section">
                  <Box className="graphs-container">
                    <SentimentGraphA data={data.sentimentTimeline} />
                    <SharedTimeAxis data={data.sentimentTimeline} />
                    <SentimentGraphB data={data.sentimentTimeline} />
                  </Box>
                </Box>
              </Container>
            )}
            
            {activeView === 'mcq' && (
              <Container maxWidth="md" sx={{ py: 2 }}>
                <Box className="content-section">
                  {loadingStates.mcq ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        Generating questions from your lecture...
                      </Typography>
                    </Box>
                  ) : (
                    <MCQSection propMcqData={mcqData} onResultsChange={handleMCQResults} />
                  )}
                </Box>
              </Container>
            )}
            
            {activeView === 'report' && (
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <Box className="content-section user-report">
              <div className="report-header">
                <h3>{userReportData.title}</h3>
                <div className="report-meta">
                  <span className="lecture-title">{userReportData.lectureTitle}</span>
                  <span className="report-date">{new Date(userReportData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="overall-stats">
                <h4>📊 Overall Performance</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Average Engagement</div>
                    <div className="stat-value">{userReportData.overallStats.averageEngagement}%</div>
                    <div className="stat-bar">
                      <div 
                        className="stat-bar-fill engagement" 
                        style={{ width: `${userReportData.overallStats.averageEngagement}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Average Focus</div>
                    <div className="stat-value">{userReportData.overallStats.averageFocus}%</div>
                    <div className="stat-bar">
                      <div 
                        className="stat-bar-fill focus" 
                        style={{ width: `${userReportData.overallStats.averageFocus}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Average Confusion</div>
                    <div className="stat-value">{userReportData.overallStats.averageConfusion}%</div>
                    <div className="stat-bar">
                      <div 
                        className="stat-bar-fill confusion" 
                        style={{ width: `${userReportData.overallStats.averageConfusion}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sections-analysis">
                <h4>📈 Section-by-Section Analysis</h4>
                {userReportData.sections.map((section, index) => (
                  <div key={index} className="section-report-card">
                    <div className="section-report-header">
                      <div className="section-title-time">
                        <h5>{section.title}</h5>
                        <span className="section-time-range">{section.startTime} - {section.endTime} ({section.duration})</span>
                      </div>
                    </div>

                    <div className="section-metrics">
                      <div className="metric-row">
                        <div className="metric-item">
                          <span className="metric-label">Focus</span>
                          <div className="metric-bar-container">
                            <div 
                              className="metric-bar focus-bar" 
                              style={{ width: `${section.metrics.focus}%` }}
                            >
                              <span className="metric-value">{section.metrics.focus}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Confusion</span>
                          <div className="metric-bar-container">
                            <div 
                              className="metric-bar confusion-bar" 
                              style={{ width: `${section.metrics.confusion}%` }}
                            >
                              <span className="metric-value">{section.metrics.confusion}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Engagement</span>
                          <div className="metric-bar-container">
                            <div 
                              className="metric-bar engagement-bar" 
                              style={{ width: `${section.metrics.engagement}%` }}
                            >
                              <span className="metric-value">{section.metrics.engagement}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="section-analysis">
                      <div className="analysis-badges">
                        <span className={`focus-badge ${section.analysis.focusLevel.toLowerCase().replace('-', '-')}`}>
                          Focus: {section.analysis.focusLevel}
                        </span>
                        <span className={`confusion-badge ${section.analysis.confusionLevel.toLowerCase().replace('-', '-')}`}>
                          Confusion: {section.analysis.confusionLevel}
                        </span>
                      </div>
                      <div className="recommendation-box">
                        <strong>💡 Recommendation:</strong>
                        <p>{section.analysis.recommendation}</p>
                      </div>
                      <div className="highlights">
                        <strong>Key Highlights:</strong>
                        <ul>
                          {section.highlights.map((highlight, i) => (
                            <li key={i}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="insights-section">
                <h4>💭 Insights & Recommendations</h4>
                {userReportData.insights.map((insight, index) => (
                  <div key={index} className={`insight-card insight-${insight.type}`}>
                    <div className="insight-header">
                      <strong>{insight.title}</strong>
                    </div>
                    <p>{insight.description}</p>
                  </div>
                ))}
              </div>
              </Box>
            </Container>
          )}
          
          {activeView === 'summary' && (
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <Box className="content-section lecture-summary">
              <div className="summary-header">
                <h3>{lectureSummaryData.title}</h3>
                <div className="lecture-meta">
                  <span className="lecture-title">{lectureSummaryData.lectureTitle}</span>
                  <div className="meta-details">
                    <span className="lecture-date">{new Date(lectureSummaryData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="lecture-duration">⏱️ {lectureSummaryData.duration}</span>
                    <span className="lecture-instructor">👤 {lectureSummaryData.instructor}</span>
                  </div>
                </div>
              </div>

              <div className="summary-content">
                {lectureSummaryData.sections.map((section, index) => (
                  <div key={index} className="summary-section">
                    <div className="section-header">
                      <h4>{section.title}</h4>
                      <span className="section-duration">{section.duration}</span>
                    </div>

                    <div className="section-content">
                      <div className="key-points">
                        <h5>Key Points:</h5>
                        <ul>
                          {section.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>

                      {section.concepts && section.concepts.length > 0 && (
                        <div className="concepts">
                          <h5>Key Concepts:</h5>
                          {section.concepts.map((concept, i) => (
                            <div key={i} className="concept-item">
                              <strong>{concept.term}:</strong>
                              <span>{concept.definition}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {section.examples && section.examples.length > 0 && (
                        <div className="examples">
                          <h5>Examples:</h5>
                          <ul>
                            {section.examples.map((example, i) => (
                              <li key={i}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {section.questions && section.questions.length > 0 && (
                        <div className="qa-section">
                          <h5>Questions & Answers:</h5>
                          {section.questions.map((qa, i) => (
                            <div key={i} className="qa-item">
                              <div className="question">
                                <strong>Q:</strong> {qa.question}
                              </div>
                              <div className="answer">
                                <strong>A:</strong> {qa.answer}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="takeaways-section">
                  <h4>💡 Overall Takeaways</h4>
                  <ul className="takeaways-list">
                    {lectureSummaryData.overallTakeaways.map((takeaway, index) => (
                      <li key={index}>{takeaway}</li>
                    ))}
                  </ul>
                </div>

                <div className="next-steps-section">
                  <h4>📋 Next Steps</h4>
                  <ul className="next-steps-list">
                    {lectureSummaryData.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
              </Box>
            </Container>
          )}
          
          {activeView === 'plan' && (
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <Box className="content-section study-plan">
              <div className="study-plan-header">
                <h3>{studyPlanData.title}</h3>
                <div className="lecture-info">
                  <span className="lecture-title">{studyPlanData.lectureTitle}</span>
                  <span className="lecture-date">{new Date(studyPlanData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="study-plan-content">
                <div className="recommendations-section">
                  <h4>📚 Recommended Topics to Revise</h4>
                  {studyPlanData.recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-card">
                      <div className="recommendation-header">
                        <h5>{rec.topic}</h5>
                        <div className="recommendation-meta">
                          <span className={`priority-badge priority-${rec.priority.toLowerCase()}`}>
                            {rec.priority} Priority
                          </span>
                          <span className="time-estimate">⏱️ {rec.timeEstimate}</span>
                        </div>
                      </div>
                      
                      <div className="recommendation-content">
                        <div className="activities">
                          <strong>Activities:</strong>
                          <ul>
                            {rec.activities.map((activity, i) => (
                              <li key={i}>{activity}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="resources">
                          <strong>Resources:</strong>
                          <ul>
                            {rec.resources.map((resource, i) => (
                              <li key={i}>{resource}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="goals-section">
                  <h4>🎯 Weekly Goals</h4>
                  <ul className="goals-list">
                    {studyPlanData.weeklyGoals.map((goal, index) => (
                      <li key={index}>{goal}</li>
                    ))}
                  </ul>
                </div>

                <div className="schedule-section">
                  <h4>📅 Study Schedule</h4>
                  {studyPlanData.studySchedule.map((schedule, index) => (
                    <div key={index} className="schedule-item">
                      <strong>{schedule.day}:</strong>
                      <ul>
                        {schedule.tasks.map((task, i) => (
                          <li key={i}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
              </Box>
            </Container>
          )}
          
            {activeView === 'question' && (
              <Container maxWidth="md" sx={{ py: 2 }}>
                <Box className="content-section">
                  <QuestionAssistant />
                </Box>
              </Container>
            )}
            
            {activeView === 'engagement' && (
              <EngagementMonitor />
            )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </ThemeProvider>
  )
}

export default ActionButtons

