import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
 
const AdminDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
 
  useEffect(() => {
    api.get("/api/quizzes")
      .then((response) => {
        setQuizzes(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      });
  }, []);
 
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
 
    const formData = new FormData();
    formData.append("file", file);
 
    try {
      const res = await api.post("/upload-users-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(`✅Uploaded ${res.data.users.length} users successfully.`);
    } catch (err) {
      setUploadStatus("❌ Upload failed: " + (err.response?.data?.message || err.message));
    }
  };
 
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-indigo-700 mb-4 text-center">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mb-8 text-center text-lg">
          Welcome to the admin dashboard. Use the links below to manage admin features.
        </p>
 
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <Link to="/admin/profile" className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition duration-200 shadow-md text-center">
            Go to Profile
          </Link>
 
          <div className="bg-gray-100 p-4 rounded-lg shadow-sm text-center mt-4">
            <h2 className="text-lg font-semibold mb-2 text-indigo-700">Upload Users via Excel</h2>
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="mb-2 block mx-auto" />
            {uploadStatus && <p className="text-sm mt-2 text-gray-700">{uploadStatus}</p>}
          </div>
 
          <Link to="/admin/userlist" className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition duration-200 shadow-md text-center">
            View User List
          </Link>
 
          <Link to="/admin/createquiz" className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition duration-200 shadow-md text-center">
            Create Quiz
          </Link>
        {quizzes.map((quiz) => (
  <Link
    key={quiz._id}
    to={`/admin/quizzes/${quiz._id}/results`}
    className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition duration-200 shadow-md text-center"
  >
    View Results for: {quiz.title}
  </Link>
))}
 
          <Link to="/admin/quizzes" className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition duration-200 shadow-md text-center">
            View Quizzes
          </Link>
 
        </div>
      </div>
    </div>
  );
};
 
export default AdminDashboard;
 