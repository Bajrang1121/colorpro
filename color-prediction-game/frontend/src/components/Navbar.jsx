import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/home">Color Predict</Link>
      </div>
      
      <div className="nav-links">
        <Link to="/home">Home</Link>
        <Link to="/game">Play Game</Link>
        <Link to="/activity">Activity</Link>
        <Link to="/promotions">Promotions</Link>
        <Link to="/account">Account</Link>
      </div>
      
      <div className="nav-actions">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;