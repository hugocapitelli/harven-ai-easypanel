-- Migration 001: Indexes, Unique Constraints, and RPC Functions
-- FIX-V4-008: High-priority indexes
-- FIX-V4-009: Unique constraints on junction tables
-- FIX-V4-010: Atomic increment RPC for chat counter
-- Execute in Supabase SQL Editor

-- ============================================
-- FIX-V4-008: HIGH-PRIORITY INDEXES
-- ============================================

-- Auth (CRITICAL - every login does full scan)
CREATE INDEX IF NOT EXISTS idx_users_ra ON users(ra);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Content hierarchy (HIGH - every page load)
CREATE INDEX IF NOT EXISTS idx_courses_discipline_id ON courses(discipline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_contents_chapter_id ON contents(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_content_id ON questions(content_id);

-- Junction tables (HIGH - enrollment queries)
CREATE INDEX IF NOT EXISTS idx_discipline_teachers_teacher ON discipline_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_discipline_teachers_discipline ON discipline_teachers(discipline_id);
CREATE INDEX IF NOT EXISTS idx_discipline_students_student ON discipline_students(student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_students_discipline ON discipline_students(discipline_id);

-- Chat & notifications (MEDIUM - user-facing queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_content ON chat_sessions(user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Admin (MEDIUM - admin dashboard)
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, action);

-- ============================================
-- FIX-V4-009: UNIQUE CONSTRAINTS
-- ============================================

-- Remove duplicates first (keep latest)
DELETE FROM discipline_teachers a
USING discipline_teachers b
WHERE a.id < b.id
  AND a.discipline_id = b.discipline_id
  AND a.teacher_id = b.teacher_id;

DELETE FROM discipline_students a
USING discipline_students b
WHERE a.id < b.id
  AND a.discipline_id = b.discipline_id
  AND a.student_id = b.student_id;

-- Add unique constraints
ALTER TABLE discipline_teachers
  ADD CONSTRAINT uq_discipline_teacher UNIQUE (discipline_id, teacher_id);

ALTER TABLE discipline_students
  ADD CONSTRAINT uq_discipline_student UNIQUE (discipline_id, student_id);

-- ============================================
-- FIX-V4-010: ATOMIC INCREMENT RPC
-- ============================================

CREATE OR REPLACE FUNCTION increment_message_count(p_session_id UUID)
RETURNS void AS $$
  UPDATE chat_sessions
  SET total_messages = COALESCE(total_messages, 0) + 1
  WHERE id = p_session_id;
$$ LANGUAGE SQL;
