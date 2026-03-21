function Impressum({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[var(--vintage-dark-blue)] border border-[var(--vintage-border)] dark:border-[var(--vintage-dark-blue-light)] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-[var(--vintage-charcoal)] dark:text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Impressum
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="space-y-6 text-sm text-[var(--vintage-charcoal)] dark:text-white">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2">Angaben gemäß § 5 TMG</h3>
            <div className="space-y-1">
              <p className="font-medium">Asaf Cebeci</p>
              <p>Seiboldsdorfer Feld 5</p>
              <p>83278 Traunstein</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2">Kontakt</h3>
            <div className="space-y-1">
              <p>Telefon: +49 1794147574</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
            <div className="space-y-1">
              <p>Asaf Cebeci</p>
              <p>Seiboldsdorfer Feld 5</p>
              <p>83278 Traunstein</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-2">Haftungsausschluss</h3>
            <div className="space-y-3 text-[var(--vintage-gray)]">
              <div>
                <h4 className="font-medium text-[var(--vintage-charcoal)] dark:text-white mb-1">Haftung für Inhalte</h4>
                <p className="text-xs leading-relaxed">
                  Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-[var(--vintage-charcoal)] dark:text-white mb-1">Haftung für Links</h4>
                <p className="text-xs leading-relaxed">
                  Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-[var(--vintage-charcoal)] dark:text-white mb-1">Urheberrecht</h4>
                <p className="text-xs leading-relaxed">
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--vintage-border)] dark:border-[var(--vintage-dark-blue-light)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export default Impressum;