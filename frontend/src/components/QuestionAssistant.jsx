import { useState } from 'react'
import './QuestionAssistant.css'

const QuestionAssistant = () => {
  const [messages, setMessages] = useState([])
  const [notepad, setNotepad] = useState([])
  const [input, setInput] = useState('')

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
            <h4>📝 Notepad (Editable Questions)</h4>
            <p>Questions you want to review later</p>
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

