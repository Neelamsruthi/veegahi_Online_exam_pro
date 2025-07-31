import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import api from './api';

export default function QuizAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes
  const answersRef = useRef([]);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/api/quizzes/${id}`);
        setQuiz(res.data);
        const blankAnswers = new Array(res.data.questions.length).fill(null);
        setAnswers(blankAnswers);
        answersRef.current = blankAnswers;
      } catch (error) {
        toast.error('Failed to load quiz');
        navigate('/student/dashboard');
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  // Tab switching detection
  useEffect(() => {
    const handleTabChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const updated = prev + 1;
          if (updated >= 3) {
            terminateQuiz();
          } else {
            toast.warn(`⚠️ Tab switch detected! (${updated}/3)`, {
              position: 'top-center',
              autoClose: 5000,
              theme: 'colored',
            });
          }
          return updated;
        });
      }
    };

    document.addEventListener('visibilitychange', handleTabChange);
    return () => document.removeEventListener('visibilitychange', handleTabChange);
  }, [submitted, terminated]);

  // Countdown Timer
  useEffect(() => {
    if (submitted || terminated) return;

    if (timeLeft <= 0) {
      autoSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, submitted, terminated]);

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleChange = (questionIndex, selectedOption) => {
    if (submitted || terminated) return;
    const updated = [...answers];
    updated[questionIndex] = selectedOption;
    setAnswers(updated);
    answersRef.current = updated;
  };

  const autoSubmit = async () => {
    try {
      await api.post(`/api/quizzes/${id}/answer`, {
        answers: answersRef.current,
        terminated: false,
      });
      setSubmitted(true);
      Swal.fire({
        icon: 'info',
        title: '⏰ Time’s up!',
        text: 'Your quiz has been auto-submitted.',
      }).then(() => navigate('/student/dashboard'));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Auto-submit failed',
        text: 'Something went wrong. Please try again.',
      });
    }
  };

  const handleSubmit = async () => {
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Submit Quiz?',
      text: 'Are you sure you want to submit your answers?',
      showCancelButton: true,
      confirmButtonText: 'Yes, submit',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.post(`/api/quizzes/${id}/answer`, {
        answers,
        terminated: false,
      });
      setSubmitted(true);
      toast.success('✅ Answers submitted successfully!', {
        position: 'top-center',
        autoClose: 3000,
        theme: 'colored',
      });
      navigate('/student/dashboard');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Submission failed',
        text: 'Unable to submit your quiz. Please try again.',
      });
    }
  };

  const terminateQuiz = async () => {
    setTerminated(true);
    Swal.fire({
      icon: 'error',
      title: '🚫 Quiz Terminated',
      text: 'You switched tabs 3 times. Your answers have been submitted.',
    });

    try {
      await api.post(`/api/quizzes/${id}/answer`, {
        answers: answersRef.current,
        terminated: true,
      });
      navigate('/student/dashboard');
    } catch (err) {
      console.error('Failed to submit terminated quiz:', err);
    }
  };

  if (!quiz) {
    return <div className="text-center mt-10 text-lg">Loading quiz...</div>;
  }

  if (terminated) {
    return (
      <div className="p-6 text-center text-red-600 text-xl font-bold">
        🚫 Quiz terminated due to switching tabs 3 times.<br />
        Your answers have been submitted.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ToastContainer />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-extrabold text-purple-700">{quiz.title}</h2>
        <div className="text-xl font-bold text-pink-600 bg-pink-100 px-4 py-2 rounded-full shadow">
          Time Left: {formatTime(timeLeft)}
        </div>
      </div>

      {/* Questions */}
      {quiz.questions.map((q, idx) => {
        const userAnswer = answers[idx];
        return (
          <div
            key={idx}
            className="mb-10 p-6 rounded-2xl shadow-xl border border-pink-200 bg-gradient-to-br from-purple-50 to-pink-50"
          >
            <div className="flex text-xl font-semibold text-purple-900 mb-6 font-mono">
              <div className="mr-2">{idx + 1}.</div>
              <div className="whitespace-pre-wrap">{q.questionText}</div>
            </div>

            <div className="grid gap-4">
              {q.options.map((opt, optIdx) => {
                const isSelected = userAnswer === optIdx;
                let base = "p-4 rounded-xl cursor-pointer transition duration-200 border text-base font-medium";
                let style = "bg-white border-gray-300 hover:bg-pink-100 text-purple-900";

                if (submitted || terminated) {
                  style = "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed";
                } else if (isSelected) {
                  style = "bg-purple-100 border-purple-500 text-purple-900 shadow-md";
                }

                return (
                  <label key={optIdx} className={`${base} ${style}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${idx}`}
                        value={optIdx}
                        checked={isSelected}
                        onChange={() => handleChange(idx, optIdx)}
                        className="hidden"
                        disabled={submitted || terminated}
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

      {/* Submit Button */}
      {!submitted && !terminated && (
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
