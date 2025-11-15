import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './SentimentGraphA.css'

const SentimentGraphA = ({ data }) => {
  const [chartHeight, setChartHeight] = useState(500)

  useEffect(() => {
    const updateHeight = () => {
      setChartHeight(window.innerWidth < 768 ? 400 : 500)
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])
  // Transform data for Recharts - use actual timestamps for positioning
  const firstTimestamp = data.length > 0 ? new Date(data[0].timestamp).getTime() : 0
  const lastTimestamp = data.length > 0 ? new Date(data[data.length - 1].timestamp).getTime() : 0
  const totalDuration = lastTimestamp - firstTimestamp

  const chartData = data.map((item, index) => {
    const date = new Date(item.timestamp)
    const timestamp = date.getTime()
    // Format time as HH:MM for display
    const timeLabel = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    // Calculate position based on actual timestamp to align with shared time axis
    const position = totalDuration > 0 ? ((timestamp - firstTimestamp) / totalDuration) * (data.length - 1) : index
    
    return {
      time: timeLabel,
      index: position, // Use calculated position based on timestamp
      timestamp: item.timestamp,
      bored: (item.bored * 100).toFixed(1),
      confused: (item.confused * 100).toFixed(1),
      engaged: (item.engaged * 100).toFixed(1),
      frustrated: (item.frustrated * 100).toFixed(1),
      excited: (item.excited * 100).toFixed(1),
      lectureContent: item.lectureContent
    }
  })

  // Color scheme for each sentiment
  const sentimentColors = {
    bored: '#9e9e9e',      // Gray
    confused: '#ff9800',   // Orange
    engaged: '#4caf50',    // Green
    frustrated: '#f44336', // Red
    excited: '#2196f3'     // Blue
  }

  // Custom tooltip to show all values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData[Math.round(label)]
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{dataPoint?.time || label}</p>
          {dataPoint?.lectureContent && (
            <p className="tooltip-content">{dataPoint.lectureContent}</p>
          )}
          <div className="tooltip-values">
            {payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }}>
                {`${entry.name}: ${entry.value}%`}
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="sentiment-graph-container">
      <div className="graph-card">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart
            data={chartData}
            margin={{
              top: 60,
              right: 30,
              left: 20,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="index"
              hide={true}
              type="number"
              domain={[0, data.length - 1]}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              hide={true}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingBottom: '20px' }}
              iconType="line"
              verticalAlign="top"
            />
            
            <Line
              type="monotone"
              dataKey="bored"
              stroke={sentimentColors.bored}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              name="Bored"
            />
            <Line
              type="monotone"
              dataKey="confused"
              stroke={sentimentColors.confused}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              name="Confused"
            />
            <Line
              type="monotone"
              dataKey="engaged"
              stroke={sentimentColors.engaged}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              name="Engaged"
            />
            <Line
              type="monotone"
              dataKey="frustrated"
              stroke={sentimentColors.frustrated}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              name="Frustrated"
            />
            <Line
              type="monotone"
              dataKey="excited"
              stroke={sentimentColors.excited}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              name="Excited"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default SentimentGraphA

