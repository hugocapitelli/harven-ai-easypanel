import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded views for code splitting
const StudentDashboard = lazy(() => import('./views/StudentDashboard'));
const StudentAchievements = lazy(() => import('./views/StudentAchievements'));
const StudentHistory = lazy(() => import('./views/StudentHistory'));
const CourseList = lazy(() => import('./views/CourseList'));
const CourseDetails = lazy(() => import('./views/CourseDetails'));
const CourseEdit = lazy(() => import('./views/CourseEdit'));
const ChapterDetail = lazy(() => import('./views/ChapterDetail'));
const ChapterReader = lazy(() => import('./views/ChapterReader'));
const InstructorList = lazy(() => import('./views/InstructorList'));
const InstructorDetail = lazy(() => import('./views/InstructorDetail'));
const ContentCreation = lazy(() => import('./views/ContentCreation'));
const ContentRevision = lazy(() => import('./views/ContentRevision'));
const AdminConsole = lazy(() => import('./views/AdminConsole'));
const AdminClassManagement = lazy(() => import('./views/AdminClassManagement'));
const UserManagement = lazy(() => import('./views/UserManagement'));
const SystemSettings = lazy(() => import('./views/SystemSettings'));
const UserProfile = lazy(() => import('./views/UserProfile'));
const AccountSettings = lazy(() => import('./views/AccountSettings'));
const DisciplineEdit = lazy(() => import('./views/DisciplineEdit'));
const SessionReviewView = lazy(() => import('./views/SessionReview'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
      <p className="text-sm text-gray-400">Carregando...</p>
    </div>
  </div>
);

interface AppRoutesProps {
  userRole: UserRole;
  gamificationEnabled: boolean;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ userRole, gamificationEnabled }) => {
  // Pagina inicial baseada no role
  const getHomePage = () => {
    switch (userRole) {
      case 'ADMIN': return '/admin';
      case 'INSTRUCTOR': return '/instructor';
      default: return '/dashboard';
    }
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Redireciona raiz para pagina inicial correta */}
          <Route path="/" element={<Navigate to={getHomePage()} replace />} />

          {/* ========== STUDENT ROUTES ========== */}
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/achievements" element={
            gamificationEnabled ? <StudentAchievements /> : <Navigate to="/dashboard" replace />
          } />
          <Route path="/history" element={<StudentHistory />} />
          <Route path="/courses" element={<CourseList userRole={userRole} />} />

          {/* ========== COURSE ROUTES ========== */}
          <Route path="/course/:courseId" element={<CourseDetails userRole={userRole} />} />
          <Route path="/course/:courseId/edit" element={<CourseEdit />} />
          <Route path="/course/:courseId/chapter/:chapterId" element={<ChapterDetail />} />
          <Route
            path="/course/:courseId/chapter/:chapterId/content/:contentId"
            element={<ChapterReader userRole={userRole} />}
          />
          <Route
            path="/course/:courseId/chapter/:chapterId/new-content"
            element={<ContentCreation />}
          />
          <Route
            path="/course/:courseId/chapter/:chapterId/content/:contentId/revision"
            element={<ContentRevision />}
          />

          {/* ========== INSTRUCTOR ROUTES ========== */}
          <Route path="/instructor" element={<InstructorList />} />
          <Route path="/instructor/class/:classId" element={<InstructorDetail />} />
          <Route path="/instructor/discipline/:disciplineId/edit" element={<DisciplineEdit />} />

          {/* ========== ADMIN ROUTES ========== */}
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/admin/classes" element={<AdminClassManagement />} />
          <Route path="/admin/class/:classId" element={<InstructorDetail />} />
          <Route path="/admin/discipline/:disciplineId/edit" element={<DisciplineEdit />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/settings" element={<SystemSettings />} />

          {/* ========== SESSION REVIEW ========== */}
          <Route path="/session/:sessionId/review" element={<SessionReviewView />} />

          {/* ========== USER ROUTES ========== */}
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/account" element={<AccountSettings />} />

          {/* ========== LTI CALLBACK ========== */}
          <Route path="/lti-callback" element={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-sm text-gray-400">Autenticando via Moodle...</p>
              </div>
            </div>
          } />

          {/* ========== 404 ========== */}
          <Route path="*" element={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-gray-500">Pagina nao encontrada</p>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppRoutes;
