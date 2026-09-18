import { useState, useEffect } from 'react'
import './OnboardingTour.css'

function OnboardingTour({ onComplete, isAuthenticated }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showTour, setShowTour] = useState(false)

  // Tour steps for unauthenticated visitors
  const unauthTourSteps = [
    {
      title: "Welcome to Lost & Found Hub! 👋",
      description: "Your one-stop platform for reporting and recovering lost items. Let's take a quick tour to get you started.",
      icon: "🎯",
      highlight: null
    },
    {
      title: "Register to Report Items 📝",
      description: "To report your own lost or found items, you'll need to register first. Click the Register button to get started with email verification.",
      icon: "📝",
      highlight: "register"
    },
    {
      title: "Secure Login 🔐",
      description: "Once registered, you can log in securely with your email and password. Only verified users can post items.",
      icon: "🔐",
      highlight: "login"
    },
    {
      title: "You're All Set! 🎉",
      description: "Register now to start using Lost & Found Hub and help reunite lost items with their owners!",
      icon: "🚀",
      highlight: null
    }
  ]

  // Tour steps for authenticated users
  const authTourSteps = [
    {
      title: "Welcome to Lost & Found Hub! 👋",
      description: "Your one-stop platform for reporting and recovering lost items. Let's take a quick tour to get you started.",
      icon: "🎯",
      highlight: null
    },
    {
      title: "Report Lost Items 📝",
      description: "Click 'Report Lost Item' to share details about items you've lost. Add photos, descriptions, and location information to help others find them.",
      icon: "🔍",
      highlight: "report-lost"
    },
    {
      title: "Report Found Items ✨",
      description: "Found something? Click 'Report Found Item' to help reunite it with its owner. You can add security questions to verify ownership.",
      icon: "🎁",
      highlight: "report-found"
    },
    {
      title: "Search & Browse 🔎",
      description: "Browse through reported items in the main dashboard. Filter by type (lost/found) and search by keywords to find what you're looking for.",
      icon: "🔎",
      highlight: "dashboard"
    },
    {
      title: "Contact & Chat 💬",
      description: "Found an item that matches yours? Contact the owner securely. Both parties can chat in-app to coordinate return arrangements.",
      icon: "💬",
      highlight: "contact"
    },
    {
      title: "Your History 📚",
      description: "Track your resolved items in the history section. You can reactivate items if needed and keep records of successful returns.",
      icon: "📚",
      highlight: "history"
    },
    {
      title: "You're All Set! 🎉",
      description: "You now know the basics of Lost & Found Hub. Start reporting items and help bring lost belongings back to their owners!",
      icon: "🚀",
      highlight: null
    }
  ]

  // Choose appropriate tour steps based on authentication status
  const tourSteps = isAuthenticated ? authTourSteps : unauthTourSteps

  useEffect(() => {
    // Always show the tour on page load - persistent behavior
    setShowTour(true)
  }, [])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setShowTour(false)
    if (onComplete) {
      onComplete()
    }
  }

  const handleSkip = () => {
    setShowTour(false)
    if (onComplete) {
      onComplete()
    }
  }

  if (!showTour) {
    return null
  }

  const currentTourStep = tourSteps[currentStep]

  return (
    <div className="onboarding-inline">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-icon">{currentTourStep.icon}</div>
        </div>

        <div className="onboarding-content">
          <p className="onboarding-description">{currentTourStep.description}</p>
        </div>

        <div className="onboarding-progress">
          <div className="progress-dots">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${index === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="onboarding-footer">
          {currentStep > 0 && (
            <button 
              className="onboarding-button onboarding-button-secondary"
              onClick={handlePrevious}
            >
              ← Back
            </button>
          )}
          
          {currentStep < tourSteps.length - 1 && (
            <button 
              className="onboarding-button onboarding-button-primary"
              onClick={handleNext}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour