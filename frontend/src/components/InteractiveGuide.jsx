import { useState } from 'react'
import './InteractiveGuide.css'

function InteractiveGuide({ isOpen, onClose, inContainer = false }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const controlledOpen = isOpen !== undefined ? isOpen : internalOpen
  const setOpen = isOpen !== undefined ? onClose : setInternalOpen

  const tourSteps = [
    {
      title: "Report Lost Items 📝",
      description: "Click 'Report Lost Item' to share details about items you've lost. Add photos, descriptions, and location information to help others find them.",
      icon: "🔍"
    },
    {
      title: "Report Found Items ✨",
      description: "Found something? Click 'Report Found Item' to help reunite it with its owner. You can add security questions to verify ownership.",
      icon: "🎁"
    },
    {
      title: "Search & Browse 🔎",
      description: "Browse through reported items in the main dashboard. Filter by type (lost/found) and search by keywords to find what you're looking for.",
      icon: "🔎"
    },
    {
      title: "Contact & Chat 💬",
      description: "Found an item that matches yours? Contact the owner securely. Both parties can chat in-app to coordinate return arrangements.",
      icon: "💬"
    },
    {
      title: "Your History 📚",
      description: "Track your resolved items in the history section. You can reactivate items if needed and keep records of successful returns.",
      icon: "📚"
    },
    {
      title: "You're All Set! 🎉",
      description: "You now know the basics of Lost & Found Hub. Start reporting items and help bring lost belongings back to their owners!",
      icon: "🚀"
    }
  ]

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setOpen()
    setCurrentStep(0)
  }

  return (
    <>
      {/* Floating Guide Trigger Button */}
      {!isOpen && !inContainer && (
        <button
          className="guide-trigger"
          onClick={() => setInternalOpen(true)}
          aria-label="Open guide"
        >
          <span className="guide-icon">?</span>
          <span className="guide-text">Need Help</span>
        </button>
      )}

      {/* Interactive Walkthrough Modal */}
      {controlledOpen && (
        <div className="guide-modal-overlay" onClick={handleClose}>
          <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="guide-close"
              onClick={handleClose}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="guide-content">
              <div className="guide-icon-large">{tourSteps[currentStep].icon}</div>
              <h3 className="guide-title">{tourSteps[currentStep].title}</h3>
              <p className="guide-description">{tourSteps[currentStep].description}</p>
            </div>

            <div className="guide-progress">
              <div className="progress-dots">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`progress-dot ${index === currentStep ? 'active' : ''}`}
                  />
                ))}
              </div>
              <span className="progress-text">
                {currentStep + 1} of {tourSteps.length}
              </span>
            </div>

            <div className="guide-footer">
              <button
                className="guide-button guide-button-secondary"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                ← Previous
              </button>
              <button
                className="guide-button guide-button-skip"
                onClick={handleClose}
              >
                Skip
              </button>
              <button
                className="guide-button guide-button-primary"
                onClick={handleNext}
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default InteractiveGuide