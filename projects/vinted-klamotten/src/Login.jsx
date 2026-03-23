import { useState } from 'react'
import { supabase } from './supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--vintage-cream)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-8">
          <h1 className="text-2xl text-[var(--vintage-charcoal)] mb-6 text-center" style={{ fontFamily: 'Georgia, serif' }}>
            Vinted Klamotten
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors disabled:opacity-50"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login