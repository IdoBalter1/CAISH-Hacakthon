// MCQ data generated from questions.json
export const mcqData = {
  "lectureTitle": "# Machine Learning: From Linear Regression to Neural Networks",
  "questions": [
    {
      "id": 1,
      "topic": "Interactive linear regression demonstration",
      "question": "What happens to the linear regression line when an outlier is added to the dataset?",
      "options": [
        "The line remains completely unchanged",
        "The line gets pulled toward the outlier",
        "The line automatically removes the outlier",
        "The line becomes horizontal"
      ],
      "correctAnswer": 1,
      "explanation": "The instructor demonstrated that when an extreme data point (outlier) is added, the regression line shifts toward that outlier, which is why data cleaning is emphasized as important in real-world applications."
    },
    {
      "id": 2,
      "topic": "Interactive linear regression demonstration",
      "question": "According to the lecture, what is the consequence of using a learning rate that is too large in gradient descent?",
      "options": [
        "The algorithm converges too quickly",
        "The algorithm might never converge",
        "The algorithm takes forever to complete",
        "The algorithm removes all outliers"
      ],
      "correctAnswer": 1,
      "explanation": "The instructor explicitly stated that a learning rate that is too large might cause the algorithm to never converge, as opposed to a learning rate that is too small, which takes a very long time."
    },
    {
      "id": 3,
      "topic": "Interactive linear regression demonstration",
      "question": "In the linear regression demo, how does the algorithm find the best fit for the data?",
      "options": [
        "By manually adjusting the line each time",
        "Through iterations of gradient descent that move the line closer to the optimal position",
        "By removing all data points that don't fit perfectly",
        "By creating multiple separate lines"
      ],
      "correctAnswer": 1,
      "explanation": "The instructor demonstrated that the linear regression line adjusts itself through iterations of gradient descent, with each iteration moving it closer to the optimal position that best fits the data."
    },
    {
      "id": 4,
      "topic": "Introduction to neural networks fundamentals",
      "question": "What is the primary advantage of neural networks compared to linear regression?",
      "options": [
        "Neural networks are faster to train",
        "Neural networks can learn non-linear relationships and complex patterns",
        "Neural networks require less data to train",
        "Neural networks are easier to understand and interpret"
      ],
      "correctAnswer": 1,
      "explanation": "The lecture emphasizes that while linear regression can only fit straight lines, neural networks can learn curves, complex patterns, and intricate decision boundaries due to their use of activation functions."
    },
    {
      "id": 5,
      "topic": "Introduction to neural networks fundamentals",
      "question": "Which of the following is NOT mentioned as a common activation function in the lecture?",
      "options": [
        "Sigmoid",
        "Softmax",
        "ReLU",
        "Tanh"
      ],
      "correctAnswer": 1,
      "explanation": "The lecture specifically mentions ReLU, sigmoid, and tanh as common activation functions. Softmax is not mentioned in this transcript."
    },
    {
      "id": 6,
      "topic": "Introduction to neural networks fundamentals",
      "question": "In the image recognition example provided, what does the second layer of a neural network typically learn to recognize?",
      "options": [
        "Complete objects",
        "Edges in the image",
        "Combinations of edges into shapes",
        "Individual object parts"
      ],
      "correctAnswer": 2,
      "explanation": "According to the lecture's intuition example, the first layer detects edges, the second layer combines edges into shapes, the third layer recognizes object parts, and the final layer identifies complete objects."
    }
  ]
};
