# GitHub Repository Struktur

## Aktuelle Projekte

### 1. Kleinanzeigen-PCs
- **Beschreibung:** PC-Teile und Builds verwalten
- **Technologie:** React + Vite + Supabase

### 2. To-Do's
- **Beschreibung:** Kanban Board für Task-Management
- **Technologie:** React + Vite + Supabase

### 3. Zukünftige Projekte
- Platz für neue Projekte

## Vorgeschlagene GitHub-Organisation

### Option 1: Monorepo Struktur
```
Projects/
├── README.md
├── package.json
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx (Kleinanzeigen-PCs)
│   │   ├── KanbanBoard.jsx (To-Do's)
│   │   └── ...
│   └── App.jsx
└── .github/
    └── workflows/
```

### Option 2: Separate Repositories
- `kleinanzeigen-pcs` (eigenes Repository)
- `todos` (eigenes Repository)
- `projects-dashboard` (Haupt-Dashboard)

## Empfohlene Aktionen

1. **README.md aktualisieren** - Projektbeschreibung und Links
2. **GitHub Topics hinzufügen** - bessere Auffindbarkeit
3. **Branch Protection** - main Branch schützen
4. **Issue Templates** - Standardisierte Bug Reports
5. **GitHub Actions** - CI/CD Pipeline