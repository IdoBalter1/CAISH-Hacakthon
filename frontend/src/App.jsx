import { useState, useEffect } from 'react'
import SentimentGraphA from './components/SentimentGraphA'
import SentimentGraphB from './components/SentimentGraphB'
import SharedTimeAxis from './components/SharedTimeAxis'
import InstallPrompt from './components/InstallPrompt'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showGraph, setShowGraph] = useState(false)

  useEffect(() => {
    // Load data from the dummy.JSON file
    // Files in public folder are served at root
    fetch('/scripts/dummy.JSON')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        return response.json()
      })
      .then(jsonData => {
        setData(jsonData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
        console.error('Error loading data:', err)
      })
  }, [])

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">Loading sentiment data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button 
          className="feel-button"
          onClick={() => setShowGraph(!showGraph)}
          aria-label="Toggle sentiment graph"
        >
          How do you feel?
        </button>
      </header>
      <main className="app-main">
        {data && (
          <div className={`graph-wrapper ${showGraph ? 'show' : 'hide'}`}>
            <div className="graphs-container">
              <SentimentGraphA data={data.sentimentTimeline} />
              <SharedTimeAxis data={data.sentimentTimeline} />
              <SentimentGraphB data={data.sentimentTimeline} />
            </div>
          </div>
        )}
      </main>
      <InstallPrompt />
    </div>
  )
}

export default App

