import { useState } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [notepad, setNotepad] = useState([]);
  const [input, setInput] = useState("");

  // Send a message (mock Claude)
  const sendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);

    // Mock Claude response
    const claudeMessage = {
      role: "claude",
      content: `Mock Claude response to: "${input}"`,
    };
    setMessages((prev) => [...prev, claudeMessage]);

    setInput("");
  };

  // Summarize user questions and add to notepad
  const summarizeToNotepad = () => {
    // Get the last user message
    const lastUserMsg = [...messages].reverse().find(msg => msg.role === "user");
    if (lastUserMsg) {
      const summaryPoint = `• ${lastUserMsg.content} (unclear)`;
      setNotepad(prev => [...prev, summaryPoint]);
    }
  };


  // Edit notepad items
  const updateNotepadItem = (index, value) => {
    const updated = [...notepad];
    updated[index] = value;
    setNotepad(updated);
  };

  return (
    <div className="app">
      {/* Chat Panel */}
      <div className="chat-panel">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className="chat-message">
              <strong>{msg.role === "user" ? "You:" : "Claude:"}</strong>{" "}
              {msg.content}
            </div>
          ))}
        </div>
        <div className="input-bar">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's unclear in lectures? What do you want to ask today?"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
          <button onClick={summarizeToNotepad}>Summarize & Add to Notepad</button>
        </div>
      </div>

      {/* Editable Notepad */}
      <div className="notepad-panel">
        <h2>Notepad (Editable Questions)</h2>
        {notepad.map((note, i) => (
          <textarea
            key={i}
            value={note}
            onChange={(e) => updateNotepadItem(i, e.target.value)}
            style={{ width: "100%", marginBottom: "8px", minHeight: "40px" }}
          />
        ))}
      </div>
    </div>
  );
}
