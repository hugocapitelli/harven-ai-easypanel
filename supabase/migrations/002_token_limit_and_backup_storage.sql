-- Migration: Token Limit Diario + Backup Storage Path
-- Date: 2026-02-25

-- 1. Coluna para limite diario de tokens IA nas settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS ai_daily_token_limit INTEGER DEFAULT 500000;

-- 2. Coluna para path do arquivo de backup no Storage
ALTER TABLE system_backups ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 3. Criar bucket privado para backups (via INSERT no objects metadata)
-- Nota: o bucket "backups" precisa existir no Supabase Storage.
-- Se nao existir, sera criado via a query abaixo.
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;
