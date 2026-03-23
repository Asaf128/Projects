# Vinted Klamotten

Ein Verwaltungssystem für Kleidungsverkäufe auf Vinted - ähnlich wie Kleinanzeigen-Pcs, aber spezialisiert auf Kleidung und Mode.

## Features

- **Inventarverwaltung**: Verwalte deine Kleidungsbestände nach Kategorie, Größe und Zustand
- **Preiskalkulation**: Berechne Einkaufspreise, Verkaufspreise und Gewinnmargen
- **Verkaufshistorie**: Tracke alle Verkäufe und Gewinne
- **Kategorien**: Organisiere Kleidung nach Typ (Oberteile, Hosen, Kleider, Schuhe, etc.)
- **Zustandsbewertung**: Dokumentiere den Zustand jeder Kleidung
- **Bildergalerie**: Speichere Bilder von deinen Kleidungsstücken
- **Gewinnübersicht**: Behalte deine Einnahmen und Ausgaben im Blick

## Technologie

- React 18
- Vite
- Tailwind CSS
- Supabase (Backend & Datenbank)

## Installation

```bash
npm install
npm run dev
```

## Datenbank-Struktur

Das Projekt verwendet folgende Tabellen:
- `clothes`: Kleidungsstücke mit Details
- `categories`: Kleidungskategorien
- `sales`: Verkaufshistorie
- `sizes`: Größenverwaltung

## Verwendung

1. Kleidungsstücke hinzufügen
2. Preise und Zustand dokumentieren
3. Bilder hochladen
4. Verkäufe erfassen
5. Gewinne tracken