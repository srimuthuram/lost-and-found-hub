import { useState, useEffect } from 'react'
import { getItems, createItem, deleteItem, resolveItem, getUnreadCount, getMessages, getResolvedItems, reactivateItem } from './services/api'
import AuthManager from './components/AuthManager'
import TopNavbar from './components/TopNavbar'
import ContactModal from './components/ContactModal'
import ChatModal from './components/ChatModal'
import NotificationCenter from './components/NotificationCenter'
import OnboardingTour from './components/OnboardingTour'
import './App.css'
import './components/ContactModal.css'
import './components/ChatModal.css'
import './components/NotificationCenter.css'
import './components/OTPModal.css'
import './components/OnboardingTour.css'

function App() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [resolvedItems, setResolvedItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [contactModal, setContactModal] = useState({ isOpen: false, item: null })
  const [chatModal, setChatModal] = useState({ isOpen: false, item: null, otherUser: null })
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [itemMessages, setItemMessages] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', itemId: null })
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Form state for new item
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    type: 'lost',
    location: '',
    user_id: 1,
    image_file: null,
    secret_question: '',
    secret_answer: ''
  })

  // Check for existing user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // Validate that the user has required fields
        if (parsedUser && parsedUser.id && parsedUser.email && parsedUser.is_verified !== undefined) {
          setUser(parsedUser)
        } else {
          // Clear invalid user data
          localStorage.removeItem('user')
          setUser(null)
          setItems([])
        }
      } catch (e) {
        // Clear corrupted user data
        localStorage.removeItem('user')
        setUser(null)
        setItems([])
      }
    }
  }, [])

  // Fetch items when user is authenticated
  useEffect(() => {
    if (user) {
      fetchItems()
      fetchUnreadCount()
      fetchItemMessages()
      fetchResolvedItems()
    }
  }, [user])

  // Fetch messages for items when user is authenticated
  const fetchItemMessages = async () => {
    try {
      const messages = await getMessages(user.email)
      // Group messages by item_id
      const groupedMessages = {}
      messages.forEach(msg => {
        if (!groupedMessages[msg.item_id]) {
          groupedMessages[msg.item_id] = []
        }
        groupedMessages[msg.item_id].push(msg)
      })
      setItemMessages(groupedMessages)
    } catch (error) {
      console.error('Error fetching item messages:', error)
    }
  }

  // Get unread count for a specific item
  const getUnreadCountForItem = (itemId) => {
    if (!itemMessages[itemId]) return 0
    return itemMessages[itemId].filter(msg => !msg.is_read).length
  }

  // Fetch resolved items
  const fetchResolvedItems = async () => {
    try {
      const data = await getResolvedItems()
      setResolvedItems(data)
    } catch (error) {
      console.error('Error fetching resolved items:', error)
    }
  }

  // Periodically check for new messages
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        fetchUnreadCount()
      }, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount(user.email)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const handleAuthSuccess = (userData) => {
    setUser(userData)
    // Only show auth tour for truly new users (first-time login after registration)
    const hasSeenAuthTour = localStorage.getItem('onboarding_tour_completed_auth')
    if (!hasSeenAuthTour) {
      // Check if this is a fresh registration (user just registered in this session)
      const isFreshRegistration = sessionStorage.getItem('fresh_registration')
      if (isFreshRegistration === 'true') {
        setShowOnboarding(true)
        sessionStorage.removeItem('fresh_registration')
      } else {
        // Existing user logging in - mark tour as complete
        localStorage.setItem('onboarding_tour_completed_auth', 'true')
        setShowOnboarding(false)
      }
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // Check if onboarding should show for unauthenticated users
  useEffect(() => {
    if (!user) {
      const hasSeenUnauthTour = localStorage.getItem('onboarding_tour_completed_unauth')
      setShowOnboarding(!hasSeenUnauthTour)
    }
  }, [user])

  const handleLogout = () => {
    setUser(null)
    setItems([])
    localStorage.removeItem('user')
  }

  const handleOpenForm = (type) => {
    setNewItem(prev => ({
      ...prev,
      title: '',
      description: '',
      type: type,
      location: '',
      user_id: user.id,
      image_file: null,
      secret_question: '',
      secret_answer: ''
    }))
    setShowForm(true)
  }

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

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const handleCreateItem = async (e) => {
    e.preventDefault()
    try {
      let image_url = null
      if (newItem.image_file) {
        image_url = await convertToBase64(newItem.image_file)
      }

      const itemData = {
        title: newItem.title,
        description: newItem.description,
        type: newItem.type,
        location: newItem.location,
        user_id: user.id,
        image_url: image_url,
        secret_question: newItem.secret_question || null,
        secret_answer: newItem.secret_answer || null
      }

      await createItem(itemData)
      setNewItem({
        title: '',
        description: '',
        type: 'lost',
        location: '',
        user_id: user.id,
        image_file: null,
        secret_question: '',
        secret_answer: ''
      })
      setShowForm(false)
      fetchItems()
    } catch (error) {
      console.error('Error creating item:', error)
      alert('Failed to create item. Please try again.')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(itemId)
        fetchItems()
      } catch (error) {
        console.error('Error deleting item:', error)
        alert('Failed to delete item. Please try again.')
      }
    }
  }

  const handleOpenContactModal = (item) => {
    setContactModal({
      isOpen: true,
      item: item
    })
  }

  const handleCloseContactModal = () => {
    setContactModal({ isOpen: false, item: null })
    fetchItemMessages()
    fetchUnreadCount()
    fetchItems() // Refresh items to show chat button immediately
  }

  const handleCloseChatModal = () => {
    setChatModal({ isOpen: false, item: null, otherUser: null })
    fetchItemMessages()
    fetchUnreadCount()
  }

  const handleUpdateStatus = async (itemId) => {
    try {
      await resolveItem(itemId)
      // Show toast with undo option
      setToast({
        show: true,
        message: 'Item marked as found',
        itemId: itemId
      })
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        setToast({ show: false, message: '', itemId: null })
      }, 5000)
      // Remove from active items
      setItems(items.filter(item => item.id !== itemId))
      // Refresh resolved items
      fetchResolvedItems()
    } catch (error) {
      console.error('Error updating item status:', error)
      alert('Failed to update item status. Please try again.')
    }
  }

  const handleUndoResolve = async () => {
    if (toast.itemId) {
      try {
        await reactivateItem(toast.itemId)
        setToast({ show: false, message: '', itemId: null })
        // Refresh items
        fetchItems()
        fetchResolvedItems()
      } catch (error) {
        console.error('Error undoing resolve:', error)
        alert('Failed to undo. Please try again.')
      }
    }
  }

  const handleReactivateItem = async (itemId) => {
    try {
      await reactivateItem(itemId)
      // Refresh both lists
      fetchItems()
      fetchResolvedItems()
    } catch (error) {
      console.error('Error reactivating item:', error)
      alert('Failed to reactivate item. Please try again.')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewItem(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setNewItem(prev => ({ ...prev, image_file: file }))
    }
  }

  // Show auth gateway if no user
  if (!user) {
    return (
      <>
        {/* Onboarding Tour for unauthenticated users */}
        {showOnboarding && (
          <OnboardingTour
            onComplete={handleOnboardingComplete}
            isAuthenticated={false}
          />
        )}
        <TopNavbar />
        <AuthManager onAuthSuccess={handleAuthSuccess} />
      </>
    )
  }

  return (
    <div className="app">
      <TopNavbar 
        user={user} 
        onLogout={handleLogout}
        unreadCount={unreadCount}
        onNotificationsClick={() => setShowNotifications(!showNotifications)}
      />
      
      {showNotifications && (
        <NotificationCenter 
          user={user} 
          onClose={() => setShowNotifications(false)}
          onViewItem={(item) => {
            // Scroll to the item or highlight it
            const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
            if (itemElement) {
              itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              itemElement.style.transition = 'box-shadow 0.3s';
              itemElement.style.boxShadow = '0 0 0 3px #667eea';
              setTimeout(() => {
                itemElement.style.boxShadow = '';
              }, 2000);
            }
          }}
        />
      )}

      {toast.show && (
        <div className="toast-notification">
          <span>{toast.message}</span>
          <button onClick={handleUndoResolve} className="toast-undo">Undo</button>
          <button onClick={() => setToast({ show: false, message: '', itemId: null })} className="toast-close">×</button>
        </div>
      )}

      <main className="main-content">
        <div className="action-buttons">
          <button onClick={() => handleOpenForm('lost')} className="btn btn-lost">
            + Report Lost Item
          </button>
          <button onClick={() => handleOpenForm('found')} className="btn btn-found">
            + Report Found Item
          </button>
        </div>

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
              <div key={item.id} className={`item-card ${item.type} ${item.status}`} data-item-id={item.id}>
                <div className="item-header">
                  <span className={`badge ${item.type}`}>{item.type.toUpperCase()}</span>
                  {item.status === 'resolved' && (
                    <span className="badge resolved">RESOLVED</span>
                  )}
                  {item.secret_question && (
                    <span className="badge security">🔒 SECURE</span>
                  )}
                </div>
                
                {item.image_url && (
                  <div className="item-image">
                    <img src={item.image_url} alt={item.title} />
                  </div>
                )}
                
                <h3 className="item-title">{item.title}</h3>
                <p className="item-description">{item.description}</p>
                <div className="item-details">
                  <span className="detail">📍 {item.location}</span>
                </div>
                <div className="item-footer">
                  <small>Reported by: {item.user_name}</small>
                </div>
                
                <div className="item-actions">
                  {itemMessages[item.id] && itemMessages[item.id].length > 0 ? (
                    // Show chat button if there are existing messages
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <button
                        onClick={() => setChatModal({ isOpen: true, item: item, otherUser: { name: item.user_name, email: item.user_email } })}
                        className="btn btn-contact"
                      >
                        💬 Chat
                      </button>
                      {getUnreadCountForItem(item.id) > 0 && (
                        <span className="chat-badge">{getUnreadCountForItem(item.id)}</span>
                      )}
                    </div>
                  ) : (
                    // No messages yet - only show contact button for non-owners
                    item.user_id !== user.id && (
                      <button
                        onClick={() => handleOpenContactModal(item)}
                        className="btn btn-resolve"
                        style={{ marginBottom: '0.5rem' }}
                      >
                        {item.type === 'lost' ? 'Contact Owner' : 'Contact Finder'}
                      </button>
                    )
                  )}
                  
                  {item.user_id === user.id ? (
                    <>
                      {item.status !== 'FOUND' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id)}
                          className="btn btn-resolve"
                        >
                          {item.type === 'lost' ? 'Mark as Found' : 'Mark as Returned'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="btn btn-delete"
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Resolved History Section */}
      <section className="history-section">
        <div className="history-header">
          <h2>Resolved Items History</h2>
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className="btn btn-secondary"
          >
            {showHistory ? 'Hide' : 'Show'} ({resolvedItems.length})
          </button>
        </div>
        {showHistory && (
          <>
            {resolvedItems.length === 0 ? (
              <div className="history-empty">
                <p>No resolved items yet</p>
                <small>Items you mark as found/returned will appear here</small>
              </div>
            ) : (
              <div className="items-grid history-grid">
                {resolvedItems.map(item => (
                  <div key={item.id} className={`item-card ${item.type} resolved-card`} data-item-id={item.id}>
                    <div className="item-header">
                      <span className={`badge ${item.type}`}>{item.type.toUpperCase()}</span>
                      <span className="badge resolved">RESOLVED</span>
                    </div>
                    
                    {item.image_url && (
                      <div className="item-image">
                        <img src={item.image_url} alt={item.title} />
                      </div>
                    )}
                    
                    <h3 className="item-title">{item.title}</h3>
                    <p className="item-description">{item.description}</p>
                    <div className="item-details">
                      <span className="detail">📍 {item.location}</span>
                    </div>
                    <div className="item-footer">
                      <small>Reported by: {item.user_name}</small>
                    </div>
                    
                    <div className="item-actions">
                      <button
                        onClick={() => handleReactivateItem(item.id)}
                        className="btn btn-reactivate"
                      >
                        Reactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModal.isOpen}
        onClose={handleCloseContactModal}
        contactInfo={contactModal.item ? {
          name: contactModal.item.user_name,
          email: contactModal.item.user_email,
          type: contactModal.item.type
        } : null}
        currentUser={user}
        itemId={contactModal.item ? contactModal.item.id : null}
        onMessageSent={(result) => {
          // Just refresh items - button will change from Contact Owner to Chat with Owner
          fetchItemMessages()
          fetchUnreadCount()
          fetchItems() // Refresh items to show chat button immediately
        }}
        secretQuestion={contactModal.item ? contactModal.item.secret_question : null}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatModal.isOpen}
        onClose={handleCloseChatModal}
        itemId={chatModal.item ? chatModal.item.id : null}
        currentUser={user}
        otherUser={chatModal.otherUser}
      />

      {/* Onboarding Tour for authenticated users */}
      {showOnboarding && (
        <OnboardingTour
          onComplete={handleOnboardingComplete}
          isAuthenticated={true}
        />
      )}

      {/* Create Item Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report {newItem.type === 'lost' ? 'Lost' : 'Found'} Item</h2>
              <button onClick={() => setShowForm(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleCreateItem} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={newItem.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Blue Backpack"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  required
                  value={newItem.description}
                  onChange={handleInputChange}
                  placeholder="Describe the item in detail..."
                  rows="2"
                  autoComplete="off"
                />
              </div>
              <input
                type="hidden"
                name="type"
                value={newItem.type}
              />
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  name="location"
                  required
                  value={newItem.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Building, Room 101"
                  autoComplete="off"
                />
              </div>

              {newItem.type === 'found' && (
                <>
                  <div className="form-group">
                    <label>Security Question *</label>
                    <input
                      type="text"
                      name="secret_question"
                      required
                      value={newItem.secret_question}
                      onChange={handleInputChange}
                      placeholder="e.g., What color is the item?"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label>Security Answer *</label>
                    <input
                      type="text"
                      name="secret_answer"
                      required
                      value={newItem.secret_answer}
                      onChange={handleInputChange}
                      placeholder="e.g., Blue"
                      autoComplete="off"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Item Photo</label>
                <div className="file-upload-container" onClick={() => document.getElementById('item-file-input').click()}>
                  {newItem.image_file ? (
                    <img
                      src={URL.createObjectURL(newItem.image_file)}
                      alt="Preview"
                      className="preview-image"
                    />
                  ) : (
                    <div className="file-upload-placeholder">
                      <span>📷</span>
                      <span>Upload Item Photo</span>
                    </div>
                  )}
                  <input
                    id="item-file-input"
                    type="file"
                    name="image_file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="file-input"
                  />
                </div>
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


    </div>
  )
}

export default App
