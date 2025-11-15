// Dummy user report data based on sentiment analysis
export const userReportData = {
  title: "Your Learning Report",
  lectureTitle: "Machine Learning Fundamentals",
  date: "2025-01-15",
  overallStats: {
    averageEngagement: 68,
    averageConfusion: 22,
    averageFocus: 72,
    totalTime: "80 minutes"
  },
  sections: [
    {
      title: "Introduction to Machine Learning",
      duration: "15 minutes",
      startTime: "10:00",
      endTime: "10:15",
      metrics: {
        engagement: 75,
        confusion: 15,
        focus: 78,
        bored: 8,
        frustrated: 5,
        excited: 25
      },
      analysis: {
        focusLevel: "High",
        confusionLevel: "Low",
        recommendation: "You were highly engaged during this section. Great job staying focused!"
      },
      highlights: [
        "Peak engagement at 85% during supervised learning explanation",
        "Low confusion indicates clear understanding of basic concepts",
        "High excitement levels suggest strong interest in the topic"
      ]
    },
    {
      title: "Neural Networks Basics",
      duration: "20 minutes",
      startTime: "10:15",
      endTime: "10:35",
      metrics: {
        engagement: 65,
        confusion: 28,
        focus: 70,
        bored: 12,
        frustrated: 15,
        excited: 18
      },
      analysis: {
        focusLevel: "Medium-High",
        confusionLevel: "Medium",
        recommendation: "You showed some confusion during neural network concepts. Consider reviewing activation functions and backpropagation."
      },
      highlights: [
        "Confusion increased during backpropagation explanation (peak 35%)",
        "Engagement dipped slightly but recovered during examples",
        "Frustration levels suggest challenging concepts that need review"
      ]
    },
    {
      title: "Deep Learning Applications",
      duration: "18 minutes",
      startTime: "10:35",
      endTime: "10:53",
      metrics: {
        engagement: 72,
        confusion: 18,
        focus: 75,
        bored: 10,
        frustrated: 8,
        excited: 30
      },
      analysis: {
        focusLevel: "High",
        confusionLevel: "Low",
        recommendation: "Excellent engagement with real-world applications. Your interest in practical examples is evident."
      },
      highlights: [
        "Highest excitement levels (30%) during application examples",
        "Strong focus maintained throughout the section",
        "Low confusion suggests good grasp of practical concepts"
      ]
    },
    {
      title: "Model Evaluation and Metrics",
      duration: "15 minutes",
      startTime: "10:53",
      endTime: "11:08",
      metrics: {
        engagement: 58,
        confusion: 32,
        focus: 62,
        bored: 18,
        frustrated: 20,
        excited: 12
      },
      analysis: {
        focusLevel: "Medium",
        confusionLevel: "High",
        recommendation: "This section showed the highest confusion. Focus on reviewing precision, recall, and F1-score calculations."
      },
      highlights: [
        "Peak confusion at 38% during confusion matrix explanation",
        "Engagement dropped below 60% - consider reviewing this section",
        "Higher frustration indicates need for additional practice"
      ]
    },
    {
      title: "Q&A Session",
      duration: "12 minutes",
      startTime: "11:08",
      endTime: "11:20",
      metrics: {
        engagement: 70,
        confusion: 20,
        focus: 73,
        bored: 10,
        frustrated: 8,
        excited: 22
      },
      analysis: {
        focusLevel: "High",
        confusionLevel: "Low-Medium",
        recommendation: "Good engagement during Q&A. Questions helped clarify concepts, reducing confusion."
      },
      highlights: [
        "Confusion decreased as questions were answered",
        "Steady engagement throughout the session",
        "Positive response to interactive learning format"
      ]
    }
  ],
  insights: [
    {
      type: "strength",
      title: "Strong Areas",
      description: "You showed excellent engagement during practical applications and maintained high focus during foundational concepts."
    },
    {
      type: "improvement",
      title: "Areas for Improvement",
      description: "Model evaluation metrics need more attention. Consider spending extra time reviewing precision, recall, and confusion matrices."
    },
    {
      type: "recommendation",
      title: "Study Recommendations",
      description: "Focus your review time on Neural Networks Basics and Model Evaluation sections. Practice problems will help solidify these concepts."
    }
  ],
  timeDistribution: {
    highlyFocused: 45,
    moderatelyFocused: 25,
    lowFocus: 10
  }
}

