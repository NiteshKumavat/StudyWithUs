// src/QuizApp.js
import React, { useState, useEffect } from "react";
import "./quiz.css";

const QuizApp = () => {
  const [categories, setCategories] = useState([]);
  const [quizParams, setQuizParams] = useState({
    category: "",
    difficulty: "",
    type: "",
    amount: 10
  });
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories from Flask backend
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/categories");
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data.trivia_categories || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Failed to load categories. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setQuizParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Build query string from quizParams
      const queryParams = new URLSearchParams();
      if (quizParams.amount) queryParams.append('amount', quizParams.amount);
      if (quizParams.category) queryParams.append('category', quizParams.category);
      if (quizParams.difficulty) queryParams.append('difficulty', quizParams.difficulty);
      if (quizParams.type) queryParams.append('type', quizParams.type);

      const response = await fetch(`/quiz?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const data = await response.json();
      
      if (data.response_code !== 0) {
        throw new Error("No results found for the specified parameters");
      }
      
      const formattedQuestions = data.results.map((q) => {
        const options = q.type === "multiple" 
          ? [...q.incorrect_answers, q.correct_answer].sort(() => 0.5 - Math.random())
          : ["True", "False"];
        return {
          question: decodeHTMLEntities(q.question),
          options: options.map((o) => decodeHTMLEntities(o)),
          answer: decodeHTMLEntities(q.correct_answer),
          type: q.type
        };
      });
      
      setSelectedQuestions(formattedQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowScore(false);
      setSelectedOption(null);
      setShowFeedback(false);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError(err.message || "Failed to load questions. Please try different parameters.");
    } finally {
      setIsLoading(false);
    }
  };

  // Decode HTML entities from API
  const decodeHTMLEntities = (text) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  };

  const handleAnswerOptionClick = (option) => {
    setSelectedOption(option);
    setShowFeedback(true);

    if (option === selectedQuestions[currentQuestionIndex].answer) {
      setScore(score + 1);
    }

    setTimeout(() => {
      const nextQuestion = currentQuestionIndex + 1;
      if (nextQuestion < selectedQuestions.length) {
        setCurrentQuestionIndex(nextQuestion);
        setSelectedOption(null);
        setShowFeedback(false);
      } else {
        setShowScore(true);
      }
    }, 1500);
  };

  const resetQuiz = () => {
    setSelectedQuestions([]);
    setShowScore(false);
    setShowFeedback(false);
  };

  return (
    <div className="quiz-container">
      <div className="quiz-app">
        <h1 className="quiz-title">Trivia Quiz</h1>

        {selectedQuestions.length === 0 ? (
          <div className="quiz-form">
            <h2>Customize Your Quiz</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="category">Category:</label>
                <select 
                  id="category" 
                  name="category"
                  value={quizParams.category}
                  onChange={handleParamChange}
                >
                  <option value="">Any Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty:</label>
                <select 
                  id="difficulty" 
                  name="difficulty"
                  value={quizParams.difficulty}
                  onChange={handleParamChange}
                >
                  <option value="">Any Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="type">Question Type:</label>
                <select 
                  id="type" 
                  name="type"
                  value={quizParams.type}
                  onChange={handleParamChange}
                >
                  <option value="">Any Type</option>
                  <option value="multiple">Multiple Choice</option>
                  <option value="boolean">True/False</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Number of Questions (1-50):</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  min="1"
                  max="50"
                  value={quizParams.amount}
                  onChange={handleParamChange}
                />
              </div>

              <button 
                type="submit" 
                className="start-btn"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Start Quiz"}
              </button>
            </form>
          </div>
        ) : showScore ? (
          <div className="score-section">
            <div className="final-score">
              Final Score: <span className="score-value">{score}</span>/
              {selectedQuestions.length}
            </div>
            <h2>Quiz Completed!</h2>
            <div className="score-message">
              {score === selectedQuestions.length
                ? "Perfect! 🎉"
                : score >= selectedQuestions.length * 0.7
                ? "Great job! 👍"
                : "Keep practicing! 💪"}
            </div>
            <button onClick={resetQuiz} className="reset-btn">
              Start New Quiz
            </button>
          </div>
        ) : (
          <div className="question-section">
            <div className="question-count">
              Question {currentQuestionIndex + 1} of {selectedQuestions.length}
            </div>
            <div className="question-text">
              {selectedQuestions[currentQuestionIndex]?.question}
            </div>
            <div className="answer-options">
              {selectedQuestions[currentQuestionIndex]?.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerOptionClick(option)}
                  disabled={selectedOption !== null}
                  className={`option-btn ${
                    selectedOption === option
                      ? option ===
                        selectedQuestions[currentQuestionIndex].answer
                        ? "correct"
                        : "incorrect"
                      : ""
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {showFeedback && (
              <div
                className={`feedback ${
                  selectedOption ===
                  selectedQuestions[currentQuestionIndex].answer
                    ? "correct"
                    : "incorrect"
                }`}
              >
                {selectedOption ===
                selectedQuestions[currentQuestionIndex].answer
                  ? "✓ Correct!"
                  : `✗ Incorrect! The answer is: ${selectedQuestions[currentQuestionIndex].answer}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizApp;