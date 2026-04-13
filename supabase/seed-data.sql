-- ============================================================
-- HARVEN.AI — Seed Data for Testing
-- Run AFTER schema-clean.sql
-- ============================================================
-- Demo users: admin, professor, aluno
-- System settings: default config
-- Achievements: 12 badge definitions
-- ============================================================

-- ============================================================
-- USERS (3 demo accounts)
-- Passwords hashed with bcrypt (generated from Python)
-- ============================================================

-- Admin: ADM001 / admin123
INSERT INTO users (id, ra, name, email, role, password_hash) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ADM001',
  'Admin Demo',
  'admin@harven.ai',
  'ADMIN',
  '$2b$12$Vn6H/D26N92iWqIAdpqeg.NKdUTXvXxGCR934I0ZYVRix/Akul8zi'
);

-- Instructor: PROF001 / prof123
INSERT INTO users (id, ra, name, email, role, title, password_hash) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'PROF001',
  'Professor Demo',
  'prof@harven.ai',
  'INSTRUCTOR',
  'Professor de Gestão',
  '$2b$12$q9S.lR4e3ju9l5pMAloIoOzrz2qbdPEmo.YwDMSiSctaCJ02Zg9Ie'
);

-- Student: ALU001 / aluno123
INSERT INTO users (id, ra, name, email, role, password_hash) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'ALU001',
  'Aluno Demo',
  'aluno@harven.ai',
  'STUDENT',
  '$2b$12$9Lz12u8ymnauiLUrxKijtueLgRUw41SXX0CSzKfgAK8K5xDSsJGR6'
);

-- ============================================================
-- SYSTEM SETTINGS (1 row — platform config)
-- ============================================================
INSERT INTO system_settings (id, platform_name) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Harven.AI'
);

-- ============================================================
-- USER STATS (for demo student)
-- ============================================================
INSERT INTO user_stats (id, user_id, courses_completed, courses_in_progress, hours_studied, average_score, certificates, total_activities, streak_days) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  0, 0, 0, 0, 0, 0, 0
);

-- ============================================================
-- ACHIEVEMENTS (12 badge definitions for demo student)
-- ============================================================
INSERT INTO user_achievements (id, user_id, achievement_id, title, description, icon, category, points, rarity) VALUES
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'first_login',       'Primeiro Acesso',  'Realizou o primeiro login na plataforma',  'login',                'onboarding',  10,  'common'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'first_course',      'Explorador',       'Acessou seu primeiro curso',               'explore',              'learning',    25,  'common'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'first_quiz',        'Desafiante',       'Completou seu primeiro quiz',              'quiz',                 'learning',    30,  'common'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'perfect_score',     'Nota Máxima',      'Obteve 100% em um quiz',                  'star',                 'excellence',  100, 'rare'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'streak_3',          'Consistente',      'Estudou 3 dias seguidos',                 'local_fire_department', 'dedication', 50,  'uncommon'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'streak_7',          'Dedicado',         'Estudou 7 dias seguidos',                 'whatshot',             'dedication',  100, 'rare'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'streak_30',         'Imparável',        'Estudou 30 dias seguidos',                'bolt',                'dedication',  500, 'legendary'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', '5_courses',         'Estudioso',        'Completou 5 cursos',                      'school',              'learning',    200, 'rare'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', '10_hours',          'Maratonista',      'Acumulou 10 horas de estudo',             'timer',               'dedication',  150, 'uncommon'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'first_certificate', 'Certificado',      'Obteve seu primeiro certificado',          'workspace_premium',   'milestone',   200, 'rare'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'ai_chat_10',        'Curioso',          'Fez 10 perguntas ao tutor IA',            'smart_toy',           'engagement',  50,  'uncommon'),
  (gen_random_uuid()::varchar, 'a0000000-0000-0000-0000-000000000003', 'ai_chat_50',        'Pensador',         'Fez 50 perguntas ao tutor IA',            'psychology',          'engagement',  150, 'rare');

-- ============================================================
-- DONE — 3 users, 1 settings row, 1 stats row, 12 achievements
-- ============================================================
