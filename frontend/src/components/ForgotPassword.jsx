import { useState, useRef } from 'react'
import { sendForgotPasswordOTP, verifyForgotPasswordOTP, resetPassword } from '../services/api'
import './ForgotPassword.css'

function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1) // 1: email, 2: otp, 3: new password
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState([])
  const [otpSent, setOtpSent] = useState(false)
  const [showPasswordErrorModal, setShowPasswordErrorModal] = useState(false)
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    
    if (name === 'newPassword') {
      setPasswordErrors(getPasswordValidation(value))
    }
  }

  const getPasswordValidation = (password) => {
    const errors = []
    if (password.length < 8) errors.push('8+ characters')
    if (!/[A-Z]/.test(password)) errors.push('uppercase letter')
    if (!/[a-z]/.test(password)) errors.push('lowercase letter')
    if (!/\d/.test(password)) errors.push('number')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('special character')
    return errors
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await sendForgotPasswordOTP(formData.email)
      setOtpSent(true)
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.message || err?.toString() || 'Failed to send OTP. Please try again.'
      setError(errorMessage)
      console.error('Send OTP error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (formData.otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP')
        setLoading(false)
        return
      }
      
      await verifyForgotPasswordOTP(formData.email, formData.otp)
      setStep(3)
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.message || err?.toString() || 'Invalid OTP. Please try again.'
      setError(errorMessage)
      console.error('Verify OTP error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (formData.newPassword !== formData.confirmPassword) {
        setPasswordErrorMessage('Passwords do not match')
        setShowPasswordErrorModal(true)
        setLoading(false)
        return
      }

      const passwordErrors = []
      const passwordBytes = new TextEncoder().encode(formData.newPassword)
      const validatedPassword = new TextDecoder().decode(passwordBytes.slice(0, 72))
      
      if (validatedPassword.length < 8) {
        passwordErrors.push('at least 8 characters')
      }
      if (!/[A-Z]/.test(validatedPassword)) {
        passwordErrors.push('one uppercase letter')
      }
      if (!/[a-z]/.test(validatedPassword)) {
        passwordErrors.push('one lowercase letter')
      }
      if (!/\d/.test(validatedPassword)) {
        passwordErrors.push('one number')
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(validatedPassword)) {
        passwordErrors.push('one special character')
      }

      if (passwordErrors.length > 0) {
        setPasswordErrorMessage(`Password must contain ${passwordErrors.join(', ')}`)
        setShowPasswordErrorModal(true)
        setLoading(false)
        return
      }

      const resetData = {
        email: formData.email,
        otp_code: formData.otp,
        new_password: validatedPassword
      }

      await resetPassword(resetData)
      setPasswordErrorMessage('Password reset successful! Please log in with your new password.')
      setShowPasswordErrorModal(true)
      setStep(1)
      setFormData({ email: '', otp: '', newPassword: '', confirmPassword: '' })
      setOtpSent(false)
      setError('')
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.message || err?.toString() || 'Password reset failed. Please try again.'
      setError(errorMessage)
      console.error('Reset password error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setOtpSent(false)
      setFormData(prev => ({ ...prev, otp: '' }))
    } else if (step === 3) {
      setStep(2)
    } else {
      onBack()
    }
  }

  return (
    <div className="forgot-password">
      <button onClick={handleBack} className="btn-back">← Back</button>
      <h2 className="auth-title">
        {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Reset Password'}
      </h2>
      
      {error && <div className="error-message">{error}</div>}

      <div className="auth-container">
        {step === 1 ? (
          <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="auth-form">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                required
                disabled={otpSent}
                autoComplete="off"
              />
            </div>
            
            {otpSent && (
              <div className="form-group">
                <label>Enter OTP *</label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  placeholder="000000"
                  maxLength={6}
                  className="otp-input"
                  required
                  autoComplete="off"
                />
              </div>
            )}
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (otpSent ? 'Verifying...' : 'Sending...') : (otpSent ? 'Verify OTP →' : 'Send OTP')}
            </button>
          </form>
        ) : step === 2 ? (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label>Enter OTP *</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                placeholder="000000"
                maxLength={6}
                className="otp-input"
                required
                autoComplete="off"
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label>New Password *</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Create new password"
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
              <div className="password-requirements">
                <small>Min 8 char including a uppercase,lowercase,number and special character</small>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showConfirmPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>

      {/* Password Error Modal */}
      {showPasswordErrorModal && (
        <div className="password-error-modal-overlay">
          <div className="password-error-modal">
            <button
              className="password-error-close"
              onClick={() => {
                setShowPasswordErrorModal(false)
                if (passwordErrorMessage === 'Password reset successful! Please log in with your new password.') {
                  onBack()
                }
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="password-error-icon">
              {passwordErrorMessage === 'Password reset successful! Please log in with your new password.' ? '✅' : '⚠️'}
            </div>
            <h3 className="password-error-title">
              {passwordErrorMessage === 'Password reset successful! Please log in with your new password.' ? 'Success' : 'Password Validation'}
            </h3>
            <p className="password-error-message">{passwordErrorMessage}</p>
            <button
              className="password-error-button"
              onClick={() => {
                setShowPasswordErrorModal(false)
                if (passwordErrorMessage === 'Password reset successful! Please log in with your new password.') {
                  onBack()
                }
              }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ForgotPassword