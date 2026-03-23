-- Migration: Backlog-Status entfernen
-- Führen Sie dieses SQL-Skript im Supabase SQL Editor aus

-- Tasks, die dem Backlog-Status zugeordnet sind, auf "To Do" setzen
UPDATE tasks 
SET status_id = (SELECT id FROM task_statuses WHERE name = 'To Do')
WHERE status_id = (SELECT id FROM task_statuses WHERE name = 'Backlog');

-- Backlog-Status löschen
DELETE FROM task_statuses WHERE name = 'Backlog';

-- display_order für die verbleibenden Status aktualisieren
UPDATE task_statuses SET display_order = 1 WHERE name = 'To Do';
UPDATE task_statuses SET display_order = 2 WHERE name = 'In Progress';
UPDATE task_statuses SET display_order = 3 WHERE name = 'Review';
UPDATE task_statuses SET display_order = 4 WHERE name = 'Done';