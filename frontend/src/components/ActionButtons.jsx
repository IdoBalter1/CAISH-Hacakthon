import { useState } from 'react'
import { studyPlanData } from '../data/studyPlanData'
import { lectureSummaryData } from '../data/lectureSummaryData'
import { userReportData } from '../data/userReportData'
import './ActionButtons.css'

const ActionButtons = () => {
  const [activeView, setActiveView] = useState(null)

  const handleButtonClick = (view) => {
    setActiveView(activeView === view ? null : view)
  }

  return (
    <div className="action-buttons-container">
      <div className="action-buttons">
        <button
          className={`action-button ${activeView === 'report' ? 'active' : ''}`}
          onClick={() => handleButtonClick('report')}
          aria-label="View user report"
        >
          <span className="button-icon">📊</span>
          <span className="button-text">User Report</span>
        </button>
        
        <button
          className={`action-button ${activeView === 'summary' ? 'active' : ''}`}
          onClick={() => handleButtonClick('summary')}
          aria-label="View lecture summary"
        >
          <span className="button-icon">📝</span>
          <span className="button-text">Lecture Summary</span>
        </button>
        
        <button
          className={`action-button ${activeView === 'plan' ? 'active' : ''}`}
          onClick={() => handleButtonClick('plan')}
          aria-label="View study plan"
        >
          <span className="button-icon">📚</span>
          <span className="button-text">Study Plan</span>
        </button>
      </div>

      {activeView && (
        <div className="content-panel">
          {activeView === 'report' && (
            <div className="content-section user-report">
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
            </div>
          )}
          
          {activeView === 'summary' && (
            <div className="content-section lecture-summary">
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
            </div>
          )}
          
          {activeView === 'plan' && (
            <div className="content-section study-plan">
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActionButtons

