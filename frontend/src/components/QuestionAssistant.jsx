import { useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import './QuestionAssistant.css'

const QuestionAssistant = () => {
  const [messages, setMessages] = useState([])
  const [notepad, setNotepad] = useState([])
  const [input, setInput] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  // Load saved notepad from localStorage on mount
  useEffect(() => {
    const savedNotepad = localStorage.getItem('questionAssistantNotepad')
    if (savedNotepad) {
      try {
        setNotepad(JSON.parse(savedNotepad))
      } catch (e) {
        console.error('Error loading saved notepad:', e)
      }
    }
  }, [])

  // Auto-save notepad when it changes
  useEffect(() => {
    if (notepad.length > 0) {
      const autoSaveTimer = setTimeout(() => {
        try {
          localStorage.setItem('questionAssistantNotepad', JSON.stringify(notepad))
        } catch (e) {
          console.error('Error auto-saving notepad:', e)
        }
      }, 1000) // Auto-save after 1 second of no changes
      return () => clearTimeout(autoSaveTimer)
    }
  }, [notepad])

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-container')) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  // Save notepad to localStorage
  const saveNotepad = () => {
    try {
      localStorage.setItem('questionAssistantNotepad', JSON.stringify(notepad))
      setSaveStatus('Saved!')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (e) {
      setSaveStatus('Error saving')
      console.error('Error saving notepad:', e)
    }
  }

  // Send a message (mock Claude)
  const sendMessage = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])

    // Mock Claude response
    const claudeMessage = {
      role: 'claude',
      content: `I understand you're asking about: "${input}". This is a placeholder response. In production, this will connect to Claude API for intelligent answers about the lecture content.`
    }
    setMessages((prev) => [...prev, claudeMessage])

    setInput('')
  }

  // Summarize user questions and add to notepad
  const summarizeToNotepad = () => {
    // Get the last user message
    const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user')
    if (lastUserMsg) {
      const summaryPoint = `• ${lastUserMsg.content} (unclear)`
      setNotepad(prev => [...prev, summaryPoint])
    }
  }

  // Edit notepad items
  const updateNotepadItem = (index, value) => {
    const updated = [...notepad]
    updated[index] = value
    setNotepad(updated)
  }

  // Delete notepad item
  const deleteNotepadItem = (index) => {
    setNotepad(prev => prev.filter((_, i) => i !== index))
  }

  // Export functions
  const exportToPDF = () => {
    const content = notepad.join('\n\n')
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Question Notepad Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #333; }
            .note-item { margin-bottom: 15px; padding: 10px; border-left: 3px solid #667eea; }
          </style>
        </head>
        <body>
          <h1>Question Notepad</h1>
          <p>Exported on: ${new Date().toLocaleString()}</p>
          <div>${content.split('\n\n').map(note => `<div class="note-item">${note.replace(/\n/g, '<br>')}</div>`).join('')}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
    setShowExportMenu(false)
  }

  const exportToWord = () => {
    const content = notepad.join('\n\n')
    const blob = new Blob([
      `Question Notepad Export\nExported on: ${new Date().toLocaleString()}\n\n${content}`
    ], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `question-notepad-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const exportToJPG = () => {
    const notepadPanel = document.querySelector('.notepad-panel')
    if (!notepadPanel) return

    // Create a canvas to render the notepad
    html2canvas(notepadPanel, {
      backgroundColor: '#f8f9fa',
      scale: 2,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a')
      link.download = `question-notepad-${new Date().toISOString().split('T')[0]}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setShowExportMenu(false)
    }).catch(err => {
      console.error('Error exporting to JPG:', err)
      alert('Error exporting to JPG. Please try again.')
    })
  }

  return (
    <div className="question-assistant">
      <div className="qa-header">
        <h3>💬 Question Assistant</h3>
        <p>Ask questions about unclear parts of the lecture</p>
      </div>

      <div className="qa-content">
        {/* Chat Panel */}
        <div className="chat-panel">
          <div className="chat-header">
            <h4>Chat with AI Assistant</h4>
          </div>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>Start a conversation by asking a question about the lecture!</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                  <div className="message-role">{msg.role === 'user' ? 'You' : 'AI Assistant'}</div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))
            )}
          </div>
          <div className="input-bar">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's unclear in lectures? What do you want to ask today?"
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="question-input"
            />
            <div className="input-buttons">
              <button onClick={sendMessage} className="send-button">Send</button>
              <button onClick={summarizeToNotepad} className="summarize-button" disabled={messages.length === 0}>
                Add to Notepad
              </button>
            </div>
          </div>
        </div>

        {/* Editable Notepad */}
        <div className="notepad-panel">
          <div className="notepad-header">
            <div className="notepad-title-section">
              <h4>📝 Notepad (Editable Questions)</h4>
              <p>Questions you want to review later</p>
            </div>
            <div className="notepad-actions">
              <button 
                onClick={saveNotepad} 
                className="save-button"
                title="Save draft"
              >
                💾 Save
              </button>
              {saveStatus && <span className="save-status">{saveStatus}</span>}
              <div className="export-container">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)} 
                  className="export-button"
                  title="Export notepad"
                >
                  📤 Export ▼
                </button>
                {showExportMenu && (
                  <div className="export-menu">
                    <button onClick={exportToPDF} className="export-option">
                      📄 Export as PDF
                    </button>
                    <button onClick={exportToWord} className="export-option">
                      📝 Export as Word
                    </button>
                    <button onClick={exportToJPG} className="export-option">
                      🖼️ Export as JPG
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {notepad.length === 0 ? (
            <div className="notepad-empty">
              <p>No questions in notepad yet. Ask a question and click "Add to Notepad" to save it here.</p>
            </div>
          ) : (
            <div className="notepad-items">
              {notepad.map((note, i) => (
                <div key={i} className="notepad-item">
                  <textarea
                    value={note}
                    onChange={(e) => updateNotepadItem(i, e.target.value)}
                    className="notepad-textarea"
                    placeholder="Edit your question..."
                  />
                  <button 
                    onClick={() => deleteNotepadItem(i)} 
                    className="delete-note-button"
                    aria-label="Delete note"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionAssistant

