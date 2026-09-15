const BASE_URL = 'http://localhost:8000';

// Send OTP to email
export const sendOTP = async (email) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to send OTP');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

// Verify OTP and complete registration
export const verifyOTPAndRegister = async (registrationData) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/verify-otp-and-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to verify OTP and register');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying OTP and registering:', error);
    throw error;
  }
};

const API_BASE_URL = 'http://localhost:8000/api';

// Register a new user (DEPRECATED)
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to register user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    if (response.status === 401) {
      throw new Error('Invalid credentials');
    }
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

// Get all items
export const getItems = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/items`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch items');
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
};

// Create a new item
export const createItem = async (itemData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(itemData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create item');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

// Delete an item
export const deleteItem = async (itemId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete item');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

// Update item status
export const updateItemStatus = async (itemId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update item status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating item status:', error);
    throw error;
  }
};

// Resolve item (mark as found and remove from feed)
export const resolveItem = async (itemId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/resolve`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error('Failed to resolve item');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error resolving item:', error);
    throw error;
  }
};

// Contact item owner
export const contactOwner = async (contactData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/contact-owner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to send email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error contacting owner:', error);
    throw error;
  }
};

// Get messages for user
export const getMessages = async (userEmail, itemId = null) => {
  try {
    let url = `${API_BASE_URL}/messages?user_email=${encodeURIComponent(userEmail)}`;
    if (itemId) {
      url += `&item_id=${itemId}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
      method: 'PATCH',
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark message as read');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Mark all messages for an item as read
export const markItemMessagesAsRead = async (itemId, userEmail) => {
  try {
    const url = `${API_BASE_URL}/messages/mark-read?item_id=${itemId}&user_email=${encodeURIComponent(userEmail)}`;
    const response = await fetch(url, {
      method: 'PATCH',
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking item messages as read:', error);
    throw error;
  }
};

// Verify OTP only (without registration)
export const verifyOTP = async (email, otpCode) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/verify-otp-only`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp_code: otpCode }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to verify OTP');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

// Get chat history for an item
export const getChatHistory = async (itemId, userEmail) => {
  try {
    const url = `${API_BASE_URL}/chat?item_id=${itemId}&user_email=${encodeURIComponent(userEmail)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chat history');
    }
    
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

// Send a chat message
export const sendChatMessage = async (chatData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

// Get unread message count
export const getUnreadCount = async (userEmail) => {
  try {
    const url = `${API_BASE_URL}/messages/unread-count?user_email=${encodeURIComponent(userEmail)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch unread count');
    }
    
    const data = await response.json();
    return data.unread_count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

// Get resolved/inactive items
export const getResolvedItems = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/history`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch resolved items');
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching resolved items:', error);
    throw error;
  }
};

// Reactivate a resolved item
export const reactivateItem = async (itemId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/reactivate`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reactivate item');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error reactivating item:', error);
    throw error;
  }
};
