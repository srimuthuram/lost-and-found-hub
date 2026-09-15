import './Gateway.css'

function Gateway({ onRegisterClick, onLoginClick }) {
  return (
    <div className="gateway-container">
      <div className="gateway-card">
        <h1 className="gateway-title">Welcome to Lost & Found Hub</h1>
        <p className="gateway-subtitle">Report lost items or help others find theirs</p>
        
        <div className="gateway-buttons">
          <button onClick={onRegisterClick} className="gateway-btn gateway-btn-primary">
            Register (New User)
          </button>
          <button onClick={onLoginClick} className="gateway-btn gateway-btn-secondary">
            Already Registered? Log In
          </button>
        </div>
      </div>
    </div>
  )
}

export default Gateway
