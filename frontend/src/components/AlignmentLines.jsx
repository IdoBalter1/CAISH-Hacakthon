import { useMemo } from 'react'
import './AlignmentLines.css'

const AlignmentLines = ({ data, graphAContainerRef, graphBContainerRef }) => {
  const timePoints = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Get unique time points (first occurrence of each time)
    const uniqueTimes = []
    const seen = new Set()
    
    data.forEach(item => {
      const date = new Date(item.timestamp)
      const timeLabel = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      if (!seen.has(timeLabel)) {
        seen.add(timeLabel)
        uniqueTimes.push({
          label: timeLabel,
          timestamp: item.timestamp
        })
      }
    })
    
    return uniqueTimes
  }, [data])

  if (timePoints.length === 0) return null

  // Calculate positions based on time distribution
  const totalDuration = timePoints.length > 1
    ? new Date(timePoints[timePoints.length - 1].timestamp) - new Date(timePoints[0].timestamp)
    : 1

  return (
    <div className="alignment-lines-container">
      {timePoints.map((point, index) => {
        if (index === 0 || index === timePoints.length - 1) return null // Skip first and last
        
        const pointTime = new Date(point.timestamp)
        const startTime = new Date(timePoints[0].timestamp)
        const timePosition = ((pointTime - startTime) / totalDuration) * 100
        
        return (
          <div
            key={index}
            className="alignment-line"
            style={{ left: `${timePosition}%` }}
          />
        )
      })}
    </div>
  )
}

export default AlignmentLines

