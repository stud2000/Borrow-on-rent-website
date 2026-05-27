import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLink = (to, label) => (
    <Link to={to}
      className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
        location.pathname === to ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
      }`}>
      {label}
    </Link>
  );

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          <span className="font-bold text-xl text-primary-700">BorrowLocal</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLink('/', 'Browse')}
          {navLink('/map', 'Map')}
          {user && navLink('/dashboard', 'Dashboard')}
          {user && navLink('/messages', 'Messages')}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/post-item"
                className="btn-primary text-sm py-2 px-4">
                + Lend Item
              </Link>
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {user.avatar ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : user.name?.[0]?.toUpperCase()}
                  </div>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-xl shadow-lg py-2 w-48 z-50">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>My Profile</Link>
                    <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm">Join Free</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {navLink('/', 'Browse')}
          {navLink('/map', 'Map')}
          {user && navLink('/dashboard', 'Dashboard')}
          {user && navLink('/messages', 'Messages')}
          {user ? (
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <Link to="/post-item" className="block text-sm font-medium text-primary-600 px-3 py-2">+ Lend Item</Link>
              <Link to="/profile" className="block text-sm text-gray-600 px-3 py-2">My Profile</Link>
              <button onClick={handleLogout} className="block text-sm text-red-600 px-3 py-2">Logout</button>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Link to="/login" className="btn-secondary text-sm flex-1 text-center">Login</Link>
              <Link to="/register" className="btn-primary text-sm flex-1 text-center">Join Free</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
