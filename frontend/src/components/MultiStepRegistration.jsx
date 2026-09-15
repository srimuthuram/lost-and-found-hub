import { useState, useRef } from 'react'
import { sendOTP, verifyOTP, verifyOTPAndRegister } from '../services/api'
import './MultiStepRegistration.css'

function MultiStepRegistration({ onAuthSuccess, onBack }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dpPreview, setDpPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState([])
  const [otpSent, setOtpSent] = useState(false)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    name: '',
    password: '',
    confirm_password: '',
    dp_file: null
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    
    // Update password validation in real-time
    if (name === 'password') {
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

  const handleDpClick = () => {
    fileInputRef.current.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, dp_file: file }))
      setDpPreview(URL.createObjectURL(file))
    }
  }

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await sendOTP(formData.email)
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
      // Verify OTP on backend before proceeding
      if (formData.otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP')
        setLoading(false)
        return
      }
      
      // Call the verifyOTP API
      await verifyOTP(formData.email, formData.otp)
      setStep(2)
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.message || err?.toString() || 'Invalid OTP. Please try again.'
      setError(errorMessage)
      console.error('Verify OTP error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteRegistration = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Password validation
      if (formData.password !== formData.confirm_password) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      // Validate password requirements with specific messages
      const passwordErrors = []
      // Truncate to 72 bytes to prevent bcrypt error
      const passwordBytes = new TextEncoder().encode(formData.password)
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
        setError(`Password must contain ${passwordErrors.join(', ')}`)
        setLoading(false)
        return
      }

      // Update form data with truncated password
      setFormData(prev => ({ ...prev, password: validatedPassword }))

      // Convert DP to Base64 if exists
      let dp_url = null
      if (formData.dp_file) {
        dp_url = await convertToBase64(formData.dp_file)
      }

      const registrationData = {
        email: formData.email,
        otp_code: formData.otp,
        name: formData.name,
        password: validatedPassword,
        dp_url: dp_url
      }

      const response = await verifyOTPAndRegister(registrationData)
      const user = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        dp_url: response.user.dp_url,
        is_verified: response.user.is_verified
      }

      localStorage.setItem('user', JSON.stringify(user))
      // Mark this as a fresh registration for onboarding tour
      sessionStorage.setItem('fresh_registration', 'true')
      onAuthSuccess(user)
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err?.message || err?.toString() || 'Registration failed. Please try again.'
      setError(errorMessage)
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else if (otpSent) {
      setOtpSent(false)
      setFormData(prev => ({ ...prev, otp: '' }))
    } else {
      onBack()
    }
  }

  return (
    <div className="multi-step-registration">
      <div className="auth-container">
        <div className="auth-form-container">
          <button onClick={handleBack} className="btn-back">← Back</button>
          <h2 className="auth-title">
            {step === 1 ? 'Register - Step 1' : 'Register - Step 2'}
          </h2>
          
          {error && <div className="error-message">{error}</div>}

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
          ) : (
            <form onSubmit={handleCompleteRegistration} className="auth-form">
              {/* Circular DP Upload */}
              <div className="dp-upload-container" onClick={handleDpClick}>
                {dpPreview ? (
                  <img src={dpPreview} alt="Profile" className="dp-preview" />
                ) : (
                  <div className="dp-placeholder">
                    <span className="camera-icon">📷</span>
                    <span className="dp-text">Add Photo</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  name="dp_file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="dp-input"
                />
              </div>

              {/* Form Fields */}
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create password"
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
                  {passwordErrors.length > 0 ? (
                    <small className="password-error">
                      Missing: {passwordErrors.join(', ')}
                    </small>
                  ) : formData.password.length > 0 ? (
                    <small className="password-success">✓ Password meets all requirements</small>
                  ) : (
                    <small>Password must contain 8+ characters with uppercase, lowercase, number and special character</small>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
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
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default MultiStepRegistration
