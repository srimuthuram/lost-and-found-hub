import React, { useState, useEffect, useRef } from 'react';
import { getChatHistory, sendChatMessage, markItemMessagesAsRead, getItem } from '../services/api';

const ChatModal = ({ isOpen, onClose, itemId, currentUser, otherUser, item }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [itemSecretAnswer, setItemSecretAnswer] = useState(otherUser?.secretAnswer || null);
  const [contactEmail, setContactEmail] = useState(otherUser?.email || null);
  const [contactName, setContactName] = useState(otherUser?.name || null);
  const messagesEndRef = useRef(null);

  // Check if current user is the finder (owner of a found item)
  const isFinder = item && item.type === 'found' && item.user_id === currentUser.id;

  // Initialize contact info from otherUser prop when modal opens
  useEffect(() => {
    if (isOpen && otherUser) {
      setContactEmail(otherUser.email);
      setContactName(otherUser.name);
    }
  }, [isOpen, otherUser]);

  useEffect(() => {
    if (isOpen && itemId && currentUser) {
      loadChatHistory();
      markMessagesAsRead();
      // Fetch item details to get the secret answer
      fetchItemSecretAnswer();
    }
  }, [isOpen, itemId, currentUser]);

  // Determine contact info from messages or otherUser prop
  useEffect(() => {
    if (messages.length > 0 && currentUser) {
      // Find a message from the other person
      const otherPersonMessage = messages.find(msg => msg.sender_id !== currentUser.id);
      if (otherPersonMessage) {
        setContactEmail(otherPersonMessage.sender_email);
        setContactName(otherPersonMessage.sender_name);
      }
    } else if (otherUser) {
      // Use otherUser prop if no messages yet
      setContactEmail(otherUser.email);
      setContactName(otherUser.name);
    }
  }, [messages, currentUser, otherUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const markMessagesAsRead = async () => {
    try {
      await markItemMessagesAsRead(itemId, currentUser.email);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const fetchItemSecretAnswer = async () => {
    try {
      const itemData = await getItem(itemId);
      if (itemData && itemData.secret_answer) {
        setItemSecretAnswer(itemData.secret_answer);
      }
    } catch (err) {
      console.error('Error fetching item secret answer:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const history = await getChatHistory(itemId, currentUser.email);
      setMessages(history);
    } catch (err) {
      setError('Failed to load chat history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      setError('');
      
      // Send to the last person who messaged
      let receiverEmail = '';
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        receiverEmail = lastMessage.is_sent_by_me ? lastMessage.receiver_email : lastMessage.sender_email;
      } else {
        setError('No conversation to reply to');
        setLoading(false);
        return;
      }

      await sendChatMessage({
        item_id: itemId,
        sender_email: currentUser.email,
        receiver_email: receiverEmail,
        message: newMessage.trim(),
      });

      setNewMessage('');
      await loadChatHistory();
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-chat" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="chat-participants">
            {/* Show ONLY the other person's DP, name, and email */}
            {contactName && (
              <div className="chat-participant">
                <div className="participant-dp participant-dp-placeholder">
                  {contactName.charAt(0).toUpperCase()}
                </div>
                <div className="participant-info">
                  <span className="participant-name">{contactName}</span>
                  {contactEmail && (
                    <div className="participant-email">
                      <span className="email-label">Contact:</span>
                      <span className="email-address">{contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="chat-content">
          {error && <div className="error-message">{error}</div>}
          
          {loading && messages.length === 0 ? (
            <div className="chat-loading">Loading messages...</div>
          ) : (
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.is_sent_by_me ? 'sent' : 'received'}`}
                  >
                    <div className="message-header">
                      <span className="message-sender">
                        {msg.is_sent_by_me ? 'You' : `${msg.sender_name} (${msg.sender_email})`}
                      </span>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="message-text">{msg.message}</div>
                    {msg.is_sent_by_me && (
                      <div className="message-read-status">
                        {msg.read_at ? (
                          <span className="read-receipt">✓ Read {new Date(msg.read_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        ) : (
                          <span className="read-receipt unread">✓ Sent</span>
                        )}
                      </div>
                    )}
                    {msg.proof_image_url && (
                      <div className="message-proof">
                        <strong>Proof:</strong>
                        <button
                          onClick={() => setPreviewImage(msg.proof_image_url)}
                          className="proof-link"
                        >
                          View Image
                        </button>
                      </div>
                    )}
                    {msg.verification_answer && isFinder && (
                      <div className="message-verification">
                        <div className="verification-comparison">
                          <div className="verification-original">
                            <strong>Original Security Answer:</strong> {itemSecretAnswer || 'Not set'}
                          </div>
                          <div className="verification-user">
                            <strong>Answer given by {msg.sender_name}:</strong> {msg.verification_answer}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !newMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="image-preview-close" onClick={() => setPreviewImage(null)}>
              ×
            </button>
            <img src={previewImage} alt="Proof image" className="preview-image-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatModal;
