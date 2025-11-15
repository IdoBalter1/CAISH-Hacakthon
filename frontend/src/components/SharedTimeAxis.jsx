import { useMemo } from 'react'
import './SharedTimeAxis.css'

const SharedTimeAxis = ({ data }) => {
  const timePoints = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Always include the first point at 0%
    const firstDate = new Date(data[0].timestamp)
    const firstLabel = firstDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    const timeLabels = [{
      label: firstLabel,
      timestamp: data[0].timestamp,
      position: 0
    }]
    
    // Get a few key time points for display (excluding first and last)
    const totalPoints = data.length
    const step = Math.max(1, Math.floor(totalPoints / 8)) // Show ~8 time labels total
    
    // Add intermediate points
    for (let i = step; i < totalPoints - 1; i += step) {
      const date = new Date(data[i].timestamp)
      const timeLabel = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      timeLabels.push({
        label: timeLabel,
        timestamp: data[i].timestamp,
        position: (i / (totalPoints - 1)) * 100
      })
    }
    
    // Always include the last point at 100%
    const lastDate = new Date(data[data.length - 1].timestamp)
    const lastLabel = lastDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    timeLabels.push({
      label: lastLabel,
      timestamp: data[data.length - 1].timestamp,
      position: 100
    })
    
    return timeLabels
  }, [data])

  if (!data || data.length === 0) return null

  return (
    <div className="shared-time-axis">
      <div className="time-axis-labels">
        {timePoints.map((point, index) => (
          <div
            key={index}
            className="time-axis-tick"
            style={{ left: `${point.position}%` }}
          >
            <div className="tick-line"></div>
            <div className="tick-label">{point.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SharedTimeAxis

