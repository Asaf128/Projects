# Projects Collection

Eine Sammlung von React-Projekten mit einer einheitlichen Benutzeroberfläche.

## 🏗️ Projektstruktur

Dieses Repository enthält zwei Hauptprojekte, die über eine gemeinsame Dashboard-Oberfläche zugänglich sind:

### 1. Kleinanzeigen-PCs
- **Beschreibung:** PC-Teile und Builds verwalten
- **Funktionen:** Dashboard für die Verwaltung von PC-Komponenten
- **Komponenten:** `Dashboard.jsx`

### 2. To-Do's  
- **Beschreibung:** Kanban Board für Task-Management
- **Funktionen:** Drag & Drop Kanban-Board für Aufgabenverwaltung
- **Komponenten:** `KanbanBoard.jsx`

### 3. Vinted Klamotten
- **Beschreibung:** Kleidungsverkäufe auf Vinted verwalten
- **Funktionen:** Inventarverwaltung für Kleidung, Preiskalkulation, Gewinnübersicht
- **Komponenten:** `Dashboard.jsx`

## 🚀 Starten

```bash
# Installieren der Abhängigkeiten
npm install

# Entwicklungsserver starten
npm run dev

# Produktion build
npm run build
```

## 📁 Struktur

```
projects/
├── kleinanzeigen-pcs/     # PC-Teile und Builds verwalten
├── todos/                 # Kanban Board für Task-Management
├── vinted-klamotten/      # Kleidungsverkäufe auf Vinted verwalten
├── timestamp/             # Zeiterfassung
└── zukuenftige-projekte/  # Zukünftige Projekte

src/
├── components/
│   ├── Dashboard.jsx      # Kleinanzeigen-PCs Projekt
│   ├── KanbanBoard.jsx    # To-Do's Projekt  
│   ├── Login.jsx          # Anmeldekomponente
│   ├── Toast.jsx          # Benachrichtigungen
│   └── Impressum.jsx      # Impressum
├── lib/
│   └── supabase.js        # Datenbank-Konfiguration
└── App.jsx                # Hauptkomponente mit Navigation
```

## 🔐 Anmeldung

Die Anwendung erfordert eine Anmeldung. Nach dem Login können Sie zwischen den Projekten wechseln.

## 🎨 Design

- **Stil:** Vintage/Retro Design
- **Farbschema:** Creme, Braun, Grau
- **Typografie:** Georgia Serif

## 🛠️ Technologien

- React 18
- Vite
- Supabase (Backend)
- Tailwind CSS
- Vercel Analytics & Speed Insights

## 📦 Deployment

Automatisches Deployment über Vercel bei Push zu `main`.

---

*Erstellt mit ❤️ für eine saubere Projektorganisation*