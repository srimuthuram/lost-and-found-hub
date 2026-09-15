import React, { useState } from 'react';

const OTPModal = ({ isOpen, onClose, email, onVerify }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onVerify(email, otp);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-otp" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Verify Your Email</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        <div className="modal-form otp-form">
          <p className="otp-instructions">
            We've sent a 6-digit verification code to:
            <br />
            <strong>{email}</strong>
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Enter verification code</label>
              <input
                type="text"
                value={otp}
                onChange={handleOtpChange}
                placeholder="000000"
                maxLength={6}
                className="otp-input"
                autoFocus
                autoComplete="off"
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Account'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;
