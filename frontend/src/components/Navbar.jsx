import { useState, useEffect } from 'react'
import './Navbar.css'

function Navbar({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    onLogout()
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="logo">🔍</span>
          <span className="brand-text">Lost & Found Hub</span>
        </div>

        <div className="navbar-user">
          <div className="user-info" onClick={() => setShowMenu(!showMenu)}>
            {user.dp_url ? (
              <img src={user.dp_url} alt="Profile" className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-placeholder">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="user-name">{user.name}</span>
            <span className="dropdown-arrow">▼</span>
          </div>

          {showMenu && (
            <div className="dropdown-menu">
              <div className="dropdown-item">
                <span className="dropdown-icon">👤</span>
                <span>Profile</span>
              </div>
              <div className="dropdown-item" onClick={handleLogout}>
                <span className="dropdown-icon">🚪</span>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
