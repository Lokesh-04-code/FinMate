import { useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Home from './Lohin_signup/Home';
import SignUp from './Lohin_signup/Signup';
import Login from './Lohin_signup/Login';
import TotalContent from './components/TotalContent';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function App() {
  // true = logged out (show login/signup)
  // false = logged in (show TotalContent)
  const [sign, setSign] = useState(() => {
    const stored = localStorage.getItem('isLoggedIn');
    return stored === 'true' ? false : true;
  });

  const [activepage, setactivepage] = useState('Dashboard');

  // Sync login state to localStorage
  useEffect(() => {
    localStorage.setItem('isLoggedIn', (!sign).toString());
  }, [sign]);

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
                onLogout={() => {
                  setSign(true);
                  localStorage.removeItem('isLoggedIn');
                }}
              />
            }
          />
        </Routes>
      ) : (
        <Routes>
          {/* If logged out, show auth pages */}
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login toggle={setSign} />} />
          <Route path="*" element={<Home />} />
        </Routes>
      )}
    </Router>
    </>
  );
}

export default App;
