import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "./api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";




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
      const res = await api.get(`/api/quizzes/${quizId}/answers`);
      setResults(res.data || []);

      const quizRes = await api.get(`/api/quizzes/${quizId}`);
      setQuizTitle(quizRes.data.title || "Quiz");

    } catch (err) {
      console.error("Failed to fetch quiz results:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = results.map((r) => ({
      Name: r.user?.name || "Unknown",
      Email: r.user?.email || "N/A",
      Score: r.score,
      SubmittedAt: new Date(r.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, `${quizTitle}_results.xlsx`);
  };

  const exportToCSV = () => {
    const data = results.map((r) => ({
      Name: r.user?.name || "Unknown",
      Email: r.user?.email || "N/A",
      Score: r.score,
      SubmittedAt: new Date(r.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${quizTitle}_results.csv`);
  };

    // ✅ This is where you add the exportToPDF function
 const exportToPDF = () => {
  const doc = new jsPDF();

  doc.text(`Quiz Results: ${quizTitle}`, 14, 10);

  const headers = [["Name", "Email", "Score", "Submitted At"]];
  const data = results.map(r => [
    r.user?.name || "Unknown",
    r.user?.email || "N/A",
    r.score,
    new Date(r.createdAt).toLocaleString(),
  ]);

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 20,
  });

  doc.save(`${quizTitle}_results.pdf`);
};

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white shadow-xl rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-indigo-800 text-center">
        Quiz Results: {quizTitle}
      </h1>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export Excel
        </button>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Export CSV
        </button>
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Export PDF
        </button>
      </div>

      {loading ? (
        <p className="text-center text-indigo-500 animate-pulse">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-center text-gray-500 italic">No submissions yet.</p>
      ) : (
        <div className="space-y-6">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-6 shadow-md bg-indigo-50 hover:bg-indigo-100 transition duration-200"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-indigo-900">
                  {result.user?.name || "Unknown Student"}
                </h2>
                <span className="text-sm text-gray-600">
                  {new Date(result.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-gray-700">
                <strong>Email:</strong>{" "}
                <span className="text-indigo-700">
                  {result.user?.email || "N/A"}
                </span>
              </p>

              <p className="text-gray-700">
                <strong>Score:</strong>{" "}
                <span className="text-green-700 font-semibold">{result.score}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
