import { useState } from "react";

export default function QuestionBox() {
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (question.trim() === "") {
      setMessage("Please enter a question.");
      return;
    }

    console.log("Submitted question:", question); // Placeholder for backend
    setMessage("Question submitted!");
    setQuestion("");
  };

  return (
    <div style={styles.container}>
      <h2>Ask a question about the lecture</h2>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Type your question here..."
        style={styles.textarea}
      />
      <button onClick={handleSubmit} style={styles.button}>
        Submit
      </button>
      {message && <p style={{ color: message.includes("submitted") ? "green" : "red" }}>{message}</p>}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#fff",
    padding: "20px 30px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "400px",
    margin: "50px auto",
    fontFamily: "Arial, sans-serif",
  },
  textarea: {
    width: "100%",
    height: "100px",
    margin: "15px 0",
    padding: "10px",
    fontSize: "14px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    resize: "none",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
