import { useState, useMemo } from 'react'
import './SentimentGraphB.css'

const SentimentGraphB = ({ data }) => {
  const [selectedSection, setSelectedSection] = useState(null)

  // Group data by lecture content to create sections
  const sections = useMemo(() => {
    if (!data || data.length === 0) return []

    const grouped = []
    let currentSection = null

    data.forEach((item, index) => {
      const date = new Date(item.timestamp)
      const timeLabel = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      if (!currentSection || currentSection.content !== item.lectureContent) {
        // Start a new section
        if (currentSection) {
          // End previous section at the start of this new section (no gap)
          currentSection.endTime = item.timestamp
          currentSection.endTimeLabel = timeLabel
        }

        currentSection = {
          content: item.lectureContent,
          startTime: item.timestamp,
          startTimeLabel: timeLabel,
          endTime: null,
          endTimeLabel: null,
          index: grouped.length,
          dataPoints: [item]
        }
        grouped.push(currentSection)
      } else {
        currentSection.dataPoints.push(item)
      }
    })

    // Set end time for last section to the last data point
    if (currentSection && data.length > 0) {
      currentSection.endTime = data[data.length - 1].timestamp
      currentSection.endTimeLabel = new Date(data[data.length - 1].timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }

    // Generate AI summaries for each section
    // Note: In production, these summaries will come from the backend
    return grouped.map(section => ({
      ...section,
      summary: generateLectureSummary(section.content, section.dataPoints)
    }))
  }, [data])

  // Generate AI summary of lecture content (placeholder - will be replaced by backend)
  // TODO: Replace this with backend API call when available
  // Expected backend response format: { summary: "AI-generated summary text" }
  function generateLectureSummary(content, dataPoints) {
    // Placeholder summaries based on lecture content
    // In production, this will be replaced with actual AI-generated summaries from backend
    // Example API call: fetch(`/api/summaries/${sectionId}`).then(res => res.json())
    const summaryMap = {
      "Introduction to Machine Learning": "This section introduced the fundamental concepts of machine learning, including its definition, applications, and basic terminology. Students learned about the difference between supervised and unsupervised learning, and were introduced to key ML concepts that form the foundation for more advanced topics.",
      
      "Supervised Learning Basics": "The lecture covered the core principles of supervised learning, where models learn from labeled training data. Key topics included classification vs regression problems, training and testing datasets, and the general workflow of building supervised learning models.",
      
      "Linear Regression Theory": "This section delved into the mathematical foundations of linear regression, explaining how the algorithm finds the best-fit line through data points. Concepts covered included the cost function, gradient descent optimization, and how to interpret regression coefficients.",
      
      "Linear Regression Examples": "Practical examples of linear regression were demonstrated, showing how to apply the theory to real-world problems. Students saw step-by-step implementations and learned how to evaluate model performance using metrics like R-squared and mean squared error.",
      
      "Break - Interactive Demo": "An interactive demonstration session allowed students to engage with the material hands-on. This break provided an opportunity to reinforce concepts through practical application and address any questions that arose during the theoretical portions.",
      
      "Neural Networks Introduction": "The lecture introduced neural networks as a powerful machine learning approach inspired by biological neurons. Students learned about the basic structure of neural networks, including neurons, layers, and how information flows through the network.",
      
      "Neural Networks Architecture": "This section explored different neural network architectures, including feedforward networks, and discussed how the number of layers and neurons affects model complexity and performance. The trade-offs between model capacity and overfitting were also discussed.",
      
      "Backpropagation Algorithm": "The backpropagation algorithm was explained in detail, showing how neural networks learn by propagating errors backward through the network. Students learned about gradient computation, weight updates, and the mathematical principles that enable neural network training.",
      
      "Q&A Session": "A question and answer session provided students with the opportunity to clarify concepts, address specific concerns, and deepen their understanding of the material covered throughout the lecture."
    }

    // Return predefined summary if available, otherwise generate a generic one
    if (summaryMap[content]) {
      return summaryMap[content]
    }

    // Fallback generic summary
    return `This section covered ${content}. The lecture explored key concepts and provided foundational knowledge on this topic. Students engaged with the material through explanations, examples, and interactive elements designed to enhance understanding.`
  }

  // Calculate section width percentage
  // Use the same time range as Graph A for alignment
  const totalDuration = data && data.length > 0
    ? new Date(data[data.length - 1].timestamp) - new Date(data[0].timestamp)
    : sections.length > 0 
      ? new Date(sections[sections.length - 1].endTime) - new Date(sections[0].startTime)
      : 1

  const handleSectionClick = (section) => {
    setSelectedSection(section)
  }

  const closeModal = () => {
    setSelectedSection(null)
  }

  if (!data || data.length === 0) {
    return <div className="graph-b-container">No data available</div>
  }

  return (
    <div className="graph-b-container">
      <div className="graph-b-card">
        <div className="time-axis-container">
          <div className="sections-container">
            {sections.map((section, index) => {
              const sectionStart = new Date(section.startTime)
              const sectionEnd = new Date(section.endTime)
              const sectionDuration = sectionEnd - sectionStart
              
              // Calculate position and width to align with Graph A's time axis
              const dataStart = data && data.length > 0 ? new Date(data[0].timestamp) : sectionStart
              const dataEnd = data && data.length > 0 ? new Date(data[data.length - 1].timestamp) : sectionEnd
              const actualTotalDuration = dataEnd - dataStart
              
              const startOffset = ((sectionStart - dataStart) / actualTotalDuration) * 100
              const widthPercent = (sectionDuration / actualTotalDuration) * 100
              
              // Ensure last section extends to the end
              const isLastSection = index === sections.length - 1
              const calculatedRight = startOffset + widthPercent
              const finalWidth = isLastSection && calculatedRight < 100 
                ? `${100 - startOffset}%` 
                : `${widthPercent}%`
              
              return (
                <div
                  key={index}
                  className={`time-section ${selectedSection?.index === index ? 'selected' : ''}`}
                  style={{ 
                    position: 'absolute',
                    left: `${startOffset}%`,
                    width: finalWidth,
                    top: 0,
                    bottom: 0
                  }}
                  onClick={() => handleSectionClick(section)}
                  title={`${section.content} (${section.startTimeLabel} - ${section.endTimeLabel})`}
                >
                  <div className="section-label">
                    {section.content.length > 15 
                      ? section.content.substring(0, 15) + '...' 
                      : section.content}
                  </div>
                  <div className="section-time">
                    {section.startTimeLabel}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {selectedSection && (
        <div className="summary-modal-overlay" onClick={closeModal}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <h3 className="modal-title">{selectedSection.content}</h3>
            <div className="modal-time">
              {selectedSection.startTimeLabel} - {selectedSection.endTimeLabel}
            </div>
            <div className="modal-summary">
              <h4>Lecture Summary:</h4>
              <p>{selectedSection.summary}</p>
              <p className="summary-note">
                <em>Note: This summary will be generated by AI from the backend in production.</em>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SentimentGraphB

