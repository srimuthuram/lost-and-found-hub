import { useState, useRef } from 'react'
import { registerUser, verifyOTP } from '../services/api'
import OTPModal from './OTPModal'
import './AuthGateway.css'

function AuthGateway({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dpPreview, setDpPreview] = useState(null)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [registrationResponse, setRegistrationResponse] = useState(null)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    dp_file: null
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

  const handleSubmit = async (e) => {
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

      // Convert DP to Base64 if exists
      let dp_url = null
      if (formData.dp_file) {
        dp_url = await convertToBase64(formData.dp_file)
      }

      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        dp_url: dp_url
      }

      const response = await registerUser(userData)
      setRegistrationResponse(response)
      setRegisteredEmail(formData.email)
      setShowOTPModal(true)
    } catch (err) {
      setError('Registration failed. Please try again.')
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOTPVerify = async (email, otpCode) => {
    try {
      await verifyOTP(email, otpCode)
      setShowOTPModal(false)
      
      // Log in the user after verification
      const user = {
        id: registrationResponse.id,
        name: registrationResponse.name,
        email: registrationResponse.email,
        dp_url: registrationResponse.dp_url,
        is_verified: true
      }
      
      localStorage.setItem('user', JSON.stringify(user))
      onAuthSuccess(user)
    } catch (err) {
      throw err
    }
  }

  return (
    <div className="auth-gateway">
      <div className="auth-container">
        <div className="auth-form-container">
          <h2 className="auth-title">Register</h2>
          
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
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
              <label>Name *</label>
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
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                required
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create password"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                placeholder="Confirm password"
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
      
      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={registeredEmail}
        onVerify={handleOTPVerify}
      />
    </div>
  )
}

export default AuthGateway
