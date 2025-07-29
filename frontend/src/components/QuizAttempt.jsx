import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api';
 
export default function QuizAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2700); // countdown in seconds
  const answersRef = useRef([]);
 
  useEffect(() => {
    const fetchQuiz = async () => {
      const res = await api.get(`/api/quizzes/${id}`);
      setQuiz(res.data);
      setAnswers(new Array(res.data.questions.length).fill(null));
      answersRef.current = new Array(res.data.questions.length).fill(null);
    };
    fetchQuiz();
  }, [id]);
 
  // Countdown timer logic
  useEffect(() => {
    if (submitted) return;
 
    if (timeLeft === 0) {
      autoSubmit();
      return;
    }
 
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
 
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);
 
  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };
 
  const handleChange = (questionIndex, selectedOption) => {
    if (submitted) return;
    const updatedAnswers = [...answers];
    updatedAnswers[questionIndex] = selectedOption;
    setAnswers(updatedAnswers);
    answersRef.current = updatedAnswers;
  };
 
  const autoSubmit = async () => {
    try {
      await api.post(`/api/quizzes/${id}/answer`, { answers: answersRef.current });
      setSubmitted(true);
      alert('⏰ Time’s up! Your quiz was auto-submitted.');
      navigate('/student/dashboard');
    } catch (err) {
      alert('❌ Failed to auto-submit quiz. Please try again.');
    }
  };
 
  const handleSubmit = async () => {
    try {
      await api.post(`/api/quizzes/${id}/answer`, { answers });
      setSubmitted(true);
      alert('✅ Answers submitted successfully!');
      navigate('/student/dashboard');
    } catch (err) {
      alert('❌ Failed to submit quiz. Please try again.');
    }
  };
 
  if (!quiz) return <div className="text-center mt-10 text-lg">Loading...</div>;
 
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Timer Display */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-extrabold text-purple-700">{quiz.title}</h2>
        <div className="text-xl font-bold text-pink-600 bg-pink-100 px-4 py-2 rounded-full shadow">
          Time Left: {formatTime(timeLeft)}
        </div>
      </div>
 
      {quiz.questions.map((q, idx) => {
        const userAnswer = answers[idx];
        return (
          <div key={idx} className="mb-10 p-6 rounded-2xl shadow-xl border border-pink-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <p className="text-xl font-semibold text-purple-900 mb-6">{idx + 1}. {q.questionText}</p>
 
            <div className="grid gap-4">
              {q.options.map((opt, optIdx) => {
                const isSelected = userAnswer === optIdx;
 
                let base = "p-4 rounded-xl cursor-pointer transition duration-200 border text-base font-medium";
                let style = "bg-white border-gray-300 hover:bg-pink-100 text-purple-900";
 
                if (submitted) {
                  style = "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed";
                } else if (isSelected) {
                  style = "bg-purple-100 border-purple-500 text-purple-900 shadow-md";
                }
 
                return (
                  <label
                    key={optIdx}
                    className={`${base} ${style}`}
                    onClick={() => handleChange(idx, optIdx)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${idx}`}
                        value={optIdx}
                        checked={isSelected}
                        onChange={() => handleChange(idx, optIdx)}
                        className="hidden"
                        disabled={submitted}
                      />
                      <span className="flex items-center gap-2">
                        {isSelected && <span className="text-green-600 font-bold">✓</span>}
                        {opt}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
 
      {!submitted && (
        <div className="text-center mt-10">
          <button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-8 py-4 rounded-full shadow-lg transition duration-300 ease-in-out"
          >
            Submit Answers
          </button>
        </div>
      )}
    </div>
  );
}
 