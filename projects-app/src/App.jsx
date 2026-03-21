import { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Toast from './components/Toast'
import Impressum from './components/Impressum'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [toast, setToast] = useState(null)
  const [showImpressum, setShowImpressum] = useState(false)

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('isLoggedIn')
    if (loggedIn === 'true') {
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = () => {
    sessionStorage.setItem('isLoggedIn', 'true')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn')
    setIsLoggedIn(false)
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div>
      {isLoggedIn ? (
        <Dashboard 
          onLogout={handleLogout} 
          showToast={showToast}
        />
      ) : (
        <div className="min-h-screen flex flex-col">
          <Login onLogin={handleLogin} showToast={showToast} />
          <footer className="mt-auto py-4 text-center">
            <button
              onClick={() => setShowImpressum(true)}
              className="text-xs text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors underline"
            >
              Impressum
            </button>
          </footer>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showImpressum && <Impressum onClose={() => setShowImpressum(false)} />}
    </div>
  )
}

export default App