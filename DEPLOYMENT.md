# PC Manager - Deployment Anleitung

## Schritt 1: Datenbank in Supabase einrichten

1. Gehen Sie zu Ihrem Supabase Dashboard: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt aus
3. Klicken Sie links auf **"SQL Editor"**
4. Kopieren Sie den gesamten Inhalt aus `database-schema.sql`
5. Fügen Sie ihn im SQL Editor ein und klicken Sie auf **"Run"**

## Schritt 2: Vercel Deployment

### 2.1 Git Repository erstellen
```bash
cd kleinanzeigenPcS
git init
git add .
git commit -m "Initial commit"
```

### 2.2 Bei Vercel anmelden
1. Gehen Sie zu https://vercel.com
2. Melden Sie sich mit GitHub an

### 2.3 Projekt importieren
1. Klicken Sie auf **"Add New..."** → **"Project"**
2. Importieren Sie Ihr Git Repository
3. Wählen Sie **"Vite"** als Framework

### 2.4 Environment Variables setzen
In den Vercel Project Settings → **"Environment Variables"** fügen Sie hinzu:

| Name | Value |
|------|-------|
| VITE_SUPABASE_URL | https://nsdwlnfjpbnmyabbkyhy.supabase.co |
| VITE_SUPABASE_ANON_KEY | sb_publishable_Klsaxj3tjVaVdLIO02z-9w_80iWLUEA |

### 2.5 Deployen
Klicken Sie auf **"Deploy"**

## Schritt 3: Login-Daten

Nach dem Deployment können Sie sich anmelden mit Ihrer konfigurierten E-Mail-Adresse.
Das Passwort wird beim ersten Login über die Supabase Auth API gesetzt.

## WICHTIG: Sicherheitshinweise

- Ändern Sie Ihr Passwort regelmäßig!
- Die anon key ist PUBLIC - das ist normal bei Supabase
- Aktivieren Sie 2FA in Ihrem Supabase-Konto
- Verwenden Sie ein starkes Passwort
- Überwachen Sie die Logs regelmäßig

## Troubleshooting

### Login funktioniert nicht
- Überprüfen Sie, ob die Environment Variables korrekt gesetzt sind
- Stellen Sie sicher, dass die SQL-Tabellen erstellt wurden
- Prüfen Sie die Browser-Konsole auf Fehler

### Daten werden nicht gespeichert
- Überprüfen Sie die RLS Policies in Supabase
- Stellen Sie sicher, dass die Tabellen existieren
- Prüfen Sie die Network-Tab in den Browser-DevTools