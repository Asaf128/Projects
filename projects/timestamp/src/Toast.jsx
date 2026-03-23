import { useState, useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        )
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        )
      case 'loading':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.spinner}>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div style={{
      ...styles.toast,
      ...styles[type],
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
    }}>
      <span style={styles.icon}>{getIcon()}</span>
      <span style={styles.message}>{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }} style={styles.closeButton}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

const styles = {
  toast: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    transition: 'all 0.3s ease',
    zIndex: 1000,
    maxWidth: '400px',
  },
  success: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  error: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  loading: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
  },
  message: {
    fontSize: '14px',
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.7,
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
}