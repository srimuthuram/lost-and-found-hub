import OnboardingTour from './OnboardingTour'
import './Gateway.css'

function Gateway({ onRegisterClick, onLoginClick, showOnboarding, onOnboardingComplete }) {
  return (
    <div className="gateway-container">
      <div className="gateway-content">
        <h1 className="gateway-title">Welcome to Lost & Found Hub</h1>
        <p className="gateway-subtitle">Report lost items or help others find theirs</p>
        
        {showOnboarding && (
          <OnboardingTour
            onComplete={onOnboardingComplete}
            isAuthenticated={false}
          />
        )}
        
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
