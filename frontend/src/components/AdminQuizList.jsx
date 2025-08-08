import React, { useEffect, useState } from "react";
import api from "./api";
import { Link } from "react-router-dom";

const AdminQuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [quizRes, collegeRes, branchRes] = await Promise.all([
        api.get("/api/quizzes"),
        api.get("/api/users/colleges"),
        api.get("/api/users/branches"),
      ]);

      setQuizzes(quizRes.data);
      setColleges(collegeRes.data);
      setBranches(branchRes.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const deleteQuiz = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.delete(`/api/quizzes/${id}`);
      fetchInitialData();
    } catch (err) {
      alert("Failed to delete quiz: " + (err.response?.data?.message || err.message));
    }
  };

  const openAssignModal = (quiz) => {
    setSelectedQuizId(quiz._id);
    setSelectedCollege("");
    setSelectedBranch("");
    setShowAssignModal(true);
  };

  const assignQuiz = async () => {
    if (!selectedCollege || !selectedBranch) {
      return alert("Please select both college and branch.");
    }

    try {
     const res= await api.post("/api/quizzes/assign", {
        quizId: selectedQuizId,
        collegeName: selectedCollege,
        branch: selectedBranch,
      });
 console.log("✅ Success:", res.data);
      setShowAssignModal(false);
      fetchInitialData();
      alert("Quiz assigned successfully!");
    } catch (err) {
      alert("Failed to assign quiz: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 bg-gradient-to-br from-indigo-50 via-white to-indigo-50 rounded-3xl shadow-xl">
      <h1 className="text-5xl font-extrabold mb-12 text-center text-indigo-900 tracking-wide drop-shadow-md">
        Manage Quizzes
      </h1>

      {loading && (
        <p className="text-center text-indigo-400 text-xl animate-pulse">
          Loading quizzes...
        </p>
      )}
      {error && (
        <p className="text-center text-red-600 font-semibold mb-6">{error}</p>
      )}
      {!loading && quizzes.length === 0 && (
        <p className="text-center text-gray-600 text-xl italic">
          No quizzes found.
        </p>
      )}

      {!loading && quizzes.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-indigo-200 shadow-lg bg-white">
          <table className="min-w-full divide-y divide-indigo-200">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-8 py-4 text-left text-lg font-semibold text-indigo-700 tracking-wide">
                  Title
                </th>
                <th className="px-8 py-4 text-center text-lg font-semibold text-indigo-700 tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-200 bg-white">
              {quizzes.map((quiz) => (
                <tr key={quiz._id} className="hover:bg-indigo-50 transition-colors duration-300">
                  <td className="px-8 py-5 whitespace-nowrap text-indigo-900 font-semibold text-xl">
                    {quiz.title}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-center space-x-3">
                    <Link
                      to={`/admin/quizzes/${quiz._id}/edit`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => openAssignModal(quiz)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-xl shadow-2xl">
            <h2 className="text-2xl font-bold text-indigo-800 mb-4">Assign Quiz</h2>

            <div className="mb-4">
              <label className="block text-indigo-700 font-semibold mb-2">Select College</label>
              <select
                className="w-full border rounded p-2"
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
              >
                <option value="">-- Select College --</option>
                {colleges.map((college, index) => (
                  <option key={index} value={college}>
                    {college}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-indigo-700 font-semibold mb-2">Select Branch</label>
              <select
                className="w-full border rounded p-2"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">-- Select Branch --</option>
                {branches.map((branch, index) => (
                  <option key={index} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={assignQuiz}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
              >
                Assign Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizList;
