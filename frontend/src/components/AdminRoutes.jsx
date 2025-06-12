import { Routes, Route } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import Profile from './profile';
import UserList from './UserList';
import QuizForm from './QuizForm';
import QuizSubmissions from './QuizSubmissions';
import AdminUploadExcel from './AdminUploadExcel';
import AdminQuizList from './AdminQuizList';
import AdminQuizEdit from './AdminQuizEdit';
import AdminQuizResult from './AdminQuizResult';
 
const AdminRoutes = () => {
  return (
 
<Routes>
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="profile" element={<Profile />} />
  <Route path="userlist" element={<UserList />} />
  <Route path="createquiz" element={<QuizForm />} />
  <Route path="quizzes" element={<AdminQuizList />} />
  <Route path="quizzes/:id/edit" element={<AdminQuizEdit />} />
  <Route path="upload-users" element={<AdminUploadExcel />} />
  <Route path="quizzes/:quizId/results" element={<AdminQuizResult />} />
</Routes>
 
  );
};
 
export default AdminRoutes;
 
 