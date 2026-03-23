import { useState } from 'react';

function LanguageSwitcher({ currentLanguage, onLanguageChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-[var(--vintage-border)] rounded-lg hover:border-[var(--vintage-brown)] transition-colors text-sm"
      >
        <span>{currentLang.flag}</span>
        <span className="text-[var(--vintage-charcoal)]">{currentLang.name}</span>
        <svg 
          className={`w-4 h-4 text-[var(--vintage-gray)] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-[var(--vintage-border)] rounded-lg shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--vintage-beige)] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                currentLanguage === lang.code ? 'bg-[var(--vintage-beige)]' : ''
              }`}
            >
              <span>{lang.flag}</span>
              <span className="text-sm text-[var(--vintage-charcoal)]">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;