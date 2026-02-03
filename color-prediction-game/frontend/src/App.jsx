import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import HomePage from './components/home/HomePage';
import GamePage from './components/game/GamePage';
import ActivityPage from './components/activity/ActivityPage';
import PromotionPage from './components/promotion/PromotionPage';
import AccountPage from './components/account/AccountPage';
import Navbar from './components/common/Navbar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="app">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route path="/login" element={
            !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />
          } />
          <Route path="/register" element={
            !isAuthenticated ? <Register /> : <Navigate to="/" />
          } />
          <Route path="/" element={
            isAuthenticated ? <HomePage user={user} /> : <Navigate to="/login" />
          } />
          <Route path="/game/:gameId" element={
            isAuthenticated ? <GamePage user={user} /> : <Navigate to="/login" />
          } />
          <Route path="/activity" element={
            isAuthenticated ? <ActivityPage user={user} /> : <Navigate to="/login" />
          } />
          <Route path="/promotion" element={
            isAuthenticated ? <PromotionPage user={user} /> : <Navigate to="/login" />
          } />
          <Route path="/account" element={
            isAuthenticated ? <AccountPage user={user} /> : <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;