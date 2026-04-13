
export type ViewType = 
  | 'STUDENT_DASHBOARD' 
  | 'STUDENT_ACHIEVEMENTS'
  | 'STUDENT_HISTORY'
  | 'COURSE_LIST'
  | 'COURSE_DETAILS' 
  | 'COURSE_EDIT'
  | 'CHAPTER_DETAIL'
  | 'CHAPTER_READER' 
  | 'INSTRUCTOR_LIST' 
  | 'INSTRUCTOR_DETAIL' 
  | 'DISCIPLINE_EDIT'
  | 'CONTENT_CREATION'
  | 'CONTENT_REVISION'
  | 'ADMIN_CONSOLE'
  | 'ADMIN_CLASSES'
  | 'USER_MANAGEMENT'
  | 'SYSTEM_SETTINGS'
  | 'USER_PROFILE'
  | 'ACCOUNT_SETTINGS'
  | 'SESSION_REVIEW';

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface User {
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  instructor: string;
  progress: number;
  students: number;
  category: string;
  thumbnail: string;
  status: 'Ativo' | 'Rascunho' | 'Arquivado';
  [key: string]: unknown;
}

// API Domain Types
export interface Discipline {
  id: string;
  name: string;
  title?: string;
  code?: string;
  description?: string;
  image_url?: string;
  class_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  order_index?: number;
  order?: number;
  course_id: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Content {
  id: string;
  title: string;
  type: string;
  text_content?: string;
  content_url?: string;
  audio_url?: string;
  thumbnail_url?: string;
  description?: string;
  order?: number;
  chapter_id?: string;
  chapter?: { title: string };
  questions?: Question[];
  created_at?: string;
  [key: string]: unknown;
}

export interface Question {
  id: string;
  question_text?: string;
  question?: string;
  text?: string;
  expected_answer?: string;
  difficulty?: string;
  skill?: string;
  content_id?: string;
  [key: string]: unknown;
}

export interface SystemSettings {
  platform_name: string;
  logo_url: string;
  login_logo_url?: string;
  primary_color: string;
  module_gamification: boolean;
  module_integrations: boolean;
  module_ai_generation: boolean;
  module_certificates: boolean;
  module_socratic: boolean;
  [key: string]: unknown;
}

export interface SessionReview {
  id: string;
  session_id: string;
  instructor_id: string;
  rating: number;
  status: 'pending_student' | 'replied' | 'closed';
  created_at: string;
  updated_at?: string;
}

export interface SessionWithReview {
  id: string;
  user_id: string;
  student_name: string;
  content_title?: string;
  discipline_id?: string;
  total_messages: number;
  status: string;
  created_at: string;
  review?: SessionReview | null;
}

export interface SessionReviewDetail {
  session: Record<string, unknown>;
  student_name: string;
  review: SessionReview | null;
  messages: Array<{
    id: string;
    session_id: string;
    role: string;
    content: string;
    created_at: string;
    [key: string]: unknown;
  }>;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ra?: string;
  password?: string;
  avatar_url?: string;
  created_at?: string;
  [key: string]: unknown;
}
