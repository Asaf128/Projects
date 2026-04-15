import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import KanbanBoard from './components/KanbanBoard'
import TimeTracker from './components/TimeTracker'
import VintedKlamotten from './components/VintedKlamotten'
import Edelmetalle from './components/Edelmetalle'
import Toast from './components/Toast'
import Impressum from './components/Impressum'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
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
    setActiveProject(null)
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const projects = [
    { id: 'kleinanzeigen-pcs', name: 'Kleinanzeigen-PCs', description: 'PC-Teile und Builds verwalten' },
    { id: 'to-dos', name: 'To-Do\'s', description: 'Kanban Board für Task-Management' },
    { id: 'timestamp', name: 'TimeStamp', description: 'Arbeitszeit erfassen und verwalten' },
    { id: 'vinted-klamotten', name: 'Vinted Klamotten', description: 'Kleidungsverkäufe auf Vinted verwalten' },
    { id: 'edelmetalle', name: 'Edelmetalle', description: 'Gold, Silber & Co. verwalten' }
  ]

  return (
    <div>
      {isLoggedIn ? (
        activeProject ? (
          activeProject === 'to-dos' ? (
            <KanbanBoard 
              onLogout={handleLogout} 
              showToast={showToast}
              projectName={projects.find(p => p.id === activeProject)?.name}
              onBack={() => setActiveProject(null)}
            />
          ) : activeProject === 'timestamp' ? (
            <TimeTracker 
              onLogout={handleLogout} 
              showToast={showToast}
              projectName={projects.find(p => p.id === activeProject)?.name}
              onBack={() => setActiveProject(null)}
            />
          ) : activeProject === 'vinted-klamotten' ? (
            <VintedKlamotten 
              onLogout={handleLogout} 
              showToast={showToast}
              projectName={projects.find(p => p.id === activeProject)?.name}
              onBack={() => setActiveProject(null)}
            />
          ) : activeProject === 'edelmetalle' ? (
            <Edelmetalle
              onLogout={handleLogout}
              showToast={showToast}
              projectName={projects.find(p => p.id === activeProject)?.name}
              onBack={() => setActiveProject(null)}
            />
          ) : (
            <Dashboard
              onLogout={handleLogout}
              showToast={showToast}
              projectName={projects.find(p => p.id === activeProject)?.name}
              onBack={() => setActiveProject(null)}
            />
          )
        ) : (
          <div className="min-h-screen bg-[var(--vintage-cream)]">
            <header className="bg-white border-b border-[var(--vintage-border)] px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                  Projects
                </h1>
                <button
                  onClick={handleLogout}
                  className="text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
                >
                  Abmelden
                </button>
              </div>
            </header>
            <main className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setActiveProject(project.id)}
                    className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 text-left hover:border-[var(--vintage-brown)] hover:shadow-md transition-all"
                  >
                    <h2 className="text-lg text-[var(--vintage-charcoal)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                      {project.name}
                    </h2>
                    <p className="text-sm text-[var(--vintage-gray)]">
                      {project.description}
                    </p>
                  </button>
                ))}
              </div>
            </main>
          </div>
        )
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
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
