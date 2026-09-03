import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch data from backend
  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/health')
      const data = await response.json()
      setMessage(data.status)
    } catch (error) {
      setMessage('Failed to connect to backend')
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>React + Vite Frontend</h1>
      <p>Backend Status: {message}</p>
      
      <div className="section">
        <h2>Users</h2>
        <button onClick={fetchUsers} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Users'}
        </button>
        
        {users.length > 0 && (
          <ul>
            {users.map(user => (
              <li key={user.id}>
                {user.name} ({user.email})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
