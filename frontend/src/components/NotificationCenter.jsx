import React, { useState, useEffect } from 'react';
import { getItems } from '../services/api';
import './NotificationCenter.css';

function NotificationCenter({ user, onClose, onViewItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecentItems();
    }
  }, [user]);

  const loadRecentItems = async () => {
    try {
      setLoading(true);
      const data = await getItems();
      // Show recent items (last 10)
      setItems(data.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (onViewItem) {
      onViewItem(item);
    }
    onClose();
  };

  return (
    <div className="notification-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <h2>Recently Reported Items</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="notification-body">
          {loading ? (
            <div className="notification-loading">Loading recent items...</div>
          ) : items.length === 0 ? (
            <div className="notification-empty">
              <p>No items reported yet</p>
              <small>Be the first to report a lost or found item</small>
            </div>
          ) : (
            <div className="notification-list">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="notification-item"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="notification-item-header">
                    <span className={`notification-type ${item.type}`}>
                      {item.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                    </span>
                  </div>
                  <div className="notification-item-title">{item.title}</div>
                  <div className="notification-item-reporter">
                    Reported by {item.user_name}
                  </div>
                  <div className="notification-item-location">
                    📍 {item.location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;
