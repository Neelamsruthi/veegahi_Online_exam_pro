import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import api from './api';
import Webcam from 'react-webcam';

export default function QuizAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(2700);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const answersRef = useRef([]);
  const webcamRef = useRef(null);

  const videoConstraints = {
    width: 200,
    height: 150,
    facingMode: 'user',
  };

  useEffect(() => {
    const savedTime = localStorage.getItem(`quiz-${id}-timer`);
    const savedAnswers = localStorage.getItem(`quiz-${id}-answers`);

    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/api/quizzes/${id}`);
        setQuiz(res.data);

        let restoredAnswers = res.data.questions.map(q => ({ type: q.type, answer: '' }));
        if (savedAnswers) {
          const parsed = JSON.parse(savedAnswers);
          if (Array.isArray(parsed)) restoredAnswers = parsed;
        }

        setAnswers(restoredAnswers);
        answersRef.current = restoredAnswers;

        setTimeLeft(savedTime && !isNaN(savedTime) ? parseInt(savedTime, 10) : 2700);
      } catch (error) {
        toast.error('Failed to load quiz');
        navigate('/student/dashboard');
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  // Hide camera after submit/terminate
  useEffect(() => {
    if (submitted || terminated) setShowCamera(false);
  }, [submitted, terminated]);

  // Tab switch detection
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

  // Timer countdown
  useEffect(() => {
  if (submitted || terminated) return;

  if (timeLeft <= 0) {
    const submitNow = async () => {
      await autoSubmit();
    };
    submitNow();
    return;
  }

  const interval = setInterval(() => {
    setTimeLeft(prev => {
      const updated = prev - 1;
      localStorage.setItem(`quiz-${id}-timer`, updated);
      return updated;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [timeLeft, submitted, terminated, id]);


  // Disable back navigation
  useEffect(() => {
    if (submitted || terminated) return;
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      toast.warn('⚠️ Navigation disabled during quiz!', {
        position: 'top-center',
        autoClose: 3000,
        theme: 'colored',
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [submitted, terminated]);

  // Save on tab/browser close
  useEffect(() => {
    const saveBeforeUnload = () => {
      localStorage.setItem(`quiz-${id}-answers`, JSON.stringify(answersRef.current));
    };
    window.addEventListener('beforeunload', saveBeforeUnload);
    return () => window.removeEventListener('beforeunload', saveBeforeUnload);
  }, [id]);

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleChange = (index, value, type) => {
  const updated = [...answers];
  const parsedValue = type === 'mcq' ? parseInt(value) : value; 
  updated[index] = { type, answer: parsedValue };
  setAnswers(updated);
  answersRef.current = [...updated];
  localStorage.setItem(`quiz-${id}-answers`, JSON.stringify(updated));
};


  const autoSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/quizzes/${id}/answer`, {
        answers: answersRef.current,
        terminated: false,
      });
      setSubmitted(true);
      localStorage.removeItem(`quiz-${id}-timer`);
      localStorage.removeItem(`quiz-${id}-answers`);
      await Swal.fire({
        icon: 'info',
        title: '⏰ Time’s up!',
        text: `Your quiz has been auto-submitted. Score: ${res.data.score}`,
      });
      navigate('/student/dashboard');
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Auto-submit failed',
        text: 'Something went wrong. Please try again.',
      });
    }
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Submit Quiz?',
      text: 'Are you sure you want to submit your answers?',
      showCancelButton: true,
      confirmButtonText: 'Yes, submit',
      cancelButtonText: 'Cancel',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/api/quizzes/${id}/answer`, {
        answers: answersRef.current,
        terminated: false,
      });
      setSubmitted(true);
      localStorage.removeItem(`quiz-${id}-timer`);
      localStorage.removeItem(`quiz-${id}-answers`);
      toast.success('✅ Answers submitted successfully!', {
        position: 'top-center',
        autoClose: 3000,
        theme: 'colored',
      });
      await Swal.fire({ icon: 'success', title: 'Quiz Submitted!' });
      navigate('/student/dashboard');
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Submission failed',
        text: 'Unable to submit your quiz. Please try again.',
      });
    }
    setSubmitting(false);
  };

  const terminateQuiz = async () => {
    setTerminated(true);
    alert("Quiz terminated due to tab switching!");
    try {
      const response = await api.post(`/api/quizzes/${id}/answer`, {
        answers: answersRef.current,
        terminated: true,
      });
      localStorage.removeItem(`quiz-${id}-timer`);
      localStorage.removeItem(`quiz-${id}-answers`);
      if (response.data.message === "Quiz submitted successfully") {
        navigate("/result", {
          state: {
            score: response.data.score,
            total: quiz.questions.length,
          },
        });
      }
    } catch (err) {
      console.error("Error submitting terminated quiz:", err);
    }
  };

  if (!quiz) return <div className="text-center mt-10 text-lg">Loading quiz...</div>;

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

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-extrabold text-purple-700">{quiz.title}</h2>
        <div className="text-xl font-bold text-pink-600 bg-pink-100 px-4 py-2 rounded-full shadow">
          Time Left: {formatTime(timeLeft)}
        </div>
      </div>

      {quiz.questions.map((q, idx) => {
        const userAnswer = answers[idx];

        return (
          <div
            key={idx}
            className="mb-10 p-6 rounded-2xl shadow-xl border border-pink-200 bg-gradient-to-br from-purple-50 to-pink-50"
          >
            <div className="flex text-xl font-semibold text-purple-900 mb-6 font-mono">
              <div className="mr-2">{idx + 1}.</div>
              <div className="whitespace-pre-wrap">{q.questionText || q.question}</div>
            </div>

            {q.type === 'fill_blank' ? (
              <input
                type="text"
                value={userAnswer?.answer ?? ''}
                onChange={(e) => handleChange(idx, e.target.value, q.type)}
                disabled={submitted || terminated}
                placeholder="Type your answer here..."
                className="w-full p-3 border rounded focus:outline-none focus:ring focus:border-blue-500"
              />
            ) : (
              <div className="grid gap-4">
                {q.options.map((opt, optIdx) => {
                 const isSelected = parseInt(userAnswer?.answer) === optIdx;

                  let base =
                    'p-4 rounded-xl cursor-pointer transition duration-200 border text-base font-medium';
                  let style = 'bg-white border-gray-300 hover:bg-pink-100 text-purple-900';

                  if (submitted || terminated) {
                    style = 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed';
                  } else if (isSelected) {
                    style = 'bg-purple-100 border-purple-500 text-purple-900 shadow-md';
                  }

                  return (
                    <label key={optIdx} className={`${base} ${style}`} tabIndex={0}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`question-${idx}`}
                          value={optIdx}
                          checked={isSelected}
                          onChange={() => handleChange(idx, optIdx, q.type)}
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
            )}
          </div>
        );
      })}

      {!submitted && !terminated && (
        <div className="text-center mt-10">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-8 py-4 rounded-full shadow-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        </div>
      )}

      {/* Webcam Camera Preview */}
      {showCamera && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            border: '3px solid #a855f7',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'white',
            width: '200px',
            height: '150px',
          }}
        >
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
          />
        </div>
      )}
    </div>
  );
}
