import { useState } from 'react'
import Gateway from './Gateway'
import LoginForm from './LoginForm'
import MultiStepRegistration from './MultiStepRegistration'
import './AuthManager.css'

function AuthManager({ onAuthSuccess }) {
  const [currentView, setCurrentView] = useState('gateway') // gateway, register, login

  const handleRegisterClick = () => {
    setCurrentView('register')
  }

  const handleLoginClick = () => {
    setCurrentView('login')
  }

  const handleBack = () => {
    setCurrentView('gateway')
  }

  // Render different views based on currentView state
  if (currentView === 'gateway') {
    return <Gateway onRegisterClick={handleRegisterClick} onLoginClick={handleLoginClick} />
  }

  if (currentView === 'login') {
    return <LoginForm onLoginSuccess={onAuthSuccess} onBack={handleBack} />
  }

  // Register view - use new multi-step registration
  return <MultiStepRegistration onAuthSuccess={onAuthSuccess} onBack={handleBack} />
}

export default AuthManager
