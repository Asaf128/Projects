import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Toast from './Toast'

export default function TimeTracker({ user, onLogout }) {
  const [timeEntries, setTimeEntries] = useState([])
  const [isClocked, setIsClocked] = useState(false)
  const [currentEntry, setCurrentEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0
  })

  useEffect(() => {
    fetchTimeEntries()
    checkCurrentStatus()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [timeEntries])

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false })

      if (error) throw error
      setTimeEntries(data || [])
    } catch (error) {
      setToast({ message: 'Fehler beim Laden der Zeiteinträge', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .single()

      if (data) {
        setIsClocked(true)
        setCurrentEntry(data)
      }
    } catch (error) {
      // No active entry is fine
    }
  }

  const calculateStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayTotal = 0
    let weekTotal = 0
    let monthTotal = 0

    timeEntries.forEach(entry => {
      if (entry.clock_out) {
        const clockIn = new Date(entry.clock_in)
        const clockOut = new Date(entry.clock_out)
        const duration = (clockOut - clockIn) / 1000 / 60 // minutes

        if (clockIn >= today) {
          todayTotal += duration
        }
        if (clockIn >= weekStart) {
          weekTotal += duration
        }
        if (clockIn >= monthStart) {
          monthTotal += duration
        }
      }
    })

    setStats({
      today: todayTotal,
      week: weekTotal,
      month: monthTotal
    })
  }

  const handleClockIn = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([
          {
            user_id: user.id,
            clock_in: new Date().toISOString(),
          }
        ])
        .select()
        .single()

      if (error) throw error

      setIsClocked(true)
      setCurrentEntry(data)
      setTimeEntries([data, ...timeEntries])
      setToast({ message: 'Eingestempelt!', type: 'success' })
    } catch (error) {
      setToast({ message: 'Fehler beim Einstempeln', type: 'error' })
    }
  }

  const handleClockOut = async () => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', currentEntry.id)

      if (error) throw error

      setIsClocked(false)
      setCurrentEntry(null)
      fetchTimeEntries()
      setToast({ message: 'Ausgestempelt!', type: 'success' })
    } catch (error) {
      setToast({ message: 'Fehler beim Ausstempeln', type: 'error' })
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getEntriesForDate = (date) => {
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in).toISOString().split('T')[0]
      return entryDate === date
    })
  }

  const calculateDayTotal = (entries) => {
    return entries.reduce((total, entry) => {
      if (entry.clock_out) {
        const clockIn = new Date(entry.clock_in)
        const clockOut = new Date(entry.clock_out)
        return total + (clockOut - clockIn) / 1000 / 60
      }
      return total
    }, 0)
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <svg style={styles.logo} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <h1 style={styles.headerTitle}>TimeStamp</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userEmail}>{user.email}</span>
          <button onClick={onLogout} style={styles.logoutButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Clock In/Out Section */}
        <section style={styles.clockSection}>
          <div style={styles.clockCard}>
            <div style={styles.clockStatus}>
              <div style={{
                ...styles.statusIndicator,
                backgroundColor: isClocked ? '#10b981' : '#6b7280'
              }}></div>
              <span style={styles.statusText}>
                {isClocked ? 'Gerade am Arbeiten' : 'Nicht eingestempelt'}
              </span>
            </div>

            {isClocked && currentEntry && (
              <div style={styles.currentSession}>
                <span style={styles.sessionLabel}>Seit</span>
                <span style={styles.sessionTime}>{formatTime(currentEntry.clock_in)}</span>
              </div>
            )}

            <button
              onClick={isClocked ? handleClockOut : handleClockIn}
              style={{
                ...styles.clockButton,
                backgroundColor: isClocked ? '#ef4444' : '#10b981'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isClocked ? (
                  <>
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </>
                )}
              </svg>
              <span>{isClocked ? 'Ausstempeln' : 'Einstempeln'}</span>
            </button>
          </div>
        </section>

        {/* Stats Section */}
        <section style={styles.statsSection}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Heute</span>
            <span style={styles.statValue}>{formatDuration(stats.today)}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Diese Woche</span>
            <span style={styles.statValue}>{formatDuration(stats.week)}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Dieser Monat</span>
            <span style={styles.statValue}>{formatDuration(stats.month)}</span>
          </div>
        </section>

        {/* Date Selector & Entries */}
        <section style={styles.entriesSection}>
          <div style={styles.entriesHeader}>
            <h2 style={styles.sectionTitle}>Zeiteinträge</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <div style={styles.daySummary}>
            <span style={styles.daySummaryLabel}>
              {formatDate(selectedDate + 'T12:00:00')}
            </span>
            <span style={styles.daySummaryValue}>
              {formatDuration(calculateDayTotal(getEntriesForDate(selectedDate)))}
            </span>
          </div>

          <div style={styles.entriesList}>
            {getEntriesForDate(selectedDate).length === 0 ? (
              <div style={styles.emptyState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                <p style={styles.emptyText}>Keine Einträge für dieses Datum</p>
              </div>
            ) : (
              getEntriesForDate(selectedDate).map(entry => (
                <div key={entry.id} style={styles.entryCard}>
                  <div style={styles.entryTimes}>
                    <div style={styles.entryTime}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      <span>{formatTime(entry.clock_in)}</span>
                    </div>
                    {entry.clock_out && (
                      <div style={styles.entryTime}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        <span>{formatTime(entry.clock_out)}</span>
                      </div>
                    )}
                  </div>
                  <div style={styles.entryDuration}>
                    {entry.clock_out ? (
                      formatDuration((new Date(entry.clock_out) - new Date(entry.clock_in)) / 1000 / 60)
                    ) : (
                      <span style={styles.activeTag}>Aktiv</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    backgroundColor: 'white',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '32px',
    height: '32px',
    color: '#667eea',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#6b7280',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  clockSection: {
    marginBottom: '24px',
  },
  clockCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  clockStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
  },
  currentSession: {
    marginBottom: '24px',
  },
  sessionLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  sessionTime: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: '8px',
  },
  clockButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 32px',
    borderRadius: '12px',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
  },
  entriesSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  entriesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  dateInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    color: '#374151',
  },
  daySummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  daySummaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  daySummaryValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
  },
  entriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#9ca3af',
  },
  emptyText: {
    marginTop: '12px',
    fontSize: '14px',
  },
  entryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
  },
  entryTimes: {
    display: 'flex',
    gap: '24px',
  },
  entryTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
  },
  entryDuration: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  activeTag: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500',
  },
}