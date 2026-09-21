import { useState } from 'react'
import Gateway from './Gateway'
import LoginForm from './LoginForm'
import MultiStepRegistration from './MultiStepRegistration'
import ForgotPassword from './ForgotPassword'
import './AuthManager.css'

function AuthManager({ onAuthSuccess, showOnboarding, onOnboardingComplete }) {
  const [currentView, setCurrentView] = useState('gateway') // gateway, register, login, forgot-password

  const handleRegisterClick = () => {
    setCurrentView('register')
  }

  const handleLoginClick = () => {
    setCurrentView('login')
  }

  const handleForgotPasswordClick = () => {
    setCurrentView('forgot-password')
  }

  const handleBack = () => {
    setCurrentView('gateway')
  }

  const handleBackToLogin = () => {
    setCurrentView('login')
  }

  // Render different views based on currentView state
  if (currentView === 'gateway') {
    return (
      <Gateway 
        onRegisterClick={handleRegisterClick} 
        onLoginClick={handleLoginClick}
        showOnboarding={showOnboarding}
        onOnboardingComplete={onOnboardingComplete}
      />
    )
  }

  if (currentView === 'login') {
    return <LoginForm onLoginSuccess={onAuthSuccess} onBack={handleBack} onForgotPassword={handleForgotPasswordClick} />
  }

  if (currentView === 'forgot-password') {
    return <ForgotPassword onBack={handleBackToLogin} />
  }

  // Register view - use new multi-step registration
  return <MultiStepRegistration onAuthSuccess={onAuthSuccess} onBack={handleBack} />
}

export default AuthManager
