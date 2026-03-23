# TimeStamp - Zeiterfassung

Eine einfache und effiziente Zeiterfassungs-Anwendung mit Ein- und Ausstempelfunktion.

## Features

- ✅ **Einstempeln/Ausstempeln** - Einfache Zeiterfassung mit einem Klick
- 📊 **Übersicht** - Tägliche, wöchentliche und monatliche Arbeitszeitstatistiken
- 📅 **Kalenderansicht** - Zeiteinträge nach Datum filtern
- 🔐 **Benutzerauthentifizierung** - Sichere Anmeldung mit Supabase Auth
- 📱 **Responsive Design** - Funktioniert auf Desktop und Mobilgeräten

## Technologien

- React 18
- Supabase (Backend & Auth)
- Vite (Build Tool)
- CSS-in-JS Styling

## Installation

1. Projekt installieren:
```bash
npm install
```

2. Umgebungsvariablen erstellen:
Erstelle eine `.env` Datei im Hauptverzeichnis:
```
VITE_SUPABASE_URL=deine_supabase_url
VITE_SUPABASE_ANON_KEY=dein_supabase_anon_key
```

3. Datenbank einrichten:

Erstelle folgende Tabelle in Supabase:

```sql
CREATE TABLE time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policy für Benutzer
CREATE POLICY "Users can view own entries" ON time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON time_entries
  FOR UPDATE USING (auth.uid() = user_id);
```

4. Entwicklungsserver starten:
```bash
npm run dev
```

## Verwendung

1. **Anmelden/Registrieren**: Erstelle ein Konto oder melde dich an
2. **Einstempeln**: Klicke auf "Einstempeln" um deine Arbeitszeit zu starten
3. **Ausstempeln**: Klicke auf "Ausstempeln" um deine Arbeitszeit zu beenden
4. **Übersicht**: Sieh dir deine Arbeitszeit für heute, diese Woche und diesen Monat an
5. **Zeiteinträge**: Wähle ein Datum aus, um die Einträge für diesen Tag zu sehen

## Projektstruktur

```
timestamp/
├── src/
│   ├── App.jsx          # Hauptkomponente
│   ├── TimeTracker.jsx  # Zeiterfassungskomponente
│   ├── Login.jsx        # Anmeldekomponente
│   ├── Toast.jsx        # Benachrichtigungskomponente
│   ├── supabase.js      # Supabase Konfiguration
│   ├── main.jsx         # React Entry Point
│   └── index.css        # Globales Styling
├── index.html
├── package.json
└── vite.config.js
```

## Deployment

Für die Produktion builden:
```bash
npm run build
```

Die gebauten Dateien befinden sich im `dist` Verzeichnis.