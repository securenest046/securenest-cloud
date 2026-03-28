import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import OtpVerify from './pages/Auth/OtpVerify';
import ForgotPassword from './pages/Auth/ForgotPassword';
import Home from './pages/Dashboard/Home';
import Settings from './pages/Dashboard/Settings';
import Loader from './components/Loader';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading, isSwitching } = useAuth();
  if (loading) return <Loader message="Verifying..." />; 
  return (currentUser || isSwitching) ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
