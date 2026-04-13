-- ============================================================
-- HARVEN.AI — Clean PostgreSQL Schema for Supabase
-- Generated from SQLAlchemy models (source of truth)
-- 24 tables, all indexes, constraints, FKs, RPC functions
-- ============================================================
-- USAGE:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Run this ENTIRE file
--   3. Then run seed-data.sql for demo users
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DROP ALL (clean slate)
-- ============================================================
DROP TABLE IF EXISTS session_reviews CASCADE;
DROP TABLE IF EXISTS external_mappings CASCADE;
DROP TABLE IF EXISTS integration_logs CASCADE;
DROP TABLE IF EXISTS moodle_ratings CASCADE;
DROP TABLE IF EXISTS token_usage CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS course_progress CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS system_backups CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS contents CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS discipline_students CASCADE;
DROP TABLE IF EXISTS discipline_teachers CASCADE;
DROP TABLE IF EXISTS disciplines CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS increment_message_count(VARCHAR);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================
-- HELPER: Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  ra VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'INSTRUCTOR', 'ADMIN')),
  avatar_url VARCHAR(500),
  title VARCHAR(255),
  bio VARCHAR(2000),
  password_hash VARCHAR(255),
  moodle_user_id VARCHAR(100),
  jacad_ra VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 2: disciplines
-- ============================================================
CREATE TABLE disciplines (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description VARCHAR(2000),
  image_url VARCHAR(500),
  department VARCHAR(255),
  jacad_codigo VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_disciplines_updated_at
  BEFORE UPDATE ON disciplines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 3: discipline_teachers (junction)
-- ============================================================
CREATE TABLE discipline_teachers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  discipline_id VARCHAR(36) NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  teacher_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_discipline_teacher UNIQUE (discipline_id, teacher_id)
);

-- ============================================================
-- TABLE 4: discipline_students (junction)
-- ============================================================
CREATE TABLE discipline_students (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  discipline_id VARCHAR(36) NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_discipline_student UNIQUE (discipline_id, student_id)
);

-- ============================================================
-- TABLE 5: courses
-- ============================================================
CREATE TABLE courses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  discipline_id VARCHAR(36) REFERENCES disciplines(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(2000),
  instructor_id VARCHAR(36) REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'draft',
  progress FLOAT DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  image VARCHAR(500),
  image_url VARCHAR(500),
  audio_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 6: chapters
-- ============================================================
CREATE TABLE chapters (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(2000),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 7: contents
-- ============================================================
CREATE TABLE contents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  chapter_id VARCHAR(36) NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  content_url VARCHAR(500),
  text_content TEXT,
  text_url VARCHAR(500),
  audio_url VARCHAR(500),
  duration INTEGER,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 8: questions
-- ============================================================
CREATE TABLE questions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  content_id VARCHAR(36) NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  expected_answer TEXT,
  difficulty VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 9: chat_sessions
-- ============================================================
CREATE TABLE chat_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  content_id VARCHAR(36) REFERENCES contents(id),
  chapter_id VARCHAR(36),
  course_id VARCHAR(36),
  status VARCHAR(20) DEFAULT 'active',
  total_messages INTEGER DEFAULT 0,
  performance_score FLOAT,
  started_at TIMESTAMP DEFAULT NOW(),
  -- Moodle integration fields
  moodle_user_id VARCHAR(100),
  moodle_activity_id VARCHAR(100),
  synced_to_moodle BOOLEAN DEFAULT FALSE,
  moodle_exported_at TIMESTAMP,
  moodle_portfolio_id VARCHAR(255),
  moodle_rating VARCHAR(50),
  moodle_export_id VARCHAR(255),
  -- Denormalized fields
  discipline_id VARCHAR(36),
  discipline_name VARCHAR(255),
  content_title VARCHAR(500),
  ai_summary TEXT,
  score FLOAT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 10: chat_messages
-- ============================================================
CREATE TABLE chat_messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  session_id VARCHAR(36) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  agent_type VARCHAR(50),
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 11: system_settings (single row)
-- ============================================================
CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  -- Platform branding
  platform_name VARCHAR(255) DEFAULT 'Harven.AI',
  base_url VARCHAR(500) DEFAULT 'https://harven.eximiaventures.com.br',
  support_email VARCHAR(255) DEFAULT 'suporte@harven.ai',
  primary_color VARCHAR(20) DEFAULT '#d0ff00',
  logo_url VARCHAR(500),
  login_logo_url VARCHAR(500),
  login_bg_url VARCHAR(500),
  -- Modules
  module_auto_register BOOLEAN DEFAULT TRUE,
  module_ai_tutor BOOLEAN DEFAULT TRUE,
  module_gamification BOOLEAN DEFAULT TRUE,
  module_dark_mode BOOLEAN DEFAULT TRUE,
  -- Limits
  limit_tokens INTEGER DEFAULT 2048,
  limit_upload_mb INTEGER DEFAULT 500,
  ai_daily_token_limit INTEGER DEFAULT 500000,
  -- AI
  openai_key VARCHAR(500) DEFAULT '',
  anthropic_connected BOOLEAN DEFAULT FALSE,
  -- SSO
  sso_azure BOOLEAN DEFAULT TRUE,
  sso_google BOOLEAN DEFAULT FALSE,
  -- Moodle
  moodle_url VARCHAR(500) DEFAULT '',
  moodle_token VARCHAR(500) DEFAULT '',
  moodle_enabled BOOLEAN DEFAULT FALSE,
  moodle_sync_frequency VARCHAR(50) DEFAULT 'manual',
  moodle_last_sync VARCHAR(50),
  moodle_export_format VARCHAR(20) DEFAULT 'xapi',
  moodle_auto_export BOOLEAN DEFAULT FALSE,
  moodle_portfolio_enabled BOOLEAN DEFAULT TRUE,
  moodle_rating_enabled BOOLEAN DEFAULT TRUE,
  moodle_webhook_secret VARCHAR(500) DEFAULT '',
  -- JACAD
  jacad_enabled BOOLEAN DEFAULT FALSE,
  jacad_url VARCHAR(500) DEFAULT '',
  jacad_api_key VARCHAR(500) DEFAULT '',
  jacad_sync_frequency VARCHAR(50) DEFAULT 'manual',
  jacad_last_sync VARCHAR(50),
  jacad_auto_create_users BOOLEAN DEFAULT TRUE,
  jacad_sync_enrollments BOOLEAN DEFAULT TRUE,
  -- SMTP
  smtp_server VARCHAR(255) DEFAULT '',
  smtp_port INTEGER DEFAULT 587,
  smtp_user VARCHAR(255) DEFAULT '',
  smtp_password VARCHAR(500) DEFAULT '',
  -- Security
  pwd_min_length INTEGER DEFAULT 8,
  pwd_special_chars BOOLEAN DEFAULT TRUE,
  pwd_expiration BOOLEAN DEFAULT FALSE,
  session_timeout VARCHAR(50) DEFAULT '30 minutos',
  force_2fa BOOLEAN DEFAULT FALSE,
  firewall_blocked_ips TEXT DEFAULT '',
  firewall_whitelist TEXT DEFAULT '',
  last_force_logout VARCHAR(50),
  -- Backup
  backup_enabled BOOLEAN DEFAULT TRUE,
  backup_frequency VARCHAR(50) DEFAULT 'Diário',
  backup_retention INTEGER DEFAULT 30,
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 12: system_logs
-- ============================================================
CREATE TABLE system_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  msg TEXT,
  author VARCHAR(255),
  status VARCHAR(50),
  type VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 13: system_backups
-- ============================================================
CREATE TABLE system_backups (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255),
  size_mb FLOAT,
  status VARCHAR(50),
  type VARCHAR(50),
  records INTEGER,
  storage_path VARCHAR(500),
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 14: user_activities
-- ============================================================
CREATE TABLE user_activities (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  action VARCHAR(100),
  target_type VARCHAR(50),
  target_id VARCHAR(36),
  target_title VARCHAR(255),
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 15: user_stats
-- ============================================================
CREATE TABLE user_stats (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id),
  courses_completed INTEGER DEFAULT 0,
  courses_in_progress INTEGER DEFAULT 0,
  hours_studied FLOAT DEFAULT 0,
  average_score FLOAT DEFAULT 0,
  certificates INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity TIMESTAMP
);

-- ============================================================
-- TABLE 16: user_achievements
-- ============================================================
CREATE TABLE user_achievements (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  achievement_id VARCHAR(100),
  title VARCHAR(255),
  description VARCHAR(500),
  icon VARCHAR(100),
  category VARCHAR(100),
  points INTEGER DEFAULT 0,
  rarity VARCHAR(50),
  unlocked_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 17: certificates
-- ============================================================
CREATE TABLE certificates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  course_id VARCHAR(36) REFERENCES courses(id),
  course_title VARCHAR(255),
  user_name VARCHAR(255),
  issued_at TIMESTAMP DEFAULT NOW(),
  certificate_number VARCHAR(100)
);

-- ============================================================
-- TABLE 18: course_progress
-- ============================================================
CREATE TABLE course_progress (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  course_id VARCHAR(36) NOT NULL REFERENCES courses(id),
  progress_percent FLOAT DEFAULT 0,
  completed_contents INTEGER DEFAULT 0,
  total_contents INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_user_course_progress UNIQUE (user_id, course_id)
);

CREATE TRIGGER trg_course_progress_updated_at
  BEFORE UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE 19: notifications
-- ============================================================
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 20: token_usage
-- ============================================================
CREATE TABLE token_usage (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  tokens_used INTEGER DEFAULT 0,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT uq_user_usage_date UNIQUE (user_id, usage_date)
);

-- ============================================================
-- TABLE 21: moodle_ratings
-- ============================================================
CREATE TABLE moodle_ratings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  session_id VARCHAR(36) REFERENCES chat_sessions(id),
  moodle_rating VARCHAR(50),
  moodle_feedback TEXT,
  rated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLE 22: integration_logs
-- ============================================================
CREATE TABLE integration_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  system VARCHAR(50) NOT NULL,
  operation VARCHAR(100),
  direction VARCHAR(20),
  status VARCHAR(20),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 23: external_mappings
-- ============================================================
CREATE TABLE external_mappings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  entity_type VARCHAR(50) NOT NULL,
  local_id VARCHAR(36) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  external_system VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 24: session_reviews
-- ============================================================
CREATE TABLE session_reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  session_id VARCHAR(36) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  instructor_id VARCHAR(36) NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_student',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_session_reviews_updated_at
  BEFORE UPDATE ON session_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES (performance critical)
-- ============================================================

-- Auth
CREATE INDEX idx_users_ra ON users(ra);
CREATE INDEX idx_users_role ON users(role);

-- Content hierarchy
CREATE INDEX idx_courses_discipline_id ON courses(discipline_id);
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_contents_chapter_id ON contents(chapter_id);
CREATE INDEX idx_questions_content_id ON questions(content_id);

-- Junction tables
CREATE INDEX idx_discipline_teachers_teacher ON discipline_teachers(teacher_id);
CREATE INDEX idx_discipline_teachers_discipline ON discipline_teachers(discipline_id);
CREATE INDEX idx_discipline_students_student ON discipline_students(student_id);
CREATE INDEX idx_discipline_students_discipline ON discipline_students(discipline_id);

-- Chat
CREATE INDEX idx_chat_sessions_user_content ON chat_sessions(user_id, content_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);

-- Admin
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_type ON system_logs(type);

-- Activity
CREATE INDEX idx_user_activities_user ON user_activities(user_id, action);
CREATE INDEX idx_user_activities_created ON user_activities(created_at DESC);

-- Progress
CREATE INDEX idx_course_progress_user ON course_progress(user_id);

-- Reviews
CREATE INDEX idx_session_reviews_session ON session_reviews(session_id);
CREATE INDEX idx_session_reviews_instructor ON session_reviews(instructor_id);

-- Token usage
CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, usage_date);

-- Integration
CREATE INDEX idx_integration_logs_system ON integration_logs(system);
CREATE INDEX idx_external_mappings_entity ON external_mappings(entity_type, external_system);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Atomic counter for chat messages
CREATE OR REPLACE FUNCTION increment_message_count(p_session_id VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE chat_sessions
  SET total_messages = COALESCE(total_messages, 0) + 1
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE
-- ============================================================
-- Schema: 24 tables, 30+ indexes, 6 unique constraints,
--         25+ foreign keys, 5 triggers, 1 RPC function
-- Next: Run seed-data.sql for demo users
-- ============================================================
