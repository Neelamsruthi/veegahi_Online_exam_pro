import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./api";
 
export default function AdminQuizResult() {
  const { quizId } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState("");
 
  useEffect(() => {
    fetchResults();
  }, [quizId]);
 
  const fetchResults = async () => {
    try {
      setLoading(true);
      // Get quiz answers
      const res = await api.get(`/api/quizzes/${quizId}/answers`);
      console.log("Raw quiz answers from API:", res.data);
 
      setResults(res.data);
 
      // Get quiz title
      const quizRes = await api.get(`/api/quizzes/${quizId}`);
      setQuizTitle(quizRes.data.title);
 
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch quiz results:", err);
      setLoading(false);
    }
  };
 
  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white shadow-xl rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-indigo-800">
        Quiz Results: {quizTitle}
      </h1>
 
      {loading ? (
        <p className="text-center text-indigo-500 animate-pulse">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-center text-gray-500 italic">No submissions yet.</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-indigo-100">
            <tr>
              <th className="px-4 py-2 text-left">Student Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Score</th>
           
            </tr>
          </thead>
          <tbody>
           {results.map((result, idx) => (
  <div key={idx} className="border p-4 rounded mb-4">
    <p><strong>Student:</strong> {result.user?.name || 'Unknown'}</p>
    <p><strong>Email:</strong> {result.user?.email || 'N/A'}</p>
    <p><strong>Score:</strong> {result.score}</p>
    <p><strong>Submitted At:</strong> {new Date(result.createdAt).toLocaleString()}</p>
  </div>
))}        </tbody>
        </table>
      )}
    </div>
  );
}
 