import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function TimeTracker({ onLogout, showToast, projectName, onBack }) {
  const [timeEntries, setTimeEntries] = useState([]);
  const [isClocked, setIsClocked] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('timer');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0
  });

  // User ID - nicht verwendet, da RLS deaktiviert ist

  useEffect(() => {
    fetchTimeEntries();
    checkCurrentStatus();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [timeEntries]);

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('clock_in', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error loading time entries:', error);
      showToast('Fehler beim Laden der Zeiteinträge', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setIsClocked(true);
        setCurrentEntry(data);
      }
    } catch (error) {
      // No active entry
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    timeEntries.forEach(entry => {
      if (entry.clock_out) {
        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);
        const duration = (clockOut - clockIn) / 1000 / 60;

        if (clockIn >= today) {
          todayTotal += duration;
        }
        if (clockIn >= weekStart) {
          weekTotal += duration;
        }
        if (clockIn >= monthStart) {
          monthTotal += duration;
        }
      }
    });

    setStats({
      today: todayTotal,
      week: weekTotal,
      month: monthTotal
    });
  };

  const handleClockIn = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([
          {
            clock_in: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setIsClocked(true);
      setCurrentEntry(data);
      setTimeEntries([data, ...timeEntries]);
      showToast('Eingestempelt!', 'success');
    } catch (error) {
      console.error('Error clocking in:', error);
      showToast('Fehler beim Einstempeln', 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setIsClocked(false);
      setCurrentEntry(null);
      fetchTimeEntries();
      showToast('Ausgestempelt!', 'success');
    } catch (error) {
      console.error('Error clocking out:', error);
      showToast('Fehler beim Ausstempeln', 'error');
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getEntriesForDate = (date) => {
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in).toISOString().split('T')[0];
      return entryDate === date;
    });
  };

  const calculateDayTotal = (entries) => {
    return entries.reduce((total, entry) => {
      if (entry.clock_out) {
        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);
        return total + (clockOut - clockIn) / 1000 / 60;
      }
      return total;
    }, 0);
  };

  const navItems = [
    { id: 'timer', label: 'Stempeluhr', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    )},
    { id: 'entries', label: 'Einträge', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )},
    { id: 'stats', label: 'Statistik', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    )}
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--vintage-cream)]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-[var(--vintage-brown)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[var(--vintage-gray)]">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--vintage-cream)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--vintage-beige)] border-b border-[var(--vintage-border)] z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Projects
            </button>
            <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
            <h1 className="text-lg text-[var(--vintage-charcoal)] truncate" style={{ fontFamily: 'Georgia, serif' }}>
              {projectName || 'TimeStamp'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] p-4" onClick={e => e.stopPropagation()}>
            <nav className="space-y-2 mt-12">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm rounded transition-colors flex items-center gap-3 ${
                    activeTab === item.id
                      ? 'bg-[var(--vintage-brown)] text-white'
                      : 'text-[var(--vintage-brown)] hover:bg-[var(--vintage-brown)]/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-8 pt-4 border-t border-[var(--vintage-border)]">
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
              >
                Abmelden
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        <div className="p-4 border-b border-[var(--vintage-border)] flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={onBack}
                className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Projects
              </button>
              <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
              <h1 className="text-lg text-[var(--vintage-charcoal)] tracking-wide truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {projectName || 'TimeStamp'}
              </h1>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </>
              )}
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-2.5 text-sm rounded transition-colors flex items-center gap-3 ${
                activeTab === item.id
                  ? 'bg-[var(--vintage-brown)] text-white'
                  : 'text-[var(--vintage-brown)] hover:bg-[var(--vintage-brown)]/10'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <span>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--vintage-border)]">
          <button
            onClick={onLogout}
            className={`w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors ${sidebarCollapsed ? 'justify-center flex' : ''}`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {sidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            ) : 'Abmelden'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-auto">
        {/* Timer Tab */}
        {activeTab === 'timer' && (
          <div>
            <h2 className="text-2xl text-[var(--vintage-charcoal)] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Stempeluhr
            </h2>

            {/* Clock In/Out Card */}
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-8 mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className={`w-3 h-3 rounded-full ${isClocked ? 'bg-[var(--vintage-olive)]' : 'bg-[var(--vintage-gray)]'}`}></div>
                <span className="text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                  {isClocked ? 'Gerade am Arbeiten' : 'Nicht eingestempelt'}
                </span>
              </div>

              {isClocked && currentEntry && (
                <div className="mb-6">
                  <span className="text-sm text-[var(--vintage-gray)]">Seit </span>
                  <span className="text-xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                    {formatTime(currentEntry.clock_in)}
                  </span>
                </div>
              )}

              <button
                onClick={isClocked ? handleClockOut : handleClockIn}
                className={`px-8 py-4 text-white text-lg rounded transition-colors ${
                  isClocked 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-[var(--vintage-olive)] hover:bg-[var(--vintage-olive-light)]'
                }`}
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {isClocked ? 'Ausstempeln' : 'Einstempeln'}
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Heute</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{formatDuration(stats.today)}</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Diese Woche</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{formatDuration(stats.week)}</p>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-5">
                <p className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-1">Dieser Monat</p>
                <p className="text-2xl text-[var(--vintage-charcoal)]">{formatDuration(stats.month)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Entries Tab */}
        {activeTab === 'entries' && (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                Zeiteinträge
              </h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm"
                style={{ fontFamily: 'Georgia, serif' }}
              />
            </div>

            {/* Day Summary */}
            <div className="bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded-lg p-4 mb-6 flex justify-between items-center">
              <span className="text-sm text-[var(--vintage-gray)]">
                {formatDate(selectedDate + 'T12:00:00')}
              </span>
              <span className="text-lg text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                {formatDuration(calculateDayTotal(getEntriesForDate(selectedDate)))}
              </span>
            </div>

            {/* Entries List */}
            <div className="bg-white border border-[var(--vintage-border)] rounded-lg overflow-hidden">
              {getEntriesForDate(selectedDate).length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--vintage-gray)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <p className="text-[var(--vintage-gray)]">Keine Einträge für dieses Datum</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-[var(--vintage-beige)]">
                    <tr>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Kommen</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Gehen</th>
                      <th className="text-left text-xs uppercase tracking-wider text-[var(--vintage-brown)] px-4 py-3">Dauer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getEntriesForDate(selectedDate).map(entry => (
                      <tr key={entry.id} className="border-t border-[var(--vintage-border)]">
                        <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vintage-olive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                              <polyline points="10 17 15 12 10 7"></polyline>
                              <line x1="15" y1="12" x2="3" y2="12"></line>
                            </svg>
                            {formatTime(entry.clock_in)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-charcoal)]">
                          {entry.clock_out ? (
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                              </svg>
                              {formatTime(entry.clock_out)}
                            </div>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-[var(--vintage-olive)]/10 text-[var(--vintage-olive)]">Aktiv</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--vintage-brown)]">
                          {entry.clock_out
                            ? formatDuration((new Date(entry.clock_out) - new Date(entry.clock_in)) / 1000 / 60)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div>
            <h2 className="text-2xl text-[var(--vintage-charcoal)] mb-8" style={{ fontFamily: 'Georgia, serif' }}>
              Statistik
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Übersicht</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Einträge gesamt</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{timeEntries.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Gearbeitete Tage</span>
                    <span className="text-sm text-[var(--vintage-brown)]">
                      {[...new Set(timeEntries.map(e => new Date(e.clock_in).toISOString().split('T')[0]))].length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Arbeitszeit</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Heute</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{formatDuration(stats.today)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Diese Woche</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{formatDuration(stats.week)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Dieser Monat</span>
                    <span className="text-sm text-[var(--vintage-brown)]">{formatDuration(stats.month)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-gray)] mb-4">Durchschnitt</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--vintage-charcoal)]">Ø pro Tag</span>
                    <span className="text-sm text-[var(--vintage-brown)]">
                      {timeEntries.length > 0
                        ? formatDuration(timeEntries.filter(e => e.clock_out).reduce((sum, e) => sum + (new Date(e.clock_out) - new Date(e.clock_in)) / 1000 / 60, 0) / [...new Set(timeEntries.map(e => new Date(e.clock_in).toISOString().split('T')[0]))].length)
                        : '0h 0m'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TimeTracker;