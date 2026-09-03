const BASE_URL = 'http://localhost:8000/api';

// Register a new user
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

// Get all items
export const getItems = async () => {
  try {
    const response = await fetch(`${BASE_URL}/items`);
    
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
    const response = await fetch(`${BASE_URL}/items`, {
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
    const response = await fetch(`${BASE_URL}/items/${itemId}`, {
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
