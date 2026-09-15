import React, { useState, useEffect, useRef } from 'react';
import { getChatHistory, sendChatMessage, markItemMessagesAsRead } from '../services/api';

const ChatModal = ({ isOpen, onClose, itemId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && itemId && currentUser) {
      loadChatHistory();
      markMessagesAsRead();
    }
  }, [isOpen, itemId, currentUser]);

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
          <h2>Item Chat</h2>
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
                        <a href={msg.proof_image_url} target="_blank" rel="noopener noreferrer" className="proof-link">
                          View Image
                        </a>
                      </div>
                    )}
                    {msg.verification_answer && (
                      <div className="message-verification">
                        <strong>Verification Answer:</strong> {msg.verification_answer}
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
    </div>
  );
};

export default ChatModal;
