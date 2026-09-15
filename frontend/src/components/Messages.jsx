import { useState, useEffect } from 'react'
import { getMessages, markMessageAsRead } from '../services/api'
import './Messages.css'

function Messages({ user, onClose, onMessageUpdate }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchMessages()
    }
  }, [user])

  const fetchMessages = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getMessages(user.email)
      setMessages(data)
    } catch (err) {
      setError('Failed to load messages')
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (messageId) => {
    try {
      await markMessageAsRead(messageId)
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ))
      if (onMessageUpdate) {
        onMessageUpdate()
      }
    } catch (err) {
      console.error('Error marking message as read:', err)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="messages-panel">
        <div className="messages-header">
          <h2>Messages</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        <div className="messages-loading">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="messages-panel">
      <div className="messages-header">
        <h2>Messages</h2>
        <button onClick={onClose} className="btn-close">×</button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {messages.length === 0 ? (
        <div className="messages-empty">
          <p>No messages yet</p>
        </div>
      ) : (
        <div className="messages-list">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message-item ${!message.is_read ? 'unread' : ''}`}
              onClick={() => !message.is_read && handleMarkAsRead(message.id)}
            >
              <div className="message-header">
                <div className="message-sender">
                  <strong>{message.sender_name}</strong>
                  {!message.is_read && <span className="unread-badge">New</span>}
                </div>
                <div className="message-date">{formatDate(message.created_at)}</div>
              </div>
              <div className="message-context">
                <span className={`item-type-badge ${message.item_type}`}>
                  {message.item_type.toUpperCase()}
                </span>
                <span className="item-title">{message.item_title}</span>
              </div>
              <div className="message-content">{message.message}</div>
              {message.verification_answer && (
                <div className="message-verification">
                  <strong>Security Answer:</strong> {message.verification_answer}
                </div>
              )}
              {message.proof_image_url && (
                <div className="message-proof">
                  <strong>Proof Image:</strong>
                  <a href={message.proof_image_url} target="_blank" rel="noopener noreferrer" className="proof-link">
                    View Proof
                  </a>
                </div>
              )}
              <div className="message-sender-email">{message.sender_email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Messages