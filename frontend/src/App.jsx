import { useState, useEffect } from 'react'
import { getItems, createItem, deleteItem, registerUser } from './services/api'
import './App.css'

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  
  // Form state for new item
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    category: '',
    type: 'lost',
    location: '',
    user_id: 1 // Default user ID for demo
  })
  
  // Form state for user registration
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: ''
  })

  // Fetch items on component mount
  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateItem = async (e) => {
    e.preventDefault()
    try {
      await createItem(newItem)
      setNewItem({
        title: '',
        description: '',
        category: '',
        type: 'lost',
        location: '',
        user_id: 1
      })
      setShowForm(false)
      fetchItems() // Refresh the list
    } catch (error) {
      console.error('Error creating item:', error)
      alert('Failed to create item. Please try again.')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(itemId)
        fetchItems() // Refresh the list
      } catch (error) {
        console.error('Error deleting item:', error)
        alert('Failed to delete item. Please try again.')
      }
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      await registerUser(newUser)
      setNewUser({
        name: '',
        email: '',
        password: ''
      })
      setShowRegister(false)
      alert('Registration successful!')
    } catch (error) {
      console.error('Error registering user:', error)
      alert('Registration failed. Please try again.')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🔍 Lost and Found Hub</h1>
        <div className="header-actions">
          <button onClick={() => setShowRegister(true)} className="btn btn-secondary">
            Register
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + Report Item
          </button>
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h2>No items reported yet</h2>
            <p>Be the first to report a lost or found item!</p>
          </div>
        ) : (
          <div className="items-grid">
            {items.map(item => (
              <div key={item.id} className={`item-card ${item.type}`}>
                <div className="item-header">
                  <span className={`badge ${item.type}`}>{item.type.toUpperCase()}</span>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="btn-delete"
                    title="Delete item"
                  >
                    ×
                  </button>
                </div>
                <h3 className="item-title">{item.title}</h3>
                <p className="item-description">{item.description}</p>
                <div className="item-details">
                  <span className="detail">📍 {item.location}</span>
                  <span className="detail">🏷️ {item.category}</span>
                </div>
                <div className="item-footer">
                  <small>Reported by: {item.user_name}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Item Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report New Item</h2>
              <button onClick={() => setShowForm(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleCreateItem} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  required
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  placeholder="e.g., Blue Backpack"
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  required
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder="Describe the item in detail..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <input
                  type="text"
                  required
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  placeholder="e.g., Electronics, Clothing, Keys"
                />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                >
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  required
                  value={newItem.location}
                  onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                  placeholder="e.g., Main Building, Room 101"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register User</h2>
              <button onClick={() => setShowRegister(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleRegister} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Choose a password"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowRegister(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
