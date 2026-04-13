-- ============================================
-- HARVEN.AI - Schema Completo (Azure SQL / SQL Server)
-- 24 tabelas | Gerado em 2026-03-12
-- ============================================

-- ============================================
-- 1. USUARIOS
-- ============================================
CREATE TABLE users (
    id              NVARCHAR(36)   PRIMARY KEY,
    name            NVARCHAR(255)  NOT NULL,
    email           NVARCHAR(255)  NOT NULL UNIQUE,
    password_hash   NVARCHAR(255)  NOT NULL,
    role            NVARCHAR(20)   NOT NULL,
    ra              NVARCHAR(50)   NULL,
    jacad_ra        NVARCHAR(50)   NULL,
    avatar_url      NVARCHAR(500)  NULL,
    phone           NVARCHAR(50)   NULL,
    bio             NVARCHAR(MAX)  NULL,
    department      NVARCHAR(255)  NULL,
    active          BIT            DEFAULT 1,
    created_at      DATETIME       NOT NULL,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 2. DISCIPLINAS
-- ============================================
CREATE TABLE disciplines (
    id              NVARCHAR(36)   PRIMARY KEY,
    name            NVARCHAR(255)  NOT NULL,
    code            NVARCHAR(50)   NULL,
    description     NVARCHAR(MAX)  NULL,
    department      NVARCHAR(255)  NULL,
    jacad_codigo    NVARCHAR(100)  NULL,
    active          BIT            DEFAULT 1,
    created_at      DATETIME       NOT NULL,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 3. DISCIPLINA <-> PROFESSOR (N:N)
-- ============================================
CREATE TABLE discipline_teachers (
    id              NVARCHAR(36)   PRIMARY KEY,
    discipline_id   NVARCHAR(36)   NOT NULL REFERENCES disciplines(id),
    teacher_id      NVARCHAR(36)   NOT NULL REFERENCES users(id),
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 4. DISCIPLINA <-> ALUNO (N:N)
-- ============================================
CREATE TABLE discipline_students (
    id              NVARCHAR(36)   PRIMARY KEY,
    discipline_id   NVARCHAR(36)   NOT NULL REFERENCES disciplines(id),
    student_id      NVARCHAR(36)   NOT NULL REFERENCES users(id),
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 5. CURSOS
-- ============================================
CREATE TABLE courses (
    id              NVARCHAR(36)   PRIMARY KEY,
    discipline_id   NVARCHAR(36)   NOT NULL REFERENCES disciplines(id),
    title           NVARCHAR(500)  NOT NULL,
    description     NVARCHAR(MAX)  NULL,
    image_url       NVARCHAR(500)  NULL,
    status          NVARCHAR(20)   DEFAULT 'draft',
    created_by      NVARCHAR(36)   NULL,
    created_at      DATETIME       NOT NULL,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 6. CAPITULOS
-- ============================================
CREATE TABLE chapters (
    id              NVARCHAR(36)   PRIMARY KEY,
    course_id       NVARCHAR(36)   NOT NULL REFERENCES courses(id),
    title           NVARCHAR(500)  NOT NULL,
    order_index     INT            DEFAULT 0,
    created_at      DATETIME       NOT NULL,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 7. CONTEUDOS
-- ============================================
CREATE TABLE contents (
    id              NVARCHAR(36)   PRIMARY KEY,
    chapter_id      NVARCHAR(36)   NOT NULL REFERENCES chapters(id),
    title           NVARCHAR(500)  NOT NULL,
    type            NVARCHAR(50)   NULL,
    body            NVARCHAR(MAX)  NULL,
    file_url        NVARCHAR(500)  NULL,
    order_index     INT            DEFAULT 0,
    created_at      DATETIME       NOT NULL,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 8. QUESTOES
-- ============================================
CREATE TABLE questions (
    id              NVARCHAR(36)   PRIMARY KEY,
    content_id      NVARCHAR(36)   NOT NULL REFERENCES contents(id),
    question_text   NVARCHAR(MAX)  NOT NULL,
    question_type   NVARCHAR(50)   NULL,
    options         NVARCHAR(MAX)  NULL,
    correct_answer  NVARCHAR(MAX)  NULL,
    explanation     NVARCHAR(MAX)  NULL,
    difficulty      NVARCHAR(20)   NULL,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 9. SESSOES DE CHAT (Tutor IA)
-- ============================================
CREATE TABLE chat_sessions (
    id                  NVARCHAR(36)   PRIMARY KEY,
    user_id             NVARCHAR(36)   NOT NULL REFERENCES users(id),
    content_id          NVARCHAR(36)   NULL REFERENCES contents(id),
    chapter_id          NVARCHAR(36)   NULL,
    course_id           NVARCHAR(36)   NULL,
    discipline_id       NVARCHAR(36)   NULL,
    status              NVARCHAR(20)   DEFAULT 'active',
    total_messages      INT            DEFAULT 0,
    performance_score   FLOAT          NULL,
    started_at          DATETIME       NULL,
    -- Moodle integration
    moodle_user_id      NVARCHAR(100)  NULL,
    moodle_activity_id  NVARCHAR(100)  NULL,
    synced_to_moodle    BIT            DEFAULT 0,
    moodle_exported_at  DATETIME       NULL,
    moodle_portfolio_id NVARCHAR(255)  NULL,
    moodle_rating       NVARCHAR(50)   NULL,
    moodle_export_id    NVARCHAR(255)  NULL,
    -- Denormalized fields
    discipline_name     NVARCHAR(255)  NULL,
    content_title       NVARCHAR(500)  NULL,
    ai_summary          NVARCHAR(MAX)  NULL,
    score               FLOAT          NULL,
    completed_at        DATETIME       NULL,
    created_at          DATETIME       NOT NULL
);

-- ============================================
-- 10. MENSAGENS DE CHAT
-- ============================================
CREATE TABLE chat_messages (
    id              NVARCHAR(36)   PRIMARY KEY,
    session_id      NVARCHAR(36)   NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            NVARCHAR(20)   NOT NULL,
    content         NVARCHAR(MAX)  NOT NULL,
    agent_type      NVARCHAR(50)   NULL,
    metadata        NVARCHAR(MAX)  NULL,
    created_at      DATETIME       NOT NULL
);
CREATE INDEX ix_chat_messages_session_id ON chat_messages(session_id);

-- ============================================
-- 11. CONFIGURACOES DO SISTEMA
-- ============================================
CREATE TABLE system_settings (
    id                      NVARCHAR(36)   PRIMARY KEY,
    -- Plataforma
    platform_name           NVARCHAR(255)  NULL,
    base_url                NVARCHAR(500)  NULL,
    support_email           NVARCHAR(255)  NULL,
    primary_color           NVARCHAR(20)   NULL,
    logo_url                NVARCHAR(500)  NULL,
    login_logo_url          NVARCHAR(500)  NULL,
    login_bg_url            NVARCHAR(500)  NULL,
    -- Modulos
    module_auto_register    BIT            NULL,
    module_ai_tutor         BIT            NULL,
    module_gamification     BIT            NULL,
    module_dark_mode        BIT            NULL,
    -- Limites
    limit_tokens            INT            NULL,
    limit_upload_mb         INT            NULL,
    ai_daily_token_limit    INT            NULL,
    -- IA
    openai_key              NVARCHAR(500)  NULL,
    anthropic_connected     BIT            NULL,
    -- SSO
    sso_azure               BIT            NULL,
    sso_google              BIT            NULL,
    -- Moodle
    moodle_url              NVARCHAR(500)  NULL,
    moodle_token            NVARCHAR(500)  NULL,
    moodle_enabled          BIT            NULL,
    moodle_sync_frequency   NVARCHAR(50)   NULL,
    moodle_last_sync        NVARCHAR(50)   NULL,
    moodle_export_format    NVARCHAR(20)   NULL,
    moodle_auto_export      BIT            NULL,
    moodle_portfolio_enabled BIT           NULL,
    moodle_rating_enabled   BIT            NULL,
    moodle_webhook_secret   NVARCHAR(500)  NULL,
    -- JACAD
    jacad_enabled           BIT            NULL,
    jacad_url               NVARCHAR(500)  NULL,
    jacad_api_key           NVARCHAR(500)  NULL,
    jacad_sync_frequency    NVARCHAR(50)   NULL,
    jacad_last_sync         NVARCHAR(50)   NULL,
    jacad_auto_create_users BIT            NULL,
    jacad_sync_enrollments  BIT            NULL,
    -- SMTP
    smtp_server             NVARCHAR(255)  NULL,
    smtp_port               INT            NULL,
    smtp_user               NVARCHAR(255)  NULL,
    smtp_password           NVARCHAR(500)  NULL,
    -- Seguranca
    pwd_min_length          INT            NULL,
    pwd_special_chars       BIT            NULL,
    pwd_expiration          BIT            NULL,
    session_timeout         NVARCHAR(50)   NULL,
    force_2fa               BIT            NULL,
    firewall_blocked_ips    NVARCHAR(MAX)  NULL,
    firewall_whitelist      NVARCHAR(MAX)  NULL,
    last_force_logout       NVARCHAR(50)   NULL,
    -- Backups
    backup_enabled          BIT            NULL,
    backup_frequency        NVARCHAR(50)   NULL,
    backup_retention        INT            NULL,
    created_at              DATETIME       NOT NULL,
    updated_at              DATETIME       NULL
);

-- ============================================
-- 12. LOGS DO SISTEMA
-- ============================================
CREATE TABLE system_logs (
    id              NVARCHAR(36)   PRIMARY KEY,
    msg             NVARCHAR(MAX)  NULL,
    author          NVARCHAR(255)  NULL,
    status          NVARCHAR(50)   NULL,
    type            NVARCHAR(50)   NULL,
    color           NVARCHAR(20)   NULL,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 13. BACKUPS DO SISTEMA
-- ============================================
CREATE TABLE system_backups (
    id              NVARCHAR(36)   PRIMARY KEY,
    name            NVARCHAR(255)  NULL,
    size_mb         FLOAT          NULL,
    status          NVARCHAR(50)   NULL,
    type            NVARCHAR(50)   NULL,
    records         INT            NULL,
    storage_path    NVARCHAR(500)  NULL,
    created_by      NVARCHAR(255)  NULL,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 14. ATIVIDADES DO USUARIO
-- ============================================
CREATE TABLE user_activities (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL REFERENCES users(id),
    type            NVARCHAR(50)   NULL,
    description     NVARCHAR(MAX)  NULL,
    points          INT            DEFAULT 0,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 15. ESTATISTICAS DO USUARIO
-- ============================================
CREATE TABLE user_stats (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL UNIQUE REFERENCES users(id),
    total_points    INT            DEFAULT 0,
    total_sessions  INT            DEFAULT 0,
    total_messages  INT            DEFAULT 0,
    avg_score       FLOAT          NULL,
    streak_days     INT            DEFAULT 0,
    level           INT            DEFAULT 1,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 16. CONQUISTAS DO USUARIO
-- ============================================
CREATE TABLE user_achievements (
    id                NVARCHAR(36)   PRIMARY KEY,
    user_id           NVARCHAR(36)   NOT NULL REFERENCES users(id),
    achievement_type  NVARCHAR(100)  NULL,
    title             NVARCHAR(255)  NULL,
    description       NVARCHAR(MAX)  NULL,
    icon              NVARCHAR(50)   NULL,
    earned_at         DATETIME       NULL
);

-- ============================================
-- 17. CERTIFICADOS
-- ============================================
CREATE TABLE certificates (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL REFERENCES users(id),
    course_id       NVARCHAR(36)   NOT NULL REFERENCES courses(id),
    certificate_url NVARCHAR(500)  NULL,
    issued_at       DATETIME       NULL
);

-- ============================================
-- 18. PROGRESSO DO CURSO
-- ============================================
CREATE TABLE course_progress (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL REFERENCES users(id),
    course_id       NVARCHAR(36)   NOT NULL REFERENCES courses(id),
    progress_pct    FLOAT          DEFAULT 0,
    last_chapter_id NVARCHAR(36)   NULL,
    last_content_id NVARCHAR(36)   NULL,
    completed       BIT            DEFAULT 0,
    updated_at      DATETIME       NULL
);

-- ============================================
-- 19. NOTIFICACOES
-- ============================================
CREATE TABLE notifications (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL REFERENCES users(id),
    title           NVARCHAR(255)  NULL,
    message         NVARCHAR(MAX)  NULL,
    type            NVARCHAR(50)   NULL,
    [read]          BIT            DEFAULT 0,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 20. USO DE TOKENS (IA)
-- ============================================
CREATE TABLE token_usage (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL REFERENCES users(id),
    session_id      NVARCHAR(36)   NULL,
    tokens_input    INT            DEFAULT 0,
    tokens_output   INT            DEFAULT 0,
    model           NVARCHAR(100)  NULL,
    cost_usd        FLOAT          NULL,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 21. AVALIACOES MOODLE
-- ============================================
CREATE TABLE moodle_ratings (
    id              NVARCHAR(36)   PRIMARY KEY,
    user_id         NVARCHAR(36)   NOT NULL REFERENCES users(id),
    session_id      NVARCHAR(36)   NOT NULL REFERENCES chat_sessions(id),
    moodle_rating   NVARCHAR(50)   NULL,
    moodle_feedback NVARCHAR(MAX)  NULL,
    rated_at        DATETIME       NULL
);

-- ============================================
-- 22. LOGS DE INTEGRACAO
-- ============================================
CREATE TABLE integration_logs (
    id                  NVARCHAR(36)   PRIMARY KEY,
    system              NVARCHAR(50)   NULL,
    operation           NVARCHAR(100)  NULL,
    direction           NVARCHAR(20)   NULL,
    status              NVARCHAR(50)   NULL,
    records_processed   INT            NULL,
    error_message       NVARCHAR(MAX)  NULL,
    created_at          DATETIME       NOT NULL
);

-- ============================================
-- 23. MAPEAMENTOS EXTERNOS
-- ============================================
CREATE TABLE external_mappings (
    id              NVARCHAR(36)   PRIMARY KEY,
    entity_type     NVARCHAR(50)   NULL,
    local_id        NVARCHAR(36)   NULL,
    external_id     NVARCHAR(255)  NULL,
    external_system NVARCHAR(50)   NULL,
    created_at      DATETIME       NOT NULL
);

-- ============================================
-- 24. REVISOES DE SESSAO (Professor avalia conversa)
-- ============================================
CREATE TABLE session_reviews (
    id              NVARCHAR(36)   PRIMARY KEY,
    session_id      NVARCHAR(36)   NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    instructor_id   NVARCHAR(36)   NOT NULL REFERENCES users(id),
    rating          INT            NOT NULL,
    status          NVARCHAR(20)   NOT NULL DEFAULT 'pending_student',
    created_at      DATETIME       NOT NULL,
    updated_at      DATETIME       NULL
);
CREATE INDEX ix_session_reviews_session_id ON session_reviews(session_id);
CREATE INDEX ix_session_reviews_instructor_id ON session_reviews(instructor_id);
