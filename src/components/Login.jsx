import { useState } from 'react';
import { supabase } from '../lib/supabase';
import translations from '../lib/translations';

function Login({ onLogin, showToast, language = 'de' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const t = translations[language];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Supabase Auth Login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (authError) {
        throw authError;
      }

      // Login erfolgreich
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('userEmail', username);
      showToast(t.login.success, 'success');
      await new Promise(resolve => setTimeout(resolve, 500));
      onLogin();
    } catch (err) {
      console.error('Login error:', err);
      setError(t.login.error);
      showToast(t.login.failed, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--vintage-cream)] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[var(--vintage-dark-blue)] border border-[var(--vintage-border)] dark:border-[var(--vintage-dark-blue-light)] rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="username" 
                className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {t.login.email}
              </label>
              <input
                type="email"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--vintage-beige)] dark:bg-[var(--vintage-dark-blue-light)] border border-[var(--vintage-border)] dark:border-[var(--vintage-dark-blue)] rounded text-[var(--vintage-charcoal)] dark:text-white text-sm focus:outline-none focus:border-[var(--vintage-brown)] transition-colors"
                required
              />
            </div>
            
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {t.login.password}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--vintage-beige)] dark:bg-[var(--vintage-dark-blue-light)] border border-[var(--vintage-border)] dark:border-[var(--vintage-dark-blue)] rounded text-[var(--vintage-charcoal)] dark:text-white text-sm focus:outline-none focus:border-[var(--vintage-brown)] transition-colors"
                required
              />
            </div>
            
            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[var(--vintage-brown)] text-white text-sm uppercase tracking-wider rounded hover:bg-[var(--vintage-brown-dark)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.login.loading}
                </span>
              ) : (
                t.login.submit
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;