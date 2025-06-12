import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { FileText } from 'lucide-react';

export default function UserQuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [attemptStatus, setAttemptStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get('/api/quizzes');
        setQuizzes(res.data);

        const statuses = {};
        for (const quiz of res.data) {
          try {
            const response = await api.get(`/api/quizzes/${quiz._id}/check-attempt`);
            statuses[quiz._id] = response.data;
          } catch (err) {
            console.error(`Error checking attempt for quiz ${quiz._id}:`, err.response?.data || err.message);
            statuses[quiz._id] = { attempted: false }; // fallback to allow
          }
        }
        setAttemptStatus(statuses);
      } catch (err) {
        console.error("Error fetching quizzes:", err.response?.data || err.message);
        setError('Failed to load quizzes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (loading) return <p className="text-center mt-20 text-lg">Loading quizzes...</p>;
  if (error) return <p className="text-center mt-20 text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-fuchsia-200 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-fuchsia-600 to-purple-700 bg-clip-text text-transparent mb-12">
          Available Quizzes
        </h2>

        {quizzes.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No quizzes available at the moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {quizzes.map((quiz) => {
              const status = attemptStatus[quiz._id];

              return (
                <div
                  key={quiz._id}
                  className="bg-white/60 backdrop-blur-md border border-pink-200 shadow-2xl rounded-2xl p-6 transition transform hover:-translate-y-1 hover:shadow-pink-300/60 duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="text-fuchsia-600 w-6 h-6" />
                    <h3 className="text-xl font-semibold text-gray-800">{quiz.title}</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-6">
                    {quiz.description || 'No description provided.'}
                  </p>

                  {status?.attempted ? (
                    <p className="text-sm text-red-500 text-center mb-2 font-medium">
                      {status.message
                        ? status.message
                        : 'Already attempted. Please wait 24 hours.'}
                    </p>
                  ) : (
                    <Link
                      to={`/student/quiz/${quiz._id}`}
                      className="inline-block w-full text-center bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-pink-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md"
                    >
                      Take Quiz
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
