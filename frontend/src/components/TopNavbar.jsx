import { useState, useEffect } from 'react'
import './TopNavbar.css'

function TopNavbar({ user, onLogout, unreadCount, onNotificationsClick }) {
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  // Hide help button when dropdown is open
  useEffect(() => {
    const helpButton = document.querySelector('.guide-trigger');
    if (helpButton) {
      helpButton.style.display = showMenu ? 'none' : 'flex';
    }
  }, [showMenu])

  return (
    <nav className="top-navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <span className="logo">🔍</span>
          <span className="brand-text">Lost & Found Hub</span>
        </div>

        {user && (
          <div className="navbar-user">
            <div 
              className="notification-bell" 
              onClick={onNotificationsClick}
              aria-label="Notifications"
            >
              <span className="bell-icon">🔔</span>
              {unreadCount > 0 && (
                <span className="notification-badge-count">{unreadCount}</span>
              )}
            </div>
            
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
                <button className="dropdown-close" onClick={() => setShowMenu(false)}>✕</button>
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
        )}
      </div>
    </nav>
  )
}

export default TopNavbar
