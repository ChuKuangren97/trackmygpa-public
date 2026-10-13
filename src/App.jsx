import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AddSemester from './pages/AddSemester';
import SemesterDetail from './pages/SemesterDetail';
import AddCourse from './pages/AddCourse';
import Settings from './pages/Settings';
import CGPASimulator from './pages/CGPASimulator';

// Custom PrivateRoute component
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// Redirect if already logged in
function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
            
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/add-semester" element={<PrivateRoute><AddSemester /></PrivateRoute>} />
            <Route path="/semesters/:id" element={<PrivateRoute><SemesterDetail /></PrivateRoute>} />
            <Route path="/semesters/:id/add-course" element={<PrivateRoute><AddCourse /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/simulator" element={<PrivateRoute><CGPASimulator /></PrivateRoute>} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
