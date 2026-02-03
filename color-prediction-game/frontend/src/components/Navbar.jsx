import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/activity', icon: '📊', label: 'Activity' },
    { path: '/promotion', icon: '🎁', label: 'Promotion' },
    { path: '/account', icon: '👤', label: 'Account' },
  ];

  return (
    <>
      {/* Top Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        maxWidth: '480px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '10px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div>
          <div style={{ fontSize: '12px' }}>BDG GAME</div>
          <div style={{ fontSize: '10px' }}>Member {user?.memberId}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold' }}>₹{user?.balance?.toFixed(2)}</div>
          <button 
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '2px 10px',
              borderRadius: '3px',
              fontSize: '10px',
              marginTop: '5px'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
};

export default Navbar;