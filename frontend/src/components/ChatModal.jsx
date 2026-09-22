import React, { useState, useEffect, useRef } from 'react';
import { getChatHistory, sendChatMessage, markItemMessagesAsRead, getItem, getChatPartners } from '../services/api';

const ChatModal = ({ isOpen, onClose, itemId, currentUser, otherUser, item }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [itemSecretAnswer, setItemSecretAnswer] = useState(otherUser?.secretAnswer || null);
  const [contactEmail, setContactEmail] = useState(otherUser?.email || null);
  const [contactName, setContactName] = useState(otherUser?.name || null);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const messagesEndRef = useRef(null);

  // Check if current user is the finder (owner of a found item)
  const isFinder = item && item.type === 'found' && item.user_id === currentUser.id;

  // Initialize contact info from otherUser prop when modal opens
  useEffect(() => {
    if (isOpen && otherUser) {
      setContactEmail(otherUser.email);
      setContactName(otherUser.name);
      setSelectedPartner({
        partner_email: otherUser.email,
        partner_name: otherUser.name,
        partner_dp: otherUser.dp_url
      });
    }
  }, [isOpen, otherUser]);

  useEffect(() => {
    if (isOpen && itemId && currentUser) {
      loadChatPartners();
      markMessagesAsRead();
      // Fetch item details to get the secret answer
      fetchItemSecretAnswer();
    }
  }, [isOpen, itemId, currentUser]);

  // Load chat history when selected partner changes
  useEffect(() => {
    if (isOpen && itemId && currentUser && selectedPartner) {
      loadChatHistory();
    }
  }, [selectedPartner, isOpen, itemId, currentUser]);

  // Determine contact info from selected partner
  useEffect(() => {
    if (selectedPartner) {
      setContactEmail(selectedPartner.partner_email);
      setContactName(selectedPartner.partner_name);
    }
  }, [selectedPartner]);

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

  const loadChatPartners = async () => {
    try {
      setLoading(true);
      setError('');
      const partnersData = await getChatPartners(itemId, currentUser.email);
      setPartners(partnersData);
      
      // Select first partner if none selected
      if (partnersData.length > 0 && !selectedPartner) {
        setSelectedPartner(partnersData[0]);
      }
    } catch (err) {
      setError('Failed to load conversation partners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const history = await getChatHistory(itemId, currentUser.email, selectedPartner?.partner_email);
      setMessages(history);
    } catch (err) {
      setError('Failed to load chat history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSelect = (partner) => {
    setSelectedPartner(partner);
    setMessages([]); // Clear messages while loading new conversation
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartner) return;

    try {
      setLoading(true);
      setError('');

      await sendChatMessage({
        item_id: itemId,
        sender_email: currentUser.email,
        receiver_email: selectedPartner.partner_email,
        message: newMessage.trim(),
      });

      setNewMessage('');
      await loadChatHistory();
      await loadChatPartners(); // Refresh partners to update last message
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
            {/* Show ONLY the selected partner's DP, name, and email */}
            {contactName && (
              <div className="chat-participant">
                {selectedPartner?.partner_dp ? (
                  <img src={selectedPartner.partner_dp} alt="Profile" className="participant-dp" />
                ) : (
                  <div className="participant-dp participant-dp-placeholder">
                    {contactName.charAt(0).toUpperCase()}
                  </div>
                )}
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
          {/* Partners Sidebar */}
          {partners.length > 1 && (
            <div className="chat-partners-sidebar">
              <div className="partners-header">
                <h3>Conversations</h3>
              </div>
              <div className="partners-list">
                {partners.map((partner) => (
                  <div
                    key={partner.partner_email}
                    className={`partner-item ${selectedPartner?.partner_email === partner.partner_email ? 'active' : ''}`}
                    onClick={() => handlePartnerSelect(partner)}
                  >
                    {partner.partner_dp ? (
                      <img src={partner.partner_dp} alt="Profile" className="partner-dp" />
                    ) : (
                      <div className="partner-dp partner-dp-placeholder">
                        {partner.partner_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="partner-info">
                      <div className="partner-name">{partner.partner_name}</div>
                      <div className="partner-last-message">
                        {partner.last_message || 'No messages yet'}
                      </div>
                    </div>
                    {partner.unread_count > 0 && (
                      <div className="partner-unread-badge">{partner.unread_count}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="chat-messages-area">
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
                disabled={loading || !selectedPartner}
              />
              <button type="submit" disabled={loading || !newMessage.trim() || !selectedPartner}>
                Send
              </button>
            </form>
          </div>
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
