import { useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Home from './Lohin_signup/Home';
import SignUp from './Lohin_signup/Signup';
import Login from './Lohin_signup/Login';
import TotalContent from './components/TotalContent';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { logoutUser, getAccessToken, setAuthSession } from './utils/api';

function App() {
  // Check for OAuth redirect token in URL query params (?token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setAuthSession(token, null);
      // Clean up token from browser URL address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      setSign(false);
    }
  }, []);

  // true = logged out (show login/signup)
  // false = logged in (show TotalContent)
  const [sign, setSign] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) return false;
    const hasToken = !!getAccessToken();
    const stored = localStorage.getItem('isLoggedIn');
    return stored === 'true' && hasToken ? false : true;
  });

  const [activepage, setactivepage] = useState('Dashboard');

  // Sync login state to localStorage
  useEffect(() => {
    localStorage.setItem('isLoggedIn', (!sign).toString());
  }, [sign]);

  // Listen for session expiration events from api.js
  useEffect(() => {
    const handleSessionExpired = () => {
      setSign(true);
    };
    window.addEventListener('auth:logout', handleSessionExpired);
    return () => window.removeEventListener('auth:logout', handleSessionExpired);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setSign(true);
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Router>
        {!sign ? (
          <Routes>
            {/* If signed in, show main content */}
            <Route
              path="*"
              element={
                <TotalContent
                  setactivepage={setactivepage}
                  activepage={activepage}
                  onLogout={handleLogout}
                />
              }
            />
          </Routes>
        ) : (
          <Routes>
            {/* If logged out, show auth pages */}
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp toggle={() => setSign(false)} />} />
            <Route path="/login" element={<Login toggle={setSign} />} />
            <Route path="*" element={<Home />} />
          </Routes>
        )}
      </Router>
    </>
  );
}

export default App;
